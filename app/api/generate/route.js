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
//   fetchUnsplashImage,
//   generateDalleImage,
//   cacheImageToSupabase,
// } from "../utils/imageTools.js";
// import {
//   buildArticlePrompt,
//   buildCulturePrompt,
//   buildProductArticlePrompt,
//   affiliateAppendix,
//   naturalEnding,
// } from "../utils/prompts.js";
// // import { makeAffiliateSearchLink } from "../utils/affiliateTools.js";

// // === Nye modulære utils ===
// import { pickNewTopic } from "../utils/topicUtils.js";
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

// // === INIT ===
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

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
//     let topic;
//     let triedTopics = [];

//     const topicData = topicsByCategory[key];
//     const primaryList = topicData?.[primarySource] || [];
//     const fallbackList = topicData?.[fallbackSource] || [];

//     topic =
//       primaryList[Math.floor(Math.random() * primaryList.length)] ||
//       fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
//       `notable ${key} curiosity`;

//     if (typeof topic === "object" && topic?.title) topic = topic.title;

//     // === 3 forsøk per kategori ===
//     for (let attempt = 0; attempt < 3; attempt++) {
//       if (!topic)
//         topic = await pickNewTopic(
//           key,
//           topicsByCategory,
//           primarySource,
//           fallbackSource,
//           triedTopics
//         );
//       triedTopics.push(topic);

//       try {
//         // === Duplikatkontroll ===
//         const { existing, alreadyExists } = await checkDuplicateTopic(
//           key,
//           topic
//         );
//         if (alreadyExists) {
//           console.log(`🚫 Duplicate topic found for ${key}: ${topic}`);
//           topic = await pickNewTopic(
//             key,
//             topicsByCategory,
//             primarySource,
//             fallbackSource,
//             triedTopics
//           );
//           continue;
//         }

//         // === Likhetssjekk ===
//         const isSimilar = await checkSimilarTitles(existing, topic, key);
//         if (isSimilar) {
//           topic = await pickNewTopic(
//             key,
//             topicsByCategory,
//             primarySource,
//             fallbackSource,
//             triedTopics
//           );
//           continue;
//         }

//         // === 🧩 Analyser temaet ===
//         const topicSummary = await analyzeTopic(topic, key);
//         const linkedStory = await linkHistoricalStory(topicSummary);
//         const { shortTheme, shortStory } = await summarizeTheme(
//           topicSummary,
//           linkedStory
//         );

//         console.log(`\n🧠 [${key.toUpperCase()}] "${topic}"`);
//         console.log(`   ↳ Theme: ${shortTheme || "N/A"}`);
//         console.log(`   ↳ Story link: ${shortStory || "N/A"}`);

//         // === Bygg prompt ===
//         let prompt;

//         if (key === "products") {
//           const productCategory = await resolveProductCategory(
//             topic,
//             topicSummary,
//             linkedStory
//           );
//           prompt =
//             (await buildProductArticlePrompt(productCategory)) +
//             affiliateAppendix;
//         } else if (key === "culture") {
//           prompt = buildCulturePrompt(topic) + naturalEnding;
//         } else {
//           prompt = buildArticlePrompt(topic, key, tone) + naturalEnding;
//         }

//         prompt += `\nFocus the story around this factual event or curiosity:\n"${linkedStory}"`;

//         // === Generer artikkeltekst ===
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

//         // === 🧠 SEO-metadata og hashtags ===
//         // Trekker ut SEO-blokken (meta-data + hashtags)
//         const seoTitleMatch = text.match(/<title>\s*([^<]+)\s*/i);
//         const seoDescMatch = text.match(/<description>\s*([^<]+)\s*/i);
//         const seoKeywordsMatch = text.match(/<keywords>\s*([^<]+)\s*/i);
//         const hashtagsMatch = text.match(/Hashtags:\s*([#\w\s]+)/i);

//         // Rensede og fallbackede verdier
//         const seo_title = seoTitleMatch ? seoTitleMatch[1].trim() : title;
//         const seo_description = seoDescMatch
//           ? seoDescMatch[1].trim()
//           : cleanText(article.slice(0, 155));
//         const seo_keywords = seoKeywordsMatch
//           ? seoKeywordsMatch[1].trim()
//           : [category, "curiosity", "history", "CurioWire"].join(", ");

//         // === ✂️ Fjern duplikater og normaliser hashtags ===
//         let hashtags = "";
//         if (hashtagsMatch) {
//           const rawTags = hashtagsMatch[1]
//             .trim()
//             .replace(/\s+/g, " ") // fjern ekstra mellomrom
//             .split(/\s+/)
//             .filter((tag) => tag.startsWith("#")); // behold kun gyldige #
//           const uniqueTags = [...new Set(rawTags)];
//           hashtags = uniqueTags.join(" ");
//         }

//         // === Produktlogikk ===
//         let source_url = null;
//         let productName = null;

//         if (key === "products") {
//           const nameMatch = text.match(/\[Product Name\]:\s*(.+)/i);
//           if (nameMatch) productName = nameMatch[1].trim();

//           const productResult = await findAffiliateProduct(
//             title,
//             topic,
//             article,
//             productName
//           );
//           source_url = productResult.source_url;
//           productName = productResult.productName;
//         }

//         const cleanedArticle = article
//           .replace(/\[Product Name\]:\s*.+/i, "")
//           .replace(/SEO:[\s\S]*$/i, "") // Fjern alt fra "SEO:" og nedover
//           .trim();

//         // === 🎨 Hent bilde ===
//         const imagePref = image === "photo" ? "photo" : "dalle";

//         const { imageUrl, source, score } = await selectBestImage(
//           title,
//           cleanedArticle,
//           key,
//           imagePref
//         );

//         const cachedUrl = imageUrl; // allerede cached i selectBestImage

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

//         // === 📦 Lagre i Supabase ===
//         const { error } = await supabase.from("articles").insert([
//           {
//             category: key,
//             title,
//             excerpt: cleanedArticle,
//             image_url: cachedUrl,
//             source_url,
//             image_credit: imageCredit,
//             seo_title,
//             seo_description,
//             seo_keywords,
//             hashtags,
//           },
//         ]);
//         if (error) throw error;
//         console.log(`✅ Article saved for ${key}: ${title}`);

//         // === Markér brukt subreddit (kun for Reddit-kilder) ===
//         const subredditName = topicsByCategory[key]?.selected?.subreddit;
//         if (subredditName && primarySource === "reddit") {
//           try {
//             await supabase
//               .from("subreddits")
//               .update({ last_used: true })
//               .eq("category", key)
//               .eq("name", subredditName);
//             console.log(`🏷️ Marked r/${subredditName} as used for ${key}`);
//           } catch (err) {
//             console.warn(
//               `⚠️ Could not mark subreddit as used for ${key}:`,
//               err.message
//             );
//           }
//         }

//         results.push({
//           category: key,
//           topic,
//           summary: topicSummary,
//           curiosity: linkedStory,
//           success: true,
//         });
//         break;
//       } catch (err) {
//         console.warn(
//           `⚠️ Attempt ${attempt + 1} failed for ${key}:`,
//           err.message
//         );
//         if (attempt === 2) {
//           results.push({ category: key, topic, success: false });
//         } else {
//           topic = await pickNewTopic(
//             key,
//             topicsByCategory,
//             primarySource,
//             fallbackSource,
//             triedTopics
//           );
//         }
//       }
//     }
//   }

//   await updateAndPingSearchEngines();
//   return NextResponse.json({ success: true, results });
// }
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// === Lokale utils ===
import { updateAndPingSearchEngines } from "../utils/seoTools.js";
import { categories } from "../utils/categories.js";
import { trimHeadline } from "../utils/textTools.js";
import { fetchTrendingTopics } from "../utils/fetchTopics.js";
import {
  fetchUnsplashImage,
  generateDalleImage,
  cacheImageToSupabase,
} from "../utils/imageTools.js";
import {
  buildArticlePrompt,
  buildCulturePrompt,
  buildProductArticlePrompt,
  affiliateAppendix,
  naturalEnding,
} from "../utils/prompts.js";
import { pickNewTopic } from "../utils/topicUtils.js";
import {
  checkDuplicateTopic,
  checkSimilarTitles,
} from "../utils/duplicateUtils.js";
import {
  analyzeTopic,
  linkHistoricalStory,
  summarizeTheme,
} from "../utils/articleUtils.js";
import {
  resolveProductCategory,
  findAffiliateProduct,
} from "../utils/productUtils.js";
import { selectBestImage } from "../utils/imageSelector.js";
import { cleanText } from "../utils/cleanText.js";

// === INIT ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// === Helper for embedding ===
async function generateEmbedding(text) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return emb.data[0].embedding;
  } catch (err) {
    console.warn("⚠️ Failed to generate embedding:", err.message);
    return null;
  }
}

// === HOVEDGENERERING ===
export async function GET() {
  const topicsByCategory = await fetchTrendingTopics();
  const results = [];

  // 🔁 tilfeldig hovedkilde (Google/Reddit)
  const primarySource = Math.random() < 0.5 ? "google" : "reddit";
  const fallbackSource = primarySource === "google" ? "reddit" : "google";
  console.log(`🌀 Using ${primarySource.toUpperCase()} as primary source.`);

  // === LOOP GJENNOM KATEGORIER ===
  for (const [key, { tone, image }] of Object.entries(categories)) {
    console.log(`\n📰 Processing category: ${key.toUpperCase()}`);

    const topicData = topicsByCategory[key];
    const primaryList = topicData?.[primarySource] || [];
    const fallbackList = topicData?.[fallbackSource] || [];
    const allTopics = [...primaryList, ...fallbackList].slice(0, 5); // prøv maks 5

    if (!allTopics.length) {
      console.log(`⚠️ No topics found for ${key}, skipping...`);
      continue;
    }

    // === 🔍 Finn et unikt (ikke-duplikat) topic ===
    let topic = null;
    for (const candidate of allTopics) {
      const candidateTitle =
        typeof candidate === "object" ? candidate.title : candidate;
      console.log(`🔎 Checking candidate: "${candidateTitle}"`);

      const { existing, alreadyExists } = await checkDuplicateTopic(
        key,
        candidateTitle
      );
      if (alreadyExists) {
        console.log(`🚫 Duplicate topic found for ${key}: ${candidateTitle}`);
        continue;
      }

      const isSimilar = await checkSimilarTitles(existing, candidateTitle, key);
      if (isSimilar) {
        console.log(`🚫 Too similar topic found for ${key}: ${candidateTitle}`);
        continue;
      }

      topic = candidateTitle;
      console.log(`✅ Selected topic for ${key}: ${topic}`);
      break;
    }

    // Hopp kategori hvis ingen unike topics funnet
    if (!topic) {
      console.log(
        `⚠️ All topics for ${key} were duplicates or too similar. Skipping.`
      );
      continue;
    }

    try {
      // === 🧩 Analyser temaet ===
      const topicSummary = await analyzeTopic(topic, key);
      const linkedStory = await linkHistoricalStory(topicSummary);
      const { shortTheme, shortStory } = await summarizeTheme(
        topicSummary,
        linkedStory
      );

      console.log(`\n🧠 [${key.toUpperCase()}] "${topic}"`);
      console.log(`   ↳ Theme: ${shortTheme || "N/A"}`);
      console.log(`   ↳ Story link: ${shortStory || "N/A"}`);

      // === Bygg prompt ===
      let prompt;
      if (key === "products") {
        const productCategory = await resolveProductCategory(
          topic,
          topicSummary,
          linkedStory
        );
        prompt =
          (await buildProductArticlePrompt(productCategory)) +
          affiliateAppendix;
      } else if (key === "culture") {
        prompt = buildCulturePrompt(topic) + naturalEnding;
      } else {
        prompt = buildArticlePrompt(topic, key, tone) + naturalEnding;
      }

      prompt += `\nFocus the story around this factual event or curiosity:\n"${linkedStory}"`;

      // === Generer artikkeltekst ===
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      const titleMatch = text.match(/Headline:\s*(.+)/i);
      const bodyMatch = text.match(/Article:\s*([\s\S]+)/i);
      const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
      const title = trimHeadline(rawTitle);
      const article = bodyMatch ? bodyMatch[1].trim() : text;

      // === 🧠 SEO-metadata og hashtags ===
      const seoTitleMatch = text.match(/<title>\s*([^<]+)\s*/i);
      const seoDescMatch = text.match(/<description>\s*([^<]+)\s*/i);
      const seoKeywordsMatch = text.match(/<keywords>\s*([^<]+)\s*/i);
      const hashtagsMatch = text.match(/Hashtags:\s*([#\w\s]+)/i);

      const seo_title = seoTitleMatch ? seoTitleMatch[1].trim() : title;
      const seo_description = seoDescMatch
        ? seoDescMatch[1].trim()
        : cleanText(article.slice(0, 155));
      const seo_keywords = seoKeywordsMatch
        ? seoKeywordsMatch[1].trim()
        : [key, "curiosity", "history", "CurioWire"].join(", ");

      let hashtags = "";
      if (hashtagsMatch) {
        const rawTags = hashtagsMatch[1]
          .trim()
          .replace(/\s+/g, " ")
          .split(/\s+/)
          .filter((tag) => tag.startsWith("#"));
        const uniqueTags = [...new Set(rawTags)];
        hashtags = uniqueTags.join(" ");
      }

      // === Produktlogikk ===
      let source_url = null;
      let productName = null;

      if (key === "products") {
        const nameMatch = text.match(/\[Product Name\]:\s*(.+)/i);
        if (nameMatch) productName = nameMatch[1].trim();

        const productResult = await findAffiliateProduct(
          title,
          topic,
          article,
          productName
        );
        source_url = productResult.source_url;
        productName = productResult.productName;
      }

      const cleanedArticle = article
        .replace(/\[Product Name\]:\s*.+/i, "")
        .replace(/SEO:[\s\S]*$/i, "")
        .trim();

      // === 🧠 Lag embedding for duplikatkontroll ===
      const embeddingText = `${title}\n${cleanedArticle.slice(0, 800)}`;
      const embedding = await generateEmbedding(embeddingText);

      // === 🎨 Hent bilde ===
      const imagePref = image === "photo" ? "photo" : "dalle";
      const { imageUrl, source } = await selectBestImage(
        title,
        cleanedArticle,
        key,
        imagePref
      );

      const cachedUrl = imageUrl;

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

      // === 📦 Lagre i Supabase ===
      const { error } = await supabase.from("articles").insert([
        {
          category: key,
          title,
          excerpt: cleanedArticle,
          image_url: cachedUrl,
          source_url,
          image_credit: imageCredit,
          seo_title,
          seo_description,
          seo_keywords,
          hashtags,
          embedding, // 🧠 Lagres her
        },
      ]);
      if (error) throw error;
      console.log(`✅ Article saved for ${key}: ${title}`);

      // === Markér brukt subreddit (kun for Reddit-kilder) ===
      const subredditName = topicsByCategory[key]?.selected?.subreddit;
      if (subredditName && primarySource === "reddit") {
        try {
          await supabase
            .from("subreddits")
            .update({ last_used: true })
            .eq("category", key)
            .eq("name", subredditName);
          console.log(`🏷️ Marked r/${subredditName} as used for ${key}`);
        } catch (err) {
          console.warn(
            `⚠️ Could not mark subreddit as used for ${key}:`,
            err.message
          );
        }
      }

      results.push({
        category: key,
        topic,
        summary: topicSummary,
        curiosity: linkedStory,
        success: true,
      });
    } catch (err) {
      console.warn(`⚠️ Generation failed for ${key}:`, err.message);
      results.push({ category: key, topic, success: false });
    }
  }

  await updateAndPingSearchEngines();
  return NextResponse.json({ success: true, results });
}
