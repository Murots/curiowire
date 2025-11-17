// // === CurioWire Curiosity Signature Engine v3.0 ===
// // GLOBAL dupe-sjekk for kuriositeter før artikkel-generering.
// //
// // CurioSignature består av:
// //   • summary      – kort beskrivelse (kun for logging/ref)
// //   • keywords     – 6–10 nøkkelord
// //   • normalized   – 8–12 ord, kort og generisk, normalisert
// //   • signature    – lagres i curio_signature_text
// //
// // checkCurioDuplicate gjør GLOBAL sjekk mot hele articles-tabellen:
// //   • substring match mot semantic_signature, curio_signature_text, topic_signature_text
// //   • keyword overlap ≥ 3 ord
// //   • vector similarity (embedding ≥ 0.82)
// //
// // Dette matcher både gamle og nye raders struktur perfekt.
// // ----------------------------------------------------

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// // ----------------------------------------------------
// // Init
// // ----------------------------------------------------
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const supabase = createClient(
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY ||
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// // ----------------------------------------------------
// // Helpers
// // ----------------------------------------------------
// export function normalizeSignature(str = "") {
//   return str
//     .toLowerCase()
//     .replace(/[^a-z0-9\s]/g, " ")
//     .replace(
//       /\b(the|a|an|and|of|in|on|for|to|from|by|with|at|is|was|were|has|had|this|that|these|those)\b/g,
//       " "
//     )
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function clampWords(str = "", maxWords = 12) {
//   return str.split(" ").filter(Boolean).slice(0, maxWords).join(" ");
// }

// // ----------------------------------------------------
// // buildCurioSignature
// // ----------------------------------------------------
// export async function buildCurioSignature({ category, topic, curiosity }) {
//   const prompt = `
// You are creating a compact semantic fingerprint for a factual curiosity.
// Return JSON ONLY.

// Curiosity:
// "${curiosity}"

// The fingerprint must be SHORT and GENERIC (8–12 words), not a sentence.

// Return exactly:

// {
//   "summary": "1–2 sentence factual summary",
//   "keywords": ["6-10 meaningful keywords"],
//   "normalized": "8-12 word normalized keyword string",
//   "signature": "same as normalized or a slightly refined compact form"
// }
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 180,
//       temperature: 0.1,
//     });

//     const raw = r.choices[0]?.message?.content || "{}";
//     const parsed = JSON.parse(raw);

//     // Pick summary
//     const summary =
//       (parsed.summary && String(parsed.summary)) || curiosity.slice(0, 200);

//     // Clean keywords
//     const rawKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
//     const keywords = Array.from(
//       new Set(
//         rawKeywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean)
//       )
//     );

//     // Normalized base (GPT’s suggestion or fallback)
//     const normalizedBase =
//       typeof parsed.normalized === "string"
//         ? parsed.normalized
//         : `${summary} ${keywords.join(" ")} ${curiosity}`;

//     const normalized = clampWords(normalizeSignature(normalizedBase), 12);

//     // signature = det vi lagrer i curio_signature_text
//     const signature =
//       typeof parsed.signature === "string"
//         ? clampWords(normalizeSignature(parsed.signature), 12)
//         : normalized;

//     return {
//       category,
//       topic,
//       curiosity,
//       summary,
//       keywords,
//       normalized,
//       signature,
//     };
//   } catch (err) {
//     console.error("❌ buildCurioSignature failed:", err.message);

//     const fallback = clampWords(normalizeSignature(curiosity), 12);

//     return {
//       category,
//       topic,
//       curiosity,
//       summary: curiosity.slice(0, 200),
//       keywords: [],
//       normalized: fallback,
//       signature: fallback,
//     };
//   }
// }

// // ----------------------------------------------------
// // Embedding wrapper
// // ----------------------------------------------------
// async function embed(text) {
//   try {
//     const r = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: text,
//     });
//     return r.data[0].embedding;
//   } catch (err) {
//     console.warn("⚠️ Curio embedding failed:", err.message);
//     return null;
//   }
// }

// // ----------------------------------------------------
// // checkCurioDuplicate(sig) – GLOBAL
// // ----------------------------------------------------
// export async function checkCurioDuplicate(sig) {
//   const base = sig?.normalized || sig?.signature || "";
//   const query = clampWords(normalizeSignature(base), 12);

//   if (!query) {
//     return {
//       isDuplicate: false,
//       reason: "empty-query",
//       closestTitle: null,
//       similarityScore: 0,
//     };
//   }

//   // ----------------------------------------------------
//   // 1. Global substring match (semantic, curio, topic)
//   // ----------------------------------------------------
//   const { data: subHits, error: subErr } = await supabase
//     .from("articles")
//     .select(
//       "id, title, semantic_signature, curio_signature_text, topic_signature_text"
//     )
//     .or(
//       `semantic_signature.ilike.%${query}%,curio_signature_text.ilike.%${query}%,topic_signature_text.ilike.%${query}%`
//     )
//     .limit(1);

//   if (!subErr && subHits?.length > 0) {
//     return {
//       isDuplicate: true,
//       reason: "signature-substring",
//       closestTitle: subHits[0].title,
//       similarityScore: 1.0,
//     };
//   }

//   // ----------------------------------------------------
//   // 2. Keyword-overlap ≥ 3 (mot alle tre signaturfelter)
//   // ----------------------------------------------------
//   const keywords = (sig.keywords || []).map((k) => k.toLowerCase());

//   if (keywords.length > 0) {
//     const { data: kwRows } = await supabase
//       .from("articles")
//       .select(
//         "id, title, semantic_signature, curio_signature_text, topic_signature_text"
//       )
//       .limit(200);

//     if (kwRows) {
//       for (const row of kwRows) {
//         const txt = [
//           row.semantic_signature,
//           row.curio_signature_text,
//           row.topic_signature_text,
//         ]
//           .filter(Boolean)
//           .join(" ")
//           .toLowerCase();

//         const hits = keywords.filter((k) => txt.includes(k));

//         if (hits.length >= 3) {
//           return {
//             isDuplicate: true,
//             reason: "keyword-overlap",
//             closestTitle: row.title,
//             similarityScore: 0.75,
//           };
//         }
//       }
//     }
//   }

//   // ----------------------------------------------------
//   // 3. Vector similarity (embedding ≥ 0.82)
//   // ----------------------------------------------------
//   const vec = await embed(query);

//   if (vec) {
//     const { data: vecHits, error: vecErr } = await supabase.rpc(
//       "match_articles",
//       {
//         query_embedding: vec,
//         match_threshold: 0.82,
//         match_count: 1,
//       }
//     );

//     if (!vecErr && vecHits?.length > 0) {
//       return {
//         isDuplicate: true,
//         reason: "vector-similarity",
//         closestTitle: vecHits[0].title,
//         similarityScore: vecHits[0].similarity,
//       };
//     }
//   }

//   // ----------------------------------------------------
//   // 4. Unik kuriositet
//   // ----------------------------------------------------
//   return {
//     isDuplicate: false,
//     reason: "no-match",
//     closestTitle: null,
//     similarityScore: 0,
//   };
// }

// === CurioWire Curiosity Signature Engine v2.1 (with deep logging) ===

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
// BuildCurioSignature
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

    const signature = parsed.signature || `${normalized} ${keywords.join(" ")}`;

    console.log("\n🔧 CurioSignature built:", {
      category,
      topic,
      curiosity,
      summary,
      keywords,
      normalized,
      signature,
    });

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
// checkCurioDuplicate (deep logging)
// ----------------------------------------------------
export async function checkCurioDuplicate(sig) {
  const { signature, normalized, keywords } = sig;
  const query = normalized || signature || "";

  console.log("\n🔍 CHECK CURIO DUPLICATE:");
  console.log("   → query:", query);

  // 1. substring match against semantic_signature
  const { data: subSig } = await supabase
    .from("articles")
    .select("id, title, semantic_signature")
    .ilike("semantic_signature", `%${query}%`)
    .limit(1);

  if (subSig?.length > 0) {
    console.log("   🔥 MATCH: semantic_signature substring");
    console.log("   ↳ Title:", subSig[0].title);

    return {
      isDuplicate: true,
      reason: "semantic-signature-substring",
      closestTitle: subSig[0].title,
      similarityScore: 1.0,
    };
  }

  console.log("   ✓ No semantic_signature substring match");

  // 2. substring match against curio_signature_text
  const { data: curioSub } = await supabase
    .from("articles")
    .select("id, title, curio_signature_text")
    .ilike("curio_signature_text", `%${query}%`)
    .limit(1);

  if (curioSub?.length > 0) {
    console.log("   🔥 MATCH: curio_signature_text substring");
    console.log("   ↳ Title:", curioSub[0].title);

    return {
      isDuplicate: true,
      reason: "curio-signature-substring",
      closestTitle: curioSub[0].title,
      similarityScore: 1.0,
    };
  }

  console.log("   ✓ No curio_signature_text substring match");

  // 3. Keyword overlap
  if (keywords?.length > 0) {
    console.log("   → Checking keyword overlap… (need ≥3 hits)");

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

        console.log(
          `     - Compared with "${row.title}" → hits: ${hits.length}`
        );

        if (hits.length >= 3) {
          console.log("   🔥 MATCH: keyword-overlap");
          console.log("   ↳ Title:", row.title, " hits:", hits.join(", "));
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

  console.log("   ✓ No keyword overlap match");

  // 4. Vector similarity (Supabase RPC)
  const vec = await embed(query);
  if (!vec) {
    console.log("   ⚠️ Embedding failed → skipping vector check");
    return {
      isDuplicate: false,
      reason: "no-embedding",
      closestTitle: null,
      similarityScore: 0,
    };
  }

  console.log("   → Running vector similarity… (threshold 0.82)");

  const { data: vecHits } = await supabase.rpc("match_articles", {
    query_embedding: vec,
    match_threshold: 0.82,
    match_count: 1,
  });

  if (vecHits?.length > 0) {
    console.log("   🔥 MATCH: vector similarity");
    console.log(
      "   ↳ Title:",
      vecHits[0].title,
      " score:",
      vecHits[0].similarity
    );

    return {
      isDuplicate: true,
      reason: "vector-similarity",
      closestTitle: vecHits[0].title,
      similarityScore: vecHits[0].similarity,
    };
  }

  console.log("   ✓ No vector match");

  // 5. Unique
  console.log("   → UNIQUE curiosity");
  return {
    isDuplicate: false,
    reason: "no-match",
    closestTitle: null,
    similarityScore: 0,
  };
}

async function embed(text) {
  try {
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return r.data[0].embedding;
  } catch (err) {
    console.warn("⚠️ embed failed:", err.message);
    return null;
  }
}
