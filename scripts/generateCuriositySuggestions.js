// ============================================================================
// CurioWire — generateCuriositySuggestions.v2.4.js
// Goal: Generate HIGH-WOW "curiosity suggestions" with strong anti-duplication
// and stronger editorial quality control.
//
// ✅ Top-up mode (NO WIPE) by default
// ✅ Top-up targets UNUSED inventory only: times_used = 0
// ✅ Eligible inventory for the "unused quota": status IS NULL OR status='verified' (but NOT 'flagged')
// ✅ Prefills dedupe state from DB so repeated runs keep improving without repeats
// ✅ Enforces: category + anchor_entity_norm + topic_tag_norm uniqueness (in DB + in-memory)
// ✅ Soft caps how often the same anchor can appear per category
// ✅ Verifies via Wikipedia when possible, then LLM judge+rewrite for the rest
//
// v2.4 — technology quality upgrade:
// - Dedicated technology style rules aimed at mass-market fascinating curiosities
// - Rejects boring/niche security history and dry exploit material
// - Still allows spectacular cyber events (major hacks, ransomware, large crypto thefts, etc.)
// - Adds technology-specific editorial filters + category-specific wow threshold
// - Keeps existing generation / dedupe / verification flow intact
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MODEL = process.env.CURIO_SUGGESTIONS_MODEL || "gpt-5-mini";

// ✅ Top-up mode (NO WIPE)
const WIPE_BEFORE_REFILL = false;

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

// Technology can be held to a slightly higher editorial bar
const TECHNOLOGY_MIN_WOW_TO_KEEP = parseInt(
  process.env.CURIO_TECH_MIN_WOW ?? "80",
  10,
);

// Target counts (desired minimum UNUSED rows per category, i.e., times_used=0)
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

// Max “top-up” passes per category
const TOPUP_PASSES = 12;

// Verification batching
const URL_VERIFY_BATCH = 60;
const NOURL_VERIFY_BATCH = 30;

// No-URL judge threshold
const MIN_CONFIDENCE_TO_VERIFY = 4;

// Wikipedia phase: avoid infinite loops when no progress
const URL_VERIFY_MAX_STALLS = 3;

// Anti-repeat: soft cap how many suggestions per anchor per category
const ANCHOR_CAP_PER_CATEGORY = parseInt(
  process.env.CURIO_ANCHOR_CAP ?? "4",
  10,
);

// For top-up asking: request more than needed to offset filtering/dupes
const ASK_MULTIPLIER = Number(process.env.CURIO_ASK_MULT ?? "1.7");

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

function minWowForCategory(category) {
  const c = String(category || "").toLowerCase();
  if (c === "technology") {
    return Math.max(MIN_WOW_TO_KEEP, TECHNOLOGY_MIN_WOW_TO_KEEP);
  }
  return MIN_WOW_TO_KEEP;
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

function looksLikeBoringSecurityTech(s) {
  const t = (s || "").toLowerCase();

  return /\b(vulnerability|vulnerabilities|exploit|exploits|browser add-on|browser extension|session hijacking|cookie theft|packet sniffing|sniffing tool|unsecured network|wi-fi security|wifi security|credential theft|proof of concept|researchers found|security researcher|raised awareness|demonstration tool|browser attack|login cookie|cookie hijack)\b/i.test(
    t,
  );
}

function looksLikeSpectacularCyberEvent(s) {
  const t = (s || "").toLowerCase();

  return /\b(ransomware|worm|virus|global outage|major outage|massive breach|largest breach|millions of users|billions|stolen funds|crypto theft|crypto heist|heist|cyberheist|cyber heist|state-backed|north korea|lazarus|wannacry|notpetya|stuxnet|colonial pipeline|sony hack|exchange hack|crippled hospitals|major breach|large-scale attack|supply-chain attack|supply chain attack)\b/i.test(
    t,
  );
}

function looksLikeDryTechHistory(s) {
  const t = (s || "").toLowerCase();

  if (
    /\b(exposed a vulnerability|raised awareness|sparked concern|changed the internet|transformed online security|wake-up call)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  if (
    /\b(in \d{4}, .* tool|a browser add-on|a software tool|a security researcher|developer .* created)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  return false;
}

function looksLikeAbstractTech(s) {
  const t = (s || "").toLowerCase();

  return /\b(protocol|framework|infrastructure|backend|database engine|network stack|enterprise platform|server architecture|deployment pipeline|cloud service|authentication flow|encryption standard|identity provider|api gateway|container orchestration)\b/i.test(
    t,
  );
}

function looksLikeUnfamiliarOrNerdyTechAnchor(anchor = "", curiosity = "") {
  const a = normText(anchor);
  const c = normText(curiosity);

  if (!a && !c) return true;

  const familiarSignals = [
    "keyboard",
    "phone",
    "iphone",
    "android",
    "camera",
    "printer",
    "remote",
    "television",
    "tv",
    "screen",
    "speaker",
    "headphone",
    "earbud",
    "mouse",
    "trackpad",
    "usb",
    "wifi",
    "bluetooth",
    "emoji",
    "keyboard shortcut",
    "video game",
    "controller",
    "cassette",
    "vhs",
    "dvd",
    "cd",
    "floppy",
    "modem",
    "alarm clock",
    "smartwatch",
    "calculator",
    "camera shutter",
    "touchscreen",
    "mp3 player",
    "game boy",
    "walkman",
    "remote control",
    "flash drive",
    "router",
  ];

  return !familiarSignals.some((x) => a.includes(x) || c.includes(x));
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

function editorialRejectReason({
  category = "",
  curiosity,
  topicTag = "",
  anchorEntity = "",
  scores = null,
}) {
  if (looksLikeListicleOrFiller(curiosity)) return "listicle_or_filler";
  if (looksLikeThemeSentence(curiosity)) return "theme_sentence";
  if (looksLikeSpecOrCapabilitySentence(curiosity)) return "spec_or_capability";
  if (looksLikeBroadSummary(curiosity)) return "broad_summary";

  const categoryKey = String(category || "").toLowerCase();
  const isSpectacularCyber = looksLikeSpectacularCyberEvent(curiosity);

  if (categoryKey === "technology") {
    if (looksLikeBoringSecurityTech(curiosity) && !isSpectacularCyber) {
      return "technology_boring_security";
    }

    if (looksLikeDryTechHistory(curiosity) && !isSpectacularCyber) {
      return "technology_dry_history";
    }

    if (looksLikeAbstractTech(curiosity) && !isSpectacularCyber) {
      return "technology_abstract";
    }

    if (
      looksLikeUnfamiliarOrNerdyTechAnchor(anchorEntity, curiosity) &&
      !isSpectacularCyber
    ) {
      return "technology_unfamiliar_anchor";
    }
  }

  const topicNorm = normText(topicTag);
  if (
    /\b(battery life|performance|specifications|resolution|refresh rate|processor|features|benefits|biography|internet security|cybersecurity|browser security|privacy issue|security flaw|software tool|wireless security|session hijacking)\b/i.test(
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

  if (category === "technology") {
    return `
${COMMON_BANS}

TECHNOLOGY STYLE:
- Prefer mass-market, everyday, consumer-facing technology that ordinary people instantly recognize or can picture.
- Focus on hidden histories, strange design decisions, weird standards, accidental uses, legacy quirks, interface oddities, unusual constraints, failed formats, or unexpected consequences.
- The best technology curiosities should make a general reader think: "Wait, really?" or "I use that and never knew why."

PRIORITIZE THESE TECHNOLOGY SUBTYPES:
- hidden origins of everyday tech
- weird interface decisions
- strange symbols, sounds, icons, signals, or default settings
- legacy standards that survived for odd reasons
- failed gadgets, dead-end formats, and near-miss technologies
- accidental design wins or unintended uses
- consumer tech shaped by human behavior, habit, or misunderstanding
- physical quirks in devices people know: phones, keyboards, cameras, TVs, remotes, game controllers, printers, speakers, cars, watches, household gadgets

CYBER / HACKING RULE:
- Avoid ordinary vulnerabilities, proof-of-concept exploits, browser add-ons, old security warnings, and niche infosec history.
- Allow cyber topics ONLY when the event is spectacular, iconic, or widely consequential: massive thefts, global malware outbreaks, state-backed attacks, major breaches, or bizarre attacks with clear public impact.
- If the story would mainly interest security professionals rather than a general reader, discard it.

GOOD TECHNOLOGY CURIOSITIES FEEL LIKE:
- a weird reason something looks, sounds, or behaves the way it does
- a product or standard that survived because of habit, culture, or an old compromise
- a surprising real-world detail about a familiar device, interface, or format
- a technology that became famous for an odd limitation, side effect, or unintended use
- in cyber, a dramatic and concrete event with obvious scale, consequence, or absurdity

AVOID IN TECHNOLOGY:
- enterprise software, infrastructure, backend systems, or B2B tech
- spec-sheet facts, capability claims, feature lists, performance claims, or marketing-like product descriptions
- broad "this changed everything" tech-history summaries
- old security issues unless they were truly massive, iconic, or socially shocking

HARD FILTER:
- If the curiosity sounds like a warning, a feature description, a dry Wikipedia summary, or a niche infosec anecdote, discard it.
- Prefer things a normal reader can instantly picture, retell, and care about.
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

function buildCategoryFewShotHints(category) {
  if (category !== "technology") return "";

  return `
TECHNOLOGY EXAMPLES OF THE RIGHT FEEL:
- a familiar device kept an odd design choice for a reason most users never noticed
- a common icon, sound, or interface behavior survived long after its original technology disappeared
- a failed gadget or format left behind a habit people still use
- a product became memorable because of a strange limitation, workaround, or accidental use
- a design compromise in everyday tech shaped how millions of people still interact with devices
- a cyber event became globally notorious because the scale, absurdity, or consequence was obvious even to non-technical people

TECHNOLOGY EXAMPLES OF THE WRONG FEEL:
- old proof-of-concept attack tools
- routine vulnerabilities or niche exploits
- dry software/security history
- abstract privacy scares with no vivid real-world hook
- feature/spec/performance facts
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

${buildCategoryFewShotHints(category)}

NOVELTY REQUIREMENTS:
- Avoid over-covered topics and headline-level summaries.
- Prefer overlooked edge details: strange constraints, weird causes, procedural quirks, odd consequences, or real-world exceptions.
- If it sounds like something most people already know, discard it and generate a different one.

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
- Score harshly against generic, brochure-like, summary-like, feature-like, or warning-like output.

Return ONLY JSONL. No extra text.
Start now.
`.trim();
}

function buildNoUrlJudgePrompt(rows) {
  const items = rows.map((r) => ({
    id: r.id,
    category: r.category,
    curiosity: r.curiosity,
    wow_score: r.wow_score,
    anchor_entity: r.anchor_entity,
    topic_tag: r.topic_tag,
  }));

  return `
You are CurioWire's verifier for short "curiosity suggestions".
Judge if each item is (A) broadly true AND (B) a real curiosity, not a vague summary or generic fact.

Curiosity definition:
- Must include: a specific anchor + a surprising detail + meaningful context.
- It should feel retellable, concrete, and somewhat rare or unexpected.
- It must NOT read like a textbook line, product page, feature description, or broad explainer fact.

Extra technology rule:
- For technology, prefer mass-market, concrete, vivid, retellable curiosities.
- Reject routine vulnerabilities, dry exploit history, narrow infosec anecdotes, and warning-like copy.
- Allow spectacular cyber events only when the scale or consequence is obvious to a general reader.

Rules:
- If likely true but too vague, too generic, too summary-like, or too broad: verdict="rewrite" with a sharper safe_rewrite.
- If true and already feels like a real curiosity: verdict="pass".
- If dubious, misleading, unverifiable, or uninteresting after sharpening: verdict="fail".
- Rewrites MUST NOT add new names, dates, numbers, institutions, or claims unless already present.
- Rewrites must be ONE sentence <= 220 chars and remove generic framing.
- If you cannot rewrite without adding new facts, choose "fail".
- Keep anchor_entity + topic_tag consistent; do not introduce new ones.

Also score each final item honestly:
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
  "safe_rewrite": "..." (only if verdict="rewrite"),
  "wow_score": 0-100,
  "novelty_score": 0-100,
  "retellability_score": 0-100,
  "specificity_score": 0-100,
  "generic_fact_risk": 0-100
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
  console.log("🧨 WIPING curiosity_suggestions (full delete)...");
  const { error } = await supabase
    .from("curiosity_suggestions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw new Error("Wipe failed: " + error.message);
  console.log("✅ Wipe complete.");
}

async function countEligibleUnused(category) {
  const { count, error } = await supabase
    .from("curiosity_suggestions")
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
  const localSeenCuriosity = new Set();
  const rejectStats = new Map();

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
    const wow = clamp(
      parseInt(r.wow_score ?? computedWow, 10) || computedWow,
      0,
      100,
    );

    const rejectReason = editorialRejectReason({
      category: catKey,
      curiosity,
      topicTag: topic_tag,
      anchorEntity: anchor_entity,
      scores,
    });
    if (rejectReason) {
      rejectStats.set(rejectReason, (rejectStats.get(rejectReason) || 0) + 1);
      continue;
    }

    if (computedWow < minWow) continue;
    if (wow < minWow) continue;

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

      status: null,
      source_urls: [],
      confidence: null,
      review_note: null,

      anchor_entity,
      anchor_entity_norm: anchorNorm,
      topic_tag,
      topic_tag_norm: topicNorm,

      verification_query,
    });

    seenKey.add(key);
    anchorCounts.set(anchorNorm, usedCount + 1);
  }

  if (catKey === "technology" && rejectStats.size) {
    console.log(
      "🧹 technology reject reasons:",
      Object.fromEntries(rejectStats),
    );
  }

  return cleaned;
}

async function insertCuriosities(rows) {
  if (!rows.length) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const r of rows) {
    const payload = {
      category: r.category,
      curiosity: r.curiosity,
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
      .from("curiosity_suggestions")
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
async function fetchUnverified(limit = 500, category = null) {
  let q = supabase
    .from("curiosity_suggestions")
    .select("id, category, curiosity, wow_score, anchor_entity, topic_tag", {
      count: "exact",
    })
    .is("status", null)
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
    const curiosity = r.curiosity || "";
    const query = curiosity
      .replace(/\b(may|can|could|often|sometimes|might)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const title = await wikiSearchTopTitle(query);
    if (!title) continue;

    const summary = await wikiGetSummary(title);
    const extract = summary?.extract || "";

    const score = keywordOverlapScore(curiosity, extract);
    if (score < 0.08) continue;

    const url = wikiUrlFromTitle(summary?.title || title);
    if (!url) continue;

    updates.push({
      id: r.id,
      status: "verified",
      source_urls: [url],
      confidence: 5,
      review_note: null,
    });
  }

  return updates;
}

async function applyUpdates(updates) {
  let ok = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("curiosity_suggestions")
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
    const scores = extractInternalScores(j);
    const computedWow = computeCompositeWow(scores);
    const rewrite = (j.safe_rewrite || "").trim();

    const originalRow = byId.get(id);
    const original = originalRow?.curiosity || "";
    const topicTag = originalRow?.topic_tag || "";
    const minWowForThisRow = minWowForCategory(originalRow?.category || "");

    if (verdict === "pass" && confidence >= MIN_CONFIDENCE_TO_VERIFY) {
      if (computedWow < minWowForThisRow) continue;

      const rejectReason = editorialRejectReason({
        category: originalRow?.category || "",
        curiosity: original,
        topicTag,
        anchorEntity: originalRow?.anchor_entity || "",
        scores,
      });
      if (rejectReason) {
        updates.push({
          id,
          status: "flagged",
          confidence,
          wow_score: computedWow,
          review_note: `no_url_pass_but_${rejectReason}`,
          curiosity: null,
        });
        continue;
      }

      updates.push({
        id,
        status: "verified",
        confidence,
        wow_score: computedWow,
        review_note: null,
        curiosity: null,
      });
      continue;
    }

    if (
      verdict === "rewrite" &&
      rewrite &&
      confidence >= MIN_CONFIDENCE_TO_VERIFY
    ) {
      if (computedWow < minWowForThisRow) {
        updates.push({
          id,
          status: "flagged",
          confidence,
          wow_score: computedWow,
          review_note: "rewrite_below_min_wow",
          curiosity: null,
        });
        continue;
      }

      const rejectReason = editorialRejectReason({
        category: originalRow?.category || "",
        curiosity: rewrite,
        topicTag,
        anchorEntity: originalRow?.anchor_entity || "",
        scores,
      });
      if (rejectReason) {
        updates.push({
          id,
          status: "flagged",
          confidence,
          wow_score: computedWow,
          review_note: `rewrite_failed_${rejectReason}`,
          curiosity: null,
        });
        continue;
      }

      updates.push({
        id,
        status: "verified",
        confidence,
        wow_score: computedWow,
        review_note: null,
        curiosity: rewrite,
      });
      continue;
    }

    if (verdict === "fail") {
      updates.push({
        id,
        status: "flagged",
        confidence,
        wow_score: computedWow,
        review_note: "no_url_judge_fail",
        curiosity: null,
      });
      continue;
    }
  }

  return updates;
}

async function applyNoUrlUpdates(updates) {
  let ok = 0;
  for (const u of updates) {
    const patch = {
      status: u.status ?? null,
      confidence: u.confidence ?? null,
      wow_score: u.wow_score ?? 50,
      review_note: u.review_note ?? null,
    };

    if (u.curiosity) patch.curiosity = u.curiosity;

    const { error } = await supabase
      .from("curiosity_suggestions")
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
  console.log("🔧 generateCuriositySuggestions.v2.4.js");
  console.log("   model:", MODEL);
  console.log("   categories:", CATEGORIES.join(", "));
  console.log("   MIN_WOW_TO_KEEP:", MIN_WOW_TO_KEEP);
  console.log("   TECHNOLOGY_MIN_WOW_TO_KEEP:", TECHNOLOGY_MIN_WOW_TO_KEEP);
  console.log("   MIN_NOVELTY_SCORE:", MIN_NOVELTY_SCORE);
  console.log("   MIN_RETELL_SCORE:", MIN_RETELL_SCORE);
  console.log("   MIN_SPECIFICITY_SCORE:", MIN_SPECIFICITY_SCORE);
  console.log("   MAX_GENERIC_FACT_RISK:", MAX_GENERIC_FACT_RISK);
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
    const categoryMinWow = minWowForCategory(category);

    console.log(
      `\n--- CATEGORY: ${category.toUpperCase()} (targetUnused=${targetUnused}, haveUnusedEligible=${haveUnusedEligible}, missing=${missing}, minWow=${categoryMinWow}) ---`,
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
        minWow: categoryMinWow,
        seenKey,
        anchorsUsedByCategory,
      });

      if (!batch.length) {
        console.log("…no usable items in this pass (all filtered).");
        continue;
      }

      const { inserted, skipped } = await insertCuriosities(shuffle(batch));
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
    const candidates = await fetchUnverified(URL_VERIFY_BATCH);
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
  let flagged = 0;
  let loops = 0;

  while (true) {
    loops += 1;
    const remaining = await fetchUnverified(NOURL_VERIFY_BATCH);
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
      if (u.status === "flagged") flagged += 1;
    }

    console.log(
      `✅ applied ${applied} updates (verified+${noUrlVerified}, flagged+${flagged})`,
    );

    if (loops > 300) break;
  }

  console.log("\n🎉 DONE.");
  console.log("URL-verified:", urlVerifiedTotal);
  console.log("No-URL verified:", noUrlVerified);
  console.log("Flagged:", flagged);
}

main().catch((err) => {
  console.error("💥 generateCuriositySuggestions.v2.4.js failed:", err);
  process.exit(1);
});
