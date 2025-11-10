// // === app/api/generate/route.js ===
// export const runtime = "nodejs";

// import { NextResponse } from "next/server";
// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// // === Lokale utils ===
// import { updateAndPingSearchEngines } from "../utils/seoTools.js";
// import { categories } from "../utils/categories.js";
// import { trimHeadline } from "../utils/textTools.js";
// import { fetchTrendingTopics } from "../utils/fetchTopics.js";

// import {
//   buildArticlePrompt,
//   buildCulturePrompt,
//   buildProductArticlePrompt,
//   affiliateAppendix,
//   naturalEnding,
// } from "../utils/prompts.js";
// import {
//   checkDuplicateTopic,
//   checkSimilarTitles,
// } from "../utils/duplicateUtils.js";
// import {
//   analyzeTopic,
//   linkHistoricalStory,
//   summarizeTheme,
// } from "../utils/articleUtils.js";
// import {
//   resolveProductCategory,
//   findAffiliateProduct,
// } from "../utils/productUtils.js";
// import { selectBestImage } from "../utils/imageSelector.js";
// import { cleanText } from "../utils/cleanText.js";
// import { refineArticle } from "../utils/refineTools.js"; // 🧹 Ny manussjekk

// // === INIT ===
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// // === Helper for embedding ===
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
//     /\b(i|my|me|our|us|mine|ours)\b/, // førsteperson
//     /\b(dad|mom|father|mother|boyfriend|girlfriend|wife|husband)\b/,
//     /\b(confession|story|journey|feeling|struggle|rant|proud|lost my|thank you)\b/,
//     /askreddit|relationships|aita|offmychest|trueoffmychest|tifu|confession/,
//   ];
//   return bannedPatterns.some((re) => re.test(lower));
// }

// // === HOVEDGENERERING ===
// export async function GET() {
//   const topicsByCategory = await fetchTrendingTopics();
//   const results = [];

//   // 🔁 tilfeldig hovedkilde (Google/Reddit)
//   const primarySource = Math.random() < 0.5 ? "google" : "reddit";
//   const fallbackSource = primarySource === "google" ? "reddit" : "google";
//   console.log(`🌀 Using ${primarySource.toUpperCase()} as primary source.`);

//   // === LOOP GJENNOM KATEGORIER ===
//   for (const [key, { tone, image }] of Object.entries(categories)) {
//     console.log(`\n📰 Processing category: ${key.toUpperCase()}`);

//     const topicData = topicsByCategory[key];
//     const primaryList = topicData?.[primarySource] || [];
//     const fallbackList = topicData?.[fallbackSource] || [];

//     // Filtrer bort personlige Reddit-poster før vi går videre
//     const allTopics = [...primaryList, ...fallbackList]
//       .filter((t) => {
//         const title = typeof t === "object" ? t.title : t;
//         return !isPersonalRedditPost(title);
//       })
//       .slice(0, 5);

//     if (!allTopics.length) {
//       console.log(`⚠️ No valid topics found for ${key}, skipping...`);
//       continue;
//     }

//     // === 🔍 Finn unikt tema ===
//     let topic = null;
//     for (const candidate of allTopics) {
//       const candidateTitle =
//         typeof candidate === "object" ? candidate.title : candidate;
//       console.log(`🔎 Checking candidate: "${candidateTitle}"`);

//       const { existing, alreadyExists } = await checkDuplicateTopic(
//         key,
//         candidateTitle
//       );
//       if (alreadyExists) {
//         console.log(`🚫 Duplicate topic found for ${key}: ${candidateTitle}`);
//         continue;
//       }

//       const isSimilar = await checkSimilarTitles(existing, candidateTitle, key);
//       if (isSimilar) {
//         console.log(`🚫 Too similar topic found for ${key}: ${candidateTitle}`);
//         continue;
//       }

//       topic = candidateTitle;
//       console.log(`✅ Selected topic for ${key}: ${topic}`);
//       break;
//     }

//     if (!topic) {
//       console.log(`⚠️ All topics for ${key} were duplicates. Skipping.`);
//       continue;
//     }

//     try {
//       // === 🧩 Analyser temaet ===
//       const topicSummary = await analyzeTopic(topic, key);
//       const linkedStory = await linkHistoricalStory(topicSummary);
//       const { shortTheme, shortStory } = await summarizeTheme(
//         topicSummary,
//         linkedStory
//       );

//       console.log(`\n🧠 [${key.toUpperCase()}] "${topic}"`);
//       console.log(`   ↳ Theme: ${shortTheme || "N/A"}`);
//       console.log(`   ↳ Story link: ${shortStory || "N/A"}`);

//       // === Bygg prompt ===
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

//       prompt += `\nFocus the story around this factual event or curiosity:\n"${linkedStory}"`;

//       // === Generer artikkeltekst ===
//       const completion = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [{ role: "user", content: prompt }],
//       });

//       const text = completion.choices[0]?.message?.content?.trim() || "";
//       const titleMatch = text.match(/Headline:\s*(.+)/i);
//       const bodyMatch = text.match(/Article:\s*([\s\S]+)/i);
//       const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
//       const title = trimHeadline(rawTitle);
//       const article = bodyMatch ? bodyMatch[1].trim() : text;

//       // === 🧹 Kjør valgfri manussjekk ===
//       const ENABLE_REFINE = true;
//       let refinedArticle = article;
//       if (ENABLE_REFINE) {
//         console.log(`🔍 Running editorial refine-pass for ${key}: ${title}`);
//         const beforeWords = article.split(/\s+/).length;
//         refinedArticle = await refineArticle(article, title);
//         const afterWords = refinedArticle.split(/\s+/).length;
//         console.log(`🧾 Refined ${key}: ${beforeWords} → ${afterWords} words`);
//       }

//       // === 🧠 SEO-metadata og hashtags ===
//       const seoTitleMatch = text.match(/<title>\s*([^<]+)\s*/i);
//       const seoDescMatch = text.match(/<description>\s*([^<]+)\s*/i);
//       const seoKeywordsMatch = text.match(/<keywords>\s*([^<]+)\s*/i);
//       const hashtagsMatch = text.match(/Hashtags:\s*([#\w\s]+)/i);

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
//           .replace(/\s+/g, " ")
//           .split(/\s+/)
//           .filter((tag) => tag.startsWith("#"));
//         const uniqueTags = [...new Set(rawTags)];
//         hashtags = uniqueTags.join(" ");
//       }

//       // === Produktlogikk ===
//       let source_url = null;
//       let productName = null;

//       if (key === "products") {
//         const nameMatch = text.match(/\[Product Name\]:\s*(.+)/i);
//         if (nameMatch) productName = nameMatch[1].trim();

//         const productResult = await findAffiliateProduct(
//           title,
//           topic,
//           refinedArticle,
//           productName
//         );
//         source_url = productResult.source_url;
//         productName = productResult.productName;
//       }

//       // === Fjern ```html og ``` + øvrig opprydding ===
//       const cleanedArticle = refinedArticle
//         .replace(/```html|```/gi, "")
//         .replace(/\[Product Name\]:\s*.+/i, "")
//         .replace(/SEO:[\s\S]*$/i, "")
//         .trim();

//       // === 🧠 Lag embedding ===
//       const embeddingText = `${title}\n${cleanedArticle.slice(0, 800)}`;
//       const embedding = await generateEmbedding(embeddingText);

//       // === 🎨 Hent bilde ===
//       const imagePref = image === "photo" ? "photo" : "dalle";
//       const { imageUrl, source } = await selectBestImage(
//         title,
//         cleanedArticle,
//         key,
//         imagePref
//       );

//       const cachedUrl = imageUrl;

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

//       // === 📦 Lagre i Supabase ===
//       const { error } = await supabase.from("articles").insert([
//         {
//           category: key,
//           title,
//           excerpt: cleanedArticle,
//           image_url: cachedUrl,
//           source_url,
//           image_credit: imageCredit,
//           seo_title,
//           seo_description,
//           seo_keywords,
//           hashtags,
//           embedding,
//         },
//       ]);
//       if (error) throw error;
//       console.log(`✅ Article saved for ${key}: ${title}`);

//       // === Markér brukt subreddit ===
//       const subredditName = topicsByCategory[key]?.selected?.subreddit;
//       if (subredditName && primarySource === "reddit") {
//         try {
//           await supabase
//             .from("subreddits")
//             .update({ last_used: true })
//             .eq("category", key)
//             .eq("name", subredditName);
//           console.log(`🏷️ Marked r/${subredditName} as used for ${key}`);
//         } catch (err) {
//           console.warn(
//             `⚠️ Could not mark subreddit as used for ${key}:`,
//             err.message
//           );
//         }
//       }

//       results.push({
//         category: key,
//         topic,
//         summary: topicSummary,
//         curiosity: linkedStory,
//         success: true,
//       });
//     } catch (err) {
//       console.warn(`⚠️ Generation failed for ${key}:`, err.message);
//       results.push({ category: key, topic, success: false });
//     }
//   }

//   await updateAndPingSearchEngines();
//   return NextResponse.json({ success: true, results });
// }
// === app/api/generate/route.js ===
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { main as runGenerator } from "../../../scripts/generate.js";

export async function GET() {
  try {
    await runGenerator();
    return NextResponse.json({
      success: true,
      message: "Generation completed",
    });
  } catch (err) {
    console.error("❌ Generation error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
