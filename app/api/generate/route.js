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

export const runtime = "nodejs";

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

  // 🔁 Velg kilde tilfeldig (50/50)
  const primarySource = Math.random() < 0.5 ? "google" : "reddit";
  const fallbackSource = primarySource === "google" ? "reddit" : "google";
  console.log(`🌀 Using ${primarySource.toUpperCase()} as primary source.`);

  for (const [key, { tone, image }] of Object.entries(categories)) {
    const topicData = topicsByCategory[key];
    const primaryList = topicData?.[primarySource] || [];
    const fallbackList = topicData?.[fallbackSource] || [];

    let topic =
      primaryList[Math.floor(Math.random() * primaryList.length)] ||
      fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
      `notable ${key} curiosity`;

    if (!topic) {
      console.warn(`⚠️ ${key} empty — switching to ${fallbackSource}`);
      topic =
        fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
        `notable ${key} curiosity`;
    }

    try {
      // === Duplikatkontroll ===
      const { data: existing } = await supabase
        .from("articles")
        .select("id, title")
        .eq("category", key)
        .gte(
          "created_at",
          new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        );

      const alreadyExists = existing?.some((a) =>
        a.title.toLowerCase().includes(topic.toLowerCase())
      );
      if (alreadyExists) continue;

      // === Similarity-check mot siste titler ===
      const recentTitles = existing?.slice(-5).map((a) => a.title) || [];
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
        const ans = simCheck.choices[0]?.message?.content?.trim().toUpperCase();
        if (ans?.includes("YES")) {
          console.log(`🚫 Similar detected for ${key}: ${topic}`);
          isSimilar = true;
          break;
        }
      }
      if (isSimilar) continue;

      // === 🧩 1️⃣ Analyser hva temaet handler om
      const analyzePrompt = `
Summarize briefly what this trending topic is about in plain terms.
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

      // === 🧩 2️⃣ Finn en ekte fascinerende historie relatert til temaet
      const linkPrompt = `
Find one real, fascinating historical or human story connected to this theme:
"${topicSummary}"

The story must be factual or widely documented (not fictional).
Return one concise description (1–2 sentences).
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

      // === 🧩 3️⃣ Lag en kompakt loggoppsummering
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

      // === Kompakt logg
      console.log(`\n🧠 [${key.toUpperCase()}] "${topic}"`);
      console.log(`   ↳ Theme: ${shortTheme || "N/A"}`);
      console.log(`   ↳ Story link: ${shortStory || "N/A"}`);

      // === 🧾 Bygg hovedprompt for artikkel ===
      let prompt;

      if (key === "products") {
        // 1️⃣ Tolk produktnavnet til generell kategori
        const categoryPrompt = `
Interpret the following product name as a *general object category* or concept.
For example:
- "BIC pen" → "pen"
- "Nintendo Switch" → "gaming console"
- "Apple Watch" → "watch"
- "LEGO set" → "toy"
- "Dyson vacuum" → "vacuum cleaner"

Product name: "${topic}"

Return only the general category or concept in 1–3 words.
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

          // 🔍 Smart fallback-logikk
          if (
            productCategory === "object" ||
            productCategory.includes("campaign") ||
            productCategory.includes("ad") ||
            productCategory.includes("marketing") ||
            productCategory.length < 2
          ) {
            // Prøv å finne et relevant hint fra topicSummary
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

        // 2️⃣ Bygg produktprompt (kategori) + affiliateAppendix
        prompt = buildProductArticlePrompt(productCategory);
        prompt += affiliateAppendix;
      } else if (key === "culture") {
        prompt = buildCulturePrompt(topic);
        prompt += naturalEnding;
      } else {
        prompt = buildArticlePrompt(topic, key, tone);
        prompt += naturalEnding;
      }

      // 🎯 Felles føring: hva artikkelen skal fokusere på
      prompt += `
Focus the story or reflection around this related true event or curiosity:
"${linkedStory}"
`;

      // ❌ (Viktig) Ikke legg til affiliate/naturalEnding på nytt her.

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

      // === Produktlogikk (kun for products)
      let source_url = null;
      let productName = null;
      if (key === "products") {
        const nameMatch = text.match(/\[Product Name\]:\s*(.+)/i);
        if (nameMatch) {
          productName = nameMatch[1].trim();
          source_url = makeAffiliateSearchLink(productName);
          console.log(`🛍️ Found product name: "${productName}"`);
        }

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

      // === 📦 Lagre til Supabase ===
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
      results.push({
        category: key,
        topic,
        summary: topicSummary,
        curiosity: linkedStory,
        success: true,
      });
    } catch (err) {
      console.error(`❌ Error for ${key}:`, err.message);
      results.push({ category: key, topic, success: false });
    }
  }

  await updateAndPingSearchEngines();
  return NextResponse.json({ success: true, results });
}
