// // ============================================================================
// // CurioWire — Topic Signature Engine v3.1 (2025 Refactor)
// // Now located in /lib/signatures and shared across CLI + Next.js
// // ============================================================================

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// // --- Shared utilities (now in same folder) ---
// import {
//   normalizeSignature,
//   extractKeyTokens,
//   buildShortSignature,
//   tokenOverlap,
//   stringOverlap,
//   compareShortSignatures,
//   embedText,
// } from "./signatureTools.js";

// // --- OpenAI client ---
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
// // 1. buildTopicSignature()
// // ============================================================================
// export async function buildTopicSignature({ category, topic }) {
//   const prompt = `
// You are generating a semantic TOPIC signature for a news article idea.
// Keep results SHORT and GENERIC — never too specific.

// Return JSON ONLY:

// {
//   "summary": "1–2 sentence topic summary",
//   "keywords": ["5–8 strongest topic words"],
//   "normalized": "very short normalized signature",
//   "signature": "compact signature string"
// }
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt + "\nTopic: " + topic }],
//       max_tokens: 120,
//       temperature: 0.1,
//     });

//     const raw = r.choices[0]?.message?.content || "{}";
//     const parsed = JSON.parse(raw);

//     const summary = parsed.summary || topic;
//     const keywords = parsed.keywords || [];

//     const normalized =
//       parsed.normalized || normalizeSignature(summary + " " + topic);

//     const short = buildShortSignature({
//       topic,
//       summary,
//       curiosity: null,
//     });

//     const signature = parsed.signature || short;
//     const finalSig = normalizeSignature(signature);

//     console.log("\n🔧 TopicSignature built:", {
//       category,
//       topic,
//       normalized,
//       signature: finalSig,
//       short,
//       keywords,
//     });

//     return {
//       category,
//       topic,
//       summary,
//       keywords,
//       normalized: normalizeSignature(normalized),
//       signature: finalSig,
//       shortSignature: short,
//     };
//   } catch (err) {
//     console.error("❌ buildTopicSignature failed:", err.message);

//     const fallback = normalizeSignature(topic);

//     return {
//       category,
//       topic,
//       summary: topic,
//       keywords: [],
//       normalized: fallback,
//       signature: fallback,
//       shortSignature: fallback,
//     };
//   }
// }

// // ============================================================================
// // 2. checkTopicDuplicate()
// // ============================================================================
// export async function checkTopicDuplicate(topicSig) {
//   const { category, normalized, signature, shortSignature } = topicSig;
//   const query = normalized || signature;

//   console.log("\n🔍 CHECK TOPIC DUPLICATE:");
//   console.log("   → query:", query);
//   console.log("   → shortSignature:", shortSignature);
//   console.log("   → category:", category);

//   // --------------------------------------------------------------------------
//   // STEP 1 — Substring + Short Signature Check within SAME CATEGORY
//   // --------------------------------------------------------------------------
//   const { data: rows1 } = await supabase
//     .from("articles")
//     .select("id, title, category, topic_signature_text, short_topic_signature")
//     .eq("category", category)
//     .limit(50);

//   if (rows1?.length) {
//     for (const row of rows1) {
//       const dbText = row.topic_signature_text || "";
//       const dbShort = row.short_topic_signature || "";

//       // A) substring
//       if (stringOverlap(query, dbText)) {
//         console.log("   🔥 MATCH: topic substring");
//         return {
//           isDuplicate: true,
//           reason: "topic-substring",
//           closestTitle: row.title,
//           similarityScore: 1.0,
//         };
//       }

//       // B) fuzzy short signature
//       const cmp = compareShortSignatures(shortSignature, dbShort);
//       if (cmp.match) {
//         console.log("   🔥 MATCH: short-signature", cmp.reason);
//         return {
//           isDuplicate: true,
//           reason: "topic-short-signature",
//           closestTitle: row.title,
//           similarityScore: cmp.score,
//         };
//       }
//     }
//   }

//   console.log("   ✓ No substring or short-signature match");

//   // --------------------------------------------------------------------------
//   // STEP 2 — Vector similarity (embedding)
//   // --------------------------------------------------------------------------
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

//   const { data: vecHits } = await supabase.rpc("match_articles", {
//     query_embedding: embed,
//     match_threshold: 0.86,
//     match_count: 1,
//   });

//   if (vecHits?.length > 0) {
//     const hit = vecHits[0];

//     if (hit.category === category) {
//       console.log("   🔥 MATCH: topic-vector");
//       console.log("   ↳ Title:", hit.title);
//       console.log("   ↳ Similarity:", hit.similarity);

//       return {
//         isDuplicate: true,
//         reason: "topic-vector",
//         closestTitle: hit.title,
//         similarityScore: hit.similarity,
//       };
//     }
//   }

//   console.log("   ✓ No vector match — topic is unique");

//   return {
//     isDuplicate: false,
//     reason: "no-match",
//     closestTitle: null,
//     similarityScore: 0,
//   };
// }

// ============================================================================
// CurioWire — Topic Signature Engine v3.2 (Lazy Supabase + Lazy OpenAI)
// Now located in /lib/signatures and shared across CLI + Next.js
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Shared utilities
import {
  normalizeSignature,
  buildShortSignature,
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
      console.error("❌ Missing OPENAI_API_KEY in topicSignature.js");
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
    console.error("❌ Missing Supabase credentials in topicSignature.js");
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ============================================================================
// 1. buildTopicSignature()
// ============================================================================
export async function buildTopicSignature({ category, topic }) {
  const client = getOpenAI();
  if (!client) {
    // fallback – gir i det minste noenlunde konsistent signatur
    const fallback = normalizeSignature(topic);
    return {
      category,
      topic,
      summary: topic,
      keywords: [],
      normalized: fallback,
      signature: fallback,
      shortSignature: fallback,
    };
  }

  const prompt = `
You are generating a semantic TOPIC signature for a news article idea.
Keep results SHORT and GENERIC — never too specific.

Return JSON ONLY:

{
  "summary": "1–2 sentence topic summary",
  "keywords": ["5–8 strongest topic words"],
  "normalized": "very short normalized signature",
  "signature": "compact signature string"
}
`;

  try {
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt + "\nTopic: " + topic }],
      max_tokens: 120,
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

    const summary = parsed.summary || topic;
    const keywords = parsed.keywords || [];

    const normalized =
      parsed.normalized || normalizeSignature(summary + " " + topic);

    let short = buildShortSignature({
      topic,
      summary,
      curiosity: null,
    });

    // === FAIL-SAFE: ensure shortSignature ALWAYS exists ===
    if (!short || typeof short !== "string" || short.trim().length < 3) {
      short =
        normalized
          .replace(/\s+/g, "_")
          .replace(/[^\w_]/g, "")
          .slice(0, 40) || "topic_sig_fallback";
    }

    const signature = parsed.signature || short;
    const finalSig = normalizeSignature(signature);

    console.log("\n🔧 TopicSignature built:", {
      category,
      topic,
      normalized,
      signature: finalSig,
      short,
      keywords,
    });

    return {
      category,
      topic,
      summary,
      keywords,
      normalized: normalizeSignature(normalized),
      signature: finalSig,
      shortSignature: short,
    };
  } catch (err) {
    console.error("❌ buildTopicSignature failed:", err.message);

    const fallback = normalizeSignature(topic);

    return {
      category,
      topic,
      summary: topic,
      keywords: [],
      normalized: fallback,
      signature: fallback,
      shortSignature: fallback,
    };
  }
}

// ============================================================================
// 2. checkTopicDuplicate()
// ============================================================================
export async function checkTopicDuplicate(topicSig) {
  const db = getSupabase();
  if (!db) {
    console.warn("⚠️ Supabase not available in checkTopicDuplicate");
    return {
      isDuplicate: false,
      reason: "no-supabase",
      closestTitle: null,
      similarityScore: 0,
    };
  }

  const { category, normalized, signature, shortSignature } = topicSig;
  const query = normalized || signature;

  console.log("\n🔍 CHECK TOPIC DUPLICATE:");
  console.log("   → query:", query);
  console.log("   → shortSignature:", shortSignature);
  console.log("   → category:", category);

  // --------------------------------------------------------------------------
  // STEP 1 — Substring + Short Signature Check within SAME CATEGORY
  // --------------------------------------------------------------------------
  const { data: rows1, error: err1 } = await db
    .from("articles")
    .select("id, title, category, topic_signature_text, short_topic_signature")
    .eq("category", category)
    .limit(50);

  if (err1) {
    console.error("❌ Supabase error in checkTopicDuplicate:", err1.message);
  }

  if (rows1?.length) {
    for (const row of rows1) {
      const dbText = row.topic_signature_text || "";
      const dbShort = row.short_topic_signature || "";

      // A) substring
      if (stringOverlap(query, dbText)) {
        console.log("   🔥 MATCH: topic substring");
        return {
          isDuplicate: true,
          reason: "topic-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      // B) fuzzy short signature
      const cmp = compareShortSignatures(shortSignature, dbShort);
      if (cmp.match) {
        console.log("   🔥 MATCH: short-signature", cmp.reason);
        return {
          isDuplicate: true,
          reason: "topic-short-signature",
          closestTitle: row.title,
          similarityScore: cmp.score,
        };
      }
    }
  }

  console.log("   ✓ No substring or short-signature match");

  // --------------------------------------------------------------------------
  // STEP 2 — Vector similarity (embedding)
  // --------------------------------------------------------------------------
  const embed = await embedText(query);

  if (!embed) {
    console.log("   ⚠️ Embedding failed → skipping vector check");
    return {
      isDuplicate: false,
      reason: "no-embedding",
      closestTitle: null,
      similarityScore: 0,
    };
  }

  const { data: vecHits, error: err2 } = await db.rpc("match_articles", {
    query_embedding: embed,
    match_threshold: 0.86,
    match_count: 1,
  });

  if (err2) {
    console.error("❌ Supabase RPC error (match_articles):", err2.message);
  }

  if (vecHits?.length > 0) {
    const hit = vecHits[0];

    if (hit.category === category) {
      console.log("   🔥 MATCH: topic-vector");
      console.log("   ↳ Title:", hit.title);
      console.log("   ↳ Similarity:", hit.similarity);

      return {
        isDuplicate: true,
        reason: "topic-vector",
        closestTitle: hit.title,
        similarityScore: hit.similarity,
      };
    }
  }

  console.log("   ✓ No vector match — topic is unique");

  return {
    isDuplicate: false,
    reason: "no-match",
    closestTitle: null,
    similarityScore: 0,
  };
}
