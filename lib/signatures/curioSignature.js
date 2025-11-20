// // ============================================================================
// // CurioWire — Curiosity Signature Engine v3.2 (Lazy Supabase + Lazy OpenAI)
// // ============================================================================

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// import {
//   normalizeSignature,
//   extractKeyTokens,
//   buildShortSignature,
//   tokenOverlap,
//   stringOverlap,
//   compareShortSignatures,
//   embedText,
//   semanticTokenMatch,
// } from "./signatureTools.js";

// // ============================================================================
// // LAZY OPENAI CLIENT
// // ============================================================================
// let openaiClient = null;
// function getOpenAI() {
//   if (!openaiClient) {
//     const key = process.env.OPENAI_API_KEY;
//     if (!key) {
//       console.error("❌ Missing OPENAI_API_KEY");
//       return null;
//     }
//     openaiClient = new OpenAI({ apiKey: key });
//   }
//   return openaiClient;
// }

// // ============================================================================
// // LAZY SUPABASE CLIENT
// // ============================================================================
// let supabase = null;

// function getSupabase() {
//   if (supabase) return supabase;

//   const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key =
//     process.env.SUPABASE_SERVICE_ROLE_KEY ||
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

//   if (!url || !key) {
//     console.error("❌ Missing Supabase credentials in curioSignature.js");
//     return null;
//   }

//   supabase = createClient(url, key);
//   return supabase;
// }

// // ============================================================================
// // 1. buildCurioSignature()
// // ============================================================================
// export async function buildCurioSignature({ category, topic, curiosity }) {
//   const client = getOpenAI();
//   if (!client) return null;

//   const prompt = `
// You are creating a semantic fingerprint for a historical or scientific CURIOSITY.
// Your job is to make signatures SHORT and GENERIC.

// Return JSON ONLY:

// {
//   "summary": "1–2 sentence factual summary",
//   "keywords": ["5–8 strongest keywords"],
//   "normalized": "very short normalized signature",
//   "signature": "compact signature string"
// }
// `;

//   try {
//     const r = await client.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "user", content: prompt + "\nCuriosity: " + curiosity },
//       ],
//       max_tokens: 160,
//       temperature: 0.1,
//     });

//     let raw = r.choices[0]?.message?.content || "{}";

//     // --- STRIP ANY CODE FENCES OR FORMATTING ---
//     raw = raw
//       .replace(/```json/gi, "")
//       .replace(/```/g, "")
//       .replace(/^json\s*/i, "")
//       .replace(/[\u0000-\u001F]+/g, "") // remove control chars
//       .trim();

//     // Extra safety: extract the first {...} block if GPT wrapped in text
//     const match = raw.match(/\{[\s\S]*\}/);
//     if (match) raw = match[0];

//     let parsed;
//     try {
//       parsed = JSON.parse(raw);
//     } catch (e) {
//       console.error("❌ JSON parse failed, raw was:", raw);
//       throw e;
//     }

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
//   const db = getSupabase();
//   if (!db) return { isDuplicate: false };

//   const { normalized, signature, shortSignature, keywords } = sig;
//   const query = normalized || signature;

//   const { data: rows } = await db
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

//       if (stringOverlap(query, sem)) {
//         return {
//           isDuplicate: true,
//           reason: "curio-semantic-substring",
//           closestTitle: row.title,
//           similarityScore: 1.0,
//         };
//       }

//       if (stringOverlap(query, curio)) {
//         return {
//           isDuplicate: true,
//           reason: "curio-signature-substring",
//           closestTitle: row.title,
//           similarityScore: 1.0,
//         };
//       }

//       const cmp = compareShortSignatures(shortSignature, dbShort);
//       if (cmp.match) {
//         return {
//           isDuplicate: true,
//           reason: "curio-short-signature",
//           closestTitle: row.title,
//           similarityScore: cmp.score,
//         };
//       }
//     }
//   }

//   // keyword step
//   if (keywords?.length) {
//     for (const row of rows || []) {
//       const txt =
//         (row.curio_signature_text || "") + " " + (row.semantic_signature || "");
//       const hits = keywords.filter((k) => txt.includes(k.toLowerCase()));
//       if (hits.length >= 3) {
//         return {
//           isDuplicate: true,
//           reason: "curio-keyword-overlap",
//           closestTitle: row.title,
//           similarityScore: 0.7,
//         };
//       }
//     }
//   }

//   // NEW STEP — SEMANTIC SIGNATURE OVERLAP (UNIVERSAL, NO GPT)
//   for (const row of rows || []) {
//     const compare = semanticTokenMatch(
//       row.semantic_signature || "",
//       sig.normalized || ""
//     );

//     if (compare.match) {
//       return {
//         isDuplicate: true,
//         reason: "semantic-token-overlap",
//         closestTitle: row.title,
//         similarityScore: compare.score,
//         overlap: compare.overlap,
//         ratio: compare.ratio,
//       };
//     }
//   }

//   // vector step
//   const embed = await embedText(query);
//   if (!embed) return { isDuplicate: false };

//   const { data: vecHits } = await db.rpc("match_articles", {
//     query_embedding: embed,
//     match_threshold: 0.82,
//     match_count: 1,
//   });

//   if (vecHits?.length > 0) {
//     const hit = vecHits[0];
//     return {
//       isDuplicate: true,
//       reason: "curio-vector",
//       closestTitle: hit.title,
//       similarityScore: hit.similarity,
//     };
//   }

//   return { isDuplicate: false };
// }

// ============================================================================
// CurioWire — Curiosity Signature Engine v5.0 (Unified Signature Format)
// Matches format of topicSignature.js and signatureTools.js unified builder
// ============================================================================

import { createClient } from "@supabase/supabase-js";

import {
  buildUnifiedSignature,
  normalizeSignature,
  compareShortSignatures,
  stringOverlap,
  semanticTokenMatch,
  embedText,
} from "./signatureTools.js";

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
// 1. buildCurioSignature() — Unified v5
//    Mirrors topicSignature.js but uses type: "curio"
// ============================================================================
export async function buildCurioSignature({ category, topic, curiosity }) {
  if (!curiosity || !curiosity.trim()) {
    const fallback = normalizeSignature(curiosity || "");
    return {
      category,
      topic,
      curiosity,
      summary: "",
      keywords: [],
      normalized: fallback,
      signature: fallback,
      shortSignature: fallback,
    };
  }

  // === Core unified signature builder ===
  const unified = await buildUnifiedSignature({
    category,
    type: "curio",
    input: curiosity,
  });

  console.log("\n🔧 Unified CurioSignature built:", {
    category,
    curiosity,
    normalized: unified.normalized,
    signature: unified.signature,
    short: unified.shortSignature,
    keywords: unified.keywords,
  });

  // Output shape must remain identical to v3; only values changed
  return {
    category,
    topic,
    curiosity,
    summary: unified.summary,
    keywords: unified.keywords,
    normalized: unified.normalized,
    signature: unified.signature,
    shortSignature: unified.shortSignature,
  };
}

// ============================================================================
// 2. checkCurioDuplicate() — Full unified logic
//    Checks across ALL categories (curiosities transcend category boundaries)
// ============================================================================
export async function checkCurioDuplicate(sig) {
  const db = getSupabase();
  if (!db) {
    console.warn("⚠️ No Supabase — cannot check curio duplicates");
    return { isDuplicate: false };
  }

  const { normalized, signature, shortSignature, keywords } = sig;
  const query = normalized || signature;

  console.log("\n🔍 CHECK CURIO DUPLICATE:");
  console.log("   → query:", query);
  console.log("   → shortSignature:", shortSignature);

  // Fetch full set of signatures for comparison
  const { data: rows, error } = await db
    .from("articles")
    .select(
      "id, title, category, semantic_signature, curio_signature_text, short_curio_signature"
    )
    .limit(200);

  if (error) {
    console.error("❌ Supabase error in checkCurioDuplicate:", error.message);
    return { isDuplicate: false };
  }

  // ==========================================================================
  // STEP 1 — Substring & short-signature (strong matches)
  // ==========================================================================
  if (rows?.length) {
    for (const row of rows) {
      const sem = row.semantic_signature || "";
      const curio = row.curio_signature_text || "";
      const dbShort = row.short_curio_signature || "";

      // A) Substring semantic_signature
      if (stringOverlap(query, sem)) {
        console.log("   🔥 MATCH: curio-semantic-substring");
        return {
          isDuplicate: true,
          reason: "curio-semantic-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      // B) Substring curio_signature_text
      if (stringOverlap(query, curio)) {
        console.log("   🔥 MATCH: curio-signature-substring");
        return {
          isDuplicate: true,
          reason: "curio-signature-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      // C) Fuzzy short-signature
      const cmp = compareShortSignatures(shortSignature, dbShort);
      if (cmp.match) {
        console.log("   🔥 MATCH: curio-short-signature", cmp.reason);
        return {
          isDuplicate: true,
          reason: "curio-short-signature",
          closestTitle: row.title,
          similarityScore: cmp.score,
        };
      }
    }
  }

  // ==========================================================================
  // STEP 2 — Keyword overlap (soft but common-sense)
  // ==========================================================================
  if (keywords?.length) {
    for (const row of rows || []) {
      const txt =
        (row.curio_signature_text || "") + " " + (row.semantic_signature || "");
      const hits = keywords.filter((k) => txt.includes(k.toLowerCase().trim()));
      if (hits.length >= 3) {
        console.log("   🔥 MATCH: curio-keyword-overlap");
        return {
          isDuplicate: true,
          reason: "curio-keyword-overlap",
          closestTitle: row.title,
          similarityScore: 0.7,
        };
      }
    }
  }

  // ==========================================================================
  // STEP 3 — Semantic token overlap (unified)
  // ==========================================================================
  for (const row of rows || []) {
    const compare = semanticTokenMatch(
      row.semantic_signature || "",
      sig.normalized || ""
    );

    if (compare.match) {
      console.log("   🔥 MATCH: curio semantic-token-overlap");
      return {
        isDuplicate: true,
        reason: "semantic-token-overlap",
        closestTitle: row.title,
        similarityScore: compare.score,
        overlap: compare.overlap,
        ratio: compare.ratio,
      };
    }
  }

  // ==========================================================================
  // STEP 4 — Vector similarity (embedding)
  // ==========================================================================
  const embed = await embedText(query);
  if (!embed) {
    console.log("   ⚠️ Vector embedding failed — skipping");
    return { isDuplicate: false };
  }

  const { data: vecHits, error: rpcErr } = await db.rpc("match_articles", {
    query_embedding: embed,
    match_threshold: 0.82,
    match_count: 1,
  });

  if (rpcErr) {
    console.error("❌ Supabase RPC error:", rpcErr.message);
    return { isDuplicate: false };
  }

  if (vecHits?.length > 0) {
    const hit = vecHits[0];
    console.log("   🔥 MATCH: curio-vector");
    return {
      isDuplicate: true,
      reason: "curio-vector",
      closestTitle: hit.title,
      similarityScore: hit.similarity,
    };
  }

  // ==========================================================================
  // UNIQUE
  // ==========================================================================
  console.log("   ✓ Curiosity is unique");
  return { isDuplicate: false };
}
