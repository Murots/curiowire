// // === app/api/utils/duplicateUtils.js ===
// // CurioWire Kuriositet-Duplikatkontroll (v5.0)
// // Fanger kun duplikater av samme *kuriositet* (linkedStory),
// // aldri tema, aldri kategori. Presis og billig.

// // ----------------------------------------------------
// // Imports
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
// // NORMALIZE — brukes i både sjekk + lagring
// // ----------------------------------------------------
// export function normalize(text = "") {
//   return text
//     .toLowerCase()
//     .replace(/[^\p{L}\p{N}\s]/gu, " ")
//     .replace(/\b(the|a|an|and|of|in|on|for|to|from|by|with|at)\b/gi, "")
//     .replace(
//       /\b(ancient|historic|history|first|early|modern|club|book)\b/gi,
//       ""
//     )
//     .replace(/\d+/g, "")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// // ----------------------------------------------------
// // Embedding
// // ----------------------------------------------------
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

// // ----------------------------------------------------
// // Substring signature match (billigst)
// // ----------------------------------------------------
// async function semanticSubstringMatch(normalizedSignature) {
//   try {
//     const { data, error } = await supabase
//       .from("articles")
//       .select("id, title, semantic_signature")
//       .ilike("semantic_signature", `%${normalizedSignature}%`)
//       .limit(5);

//     if (error) {
//       console.warn("⚠️ signature match error:", error.message);
//       return [];
//     }

//     return data || [];
//   } catch (err) {
//     console.warn("⚠️ substring match failed:", err.message);
//     return [];
//   }
// }

// // ----------------------------------------------------
// // Vector search (HNSW index)
// // ----------------------------------------------------
// async function vectorSearch(embedding) {
//   try {
//     const { data, error } = await supabase.rpc("match_articles", {
//       query_embedding: embedding,
//       match_threshold: 0.8,
//       match_count: 5,
//     });

//     if (error) {
//       console.warn("⚠️ vector search RPC error:", error.message);
//       return [];
//     }

//     return data || [];
//   } catch (err) {
//     console.warn("⚠️ vector search failed:", err.message);
//     return [];
//   }
// }

// // ----------------------------------------------------
// // GPT fallback — kun hvis vector-match er nært treff
// // ----------------------------------------------------
// async function gptCheckSameCuriosity(curA, curB) {
//   try {
//     const prompt = `
// Determine if these two descriptions refer to the *same historical/technological curiosity*,
// not just the same topic.

// Answer ONLY "YES" or "NO".

// Curiosity A:
// "${curA}"

// Curiosity B:
// "${curB}"
//     `.trim();

//     const out = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 2,
//       temperature: 0,
//     });

//     const ans = out.choices[0]?.message?.content?.trim()?.toUpperCase();
//     return ans === "YES";
//   } catch (err) {
//     console.warn("⚠️ GPT fallback failed:", err.message);
//     return false;
//   }
// }

// // ----------------------------------------------------
// // MAIN — checkDuplicateStory
// // Sjekker KUN linkedStory (kuriositeten).
// // ----------------------------------------------------
// export async function checkDuplicateStory(linkedStory) {
//   if (!linkedStory || linkedStory.trim().length < 10) {
//     // Vi vil aldri stoppe generering pga for kort info
//     return { alreadyExists: false, similar: [] };
//   }

//   try {
//     // 1) Normalize
//     const signature = normalize(linkedStory);

//     // 2) Rask substring match
//     const textHits = await semanticSubstringMatch(signature);
//     if (textHits.length > 0) {
//       console.log("🚫 Dupe (substring) → samme kuriositet funnet");
//       return { alreadyExists: true, similar: textHits };
//     }

//     // 3) Embedding
//     const emb = await generateEmbedding(linkedStory);
//     if (!emb) return { alreadyExists: false, similar: [] };

//     // 4) Vector search
//     const vectorHits = await vectorSearch(emb);
//     if (!vectorHits.length) return { alreadyExists: false, similar: [] };

//     // 5) High-similarity auto-block
//     const hardDupe = vectorHits.some((m) => m.similarity > 0.82);
//     if (hardDupe) {
//       console.log("🚫 Dupe (vector high similarity) → samme kuriositet");
//       return { alreadyExists: true, similar: vectorHits };
//     }

//     // 6) GPT fallback
//     for (const match of vectorHits) {
//       const isSame = await gptCheckSameCuriosity(match.title, linkedStory);
//       if (isSame) {
//         console.log("🚫 Dupe (GPT-confirmed) → samme kuriositet");
//         return { alreadyExists: true, similar: vectorHits };
//       }
//     }

//     return { alreadyExists: false, similar: vectorHits };
//   } catch (err) {
//     console.warn("⚠️ checkDuplicateStory failed:", err.message);
//     return { alreadyExists: false, similar: [] };
//   }
// }
