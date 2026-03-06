// ============================================================================
// CurioWire — generateCuriositySuggestions.v2.js
// Goal: Generate HIGH-WOW "curiosity suggestions" with strong anti-duplication.
//
// ✅ Top-up mode (NO WIPE) by default
// ✅ Top-up targets UNUSED inventory only: times_used = 0
// ✅ Eligible inventory for the "unused quota": status IS NULL OR status='verified' (but NOT 'flagged')
// ✅ Prefills dedupe state from DB so repeated runs keep improving without repeats
// ✅ Enforces: category + anchor_entity_norm + topic_tag_norm uniqueness (in DB + in-memory)
// ✅ Soft caps how often the same anchor can appear per category
// ✅ Verifies via Wikipedia when possible, then LLM judge+rewrite for the rest
//
// v2.1 — unused-aware top-up (times_used=0) + allow status NULL/verified, exclude flagged
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MODEL = process.env.CURIO_SUGGESTIONS_MODEL || "gpt-4o-mini";

// ✅ Top-up mode (NO WIPE)
const WIPE_BEFORE_REFILL = false;

// Enforce “wow-only” population
const MIN_WOW_TO_KEEP = parseInt(process.env.CURIO_MIN_WOW ?? "75", 10);

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

// How many to ask for per model call (keep moderate to avoid JSONL issues)
const GEN_BATCH = 60;

// Max “top-up” passes per category if we don’t get enough unique items
const TOPUP_PASSES = 12;

// Verification batching
const URL_VERIFY_BATCH = 60;
const NOURL_VERIFY_BATCH = 30;

// No-URL judge threshold
const MIN_CONFIDENCE_TO_VERIFY = 4;

// Wikipedia phase: avoid getting stuck in infinite loops when no progress
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

if (!supabaseUrl)
  throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

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

// Explicitly block theme sentences (too generic / no mechanism)
function looksLikeThemeSentence(s) {
  const t = (s || "").toLowerCase();
  if (!t) return true;

  if (
    /(remains a mystery|continues to mystify|mystif(y|ies)|researchers have theories|theories range|is debated|debated among|purpose.*unknown)/i.test(
      s,
    )
  ) {
    return true;
  }

  if (/(it is believed|it is thought|many believe|some believe)/i.test(s)) {
    if (
      !/(only when|because|due to|in (the|a) (experiment|study|trial|test)|under (certain|specific) conditions)/i.test(
        s,
      )
    ) {
      return true;
    }
  }

  const hasConstraintCue =
    /(only when|because|due to|under |in (the|a) (experiment|study|trial|test)|from (the|a) archive|measurement limit|detection threshold|signal.*only|works.*only)/i.test(
      s,
    );

  if (!hasConstraintCue) return true;

  return false;
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
// NEW: Preload state so repeated runs avoid duplicates
// ----------------------------------------------------------------------------
async function preloadExistingState() {
  console.log("📦 Preloading existing suggestions for dedupe state...");

  // NOTE: We include flagged too, so we do NOT re-generate the same bad items.
  // If you WANT flagged items to be allowed again in future, filter them out here.
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

    // Track anchor usage counts across *all* rows (including flagged and used)
    // so we don't over-cluster around one anchor across runs.
    const anchorCounts = anchorsUsedByCategory.get(category);
    if (anchorNorm) {
      anchorCounts.set(anchorNorm, (anchorCounts.get(anchorNorm) || 0) + 1);
    }

    // Dedupe key requires both anchor + topic to exist
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
- Do NOT output or closely paraphrase: aphantasia, rubber hand illusion, petrichor “smell rain”, Mandela effect,
  “we use 10% of our brain”, hot-water-freezes-faster, “honey never spoils”, “bananas are radioactive”,
  generic “octopus intelligence”, generic “tardigrades survive space”.
- If it feels like a top-10 fun fact, discard it and create a different one.
`.trim();

  if (category === "history") {
    return `
${COMMON_BANS}

HISTORY STYLE:
- Prefer obscure-but-real archival details, procedural quirks, disputed paperwork outcomes (but with concrete constraint).
- One sentence must include: (Anchor) + (Twist) + (Constraint/Mechanism).
- Avoid theme phrasing ("purpose debated", "mystifies researchers").
- Avoid fragile exact years unless uncontested.
`.trim();
  }

  if (category === "crime") {
    return `
${COMMON_BANS}

CRIME STYLE:
- Real cases / forensic edge-cases / investigative or legal constraints.
- No gore. No instructions.
- Avoid private individuals. Prefer famous public cases or general forensic phenomena.
- Must be concrete: include a specific mechanism/constraint (evidence limitation, mis-ID mode, procedural twist).
`.trim();
  }

  if (category === "mystery") {
    return `
${COMMON_BANS}

MYSTERY STYLE:
- Unresolved puzzles allowed ONLY if tied to a concrete constraint (missing record, measurement limit, contradictory evidence).
- No "X remains a mystery" theme sentences.
`.trim();
  }

  if (category === "health") {
    return `
${COMMON_BANS}

HEALTH STYLE:
- Established phenomena only. No medical advice.
- No "cures/prevents" certainty.
- Must be concrete: effect + surprising constraint.
`.trim();
  }

  if (category === "products") {
    return `
${COMMON_BANS}

PRODUCTS STYLE:
- Focus on specific products/standards/patents/quirks that are verifiable (named model line, standard, patent, recall, materials).
- No affiliate language, no buying advice, no pricing.
- Must include: anchor + twist + constraint/mechanism (regulation, test method, failure mode, design constraint).
`.trim();
  }

  return `
${COMMON_BANS}

GENERAL STYLE:
- Must be concrete: Anchor + Twist + Constraint/Mechanism.
- No theme sentences, no vague "experts say".
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

Goal: viral, shocking-but-true micro-claims for a short card or short video.
Each item MUST be a single concrete WOW-CLAIM (not a theme sentence).

${buildCategoryStyleRules(category)}

NOVELTY REQUIREMENTS:
- Avoid over-covered topics and headline-level summaries.
- Prefer overlooked "edge details": weird constraints, protocol quirks, unexpected causes, legal/technical corner cases.
- If it sounds like something most people already know, discard it and generate a different one.

AVOID THESE OVERUSED ANCHORS (do not use these as the main anchor):
${avoidAnchors.length ? avoidAnchors.map((a) => `- ${a}`).join("\n") : "- (none)"}

ABSOLUTE BAN (NO THEME SENTENCES):
- Do NOT write: "remains a mystery", "researchers have theories", "continues to mystify", "is debated"
  (unless paired with a HARD constraint/mechanism in the SAME sentence).

REQUIRED CLAIM FORMAT (stored as "curiosity"):
- ONE sentence, max 220 characters.
- Must include ALL 3 components:
  1) ANCHOR: a specific named thing (case/person/object/term/experiment/standard/patent/dataset/institution)
  2) TWIST: the surprising property/outcome
  3) CONSTRAINT/MECHANISM: "only when..." / "because..." / "due to..." / "in X test..." / "under Y condition..."
- If you cannot include all 3, DO NOT output the item.

TRUTH SAFETY:
- Only propose claims that are broadly true and defensible.
- If correctness depends on a specific number/date, omit the number or soften wording.
- No "always/never/proved/definitely". No vague authority fillers ("scientists say").

OUTPUT (JSONL, exactly ${count} lines):
Each line MUST be a JSON object:
{
  "category": "${category}",
  "curiosity": "ONE sentence concrete wow-claim (<=220 chars)",
  "wow_score": ${minWow}-100,
  "verification_query": "2-8 words, prefer proper noun/term",
  "anchor_entity": "short anchor name (person/case/object/term/standard)",
  "topic_tag": "short tag for the specific detail (not the general topic)"
}

Important:
- "anchor_entity" and "topic_tag" MUST be short (2-8 words).
- "topic_tag" must be about the specific surprising detail, not "biography", "case", "history", etc.

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
Judge if each item is (A) broadly true AND (B) concrete (not a theme sentence).

Concrete definition:
- Must include: a specific anchor + a surprising twist + a constraint/mechanism ("only when/because/due to/in X test...").

Rules:
- If likely true but too vague/theme-y OR too strong: verdict="rewrite" with a MORE CONCRETE safe_rewrite.
- If true and already concrete: verdict="pass".
- If dubious/misleading/unverifiable as a claim: verdict="fail".
- Rewrites MUST NOT add new names/dates/numbers/institutions unless already present.
- Rewrites must be ONE sentence <= 220 chars and remove theme phrasing.
- If you cannot rewrite without adding new facts, choose "fail".
- Keep anchor_entity + topic_tag consistent; do not introduce new ones.

Return JSONL, exactly one object per input:
{
  "id": "...",
  "verdict": "pass" | "rewrite" | "fail",
  "confidence": 1-5,
  "safe_rewrite": "..." (only if verdict="rewrite"),
  "wow_score": 0-100
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
    // safeguard "delete all"
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw new Error("Wipe failed: " + error.message);
  console.log("✅ Wipe complete.");
}

// ✅ Count UNUSED inventory (times_used=0) that is eligible: status NULL or verified (NOT flagged)
async function countEligibleUnused(category) {
  // We want: category=... AND times_used=0 AND (status IS NULL OR status='verified')
  const { count, error } = await supabase
    .from("curiosity_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("category", category)
    .eq("times_used", 0)
    .or("status.is.null,status.eq.verified"); // excludes flagged automatically

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
    temperature: 0.7,
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
    if (looksLikeListicleOrFiller(curiosity)) continue;
    if (looksLikeThemeSentence(curiosity)) continue;

    const wow = clamp(parseInt(r.wow_score ?? 50, 10) || 50, 0, 100);
    if (wow < minWow) continue;

    const anchor_entity = String(r.anchor_entity || "").trim();
    const topic_tag = String(r.topic_tag || "").trim();
    const verification_query = String(r.verification_query || "").trim();

    const anchorNorm = normText(anchor_entity);
    const topicNorm = normText(topic_tag);

    if (!anchorNorm || anchorNorm.length < 3) continue;
    if (!topicNorm || topicNorm.length < 3) continue;

    // ✅ hard dedupe key (category + anchor + topic)
    const key = `${catKey}|${anchorNorm}|${topicNorm}`;
    if (seenKey.has(key)) continue;

    // ✅ local dedupe on curiosity sentence too (just in this batch)
    const curKey = normText(curiosity);
    if (!curKey || curKey.length < 10) continue;
    if (localSeenCuriosity.has(curKey)) continue;
    localSeenCuriosity.add(curKey);

    // ✅ anchor cap per category
    const usedCount = anchorCounts.get(anchorNorm) || 0;
    if (usedCount >= ANCHOR_CAP_PER_CATEGORY) continue;

    cleaned.push({
      category: catKey,
      curiosity,
      wow_score: wow,

      // starts unverified
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

    // optimistic reservation (prevents repeats within same run)
    seenKey.add(key);
    anchorCounts.set(anchorNorm, usedCount + 1);
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

      // ✅ dedupe metadata (requires columns in table)
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
    .select("id, category, curiosity, wow_score", { count: "exact" })
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
    temperature: 0.2,
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
    const wow = clamp(parseInt(j.wow_score ?? 50, 10) || 50, 0, 100);
    const rewrite = (j.safe_rewrite || "").trim();

    const original = byId.get(id)?.curiosity || "";

    if (verdict === "pass" && confidence >= MIN_CONFIDENCE_TO_VERIFY) {
      if (wow < MIN_WOW_TO_KEEP) continue;
      if (looksLikeThemeSentence(original)) {
        updates.push({
          id,
          status: "flagged",
          confidence,
          wow_score: wow,
          review_note: "no_url_pass_but_theme_sentence",
          curiosity: null,
        });
        continue;
      }

      updates.push({
        id,
        status: "verified",
        confidence,
        wow_score: wow,
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
      if (
        looksLikeListicleOrFiller(rewrite) ||
        looksLikeThemeSentence(rewrite)
      ) {
        updates.push({
          id,
          status: "flagged",
          confidence,
          wow_score: wow,
          review_note: "rewrite_failed_quality_or_theme_gate",
          curiosity: null,
        });
        continue;
      }

      if (wow < MIN_WOW_TO_KEEP) {
        updates.push({
          id,
          status: "flagged",
          confidence,
          wow_score: wow,
          review_note: "rewrite_below_min_wow",
          curiosity: null,
        });
        continue;
      }

      updates.push({
        id,
        status: "verified",
        confidence,
        wow_score: wow,
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
        wow_score: wow,
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
  console.log("🔧 generateCuriositySuggestions.v2.js");
  console.log("   model:", MODEL);
  console.log("   categories:", CATEGORIES.join(", "));
  console.log("   MIN_WOW_TO_KEEP:", MIN_WOW_TO_KEEP);
  console.log("   WIPE_BEFORE_REFILL:", WIPE_BEFORE_REFILL);
  console.log(
    "   TARGET is UNUSED inventory (times_used=0), eligible status NULL/verified (not flagged)",
  );

  // Optional wipe (off by default)
  if (WIPE_BEFORE_REFILL) {
    await wipeAllSuggestions();
  }

  // Preload dedupe state (critical for multi-run top-ups)
  let seenKey = new Set();
  let anchorsUsedByCategory = new Map();

  if (!WIPE_BEFORE_REFILL) {
    const preload = await preloadExistingState();
    seenKey = preload.seenKey;
    anchorsUsedByCategory = preload.anchorsUsedByCategory;
  }

  // ------------------------------------------------------------
  // PHASE 1: Generate + Insert (TOP-UP to target UNUSED)
  // ------------------------------------------------------------
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

      // ✅ tell model to avoid overused anchors (top 120)
      const avoidAnchors = [...anchorCounts.entries()]
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 120) // ✅ requested
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

  // ------------------------------------------------------------
  // PHASE 2: Wikipedia URL verify for status=null
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // PHASE 3: No-URL judge for remaining status=null
  // ------------------------------------------------------------
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
  console.error("💥 generateCuriositySuggestions.v2.js failed:", err);
  process.exit(1);
});
