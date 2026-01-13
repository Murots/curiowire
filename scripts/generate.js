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
import { cleanWikimediaAttribution } from "../app/api/utils/cleanAttribution.js";

import {
  makeSummarySignature,
  normalizeSummary,
  summariesAreSimilar,
} from "../lib/signatures/summarySignature.js";

import { extractSummaryObject } from "../lib/signatures/summaryExtractor.js";

import { markAnchorUsed } from "../lib/concepts/selectAnchors.js";

// ============================================================================
// SIGNATURES
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
// GPT CONCEPT GENERATOR
// ============================================================================
import { generateConceptSeeds } from "../lib/concepts/seedConceptGenerator.js";

// ============================================================================
// ENRICHMENT (Wikipedia/Wikidata)
// ============================================================================
import { isGenericArticle } from "../lib/enrichment/genericCheck.js";
import { researchEnrich } from "../lib/enrichment/researchEnrich.js";

// ============================================================================
// FACT CHECKER
// ============================================================================
import {
  factCheckArticle,
  extractCorrectedVersion,
  getFactCheckStatus,
} from "../lib/factCheck.js";

// ============================================================================
// INIT OPENAI
// ============================================================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// ============================================================================
// INIT SUPABASE (scripts MUST use Service Role)
// ============================================================================

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Hard fail: scripts/generate.js skal aldri kjøre med anon/public key
if (!supabaseUrl) {
  throw new Error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) for scripts/generate.js"
  );
}

if (!supabaseKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY for scripts/generate.js (required)"
  );
}

console.log("🧩 Supabase URL:", "✔️ Loaded");
console.log("🔑 Supabase Key:", `✔️ Loaded (${supabaseKey.slice(0, 6)}...)`);

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
// EMBEDDING HELPER
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
// STANDARIZE FRAME HELPER
// ============================================================================
function buildBaseFrame(linkedStory) {
  return `
Field: ${linkedStory.field}
Anchor: ${linkedStory.anchor}
Note: ${linkedStory.note}
Theme phrase: "${linkedStory.phrase}"
`.trim();
}

function buildEffectiveFrame(linkedStory, factPack = "") {
  const base = buildBaseFrame(linkedStory);
  return factPack?.trim() ? `${base}\n\n${factPack.trim()}`.trim() : base;
}

// ============================================================================
// WOW-SCORING FOR CONCEPTS
// ============================================================================
async function scoreConceptWow(concept, category) {
  const prompt = `
You are scoring the VIRALITY and WOW-appeal of a short curiosity concept 
for a platform called CurioWire.

Category: ${category.toUpperCase()}

Concept:
"${concept}"

Score from 0 to 100 based ONLY on:

🔥 VIRALITY FACTORS (main weight)
• How strongly it triggers instant curiosity in the first 2 seconds  
• Whether the idea creates a vivid mental image  
• Whether a general audience would feel “Wait… WHAT?!”  
• How naturally it could be turned into a TikTok/YouTube Short hook  
• How emotionally provocative, surprising, or visually dramatic it is  

🚫 NEGATIVE WEIGHT (subtract points)
• If it feels academic, technical, or niche  
• If it depends on specialized knowledge  
• If it sounds like a textbook or a scientific paper  
• If it is too abstract or vague to visualize  
• If it resembles common overused trivia  

🎯 POSITIVE WEIGHT (bonus)
• Universally understandable  
• Strong contrast or reversal  
• Feels fresh, unexpected, shareable  
• Easy to retell verbally (“Did you know that…?”)  
• Feels like something that would spread on social media  

Return ONLY a single integer from 0 to 100.
No words, no explanation, no extra characters.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const parsed = parseInt(raw.replace(/[^0-9]/g, ""), 10);

    if (Number.isNaN(parsed)) {
      console.warn("⚠️ WOW-score parse failed, got:", raw);
      return 50;
    }

    return Math.max(0, Math.min(100, parsed));
  } catch (err) {
    console.warn("⚠️ WOW-scoring failed:", err.message);
    return 50;
  }
}

// ============================================================================
// INTERNAL: Generate one article draft (NO refine, NO fact-check yet)
// ============================================================================
async function generateArticleDraft({
  key,
  tone,
  image,
  topic,
  topicSummary,
  linkedStory,
  curioSignature,
  factualFrameOverride,
}) {
  // ==================================================================
  // GENERATE ARTICLE (same behaviour as before, just wrapped)
  // ==================================================================
  const baseFrame = buildBaseFrame(linkedStory);
  const factualFrame = (factualFrameOverride || baseFrame).trim();

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
        tone,
        factualFrame
      )) + affiliateAppendix;
  } else if (key === "culture") {
    prompt = buildCulturePrompt(topic, key, tone, factualFrame) + naturalEnding;
  } else {
    prompt = buildArticlePrompt(topic, key, tone, factualFrame) + naturalEnding;
  }

  //   // Bind artikkelen sterkt til valgt kuriositet
  //   prompt += `
  // Focus the story around this factual research frame:
  // Field: ${linkedStory.field}
  // Evidence: ${linkedStory.anchor}
  // Note: ${linkedStory.note}
  // Theme phrase: "${linkedStory.phrase}"
  // `;

  // INTERNAL STRUCTURAL ANCHOR — DO NOT DISPLAY IN ARTICLE
  // (Do NOT appear in final output. For internal steering only.)
  prompt += `
You must implicitly follow this conceptual signature.
Do not show or quote this text in the article.

signature_core: "${curioSignature.signature}"
signature_keywords: "${(curioSignature.keywords || []).join(", ")}"
`;

  console.log("✍️ Generating article draft…");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || "";
  if (!raw) {
    console.error("❌ Empty article response from GPT.");
    return null;
  }

  const titleMatch = raw.match(/Headline:\s*(.+)/i);
  const bodyMatch = raw.match(/Article:\s*([\s\S]+)/i);

  const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
  const title = trimHeadline(rawTitle);

  const articleRaw = bodyMatch ? bodyMatch[1].trim() : raw;

  return { raw, title, articleRaw };
}

// ============================================================================
// MAIN GENERATOR — 100% CONCEPT-DRIVEN + WOW-SELECTION + FACT-CHECK
// ============================================================================
export async function main() {
  const start = Date.now();
  console.log("🕒 Starting CurioWire generation (concept mode + WOW)…");
  const results = [];

  try {
    // ======================================================================
    // PROCESS EACH CATEGORY
    // ======================================================================
    for (const [key, { tone, image }] of Object.entries(categories)) {
      console.log(`\n📰 Category: ${key}`);

      // ==============================================================
      // STEP 1: Fetch concept seeds via GPT
      // ==============================================================
      console.log("🎯 Fetching WOW concepts…");
      const { concepts, anchor, focusShift, lens } = await generateConceptSeeds(
        key
      );

      if (!anchor || !focusShift || !lens) {
        console.warn(`⚠️ Missing structural components for ${key}, skipping.`);
        continue;
      }

      if (!concepts || !concepts.length) {
        console.log(`❌ No concepts generated for ${key}, skipping.`);
        continue;
      }

      console.log(`💡 Concepts received for ${key}: ${concepts.length}`);

      // ==============================================================
      // STEP 2: WOW-score all concepts and rank them (SAFE VERSION)
      // ==============================================================
      const scoredConcepts = [];

      for (const item of concepts) {
        // --- Hard guards først ---
        if (!item?.concept || typeof item.concept !== "string") {
          console.warn("⚠️ Skipping concept: missing or invalid concept text");
          continue;
        }

        const conceptText = item.concept.trim();
        if (!conceptText) continue;

        // 1) Score først (WOW)
        let score = 50;
        try {
          score = await scoreConceptWow(conceptText, key);
        } catch (err) {
          console.warn("⚠️ WOW-scoring failed, using fallback (50)");
          score = 50;
        }

        // 2) Så plausibility penalty (normaliser verdict)
        const verdict = String(item.plausibility_verdict || "UNCERTAIN")
          .trim()
          .toUpperCase();

        // FAIL skal egentlig ikke forekomme (seedConceptGenerator filtrerer FAIL),
        // men vi gjør det bombesikkert:
        if (verdict === "FAIL") continue;

        const penalty = verdict === "UNCERTAIN" ? 5 : 0;

        // 3) Clamp etter penalty
        score = Math.max(0, Math.min(100, score - penalty));

        scoredConcepts.push({
          concept: conceptText,
          score,
          verifier: item.verifier ?? null,
          plausibility_verdict: verdict,
        });
      }

      // Final sanity check
      if (!scoredConcepts.length) {
        console.warn(`⚠️ No valid scored concepts for category "${key}"`);
        continue;
      }

      // Rank by WOW score (descending)
      scoredConcepts.sort((a, b) => b.score - a.score);

      // --------------------------------------------------------------
      // STEP 2.5 — Pick single best concept (global winner)
      // --------------------------------------------------------------
      const bestConcepts = scoredConcepts.slice(0, scoredConcepts.length);

      console.log("🏆 WOW-ranking for concepts:");
      scoredConcepts.forEach(({ concept, score }, idx) => {
        const preview =
          concept.length > 120 ? concept.slice(0, 117) + "..." : concept;
        console.log(`   ${idx + 1}. [${score}] ${preview}`);
      });

      // Vi behandler hvert konsept som "topic-like"
      let topic = null;
      let topicSummary = null; // nå bare direkte fra topic
      let linkedStory = null;
      let curioSignature = null;
      let topicSig = null;
      let selectedWowScore = null;
      let selectedVerifier = null;

      // ==============================================================
      // STEP 3: Finn beste WOW-konsept som også passer dupe-sjekkene
      // ==============================================================
      for (const {
        concept: candidateConcept,
        score: wowScore,
        verifier,
      } of bestConcepts) {
        console.log(
          `\n🔎 Evaluating concept (WOW ${wowScore}): "${candidateConcept}"`
        );

        // 3A: Bygg topic-signatur
        topicSig = await buildTopicSignature({
          category: key,
          topic: candidateConcept,
        });

        console.log(
          `   🔧 TopicSignature → normalized="${topicSig.normalized}", short="${topicSig.shortSignature}"`
        );

        const topicDupe = await checkTopicDuplicate(topicSig);
        console.log(
          "   🔍 CHECK TOPIC DUPLICATE:",
          `query: ${topicSig.normalized} | short: ${topicSig.shortSignature} | category: ${key}`
        );

        if (topicDupe.isDuplicate) {
          console.log(
            `   🚫 Topic duplicate (WOW ${wowScore}) → closest existing: "${topicDupe.closestTitle}"`
          );
          continue;
        }

        // 3B: Finn kuriositet direkte fra topic (uten analyzeTopic)
        let candidateCurio;

        try {
          // Vi bruker selve topic-teksten som "modern topic" inn i linkHistoricalStory
          candidateCurio = await linkHistoricalStory(candidateConcept, key);
          if (
            !candidateCurio ||
            !candidateCurio.field ||
            !candidateCurio.anchor ||
            !candidateCurio.phrase
          ) {
            console.log(
              `   ⚠️ Invalid curiosity structure for concept (WOW ${wowScore}), skipping.`
            );
            continue;
          }
        } catch (err) {
          console.log(
            `   ⚠️ Curiosity linking failed for concept (WOW ${wowScore}):`,
            err.message
          );
          continue;
        }

        // 3C: Bygg curiosity-signatur
        const candidateSig = await buildCurioSignature({
          category: key,
          topic: candidateConcept,
          curiosity: `${candidateCurio.field} — ${candidateCurio.anchor} — ${candidateCurio.phrase}`,
        });

        const dupeInfo = await checkCurioDuplicate(candidateSig);
        console.log(
          "   🔍 CHECK CURIO DUPLICATE:",
          `signature: ${candidateSig.signature} | category: ${key}`
        );

        if (dupeInfo.isDuplicate) {
          console.log(
            `   🚫 Curiosity duplicate (WOW ${wowScore}) → closest existing: "${dupeInfo.closestTitle}"`
          );
          continue;
        }

        // 3D: Vi fant et unikt, høy-WOW match!
        topic = candidateConcept;
        topicSummary = candidateConcept; // vi kan senere bytte til egen summarizer hvis ønskelig
        linkedStory = candidateCurio;
        curioSignature = candidateSig;
        selectedWowScore = wowScore;
        selectedVerifier = verifier ?? null;

        console.log("🧠 PICKED FRAME", {
          anchor_id: anchor.id,
          focus_shift: focusShift,
          lens,
          wow: wowScore,
          verifier: verifier ?? null,
        });

        console.log(`   ✅ Selected concept [WOW ${wowScore}] → "${topic}"`);
        console.log(
          `      Curiosity link → field="${linkedStory.field}", anchor="${linkedStory.anchor}"`
        );

        break;
      }

      if (!topic) {
        console.log(
          `⚠️ No unique, non-duplicate concept found for ${key}, skipping…`
        );
        results.push({
          category: key,
          topic: null,
          wow_score: null,
          success: false,
        });
        continue;
      }

      // Utvid tematisk kortoppsummering (valgfri, failure er ikke kritisk)
      try {
        await summarizeTheme(topicSummary, linkedStory);
      } catch (err) {
        console.log(
          "ℹ️ summarizeTheme failed or was skipped:",
          err?.message || "unknown error"
        );
      }

      // ==================================================================
      // STEP 4: ARTICLE GENERATION + FACT-CHECK LOOP
      // ==================================================================
      const maxAttempts = 2;
      let finalDraft = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(
          `\n🧪 Article generation attempt ${attempt} for category "${key}"…`
        );

        const draft = await generateArticleDraft({
          key,
          tone,
          image,
          topic,
          topicSummary,
          linkedStory,
          curioSignature,
        });

        if (!draft) {
          console.warn("⚠️ Draft generation failed, aborting attempts.");
          break;
        }

        let { raw, title, articleRaw } = draft;

        // ==================================================================
        // ENRICHMENT (only if generic)
        // ==================================================================
        let factPack = "";
        let effectiveFrame = buildBaseFrame(linkedStory); // ✅ alltid samme format

        if (isGenericArticle(articleRaw)) {
          console.log(
            "🧪 Generic article detected → running Wikipedia/Wikidata enrichment…"
          );

          try {
            // topic + anchor-hint
            factPack = await researchEnrich(topic, linkedStory?.anchor);

            if (factPack && factPack.trim().length > 50) {
              effectiveFrame = buildEffectiveFrame(linkedStory, factPack);

              console.log(
                "📦 FactPack added. Regenerating article with enriched factual frame…"
              );

              const enrichedDraft = await generateArticleDraft({
                key,
                tone,
                image,
                topic,
                topicSummary,
                linkedStory,
                curioSignature,
                factualFrameOverride: effectiveFrame,
              });

              if (enrichedDraft?.articleRaw) {
                console.log("✅ Enriched regeneration complete.");

                raw = enrichedDraft.raw;
                title = enrichedDraft.title;
                articleRaw = enrichedDraft.articleRaw;

                // valgfritt: hold draft i sync
                draft.raw = raw;
                draft.title = title;
                draft.articleRaw = articleRaw;
              } else {
                console.warn(
                  "⚠️ Enriched regeneration failed → continuing with original draft."
                );
              }
            } else {
              console.warn(
                "⚠️ FactPack empty/too small → continuing with original draft."
              );
            }
          } catch (err) {
            console.warn("⚠️ Enrichment failed:", err?.message || err);
          }
        }

        console.log("🔎 Running fact-check on article draft…");
        const factResult = await factCheckArticle(
          articleRaw,
          title,
          effectiveFrame
        );

        console.log(
          "📎 FULL FACT RESULT:",
          JSON.stringify(factResult, null, 2)
        );

        const status = getFactCheckStatus(factResult);

        console.log(`📊 Fact-check status: ${status}`);

        // ==============================================================
        // ACCEPT PATH: OK + UNCERTAIN
        // ==============================================================
        if (status === "OK" || status === "UNCERTAIN") {
          console.log(
            status === "OK"
              ? "✅ Fact-check OK — using original article."
              : "⚪ Fact-check UNCERTAIN — accepted due to cautious/ambiguous topic."
          );

          finalDraft = {
            ...draft,
            articleForRefine: articleRaw,
            effectiveFrame,
          };

          break;
        }

        // ==============================================================
        // MINOR FIX PATH: ISSUES (use corrected article if provided)
        // ==============================================================
        if (status === "ISSUES") {
          const corrected = extractCorrectedVersion(factResult);
          if (corrected) {
            console.log(
              "✅ Fact-check found minor issues — using corrected article version."
            );
            finalDraft = {
              ...draft,
              articleForRefine: corrected,
              effectiveFrame,
            };
            break;
          } else {
            console.warn(
              "⚠️ ISSUES FOUND but no corrected article present — treating as MAJOR."
            );
            // fall through to regeneration if attempt < maxAttempts
          }
        }

        // ==============================================================
        // REGEN PATH: MAJOR / UNKNOWN
        // ==============================================================
        if (status === "MAJOR" || status === "UNKNOWN") {
          if (attempt < maxAttempts) {
            console.warn(
              `⚠️ Fact-check result "${status}" — regenerating article (attempt ${
                attempt + 1
              } of ${maxAttempts})…`
            );
          } else {
            console.error(
              `❌ Fact-check result "${status}" after ${maxAttempts} attempts — skipping category "${key}".`
            );
          }
        }
      }

      if (!finalDraft) {
        results.push({
          category: key,
          topic,
          wow_score: selectedWowScore,
          success: false,
          reason: "fact-check-failed",
        });
        continue;
      }

      const { raw, title, articleForRefine, effectiveFrame } = finalDraft;

      // ==================================================================
      // STEP 5: REFINE ARTICLE (language, summary, sources)
      // ==================================================================
      const refined = await refineArticle(
        articleForRefine,
        title,
        effectiveFrame
      );

      // ==================================================================
      // SEO
      // ==================================================================
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

      // ==================================================================
      // PRODUCTS
      // ==================================================================
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

      // Clean article text
      const cleanedArticle = refined
        .replace(/```html|```/gi, "")
        .replace(/\[Product Name\]:\s*.+/i, "")
        .replace(/SEO:[\s\S]*$/i, "")
        .trim();

      const summaryMatch = cleanedArticle.match(
        /<span\s+data-summary-what[^>]*>(.*?)<\/span>/s
      );
      const summaryWhat = summaryMatch ? cleanText(summaryMatch[1].trim()) : "";
      if (summaryWhat) {
        console.log(`   🧾 SummaryWhat extracted: "${summaryWhat}"`);
      }

      // ==================================================================
      // === SUMMARY SIGNATURE ===
      // ==================================================================
      const summaryObject = extractSummaryObject(cleanedArticle);

      let summary_normalized = null;
      let summary_signature = null;

      if (!summaryObject) {
        console.warn(
          "⚠️ No valid Quick Summary extracted — article will be blocked."
        );
        console.log("⛔ Skipping article due to missing Quick Summary.");
        continue;
      }

      summary_normalized = normalizeSummary(summaryObject);
      summary_signature = makeSummarySignature(summaryObject);

      // ==================================================================
      // EMBEDDING + UNIFIED SEMANTIC SIGNATURE (CURIOSITY-ONLY)
      // ==================================================================
      const embedding = await generateEmbedding(`${title}\n${cleanedArticle}`);

      // Keywords basert KUN på curiosity-signaturen
      const curioKeywords = (curioSignature?.keywords || []).map((k) =>
        k.toLowerCase()
      );
      const uniqueKeywords = [...new Set(curioKeywords)];

      // Kjerne basert kun på curiosity-signaturen
      let semanticCore =
        curioSignature?.signature ||
        curioSignature?.normalized ||
        `${linkedStory.field} — ${linkedStory.anchor} — ${linkedStory.phrase}` ||
        title;

      const semanticSignature = [
        semanticCore,
        uniqueKeywords.length ? `keywords: ${uniqueKeywords.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" — ");

      // ==================================================================
      // IMAGE
      // ==================================================================
      const imagePref = image === "photo" ? "photo" : "dalle";

      const {
        imageUrl,
        source,
        score: bestScore,
        attribution, // 👈 ADD THIS
      } = await selectBestImage(
        title,
        cleanedArticle,
        key,
        imagePref,
        summaryWhat
      );

      const imageCredit =
        source === "Wikimedia"
          ? cleanWikimediaAttribution(attribution)
          : source === "Pexels"
          ? "Image courtesy of Pexels"
          : source === "Unsplash"
          ? "Image courtesy of Unsplash"
          : source === "DALL·E"
          ? "Illustration by DALL·E 3"
          : "Image source unknown";

      console.log(
        `🖼️ Image selected for ${key}: source=${source}, score=${
          bestScore ?? "n/a"
        }`
      );

      // ==================================================================
      // SUMMARY DUPLICATE CHECK
      // ==================================================================

      if (summary_signature) {
        const { data: existingSummaries } = await supabase
          .from("articles")
          .select("id, title, summary_signature, summary_normalized");

        let isSummaryDuplicate = false;

        for (const row of existingSummaries || []) {
          const sigSame = row.summary_signature === summary_signature;
          const fuzzySame =
            row.summary_normalized &&
            summariesAreSimilar(row.summary_normalized, summary_normalized);

          if (sigSame || fuzzySame) {
            console.log(
              `⚠️ BLOCKED — Summary duplicate detected vs article ${row.id}: "${row.title}"`
            );
            isSummaryDuplicate = true;
            break;
          }
        }

        if (isSummaryDuplicate) {
          console.log("⛔ Skipping article due to SUMMARY DUPLICATE.");
          continue; // hopper til neste kategori
        }
      }

      // ==================================================================
      // STRUCTURAL SAFETY CHECK (belt + suspenders)
      // ==================================================================
      if (!anchor?.id || !focusShift || !lens || selectedWowScore == null) {
        console.warn("⚠️ Structural mismatch detected, aborting save", {
          anchor_id: anchor?.id,
          focus_shift: focusShift,
          lens,
        });
        continue;
      }

      // ==================================================================
      // SAVE ARTICLE
      // ==================================================================
      const insertResult = await safeQuery(
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
            anchor_id: anchor.id,
            focus_shift: focusShift, // NY kolonne hvis du legger til
            lens_text: lens, // NY kolonne hvis du legger til
            concept_verifier: selectedVerifier ?? null,
            wow_score: selectedWowScore ?? 0,
            summary_signature,
            summary_normalized,
          },
        ])
      );

      if (insertResult?.error) {
        throw insertResult.error;
      }

      // ==================================================================
      // MARK STRUCTURE AS USED — ONLY AFTER SUCCESSFUL SAVE
      // ==================================================================
      if (anchor?.id) {
        await markAnchorUsed(anchor.id);
      }

      // ✅ LOG SUCCESS FOR THIS CATEGORY
      results.push({
        category: key,
        topic,
        wow_score: selectedWowScore,
        success: true,
      });
    }

    // ==================================================================
    // SEO PING + LOGGING
    // ==================================================================
    await updateAndPingSearchEngines();
    console.log("🎉 Generation completed successfully.");

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
