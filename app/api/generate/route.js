export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { updateAndPingSearchEngines } from "../utils/seoTools.js";

// === Hjelpemoduler ===
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
  buildProductPrompt,
} from "../utils/prompts.js";
import { makeAffiliateSearchLink } from "../utils/affiliateTools.js";

/* === 🔐 INITIAL SETUP === */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  const topicsByCategory = await fetchTrendingTopics();
  const results = [];

  // 🔁 Velg primærkilde tilfeldig (50/50)
  const primarySource = Math.random() < 0.5 ? "google" : "reddit";
  const fallbackSource = primarySource === "google" ? "reddit" : "google";
  console.log(`🌀 Using ${primarySource.toUpperCase()} as primary source.`);

  // === Liten hjelpefunksjon for re-pick ===
  async function pickNewTopic(key, triedTopics = []) {
    const topicData = topicsByCategory[key];
    const primaryList = topicData?.[primarySource] || [];
    const fallbackList = topicData?.[fallbackSource] || [];

    // 1️⃣ Filtrer ut allerede brukte topics
    const remaining = primaryList.filter((t) => !triedTopics.includes(t));

    // 2️⃣ Velg ny topic hvis mulig
    if (remaining.length > 0) {
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      return typeof pick === "object" && pick?.title ? pick.title : pick;
    }

    // 3️⃣ Prøv fallback-kilden
    const fallbackRemaining = fallbackList.filter(
      (t) => !triedTopics.includes(t)
    );
    if (fallbackRemaining.length > 0) {
      console.log(`🌐 Using ${fallbackSource} fallback for ${key}`);
      const pick =
        fallbackRemaining[Math.floor(Math.random() * fallbackRemaining.length)];
      return typeof pick === "object" && pick?.title ? pick.title : pick;
    }

    // 4️⃣ Siste utvei → GPT fallback-topic
    console.log(`🧠 GPT fallback-topic used for ${key}`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Suggest one factual, relevant, and current topic related to the category "${key}". Avoid fiction, politics, or speculation. Return a short topic title (max 8 words).`,
        },
      ],
      max_tokens: 30,
      temperature: 0.5,
    });
    return (
      completion.choices[0]?.message?.content?.trim() ||
      `notable ${key} curiosity`
    );
  }

  // === Hovedloop gjennom kategorier ===
  for (const [key, { tone, image }] of Object.entries(categories)) {
    let topic;
    let triedTopics = [];

    const topicData = topicsByCategory[key];
    const primaryList = topicData?.[primarySource] || [];
    const fallbackList = topicData?.[fallbackSource] || [];

    // Første forsøk
    topic =
      primaryList[Math.floor(Math.random() * primaryList.length)] ||
      fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
      `notable ${key} curiosity`;

    // Sikre at topic alltid er en streng
    if (typeof topic === "object" && topic?.title) {
      topic = topic.title;
    }

    // 🧠 RE-PICK SLØYFE – opptil 3 forsøk
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!topic) topic = await pickNewTopic(key, triedTopics);
      triedTopics.push(topic);

      try {
        // === Duplikatkontroll ===
        const { data: existing } = await supabase
          .from("articles")
          .select("id, title")
          .eq("category", key)
          .gte(
            "created_at",
            new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
          );

        const alreadyExists = existing?.some((a) =>
          a.title.toLowerCase().includes(topic.toLowerCase())
        );
        if (alreadyExists) {
          console.log(`🚫 Duplicate topic found for ${key}: ${topic}`);
          topic = await pickNewTopic(key, triedTopics);
          continue;
        }

        // === Likhetssjekk ===
        const recentTitles = existing?.slice(-10).map((a) => a.title) || [];
        let isSimilar = false;
        for (const prev of recentTitles) {
          const simPrompt = `
Determine if these two headlines describe the *same underlying topic*.
Answer only "YES" or "NO".
Headline A: "${prev}"
Headline B: "${topic}"
`;
          const simCheck = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: simPrompt }],
            max_tokens: 2,
            temperature: 0,
          });
          const ans = simCheck.choices[0]?.message?.content
            ?.trim()
            .toUpperCase();
          if (ans?.includes("YES")) {
            console.log(`🚫 Similar detected for ${key}: ${topic}`);
            isSimilar = true;
            break;
          }
        }
        if (isSimilar) {
          topic = await pickNewTopic(key, triedTopics);
          continue;
        }

        // === 🧩 1️⃣ Analyser temaet ===
        const analyzePrompt = `
Summarize briefly what this trending topic is about, assuming it belongs to the category "${key}".
Topic: "${topic}"
Return a short description (max 1 sentence).
`;

        const analyzeResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: analyzePrompt }],
          max_tokens: 40,
          temperature: 0,
        });
        const topicSummary =
          analyzeResp.choices[0]?.message?.content?.trim() ||
          "no clear summary found";

        // === 🧩 2️⃣ Finn en ekte historie relatert til temaet ===
        const linkPrompt = `
Find one real, fascinating historical or human story connected to this theme:
"${topicSummary}"
Return one concise factual description (1–2 sentences).
`;
        const linkResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: linkPrompt }],
          max_tokens: 80,
          temperature: 0.4,
        });
        const linkedStory =
          linkResp.choices[0]?.message?.content?.trim() ||
          "no specific historical link found";

        // === 🧩 3️⃣ Lag en kompakt oppsummering (Theme / Story) ===
        let shortTheme = "";
        let shortStory = "";

        const summaryPrompt = `
Summarize the following two texts into a short thematic description of no more than 8 words each.

1. What is the main *theme* of this topic?  
2. What is the main *historical or human story* referenced?

Respond in this format exactly:
Theme: <short phrase>
Story: <short phrase>

Text A (topic summary): ${topicSummary}
Text B (linked story): ${linkedStory}
`;

        try {
          const compactSummary = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: summaryPrompt }],
            max_tokens: 40,
            temperature: 0.3,
          });

          const compactText = compactSummary.choices[0]?.message?.content || "";
          const themeMatch = compactText.match(/Theme:\s*(.+)/i);
          const storyMatch = compactText.match(/Story:\s*(.+)/i);
          shortTheme = themeMatch ? themeMatch[1].trim() : "";
          shortStory = storyMatch ? storyMatch[1].trim() : "";
        } catch (err) {
          console.warn("⚠️ Compact summary failed:", err.message);
        }

        console.log(`\n🧠 [${key.toUpperCase()}] "${topic}"`);
        console.log(`   ↳ Theme: ${shortTheme || "N/A"}`);
        console.log(`   ↳ Story link: ${shortStory || "N/A"}`);

        // === Bygg prompt for artikkel ===
        let prompt;

        if (key === "products") {
          const categoryPrompt = `
Interpret the following product name as a *general object category* or concept.
Example: "Apple Watch" → "watch"
Product name: "${topic}"
Return only the category in 1–2 words.
`;
          let productCategory = "object";
          try {
            const catResp = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: categoryPrompt }],
              max_tokens: 10,
              temperature: 0,
            });

            productCategory =
              catResp.choices[0]?.message?.content?.trim().toLowerCase() ||
              "object";

            // 🧩 Smart fallback-logikk
            if (
              productCategory === "object" ||
              productCategory.includes("campaign") ||
              productCategory.includes("ad") ||
              productCategory.includes("marketing") ||
              productCategory.length < 2
            ) {
              const summaryHint = topicSummary
                .toLowerCase()
                .match(
                  /\b(craftsmanship|design|tool|device|material|product|invention|item|object)\b/
                );

              if (summaryHint) {
                productCategory = summaryHint[1];
                console.log(
                  `🧩 Fallback category derived from summary: "${productCategory}"`
                );
              } else if (
                linkedStory &&
                linkedStory.match(/\b(hat|pen|watch|car|machine|toy|tool)\b/i)
              ) {
                productCategory = linkedStory.match(
                  /\b(hat|pen|watch|car|machine|toy|tool)\b/i
                )[1];
                console.log(
                  `🧩 Fallback category derived from linkedStory: "${productCategory}"`
                );
              } else {
                productCategory = "product";
                console.log(`🧩 Defaulting to generic category: "product"`);
              }
            } else {
              console.log(`🧩 Product interpreted as: "${productCategory}"`);
            }
          } catch (err) {
            console.warn("⚠️ Category extraction failed:", err.message);
          }

          prompt = buildProductArticlePrompt(productCategory);
          prompt += affiliateAppendix;
        } else if (key === "culture") {
          prompt = buildCulturePrompt(topic) + naturalEnding;
        } else {
          prompt = buildArticlePrompt(topic, key, tone) + naturalEnding;
        }

        // 🎯 Fokuser rundt sann historie
        prompt += `
Focus the story around this factual event or curiosity:
"${linkedStory}"
`;

        // === Generer artikkel ===
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

        // === Produktlogikk (affiliate) ===
        let source_url = null;
        let productName = null;

        if (key === "products") {
          const nameMatch = text.match(/\[Product Name\]:\s*(.+)/i);
          if (nameMatch) {
            productName = nameMatch[1].trim();
            source_url = makeAffiliateSearchLink(productName);
            console.log(`🛍️ Found product name: "${productName}"`);
          }

          // 🧠 GPT-fallback hvis ikke produktnavn ble funnet
          if (!productName) {
            console.log(`🧠 No product name found — asking GPT for match`);
            const productPrompt = buildProductPrompt(title, topic, article);
            try {
              const productSearch = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: productPrompt }],
                max_tokens: 50,
                temperature: 0.3,
              });
              productName = productSearch.choices[0]?.message?.content?.trim();
              if (productName) {
                source_url = makeAffiliateSearchLink(productName);
                console.log(
                  `✅ Created affiliate search link for "${productName}"`
                );
              } else {
                console.warn(
                  `⚠️ GPT returned no valid product name for "${topic}"`
                );
              }
            } catch (err) {
              console.error("❌ Error fetching product name:", err.message);
            }
          }
        }

        const cleanedArticle = article
          .replace(/\[Product Name\]:\s*.+/i, "")
          .trim();

        // === 🎨 Hent bilde ===
        const keywords = title
          .split(" ")
          .filter((w) => w.length > 3)
          .slice(0, 6)
          .join(", ");

        let imageUrl =
          image === "dalle"
            ? await generateDalleImage(title, topic, tone, key)
            : await fetchUnsplashImage(`${title} ${keywords} ${key}`);

        if (!imageUrl && image === "dalle")
          imageUrl = await fetchUnsplashImage(`${title} ${keywords} ${key}`);
        if (!imageUrl) imageUrl = `https://picsum.photos/seed/${key}/800/400`;

        const cachedUrl =
          imageUrl.includes("unsplash") || imageUrl.includes("photos")
            ? await cacheImageToSupabase(imageUrl, `${key}-${Date.now()}`, key)
            : imageUrl;

        const imageCredit = imageUrl.includes("unsplash")
          ? "Image courtesy of Unsplash"
          : imageUrl.includes("picsum")
          ? "Placeholder image via Picsum"
          : "Illustration by DALL·E";

        // === 📦 Lagre i Supabase ===
        const { error } = await supabase.from("articles").insert([
          {
            category: key,
            title,
            excerpt: cleanedArticle,
            image_url: cachedUrl,
            source_url: source_url,
            image_credit: imageCredit,
          },
        ]);
        if (error) throw error;

        console.log(`✅ Article saved for ${key}: ${title}`);

        // 🧩 Marker *kun den faktiske subreddit-en* som ble brukt
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
        break; // ferdig med denne kategorien ✅
      } catch (err) {
        console.warn(
          `⚠️ Attempt ${attempt + 1} failed for ${key}:`,
          err.message
        );
        if (attempt === 2) {
          results.push({ category: key, topic, success: false });
        } else {
          topic = await pickNewTopic(key, triedTopics);
        }
      }
    }
  }

  await updateAndPingSearchEngines();
  return NextResponse.json({ success: true, results });
}
