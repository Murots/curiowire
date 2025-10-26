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
// import { makeAffiliateSearchLink } from "../utils/affiliateTools.js";

// === Nye modulære utils ===
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

// === INIT ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
    let topic;
    let triedTopics = [];

    const topicData = topicsByCategory[key];
    const primaryList = topicData?.[primarySource] || [];
    const fallbackList = topicData?.[fallbackSource] || [];

    topic =
      primaryList[Math.floor(Math.random() * primaryList.length)] ||
      fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
      `notable ${key} curiosity`;

    if (typeof topic === "object" && topic?.title) topic = topic.title;

    // === 3 forsøk per kategori ===
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!topic)
        topic = await pickNewTopic(
          key,
          topicsByCategory,
          primarySource,
          fallbackSource,
          triedTopics
        );
      triedTopics.push(topic);

      try {
        // === Duplikatkontroll ===
        const { existing, alreadyExists } = await checkDuplicateTopic(
          key,
          topic
        );
        if (alreadyExists) {
          console.log(`🚫 Duplicate topic found for ${key}: ${topic}`);
          topic = await pickNewTopic(
            key,
            topicsByCategory,
            primarySource,
            fallbackSource,
            triedTopics
          );
          continue;
        }

        // === Likhetssjekk ===
        const isSimilar = await checkSimilarTitles(existing, topic, key);
        if (isSimilar) {
          topic = await pickNewTopic(
            key,
            topicsByCategory,
            primarySource,
            fallbackSource,
            triedTopics
          );
          continue;
        }

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
          .trim();

        // === 🎨 Hent bilde ===
        const imagePref = image === "photo" ? "photo" : "dalle";

        const { imageUrl, source, score } = await selectBestImage(
          title,
          cleanedArticle,
          key,
          imagePref
        );

        const cachedUrl = imageUrl; // allerede cached i selectBestImage

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
        break;
      } catch (err) {
        console.warn(
          `⚠️ Attempt ${attempt + 1} failed for ${key}:`,
          err.message
        );
        if (attempt === 2) {
          results.push({ category: key, topic, success: false });
        } else {
          topic = await pickNewTopic(
            key,
            topicsByCategory,
            primarySource,
            fallbackSource,
            triedTopics
          );
        }
      }
    }
  }

  await updateAndPingSearchEngines();
  return NextResponse.json({ success: true, results });
}
