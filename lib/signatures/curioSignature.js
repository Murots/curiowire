// // ============================================================================
// // CurioWire — Curiosity Signature Engine v3.1 (2025 Refactor)
// // Now located in /lib/signatures and shared across:
// //  • generate.js
// //  • migrateSignatures.js
// //  • Next.js API routes
// // ============================================================================

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// // --- Shared signature engine utilities ---
// import {
//   normalizeSignature,
//   extractKeyTokens,
//   buildShortSignature,
//   tokenOverlap,
//   stringOverlap,
//   compareShortSignatures,
//   embedText,
// } from "./signatureTools.js";

// // --- OpenAI client (safe for CLI + server runtime) ---
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // --- Supabase client ---
// const supabase = createClient(
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY ||
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// // ============================================================================
// // 1. buildCurioSignature()
// // ============================================================================
// export async function buildCurioSignature({ category, topic, curiosity }) {
//   const prompt = `
// You are creating a semantic fingerprint for a historical or scientific CURIOSITY.
// Your job is to make signatures SHORT and GENERIC so they match similar curiosities.

// Return JSON ONLY:

// {
//   "summary": "1–2 sentence factual summary",
//   "keywords": ["5–8 strongest keywords"],
//   "normalized": "very short normalized signature",
//   "signature": "compact signature string"
// }
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "user",
//           content: prompt + "\nCuriosity: " + curiosity,
//         },
//       ],
//       max_tokens: 160,
//       temperature: 0.1,
//     });

//     const raw = r.choices[0]?.message?.content || "{}";
//     const parsed = JSON.parse(raw);

//     const summary = parsed.summary || curiosity.slice(0, 200);
//     const keywords = parsed.keywords || [];

//     const normalized =
//       parsed.normalized || normalizeSignature(summary + " " + curiosity);

//     const short = buildShortSignature({
//       topic,
//       summary,
//       curiosity,
//     });

//     const signature = parsed.signature || `${normalized} ${keywords.join(" ")}`;
//     const finalSig = normalizeSignature(signature);

//     console.log("\n🔧 CurioSignature built:", {
//       category,
//       topic,
//       curiosity,
//       summary,
//       keywords,
//       normalized,
//       signature: finalSig,
//       shortSignature: short,
//     });

//     return {
//       category,
//       topic,
//       curiosity,
//       summary,
//       keywords,
//       normalized: normalizeSignature(normalized),
//       signature: finalSig,
//       shortSignature: short,
//     };
//   } catch (err) {
//     console.error("❌ buildCurioSignature failed:", err.message);

//     const fallback = normalizeSignature(curiosity);

//     return {
//       category,
//       topic,
//       curiosity,
//       summary: curiosity.slice(0, 200),
//       keywords: [],
//       normalized: fallback,
//       signature: fallback,
//       shortSignature: fallback,
//     };
//   }
// }

// // ============================================================================
// // 2. checkCurioDuplicate()
// // ============================================================================
// export async function checkCurioDuplicate(sig) {
//   const { normalized, signature, shortSignature, keywords } = sig;
//   const query = normalized || signature;

//   console.log("\n🔍 CHECK CURIO DUPLICATE:");
//   console.log("   → query:", query);
//   console.log("   → shortSignature:", shortSignature);

//   // --------------------------------------------------------------------------
//   // Step 1 — Pull 100 candidates from DB for substring + shortSig + keyword check
//   // --------------------------------------------------------------------------
//   const { data: rows } = await supabase
//     .from("articles")
//     .select(
//       "id, title, semantic_signature, curio_signature_text, short_curio_signature, category"
//     )
//     .limit(100);

//   if (rows?.length) {
//     for (const row of rows) {
//       const sem = row.semantic_signature || "";
//       const curio = row.curio_signature_text || "";
//       const dbShort = row.short_curio_signature || "";

//       // A) semantic substring
//       if (stringOverlap(query, sem)) {
//         console.log("   🔥 MATCH: semantic_signature substring");
//         return {
//           isDuplicate: true,
//           reason: "curio-semantic-substring",
//           closestTitle: row.title,
//           similarityScore: 1.0,
//         };
//       }

//       // B) signature substring
//       if (stringOverlap(query, curio)) {
//         console.log("   🔥 MATCH: curio_signature_text substring");
//         return {
//           isDuplicate: true,
//           reason: "curio-signature-substring",
//           closestTitle: row.title,
//           similarityScore: 1.0,
//         };
//       }

//       // C) fuzzy short signature match
//       const cmp = compareShortSignatures(shortSignature, dbShort);
//       if (cmp.match) {
//         console.log("   🔥 MATCH: short-signature", cmp.reason);
//         return {
//           isDuplicate: true,
//           reason: "curio-short-signature",
//           closestTitle: row.title,
//           similarityScore: cmp.score,
//         };
//       }
//     }
//   }

//   console.log("   ✓ No substring / short-signature match");

//   // --------------------------------------------------------------------------
//   // Step 2 — Keyword overlap (>=3)
//   // --------------------------------------------------------------------------
//   if (keywords?.length) {
//     console.log("   → Checking keyword overlap (need ≥3)…");

//     for (const row of rows || []) {
//       const txt =
//         (row.curio_signature_text || "") + " " + (row.semantic_signature || "");

//       const hits = keywords.filter((k) => txt.includes(k.toLowerCase()));

//       console.log(`     - Compared with "${row.title}" → hits: ${hits.length}`);

//       if (hits.length >= 3) {
//         console.log("   🔥 MATCH: keyword-overlap (≥3)");
//         return {
//           isDuplicate: true,
//           reason: "curio-keyword-overlap",
//           closestTitle: row.title,
//           similarityScore: 0.7,
//         };
//       }
//     }
//   }

//   console.log("   ✓ No keyword overlap match");

//   // --------------------------------------------------------------------------
//   // Step 3 — Embedding similarity
//   // --------------------------------------------------------------------------
//   console.log("   → Embedding query…");

//   const embed = await embedText(query);
//   if (!embed) {
//     console.log("   ⚠️ Embedding failed → skipping vector check");
//     return {
//       isDuplicate: false,
//       reason: "no-embedding",
//       closestTitle: null,
//       similarityScore: 0,
//     };
//   }

//   console.log("   → Running vector similarity (threshold 0.82)…");

//   const { data: vecHits } = await supabase.rpc("match_articles", {
//     query_embedding: embed,
//     match_threshold: 0.82,
//     match_count: 1,
//   });

//   if (vecHits?.length > 0) {
//     const hit = vecHits[0];
//     console.log("   🔥 MATCH: vector similarity");
//     console.log("   ↳ Title:", hit.title, " score:", hit.similarity);

//     return {
//       isDuplicate: true,
//       reason: "curio-vector",
//       closestTitle: hit.title,
//       similarityScore: hit.similarity,
//     };
//   }

//   console.log("   ✓ No vector match → UNIQUE curiosity");

//   return {
//     isDuplicate: false,
//     reason: "no-match",
//     closestTitle: null,
//     similarityScore: 0,
//   };
// }

// ============================================================================
// CurioWire — Curiosity Signature Engine v3.2 (Lazy Supabase + Lazy OpenAI)
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import {
  normalizeSignature,
  extractKeyTokens,
  buildShortSignature,
  tokenOverlap,
  stringOverlap,
  compareShortSignatures,
  embedText,
} from "./signatureTools.js";

// ============================================================================
// LAZY OPENAI CLIENT
// ============================================================================
let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error("❌ Missing OPENAI_API_KEY");
      return null;
    }
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

// ============================================================================
// LAZY SUPABASE CLIENT
// ============================================================================
let supabase = null;

function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ Missing Supabase credentials in curioSignature.js");
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ============================================================================
// 1. buildCurioSignature()
// ============================================================================
export async function buildCurioSignature({ category, topic, curiosity }) {
  const client = getOpenAI();
  if (!client) return null;

  const prompt = `
You are creating a semantic fingerprint for a historical or scientific CURIOSITY.
Your job is to make signatures SHORT and GENERIC.

Return JSON ONLY:

{
  "summary": "1–2 sentence factual summary",
  "keywords": ["5–8 strongest keywords"],
  "normalized": "very short normalized signature",
  "signature": "compact signature string"
}
`;

  try {
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt + "\nCuriosity: " + curiosity },
      ],
      max_tokens: 160,
      temperature: 0.1,
    });

    let raw = r.choices[0]?.message?.content || "{}";

    // --- STRIP ANY CODE FENCES OR FORMATTING ---
    raw = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^json\s*/i, "")
      .replace(/[\u0000-\u001F]+/g, "") // remove control chars
      .trim();

    // Extra safety: extract the first {...} block if GPT wrapped in text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) raw = match[0];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("❌ JSON parse failed, raw was:", raw);
      throw e;
    }

    const summary = parsed.summary || curiosity.slice(0, 200);
    const keywords = parsed.keywords || [];

    const normalized =
      parsed.normalized || normalizeSignature(summary + " " + curiosity);

    const short = buildShortSignature({
      topic,
      summary,
      curiosity,
    });

    const signature = parsed.signature || `${normalized} ${keywords.join(" ")}`;
    const finalSig = normalizeSignature(signature);

    return {
      category,
      topic,
      curiosity,
      summary,
      keywords,
      normalized: normalizeSignature(normalized),
      signature: finalSig,
      shortSignature: short,
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
      shortSignature: fallback,
    };
  }
}

// ============================================================================
// 2. checkCurioDuplicate()
// ============================================================================
export async function checkCurioDuplicate(sig) {
  const db = getSupabase();
  if (!db) return { isDuplicate: false };

  const { normalized, signature, shortSignature, keywords } = sig;
  const query = normalized || signature;

  const { data: rows } = await db
    .from("articles")
    .select(
      "id, title, semantic_signature, curio_signature_text, short_curio_signature, category"
    )
    .limit(100);

  if (rows?.length) {
    for (const row of rows) {
      const sem = row.semantic_signature || "";
      const curio = row.curio_signature_text || "";
      const dbShort = row.short_curio_signature || "";

      if (stringOverlap(query, sem)) {
        return {
          isDuplicate: true,
          reason: "curio-semantic-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      if (stringOverlap(query, curio)) {
        return {
          isDuplicate: true,
          reason: "curio-signature-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      const cmp = compareShortSignatures(shortSignature, dbShort);
      if (cmp.match) {
        return {
          isDuplicate: true,
          reason: "curio-short-signature",
          closestTitle: row.title,
          similarityScore: cmp.score,
        };
      }
    }
  }

  // keyword step
  if (keywords?.length) {
    for (const row of rows || []) {
      const txt =
        (row.curio_signature_text || "") + " " + (row.semantic_signature || "");
      const hits = keywords.filter((k) => txt.includes(k.toLowerCase()));
      if (hits.length >= 3) {
        return {
          isDuplicate: true,
          reason: "curio-keyword-overlap",
          closestTitle: row.title,
          similarityScore: 0.7,
        };
      }
    }
  }

  // vector step
  const embed = await embedText(query);
  if (!embed) return { isDuplicate: false };

  const { data: vecHits } = await db.rpc("match_articles", {
    query_embedding: embed,
    match_threshold: 0.82,
    match_count: 1,
  });

  if (vecHits?.length > 0) {
    const hit = vecHits[0];
    return {
      isDuplicate: true,
      reason: "curio-vector",
      closestTitle: hit.title,
      similarityScore: hit.similarity,
    };
  }

  return { isDuplicate: false };
}
