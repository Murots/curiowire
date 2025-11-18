// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// // === Lokale utils ===
// import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";
// import { categories } from "../app/api/utils/categories.js";
// import { trimHeadline } from "../app/api/utils/textTools.js";
// import { fetchTrendingTopics } from "../app/api/utils/fetchTopics.js";
// import {
//   buildArticlePrompt,
//   buildCulturePrompt,
//   buildProductArticlePrompt,
//   affiliateAppendix,
//   naturalEnding,
// } from "../app/api/utils/prompts.js";

// // import { normalize } from "../app/api/utils/duplicateUtils.js";
// import { normalizeSignature } from "./curioSignature.js";

// import {
//   analyzeTopic,
//   linkHistoricalStory,
//   summarizeTheme,
// } from "../app/api/utils/articleUtils.js";

// import {
//   resolveProductCategory,
//   findAffiliateProduct,
// } from "../app/api/utils/productUtils.js";

// import { selectBestImage } from "../lib/imageSelector.js";
// import { cleanText } from "../app/api/utils/cleanText.js";
// import { refineArticle } from "../app/api/utils/refineTools.js";

// // ✅ Ny modul for kuriositets-signaturer (pre-dupe-check)
// import { buildCurioSignature, checkCurioDuplicate } from "./curioSignature.js";

// // ✅ Ny modul for topic-signaturer (pre-dupe-check)
// import { buildTopicSignature, checkTopicDuplicate } from "./topicSignature.js";

// // === INIT OpenAI ===
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// // === Supabase init + log snapshot ===
// const supabaseUrl =
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey =
//   process.env.SUPABASE_SERVICE_ROLE_KEY ||
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// console.log("🧩 Supabase URL:", supabaseUrl ? "✔️ Loaded" : "❌ Missing");
// console.log(
//   "🔑 Supabase Key:",
//   supabaseKey ? `✔️ Loaded (${supabaseKey.slice(0, 6)}...)` : "❌ Missing"
// );

// const supabase = createClient(supabaseUrl, supabaseKey);

// // === Safe wrapper for Supabase ===
// async function safeQuery(label, query) {
//   try {
//     const result = await query;
//     if (result?.error) {
//       console.error(`🚨 Supabase error (${label}):`, result.error.message);
//     }
//     return result;
//   } catch (err) {
//     console.error(`💥 Supabase fetch failed (${label}):`, err.message);
//     return { error: err };
//   }
// }

// // === Embedding helper ===
// async function generateEmbedding(text) {
//   try {
//     const emb = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: text,
//     });
//     return emb.data[0].embedding;
//   } catch (err) {
//     console.warn("⚠️ Embedding failed:", err.message);
//     return null;
//   }
// }

// // === Filter mot personlige Reddit-poster ===
// function isPersonalRedditPost(title) {
//   const lower = title.toLowerCase();
//   const banned = [
//     /\b(i|my|me|our|us|mine|ours)\b/,
//     /\b(dad|mom|father|mother|boyfriend|girlfriend|wife|husband)\b/,
//     /\b(confession|story|journey|feeling|struggle|rant)\b/,
//     /askreddit|relationships|aita|offmychest|trueoffmychest|tifu/,
//   ];
//   return banned.some((re) => re.test(lower));
// }

// // ===================================================
// // === HOVEDFUNKSJON ===
// // ===================================================
// export async function main() {
//   const start = Date.now();
//   console.log("🕒 Starting CurioWire generation…");
//   const results = [];

//   try {
//     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
//       ? process.env.NEXT_PUBLIC_BASE_URL
//       : "https://www.curiowire.com";

//     // === Hent trender ===
//     let topicsByCategory;
//     try {
//       const res = await fetch(`${baseUrl}/api/trends`);
//       topicsByCategory = (await res.json())?.results || {};
//     } catch (err) {
//       console.warn("⚠️ Failed to fetch /api/trends:", err.message);
//       topicsByCategory = {};
//     }

//     // === tilfeldig prioritet google/reddit ===
//     const primarySource = Math.random() < 0.5 ? "google" : "reddit";
//     const fallbackSource = primarySource === "google" ? "reddit" : "google";
//     console.log(`Primary source: ${primarySource.toUpperCase()}`);

//     // === LOOP GJENNOM ALLE KATEGORIER ===
//     for (const [key, { tone, image }] of Object.entries(categories)) {
//       console.log(`\n📰 Category: ${key}`);

//       const topicData = topicsByCategory[key];
//       const primaryList = topicData?.[primarySource] || [];
//       const fallbackList = topicData?.[fallbackSource] || [];

//       // kombiner & rens
//       const allTopics = [...primaryList, ...fallbackList]
//         .map((t) => (typeof t === "object" ? t.title : t))
//         .filter((t) => !isPersonalRedditPost(t))
//         .slice(0, 6);

//       if (!allTopics.length) {
//         console.log(`⚠️ No valid topics for ${key}`);
//         continue;
//       }

//       // ===================================================
//       // === VELG TEMA + KURIOSITET SOM IKKE ER DUPE ===
//       // ===================================================

//       let topic = null;
//       let topicSummary = null; // analyse for valgt topic
//       let linkedStory = null; // valgt kuriositet
//       let curioSignature = null; // gjenbrukes senere ved lagring
//       let topicSig = null; // lagres for valgt topic

//       for (const candidateTitle of allTopics) {
//         console.log(`🔎 Trying topic candidate: "${candidateTitle}"`);

//         // ==== TOPIC SIGNATURE GATE ====
//         topicSig = await buildTopicSignature({
//           category: key,
//           topic: candidateTitle,
//         });

//         const topicDupe = await checkTopicDuplicate(topicSig);

//         if (topicDupe.isDuplicate) {
//           console.log(
//             `🚫 Topic duplicate for "${candidateTitle}" → closest: ${
//               topicDupe.closestTitle || "unknown"
//             } (reason: ${topicDupe.reason || "n/a"}, score: ${
//               typeof topicDupe.similarityScore === "number"
//                 ? topicDupe.similarityScore.toFixed(3)
//                 : "n/a"
//             })`
//           );
//           continue; // prøv neste kandidat
//         }

//         // 1) Analyse kandidatens tema & finn historisk link/kuriositet
//         let analysis;
//         let candidateLinkedStory;

//         try {
//           analysis = await analyzeTopic(candidateTitle, key);
//           candidateLinkedStory = await linkHistoricalStory(analysis);
//         } catch (err) {
//           console.error(
//             `⚠️ Failed during analyze/linkHistoricalStory for "${candidateTitle}":`,
//             err.message
//           );
//           continue;
//         }

//         if (!candidateLinkedStory) {
//           console.log("→ Candidate rejected (no linkedStory / curiosity)");
//           continue;
//         }

//         // 2) Bygg en lettvekts CurioSignature for denne kuriositeten
//         const candidateCurioSignature = await buildCurioSignature({
//           category: key,
//           topic: candidateTitle,
//           curiosity: candidateLinkedStory,
//         });

//         // 3) Sjekk om denne kuriositeten finnes fra før
//         const dupeInfo = await checkCurioDuplicate(candidateCurioSignature);

//         if (dupeInfo?.isDuplicate) {
//           console.log(
//             `🚫 Curiosity duplicate detected for "${candidateTitle}" – skipping candidate (reason: ${
//               dupeInfo.reason || "n/a"
//             }, score: ${
//               typeof dupeInfo.similarityScore === "number"
//                 ? dupeInfo.similarityScore.toFixed(3)
//                 : "n/a"
//             })`
//           );
//           if (dupeInfo.closestTitle) {
//             console.log(`   ↳ Similar to existing: "${dupeInfo.closestTitle}"`);
//           }
//           continue; // prøv neste kandidat innen samme kategori
//         }

//         // 4) Kandidaten er unik nok → bruk den
//         topic = candidateTitle;
//         topicSummary = analysis;
//         linkedStory = candidateLinkedStory;
//         curioSignature = candidateCurioSignature;

//         console.log(
//           `✅ Selected topic: ${topic}\n   Curiosity: "${linkedStory}"`
//         );
//         break;
//       }

//       if (!topic) {
//         console.log(
//           `⚠️ No unique curiosity found for category ${key} (all candidates were dupes or invalid)`
//         );
//         continue;
//       }

//       // Vi har nå: topic, topicSummary, linkedStory, curioSignature

//       // Utvid og forankre temaet (for konsistent stil / kontekst)
//       try {
//         await summarizeTheme(topicSummary, linkedStory);
//       } catch (err) {
//         console.warn(
//           `⚠️ summarizeTheme failed for "${topic}" – continuing without extended context:`,
//           err.message
//         );
//       }

//       // ===================================================
//       // === PROMPT-GENERERING ===
//       // ===================================================

//       let prompt;

//       if (key === "products") {
//         const productCategory = await resolveProductCategory(
//           topic,
//           topicSummary,
//           linkedStory
//         );

//         prompt =
//           (await buildProductArticlePrompt(
//             `${topic} (${productCategory})`,
//             key,
//             tone
//           )) + affiliateAppendix;
//       } else if (key === "culture") {
//         prompt = buildCulturePrompt(topic) + naturalEnding;
//       } else {
//         prompt = buildArticlePrompt(topic, key, tone) + naturalEnding;
//       }

//       // Sett kuriositeten eksplisitt inn
//       prompt += `\nFocus the story around this factual curiosity:\n"${linkedStory}"`;

//       // ===================================================
//       // === GENERERING AV ARTIKKEL ===
//       // ===================================================
//       console.log("✍️ Generating article…");

//       const completion = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [{ role: "user", content: prompt }],
//       });

//       const raw = completion.choices?.[0]?.message?.content?.trim() || "";

//       if (!raw) {
//         console.error(
//           `⚠️ Empty completion from OpenAI for topic "${topic}" – skipping category "${key}".`
//         );
//         results.push({
//           category: key,
//           topic,
//           success: false,
//           reason: "empty-completion",
//         });
//         continue;
//       }

//       const titleMatch = raw.match(/Headline:\s*(.+)/i);
//       const bodyMatch = raw.match(/Article:\s*([\s\S]+)/i);

//       const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
//       const title = trimHeadline(rawTitle);

//       const articleRaw = bodyMatch ? bodyMatch[1].trim() : raw;

//       // === REFINE ===
//       const beforeCount = articleRaw.split(/\s+/).filter(Boolean).length;
//       const refinedArticle = await refineArticle(articleRaw, title);
//       const afterCount = refinedArticle.split(/\s+/).filter(Boolean).length;

//       console.log(`🧾 Refined ${beforeCount} → ${afterCount} words`);

//       // ===================================================
//       // === SEO-FELT ===
//       // ===================================================

//       const seoTitleMatch = raw.match(/<title>\s*([^<]+)\s*/i);
//       const seoDescMatch = raw.match(/<description>\s*([^<]+)\s*/i);
//       const seoKeywordsMatch = raw.match(/<keywords>\s*([^<]+)\s*/i);
//       const hashtagsMatch = raw.match(/Hashtags:\s*([#\w\s]+)/i);

//       const seo_title = seoTitleMatch ? seoTitleMatch[1].trim() : title;
//       const seo_description = seoDescMatch
//         ? seoDescMatch[1].trim()
//         : cleanText(refinedArticle.slice(0, 155));

//       const seo_keywords = seoKeywordsMatch
//         ? seoKeywordsMatch[1].trim()
//         : [key, "curiosity", "history", "CurioWire"].join(", ");

//       let hashtags = "";
//       if (hashtagsMatch) {
//         const rawTags = hashtagsMatch[1]
//           .trim()
//           .split(/\s+/)
//           .filter((tag) => tag.startsWith("#"));
//         hashtags = [...new Set(rawTags)].join(" ");
//       }

//       // ===================================================
//       // === PRODUKTLOGIKK ===
//       // ===================================================

//       let source_url = null;

//       if (key === "products") {
//         const nameMatch = raw.match(/\[Product Name\]:\s*(.+)/i);
//         const productName = nameMatch ? nameMatch[1].trim() : null;

//         const productResult = await findAffiliateProduct(
//           title,
//           topic,
//           refinedArticle,
//           productName
//         );

//         source_url = productResult.source_url;
//       }

//       // ===================================================
//       // === RENS TEKST ===
//       // ===================================================

//       const cleanedArticle = refinedArticle
//         .replace(/```html|```/gi, "")
//         .replace(/\[Product Name\]:\s*.+/i, "")
//         .replace(/SEO:[\s\S]*$/i, "")
//         .trim();

//       // SummaryWhat (fortsatt støttet)
//       const summaryMatch = cleanedArticle.match(
//         /<span\s+data-summary-what[^>]*>(.*?)<\/span>/s
//       );
//       const summaryWhat = summaryMatch ? cleanText(summaryMatch[1].trim()) : "";

//       // ===================================================
//       // === EMBEDDING + SEMANTIC SIGNATURE ===
//       // ===================================================

//       const embedding = await generateEmbedding(`${title}\n${cleanedArticle}`);

//       // semanticSignature henger sammen med pre-dupe-signaturene,
//       // men er mer beskrivende (title + seo_description + keywords)
//       const mergedKeywords =
//         (curioSignature?.keywords?.length && curioSignature.keywords) ||
//         (topicSig?.keywords?.length && topicSig.keywords) ||
//         [];

//       const semanticSignature = `${title}. ${seo_description}. keywords: ${mergedKeywords.join(
//         ", "
//       )}`;

//       // ===================================================
//       // === BILDEVALG ===
//       // ===================================================

//       const imagePref = image === "photo" ? "photo" : "dalle";

//       const { imageUrl, source } = await selectBestImage(
//         title,
//         cleanedArticle,
//         key,
//         imagePref // ekstra arg ignoreres hvis selectBestImage ikke bruker den
//       );

//       const imageCredit =
//         source === "Wikimedia"
//           ? "Image via Wikimedia Commons"
//           : source === "Pexels"
//           ? "Image courtesy of Pexels"
//           : source === "Unsplash"
//           ? "Image courtesy of Unsplash"
//           : source === "DALL·E"
//           ? "Illustration by DALL·E 3"
//           : "Image source unknown";

//       // ===================================================
//       // === LAGRE ARTIKKEL I SUPABASE ===
//       // ===================================================

//       const { error } = await safeQuery(
//         `insert article for ${key}`,
//         supabase.from("articles").insert([
//           {
//             category: key,
//             title,
//             excerpt: cleanedArticle,
//             image_url: imageUrl,
//             source_url,
//             image_credit: imageCredit,
//             seo_title,
//             seo_description,
//             seo_keywords,
//             hashtags,
//             embedding,
//             semantic_signature: semanticSignature,
//             curio_signature_text: curioSignature?.signature || null,
//             topic_signature_text: topicSig?.signature || null,
//           },
//         ])
//       );

//       if (error) throw error;

//       console.log(`✅ Saved: ${key} → ${title}`);

//       // Logg resultatet
//       results.push({ category: key, topic, success: true });

//       // Fortsetter til neste kategori…
//     }

//     // ===================================================
//     // === SITEWIDE SEO-PING ===
//     // ===================================================
//     await updateAndPingSearchEngines();
//     console.log("🎉 Generation completed successfully.");

//     // ===================================================
//     // === CRON LOGGING ===
//     // ===================================================

//     const duration = ((Date.now() - start) / 1000).toFixed(1);

//     await safeQuery(
//       "insert cron_log",
//       supabase.from("cron_logs").insert({
//         run_at: new Date().toISOString(),
//         duration_seconds: duration,
//         status: "success",
//         message: "Generation completed",
//         details: { results },
//       })
//     );

//     console.log(`🕓 Logged run: ${duration}s`);

//     // Slett gamle cron-logger, behold 3
//     const { data: logs } = await safeQuery(
//       "fetch cron_logs",
//       supabase
//         .from("cron_logs")
//         .select("id")
//         .order("run_at", { ascending: false })
//     );

//     if (logs && logs.length > 3) {
//       const oldIds = logs.slice(3).map((l) => l.id);

//       await safeQuery(
//         "delete old logs",
//         supabase.from("cron_logs").delete().in("id", oldIds)
//       );

//       console.log(`🧹 Deleted ${oldIds.length} old cron log(s)`);
//     }
//   } catch (err) {
//     console.error("❌ Fatal error:", err);

//     await safeQuery(
//       "fatal log",
//       supabase.from("cron_logs").insert({
//         run_at: new Date().toISOString(),
//         status: "error",
//         message: err.message,
//       })
//     );

//     process.exit(1);
//   }
// }

// // === Kjør hovedfunksjon ===
// main().then(() => process.exit(0));

// ============================================================================
// CurioWire — scripts/generate.js
// Full generator v5.2 (2025-optimized)
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// === LOCAL UTILS (unchanged paths) ===
import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";
import { categories } from "../app/api/utils/categories.js";
import { trimHeadline } from "../app/api/utils/textTools.js";
import {
  buildArticlePrompt,
  buildCulturePrompt,
  buildProductArticlePrompt,
  affiliateAppendix,
  naturalEnding,
} from "../app/api/utils/prompts.js";

import {
  analyzeTopic,
  linkHistoricalStory,
  summarizeTheme,
} from "../app/api/utils/articleUtils.js";

import {
  resolveProductCategory,
  findAffiliateProduct,
} from "../app/api/utils/productUtils.js";

import { selectBestImage } from "../lib/imageSelector.js";
import { cleanText } from "../app/api/utils/cleanText.js";
import { refineArticle } from "../app/api/utils/refineTools.js";

// ============================================================================
// UPDATED SIGNATURE IMPORTS  ✅ NEW STRUCTURE
// ============================================================================

import {
  buildCurioSignature,
  checkCurioDuplicate,
} from "../lib/signatures/curioSignature.js";

import {
  buildTopicSignature,
  checkTopicDuplicate,
} from "../lib/signatures/topicSignature.js";

// ============================================================================
// INIT OPENAI
// ============================================================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// ============================================================================
// INIT SUPABASE
// ============================================================================
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("🧩 Supabase URL:", supabaseUrl ? "✔️ Loaded" : "❌ Missing");
console.log(
  "🔑 Supabase Key:",
  supabaseKey ? `✔️ Loaded (${supabaseKey.slice(0, 6)}...)` : "❌ Missing"
);

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// SAFE SUPABASE WRAPPER
// ============================================================================
async function safeQuery(label, query) {
  try {
    const result = await query;
    if (result?.error) {
      console.error(`🚨 Supabase error (${label}):`, result.error.message);
    }
    return result;
  } catch (err) {
    console.error(`💥 Supabase fetch failed (${label}):`, err.message);
    return { error: err };
  }
}

// ============================================================================
// EMBEDDING HELPER (local version — NOT for duplicate checking)
// ============================================================================
async function generateEmbedding(text) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return emb.data[0].embedding;
  } catch (err) {
    console.warn("⚠️ Embedding failed:", err.message);
    return null;
  }
}

// ============================================================================
// REDDIT FILTER
// ============================================================================
function isPersonalRedditPost(title) {
  const lower = title.toLowerCase();
  const banned = [
    /\b(i|my|me|our|us|mine|ours)\b/,
    /\b(dad|mom|father|mother|boyfriend|girlfriend|wife|husband)\b/,
    /\b(confession|story|journey|feeling|struggle|rant)\b/,
    /askreddit|relationships|aita|offmychest|trueoffmychest|tifu/,
  ];
  return banned.some((re) => re.test(lower));
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================
export async function main() {
  const start = Date.now();
  console.log("🕒 Starting CurioWire generation…");
  const results = [];

  try {
    // ============================================================
    // LOAD TRENDS
    // ============================================================
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://www.curiowire.com";

    let topicsByCategory = {};
    try {
      const res = await fetch(`${baseUrl}/api/trends`);
      topicsByCategory = (await res.json())?.results || {};
    } catch (err) {
      console.warn("⚠️ Failed to fetch /api/trends:", err.message);
    }

    // Randomize Google/Reddit priority
    const primarySource = Math.random() < 0.5 ? "google" : "reddit";
    const fallbackSource = primarySource === "google" ? "reddit" : "google";
    console.log(`Primary source: ${primarySource.toUpperCase()}`);

    // ============================================================
    // PROCESS EACH CATEGORY
    // ============================================================
    for (const [key, { tone, image }] of Object.entries(categories)) {
      console.log(`\n📰 Category: ${key}`);

      const topicData = topicsByCategory[key] || {};
      const primaryList = topicData[primarySource] || [];
      const fallbackList = topicData[fallbackSource] || [];

      const allTopics = [...primaryList, ...fallbackList]
        .map((t) => (typeof t === "object" ? t.title : t))
        .filter((t) => !isPersonalRedditPost(t))
        .slice(0, 6);

      if (!allTopics.length) {
        console.log(`⚠️ No valid topics for ${key}`);
        continue;
      }

      // ----------------------------------------------------------
      // FIND UNIQUE TOPIC + UNIQUE CURIOSITY
      // ----------------------------------------------------------
      let topic = null;
      let topicSummary = null;
      let linkedStory = null;
      let curioSignature = null;
      let topicSig = null;

      for (const candidateTitle of allTopics) {
        console.log(`🔎 Trying topic candidate: "${candidateTitle}"`);

        // === TOPIC SIGNATURE CHECK ===
        topicSig = await buildTopicSignature({
          category: key,
          topic: candidateTitle,
        });
        const topicDupe = await checkTopicDuplicate(topicSig);

        if (topicDupe.isDuplicate) {
          console.log(
            `🚫 Topic duplicate → ${candidateTitle} (closest: ${topicDupe.closestTitle})`
          );
          continue;
        }

        // === ANALYZE TOPIC & GET CURIOSITY ===
        let analysis;
        let candidateCurio;
        try {
          analysis = await analyzeTopic(candidateTitle, key);
          candidateCurio = await linkHistoricalStory(analysis);
        } catch {
          continue;
        }

        if (!candidateCurio) continue;

        // === BUILD CURIO SIGNATURE ===
        const candidateSig = await buildCurioSignature({
          category: key,
          topic: candidateTitle,
          curiosity: candidateCurio,
        });

        const dupeInfo = await checkCurioDuplicate(candidateSig);
        if (dupeInfo.isDuplicate) {
          console.log(
            `🚫 Curiosity duplicate for "${candidateTitle}" (closest: ${dupeInfo.closestTitle})`
          );
          continue;
        }

        // We've found a unique topic + unique curiosity
        topic = candidateTitle;
        topicSummary = analysis;
        linkedStory = candidateCurio;
        curioSignature = candidateSig;

        console.log(`✅ Selected topic: ${topic}`);
        console.log(`   Curiosity: ${linkedStory}`);
        break;
      }

      if (!topic) {
        console.log(`⚠️ No unique curiosity found for category ${key}`);
        continue;
      }

      // expand topic
      try {
        await summarizeTheme(topicSummary, linkedStory);
      } catch {}

      // ----------------------------------------------------------
      // GENERATE ARTICLE
      // ----------------------------------------------------------
      let prompt;
      if (key === "products") {
        const prodCategory = await resolveProductCategory(
          topic,
          topicSummary,
          linkedStory
        );
        prompt =
          (await buildProductArticlePrompt(
            `${topic} (${prodCategory})`,
            key,
            tone
          )) + affiliateAppendix;
      } else if (key === "culture") {
        prompt = buildCulturePrompt(topic) + naturalEnding;
      } else {
        prompt = buildArticlePrompt(topic, key, tone) + naturalEnding;
      }

      prompt += `\nFocus the story around this factual curiosity:\n"${linkedStory}"`;

      console.log("✍️ Generating article…");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const raw = completion.choices?.[0]?.message?.content?.trim() || "";
      if (!raw) {
        results.push({ category: key, topic, success: false });
        continue;
      }

      // extract title + body
      const titleMatch = raw.match(/Headline:\s*(.+)/i);
      const bodyMatch = raw.match(/Article:\s*([\s\S]+)/i);

      const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
      const title = trimHeadline(rawTitle);

      const articleRaw = bodyMatch ? bodyMatch[1].trim() : raw;

      // refine
      const refined = await refineArticle(articleRaw, title);

      // ----------------------------------------------------------
      // SEO
      // ----------------------------------------------------------
      const seoTitleMatch = raw.match(/<title>\s*([^<]+)\s*/i);
      const seoDescMatch = raw.match(/<description>\s*([^<]+)\s*/i);
      const seoKeywordsMatch = raw.match(/<keywords>\s*([^<]+)\s*/i);
      const hashtagsMatch = raw.match(/Hashtags:\s*([#\w\s]+)/i);

      const seo_title = seoTitleMatch ? seoTitleMatch[1].trim() : title;
      const seo_description = seoDescMatch
        ? seoDescMatch[1].trim()
        : cleanText(refined.slice(0, 155));

      const seo_keywords = seoKeywordsMatch
        ? seoKeywordsMatch[1].trim()
        : `${key}, curiosity, history, CurioWire`;

      let hashtags = "";
      if (hashtagsMatch) {
        const rawTags = hashtagsMatch[1]
          .trim()
          .split(/\s+/)
          .filter((t) => t.startsWith("#"));
        hashtags = [...new Set(rawTags)].join(" ");
      }

      // ----------------------------------------------------------
      // PRODUCT LOGIC
      // ----------------------------------------------------------
      let source_url = null;
      if (key === "products") {
        const nameMatch = raw.match(/\[Product Name\]:\s*(.+)/i);
        const productName = nameMatch ? nameMatch[1].trim() : null;

        const productResult = await findAffiliateProduct(
          title,
          topic,
          refined,
          productName
        );

        source_url = productResult.source_url;
      }

      // ----------------------------------------------------------
      // CLEAN ARTICLE TEXT
      // ----------------------------------------------------------
      const cleanedArticle = refined
        .replace(/```html|```/gi, "")
        .replace(/\[Product Name\]:\s*.+/i, "")
        .replace(/SEO:[\s\S]*$/i, "")
        .trim();

      // summaryWhat (legacy)
      const summaryMatch = cleanedArticle.match(
        /<span\s+data-summary-what[^>]*>(.*?)<\/span>/s
      );
      const summaryWhat = summaryMatch ? cleanText(summaryMatch[1].trim()) : "";

      // ----------------------------------------------------------
      // EMBEDDING + SEMANTIC SIGNATURE
      // ----------------------------------------------------------
      const embedding = await generateEmbedding(`${title}\n${cleanedArticle}`);

      const mergedKeywords =
        (curioSignature?.keywords?.length && curioSignature.keywords) ||
        (topicSig?.keywords?.length && topicSig.keywords) ||
        [];

      const semanticSignature = `${title}. ${seo_description}. keywords: ${mergedKeywords.join(
        ", "
      )}`;

      // ----------------------------------------------------------
      // IMAGE SELECTION
      // ----------------------------------------------------------
      const imagePref = image === "photo" ? "photo" : "dalle";

      const { imageUrl, source } = await selectBestImage(
        title,
        cleanedArticle,
        key,
        imagePref
      );

      const imageCredit =
        source === "Wikimedia"
          ? "Image via Wikimedia Commons"
          : source === "Pexels"
          ? "Image courtesy of Pexels"
          : source === "Unsplash"
          ? "Image courtesy of Unsplash"
          : source === "DALL·E"
          ? "Illustration by DALL·E 3"
          : "Image source unknown";

      // ----------------------------------------------------------
      // SAVE ARTICLE
      // ----------------------------------------------------------
      const { error } = await safeQuery(
        `insert article for ${key}`,
        supabase.from("articles").insert([
          {
            category: key,
            title,
            excerpt: cleanedArticle,
            image_url: imageUrl,
            source_url,
            image_credit: imageCredit,
            seo_title,
            seo_description,
            seo_keywords,
            hashtags,
            embedding,
            semantic_signature: semanticSignature,
            curio_signature_text: curioSignature?.signature || null,
            topic_signature_text: topicSig?.signature || null,
            short_curio_signature: curioSignature?.shortSignature || null,
            short_topic_signature: topicSig?.shortSignature || null,
          },
        ])
      );

      if (error) throw error;

      console.log(`✅ Saved: ${key} → ${title}`);
      results.push({ category: key, topic, success: true });
    }

    // ----------------------------------------------------------
    // SEO PING
    // ----------------------------------------------------------
    await updateAndPingSearchEngines();
    console.log("🎉 Generation completed successfully.");

    // ----------------------------------------------------------
    // CRON LOG
    // ----------------------------------------------------------
    const duration = ((Date.now() - start) / 1000).toFixed(1);

    await safeQuery(
      "insert cron_log",
      supabase.from("cron_logs").insert({
        run_at: new Date().toISOString(),
        duration_seconds: duration,
        status: "success",
        message: "Generation completed",
        details: { results },
      })
    );

    console.log(`🕓 Logged run: ${duration}s`);

    // keep last 3 logs
    const { data: logs } = await safeQuery(
      "fetch cron_logs",
      supabase
        .from("cron_logs")
        .select("id")
        .order("run_at", { ascending: false })
    );

    if (logs && logs.length > 3) {
      const oldIds = logs.slice(3).map((l) => l.id);
      await safeQuery(
        "delete old logs",
        supabase.from("cron_logs").delete().in("id", oldIds)
      );
      console.log(`🧹 Deleted ${oldIds.length} old cron log(s)`);
    }
  } catch (err) {
    console.error("❌ Fatal error:", err);

    await safeQuery(
      "fatal log",
      supabase.from("cron_logs").insert({
        run_at: new Date().toISOString(),
        status: "error",
        message: err.message,
      })
    );

    process.exit(1);
  }
}

// ============================================================================
// START
// ============================================================================
main().then(() => process.exit(0));
