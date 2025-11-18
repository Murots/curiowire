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

      // ============================================================================
      // FALLBACK: GPT-TOPIC GENERATION WHEN TRENDS FAIL
      // ============================================================================

      let topicPool = [...allTopics];

      // If too few topics → generate more using GPT
      if (topicPool.length < 3) {
        console.log(
          `⚠️ Few/no valid topics for ${key} → triggering GPT fallback`
        );

        try {
          const gptFallbackPrompt = `
You are generating newsworthy, factual and category-relevant article topics.
Category: ${key.toUpperCase()}.

Rules:
- Provide 10 topics.
- Each topic must be factual, non-personal and aligned with real-world knowledge.
- No personal anecdotes, no "my", "I", "we", "you".
- No trends involving celebrities' private lives.
- No tragedies, crimes, politics scandals or ongoing legal matters.
- Each topic MUST support a curiosity connection or historical/scientific parallel.
- Style: short, headline-like, but descriptive.
- Output ONLY a bullet list of the 10 topics.
`;

          const gptTopics = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: gptFallbackPrompt }],
          });

          const extracted = gptTopics.choices[0].message.content
            .split("\n")
            .map((t) => t.replace(/^\W+/, "").trim())
            .filter((t) => t.length > 10);

          console.log(`🤖 GPT fallback provided ${extracted.length} topics.`);
          topicPool.push(...extracted);
        } catch (err) {
          console.warn("⚠️ GPT fallback failed:", err.message);
        }
      }

      // Final safety: if still empty, skip category
      if (!topicPool.length) {
        console.log(`❌ Still no usable topics for ${key}, skipping.`);
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

      for (const candidateTitle of topicPool) {
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
