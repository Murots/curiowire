// ============================================================================
// CurioWire — generateListSuggestions.v1.3.js
// Goal: Generate HIGH-WOW "list article suggestions" with strong anti-duplication
// and strict editorial quality control, aligned with single-suggestion logic.
//
// ✅ Top-up mode (NO WIPE) by default
// ✅ Top-up targets UNUSED inventory only: times_used = 0
// ✅ Eligible inventory for the "unused quota": status IS NULL OR status='verified' (but NOT 'flagged')
// ✅ Prefills dedupe state from DB so repeated runs keep improving without repeats
// ✅ Enforces: category + anchor_entity_norm + topic_tag_norm uniqueness (in DB + in-memory)
// ✅ Soft caps how often the same list anchor can appear per category
// ✅ Verifies via Wikipedia when possible, then LLM judge+rewrite for the rest
//
// v1.3:
// - Uses a much softer status policy for lists
// - verified = strong + sufficiently supported
// - null = plausible / promising / needs article-level factcheck
// - flagged = only truly weak, generic, structurally bad, or likely bad
// - avoids killing good inventory due to editorial-risk scores alone
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MODEL = process.env.CURIO_LIST_SUGGESTIONS_MODEL || "gpt-5-mini";

// ✅ Top-up mode (NO WIPE)
const WIPE_BEFORE_REFILL = false;

// Final stored wow threshold
const MIN_WOW_TO_KEEP = parseInt(process.env.CURIO_LIST_MIN_WOW ?? "80", 10);

// Internal editorial thresholds (theme-level)
const MIN_THEME_NOVELTY_SCORE = parseInt(
  process.env.CURIO_LIST_MIN_THEME_NOVELTY ?? "74",
  10,
);
const MIN_THEME_RETELL_SCORE = parseInt(
  process.env.CURIO_LIST_MIN_THEME_RETELL ?? "76",
  10,
);
const MIN_THEME_SPECIFICITY_SCORE = parseInt(
  process.env.CURIO_LIST_MIN_THEME_SPECIFICITY ?? "70",
  10,
);
const MAX_THEME_GENERIC_RISK = parseInt(
  process.env.CURIO_LIST_MAX_THEME_GENERIC_RISK ?? "24",
  10,
);

// Internal editorial thresholds (item-level)
const MIN_ITEM_NOVELTY_SCORE = parseInt(
  process.env.CURIO_LIST_MIN_ITEM_NOVELTY ?? "68",
  10,
);
const MIN_ITEM_RETELL_SCORE = parseInt(
  process.env.CURIO_LIST_MIN_ITEM_RETELL ?? "68",
  10,
);
const MIN_ITEM_SPECIFICITY_SCORE = parseInt(
  process.env.CURIO_LIST_MIN_ITEM_SPECIFICITY ?? "60",
  10,
);
const MAX_ITEM_GENERIC_RISK = parseInt(
  process.env.CURIO_LIST_MAX_ITEM_GENERIC_RISK ?? "34",
  10,
);

// Aggregate item quality thresholds
const MIN_AVG_ITEM_WOW = parseInt(
  process.env.CURIO_LIST_MIN_AVG_ITEM_WOW ?? "80",
  10,
);
const MIN_ITEM_WOW_FLOOR = parseInt(
  process.env.CURIO_LIST_MIN_ITEM_WOW_FLOOR ?? "74",
  10,
);
const MIN_HIGH_WOW_ITEM_COUNT = parseInt(
  process.env.CURIO_LIST_MIN_HIGH_WOW_ITEM_COUNT ?? "3",
  10,
);

// Additional decision thresholds for softer status handling
const MIN_WIKI_VERIFIED_ITEMS = parseInt(
  process.env.CURIO_LIST_MIN_WIKI_VERIFIED_ITEMS ?? "3",
  10,
);
const MIN_WIKI_VERIFIED_RATIO = Number(
  process.env.CURIO_LIST_MIN_WIKI_VERIFIED_RATIO ?? "0.5",
);

const MIN_CONFIDENCE_TO_VERIFY = 4;
const NULL_STATUS_MIN_CONFIDENCE = parseInt(
  process.env.CURIO_LIST_NULL_STATUS_MIN_CONFIDENCE ?? "2",
  10,
);

// Target counts (desired minimum UNUSED rows per category, i.e., times_used=0)
const TARGET_BY_CATEGORY = {
  history: 18,
  science: 14,
  technology: 10,
  space: 10,
  nature: 14,
  health: 10,
  culture: 10,
  sports: 8,
  products: 8,
  world: 10,
  crime: 10,
  mystery: 12,
};

const CATEGORIES = Object.keys(TARGET_BY_CATEGORY);

// How many to ask for per model call
const GEN_BATCH = 12;

// Max top-up passes per category
const TOPUP_PASSES = 10;

// Verification batching
const URL_VERIFY_BATCH = 20;
const NOURL_VERIFY_BATCH = 8;

// Wikipedia phase: avoid infinite loops when no progress
const URL_VERIFY_MAX_STALLS = 3;

// Anti-repeat: soft cap how often the same list anchor can appear per category
const ANCHOR_CAP_PER_CATEGORY = parseInt(
  process.env.CURIO_LIST_ANCHOR_CAP ?? "3",
  10,
);

// For top-up asking: request more than needed to offset filtering/dupes
const ASK_MULTIPLIER = Number(process.env.CURIO_LIST_ASK_MULT ?? "1.6");

// ----------------------------------------------------------------------------
// SUPABASE (SERVICE ROLE REQUIRED)
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
async function wikiSearchTopTitle(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: q,
      format: "json",
      origin: "*",
      srlimit: "1",
    });

  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  const title = json?.query?.search?.[0]?.title;
  return title ? String(title) : null;
}

async function wikiGetSummary(title) {
  const t = String(title || "").trim();
  if (!t) return null;

  const url =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(t.replace(/ /g, "_"));

  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;

  const json = await res.json();
  return {
    title: json?.title || t,
    extract: json?.extract || "",
  };
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

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
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function wikiUrlFromTitle(title) {
  if (!title) return null;
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(
    title.replace(/ /g, "_"),
  )}`;
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

function looksLikeBroadTheme(title, theme, angle) {
  const t = normText([title, theme, angle].filter(Boolean).join(" "));
  if (!t) return true;

  if (
    /\b(facts about|things about|interesting facts|history of|guide to|overview of|introduction to)\b/.test(
      t,
    )
  ) {
    return true;
  }

  if (
    /^(5|6|7|8|9|10)\s+(facts|things)\s+about\b/.test(normText(title || ""))
  ) {
    return true;
  }

  return false;
}

function looksLikeWeakListTheme(title, theme) {
  const t = normText(`${title} ${theme}`);

  if (
    /\b(world war ii|ww2|space|science|animals|medicine|technology|history)\b/.test(
      t,
    ) &&
    t.split(" ").length <= 5
  ) {
    return true;
  }

  if (
    /\b(mysterious places|interesting objects|facts about|things you didnt know)\b/.test(
      t,
    )
  ) {
    return true;
  }

  return false;
}

function looksLikeClickbaitGarbage(s) {
  const t = (s || "").toLowerCase();
  return /you wont believe|you won't believe|mindblowing|mind-blowing|insane|crazy|shocking beyond belief/i.test(
    t,
  );
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

function computeListWow({
  themeNovelty = 50,
  themeRetellability = 50,
  themeSpecificity = 50,
  themeGenericRisk = 50,
  avgItemWow = 50,
  minItemWow = 50,
}) {
  const wow =
    themeNovelty * 0.24 +
    themeRetellability * 0.24 +
    themeSpecificity * 0.16 +
    (100 - themeGenericRisk) * 0.12 +
    avgItemWow * 0.16 +
    minItemWow * 0.08;

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

function passesItemScoreThresholds(scores) {
  if (scores.novelty < MIN_ITEM_NOVELTY_SCORE) return false;
  if (scores.retellability < MIN_ITEM_RETELL_SCORE) return false;
  if (scores.specificity < MIN_ITEM_SPECIFICITY_SCORE) return false;
  if (scores.genericFactRisk > MAX_ITEM_GENERIC_RISK) return false;
  return true;
}

function editorialRejectItemReason({
  curiosity,
  topicTag = "",
  scores = null,
}) {
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

  if (scores && !passesItemScoreThresholds(scores)) {
    if (scores.genericFactRisk > MAX_ITEM_GENERIC_RISK) {
      return "high_generic_fact_risk";
    }
    if (scores.retellability < MIN_ITEM_RETELL_SCORE) {
      return "low_retellability";
    }
    if (scores.novelty < MIN_ITEM_NOVELTY_SCORE) {
      return "low_novelty";
    }
    if (scores.specificity < MIN_ITEM_SPECIFICITY_SCORE) {
      return "low_specificity";
    }
    return "failed_internal_scores";
  }

  return null;
}

function titleLooksWeak(title) {
  const t = normText(title);
  if (!t) return true;
  if (t.length < 12) return true;
  if (t.length > 120) return true;
  if (looksLikeClickbaitGarbage(t)) return true;
  return false;
}

function cleanListItem(item, position) {
  if (!item || typeof item !== "object") return null;

  const title = String(item.title || "").trim();
  const curiosity = String(item.curiosity || "").trim();
  const anchor_entity = String(item.anchor_entity || "").trim();
  const topic_tag = String(item.topic_tag || "").trim();
  const verification_query = String(item.verification_query || "").trim();

  if (
    !title ||
    !curiosity ||
    !anchor_entity ||
    !topic_tag ||
    !verification_query
  ) {
    return null;
  }

  const scores = extractInternalScores(item);
  const wow_score = computeCompositeWow(scores);

  return {
    position,
    title,
    curiosity,
    anchor_entity,
    anchor_entity_norm: normText(anchor_entity),
    topic_tag,
    topic_tag_norm: normText(topic_tag),
    verification_query,
    wow_score,
    _scores: scores,
  };
}

function evaluateListSuggestion(row) {
  const title = String(row.title || "").trim();
  const theme = String(row.theme || "").trim();
  const angle = String(row.angle || "").trim();
  const items = Array.isArray(row.items) ? row.items : [];
  const itemCount = clamp(parseInt(row.item_count ?? 0, 10) || 0, 0, 100);

  if (!title || !theme || !angle) {
    return { ok: false, reason: "missing_core_fields" };
  }

  if (titleLooksWeak(title)) {
    return { ok: false, reason: "weak_title" };
  }

  if (looksLikeBroadTheme(title, theme, angle)) {
    return { ok: false, reason: "broad_theme" };
  }

  if (looksLikeWeakListTheme(title, theme)) {
    return { ok: false, reason: "weak_theme" };
  }

  if (looksLikeClickbaitGarbage(title) || looksLikeClickbaitGarbage(theme)) {
    return { ok: false, reason: "trash_clickbait" };
  }

  if (itemCount < 5 || itemCount > 10) {
    return { ok: false, reason: "bad_item_count" };
  }

  if (items.length !== itemCount) {
    return { ok: false, reason: "item_count_mismatch" };
  }

  const themeScores = {
    novelty: clamp(parseInt(row.theme_novelty_score ?? 50, 10) || 50, 0, 100),
    retellability: clamp(
      parseInt(row.theme_retellability_score ?? 50, 10) || 50,
      0,
      100,
    ),
    specificity: clamp(
      parseInt(row.theme_specificity_score ?? 50, 10) || 50,
      0,
      100,
    ),
    genericFactRisk: clamp(
      parseInt(row.theme_generic_risk ?? 50, 10) || 50,
      0,
      100,
    ),
  };

  if (themeScores.novelty < MIN_THEME_NOVELTY_SCORE) {
    return { ok: false, reason: "low_theme_novelty" };
  }
  if (themeScores.retellability < MIN_THEME_RETELL_SCORE) {
    return { ok: false, reason: "low_theme_retellability" };
  }
  if (themeScores.specificity < MIN_THEME_SPECIFICITY_SCORE) {
    return { ok: false, reason: "low_theme_specificity" };
  }
  if (themeScores.genericFactRisk > MAX_THEME_GENERIC_RISK) {
    return { ok: false, reason: "high_theme_generic_risk" };
  }

  const seenItemAnchors = new Set();
  const seenItemTopics = new Set();

  let totalItemWow = 0;
  let minItemWow = 100;
  let highWowCount = 0;

  for (const item of items) {
    const rejectReason = editorialRejectItemReason({
      curiosity: item.curiosity,
      topicTag: item.topic_tag,
      scores: item._scores,
    });
    if (rejectReason) {
      return { ok: false, reason: `item_${rejectReason}` };
    }

    if (!item.anchor_entity_norm || item.anchor_entity_norm.length < 3) {
      return { ok: false, reason: "bad_item_anchor" };
    }

    if (!item.topic_tag_norm || item.topic_tag_norm.length < 3) {
      return { ok: false, reason: "bad_item_topic" };
    }

    if (seenItemAnchors.has(item.anchor_entity_norm)) {
      return { ok: false, reason: "duplicate_item_anchor" };
    }
    if (seenItemTopics.has(item.topic_tag_norm)) {
      return { ok: false, reason: "duplicate_item_topic" };
    }

    seenItemAnchors.add(item.anchor_entity_norm);
    seenItemTopics.add(item.topic_tag_norm);

    totalItemWow += item.wow_score;
    minItemWow = Math.min(minItemWow, item.wow_score);
    if (item.wow_score >= 85) highWowCount += 1;
  }

  const avgItemWow = Math.round(totalItemWow / items.length);

  if (avgItemWow < MIN_AVG_ITEM_WOW) {
    return { ok: false, reason: "avg_item_wow_too_low" };
  }

  if (minItemWow < MIN_ITEM_WOW_FLOOR) {
    return { ok: false, reason: "item_below_floor" };
  }

  if (highWowCount < MIN_HIGH_WOW_ITEM_COUNT) {
    return { ok: false, reason: "not_enough_high_wow_items" };
  }

  const wow = computeListWow({
    themeNovelty: themeScores.novelty,
    themeRetellability: themeScores.retellability,
    themeSpecificity: themeScores.specificity,
    themeGenericRisk: themeScores.genericFactRisk,
    avgItemWow,
    minItemWow,
  });

  if (wow < MIN_WOW_TO_KEEP) {
    return { ok: false, reason: "wow_below_threshold" };
  }

  return {
    ok: true,
    wow,
  };
}

function shouldHardFlagFromReason(reason = "") {
  const r = String(reason || "").toLowerCase();

  // Only truly structural / obviously bad reasons should hard-flag
  const hardReasons = new Set([
    "missing_core_fields",
    "weak_title",
    "broad_theme",
    "weak_theme",
    "trash_clickbait",
    "bad_item_count",
    "item_count_mismatch",
    "duplicate_item_anchor",
    "duplicate_item_topic",
    "bad_item_anchor",
    "bad_item_topic",
    "item_spec_or_capability",
    "item_broad_summary",
    "item_generic_topic_tag",
  ]);

  return hardReasons.has(r);
}

function shouldKeepNullFromReason(reason = "") {
  const r = String(reason || "").toLowerCase();

  const softReasons = new Set([
    "low_theme_novelty",
    "low_theme_retellability",
    "low_theme_specificity",
    "high_theme_generic_risk",
    "item_listicle_or_filler",
    "item_theme_sentence",
    "item_high_generic_fact_risk",
    "item_low_retellability",
    "item_low_novelty",
    "item_low_specificity",
    "item_failed_internal_scores",
    "avg_item_wow_too_low",
    "item_below_floor",
    "not_enough_high_wow_items",
    "wow_below_threshold",
  ]);

  return softReasons.has(r);
}

// Basic overlap helper for Wikipedia verification
function keywordOverlapScore(text, extract) {
  const t = normText(text);
  const e = normText(extract || "");
  if (!t || !e) return 0;

  const words = t.split(" ").filter((w) => w.length >= 5);
  if (!words.length) return 0;

  let hits = 0;
  for (const w of new Set(words)) {
    if (e.includes(w)) hits += 1;
  }

  return hits / Math.min(words.length, 10);
}

// ----------------------------------------------------------------------------
// PRELOAD STATE
// ----------------------------------------------------------------------------
async function preloadExistingState() {
  console.log("📦 Preloading existing list suggestions for dedupe state...");

  const { data, error } = await supabase
    .from("curiosity_list_suggestions")
    .select("category, status, anchor_entity_norm, topic_tag_norm, times_used");

  if (error) {
    throw new Error(
      "Failed to preload existing list suggestions: " + error.message,
    );
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

  console.log(`✅ Loaded ${seenKey.size} existing list dedupe keys`);
  return { seenKey, anchorsUsedByCategory };
}

// ----------------------------------------------------------------------------
// PROMPTS
// ----------------------------------------------------------------------------
function buildCategoryStyleRules(category) {
  const COMMON_BANS = `
COMMON / OVERUSED BANS:
- Do NOT output broad school-trivia list ideas or generic "facts about X".
- If the list could be filled with common knowledge, discard it and create a different one.
- Every item should feel close to a standalone curiosity, not filler.
`.trim();

  if (category === "crime") {
    return `
${COMMON_BANS}

CRIME STYLE:
- No gore. No instructions.
- Avoid private individuals unless clearly public and notable.
- Prefer bizarre procedural, legal, forensic, or case-specific details.
`.trim();
  }

  if (category === "health") {
    return `
${COMMON_BANS}

HEALTH STYLE:
- Established phenomena only. No medical advice.
- Avoid generic wellness or benefit framing.
- Prefer concrete cases, discoveries, accidents, or anatomical oddities.
`.trim();
  }

  if (category === "mystery") {
    return `
${COMMON_BANS}

MYSTERY STYLE:
- Avoid vague unresolved framing.
- Prefer concrete details, contradictions, failures, or strange evidence.
`.trim();
  }

  if (category === "products") {
    return `
${COMMON_BANS}

PRODUCTS STYLE:
- Prefer real-world incidents, unusual uses, overlooked origins, strange design choices, recalls, material quirks, or unintended consequences.
- Avoid specifications, feature lists, performance claims, and marketing-style descriptions.
`.trim();
  }

  return `
${COMMON_BANS}

CATEGORY STYLE:
- Stay clearly within the category, but the theme must be narrow and vivid.
- Prefer lists built around a strong shared angle, not a broad subject.
- Avoid dry, textbook-like framing.
`.trim();
}

function buildGenerationPrompt({
  category,
  count,
  avoidAnchors = [],
  minWow = 80,
}) {
  return `
You are generating REAL-WORLD CurioWire "list article suggestions" for category: ${category.toUpperCase()}.

Goal: generate rare, surprising, real-world LIST IDEAS that feel genuinely worth clicking and retelling.
Each output must be a COMPLETE LIST SUGGESTION, not just a title.

A strong CurioWire list:
- has a narrow, vivid, specific theme
- contains 5 to 10 concrete items
- each item is individually surprising and worth retelling
- does NOT feel like broad school trivia or generic facts

${buildCategoryStyleRules(category)}

NOVELTY REQUIREMENTS:
- Avoid over-covered list formats and broad topics.
- Prefer overlooked edge details, specific types of objects, incidents, adaptations, accidents, failures, strange outcomes, or unusual constraints.
- If the theme sounds like something most people have seen many times before, discard it.

AVOID THESE OVERUSED LIST ANCHORS (do not use these as the main list anchor):
${avoidAnchors.length ? avoidAnchors.map((a) => `- ${a}`).join("\n") : "- (none)"}

ABSOLUTE BANS:
- No "facts about X"
- No generic "things you didn't know about X"
- No broad themes like "World War II", "space", "science", "animals", "technology" unless there is a very specific shared angle
- No filler items
- No vague unresolved fluff
- No product-style specs/features/performance claims

TRUTH SAFETY:
- Only propose claims that are broadly true and defensible.
- If correctness depends on a specific number/date, omit the number or soften wording.
- No "always/never/proved/definitely". No vague authority fillers ("scientists say").

SCORING:
Use internal scores honestly:
THEME:
- theme_novelty_score
- theme_retellability_score
- theme_specificity_score
- theme_generic_risk

EACH ITEM:
- novelty_score
- retellability_score
- specificity_score
- generic_fact_risk
- wow_score

OUTPUT (JSONL, exactly ${count} lines):
Each line MUST be a JSON object:
{
  "category": "${category}",
  "title": "Title with a number and a vivid specific shared angle",
  "theme": "One-sentence description of the shared list concept",
  "angle": "Why these items belong together, in one sentence",
  "item_count": 5-10,
  "anchor_entity": "short list anchor name",
  "topic_tag": "short tag for the specific list angle",
  "theme_novelty_score": 0-100,
  "theme_retellability_score": 0-100,
  "theme_specificity_score": 0-100,
  "theme_generic_risk": 0-100,
  "items": [
    {
      "title": "short item heading",
      "curiosity": "ONE sentence curiosity with anchor + surprising detail + context (<=220 chars)",
      "anchor_entity": "short anchor name",
      "topic_tag": "short tag for the specific detail",
      "verification_query": "2-8 words, prefer proper noun/term",
      "wow_score": ${minWow}-100,
      "novelty_score": 0-100,
      "retellability_score": 0-100,
      "specificity_score": 0-100,
      "generic_fact_risk": 0-100
    }
  ]
}

Important:
- item_count must match the number of items
- each item must be different
- do not repeat the same anchor in multiple items
- at least 5 items should feel close to standalone CurioWire article-worthy
- score harshly against generic output

Return ONLY JSONL. No extra text.
Start now.
`.trim();
}

function buildNoUrlJudgePrompt(rows) {
  const items = rows.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    theme: r.theme,
    angle: r.angle,
    item_count: r.item_count,
    items: r.items,
    wow_score: r.wow_score,
    anchor_entity: r.anchor_entity,
    topic_tag: r.topic_tag,
  }));

  return `
You are CurioWire's verifier for "list article suggestions".
Judge if each item is (A) broadly true AND (B) a genuinely strong CurioWire list, not broad trivia or filler.

A strong CurioWire list:
- must have a narrow, vivid, shared angle
- must contain 5-10 individually interesting items
- should feel retellable, concrete, and somewhat rare or unexpected
- must NOT read like a school summary, generic trivia, or broad "facts about X"

Rules:
- If true and already feels like a strong CurioWire list: verdict="pass".
- If mostly plausible and potentially strong, but not fully verifiable or not sharp enough yet: verdict="rewrite".
- If dubious, misleading, generic, filler-heavy, or clearly weak: verdict="fail".
- Rewrites MUST NOT add new names, dates, numbers, institutions, or claims unless already present.
- Rewrites may tighten title/theme/angle/item wording, but must preserve the same basic list.
- Keep anchor_entity + topic_tag consistent; do not introduce new ones.

Also score honestly:
THEME:
- theme_novelty_score
- theme_retellability_score
- theme_specificity_score
- theme_generic_risk

EACH ITEM:
- wow_score
- novelty_score
- retellability_score
- specificity_score
- generic_fact_risk

Return JSONL, exactly one object per input:
{
  "id": "...",
  "verdict": "pass" | "rewrite" | "fail",
  "confidence": 1-5,
  "review_note": "short reason",
  "safe_rewrite": {
    "title": "...",
    "theme": "...",
    "angle": "...",
    "items": [...]
  },
  "theme_novelty_score": 0-100,
  "theme_retellability_score": 0-100,
  "theme_specificity_score": 0-100,
  "theme_generic_risk": 0-100
}

INPUT ITEMS:
${JSON.stringify(items, null, 2)}

Return ONLY JSONL.
`.trim();
}

// ----------------------------------------------------------------------------
// DB HELPERS
// ----------------------------------------------------------------------------
async function wipeAllSuggestions() {
  console.log("🧨 WIPING curiosity_list_suggestions (full delete)...");
  const { error } = await supabase
    .from("curiosity_list_suggestions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw new Error("Wipe failed: " + error.message);
  console.log("✅ Wipe complete.");
}

async function countEligibleUnused(category) {
  const { count, error } = await supabase
    .from("curiosity_list_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("category", category)
    .eq("times_used", 0)
    .or("status.is.null,status.eq.verified");

  if (error) throw new Error("Eligible unused count failed: " + error.message);
  return count ?? 0;
}

// ----------------------------------------------------------------------------
// PHASE 1: GENERATE + INSERT (top-up)
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
  const localSeen = new Set();

  const catKey = category.toLowerCase();
  if (!anchorsUsedByCategory.has(catKey)) {
    anchorsUsedByCategory.set(catKey, new Map());
  }
  const anchorCounts = anchorsUsedByCategory.get(catKey);

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if ((r.category || "").toLowerCase() !== catKey) continue;

    const title = String(r.title || "").trim();
    const theme = String(r.theme || "").trim();
    const angle = String(r.angle || "").trim();
    const item_count = clamp(parseInt(r.item_count ?? 0, 10) || 0, 0, 100);

    const anchor_entity = String(r.anchor_entity || "").trim();
    const topic_tag = String(r.topic_tag || "").trim();
    const anchorNorm = normText(anchor_entity);
    const topicNorm = normText(topic_tag);

    if (!title || !theme || !angle || !anchor_entity || !topic_tag) continue;
    if (!anchorNorm || anchorNorm.length < 3) continue;
    if (!topicNorm || topicNorm.length < 3) continue;

    const key = `${catKey}|${anchorNorm}|${topicNorm}`;
    if (seenKey.has(key)) continue;

    const usedCount = anchorCounts.get(anchorNorm) || 0;
    if (usedCount >= ANCHOR_CAP_PER_CATEGORY) continue;

    const itemsRaw = Array.isArray(r.items) ? r.items : [];
    const items = itemsRaw
      .map((item, idx) => cleanListItem(item, idx + 1))
      .filter(Boolean);

    const localDedupKey = normText(`${title}|${theme}|${angle}`);
    if (!localDedupKey || localSeen.has(localDedupKey)) continue;
    localSeen.add(localDedupKey);

    const evaluated = evaluateListSuggestion({
      ...r,
      title,
      theme,
      angle,
      item_count,
      items,
    });

    if (!evaluated.ok) continue;

    cleaned.push({
      category: catKey,
      title,
      theme,
      angle,
      item_count,
      items: items.map((item) => ({
        position: item.position,
        title: item.title,
        curiosity: item.curiosity,
        anchor_entity: item.anchor_entity,
        topic_tag: item.topic_tag,
        verification_query: item.verification_query,
        wow_score: item.wow_score,
      })),
      wow_score: evaluated.wow,

      status: null,
      source_urls: [],
      confidence: null,
      review_note: null,

      anchor_entity,
      anchor_entity_norm: anchorNorm,
      topic_tag,
      topic_tag_norm: topicNorm,
    });

    seenKey.add(key);
    anchorCounts.set(anchorNorm, usedCount + 1);
  }

  return cleaned;
}

async function insertListSuggestions(rows) {
  if (!rows.length) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const r of rows) {
    const payload = {
      category: r.category,
      title: r.title,
      theme: r.theme,
      angle: r.angle,
      item_count: r.item_count,
      items: r.items,

      status: null,
      source_urls: [],
      wow_score: r.wow_score ?? 50,
      confidence: null,
      review_note: null,

      anchor_entity: r.anchor_entity,
      anchor_entity_norm: r.anchor_entity_norm,
      topic_tag: r.topic_tag,
      topic_tag_norm: r.topic_tag_norm,
    };

    const { error } = await supabase
      .from("curiosity_list_suggestions")
      .insert(payload);

    if (error) {
      const msg = (error.message || "").toLowerCase();

      if (
        msg.includes("duplicate key") ||
        msg.includes("already exists") ||
        msg.includes("unique")
      ) {
        skipped += 1;
        continue;
      }

      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    inserted += 1;
  }

  return { inserted, skipped };
}

// ----------------------------------------------------------------------------
// PHASE 2: URL VERIFY (Wikipedia) for status=null
// ----------------------------------------------------------------------------
async function fetchUnverifiedForWiki(limit = 500, category = null) {
  let q = supabase
    .from("curiosity_list_suggestions")
    .select(
      "id, category, title, theme, angle, item_count, items, wow_score, anchor_entity, topic_tag",
      { count: "exact" },
    )
    .is("status", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  return data || [];
}

async function fetchUnverifiedForNoUrl(limit = 500, category = null) {
  let q = supabase
    .from("curiosity_list_suggestions")
    .select(
      "id, category, title, theme, angle, item_count, items, wow_score, anchor_entity, topic_tag, confidence, review_note",
      { count: "exact" },
    )
    .is("status", null)
    .is("confidence", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  return data || [];
}

async function verifyByWikipedia(rows) {
  const updates = [];

  for (const r of rows) {
    const items = Array.isArray(r.items) ? r.items : [];
    const urls = new Set();

    let verifiedItems = 0;

    for (const item of items) {
      const query = String(
        item?.verification_query || item?.anchor_entity || item?.title || "",
      ).trim();

      if (!query) continue;

      const title = await wikiSearchTopTitle(query);
      if (!title) continue;

      const summary = await wikiGetSummary(title);
      const extract = summary?.extract || "";

      const score = keywordOverlapScore(item?.curiosity || "", extract);
      if (score < 0.08) continue;

      const url = wikiUrlFromTitle(summary?.title || title);
      if (!url) continue;

      urls.add(url);
      verifiedItems += 1;
    }

    const neededByRatio = Math.ceil(items.length * MIN_WIKI_VERIFIED_RATIO);
    const needed = Math.max(MIN_WIKI_VERIFIED_ITEMS, neededByRatio);

    if (verifiedItems >= needed) {
      updates.push({
        id: r.id,
        status: "verified",
        source_urls: [...urls].slice(0, 20),
        confidence: 5,
        review_note: null,
      });
    }

    // Otherwise: leave as NULL, not flagged
  }

  return updates;
}

async function applyUpdates(updates) {
  let ok = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("curiosity_list_suggestions")
      .update({
        status: u.status ?? null,
        source_urls: u.source_urls ?? [],
        confidence: u.confidence ?? null,
        review_note: u.review_note ?? null,
      })
      .eq("id", u.id);

    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    ok += 1;
  }
  return ok;
}

// ----------------------------------------------------------------------------
// PHASE 3: NO-URL JUDGE (LLM) + SAFE REWRITE
// ----------------------------------------------------------------------------
async function noUrlJudgeBatch(rows) {
  const prompt = buildNoUrlJudgePrompt(rows);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const judged = parseJSONL(raw);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const updates = [];

  for (const j of judged) {
    if (!j || typeof j !== "object") continue;
    const id = j.id;
    if (!id || !byId.has(id)) continue;

    const verdict = (j.verdict || "").toLowerCase().trim();
    const confidence = clamp(parseInt(j.confidence ?? 3, 10) || 3, 1, 5);

    const originalRow = byId.get(id);

    let candidate = {
      title: originalRow.title,
      theme: originalRow.theme,
      angle: originalRow.angle,
      item_count: originalRow.item_count,
      items: Array.isArray(originalRow.items)
        ? originalRow.items
            .map((item, idx) => cleanListItem(item, idx + 1))
            .filter(Boolean)
        : [],
    };

    if (
      verdict === "rewrite" &&
      j.safe_rewrite &&
      typeof j.safe_rewrite === "object"
    ) {
      candidate = {
        title: String(j.safe_rewrite.title || candidate.title).trim(),
        theme: String(j.safe_rewrite.theme || candidate.theme).trim(),
        angle: String(j.safe_rewrite.angle || candidate.angle).trim(),
        item_count: originalRow.item_count,
        items: Array.isArray(j.safe_rewrite.items)
          ? j.safe_rewrite.items
              .map((item, idx) => cleanListItem(item, idx + 1))
              .filter(Boolean)
          : candidate.items,
      };
    }

    const themeScoresInjected = {
      ...candidate,
      theme_novelty_score: clamp(
        parseInt(j.theme_novelty_score ?? 50, 10) || 50,
        0,
        100,
      ),
      theme_retellability_score: clamp(
        parseInt(j.theme_retellability_score ?? 50, 10) || 50,
        0,
        100,
      ),
      theme_specificity_score: clamp(
        parseInt(j.theme_specificity_score ?? 50, 10) || 50,
        0,
        100,
      ),
      theme_generic_risk: clamp(
        parseInt(j.theme_generic_risk ?? 50, 10) || 50,
        0,
        100,
      ),
    };

    const evaluated = evaluateListSuggestion(themeScoresInjected);
    const evalReason = evaluated.ok ? "" : evaluated.reason || "";
    const reviewNote = String(j.review_note || evalReason || "").slice(0, 240);

    // Strong -> verified
    if (
      (verdict === "pass" || verdict === "rewrite") &&
      confidence >= MIN_CONFIDENCE_TO_VERIFY &&
      evaluated.ok
    ) {
      updates.push({
        id,
        status: "verified",
        confidence,
        wow_score: evaluated.wow,
        review_note: null,
        title: candidate.title,
        theme: candidate.theme,
        angle: candidate.angle,
        items: candidate.items.map((item) => ({
          position: item.position,
          title: item.title,
          curiosity: item.curiosity,
          anchor_entity: item.anchor_entity,
          topic_tag: item.topic_tag,
          verification_query: item.verification_query,
          wow_score: item.wow_score,
        })),
      });
      continue;
    }

    // Plausible / salvageable / promising -> keep NULL
    if (evaluated.ok && confidence >= NULL_STATUS_MIN_CONFIDENCE) {
      updates.push({
        id,
        status: null,
        confidence,
        wow_score: evaluated.wow,
        review_note: reviewNote || "needs_article_level_factcheck",
        title: candidate.title,
        theme: candidate.theme,
        angle: candidate.angle,
        items: candidate.items.map((item) => ({
          position: item.position,
          title: item.title,
          curiosity: item.curiosity,
          anchor_entity: item.anchor_entity,
          topic_tag: item.topic_tag,
          verification_query: item.verification_query,
          wow_score: item.wow_score,
        })),
      });
      continue;
    }

    // Soft editorial failures -> keep NULL, do not kill inventory
    if (shouldKeepNullFromReason(evalReason)) {
      updates.push({
        id,
        status: null,
        confidence,
        wow_score: originalRow.wow_score ?? 50,
        review_note:
          reviewNote || evalReason || "needs_article_level_factcheck",
      });
      continue;
    }

    // Truly weak / structural / clearly bad -> flagged
    if (
      shouldHardFlagFromReason(evalReason) ||
      (verdict === "fail" &&
        confidence >= MIN_CONFIDENCE_TO_VERIFY &&
        !evaluated.ok)
    ) {
      updates.push({
        id,
        status: "flagged",
        confidence,
        wow_score: originalRow.wow_score ?? 50,
        review_note: reviewNote || evalReason || "no_url_judge_fail",
      });
      continue;
    }

    // Default fallback: keep NULL
    updates.push({
      id,
      status: null,
      confidence,
      wow_score: originalRow.wow_score ?? 50,
      review_note: reviewNote || "unresolved_keep_for_article_check",
    });
  }

  return updates;
}

async function applyNoUrlUpdates(updates) {
  let ok = 0;
  for (const u of updates) {
    const patch = {
      status: Object.prototype.hasOwnProperty.call(u, "status")
        ? u.status
        : null,
      confidence: u.confidence ?? null,
      wow_score: u.wow_score ?? 50,
      review_note: u.review_note ?? null,
    };

    if (u.title) patch.title = u.title;
    if (u.theme) patch.theme = u.theme;
    if (u.angle) patch.angle = u.angle;
    if (u.items) patch.items = u.items;

    const { error } = await supabase
      .from("curiosity_list_suggestions")
      .update(patch)
      .eq("id", u.id);

    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    ok += 1;
  }
  return ok;
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  console.log("🔧 generateListSuggestions.v1.3.js");
  console.log("   model:", MODEL);
  console.log("   categories:", CATEGORIES.join(", "));
  console.log("   MIN_WOW_TO_KEEP:", MIN_WOW_TO_KEEP);
  console.log("   MIN_THEME_NOVELTY_SCORE:", MIN_THEME_NOVELTY_SCORE);
  console.log("   MIN_THEME_RETELL_SCORE:", MIN_THEME_RETELL_SCORE);
  console.log("   MIN_THEME_SPECIFICITY_SCORE:", MIN_THEME_SPECIFICITY_SCORE);
  console.log("   MAX_THEME_GENERIC_RISK:", MAX_THEME_GENERIC_RISK);
  console.log("   WIPE_BEFORE_REFILL:", WIPE_BEFORE_REFILL);
  console.log(
    "   TARGET is UNUSED inventory (times_used=0), eligible status NULL/verified (not flagged)",
  );

  if (WIPE_BEFORE_REFILL) {
    await wipeAllSuggestions();
  }

  let seenKey = new Set();
  let anchorsUsedByCategory = new Map();

  if (!WIPE_BEFORE_REFILL) {
    const preload = await preloadExistingState();
    seenKey = preload.seenKey;
    anchorsUsedByCategory = preload.anchorsUsedByCategory;
  }

  console.log("\n=== PHASE 1: GENERATE + INSERT (TOP-UP UNUSED) ===");

  for (const category of CATEGORIES) {
    const targetUnused = TARGET_BY_CATEGORY[category];
    const haveUnusedEligible = await countEligibleUnused(category);
    const missing = Math.max(0, targetUnused - haveUnusedEligible);

    console.log(
      `\n--- CATEGORY: ${category.toUpperCase()} (targetUnused=${targetUnused}, haveUnusedEligible=${haveUnusedEligible}, missing=${missing}) ---`,
    );

    if (missing === 0) {
      console.log("✅ No top-up needed (unused eligible inventory is full).");
      continue;
    }

    let filled = 0;
    let totalSkipped = 0;
    let safety = 0;

    while (filled < missing && safety < TOPUP_PASSES) {
      safety += 1;

      const remaining = missing - filled;
      const ask = Math.min(
        GEN_BATCH,
        Math.max(1, Math.ceil(remaining * ASK_MULTIPLIER)),
      );

      const anchorCounts = anchorsUsedByCategory.get(category) || new Map();

      const avoidAnchors = [...anchorCounts.entries()]
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 120)
        .map(([anchor]) => anchor);

      console.log(
        `🧠 gen pass ${safety}: need=${remaining}, asking=${ask}... (avoidAnchors=${avoidAnchors.length})`,
      );

      const batch = await generateForCategory({
        category,
        askCount: ask,
        avoidAnchors,
        minWow: MIN_WOW_TO_KEEP,
        seenKey,
        anchorsUsedByCategory,
      });

      if (!batch.length) {
        console.log("…no usable items in this pass (all filtered).");
        continue;
      }

      const { inserted, skipped } = await insertListSuggestions(shuffle(batch));
      filled += inserted;
      totalSkipped += skipped;

      console.log(
        `✅ pass ${safety}: inserted=${inserted}, skipped(dupes)=${skipped}, filled=${filled}/${missing}`,
      );
    }

    console.log(
      `🏁 ${category}: topped-up inserted=${filled}/${missing}, dupesSkipped=${totalSkipped}`,
    );
  }

  console.log("\n=== PHASE 2: URL VERIFY (WIKIPEDIA) ===");

  let urlVerifiedTotal = 0;
  let stalls = 0;

  while (true) {
    const candidates = await fetchUnverifiedForWiki(URL_VERIFY_BATCH);
    if (!candidates.length) break;

    console.log(`🔎 URL-verify batch: ${candidates.length} candidates...`);
    const updates = await verifyByWikipedia(candidates);

    if (!updates.length) {
      stalls += 1;
      console.log(
        `…no URL-verifications in this batch. stall=${stalls}/${URL_VERIFY_MAX_STALLS}`,
      );
      if (stalls >= URL_VERIFY_MAX_STALLS) break;
      continue;
    }

    stalls = 0;
    const applied = await applyUpdates(updates);
    urlVerifiedTotal += applied;

    console.log(
      `✅ URL-verified + updated: ${applied} (total=${urlVerifiedTotal})`,
    );
  }

  console.log(`🏁 URL verified total: ${urlVerifiedTotal}`);

  console.log("\n=== PHASE 3: NO-URL JUDGE + SAFE REWRITE ===");

  let noUrlVerified = 0;
  let keptNull = 0;
  let flagged = 0;
  let loops = 0;

  while (true) {
    loops += 1;
    const remaining = await fetchUnverifiedForNoUrl(NOURL_VERIFY_BATCH);
    if (!remaining.length) break;

    console.log(`🧪 No-URL judge batch: ${remaining.length}...`);

    const updates = await noUrlJudgeBatch(remaining);
    if (!updates.length) {
      console.log("…no decisions returned; stopping to avoid a loop.");
      break;
    }

    const applied = await applyNoUrlUpdates(updates);

    for (const u of updates) {
      if (u.status === "verified") noUrlVerified += 1;
      else if (u.status === "flagged") flagged += 1;
      else keptNull += 1;
    }

    console.log(
      `✅ applied ${applied} updates (verified+${noUrlVerified}, kept-null+${keptNull}, flagged+${flagged})`,
    );

    if (loops > 300) break;
  }

  console.log("\n🎉 DONE.");
  console.log("URL-verified:", urlVerifiedTotal);
  console.log("No-URL verified:", noUrlVerified);
  console.log("Kept as null:", keptNull);
  console.log("Flagged:", flagged);
}

main().catch((err) => {
  console.error("💥 generateListSuggestions.v1.3.js failed:", err);
  process.exit(1);
});
