// ============================================================================
// scripts/generateV2.js — CurioWire vNext TEST MODE
// One run = one article (NO DB WRITES, LOCAL OUTPUT ONLY).
// Flow:
//   pick USED suggestion -> premise gate -> editorial plan
//   attempt 1: generate -> summary -> refine -> factcheck
//   if FAIL_PREMISE -> salvage decider -> re-plan -> attempt 2
//   if attempt 2 FAIL_PREMISE -> stop
//   if pass -> resolve source -> save local output (json + html)
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import { buildPremiseGatePrompt } from "../app/api/utils/premiseGatePrompt.js";
import { buildArticlePrompt } from "../app/api/utils/promptsV2.js";
import { buildSummaryPrompt } from "../app/api/utils/summaryPrompt.js";
import { buildRefinePackagePrompt } from "../app/api/utils/refinePackage.js";
import { buildFactCheckPackagePrompt } from "../app/api/utils/factCheckPackage.js";
import { buildPremiseSalvagePrompt } from "../app/api/utils/premiseSalvage.js";
import { buildSourceResolverPrompt } from "../app/api/utils/sourceResolverPrompt.js";
import { decideArticlePlan } from "../app/api/utils/articlePlanner.js";

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
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: OPENAI_ORG_ID,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const MAX_PREMISE_ATTEMPTS = 2; // 1 original + 1 salvage retry (hard stop after)
const OUTPUT_DIR = path.resolve(process.cwd(), "scripts", "output");

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function nowIso() {
  return new Date().toISOString();
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
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

function slugify(s, max = 60) {
  return (
    safeStr(s, "untitled")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "untitled"
  );
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

function cleanTagValue(s) {
  return String(s || "")
    .replace(/<\/?\s*title\s*>/gi, "")
    .replace(/<\/?\s*description\s*>/gi, "")
    .replace(/<\/?\s*keywords\s*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
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

function splitSummaryOutput(text) {
  const out = { summary_normalized: null, fun_fact: null };

  const s = String(text || "");

  const sum = s.match(/Summary:\s*([\s\S]*?)\s*FunFact:\s*/i);
  if (sum) out.summary_normalized = sum[1].trim();

  const ff = s.match(/FunFact:\s*([\s\S]*)$/i);
  if (ff) out.fun_fact = ff[1].trim();

  if (out.summary_normalized && out.summary_normalized.length < 10) {
    out.summary_normalized = null;
  }

  if (out.fun_fact) {
    let cleaned = out.fun_fact.trim();
    cleaned = cleaned.replace(/^<p>\s*<\/p>\s*$/i, "").trim();
    cleaned = cleaned.replace(/^<p>\s*([\s\S]*?)\s*<\/p>$/i, "$1").trim();
    cleaned = cleaned.replace(/^\s*(none|null|n\/a)\s*$/i, "").trim();
    out.fun_fact = cleaned ? `<p>${cleaned}</p>` : null;
  }

  return out;
}

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

function splitSourceResolverOutput(text) {
  const s = String(text || "").trim();
  const firstLine = s.split(/\r?\n/)[0]?.trim() || "";
  const m = firstLine.match(/^URL:\s*(.+)\s*$/i);
  const raw = (m?.[1] || "").trim();

  if (!raw) return null;
  if (raw.toUpperCase() === "NONE") return null;
  if (!/^https?:\/\/\S+$/i.test(raw)) return null;

  return raw.replace(/[)\].,;:]+$/, "");
}

function renderHtmlPreview({
  title,
  category,
  topic_original,
  topic_used,
  source_url,
  summary_normalized,
  fun_fact,
  card_text,
  video_script,
  seo_title,
  seo_description,
  seo_keywords,
  hashtags,
  plan,
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title || "CurioWire V2 Test Output")}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; max-width: 860px; margin: 40px auto; padding: 0 20px; color: #111; }
  h1, h2, h3 { line-height: 1.25; }
  .meta { background: #f5f5f5; padding: 16px; border-radius: 10px; margin-bottom: 24px; }
  .block { margin: 28px 0; }
  code, pre { background: #f8f8f8; padding: 2px 4px; border-radius: 4px; }
  pre { padding: 12px; overflow-x: auto; }
  .muted { color: #555; }
</style>
</head>
<body>
  <h1>${escapeHtml(title || "Untitled")}</h1>

  <div class="meta">
    <p><strong>Category:</strong> ${escapeHtml(category || "")}</p>
    <p><strong>Original topic:</strong> ${escapeHtml(topic_original || "")}</p>
    <p><strong>Used topic:</strong> ${escapeHtml(topic_used || "")}</p>
    <p><strong>Source URL:</strong> ${
      source_url
        ? `<a href="${escapeHtml(source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source_url)}</a>`
        : '<span class="muted">None</span>'
    }</p>
  </div>

  <div class="block">
    <h2>Article</h2>
    ${card_text || '<p class="muted">No article text.</p>'}
  </div>

  <div class="block">
    <h2>Quick Summary</h2>
    ${summary_normalized || '<p class="muted">None</p>'}
  </div>

  <div class="block">
    <h2>Fun Fact</h2>
    ${fun_fact || '<p class="muted">None</p>'}
  </div>

  <div class="block">
    <h2>Video Script</h2>
    ${video_script || '<p class="muted">None</p>'}
  </div>

  <div class="block">
    <h2>SEO</h2>
    <p><strong>SEO title:</strong> ${escapeHtml(seo_title || "")}</p>
    <p><strong>Description:</strong> ${escapeHtml(seo_description || "")}</p>
    <p><strong>Keywords:</strong> ${escapeHtml(seo_keywords || "")}</p>
  </div>

  <div class="block">
    <h2>Hashtags</h2>
    <p>${escapeHtml(hashtags || "")}</p>
  </div>

  <div class="block">
    <h2>Editorial Plan</h2>
    <pre>${escapeHtml(JSON.stringify(plan || {}, null, 2))}</pre>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function writeLocalOutput(result) {
  await ensureOutputDir();

  const base = `${nowStamp()}__${result.suggestion_id || "noid"}__${slugify(
    result.title || result.topic_used || result.topic_original || "untitled",
  )}`;

  const jsonPath = path.join(OUTPUT_DIR, `${base}.json`);
  const htmlPath = path.join(OUTPUT_DIR, `${base}.html`);

  const html = renderHtmlPreview(result);

  await fs.writeFile(jsonPath, JSON.stringify(result, null, 2), "utf8");
  await fs.writeFile(htmlPath, html, "utf8");

  return { jsonPath, htmlPath };
}

function printPlan(plan) {
  console.log("🧭 Editorial plan:");
  console.log(`   opening=${safeStr(plan?.opening_style)}`);
  console.log(`   body=${safeStr(plan?.body_style)}`);
  console.log(`   explanation=${safeStr(plan?.explanation_style)}`);
  console.log(`   insight=${safeStr(plan?.insight_style)}`);
  console.log(`   ending=${safeStr(plan?.ending_style)}`);
  console.log(`   tone=${safeStr(plan?.tone_style)}`);
  console.log(`   pacing=${safeStr(plan?.pacing_style)}`);
  console.log(`   angle="${preview(plan?.angle || "", 140)}"`);
  if (Array.isArray(plan?.avoid) && plan.avoid.length) {
    console.log(`   avoid=${plan.avoid.join(" | ")}`);
  }
}

function printFinalPreview(result) {
  console.log("\n================ FINAL TEST OUTPUT ================\n");
  console.log(`Title: ${result.title}`);
  console.log(`Category: ${result.category}`);
  console.log(`Original topic: ${result.topic_original}`);
  console.log(`Used topic: ${result.topic_used}`);
  console.log(`Source URL: ${result.source_url || "None"}`);
  console.log(`\n--- ARTICLE ---\n${result.card_text || ""}`);
  console.log(`\n--- SUMMARY ---\n${result.summary_normalized || "(none)"}`);
  console.log(`\n--- FUN FACT ---\n${result.fun_fact || "(none)"}`);
  console.log(`\n--- VIDEO SCRIPT ---\n${result.video_script || "(none)"}`);
  console.log(
    `\n--- SEO ---\nTitle: ${result.seo_title || ""}\nDescription: ${result.seo_description || ""}\nKeywords: ${result.seo_keywords || ""}`,
  );
  console.log(`\n--- HASHTAGS ---\n${result.hashtags || ""}`);
  console.log("\n===================================================\n");
}

// ----------------------------------------------------------------------------
// Premise gate
// ----------------------------------------------------------------------------
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
  if (!out) {
    return { verdict: "FAIL", correctedSeed: "", reason: "Empty output" };
  }

  return splitPremiseGateOutput(out);
}

// ----------------------------------------------------------------------------
// Curiosity picking rules (USED suggestions only)
// ----------------------------------------------------------------------------
async function fetchOneUsedCuriositySuggestion() {
  const FORCE_SUGGESTION_ID = process.env.FORCE_SUGGESTION_ID || null;

  if (FORCE_SUGGESTION_ID) {
    const { data, error } = await supabase
      .from("curiosity_suggestions")
      .select("*")
      .eq("id", FORCE_SUGGESTION_ID)
      .single();

    if (error) throw error;
    if (!data) return null;

    console.log("🧪 FORCE MODE — using suggestion", FORCE_SUGGESTION_ID);
    return { table: "curiosity_suggestions", row: data };
  }

  const { data, error } = await supabase
    .from("curiosity_suggestions")
    .select("*")
    .eq("times_used", 1)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  if (!data || !data.length) return null;

  const row = data[Math.floor(Math.random() * data.length)];
  return { table: "curiosity_suggestions", row };
}

// ----------------------------------------------------------------------------
// Article planner
// ----------------------------------------------------------------------------
async function planArticle({ topic, categoryKey, factualFrame }) {
  const plan = await decideArticlePlan({
    openai,
    topic,
    category: categoryKey,
    factualFrame,
  });

  return plan;
}

// ----------------------------------------------------------------------------
// Generate article (raw)
// ----------------------------------------------------------------------------
async function generateArticleHtml({
  topic,
  categoryKey,
  tone,
  factualFrame,
  plan,
}) {
  const prompt = buildArticlePrompt(
    topic,
    categoryKey,
    tone,
    factualFrame,
    plan,
  );

  const resp = await openai.chat.completions.create({
    model: ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text || text.length < 400) {
    throw new Error("Article generation returned too little text.");
  }
  return text;
}

// ----------------------------------------------------------------------------
// Summary + FunFact (pre-refine, pre-factcheck)
// ----------------------------------------------------------------------------
async function generateSummaryAndFunFact({ cardText }) {
  const prompt = buildSummaryPrompt(cardText);

  const resp = await openai.chat.completions.create({
    model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text) return { summary_normalized: null, fun_fact: null };

  return splitSummaryOutput(text);
}

// ----------------------------------------------------------------------------
// REFINE (light language polish)
// ----------------------------------------------------------------------------
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
// SOURCE RESOLVER (ONE URL after PASS)
// ----------------------------------------------------------------------------
async function resolveOneSourceUrl({ title, summary_normalized, category }) {
  const prompt = buildSourceResolverPrompt({
    title,
    summary_normalized,
    category,
  });

  const resp = await openai.responses.create({
    model:
      process.env.SOURCE_RESOLVER_MODEL ||
      process.env.FACTCHECK_MODEL ||
      "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  const url = splitSourceResolverOutput(out);

  console.log(`🔗 SourceResolver: ${url ? "FOUND" : "NONE"}`);
  if (url) console.log(`   source_url=${url}`);

  return url;
}

// ----------------------------------------------------------------------------
// PREMISE SALVAGE (only used after FAIL_PREMISE)
// ----------------------------------------------------------------------------
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
// One attempt: plan -> generate -> summary -> refine -> factcheck
// ----------------------------------------------------------------------------
async function generateRefineAndFactcheck({
  topic,
  categoryKey,
  tone,
  factualFrame,
}) {
  const plan = await planArticle({
    topic,
    categoryKey,
    factualFrame,
  });

  printPlan(plan);

  const raw = await generateArticleHtml({
    topic,
    categoryKey,
    tone,
    factualFrame,
    plan,
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

  return { plan, parts, seo, checked };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function run() {
  console.log("🧠 CurioWire generateV2.js (TEST MODE) — starting");

  const found = await fetchOneUsedCuriositySuggestion();
  if (!found) {
    console.log("😴 No used curiosity suggestion found.");
    return;
  }

  const { table: sourceTable, row } = found;

  const suggestionId = row.id;
  const topic = safeStr(row.curiosity, "Untitled Curiosity");
  const categoryKey = normalizeCategoryKey(row.category);
  const wowScoreFromSuggestion = Number.isFinite(Number(row.wow_score))
    ? Number(row.wow_score)
    : 50;

  const tone = "neutral";
  const factualFrame = "";

  console.log(
    `🧩 Picked USED curiosity from "${sourceTable}" id=${suggestionId}`,
  );
  console.log(
    `   curiosity="${topic}" category="${categoryKey}" times_used=${Number(row.times_used || 0)}`,
  );

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
    `🧪 Premise gate verdict=${gate.verdict}${gate.correctedSeed ? " (has correction)" : ""}`,
  );

  if (gate.verdict === "FAIL") {
    console.log("🧯 Premise gate FAIL — stopping:", gate.reason);
    return;
  }

  if (gate.verdict === "FIX" && gate.correctedSeed) {
    console.log("🛠️ Premise gate FIX — corrected seed:", gate.correctedSeed);
    initialTopic = gate.correctedSeed;
  }

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
      console.log("🧯 Premise could not be salvaged — stopping.");
      return;
    }

    const { plan, parts, seo, checked } = finalPack;

    const fcTitle = checked.title;
    const fcCardText = checked.card_text;
    const fcVideoScript = checked.video_script || null;
    const fcSummary = checked.summary_normalized;
    const fcFunFact = checked.fun_fact;

    let source_url = null;
    try {
      source_url = await resolveOneSourceUrl({
        title: fcTitle,
        summary_normalized: fcSummary || "",
        category: categoryKey,
      });
    } catch (e) {
      console.warn("⚠️ SourceResolver failed:", e.message);
      source_url = null;
    }

    const seoTitle = seo.title || fcTitle || null;
    const description = seo.description || null;
    const keywords = seo.keywords || null;

    const localResult = {
      mode: "generateV2_test",
      generated_at: nowIso(),

      suggestion_id: suggestionId,
      category: categoryKey,
      wow_score: wowScoreFromSuggestion,

      topic_original: topic,
      topic_after_premise_gate: initialTopic,
      topic_used: currentTopic,

      premise_gate: {
        verdict: gate.verdict,
        corrected_seed: gate.correctedSeed || null,
        reason: gate.reason || "",
      },

      article_plan: plan,

      title: fcTitle,
      card_text: fcCardText,
      video_script: fcVideoScript,

      source_url: source_url || null,

      summary_normalized: fcSummary,
      fun_fact: fcFunFact,

      seo_title: seoTitle,
      seo_description: description,
      seo_keywords: keywords,
      hashtags: parts.hashtags || null,

      factcheck: {
        verdict: checked.verdict,
        reason: checked.reason || "",
      },
    };

    const { jsonPath, htmlPath } = await writeLocalOutput(localResult);

    printFinalPreview(localResult);

    console.log("💾 Local output saved:");
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
    console.log("✅ Done");
  } catch (err) {
    console.error("❌ generateV2.js failed:", err.message);
    process.exitCode = 1;
  }
}

run();
