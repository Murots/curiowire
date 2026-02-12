// ============================================================================
// scripts/generate.js — CurioWire vNext (ALWAYS FACTCHECK + PREMISE SALVAGE)
// One run = one article.
// Flow:
//   attempt 1: generate -> summary -> refine -> factcheck
//   if FAIL_PREMISE -> salvage decider -> attempt 2 (full rerun)
//   if attempt 2 FAIL_PREMISE -> stop + flag
//   if pass -> generate scene prompt + select image -> save
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import { buildPremiseGatePrompt } from "../app/api/utils/premiseGatePrompt.js";
import { buildArticlePrompt } from "../app/api/utils/prompts.js";
import { buildSummaryPrompt } from "../app/api/utils/summaryPrompt.js";
import { buildRefinePackagePrompt } from "../app/api/utils/refinePackage.js";
import { buildFactCheckPackagePrompt } from "../app/api/utils/factCheckPackage.js";
import { buildPremiseSalvagePrompt } from "../app/api/utils/premiseSalvage.js";
import { generateScenePrompt } from "../app/api/utils/scenePrompt.js";

import { selectBestImage } from "../lib/imageSelector.js";
import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";

// ----------------------------------------------------------------------------
// ENV
// ----------------------------------------------------------------------------
const {
  OPENAI_API_KEY,
  OPENAI_ORG_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,

  // OpenAI models
  ARTICLE_MODEL, // default: "gpt-4o-mini"
} = process.env;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: OPENAI_ORG_ID,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const MAX_PREMISE_ATTEMPTS = 2; // 1 original + 1 salvage retry (hard stop after)

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function nowIso() {
  return new Date().toISOString();
}

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function stripH1(html) {
  const m = String(html || "").match(/<h1>\s*([\s\S]*?)\s*<\/h1>/i);
  return (m?.[1] || "").trim();
}

function normalizeCategoryKey(key) {
  const k = safeStr(key, "science").toLowerCase();
  const allowed = new Set([
    "space",
    "science",
    "history",
    "world",
    "nature",
    "technology",
    "culture",
    "sports",
    "products",
    "health",
    "mystery",
    "crime",
  ]);
  return allowed.has(k) ? k : "science";
}

function changed(a, b) {
  return safeStr(a) !== safeStr(b);
}

function preview(s, n = 120) {
  const t = safeStr(s, "");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function splitPremiseGateOutput(text) {
  const s = String(text || "");

  const verdict = (s.match(/Verdict:\s*([^\n\r]+)/i)?.[1] || "")
    .toUpperCase()
    .replace(/[^A-Z| ]/g, "")
    .split(/\s|\|/)[0]
    .trim();

  const correctedSeed = (
    s.match(/CorrectedSeed:\s*([\s\S]*?)\nReason:\s*/i)?.[1] || ""
  ).trim();

  const reason = (s.match(/Reason:\s*([\s\S]*)$/i)?.[1] || "").trim();

  return { verdict, correctedSeed, reason };
}

// premiseGateCheck (swap chat.completions -> responses + web_search)
async function premiseGateCheck({ curiosity, categoryKey }) {
  const prompt = buildPremiseGatePrompt({
    curiosity,
    category: categoryKey,
  });

  const resp = await openai.responses.create({
    model:
      process.env.PREMISE_GATE_MODEL || process.env.FACTCHECK_MODEL || "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  if (!out)
    return { verdict: "FAIL", correctedSeed: "", reason: "Empty output" };

  return splitPremiseGateOutput(out);
}
// ----------------------------------------------------------------------------
// Curiosity picking rules (STRICT)
// ----------------------------------------------------------------------------
async function fetchOneCuriositySuggestion() {
  const { data, error } = await supabase.rpc("pick_curiosity_suggestion", {
    p_category: null,
  });

  if (error) throw error;
  if (!data) return null;

  return { table: "curiosity_suggestions", row: data };
}

async function markSuggestionFailed(sourceTable, id, reason) {
  try {
    await supabase
      .from(sourceTable)
      .update({
        review_note: `GEN_FAIL: ${String(reason || "").slice(0, 400)}`,
        updated_at: nowIso(),
      })
      .eq("id", id);
  } catch (err) {
    console.warn("⚠️ markSuggestionFailed failed:", err.message);
  }
}

async function flagSuggestionAndMaybeFailCard({
  suggestionId,
  reason = "",
  makeFailedCard = false,
  failedCardPayload = null,
}) {
  const note = String(reason || "").slice(0, 400);

  await supabase
    .from("curiosity_suggestions")
    .update({
      status: "flagged",
      review_note: `FACTCHECK_FAIL: ${note}`,
      updated_at: nowIso(),
    })
    .eq("id", suggestionId);

  if (makeFailedCard && failedCardPayload) {
    await supabase.from(process.env.CARDS_TABLE || "curiosity_cards").insert({
      ...failedCardPayload,
      status: "failed",
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
}

// ----------------------------------------------------------------------------
// Generate article (raw)
// ----------------------------------------------------------------------------
async function generateArticleHtml({ topic, categoryKey, tone, factualFrame }) {
  const prompt = buildArticlePrompt(topic, categoryKey, tone, factualFrame);

  const resp = await openai.chat.completions.create({
    model: ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text || text.length < 400)
    throw new Error("Article generation returned too little text.");
  return text;
}

// ----------------------------------------------------------------------------
// Summary + FunFact (pre-refine, pre-factcheck)
// ----------------------------------------------------------------------------
function splitSummaryOutput(text) {
  const out = { summary_normalized: null, fun_fact: null };

  const s = String(text || "");

  const sum = s.match(/Summary:\s*([\s\S]*?)\s*FunFact:\s*/i);
  if (sum) out.summary_normalized = sum[1].trim();

  const ff = s.match(/FunFact:\s*([\s\S]*)$/i);
  if (ff) out.fun_fact = ff[1].trim();

  if (out.summary_normalized && out.summary_normalized.length < 10)
    out.summary_normalized = null;

  if (out.fun_fact) {
    let cleaned = out.fun_fact.trim();
    cleaned = cleaned.replace(/^<p>\s*<\/p>\s*$/i, "").trim();
    cleaned = cleaned.replace(/^<p>\s*([\s\S]*?)\s*<\/p>$/i, "$1").trim();
    cleaned = cleaned.replace(/^\s*(none|null|n\/a)\s*$/i, "").trim();
    out.fun_fact = cleaned ? `<p>${cleaned}</p>` : null;
  }

  return out;
}

async function generateSummaryAndFunFact({ cardText }) {
  const prompt = buildSummaryPrompt(cardText);

  const resp = await openai.chat.completions.create({
    model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text) return { summary_normalized: null, fun_fact: null };

  return splitSummaryOutput(text);
}

// ----------------------------------------------------------------------------
// REFINE (light language polish)
// ----------------------------------------------------------------------------
function splitRefinePackageOutput(text) {
  const s = String(text || "");

  const get = (label, nextLabel) => {
    const re = nextLabel
      ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
      : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
    return (s.match(re)?.[1] || "").trim();
  };

  return {
    title: get("Title", "Card"),
    card_text: get("Card", "VideoScript"),
    video_script: get("VideoScript", "Summary"),
    summary_normalized: get("Summary", "FunFact"),
    fun_fact: get("FunFact", null),
  };
}

async function refinePackage({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const prompt = buildRefinePackagePrompt({
    title,
    card_text,
    video_script,
    summary_normalized,
    fun_fact,
  });

  const resp = await openai.chat.completions.create({
    model: process.env.REFINE_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const out = resp.choices[0]?.message?.content?.trim();
  if (!out) return null;

  const parsed = splitRefinePackageOutput(out);

  return {
    title: parsed.title || title,
    card_text: parsed.card_text || card_text,
    video_script: parsed.video_script || video_script,
    summary_normalized: parsed.summary_normalized || summary_normalized,
    fun_fact: parsed.fun_fact || fun_fact,
  };
}

// ----------------------------------------------------------------------------
// FACTCHECK (demonstrably-false + risky precision)
// ----------------------------------------------------------------------------
function splitFactCheckPackageOutput(text) {
  const s = String(text || "");

  const get = (label, nextLabel) => {
    const re = nextLabel
      ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
      : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
    return (s.match(re)?.[1] || "").trim();
  };

  return {
    verdict: get("Verdict", "Reason"),
    reason: get("Reason", "Title"),
    title: get("Title", "Card"),
    card_text: get("Card", "VideoScript"),
    video_script: get("VideoScript", "Summary"),
    summary_normalized: get("Summary", "FunFact"),
    fun_fact: get("FunFact", null),
  };
}

async function factCheckPackage({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const prompt = buildFactCheckPackagePrompt({
    title,
    card_text,
    video_script,
    summary_normalized,
    fun_fact,
  });

  const resp = await openai.responses.create({
    model: process.env.FACTCHECK_MODEL || "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();

  if (!out) throw new Error("FactCheck returned empty output.");

  const parsed = splitFactCheckPackageOutput(out);

  const verdict = (parsed.verdict || "").trim().toUpperCase();
  const isFailPremise = verdict.includes("FAIL_PREMISE");

  return {
    isFailPremise,
    reason: parsed.reason || "",
    verdict,
    title: parsed.title || title,
    card_text: parsed.card_text || card_text,
    video_script: parsed.video_script || video_script,
    summary_normalized: parsed.summary_normalized || summary_normalized,
    fun_fact: parsed.fun_fact || fun_fact,
  };
}

// ----------------------------------------------------------------------------
// PREMISE SALVAGE (only used after FAIL_PREMISE)
// ----------------------------------------------------------------------------
function splitPremiseSalvageOutput(text) {
  const s = String(text || "");

  const salvage = (s.match(/Salvage:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const replacementSeed = (
    s.match(/ReplacementSeed:\s*([\s\S]*)$/i)?.[1] || ""
  ).trim();

  return {
    salvageYes: salvage.toUpperCase().includes("YES"),
    replacementSeed: replacementSeed || "",
  };
}

async function premiseSalvageDecider({ title, card_text, reason }) {
  const prompt = buildPremiseSalvagePrompt({ title, card_text, reason });

  const resp = await openai.responses.create({
    model: process.env.SALVAGE_MODEL || process.env.FACTCHECK_MODEL || "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  if (!out) return { salvageYes: false, replacementSeed: "" };

  return splitPremiseSalvageOutput(out);
}

// ----------------------------------------------------------------------------
// Parse generated output into { headline, cardText, videoScript, seoBlock, hashtags }
// ----------------------------------------------------------------------------
function splitGenerated(text) {
  const out = {
    headline: "",
    cardText: "",
    videoScript: "",
    seoBlock: "",
    hashtags: "",
  };

  const head = text.match(/Headline:\s*([\s\S]*?)\n(?:Card|Article):\s*/i);
  if (head) out.headline = head[1].trim();

  const card = text.match(/(?:Card|Article):\s*([\s\S]*?)\nVideoScript:\s*/i);
  if (card) out.cardText = card[1].trim();

  const vid = text.match(/VideoScript:\s*([\s\S]*?)\nSEO:\s*/i);
  if (vid) out.videoScript = vid[1].trim();

  const seo = text.match(/SEO:\s*([\s\S]*?)\nHashtags:\s*/i);
  if (seo) out.seoBlock = seo[1].trim();

  const hash = text.match(/Hashtags:\s*([\s\S]*)$/i);
  if (hash) out.hashtags = hash[1].trim();

  if (!out.cardText) out.cardText = text.trim();

  return out;
}

// ----------------------------------------------------------------------------
// Extract <title>, <description>, <keywords> from SEO block (best-effort)
// ----------------------------------------------------------------------------
function cleanTagValue(s) {
  return (
    String(s || "")
      // remove any <title>...</title> wrappers AND stray closing/opening tags
      .replace(/<\/?\s*title\s*>/gi, "")
      .replace(/<\/?\s*description\s*>/gi, "")
      .replace(/<\/?\s*keywords\s*>/gi, "")
      // also strip any remaining angle-bracket tags just in case
      .replace(/<[^>]*>/g, "")
      .trim()
  );
}

function grab(block, tag) {
  const between = block.match(
    new RegExp(`<${tag}>\\s*—?\\s*([\\s\\S]*?)\\s*<\\/${tag}>`, "i"),
  )?.[1];
  if (between) return cleanTagValue(between);

  const line = block.match(
    new RegExp(`<${tag}>\\s*—?\\s*([^\\n\\r]*)`, "i"),
  )?.[1];
  return cleanTagValue(line || "");
}

function parseSeo(seoBlock) {
  const block = String(seoBlock || "");
  return {
    title: grab(block, "title"),
    description: grab(block, "description"),
    keywords: grab(block, "keywords"),
  };
}

// ----------------------------------------------------------------------------
// One attempt: generate -> summary -> refine -> factcheck (returns everything)
// ----------------------------------------------------------------------------
async function generateRefineAndFactcheck({
  topic,
  categoryKey,
  tone,
  factualFrame,
}) {
  const raw = await generateArticleHtml({
    topic,
    categoryKey,
    tone,
    factualFrame,
  });

  const parts = splitGenerated(raw);

  console.log(
    `🧱 Generated raw: headline?=${Boolean(parts.headline)} cardLen=${(parts.cardText || "").length} videoLen=${(parts.videoScript || "").length}`,
  );

  const headlineRaw = parts.headline || "";
  const headline = stripH1(headlineRaw) || safeStr(topic, "Untitled Curiosity");

  const seo = parseSeo(parts.seoBlock);

  const meta = await generateSummaryAndFunFact({ cardText: parts.cardText });

  console.log(
    `🧾 Summary: ${meta.summary_normalized ? "yes" : "no"} | FunFact: ${meta.fun_fact ? "yes" : "no"}`,
  );

  const refined = await refinePackage({
    title: headline,
    card_text: parts.cardText,
    video_script: parts.videoScript || "<p></p>",
    summary_normalized: meta.summary_normalized || "",
    fun_fact: meta.fun_fact || "<p></p>",
  });

  if (refined) {
    const titleChanged = changed(headline, refined.title);
    const cardChanged = changed(parts.cardText, refined.card_text);
    const videoChanged = changed(
      parts.videoScript || "",
      refined.video_script || "",
    );
    const sumChanged = changed(
      meta.summary_normalized || "",
      refined.summary_normalized || "",
    );
    const funChanged = changed(meta.fun_fact || "", refined.fun_fact || "");

    console.log(
      `🧼 Refine: title=${titleChanged ? "changed" : "same"} card=${cardChanged ? "changed" : "same"} video=${videoChanged ? "changed" : "same"} summary=${sumChanged ? "changed" : "same"} funFact=${funChanged ? "changed" : "same"}`,
    );
  } else {
    console.log("🧼 Refine: skipped (no output)");
  }

  const finalTitle = refined?.title || headline;
  const finalCardText = refined?.card_text || parts.cardText;
  const finalVideoScript = refined?.video_script || parts.videoScript || null;
  const finalSummary = refined?.summary_normalized || meta.summary_normalized;
  const finalFunFact = refined?.fun_fact || meta.fun_fact;

  const checked = await factCheckPackage({
    title: finalTitle,
    card_text: finalCardText,
    video_script: finalVideoScript || "<p></p>",
    summary_normalized: finalSummary || "",
    fun_fact: finalFunFact || "<p></p>",
  });

  console.log(
    `🧪 FactCheck: verdict=${checked.verdict} premiseFail=${checked.isFailPremise ? "YES" : "NO"} reason="${preview(checked.reason, 160)}"`,
  );

  return { parts, seo, checked };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function run() {
  console.log("🧠 CurioWire generate.js (vNext) — starting");

  const found = await fetchOneCuriositySuggestion();
  if (!found) {
    console.log("😴 No eligible curiosity suggestion found.");
    return;
  }

  // const FORCE_SUGGESTION_ID = process.env.FORCE_SUGGESTION_ID || null;

  // let found;

  // if (FORCE_SUGGESTION_ID) {
  //   const { data, error } = await supabase
  //     .from("curiosity_suggestions")
  //     .select("*")
  //     .eq("id", FORCE_SUGGESTION_ID)
  //     .single();

  //   if (error || !data) {
  //     throw new Error("Forced suggestion not found");
  //   }

  //   found = { table: "curiosity_suggestions", row: data };
  //   console.log("🧪 FORCE MODE — using suggestion", FORCE_SUGGESTION_ID);
  // } else {
  //   found = await fetchOneCuriositySuggestion();
  //   if (!found) {
  //     console.log("😴 No eligible curiosity suggestion found.");
  //     return;
  //   }
  // }

  const { table: sourceTable, row } = found;

  const suggestionId = row.id;
  const topic = safeStr(row.curiosity, "Untitled Curiosity");
  const categoryKey = normalizeCategoryKey(row.category);
  const wowScoreFromSuggestion = Number.isFinite(Number(row.wow_score))
    ? Number(row.wow_score)
    : 50;

  const tone = "neutral";
  const factualFrame = "";

  console.log(`🧩 Picked curiosity from "${sourceTable}" id=${suggestionId}`);
  console.log(`   curiosity="${topic}" category="${categoryKey}"`);

  // ✅ Premise gate — before spending tokens on full generation
  let initialTopic = topic;

  console.log("🧪 Premise gate — checking suggestion realism...");

  const gate = await premiseGateCheck({
    curiosity: topic,
    categoryKey,
  });

  const okVerdicts = new Set(["PASS", "FIX", "FAIL"]);
  if (!okVerdicts.has(gate.verdict)) {
    console.log(
      "⚠️ Premise gate returned unknown verdict — treating as FAIL:",
      gate.verdict,
    );
    gate.verdict = "FAIL";
  }

  if (gate.verdict === "FIX" && !gate.correctedSeed) {
    console.log("⚠️ Premise gate FIX without CorrectedSeed — treating as FAIL");
    gate.verdict = "FAIL";
  }

  console.log(
    `🧪 Premise gate verdict=${gate.verdict} ${
      gate.correctedSeed ? " (has correction)" : ""
    }`,
  );

  if (gate.verdict === "FAIL") {
    console.log("🧯 Premise gate FAIL — flagging and stopping:", gate.reason);

    await flagSuggestionAndMaybeFailCard({
      suggestionId,
      reason: `PREMISE_GATE_FAIL: ${gate.reason} | seed="${topic}"`,
      makeFailedCard: true,
      failedCardPayload: {
        suggestion_id: suggestionId,
        category: categoryKey,
        title: safeStr(topic),
        card_text: "",
        video_script: null,
        summary_normalized: null,
        fun_fact: null,
        scene_prompt: null,
        seo_title: null,
        seo_description: null,
        seo_keywords: null,
        hashtags: null,
        wow_score: wowScoreFromSuggestion,
      },
    });

    return;
  }

  if (gate.verdict === "FIX" && gate.correctedSeed) {
    console.log("🛠️ Premise gate FIX — corrected seed:", gate.correctedSeed);
    initialTopic = gate.correctedSeed;
  }

  let image_url = null;
  let image_credit = null;
  let image_source = null;
  let image_prompt = null;
  let scene_prompt = null;

  try {
    // Always factcheck: do up to 2 attempts (original + salvage rebuild)
    let currentTopic = initialTopic;
    let finalPack = null;
    let lastFailReason = "";

    for (let attempt = 1; attempt <= MAX_PREMISE_ATTEMPTS; attempt++) {
      console.log(
        `🧪 Attempt ${attempt}/${MAX_PREMISE_ATTEMPTS}: "${currentTopic}"`,
      );

      const pack = await generateRefineAndFactcheck({
        topic: currentTopic,
        categoryKey,
        tone,
        factualFrame,
      });

      if (!pack.checked.isFailPremise) {
        finalPack = pack;
        break;
      }

      lastFailReason = pack.checked.reason || "Premise demonstrably false";
      console.log("🧯 FAIL_PREMISE —", lastFailReason);

      if (attempt === MAX_PREMISE_ATTEMPTS) break;

      const salvage = await premiseSalvageDecider({
        title: pack.checked.title,
        card_text: pack.checked.card_text,
        reason: lastFailReason,
      });

      if (!salvage.salvageYes || !salvage.replacementSeed) {
        console.log("🚫 Salvage NO — stopping.");
        break;
      }

      console.log("🛟 Salvage YES — rebuilding on:", salvage.replacementSeed);
      currentTopic = salvage.replacementSeed;
    }

    if (!finalPack) {
      console.log("🧯 Premise could not be salvaged — flagging and stopping.");

      await flagSuggestionAndMaybeFailCard({
        suggestionId,
        reason: lastFailReason || "Premise false; no salvage",
        makeFailedCard: true,
        failedCardPayload: {
          suggestion_id: suggestionId,
          category: categoryKey,
          title: safeStr(topic),
          card_text: "",
          video_script: null,
          summary_normalized: null,
          fun_fact: null,
          scene_prompt: null,
          seo_title: null,
          seo_description: null,
          seo_keywords: null,
          hashtags: null,
          wow_score: wowScoreFromSuggestion,
        },
      });

      return;
    }

    const { parts, seo, checked } = finalPack;

    const fcTitle = checked.title;
    const fcCardText = checked.card_text;
    const fcVideoScript = checked.video_script || null;
    const fcSummary = checked.summary_normalized;
    const fcFunFact = checked.fun_fact;

    // Scene prompt (GPT) — after pass
    try {
      scene_prompt = await generateScenePrompt({
        openai,
        title: fcTitle,
        category: categoryKey,
        video_script: fcVideoScript || "",
        card_text: fcCardText || "",
      });
      scene_prompt = (scene_prompt || "").trim() || null;
    } catch (e) {
      console.warn("⚠️ Scene prompt generation failed:", e.message);
      scene_prompt = null;
    }

    const seoTitle = seo.title || fcTitle || null;
    const description = seo.description || null;
    const keywords = seo.keywords || null;

    // Image selection — after pass
    try {
      const img = await selectBestImage(
        fcTitle,
        fcCardText,
        categoryKey,
        null,
        fcSummary || "",
      );

      if (img?.imageUrl) {
        image_url = img.imageUrl;
        image_source = img.source || img.provider || null;

        image_credit =
          img.attribution ||
          (img.provider
            ? `Image source: ${img.provider}${
                img.license ? ` (${img.license})` : ""
              }`
            : null);

        if (img.source === "DALL·E") {
          image_prompt = img.prompt || null;
        }
      }

      console.log("🖼️ Image:", image_url ? "selected" : "none");
    } catch (e) {
      console.warn("⚠️ Image selection failed:", e.message);
    }

    // Save article
    const cardsTable = process.env.CARDS_TABLE || "curiosity_cards";

    const insertPayload = {
      suggestion_id: suggestionId,
      category: categoryKey,

      title: fcTitle,
      card_text: fcCardText,
      video_script: fcVideoScript,

      summary_normalized: fcSummary,
      fun_fact: fcFunFact,

      seo_title: seoTitle,
      seo_description: description,
      seo_keywords: keywords,
      hashtags: parts.hashtags || null,

      wow_score: wowScoreFromSuggestion,

      image_url,
      image_credit,
      image_source,
      image_prompt,
      scene_prompt,

      status: "published",
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from(cardsTable)
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    console.log(`📝 Card saved to "${cardsTable}" id=${inserted?.id}`);

    await updateAndPingSearchEngines();

    console.log("✅ Done");
  } catch (err) {
    console.error("❌ generate.js failed:", err.message);
    await markSuggestionFailed(sourceTable, suggestionId, err.message);
    process.exitCode = 1;
  }
}

run();
