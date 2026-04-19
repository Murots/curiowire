// ============================================================================
// scripts/generateQuoteSuggestions.js — CurioWire QUOTES v1
// Goal: Generate and verify real quote suggestions with strong anti-duplication,
// strict anti-fabrication, and category-balanced inventory.
//
// Flow:
// 1) Top-up quote_suggestions per category
// 2) Strong dedupe in-memory + DB-aware
// 3) Verify EVERY unverified quote via web-search model pass
//
// Notes:
// - Quotes are more fragile than normal curiosities, so this script does NOT
//   rely on Wikipedia-only verification or no-URL fallback.
// - Every surviving quote is judged with web search for:
//   * attribution
//   * wording fidelity
//   * historical/contextual plausibility
//   * editorial usefulness as an article seed
//
// Assumption:
// - public.quote_suggestions.category supports the same 12 categories used by
//   the rest of CurioWire: science, technology, space, nature, health,
//   history, culture, sports, products, world, crime, mystery
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MODEL = process.env.CURIO_QUOTES_MODEL || "gpt-5-mini";
const VERIFY_MODEL = process.env.FACTCHECK_MODEL || "gpt-5";

const WIPE_BEFORE_REFILL = false;

// Minimum stored wow threshold
const MIN_WOW_TO_KEEP = parseInt(process.env.QUOTE_MIN_WOW ?? "74", 10);

// Internal editorial thresholds
const MIN_SIGNIFICANCE_SCORE = parseInt(
  process.env.QUOTE_MIN_SIGNIFICANCE ?? "70",
  10,
);
const MIN_RECOGNITION_SCORE = parseInt(
  process.env.QUOTE_MIN_RECOGNITION ?? "64",
  10,
);
const MIN_CONTEXT_SCORE = parseInt(process.env.QUOTE_MIN_CONTEXT ?? "62", 10);
const MAX_MISATTRIBUTION_RISK = parseInt(
  process.env.QUOTE_MAX_MISATTRIBUTION_RISK ?? "28",
  10,
);

// Target counts = UNUSED verified/null inventory by category
const TARGET_BY_CATEGORY = {
  history: 30,
  science: 30,
  culture: 30,
  world: 25,
  technology: 20,
  sports: 20,
  health: 20,
  space: 15,
  crime: 15,
  mystery: 15,
  products: 10,
  nature: 10,
};

const CATEGORIES = Object.keys(TARGET_BY_CATEGORY);

// Generation
const GEN_BATCH = 40;
const TOPUP_PASSES = 12;
const ASK_MULTIPLIER = Number(process.env.QUOTE_ASK_MULT ?? "1.8");

// Verification
const VERIFY_BATCH = 8;
const VERIFY_MAX_LOOPS = 400;

// Anti-repeat
const SPEAKER_CAP_PER_CATEGORY = parseInt(
  process.env.QUOTE_SPEAKER_CAP ?? "4",
  10,
);

// ----------------------------------------------------------------------------
// SUPABASE
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
  return String(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .map(safeJsonParse)
    .filter(Boolean);
}

function normText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[“”‘’"]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normQuoteText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[“”‘’"]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function splitIntoChunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function uniqueHttpUrls(values = []) {
  return [
    ...new Set(
      values
        .map((x) => String(x || "").trim())
        .filter((x) => /^https?:\/\/\S+$/i.test(x)),
    ),
  ].slice(0, 3);
}

function looksGenericSpeaker(s) {
  const t = normText(s);
  return (
    !t ||
    t.length < 3 ||
    [
      "unknown",
      "anonymous",
      "none",
      "nobody",
      "various",
      "multiple people",
      "many people",
      "author unknown",
      "unattributed",
    ].includes(t)
  );
}

function looksLikeWeakContext(s) {
  const t = normText(s);
  if (!t) return true;

  return [
    "famous quote",
    "well known quote",
    "historical quote",
    "speech",
    "during a speech",
    "in a speech",
    "said this once",
    "widely remembered quote",
  ].includes(t);
}

function looksLikeBadQuoteText(s) {
  const t = String(s || "").trim();
  if (!t) return true;
  if (t.length < 8) return true;
  if (t.length > 260) return true;

  const lower = t.toLowerCase();

  if (/^(did you know|fun fact|quote:)/i.test(t)) return true;
  if (/(lorem ipsum|chatgpt|openai)/i.test(lower)) return true;
  if (/(always|never|definitely|proved)/i.test(lower)) return true;

  return false;
}

function looksLikeWeakTopicTag(s) {
  const t = normText(s);
  if (!t || t.length < 3) return true;

  return [
    "quote",
    "speech",
    "history",
    "person",
    "famous quote",
    "famous speech",
    "legacy",
    "words",
    "saying",
    "statement",
  ].includes(t);
}

function computeCompositeWow({
  significance = 50,
  recognition = 50,
  contextRichness = 50,
  misattributionRisk = 50,
}) {
  const wow =
    significance * 0.38 +
    recognition * 0.24 +
    contextRichness * 0.26 +
    (100 - misattributionRisk) * 0.12;

  return clamp(Math.round(wow), 0, 100);
}

function extractInternalScores(obj) {
  const significance = clamp(
    parseInt(obj.significance_score ?? 50, 10) || 50,
    0,
    100,
  );
  const recognition = clamp(
    parseInt(obj.recognition_score ?? 50, 10) || 50,
    0,
    100,
  );
  const contextRichness = clamp(
    parseInt(obj.context_richness_score ?? 50, 10) || 50,
    0,
    100,
  );
  const misattributionRisk = clamp(
    parseInt(obj.misattribution_risk ?? 50, 10) || 50,
    0,
    100,
  );

  return {
    significance,
    recognition,
    contextRichness,
    misattributionRisk,
  };
}

function passesInternalScoreThresholds(scores) {
  if (scores.significance < MIN_SIGNIFICANCE_SCORE) return false;
  if (scores.recognition < MIN_RECOGNITION_SCORE) return false;
  if (scores.contextRichness < MIN_CONTEXT_SCORE) return false;
  if (scores.misattributionRisk > MAX_MISATTRIBUTION_RISK) return false;
  return true;
}

function editorialRejectReason({
  quoteText,
  speaker,
  quoteContext,
  topicTag,
  scores = null,
}) {
  if (looksLikeBadQuoteText(quoteText)) return "bad_quote_text";
  if (looksGenericSpeaker(speaker)) return "generic_speaker";
  if (looksLikeWeakContext(quoteContext)) return "weak_context";
  if (looksLikeWeakTopicTag(topicTag)) return "weak_topic_tag";

  if (scores && !passesInternalScoreThresholds(scores)) {
    if (scores.misattributionRisk > MAX_MISATTRIBUTION_RISK) {
      return "high_misattribution_risk";
    }
    if (scores.significance < MIN_SIGNIFICANCE_SCORE) {
      return "low_significance";
    }
    if (scores.recognition < MIN_RECOGNITION_SCORE) {
      return "low_recognition";
    }
    if (scores.contextRichness < MIN_CONTEXT_SCORE) {
      return "low_context_richness";
    }
    return "failed_internal_scores";
  }

  return null;
}

// ----------------------------------------------------------------------------
// PRELOAD STATE
// ----------------------------------------------------------------------------
async function preloadExistingState() {
  console.log("📦 Preloading existing quote suggestions for dedupe state...");

  const { data, error } = await supabase
    .from("quote_suggestions")
    .select(
      "category, status, speaker_norm, quote_text_norm, topic_tag_norm, times_used",
    );

  if (error) {
    throw new Error(
      "Failed to preload existing quote suggestions: " + error.message,
    );
  }

  const seenSpeakerQuote = new Set();
  const seenSpeakerTopic = new Set();
  const speakersUsedByCategory = new Map();

  for (const row of data || []) {
    const category = String(row.category || "").toLowerCase();
    const speakerNorm = String(row.speaker_norm || "").trim();
    const quoteNorm = String(row.quote_text_norm || "").trim();
    const topicNorm = String(row.topic_tag_norm || "").trim();

    if (!speakersUsedByCategory.has(category)) {
      speakersUsedByCategory.set(category, new Map());
    }

    const speakerCounts = speakersUsedByCategory.get(category);
    if (speakerNorm) {
      speakerCounts.set(speakerNorm, (speakerCounts.get(speakerNorm) || 0) + 1);
    }

    if (speakerNorm && quoteNorm) {
      seenSpeakerQuote.add(`${category}|${speakerNorm}|${quoteNorm}`);
    }

    if (speakerNorm && topicNorm) {
      seenSpeakerTopic.add(`${category}|${speakerNorm}|${topicNorm}`);
    }
  }

  console.log(
    `✅ Loaded ${seenSpeakerQuote.size} speaker+quote keys and ${seenSpeakerTopic.size} speaker+topic keys`,
  );

  return {
    seenSpeakerQuote,
    seenSpeakerTopic,
    speakersUsedByCategory,
  };
}

// ----------------------------------------------------------------------------
// PROMPTS
// ----------------------------------------------------------------------------
function buildCategoryStyleRules(category) {
  switch (String(category || "").toLowerCase()) {
    case "history":
      return `
HISTORY QUOTES:
- Prefer quotes spoken during war, crisis, revolution, statecraft, trial, discovery, or decisive historical turning points.
- The article value must come from why the words mattered in that moment.
`.trim();

    case "science":
      return `
SCIENCE QUOTES:
- Prefer quotes tied to discovery, theory, evidence, risk, scientific worldview, or the public meaning of a discovery.
- Avoid generic inspirational science sayings.
`.trim();

    case "technology":
      return `
TECHNOLOGY QUOTES:
- Prefer quotes tied to major inventions, computing shifts, the internet era, AI, engineering tradeoffs, famous launches, or warnings that shaped public understanding.
- Avoid generic startup motivation quotes.
`.trim();

    case "nature":
      return `
NATURE QUOTES:
- Prefer quotes from naturalists, explorers, environmental turning points, conservation, extinction, or encounters that changed public understanding of the natural world.
- Avoid generic poetic nature lines.
`.trim();

    case "health":
      return `
HEALTH QUOTES:
- Prefer quotes tied to epidemics, medicine, public health, surgery, ethics, or stark medical turning points.
- Avoid wellness slogans and generic self-help lines.
`.trim();

    case "culture":
      return `
CULTURE QUOTES:
- Prefer quotes from literature, art, music, cinema, or cultural moments that crystallized a movement, conflict, or public feeling.
- Avoid generic celebrity soundbites.
`.trim();

    case "sports":
      return `
SPORTS QUOTES:
- Prefer quotes tied to iconic matches, defeats, comebacks, scandals, rivalries, records, or legacy-defining moments.
- Avoid routine post-game clichés.
`.trim();

    case "products":
      return `
PRODUCTS QUOTES:
- Prefer quotes tied to famous products, design philosophies, launch moments, product failures, recalls, or statements that explain why a product mattered.
- Avoid marketing slogans unless the slogan itself became historically significant.
`.trim();

    case "world":
      return `
WORLD QUOTES:
- Prefer quotes tied to diplomacy, conflict, political rupture, protest, law, disaster, or global public memory.
- Avoid generic political platitudes.
`.trim();

    case "crime":
      return `
CRIME QUOTES:
- Prefer quotes tied to trials, confessions, investigations, verdicts, warnings, or statements that became inseparable from a major case.
- Avoid gore and private triviality.
`.trim();

    case "mystery":
      return `
MYSTERY QUOTES:
- Prefer quotes tied to disappearances, unexplained events, impossible-seeming cases, coded statements, or famous unresolved investigations.
- Avoid vague spooky sayings.
`.trim();

    case "space":
      return `
SPACE QUOTES:
- Prefer quotes tied to missions, launches, moon landings, catastrophe, astronaut testimony, or statements that shaped how the public imagines space.
- Avoid generic motivational space quotes.
`.trim();

    default:
      return `
QUOTE STYLE:
- Prefer famous, attributable, context-rich historical quotes whose meaning depends on the moment they were spoken.
- Avoid generic inspirational lines.
`.trim();
  }
}

function buildGenerationPrompt({ category, count, avoidSpeakers = [] }) {
  return `
You are generating CurioWire QUOTE ARTICLE suggestions for category: ${category.toUpperCase()}.

GOAL
Generate REAL, attributed, article-worthy quotes that can support a full article about:
- the quote itself
- why it mattered
- why it resonated
- the historical context around it

CORE REQUIREMENTS
Each suggestion must be:
- a REAL quote or a very widely accepted standard short form of a real quote
- attributed to a REAL speaker
- tied to a specific moment, event, speech, interview, trial, discovery, match, crisis, launch, or public context
- strong enough to support an article, not just a quote card

${buildCategoryStyleRules(category)}

DO NOT GENERATE
- fake quotes
- quotes of uncertain or anonymous origin
- generic inspirational sayings
- quotes that are only famous as internet memes
- product slogans or ad copy unless historically central and clearly attributable
- routine sports/press clichés
- broad paraphrases with no stable known wording
- duplicate or near-duplicate suggestions for the same speaker and same quote/context

AVOID THESE OVERUSED SPEAKERS IN THIS RUN
${avoidSpeakers.length ? avoidSpeakers.map((s) => `- ${s}`).join("\n") : "- (none)"}

DEDUPLICATION INTENT
- If you choose a speaker, do NOT repeat the same well-known quote if it is likely already represented elsewhere.
- Prefer one strong quote per moment/context.
- If two candidate quotes by the same speaker are extremely close in wording or context, keep only the stronger one.

QUOTE TEXT RULES
- Keep the quote text concise when possible.
- Prefer the most widely cited canonical or standard form.
- No surrounding quotation marks in the output.
- Max 220 characters.

CONTEXT RULES
- quote_context must identify the historical/public moment in one short sentence.
- It must be concrete enough that an article can explain why the quote mattered.
- Avoid empty context like "during a speech" or "in an interview".

TOPIC TAG RULE
- topic_tag must name the specific reason this quote is article-worthy.
- Examples: "wartime resolve", "civil rights march", "moon landing step", "nuclear warning", "trial confession", "product launch vision"
- Bad examples: "quote", "history", "speech", "person"

SCORING
Score each item honestly:
- wow_score
- significance_score
- recognition_score
- context_richness_score
- misattribution_risk

TRUTH SAFETY
- If you are not confident the quote is real and attributable, do NOT output it.
- If wording is uncertain, prefer a widely cited standard form.
- Do not invent date/year/source details.

OUTPUT (JSONL, exactly ${count} lines)
Each line MUST be a JSON object:
{
  "category": "${category}",
  "quote_text": "short canonical or widely cited quote text, no quote marks",
  "speaker": "speaker name",
  "quote_context": "one concrete sentence about when/where/why it was said",
  "verification_query": "2-8 words, best search query for verifying the quote",
  "topic_tag": "short specific tag",
  "wow_score": 74-100,
  "significance_score": 0-100,
  "recognition_score": 0-100,
  "context_richness_score": 0-100,
  "misattribution_risk": 0-100
}

Return ONLY JSONL. No extra text.
`.trim();
}

function buildVerificationPrompt(rows) {
  const items = rows.map((r) => ({
    id: r.id,
    category: r.category,
    quote_text: r.quote_text,
    speaker: r.speaker,
    quote_context: r.quote_context,
    topic_tag: r.topic_tag,
    wow_score: r.wow_score,
  }));

  return `
You are CurioWire's strict quote verifier.

TASK
For each candidate quote suggestion, use web search and decide whether it is:
A) a real quote or a widely accepted standard short form
B) correctly attributed
C) contextually plausible as described
D) strong enough for a quote article seed

IMPORTANT
- Be strict. Famous misattributed or shaky quotes must fail.
- A short-form quote may PASS if it is a widely recognized and defensible standard form of a longer real quote.
- If the wording is close but should be normalized into a safer canonical or widely cited form, use verdict="rewrite".
- If the speaker is wrong, or the quote is fabricated, or the context is misleading beyond safe repair, use verdict="fail".
- Do not invent new facts.
- Keep rewrites close to established public wording.
- Keep quote_context concrete and brief.
- Keep topic_tag aligned to the same story, not a new story.

SCORING
Also score the final item honestly:
- wow_score
- significance_score
- recognition_score
- context_richness_score
- misattribution_risk

SOURCE URLS
- Include 1-3 useful public URLs when you can verify the quote well.
- Prefer reference works, reputable biographies, archives, museums, universities, major media, or transcript/speech sources.
- Do not include social posts, quote farms, or meme sites.

OUTPUT
Return JSONL, exactly one object per input:
{
  "id": "...",
  "verdict": "pass" | "rewrite" | "fail",
  "confidence": 1-5,
  "quote_text": "verified or safely normalized quote text",
  "speaker": "verified speaker",
  "quote_context": "verified short context sentence",
  "topic_tag": "same or tightened topic tag",
  "wow_score": 0-100,
  "significance_score": 0-100,
  "recognition_score": 0-100,
  "context_richness_score": 0-100,
  "misattribution_risk": 0-100,
  "source_urls": ["https://...", "https://..."],
  "review_note": "short reason"
}

INPUT ITEMS:
${JSON.stringify(items, null, 2)}

Return ONLY JSONL.
`.trim();
}

// ----------------------------------------------------------------------------
// DB HELPERS
// ----------------------------------------------------------------------------
async function wipeAllQuoteSuggestions() {
  console.log("🧨 WIPING quote_suggestions (full delete)...");

  const { error } = await supabase
    .from("quote_suggestions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw new Error("Wipe failed: " + error.message);
  console.log("✅ Wipe complete.");
}

async function countEligibleUnused(category) {
  const { count, error } = await supabase
    .from("quote_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("category", category)
    .eq("times_used", 0)
    .or("status.is.null,status.eq.verified");

  if (error) throw new Error("Eligible unused count failed: " + error.message);
  return count ?? 0;
}

// ----------------------------------------------------------------------------
// PHASE 1: GENERATE + INSERT
// ----------------------------------------------------------------------------
async function generateForCategory({
  category,
  askCount,
  avoidSpeakers = [],
  seenSpeakerQuote,
  seenSpeakerTopic,
  speakersUsedByCategory,
}) {
  const prompt = buildGenerationPrompt({
    category,
    count: askCount,
    avoidSpeakers,
  });

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const cleaned = [];
  const localSeenQuote = new Set();
  const rejectStats = new Map();

  const catKey = category.toLowerCase();
  if (!speakersUsedByCategory.has(catKey)) {
    speakersUsedByCategory.set(catKey, new Map());
  }
  const speakerCounts = speakersUsedByCategory.get(catKey);

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if ((r.category || "").toLowerCase() !== catKey) continue;

    const quoteText = safeStr(r.quote_text);
    const speaker = safeStr(r.speaker);
    const quoteContext = safeStr(r.quote_context);
    const verificationQuery = safeStr(r.verification_query);
    const topicTag = safeStr(r.topic_tag);

    if (
      !quoteText ||
      !speaker ||
      !quoteContext ||
      !verificationQuery ||
      !topicTag
    ) {
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
      quoteText,
      speaker,
      quoteContext,
      topicTag,
      scores,
    });

    if (rejectReason) {
      rejectStats.set(rejectReason, (rejectStats.get(rejectReason) || 0) + 1);
      continue;
    }

    if (computedWow < MIN_WOW_TO_KEEP) continue;
    if (wow < MIN_WOW_TO_KEEP) continue;

    const speakerNorm = normText(speaker);
    const quoteNorm = normQuoteText(quoteText);
    const topicNorm = normText(topicTag);

    if (!speakerNorm || speakerNorm.length < 3) continue;
    if (!quoteNorm || quoteNorm.length < 8) continue;
    if (!topicNorm || topicNorm.length < 3) continue;

    const dedupeKey = `${catKey}|${speakerNorm}|${quoteNorm}`;
    const topicKey = `${catKey}|${speakerNorm}|${topicNorm}`;

    if (seenSpeakerQuote.has(dedupeKey)) continue;
    if (seenSpeakerTopic.has(topicKey)) continue;

    const localQuoteKey = `${speakerNorm}|${quoteNorm}`;
    if (localSeenQuote.has(localQuoteKey)) continue;
    localSeenQuote.add(localQuoteKey);

    const usedCount = speakerCounts.get(speakerNorm) || 0;
    if (usedCount >= SPEAKER_CAP_PER_CATEGORY) continue;

    cleaned.push({
      category: catKey,
      quote_text: quoteText,
      quote_text_norm: quoteNorm,
      speaker,
      speaker_norm: speakerNorm,
      quote_context: quoteContext,
      verification_query: verificationQuery,
      topic_tag: topicTag,
      topic_tag_norm: topicNorm,
      wow_score: computedWow,

      status: null,
      source_urls: [],
      confidence: null,
      review_note: null,
    });

    seenSpeakerQuote.add(dedupeKey);
    seenSpeakerTopic.add(topicKey);
    speakerCounts.set(speakerNorm, usedCount + 1);
  }

  if (rejectStats.size) {
    console.log(
      `🧹 ${category} quote reject reasons:`,
      Object.fromEntries(rejectStats),
    );
  }

  return cleaned;
}

async function insertQuotes(rows) {
  if (!rows.length) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const r of rows) {
    const payload = {
      category: r.category,
      quote_text: r.quote_text,
      quote_text_norm: r.quote_text_norm,
      speaker: r.speaker,
      speaker_norm: r.speaker_norm,
      quote_context: r.quote_context,
      verification_query: r.verification_query,
      topic_tag: r.topic_tag,
      topic_tag_norm: r.topic_tag_norm,
      wow_score: r.wow_score,
      status: null,
      source_urls: [],
      confidence: null,
      review_note: null,
    };

    const { error } = await supabase.from("quote_suggestions").insert(payload);

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
// PHASE 2: VERIFY ALL UNVERIFIED VIA WEB SEARCH
// ----------------------------------------------------------------------------
async function fetchUnverified(limit = 500, category = null) {
  let q = supabase
    .from("quote_suggestions")
    .select(
      "id, category, quote_text, quote_text_norm, speaker, speaker_norm, quote_context, verification_query, topic_tag, topic_tag_norm, wow_score",
    )
    .is("status", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  return data || [];
}

async function verifyQuoteBatch(rows) {
  if (!rows.length) return [];

  const prompt = buildVerificationPrompt(rows);

  const resp = await openai.responses.create({
    model: VERIFY_MODEL,
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  const judged = parseJSONL(out);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const updates = [];

  for (const j of judged) {
    if (!j || typeof j !== "object") continue;

    const id = j.id;
    if (!id || !byId.has(id)) continue;

    const originalRow = byId.get(id);

    const verdict = safeStr(j.verdict).toLowerCase();
    const confidence = clamp(parseInt(j.confidence ?? 3, 10) || 3, 1, 5);

    const quoteText = safeStr(j.quote_text, originalRow.quote_text);
    const speaker = safeStr(j.speaker, originalRow.speaker);
    const quoteContext = safeStr(j.quote_context, originalRow.quote_context);
    const topicTag = safeStr(j.topic_tag, originalRow.topic_tag);

    const quoteNorm = normQuoteText(quoteText);
    const speakerNorm = normText(speaker);
    const topicNorm = normText(topicTag);

    const sourceUrls = uniqueHttpUrls(
      Array.isArray(j.source_urls) ? j.source_urls : [],
    );

    const reviewNote = safeStr(j.review_note);

    const scores = extractInternalScores(j);
    const computedWow = computeCompositeWow(scores);

    const rejectReason = editorialRejectReason({
      quoteText,
      speaker,
      quoteContext,
      topicTag,
      scores,
    });

    if (verdict === "fail") {
      updates.push({
        id,
        status: "flagged",
        confidence,
        wow_score: computedWow,
        review_note: reviewNote || "quote_verifier_fail",
        source_urls: sourceUrls,
        quote_text: null,
        quote_text_norm: null,
        speaker: null,
        speaker_norm: null,
        quote_context: null,
        topic_tag: null,
        topic_tag_norm: null,
      });
      continue;
    }

    if (!quoteText || !quoteNorm || !speaker || !speakerNorm || rejectReason) {
      updates.push({
        id,
        status: "flagged",
        confidence,
        wow_score: computedWow,
        review_note:
          reviewNote || rejectReason || "invalid_verified_quote_shape",
        source_urls: sourceUrls,
        quote_text: null,
        quote_text_norm: null,
        speaker: null,
        speaker_norm: null,
        quote_context: null,
        topic_tag: null,
        topic_tag_norm: null,
      });
      continue;
    }

    if (computedWow < MIN_WOW_TO_KEEP) {
      updates.push({
        id,
        status: "flagged",
        confidence,
        wow_score: computedWow,
        review_note: reviewNote || "below_min_wow_after_verify",
        source_urls: sourceUrls,
        quote_text: null,
        quote_text_norm: null,
        speaker: null,
        speaker_norm: null,
        quote_context: null,
        topic_tag: null,
        topic_tag_norm: null,
      });
      continue;
    }

    if (verdict !== "pass" && verdict !== "rewrite") {
      updates.push({
        id,
        status: "flagged",
        confidence,
        wow_score: computedWow,
        review_note: reviewNote || "unknown_verdict",
        source_urls: sourceUrls,
        quote_text: null,
        quote_text_norm: null,
        speaker: null,
        speaker_norm: null,
        quote_context: null,
        topic_tag: null,
        topic_tag_norm: null,
      });
      continue;
    }

    updates.push({
      id,
      status: "verified",
      confidence,
      wow_score: computedWow,
      review_note: reviewNote || null,
      source_urls: sourceUrls,
      quote_text: quoteText,
      quote_text_norm: quoteNorm,
      speaker,
      speaker_norm: speakerNorm,
      quote_context: quoteContext,
      topic_tag: topicTag,
      topic_tag_norm: topicNorm,
    });
  }

  return updates;
}

async function applyVerificationUpdates(updates) {
  let ok = 0;

  for (const u of updates) {
    const patch = {
      status: u.status ?? null,
      confidence: u.confidence ?? null,
      wow_score: u.wow_score ?? 50,
      review_note: u.review_note ?? null,
      source_urls: u.source_urls ?? [],
    };

    if (u.quote_text) patch.quote_text = u.quote_text;
    if (u.quote_text_norm) patch.quote_text_norm = u.quote_text_norm;
    if (u.speaker) patch.speaker = u.speaker;
    if (u.speaker_norm) patch.speaker_norm = u.speaker_norm;
    if (typeof u.quote_context === "string")
      patch.quote_context = u.quote_context;
    if (u.topic_tag) patch.topic_tag = u.topic_tag;
    if (u.topic_tag_norm) patch.topic_tag_norm = u.topic_tag_norm;

    const { error } = await supabase
      .from("quote_suggestions")
      .update(patch)
      .eq("id", u.id);

    if (error) {
      const msg = (error.message || "").toLowerCase();

      // If rewrite collides with an existing unique quote, just flag it.
      if (
        msg.includes("duplicate key") ||
        msg.includes("already exists") ||
        msg.includes("unique")
      ) {
        const { error: fallbackErr } = await supabase
          .from("quote_suggestions")
          .update({
            status: "flagged",
            review_note: "verified_rewrite_collided_with_existing_quote",
            confidence: u.confidence ?? null,
            wow_score: u.wow_score ?? 50,
            source_urls: u.source_urls ?? [],
          })
          .eq("id", u.id);

        if (fallbackErr) {
          throw new Error(
            `Supabase fallback update failed: ${fallbackErr.message}`,
          );
        }

        ok += 1;
        continue;
      }

      throw new Error(`Supabase update failed: ${error.message}`);
    }

    ok += 1;
  }

  return ok;
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  console.log("🔧 generateQuoteSuggestions.js");
  console.log("   model:", MODEL);
  console.log("   verify_model:", VERIFY_MODEL);
  console.log("   categories:", CATEGORIES.join(", "));
  console.log("   MIN_WOW_TO_KEEP:", MIN_WOW_TO_KEEP);
  console.log("   MIN_SIGNIFICANCE_SCORE:", MIN_SIGNIFICANCE_SCORE);
  console.log("   MIN_RECOGNITION_SCORE:", MIN_RECOGNITION_SCORE);
  console.log("   MIN_CONTEXT_SCORE:", MIN_CONTEXT_SCORE);
  console.log("   MAX_MISATTRIBUTION_RISK:", MAX_MISATTRIBUTION_RISK);
  console.log("   WIPE_BEFORE_REFILL:", WIPE_BEFORE_REFILL);
  console.log(
    "   TARGET is UNUSED inventory (times_used=0), eligible status NULL/verified (not flagged)",
  );

  if (WIPE_BEFORE_REFILL) {
    await wipeAllQuoteSuggestions();
  }

  let seenSpeakerQuote = new Set();
  let seenSpeakerTopic = new Set();
  let speakersUsedByCategory = new Map();

  if (!WIPE_BEFORE_REFILL) {
    const preload = await preloadExistingState();
    seenSpeakerQuote = preload.seenSpeakerQuote;
    seenSpeakerTopic = preload.seenSpeakerTopic;
    speakersUsedByCategory = preload.speakersUsedByCategory;
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

      const speakerCounts = speakersUsedByCategory.get(category) || new Map();

      const avoidSpeakers = [...speakerCounts.entries()]
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 120)
        .map(([speaker]) => speaker);

      console.log(
        `🧠 gen pass ${safety}: need=${remaining}, asking=${ask}... (avoidSpeakers=${avoidSpeakers.length})`,
      );

      const batch = await generateForCategory({
        category,
        askCount: ask,
        avoidSpeakers,
        seenSpeakerQuote,
        seenSpeakerTopic,
        speakersUsedByCategory,
      });

      if (!batch.length) {
        console.log("…no usable quote items in this pass (all filtered).");
        continue;
      }

      const { inserted, skipped } = await insertQuotes(shuffle(batch));
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

  console.log("\n=== PHASE 2: STRICT WEB VERIFICATION ===");

  let verified = 0;
  let flagged = 0;
  let loops = 0;

  while (true) {
    loops += 1;
    if (loops > VERIFY_MAX_LOOPS) {
      console.log("🛑 Verification loop safety stop reached.");
      break;
    }

    const remaining = await fetchUnverified(VERIFY_BATCH);
    if (!remaining.length) break;

    console.log(`🔎 Quote verify batch: ${remaining.length}...`);

    const updates = await verifyQuoteBatch(remaining);
    if (!updates.length) {
      console.log(
        "…no verification decisions returned; stopping to avoid a loop.",
      );
      break;
    }

    const applied = await applyVerificationUpdates(updates);

    for (const u of updates) {
      if (u.status === "verified") verified += 1;
      if (u.status === "flagged") flagged += 1;
    }

    console.log(
      `✅ applied ${applied} quote verification updates (verified+${verified}, flagged+${flagged})`,
    );
  }

  console.log("\n🎉 DONE.");
  console.log("Verified:", verified);
  console.log("Flagged:", flagged);
}

main().catch((err) => {
  console.error("💥 generateQuoteSuggestions.js failed:", err);
  process.exit(1);
});
