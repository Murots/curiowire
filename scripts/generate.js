// // === scripts/generate.js ===
// // Full CurioWire generator for GitHub Actions
// // Kjører helt uavhengig av Vercel – direkte fra Node.js-miljøet i GitHub
// // Logger resultatet til cron_logs og beholder kun de 3 siste loggene

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
// import {
//   checkDuplicateTopic,
//   checkSimilarTitles,
//   normalize, // <— viktig!
// } from "../app/api/utils/duplicateUtils.js";
// import {
//   analyzeTopic,
//   linkHistoricalStory,
//   summarizeTheme,
// } from "../app/api/utils/articleUtils.js";
// import {
//   resolveProductCategory,
//   findAffiliateProduct,
// } from "../app/api/utils/productUtils.js";
// import { selectBestImage } from "../app/api/utils/imageSelector.js";
// import { cleanText } from "../app/api/utils/cleanText.js";
// import { refineArticle } from "../app/api/utils/refineTools.js";

// // === INIT ===
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// // === Supabase init + diagnostikk ===
// const supabaseUrl =
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey =
//   process.env.SUPABASE_SERVICE_ROLE_KEY ||
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// console.log("🧩 Supabase URL:", supabaseUrl ? "✅ Loaded" : "❌ MISSING");
// console.log(
//   "🔑 Supabase Key:",
//   supabaseKey ? `✅ Loaded (${supabaseKey.slice(0, 6)}...)` : "❌ MISSING"
// );
// console.log(
//   "🌐 Environment:",
//   process.env.GITHUB_ACTIONS ? "GitHub Actions" : "Local/Vercel"
// );

// console.log("🧱 Supabase environment snapshot:", {
//   SUPABASE_URL: !!process.env.SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
//   NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
//   NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
// });

// const supabase = createClient(supabaseUrl, supabaseKey);

// // === Safe wrapper for Supabase calls ===
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

// // === Helper for embeddings ===
// async function generateEmbedding(text) {
//   try {
//     const emb = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: text,
//     });
//     return emb.data[0].embedding;
//   } catch (err) {
//     console.warn("⚠️ Failed to generate embedding:", err.message);
//     return null;
//   }
// }

// // === Filter mot personlige Reddit-poster ===
// function isPersonalRedditPost(title) {
//   const lower = title.toLowerCase();
//   const bannedPatterns = [
//     /\b(i|my|me|our|us|mine|ours)\b/,
//     /\b(dad|mom|father|mother|boyfriend|girlfriend|wife|husband)\b/,
//     /\b(confession|story|journey|feeling|struggle|rant|proud|lost my|thank you)\b/,
//     /askreddit|relationships|aita|offmychest|trueoffmychest|tifu|confession/,
//   ];
//   return bannedPatterns.some((re) => re.test(lower));
// }

// // === Hovedfunksjon ===
// export async function main() {
//   const start = Date.now();
//   console.log("🕒 Starting CurioWire generation run...");
//   const results = [];

//   try {
//     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
//       ? process.env.NEXT_PUBLIC_BASE_URL
//       : "https://www.curiowire.com";

//     let topicsByCategory;
//     try {
//       const res = await fetch(`${baseUrl}/api/trends`);
//       topicsByCategory = (await res.json())?.results || {};
//     } catch (err) {
//       console.warn("⚠️ Failed to fetch trending topics:", err.message);
//       topicsByCategory = {};
//     }

//     // 🔁 tilfeldig hovedkilde
//     const primarySource = Math.random() < 0.5 ? "google" : "reddit";
//     const fallbackSource = primarySource === "google" ? "reddit" : "google";
//     console.log(`🌀 Primary source: ${primarySource.toUpperCase()}`);

//     // === LOOP GJENNOM KATEGORIER ===
//     for (const [key, { tone, image }] of Object.entries(categories)) {
//       console.log(`\n📰 Category: ${key.toUpperCase()}`);
//       const topicData = topicsByCategory[key];
//       const primaryList = topicData?.[primarySource] || [];
//       const fallbackList = topicData?.[fallbackSource] || [];

//       const allTopics = [...primaryList, ...fallbackList]
//         .filter((t) => {
//           const title = typeof t === "object" ? t.title : t;
//           return !isPersonalRedditPost(title);
//         })
//         .slice(0, 5);

//       if (!allTopics.length) {
//         console.log(`⚠️ No valid topics found for ${key}`);
//         continue;
//       }

//       // === Finn unikt tema ===
//       let topic = null;
//       for (const candidate of allTopics) {
//         const candidateTitle =
//           typeof candidate === "object" ? candidate.title : candidate;
//         console.log(`🔎 Checking candidate: "${candidateTitle}"`);
//         const { existing, alreadyExists } = await checkDuplicateTopic(
//           key,
//           candidateTitle, // topic
//           candidateTitle, // title (bruk topic som tittel før den er generert)
//           "" // summaryWhat (ingen WHAT-summary ennå)
//         );

//         if (alreadyExists) continue;
//         const isSimilar = await checkSimilarTitles(
//           existing,
//           candidateTitle,
//           key
//         );
//         if (isSimilar) continue;
//         topic = candidateTitle;
//         break;
//       }
//       if (!topic) continue;

//       try {
//         console.log(`✅ Selected topic: ${topic}`);

//         // === Analyse ===
//         const topicSummary = await analyzeTopic(topic, key);
//         const linkedStory = await linkHistoricalStory(topicSummary);
//         await summarizeTheme(topicSummary, linkedStory);

//         // === Bygg prompt ===
//         let prompt;
//         if (key === "products") {
//           const productCategory = await resolveProductCategory(
//             topic,
//             topicSummary,
//             linkedStory
//           );
//           prompt =
//             (await buildProductArticlePrompt(
//               `${topic} (${productCategory})`,
//               key,
//               tone
//             )) + affiliateAppendix;
//         } else if (key === "culture") {
//           prompt = buildCulturePrompt(topic) + naturalEnding;
//         } else {
//           prompt = buildArticlePrompt(topic, key, tone) + naturalEnding;
//         }
//         prompt += `\nFocus the story around this factual event or curiosity:\n"${linkedStory}"`;

//         // === Generer tekst ===
//         const completion = await openai.chat.completions.create({
//           model: "gpt-4o-mini",
//           messages: [{ role: "user", content: prompt }],
//         });

//         const text = completion.choices[0]?.message?.content?.trim() || "";
//         const titleMatch = text.match(/Headline:\s*(.+)/i);
//         const bodyMatch = text.match(/Article:\s*([\s\S]+)/i);
//         const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
//         const title = trimHeadline(rawTitle);
//         const article = bodyMatch ? bodyMatch[1].trim() : text;

//         // === Refine ===
//         const beforeWords = article.split(/\s+/).length;
//         const refinedArticle = await refineArticle(article, title);
//         const afterWords = refinedArticle.split(/\s+/).length;
//         console.log(`🧾 Refined ${beforeWords} → ${afterWords} words`);

//         // === SEO ===
//         const seoTitleMatch = text.match(/<title>\s*([^<]+)\s*/i);
//         const seoDescMatch = text.match(/<description>\s*([^<]+)\s*/i);
//         const seoKeywordsMatch = text.match(/<keywords>\s*([^<]+)\s*/i);
//         const hashtagsMatch = text.match(/Hashtags:\s*([#\w\s]+)/i);

//         const seo_title = seoTitleMatch ? seoTitleMatch[1].trim() : title;
//         const seo_description = seoDescMatch
//           ? seoDescMatch[1].trim()
//           : cleanText(refinedArticle.slice(0, 155));
//         const seo_keywords = seoKeywordsMatch
//           ? seoKeywordsMatch[1].trim()
//           : [key, "curiosity", "history", "CurioWire"].join(", ");

//         let hashtags = "";
//         if (hashtagsMatch) {
//           const rawTags = hashtagsMatch[1]
//             .trim()
//             .split(/\s+/)
//             .filter((tag) => tag.startsWith("#"));
//           hashtags = [...new Set(rawTags)].join(" ");
//         }

//         // === Produktlogikk ===
//         let source_url = null;
//         if (key === "products") {
//           const nameMatch = text.match(/\[Product Name\]:\s*(.+)/i);
//           const productName = nameMatch ? nameMatch[1].trim() : null;
//           const productResult = await findAffiliateProduct(
//             title,
//             topic,
//             refinedArticle,
//             productName
//           );
//           source_url = productResult.source_url;
//         }

//         // === Rydd opp tekst ===
//         const cleanedArticle = refinedArticle
//           .replace(/```html|```/gi, "")
//           .replace(/\[Product Name\]:\s*.+/i, "")
//           .replace(/SEO:[\s\S]*$/i, "")
//           .trim();

//         // === Extract summaryWhat for signature ===
//         const summaryMatch = cleanedArticle.match(
//           /<span\s+data-summary-what[^>]*>(.*?)<\/span>/s
//         );
//         const summaryWhat = summaryMatch
//           ? cleanText(summaryMatch[1].trim())
//           : "";

//         // === Embedding ===
//         const embedding = await generateEmbedding(
//           `${title}\n${cleanedArticle}`
//         );

//         // === semantic signature ===
//         const semanticSignature = normalize(
//           `${topic} ${title} ${seo_description} ${summaryWhat}`
//         );

//         // === bildevalg ===
//         const imagePref = image === "photo" ? "photo" : "dalle";
//         const { imageUrl, source } = await selectBestImage(
//           title,
//           cleanedArticle,
//           key,
//           imagePref
//         );

//         const imageCredit =
//           source === "Wikimedia"
//             ? "Image via Wikimedia Commons"
//             : source === "Pexels"
//             ? "Image courtesy of Pexels"
//             : source === "Unsplash"
//             ? "Image courtesy of Unsplash"
//             : source === "DALL·E"
//             ? "Illustration by DALL·E 3"
//             : "Image source unknown";

//         // === Lagre i Supabase ===
//         const { error } = await safeQuery(
//           `insert article for ${key}`,
//           supabase.from("articles").insert([
//             {
//               category: key,
//               title,
//               excerpt: cleanedArticle,
//               image_url: imageUrl,
//               source_url,
//               image_credit: imageCredit,
//               seo_title,
//               seo_description,
//               seo_keywords,
//               hashtags,
//               embedding,
//               semantic_signature: semanticSignature, // <— NYTT
//             },
//           ])
//         );

//         if (error) throw error;
//         console.log(`✅ Saved: ${key} → ${title}`);
//         results.push({ category: key, topic, success: true });
//       } catch (err) {
//         console.warn(`⚠️ Generation failed for ${key}:`, err.message);
//         results.push({
//           category: key,
//           topic,
//           success: false,
//           error: err.message,
//         });
//       }
//     }

//     await updateAndPingSearchEngines();
//     console.log("🎉 Generation completed successfully.");

//     // === Logging til cron_logs ===
//     const duration = ((Date.now() - start) / 1000).toFixed(1);
//     const { error: logError } = await safeQuery(
//       "insert cron_log",
//       supabase.from("cron_logs").insert({
//         run_at: new Date().toISOString(),
//         duration_seconds: duration,
//         status: "success",
//         message: "GitHub Action generation completed",
//         details: { results },
//       })
//     );

//     console.log(`🕓 Logged run in cron_logs (${duration}s)`);

//     // === Behold kun de 3 siste loggene ===
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
//         "delete old cron_logs",
//         supabase.from("cron_logs").delete().in("id", oldIds)
//       );
//       console.log(`🧹 Deleted ${oldIds.length} old cron log(s)`);
//     }
//   } catch (err) {
//     console.error("❌ Fatal error:", err);
//     await safeQuery(
//       "fatal log insert",
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

// === scripts/generate.js ===
// CurioWire Generator for GitHub Actions
// Full artikkelgenerator med kuriosa-basert duplikatkontroll v5.0

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// === Lokale utils ===
import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";
import { categories } from "../app/api/utils/categories.js";
import { trimHeadline } from "../app/api/utils/textTools.js";
import { fetchTrendingTopics } from "../app/api/utils/fetchTopics.js";
import {
  buildArticlePrompt,
  buildCulturePrompt,
  buildProductArticlePrompt,
  affiliateAppendix,
  naturalEnding,
} from "../app/api/utils/prompts.js";

// import { normalize } from "../app/api/utils/duplicateUtils.js";
import { normalizeSignature } from "./curioSignature.js";

import {
  analyzeTopic,
  linkHistoricalStory,
  summarizeTheme,
} from "../app/api/utils/articleUtils.js";

import {
  resolveProductCategory,
  findAffiliateProduct,
} from "../app/api/utils/productUtils.js";

import { selectBestImage } from "../app/api/utils/imageSelector.js";
import { cleanText } from "../app/api/utils/cleanText.js";
import { refineArticle } from "../app/api/utils/refineTools.js";

// ✅ Ny modul for kuriositets-signaturer (pre-dupe-check)
import { buildCurioSignature, checkCurioDuplicate } from "./curioSignature.js";

// === INIT OpenAI ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// === Supabase init + log snapshot ===
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

// === Safe wrapper for Supabase ===
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

// === Embedding helper ===
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

// === Filter mot personlige Reddit-poster ===
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

// ===================================================
// === HOVEDFUNKSJON ===
// ===================================================
export async function main() {
  const start = Date.now();
  console.log("🕒 Starting CurioWire generation…");
  const results = [];

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_BASE_URL
      : "https://www.curiowire.com";

    // === Hent trender ===
    let topicsByCategory;
    try {
      const res = await fetch(`${baseUrl}/api/trends`);
      topicsByCategory = (await res.json())?.results || {};
    } catch (err) {
      console.warn("⚠️ Failed to fetch /api/trends:", err.message);
      topicsByCategory = {};
    }

    // === tilfeldig prioritet google/reddit ===
    const primarySource = Math.random() < 0.5 ? "google" : "reddit";
    const fallbackSource = primarySource === "google" ? "reddit" : "google";
    console.log(`Primary source: ${primarySource.toUpperCase()}`);

    // === LOOP GJENNOM ALLE KATEGORIER ===
    for (const [key, { tone, image }] of Object.entries(categories)) {
      console.log(`\n📰 Category: ${key}`);

      const topicData = topicsByCategory[key];
      const primaryList = topicData?.[primarySource] || [];
      const fallbackList = topicData?.[fallbackSource] || [];

      // kombiner & rens
      const allTopics = [...primaryList, ...fallbackList]
        .map((t) => (typeof t === "object" ? t.title : t))
        .filter((t) => !isPersonalRedditPost(t))
        .slice(0, 6);

      if (!allTopics.length) {
        console.log(`⚠️ No valid topics for ${key}`);
        continue;
      }

      // ===================================================
      // === VELG TEMA + KURIOSITET SOM IKKE ER DUPE ===
      // ===================================================

      let topic = null;
      let topicSummary = null; // analyse for valgt topic
      let linkedStory = null; // valgt kuriositet
      let curioSignature = null; // gjenbrukes senere ved lagring

      for (const candidateTitle of allTopics) {
        console.log(`🔎 Trying topic candidate: "${candidateTitle}"`);

        // 1) Analyse kandidatens tema & finn historisk link/kuriositet
        const analysis = await analyzeTopic(candidateTitle, key);
        const candidateLinkedStory = await linkHistoricalStory(analysis);

        if (!candidateLinkedStory) {
          console.log("→ Candidate rejected (no linkedStory / curiosity)");
          continue;
        }

        // 2) Bygg en lettvekts CurioSignature for denne kuriositeten
        const candidateCurioSignature = await buildCurioSignature({
          category: key,
          topic: candidateTitle,
          curiosity: candidateLinkedStory,
        });

        // 3) Sjekk om denne kuriositeten finnes fra før
        const dupeInfo = await checkCurioDuplicate(candidateCurioSignature);

        if (dupeInfo?.isDuplicate) {
          console.log(
            `🚫 Curiosity duplicate detected for "${candidateTitle}" – skipping candidate`
          );
          if (dupeInfo.closestTitle) {
            console.log(`   ↳ Similar to existing: "${dupeInfo.closestTitle}"`);
          }
          continue; // prøv neste kandidat innen samme kategori
        }

        // 4) Kandidaten er unik nok → bruk den
        topic = candidateTitle;
        topicSummary = analysis;
        linkedStory = candidateLinkedStory;
        curioSignature = candidateCurioSignature;

        console.log(
          `✅ Selected topic: ${topic}\n   Curiosity: "${linkedStory}"`
        );
        break;
      }

      if (!topic) {
        console.log(
          `⚠️ No unique curiosity found for category ${key} (all candidates were dupes)`
        );
        continue;
      }

      // Vi har nå: topic, topicSummary, linkedStory, curioSignature

      // Utvid og forankre temaet (for konsistent stil / kontekst)
      await summarizeTheme(topicSummary, linkedStory);

      // ===================================================
      // === PROMPT-GENERERING ===
      // ===================================================

      let prompt;

      if (key === "products") {
        const productCategory = await resolveProductCategory(
          topic,
          topicSummary,
          linkedStory
        );

        prompt =
          (await buildProductArticlePrompt(
            `${topic} (${productCategory})`,
            key,
            tone
          )) + affiliateAppendix;
      } else if (key === "culture") {
        prompt = buildCulturePrompt(topic) + naturalEnding;
      } else {
        prompt = buildArticlePrompt(topic, key, tone) + naturalEnding;
      }

      // Sett kuriositeten eksplisitt inn
      prompt += `\nFocus the story around this factual curiosity:\n"${linkedStory}"`;

      // ===================================================
      // === GENERERING AV ARTIKKEL ===
      // ===================================================
      console.log("✍️ Generating article…");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "";

      const titleMatch = raw.match(/Headline:\s*(.+)/i);
      const bodyMatch = raw.match(/Article:\s*([\s\S]+)/i);

      const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
      const title = trimHeadline(rawTitle);

      const articleRaw = bodyMatch ? bodyMatch[1].trim() : raw;

      // === REFINE ===
      const beforeCount = articleRaw.split(/\s+/).length;
      const refinedArticle = await refineArticle(articleRaw, title);
      const afterCount = refinedArticle.split(/\s+/).length;

      console.log(`🧾 Refined ${beforeCount} → ${afterCount} words`);

      // ===================================================
      // === SEO-FELT ===
      // ===================================================

      const seoTitleMatch = raw.match(/<title>\s*([^<]+)\s*/i);
      const seoDescMatch = raw.match(/<description>\s*([^<]+)\s*/i);
      const seoKeywordsMatch = raw.match(/<keywords>\s*([^<]+)\s*/i);
      const hashtagsMatch = raw.match(/Hashtags:\s*([#\w\s]+)/i);

      const seo_title = seoTitleMatch ? seoTitleMatch[1].trim() : title;
      const seo_description = seoDescMatch
        ? seoDescMatch[1].trim()
        : cleanText(refinedArticle.slice(0, 155));

      const seo_keywords = seoKeywordsMatch
        ? seoKeywordsMatch[1].trim()
        : [key, "curiosity", "history", "CurioWire"].join(", ");

      let hashtags = "";
      if (hashtagsMatch) {
        const rawTags = hashtagsMatch[1]
          .trim()
          .split(/\s+/)
          .filter((tag) => tag.startsWith("#"));
        hashtags = [...new Set(rawTags)].join(" ");
      }

      // ===================================================
      // === PRODUKTLOGIKK ===
      // ===================================================

      let source_url = null;

      if (key === "products") {
        const nameMatch = raw.match(/\[Product Name\]:\s*(.+)/i);
        const productName = nameMatch ? nameMatch[1].trim() : null;

        const productResult = await findAffiliateProduct(
          title,
          topic,
          refinedArticle,
          productName
        );

        source_url = productResult.source_url;
      }

      // ===================================================
      // === RENS TEKST ===
      // ===================================================

      const cleanedArticle = refinedArticle
        .replace(/```html|```/gi, "")
        .replace(/\[Product Name\]:\s*.+/i, "")
        .replace(/SEO:[\s\S]*$/i, "")
        .trim();

      // SummaryWhat (fortsatt støttet)
      const summaryMatch = cleanedArticle.match(
        /<span\s+data-summary-what[^>]*>(.*?)<\/span>/s
      );
      const summaryWhat = summaryMatch ? cleanText(summaryMatch[1].trim()) : "";

      // ===================================================
      // === EMBEDDING + SEMANTIC SIGNATURE ===
      // ===================================================

      const embedding = await generateEmbedding(`${title}\n${cleanedArticle}`);

      // semanticSignature skal henge sammen med pre-dupe CurioSignature
      const semanticSignature =
        curioSignature?.signature ||
        normalizeSignature(
          `${topic} ${title} ${seo_description} ${summaryWhat} ${linkedStory}`
        );

      // ===================================================
      // === BILDEVALG ===
      // ===================================================

      const imagePref = image === "photo" ? "photo" : "dalle";

      const { imageUrl, source } = await selectBestImage(
        title,
        cleanedArticle,
        key,
        imagePref // ekstra arg ignoreres hvis selectBestImage ikke bruker den
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

      // ===================================================
      // === LAGRE ARTIKKEL I SUPABASE ===
      // ===================================================

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
          },
        ])
      );

      if (error) throw error;

      console.log(`✅ Saved: ${key} → ${title}`);

      // Logg resultatet
      results.push({ category: key, topic, success: true });

      // Fortsetter til neste kategori…
    }

    // ===================================================
    // === SITEWIDE SEO-PING ===
    // ===================================================
    await updateAndPingSearchEngines();
    console.log("🎉 Generation completed successfully.");

    // ===================================================
    // === CRON LOGGING ===
    // ===================================================

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

    // Slett gamle cron-logger, behold 3
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

// === Kjør hovedfunksjon ===
main().then(() => process.exit(0));
