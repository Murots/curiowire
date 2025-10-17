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

    if (!topic && primarySource === "reddit" && Array.isArray(primaryList)) {
      for (const alt of primaryList) {
        if (alt && alt !== topic) {
          topic = alt;
          break;
        }
      }
    }

    if (!topic) {
      console.warn(`⚠️ ${key} empty — switching to ${fallbackSource}`);
      topic =
        fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
        `notable ${key} curiosity`;
    }

    try {
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

      const recentTitles = existing?.slice(-5).map((a) => a.title) || [];
      let isSimilar = false;

      for (const prev of recentTitles) {
        const simPrompt = `
Determine if these two headlines are about the *same underlying topic*.
Answer with "YES" if they describe the same story or idea.
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
          ?.toUpperCase();
        if (ans?.includes("YES")) {
          isSimilar = true;
          console.log(`🚫 Similar detected for ${key}: ${topic}`);
          break;
        }
      }

      if (isSimilar) {
        const backup =
          fallbackList.find((t) => t !== topic) ||
          primaryList.find((t) => t !== topic);
        if (backup) {
          console.log(`🔁 Retrying ${key} with backup: ${backup}`);
          topic = backup;
        } else continue;
      }

      /* === 🧾 PROMPT (nå bygget via utils/prompts.js) === */
      let prompt = buildArticlePrompt(topic, key, tone);
      if (key === "products") prompt += affiliateAppendix;
      else prompt += naturalEnding;

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

      // === 1️⃣ Forsøk å finne produktnavn fra artikkel ===
      let source_url = null;
      let productName = null;
      const nameMatch = text.match(/\[Product Name\]:\s*(.+)/i);
      if (nameMatch && key === "products") {
        productName = nameMatch[1].trim();
        source_url = makeAffiliateSearchLink(productName);
        console.log(`🛍️ Found product name: "${productName}"`);
      }

      // === 2️⃣ Hvis ikke funnet, be GPT foreslå et produktnavn ===
      if (!productName && key === "products") {
        console.log(
          `🧠 No product name found — asking GPT for match on "${topic}"`
        );
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

      // === 3️⃣ Fjern produktlinjen fra artikkelteksten ===
      const cleanedArticle = article
        .replace(/\[Product Name\]:\s*.+/i, "")
        .trim();

      /* === 🎨 Bilde === */
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
      results.push({ category: key, topic, success: true });
    } catch (err) {
      console.error(`❌ Error for ${key}:`, err.message);
      results.push({ category: key, topic, success: false });
    }
  }

  await updateAndPingSearchEngines();
  return NextResponse.json({ success: true, results });
}
