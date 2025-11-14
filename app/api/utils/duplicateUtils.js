// // === app/api/utils/duplicateUtils.js ===
// // 🧠 CurioWire Duplicate & Similarity Tools
// // Brukes for å unngå dupliserte artikler og overlappende temaer

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// // === INIT ===
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // 🔐 Støtter både lokal/Vercel (NEXT_PUBLIC_) og GitHub Actions (uten prefix)
// const supabase = createClient(
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY ||
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// /**
//  * 🔹 Genererer embedding for gitt tekst
//  */
// async function generateEmbedding(text) {
//   try {
//     const emb = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: text,
//     });
//     return emb.data[0].embedding;
//   } catch (err) {
//     console.warn("⚠️ Embedding generation failed:", err.message);
//     return null;
//   }
// }

// /**
//  * 🔹 Sjekker om tema allerede finnes (enkelt søk + vektor-søk)
//  */
// export async function checkDuplicateTopic(category, topic) {
//   try {
//     // 1️⃣ Rask tittelmatch fra siste 48 timer
//     const { data: recent, error: fetchErr } = await supabase
//       .from("articles")
//       .select("id, title, embedding, created_at")
//       .eq("category", category)
//       .gte(
//         "created_at",
//         new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
//       );

//     if (fetchErr) {
//       console.warn("⚠️ Supabase fetch error:", fetchErr.message);
//       return { existing: [], alreadyExists: false };
//     }

//     const alreadyExists = recent?.some((a) =>
//       a.title?.toLowerCase().includes(topic.toLowerCase())
//     );
//     if (alreadyExists) {
//       console.log(`🚫 Title duplicate found for ${category}: ${topic}`);
//       return { existing: recent, alreadyExists: true };
//     }

//     // 2️⃣ Embedding-sjekk mot vektorfeltet
//     const topicEmbedding = await generateEmbedding(topic);
//     if (!topicEmbedding) {
//       return { existing: recent, alreadyExists: false };
//     }

//     const { data: similarArticles, error } = await supabase.rpc(
//       "match_articles", // custom SQL RPC function
//       {
//         query_embedding: topicEmbedding,
//         match_threshold: 0.85, // 0–1 cosine similarity
//         match_count: 3,
//       }
//     );

//     if (error) {
//       console.warn("⚠️ Embedding RPC not available:", error.message);
//       return { existing: recent, alreadyExists: false };
//     }

//     const highSim = similarArticles?.some(
//       (a) => a.similarity && a.similarity > 0.85
//     );

//     if (highSim) {
//       console.log(`🚫 Vector match found for ${category}: ${topic}`);
//       return { existing: recent, alreadyExists: true };
//     }

//     return { existing: recent, alreadyExists: false };
//   } catch (err) {
//     console.warn("⚠️ checkDuplicateTopic failed:", err.message);
//     return { existing: [], alreadyExists: false };
//   }
// }

// /**
//  * 🔹 Sjekker semantisk likhet mellom titler (GPT fallback)
//  */
// export async function checkSimilarTitles(existing, topic, category) {
//   try {
//     const recentTitles = existing?.slice(-10).map((a) => a.title) || [];
//     for (const prev of recentTitles) {
//       const simPrompt = `
// Determine if these two headlines describe the *same underlying topic*.
// Answer only "YES" or "NO".
// Headline A: "${prev}"
// Headline B: "${topic}"
// `;
//       const simCheck = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [{ role: "user", content: simPrompt }],
//         max_tokens: 2,
//         temperature: 0,
//       });

//       const ans = simCheck.choices[0]?.message?.content?.trim().toUpperCase();
//       if (ans?.includes("YES")) {
//         console.log(
//           `🚫 GPT semantic similarity detected for ${category}: ${topic}`
//         );
//         return true;
//       }
//     }
//     return false;
//   } catch (err) {
//     console.warn("⚠️ checkSimilarTitles failed:", err.message);
//     return false;
//   }
// }

// === app/api/utils/duplicateUtils.js ===
// 🧠 CurioWire Duplicate & Similarity Tools (v4.2)
// Full global duplikatsikring, integrert med semantic_signature + HNSW vector index

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// INIT
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ----------------------------------------------------
// 🧹 NORMALIZATION — brukes både i DB og i runtime
// Må matche den du bruker ved INSERT av artikler
// ----------------------------------------------------
export function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(the|a|an|and|of|in|on|for|to|from|by|with|at)\b/gi, "")
    .replace(
      /\b(ancient|historic|history|first|early|modern|club|book)\b/gi,
      ""
    )
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------------------------------
// 🔹 GENERATE EMBEDDING (topic + title + normalized signature)
// ----------------------------------------------------
async function generateEmbedding(text) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return emb.data[0].embedding;
  } catch (err) {
    console.warn("⚠️ Embedding generation failed:", err.message);
    return null;
  }
}

// ----------------------------------------------------
// 🔍 QUICK STRING MATCH VIA semantic_signature (billigst!)
// ----------------------------------------------------
async function signatureStringMatch(normalizedSignature) {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, semantic_signature")
      .ilike("semantic_signature", `%${normalizedSignature}%`);

    if (error) {
      console.warn("⚠️ Signature text search error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("⚠️ Signature substring match failed:", err.message);
    return [];
  }
}

// ----------------------------------------------------
// 🔎 GLOBAL VECTOR SEARCH (HNSW index)
// ----------------------------------------------------
async function vectorSearch(embedding) {
  try {
    const { data, error } = await supabase.rpc("match_articles", {
      query_embedding: embedding,
      match_threshold: 0.8,
      match_count: 3,
    });

    if (error) {
      console.warn("⚠️ Vector search RPC error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("⚠️ Vector search failed:", err.message);
    return [];
  }
}

// ----------------------------------------------------
// 🔥 GPT FALLBACK (kun topp matchene)
// ----------------------------------------------------
async function gptSemanticCheck(titleA, titleB) {
  try {
    const prompt = `
Determine if these two headlines describe the *same underlying topic or story*.
Answer ONLY "YES" or "NO".

Headline A: "${titleA}"
Headline B: "${titleB}"
    `.trim();

    const simCheck = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2,
      temperature: 0,
    });

    const ans = simCheck.choices[0]?.message?.content?.trim()?.toUpperCase();
    return ans === "YES";
  } catch (err) {
    console.warn("⚠️ GPT fallback failed:", err.message);
    return false;
  }
}

// ----------------------------------------------------
// 🧠 MAIN DUPLICATE CHECK — GLOBAL + MULTI-LAYER
// 1) Normalize → signature
// 2) signature substring-match (gratis)
// 3) vector match via HNSW
// 4) GPT confirm on top-3
// ----------------------------------------------------
export async function checkDuplicateTopic(
  category,
  topic,
  title = "",
  summaryWhat = ""
) {
  try {
    // 1️⃣ Build semantic signature
    const signature = normalize(`${topic} ${title} ${summaryWhat}`);

    // 2️⃣ Cheap substring match first
    const stringHits = await signatureStringMatch(signature);
    if (stringHits.length) {
      console.log(`🚫 Text signature duplicate detected → ${topic}`);
      return { alreadyExists: true, similar: stringHits };
    }

    // 3️⃣ Embedding of the signature
    const embeddingText = `${topic} ${title} ${summaryWhat}`;
    const embedding = await generateEmbedding(embeddingText);

    if (!embedding) {
      console.warn("⚠️ Missing embedding → skipping vector search.");
      return { alreadyExists: false, similar: [] };
    }

    // 4️⃣ Vector search using HNSW
    const vectorMatches = await vectorSearch(embedding);

    // If none: safe
    if (!vectorMatches.length) {
      return { alreadyExists: false, similar: [] };
    }

    // 5️⃣ High similarity instant-reject
    const highSim = vectorMatches.some((m) => m.similarity > 0.82);
    if (highSim) {
      console.log(`🚫 Vector duplicate detected → ${topic}`);
      return { alreadyExists: true, similar: vectorMatches };
    }

    // 6️⃣ GPT fallback (only top 3)
    for (const match of vectorMatches) {
      const isSame = await gptSemanticCheck(match.title, title || topic);
      if (isSame) {
        console.log(`🚫 GPT confirmed duplicate → ${topic}`);
        return { alreadyExists: true, similar: vectorMatches };
      }
    }

    return { alreadyExists: false, similar: vectorMatches };
  } catch (err) {
    console.warn("⚠️ checkDuplicateTopic failed:", err.message);
    return { alreadyExists: false, similar: [] };
  }
}

// ----------------------------------------------------
// 🧩 BACKWARD COMPATIBILITY
// ----------------------------------------------------
export async function checkSimilarTitles(existing, topic, category) {
  try {
    const recentTitles = existing?.slice(-10).map((a) => a.title) || [];

    for (const prev of recentTitles) {
      const isSame = await gptSemanticCheck(prev, topic);
      if (isSame) {
        console.log(
          `🚫 GPT semantic similarity detected for ${category}: ${topic}`
        );
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn("⚠️ checkSimilarTitles failed:", err.message);
    return false;
  }
}
