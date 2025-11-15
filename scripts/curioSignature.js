// === CurioWire Curiosity Signature Engine v2.0 ===
// Fullt kompatibel med generate.js (bruker buildCurioSignature + checkCurioDuplicate)
//
// Denne filen lager en billig, men svært treffsikker “CurioSignature” FØR artikkel-generering.
// Dette gjør at vi unngår dyre full-artikkel-duplikater.
//
// CurioSignature består av:
//   • summary            (1–2 setninger)
//   • keywords           (6–10 nøkkelord)
//   • normalized         (kort, stoppord-fjernet signatur)
//   • signature          (kombinert streng brukt ved matching)
//   • embedding          (billig text-embedding v3-small)
//
// checkCurioDuplicate gjør:
//   • substring match mot semantic_signature
//   • substring match mot curio_signature_text
//   • keyword overlap
//   • vector similarity (Supabase RPC)
//

// ----------------------------------------------------
// Imports
// ----------------------------------------------------
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// OpenAI init
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supabase init
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ----------------------------------------------------
// Normalize helper (cheap, local)
// ----------------------------------------------------
export function normalizeSignature(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(the|a|an|and|of|in|on|for|to|from|by|with|at|is|was|were|has|had)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------------------------------
// BuildCurioSignature (this is what generate.js calls)
// ----------------------------------------------------
export async function buildCurioSignature({ category, topic, curiosity }) {
  const prompt = `
You are creating a semantic fingerprint for a historical/technological curiosity.
Return JSON ONLY.

Curiosity:
"${curiosity}"

Return exactly:

{
  "summary": "1–2 sentence factual summary",
  "keywords": ["6-10 meaningful keywords"],
  "normalized": "short normalized signature",
  "signature": "combined short signature of the curiosity"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.1,
    });

    const raw = r.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const summary = parsed.summary || curiosity.slice(0, 200);
    const keywords = parsed.keywords || [];
    const normalized =
      parsed.normalized || normalizeSignature(summary || curiosity);

    // Combined signature used for DB matching
    const signature = parsed.signature || `${normalized} ${keywords.join(" ")}`;

    return {
      category,
      topic,
      curiosity,
      summary,
      keywords,
      normalized,
      signature: normalizeSignature(signature),
    };
  } catch (err) {
    console.error("❌ buildCurioSignature failed:", err.message);

    const fallback = normalizeSignature(curiosity);

    return {
      category,
      topic,
      curiosity,
      summary: curiosity.slice(0, 200),
      keywords: [],
      normalized: fallback,
      signature: fallback,
    };
  }
}

// ----------------------------------------------------
// Cheap embedding wrapper
// ----------------------------------------------------
async function embed(text) {
  try {
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return r.data[0].embedding;
  } catch (err) {
    console.warn("⚠️ Embedding failed:", err.message);
    return null;
  }
}

// ----------------------------------------------------
// checkCurioDuplicate(signature)
// Used in generate.js BEFORE article generation
// ----------------------------------------------------
export async function checkCurioDuplicate(sig) {
  const { signature, normalized, keywords } = sig;

  const query = normalized || signature || "";

  // ----------------------------------------------------
  // 1. substring match against semantic_signature
  // ----------------------------------------------------
  const { data: subSig } = await supabase
    .from("articles")
    .select("id, title, semantic_signature")
    .ilike("semantic_signature", `%${query}%`)
    .limit(1);

  if (subSig?.length > 0) {
    return {
      isDuplicate: true,
      reason: "semantic-signature-substring",
      closestTitle: subSig[0].title,
      similarityScore: 1.0,
    };
  }

  // ----------------------------------------------------
  // 2. substring against curio_signature_text (if exists)
  // ----------------------------------------------------
  const { data: curioSub } = await supabase
    .from("articles")
    .select("id, title, curio_signature_text")
    .ilike("curio_signature_text", `%${query}%`)
    .limit(1);

  if (curioSub?.length > 0) {
    return {
      isDuplicate: true,
      reason: "curio-signature-substring",
      closestTitle: curioSub[0].title,
      similarityScore: 1.0,
    };
  }

  // ----------------------------------------------------
  // 3. Keyword overlap check (cheap)
  // ----------------------------------------------------
  if (keywords?.length > 0) {
    const { data: kwRows } = await supabase
      .from("articles")
      .select("id, title, curio_signature_text")
      .limit(50);

    if (kwRows) {
      for (const row of kwRows) {
        const txt = row.curio_signature_text || "";
        const hits = keywords.filter((k) =>
          txt.toLowerCase().includes(k.toLowerCase())
        );

        if (hits.length >= 3) {
          return {
            isDuplicate: true,
            reason: "keyword-overlap",
            closestTitle: row.title,
            similarityScore: 0.75,
          };
        }
      }
    }
  }

  // ----------------------------------------------------
  // 4. Vector similarity (Supabase RPC)
  // ----------------------------------------------------
  const vec = await embed(query);
  if (vec) {
    const { data: vecHits } = await supabase.rpc("match_articles", {
      query_embedding: vec,
      match_threshold: 0.82,
      match_count: 1,
    });

    if (vecHits?.length > 0) {
      return {
        isDuplicate: true,
        reason: "vector-similarity",
        closestTitle: vecHits[0].title,
        similarityScore: vecHits[0].similarity,
      };
    }
  }

  // ----------------------------------------------------
  // 5. No match → unique curiosity
  // ----------------------------------------------------
  return {
    isDuplicate: false,
    reason: "no-match",
    closestTitle: null,
    similarityScore: 0,
  };
}
