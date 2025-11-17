// // === CurioWire Topic Signature Engine v3.0 ===
// // Hindrer at to artikler handler om det samme *temaet*,
// // uavhengig av kuriositeten som velges senere.
// //
// // TopicSignature består av:
// //   • summary      – kort 1–2 setnings oppsummering
// //   • keywords     – 5–10 nøkkelord
// //   • normalized   – 8–12 ord, stoppord fjernet, svært generisk
// //   • signature    – lagres i topic_signature_text
// //
// // checkTopicDuplicate gjør GLOBAL sjekk mot articles-tabellen:
// //   • substring match (topic_signature_text, semantic_signature, curio_signature_text)
// //   • keyword overlap ≥ 3
// //   • vector similarity (embedding ≥ 0.86)
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
// export function normalizeTopic(str = "") {
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
// // buildTopicSignature
// // ----------------------------------------------------
// export async function buildTopicSignature({ category, topic }) {
//   const prompt = `
// You are creating a compact semantic fingerprint for a *topic idea*.
// It must be short, generic (8–12 words), and NOT a sentence.
// Return JSON ONLY.

// Topic: "${topic}"
// Category: "${category}"

// Return exactly:

// {
//   "summary": "1–2 sentence topic summary",
//   "keywords": ["5-10 sharp keywords"],
//   "normalized": "8-12 word normalized string",
//   "signature": "same as normalized or compact variant"
// }
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 160,
//       temperature: 0.1,
//     });

//     const raw = r.choices[0]?.message?.content || "{}";
//     const parsed = JSON.parse(raw);

//     // Summary
//     const summary = (parsed.summary && String(parsed.summary)) || topic;

//     // Keywords
//     const rawKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
//     const keywords = Array.from(
//       new Set(
//         rawKeywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean)
//       )
//     );

//     // Normalized
//     const normalizedBase =
//       typeof parsed.normalized === "string"
//         ? parsed.normalized
//         : `${summary} ${keywords.join(" ")} ${topic}`;

//     const normalized = clampWords(normalizeTopic(normalizedBase), 12);

//     // Signature (lagres i DB)
//     const signature =
//       typeof parsed.signature === "string"
//         ? clampWords(normalizeTopic(parsed.signature), 12)
//         : normalized;

//     return {
//       category,
//       topic,
//       summary,
//       keywords,
//       normalized,
//       signature,
//     };
//   } catch (err) {
//     console.error("❌ buildTopicSignature failed:", err.message);

//     const fallback = clampWords(normalizeTopic(topic), 12);

//     return {
//       category,
//       topic,
//       summary: topic,
//       keywords: [],
//       normalized: fallback,
//       signature: fallback,
//     };
//   }
// }

// // ----------------------------------------------------
// // Embedding wrapper
// // ----------------------------------------------------
// async function embedTopic(text) {
//   try {
//     const r = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: text,
//     });
//     return r.data[0].embedding;
//   } catch (err) {
//     console.warn("⚠️ Topic embedding failed:", err.message);
//     return null;
//   }
// }

// // ----------------------------------------------------
// // checkTopicDuplicate – GLOBAL
// // ----------------------------------------------------
// export async function checkTopicDuplicate(topicSig) {
//   const query =
//     clampWords(
//       normalizeTopic(topicSig?.normalized || topicSig?.signature || ""),
//       12
//     ) || "";

//   if (!query) {
//     return {
//       isDuplicate: false,
//       reason: "empty-query",
//       closestTitle: null,
//       similarityScore: 0,
//     };
//   }

//   // ----------------------------------------------------
//   // 1. Substring match (topic, semantic, curio)
//   // ----------------------------------------------------
//   const { data: subRows, error: subErr } = await supabase
//     .from("articles")
//     .select(
//       "id, title, category, topic_signature_text, semantic_signature, curio_signature_text"
//     )
//     .eq("category", topicSig.category) // topics stopper kun i samme kategori
//     .or(
//       `topic_signature_text.ilike.%${query}%,semantic_signature.ilike.%${query}%,curio_signature_text.ilike.%${query}%`
//     )
//     .limit(1);

//   if (!subErr && subRows?.length > 0) {
//     return {
//       isDuplicate: true,
//       reason: "topic-substring",
//       closestTitle: subRows[0].title,
//       similarityScore: 1.0,
//     };
//   }

//   // ----------------------------------------------------
//   // 2. Keyword overlap ≥ 3
//   // ----------------------------------------------------
//   const keywords = (topicSig.keywords || []).map((k) => k.toLowerCase());

//   if (keywords.length > 0) {
//     const { data: kwRows } = await supabase
//       .from("articles")
//       .select(
//         "id, title, category, topic_signature_text, semantic_signature, curio_signature_text"
//       )
//       .eq("category", topicSig.category)
//       .limit(200);

//     if (kwRows) {
//       for (const row of kwRows) {
//         const txt = [
//           row.topic_signature_text,
//           row.semantic_signature,
//           row.curio_signature_text,
//         ]
//           .filter(Boolean)
//           .join(" ")
//           .toLowerCase();

//         const overlap = keywords.filter((k) => txt.includes(k));

//         if (overlap.length >= 3) {
//           return {
//             isDuplicate: true,
//             reason: "topic-keyword-overlap",
//             closestTitle: row.title,
//             similarityScore: 0.75,
//           };
//         }
//       }
//     }
//   }

//   // ----------------------------------------------------
//   // 3. Embedding similarity ≥ 0.86
//   // ----------------------------------------------------
//   const vec = await embedTopic(query);

//   if (vec) {
//     const { data: vecHits, error: vecErr } = await supabase.rpc(
//       "match_articles",
//       {
//         query_embedding: vec,
//         match_threshold: 0.86,
//         match_count: 1,
//       }
//     );

//     if (!vecErr && vecHits?.length > 0) {
//       const hit = vecHits[0];

//       if (hit.category === topicSig.category) {
//         return {
//           isDuplicate: true,
//           reason: "topic-vector",
//           closestTitle: hit.title,
//           similarityScore: hit.similarity,
//         };
//       }
//     }
//   }

//   // ----------------------------------------------------
//   // 4. Unik topic
//   // ----------------------------------------------------
//   return {
//     isDuplicate: false,
//     reason: "no-match",
//     closestTitle: null,
//     similarityScore: 0,
//   };
// }

// === CurioWire Topic Signature Engine v1.1 (with deep logging) ===

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

// ----------------------------------------------------
// Local normalize helper
// ----------------------------------------------------
export function normalizeTopic(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(the|a|an|and|of|in|on|for|to|from|by|with|at|is|was|were|has|had|this|that|these|those)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------------------------------
// buildTopicSignature(topic)
// ----------------------------------------------------
export async function buildTopicSignature({ category, topic }) {
  const prompt = `
You are creating a semantic fingerprint for a *topic idea* of a news article.
Return JSON ONLY.

Topic: "${topic}"
Category: "${category}"

Return exactly:

{
  "summary": "1–2 sentence topic summary",
  "keywords": ["5-10 sharp keywords"],
  "normalized": "short normalized signature",
  "signature": "compact signature string"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.1,
    });

    const raw = r.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const summary = parsed.summary || topic;
    const keywords = parsed.keywords || [];
    const normalized = parsed.normalized || normalizeTopic(summary);
    const signature =
      parsed.signature || `${normalized} ${keywords.join(" ")}`.trim();

    console.log("\n🔧 TopicSignature built:", {
      category,
      topic,
      normalized,
      signature,
      keywords,
    });

    return {
      category,
      topic,
      summary,
      keywords,
      normalized,
      signature: normalizeTopic(signature),
    };
  } catch (err) {
    console.error("❌ buildTopicSignature failed:", err.message);

    const fallback = normalizeTopic(topic);
    return {
      category,
      topic,
      summary: topic,
      keywords: [],
      normalized: fallback,
      signature: fallback,
    };
  }
}

// ----------------------------------------------------
// Deep Logging: checkTopicDuplicate
// ----------------------------------------------------
export async function checkTopicDuplicate(topicSig) {
  const { normalized, signature, category } = topicSig;
  const query = normalized || signature;

  console.log("\n🔍 CHECK TOPIC DUPLICATE:");
  console.log("   → query:", query);
  console.log("   → category:", category);

  // 1) substring match
  const { data: rows1 } = await supabase
    .from("articles")
    .select("id, title, category, topic_signature_text")
    .eq("category", category)
    .ilike("topic_signature_text", `%${query}%`)
    .limit(1);

  if (rows1?.length > 0) {
    console.log("   🔥 MATCH: Topic substring");
    console.log("   ↳ Matched article:", rows1[0].title);
    return {
      isDuplicate: true,
      reason: "topic-substring",
      closestTitle: rows1[0].title,
      similarityScore: 1.0,
    };
  } else {
    console.log("   ✓ No substring match");
  }

  // 2) vector similarity
  const embed = await embedTopic(query);

  if (!embed) {
    console.log("   ⚠️ Embedding failed → skipping vector check");
    return {
      isDuplicate: false,
      reason: "no-embedding",
      closestTitle: null,
      similarityScore: 0,
    };
  }

  const { data: vecHits } = await supabase.rpc("match_articles", {
    query_embedding: embed,
    match_threshold: 0.86,
    match_count: 1,
  });

  if (vecHits?.length > 0) {
    const hit = vecHits[0];

    if (hit.category === category) {
      console.log("   🔥 MATCH: Vector similarity");
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

  console.log("   ✓ No vector match");
  return {
    isDuplicate: false,
    reason: "no-match",
    closestTitle: null,
    similarityScore: 0,
  };
}

async function embedTopic(text) {
  try {
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return r.data[0].embedding;
  } catch {
    return null;
  }
}
