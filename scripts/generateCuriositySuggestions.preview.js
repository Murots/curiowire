// ============================================================================
// CurioWire — generateCuriositySuggestions.preview.js
// Goal: Preview curiosity suggestions in terminal only (NO DATABASE WRITES).
//
// ✅ Reads existing suggestions from Supabase for dedupe / avoidAnchors
// ✅ Generates with the same prompt + editorial filters as production
// ✅ Does NOT insert, update, wipe, or modify anything in Supabase
// ✅ Prints preview items to terminal and exits
//
// Usage examples:
//   node scripts/generateCuriositySuggestions.preview.js
//   node scripts/generateCuriositySuggestions.preview.js products
//   node scripts/generateCuriositySuggestions.preview.js products 10 40
//
// Args:
//   [0] category (optional)  e.g. products
//   [1] preview limit        e.g. 10
//   [2] ask count            e.g. 40
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MODEL = process.env.CURIO_SUGGESTIONS_MODEL || "gpt-5-mini";

// CLI args are easier in VS Code / PowerShell
const cliCategory = process.argv[2] || null;
const cliPreviewLimit = process.argv[3] || null;
const cliAskCount = process.argv[4] || null;

// TEST / PREVIEW MODE
const TEST_PREVIEW_LIMIT = parseInt(
  cliPreviewLimit ?? process.env.CURIO_TEST_PREVIEW_LIMIT ?? "10",
  10,
);
const TEST_CATEGORY = cliCategory ?? process.env.CURIO_TEST_CATEGORY ?? null; // e.g. "history"
const TEST_ASK_COUNT = parseInt(
  cliAskCount ?? process.env.CURIO_TEST_ASK_COUNT ?? "30",
  10,
);

// Final stored wow threshold
const MIN_WOW_TO_KEEP = parseInt(process.env.CURIO_MIN_WOW ?? "75", 10);

// Internal editorial thresholds
const MIN_NOVELTY_SCORE = parseInt(process.env.CURIO_MIN_NOVELTY ?? "68", 10);
const MIN_RETELL_SCORE = parseInt(process.env.CURIO_MIN_RETELL ?? "66", 10);
const MIN_SPECIFICITY_SCORE = parseInt(
  process.env.CURIO_MIN_SPECIFICITY ?? "58",
  10,
);
const MAX_GENERIC_FACT_RISK = parseInt(
  process.env.CURIO_MAX_GENERIC_RISK ?? "38",
  10,
);

// Target counts (not really used in preview mode, but kept for parity)
const TARGET_BY_CATEGORY = {
  history: 200,
  science: 150,
  technology: 150,
  space: 150,
  nature: 150,
  health: 150,
  culture: 150,
  sports: 150,
  products: 150,
  world: 150,
  crime: 150,
  mystery: 150,
};

const CATEGORIES = Object.keys(TARGET_BY_CATEGORY);

// How many to ask for per model call
const GEN_BATCH = 60;

// Anti-repeat: soft cap how many suggestions per anchor per category
const ANCHOR_CAP_PER_CATEGORY = parseInt(
  process.env.CURIO_ANCHOR_CAP ?? "4",
  10,
);

// ----------------------------------------------------------------------------
// SUPABASE (READ ONLY IN THIS SCRIPT)
// ----------------------------------------------------------------------------
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ----------------------------------------------------------------------------
// OPENAI
// ----------------------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function parseJSONL(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .map(safeJsonParse)
    .filter(Boolean);
}

function normText(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function looksLikeListicleOrFiller(s) {
  const t = (s || "").toLowerCase();
  if (!t) return true;
  if (t.length < 18) return true;
  if (t.length > 260) return true;
  if (/^(did you know|fun fact|here are|top \d+)/i.test(s)) return true;
  if (/(scientists say|studies show|experts agree)/i.test(s)) return true;
  if (/(always|never|proved|definitely|guarantees)/i.test(s)) return true;
  if (/(click here|subscribe|follow for)/i.test(s)) return true;
  return false;
}

function looksLikeThemeSentence(s) {
  const t = (s || "").toLowerCase().trim();
  if (!t) return true;

  if (
    /(remains a mystery|continues to mystify|mystif(y|ies)|researchers have theories|theories range|is debated|debated among|purpose.*unknown)/i.test(
      s,
    )
  ) {
    return true;
  }

  if (
    /(it is believed|it is thought|many believe|some believe|legend says|according to legend)/i.test(
      s,
    )
  ) {
    return true;
  }

  if (
    /(is known for|is famous for|is used for|is designed to|helps improve|can improve|can reduce|can increase|can enhance)/i.test(
      s,
    )
  ) {
    return true;
  }

  if (
    /(advanced technology|high performance|improved performance|better experience|smoother experience|immersive experience|userfriendly|stateoftheart)/i.test(
      normText(s),
    )
  ) {
    return true;
  }

  return false;
}

function looksLikeSpecOrCapabilitySentence(s) {
  const t = (s || "").toLowerCase();

  if (
    /\b(up to|supports?|features?|offers?|provides?|delivers?|includes?|equipped with|powered by|designed for|built for|can run|can shoot|can record|can last|can capture)\b/i.test(
      t,
    )
  ) {
    if (
      /\b(hours?|minutes?|fps|frames? per second|hz|mah|gb|tb|mp|megapixels?|4k|5k|8k|resolution|refresh rate|battery life|processor|chip|brightness|performance)\b/i.test(
        t,
      )
    ) {
      return true;
    }
  }

  if (
    /\b(removes? .* plaque|reduces? stress|improves? mood|enhances? performance|better battery|longer battery|higher resolution|faster processor)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  return false;
}

function looksLikeBroadSummary(s) {
  const t = (s || "").toLowerCase();

  if (
    /\b(is a|was a|are a|refers to|is an example of|is the process of|is the practice of)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  if (
    /\b(can help|is used to|is known to|is commonly used|is often used|is widely used|is intended to)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  return false;
}

function computeCompositeWow({
  novelty = 50,
  retellability = 50,
  specificity = 50,
  genericFactRisk = 50,
}) {
  const wow =
    novelty * 0.36 +
    retellability * 0.34 +
    specificity * 0.18 +
    (100 - genericFactRisk) * 0.12;

  return clamp(Math.round(wow), 0, 100);
}

function extractInternalScores(obj) {
  const novelty = clamp(parseInt(obj.novelty_score ?? 50, 10) || 50, 0, 100);
  const retellability = clamp(
    parseInt(obj.retellability_score ?? 50, 10) || 50,
    0,
    100,
  );
  const specificity = clamp(
    parseInt(obj.specificity_score ?? 50, 10) || 50,
    0,
    100,
  );
  const genericFactRisk = clamp(
    parseInt(obj.generic_fact_risk ?? 50, 10) || 50,
    0,
    100,
  );

  return {
    novelty,
    retellability,
    specificity,
    genericFactRisk,
  };
}

function passesInternalScoreThresholds(scores) {
  if (scores.novelty < MIN_NOVELTY_SCORE) return false;
  if (scores.retellability < MIN_RETELL_SCORE) return false;
  if (scores.specificity < MIN_SPECIFICITY_SCORE) return false;
  if (scores.genericFactRisk > MAX_GENERIC_FACT_RISK) return false;
  return true;
}

function editorialRejectReason({ curiosity, topicTag = "", scores = null }) {
  if (looksLikeListicleOrFiller(curiosity)) return "listicle_or_filler";
  if (looksLikeThemeSentence(curiosity)) return "theme_sentence";
  if (looksLikeSpecOrCapabilitySentence(curiosity)) return "spec_or_capability";
  if (looksLikeBroadSummary(curiosity)) return "broad_summary";

  const topicNorm = normText(topicTag);
  if (
    /\b(battery life|performance|specifications|resolution|refresh rate|processor|features|benefits|biography)\b/i.test(
      topicNorm,
    )
  ) {
    return "generic_topic_tag";
  }

  if (scores && !passesInternalScoreThresholds(scores)) {
    if (scores.genericFactRisk > MAX_GENERIC_FACT_RISK) {
      return "high_generic_fact_risk";
    }
    if (scores.retellability < MIN_RETELL_SCORE) {
      return "low_retellability";
    }
    if (scores.novelty < MIN_NOVELTY_SCORE) {
      return "low_novelty";
    }
    if (scores.specificity < MIN_SPECIFICITY_SCORE) {
      return "low_specificity";
    }
    return "failed_internal_scores";
  }

  return null;
}

// ----------------------------------------------------------------------------
// PRELOAD STATE
// ----------------------------------------------------------------------------
async function preloadExistingState() {
  console.log("📦 Preloading existing suggestions for dedupe state...");

  const { data, error } = await supabase
    .from("curiosity_suggestions")
    .select("category, status, anchor_entity_norm, topic_tag_norm, times_used");

  if (error) {
    throw new Error("Failed to preload existing suggestions: " + error.message);
  }

  const seenKey = new Set();
  const anchorsUsedByCategory = new Map();

  for (const row of data || []) {
    const category = String(row.category || "").toLowerCase();
    const anchorNorm = String(row.anchor_entity_norm || "").trim();
    const topicNorm = String(row.topic_tag_norm || "").trim();

    if (!anchorsUsedByCategory.has(category)) {
      anchorsUsedByCategory.set(category, new Map());
    }

    const anchorCounts = anchorsUsedByCategory.get(category);
    if (anchorNorm) {
      anchorCounts.set(anchorNorm, (anchorCounts.get(anchorNorm) || 0) + 1);
    }

    if (anchorNorm && topicNorm) {
      const key = `${category}|${anchorNorm}|${topicNorm}`;
      seenKey.add(key);
    }
  }

  console.log(`✅ Loaded ${seenKey.size} existing dedupe keys`);
  return { seenKey, anchorsUsedByCategory };
}

// ----------------------------------------------------------------------------
// PROMPTS
// ----------------------------------------------------------------------------
function buildCategoryStyleRules(category) {
  const COMMON_BANS = `
COMMON / OVERUSED BANS:
- Do NOT output overused fun-fact material, generic explainer facts, or common trivia.
- If it sounds like a textbook line, a school fact, a product page, or a broad summary, discard it and create a different one.
`.trim();

  if (category === "crime") {
    return `
${COMMON_BANS}

CRIME STYLE:
- No gore. No instructions.
- Avoid private individuals unless clearly public and notable.
- Prefer a concrete, surprising real-world detail over a summary of the case.
`.trim();
  }

  if (category === "health") {
    return `
${COMMON_BANS}

HEALTH STYLE:
- Established phenomena only. No medical advice.
- Avoid generic benefit claims, wellness framing, or broad advice-like statements.
`.trim();
  }

  if (category === "mystery") {
    return `
${COMMON_BANS}

MYSTERY STYLE:
- Avoid vague unresolved framing.
- Prefer a concrete detail, contradiction, strange outcome, or clear limitation over generic intrigue.
`.trim();
  }

  if (category === "products") {
    return `
${COMMON_BANS}

PRODUCTS STYLE:
- Prefer real-world incidents, unusual uses, overlooked origins, strange design decisions, recalls, material quirks, or unintended consequences.
- Avoid specifications, feature lists, performance claims, and marketing-style descriptions.
- The product may be the anchor, but the curiosity must be the strange detail around it, not the product page summary.
`.trim();
  }

  return `
${COMMON_BANS}

CATEGORY STYLE:
- Stay clearly within the category, but do not narrow it to one sub-type.
- Prefer a specific anchor, a surprising detail, and meaningful context.
- Avoid dry, technical, or specialist framing if a more vivid real-world angle exists.
`.trim();
}

function buildGenerationPrompt({
  category,
  count,
  avoidAnchors = [],
  minWow = 75,
}) {
  return `
You are generating REAL-WORLD CurioWire "curiosity suggestions" for category: ${category.toUpperCase()}.

Goal: generate rare, surprising, real-world curiosities that feel like genuine discoveries, not general facts.
Each item MUST be a single concrete curiosity, not a summary, feature description, or broad factual statement.

A curiosity is a specific, real-world detail that feels surprising and worth retelling.
It should not read like a summary, definition, specification, or generic fact.
Prefer rare incidents, odd outcomes, overlooked origins, or unusual uses.

${buildCategoryStyleRules(category)}

NOVELTY REQUIREMENTS:
- Avoid over-covered topics and headline-level summaries.
- Prefer overlooked edge details: strange constraints, weird causes, procedural quirks, odd consequences, or real-world exceptions.
- If it sounds like something most people already know, discard it and generate a different one.

QUALITY SELF-CHECK (VERY IMPORTANT):
Before outputting each item, ask yourself:
- Would a curious person retell this to a friend?
- Does it contain a concrete anchor + a strange or surprising detail?
- Does it avoid sounding like a specification, definition, or general fact?
If the answer to any of these is NO, discard the item and generate a different one.

AVOID THESE OVERUSED ANCHORS (do not use these as the main anchor):
${avoidAnchors.length ? avoidAnchors.map((a) => `- ${a}`).join("\n") : "- (none)"}

ABSOLUTE BAN (NO THEME SENTENCES):
- Do NOT write generic lines such as "remains a mystery", "researchers have theories", "is debated", or similar vague framing.
- Do NOT output anything that reads like a textbook sentence, product page, broad explainer, or common trivia item.
- Do NOT output product-style capability claims, performance claims, feature claims, or benefit claims.

REQUIRED CLAIM FORMAT (stored as "curiosity"):
- ONE sentence, max 220 characters.
- Must contain:
  1) ANCHOR: a specific named thing (person, object, place, event, case, law, experiment, institution, product, or term)
  2) SURPRISING DETAIL: a rare, strange, or little-known detail about that anchor
  3) CONTEXT: what happened, why it mattered, or the unusual condition that makes it interesting
- If you cannot include all 3, DO NOT output the item.
- The result must feel like a curiosity someone would retell, not a definition, summary, specification, or generic fact.

SCORING:
Score each item honestly using these independent scales:
- wow_score: overall editorial strength of the curiosity
- novelty_score: how rare / unexpected it feels
- retellability_score: how likely someone would want to repeat it
- specificity_score: how concrete and well-anchored it is
- generic_fact_risk: risk that it reads like a generic fact, summary, feature description, or product page line

TRUTH SAFETY:
- Only propose claims that are broadly true and defensible.
- If correctness depends on a specific number/date, omit the number or soften wording.
- No "always/never/proved/definitely". No vague authority fillers ("scientists say").

OUTPUT (JSONL, exactly ${count} lines):
Each line MUST be a JSON object:
{
  "category": "${category}",
  "curiosity": "ONE sentence surprising curiosity with a specific anchor, a rare detail, and meaningful context (<=220 chars)",
  "wow_score": ${minWow}-100,
  "novelty_score": 0-100,
  "retellability_score": 0-100,
  "specificity_score": 0-100,
  "generic_fact_risk": 0-100,
  "verification_query": "2-8 words, prefer proper noun/term",
  "anchor_entity": "short anchor name (person/case/object/term/standard)",
  "topic_tag": "short tag for the specific detail (not the general topic)"
}

Important:
- "anchor_entity" and "topic_tag" MUST be short (2-8 words).
- "topic_tag" must name the specific surprising detail, not a generic label like "history", "biography", "technology", "battery life", or "performance".
- Score harshly against generic, brochure-like, summary-like, or feature-like output.

Return ONLY JSONL. No extra text.
Start now.
`.trim();
}

// ----------------------------------------------------------------------------
// GENERATION
// ----------------------------------------------------------------------------
async function generateForCategory({
  category,
  askCount,
  avoidAnchors = [],
  minWow,
  seenKey,
  anchorsUsedByCategory,
}) {
  const prompt = buildGenerationPrompt({
    category,
    count: askCount,
    avoidAnchors,
    minWow,
  });

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const cleaned = [];
  const localSeenCuriosity = new Set();

  const catKey = category.toLowerCase();
  if (!anchorsUsedByCategory.has(catKey)) {
    anchorsUsedByCategory.set(catKey, new Map());
  }
  const anchorCounts = anchorsUsedByCategory.get(catKey);

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if ((r.category || "").toLowerCase() !== catKey) continue;

    const curiosity = String(r.curiosity || "").trim();
    const anchor_entity = String(r.anchor_entity || "").trim();
    const topic_tag = String(r.topic_tag || "").trim();
    const verification_query = String(r.verification_query || "").trim();

    if (!curiosity || !anchor_entity || !topic_tag || !verification_query) {
      continue;
    }

    const scores = extractInternalScores(r);
    const computedWow = computeCompositeWow(scores);
    const modelWow = clamp(
      parseInt(r.wow_score ?? computedWow, 10) || computedWow,
      0,
      100,
    );

    const rejectReason = editorialRejectReason({
      curiosity,
      topicTag: topic_tag,
      scores,
    });
    if (rejectReason) continue;

    if (computedWow < minWow) continue;
    if (modelWow < minWow) continue;

    const anchorNorm = normText(anchor_entity);
    const topicNorm = normText(topic_tag);

    if (!anchorNorm || anchorNorm.length < 3) continue;
    if (!topicNorm || topicNorm.length < 3) continue;

    const key = `${catKey}|${anchorNorm}|${topicNorm}`;
    if (seenKey.has(key)) continue;

    const curKey = normText(curiosity);
    if (!curKey || curKey.length < 10) continue;
    if (localSeenCuriosity.has(curKey)) continue;
    localSeenCuriosity.add(curKey);

    const usedCount = anchorCounts.get(anchorNorm) || 0;
    if (usedCount >= ANCHOR_CAP_PER_CATEGORY) continue;

    cleaned.push({
      category: catKey,
      curiosity,
      wow_score: computedWow,
      model_wow_score: modelWow,
      novelty_score: scores.novelty,
      retellability_score: scores.retellability,
      specificity_score: scores.specificity,
      generic_fact_risk: scores.genericFactRisk,
      anchor_entity,
      anchor_entity_norm: anchorNorm,
      topic_tag,
      topic_tag_norm: topicNorm,
      verification_query,
    });

    seenKey.add(key);
    anchorCounts.set(anchorNorm, usedCount + 1);
  }

  return cleaned;
}

// ----------------------------------------------------------------------------
// TERMINAL PREVIEW
// ----------------------------------------------------------------------------
function printPreview(items) {
  if (!items.length) {
    console.log("\n⚠️ No preview items survived the filters.\n");
    return;
  }

  console.log(`\n🧪 PREVIEW (${items.length} items)\n`);

  items.forEach((r, i) => {
    console.log(`--- ${i + 1} ---`);
    console.log(`category:            ${r.category}`);
    console.log(`wow_score:           ${r.wow_score}`);
    console.log(`model_wow_score:     ${r.model_wow_score}`);
    console.log(`novelty_score:       ${r.novelty_score}`);
    console.log(`retellability_score: ${r.retellability_score}`);
    console.log(`specificity_score:   ${r.specificity_score}`);
    console.log(`generic_fact_risk:   ${r.generic_fact_risk}`);
    console.log(`anchor:              ${r.anchor_entity}`);
    console.log(`topic:               ${r.topic_tag}`);
    console.log(`verification_query:  ${r.verification_query}`);
    console.log(`curiosity:           ${r.curiosity}`);
    console.log("");
  });
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  console.log("🔧 generateCuriositySuggestions.preview.js");
  console.log("   model:", MODEL);
  console.log("   preview_limit:", TEST_PREVIEW_LIMIT);
  console.log("   test_category:", TEST_CATEGORY || "(all categories)");
  console.log("   test_ask_count:", TEST_ASK_COUNT);
  console.log("   MIN_WOW_TO_KEEP:", MIN_WOW_TO_KEEP);
  console.log("   MIN_NOVELTY_SCORE:", MIN_NOVELTY_SCORE);
  console.log("   MIN_RETELL_SCORE:", MIN_RETELL_SCORE);
  console.log("   MIN_SPECIFICITY_SCORE:", MIN_SPECIFICITY_SCORE);
  console.log("   MAX_GENERIC_FACT_RISK:", MAX_GENERIC_FACT_RISK);
  console.log("   mode: TERMINAL PREVIEW ONLY (no database writes)");

  if (TEST_CATEGORY && !CATEGORIES.includes(TEST_CATEGORY)) {
    throw new Error(
      `Invalid category "${TEST_CATEGORY}". Must be one of: ${CATEGORIES.join(", ")}`,
    );
  }

  const preload = await preloadExistingState();
  const seenKey = preload.seenKey;
  const anchorsUsedByCategory = preload.anchorsUsedByCategory;

  const categories = TEST_CATEGORY ? [TEST_CATEGORY] : CATEGORIES;
  const previewItems = [];

  for (const category of categories) {
    if (previewItems.length >= TEST_PREVIEW_LIMIT) break;

    const anchorCounts = anchorsUsedByCategory.get(category) || new Map();

    const avoidAnchors = [...anchorCounts.entries()]
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 120)
      .map(([anchor]) => anchor);

    const askCount = Math.min(
      GEN_BATCH,
      Math.max(TEST_ASK_COUNT, TEST_PREVIEW_LIMIT),
    );

    console.log(
      `\n🧠 Generating preview for ${category.toUpperCase()} (askCount=${askCount}, avoidAnchors=${avoidAnchors.length})...`,
    );

    const batch = await generateForCategory({
      category,
      askCount,
      avoidAnchors,
      minWow: MIN_WOW_TO_KEEP,
      seenKey,
      anchorsUsedByCategory,
    });

    for (const item of batch) {
      if (previewItems.length >= TEST_PREVIEW_LIMIT) break;
      previewItems.push(item);
    }
  }

  printPreview(previewItems);

  console.log(
    "✅ Preview complete. No Supabase rows were inserted or updated.",
  );
}

main().catch((err) => {
  console.error("💥 generateCuriositySuggestions.preview.js failed:", err);
  process.exit(1);
});
