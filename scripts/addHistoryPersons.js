// ============================================================================
// CurioWire — addHistoryPersonCuriosities.js
//
// Purpose:
//   Insert NEW "curiosity_suggestions" rows ONLY for category=history,
//   and ONLY about well-known historical persons.
//
// Key properties:
// ✅ Inserts into public.curiosity_suggestions (NOT curiosity_anchors)
// ✅ No "top-up to quota" logic (does NOT care about times_used targets)
// ✅ Re-runnable; DB unique indexes prevent duplicates
// ✅ Wikipedia verification used to ensure "anchor_entity" is a real person
// ✅ Uses improved curiosity definition + editorial scoring/filtering
// ✅ Stores ONLY total wow_score in DB
// ✅ Optionally runs Wikipedia verify + LLM judge/rewrite for status=null rows it created
//
// Requirements:
// - Node 20+ (global fetch)
// - .env.local with OpenAI + Supabase service role
//
// Run:
//   node scripts/addHistoryPersons.js
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MODEL = process.env.CURIO_SUGGESTIONS_MODEL || "gpt-5-mini";

// How many NEW suggestions to successfully insert per run
const TARGET_NEW_PER_RUN = parseInt(
  process.env.HISTORY_PERSON_SUGGESTIONS_TARGET ?? "50",
  10,
);

// Oversampling batches
const PERSON_BATCH = parseInt(
  process.env.HISTORY_PERSON_PERSON_BATCH ?? "80",
  10,
);
const CURIOS_BATCH = parseInt(
  process.env.HISTORY_PERSON_CURIOS_BATCH ?? "120",
  10,
);

// Max passes so we don’t loop forever if model stalls
const PASSES_MAX = parseInt(process.env.HISTORY_PERSON_PASSES_MAX ?? "20", 10);

// Final stored wow threshold
const MIN_WOW_TO_KEEP = parseInt(process.env.CURIO_MIN_WOW ?? "78", 10);

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

const MIN_CONFIDENCE_TO_VERIFY = parseInt(
  process.env.CURIO_MIN_CONFIDENCE ?? "4",
  10,
);

// How many curiosities per person we try to generate in a single pass
const PER_PERSON = parseInt(process.env.HISTORY_PERSON_PER_PERSON ?? "1", 10);

// Avoid clustering
const AVOID_ANCHORS_TOP = parseInt(
  process.env.HISTORY_PERSON_AVOID_TOP ?? "120",
  10,
);

// Wikipedia verification
const WIKI_VERIFY_CONCURRENCY = parseInt(
  process.env.HISTORY_PERSON_WIKI_CONCURRENCY ?? "6",
  10,
);

// Optional post-processing verification of created rows
const DO_WIKI_VERIFY_CLAIMS =
  String(
    process.env.HISTORY_PERSON_DO_WIKI_VERIFY_CLAIMS ?? "true",
  ).toLowerCase() === "true";

const DO_NOURL_JUDGE =
  String(process.env.HISTORY_PERSON_DO_NOURL_JUDGE ?? "true").toLowerCase() ===
  "true";

const URL_VERIFY_BATCH = parseInt(
  process.env.HISTORY_PERSON_URL_VERIFY_BATCH ?? "60",
  10,
);
const NOURL_VERIFY_BATCH = parseInt(
  process.env.HISTORY_PERSON_NOURL_VERIFY_BATCH ?? "30",
  10,
);
const URL_VERIFY_MAX_STALLS = parseInt(
  process.env.HISTORY_PERSON_URL_VERIFY_MAX_STALLS ?? "3",
  10,
);

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
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY");
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
// HELPERS: parsing / normalization
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

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ----------------------------------------------------------------------------
// QUALITY FILTERS
// ----------------------------------------------------------------------------
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
    /(is known for|is famous for|is remembered for|is associated with|is best known for|helped|contributed to|played a role in)/i.test(
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
    /\b(offered|provided|improved|enhanced|advanced|designed for|built for|enabled)\b/i.test(
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
    /\b(is known to|is widely known|is widely remembered|is often cited as)\b/i.test(
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
    /\b(biography|legacy|career|rise to power|military leadership|politics|reign|achievements|wars)\b/i.test(
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
// WIKIPEDIA
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

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) return null;

  const json = await res.json();
  return {
    title: json?.title || t,
    extract: json?.extract || "",
    type: json?.type || "",
  };
}

function wikiUrlFromTitle(title) {
  if (!title) return null;
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(
    title.replace(/ /g, "_"),
  )}`;
}

function looksLikePersonSummary(summary) {
  const extract = String(summary?.extract || "").toLowerCase();
  const type = String(summary?.type || "").toLowerCase();

  if (!extract || extract.length < 60) return false;
  if (type.includes("disambiguation")) return false;

  const personCues =
    /\b(was a|was an|is a|is an)\b.*\b(king|queen|emperor|pope|saint|philosopher|general|statesman|revolutionary|scholar|writer|composer|scientist|inventor|explorer|ruler|president|prime minister|monarch)\b/;

  const yearCues = /\b(born|died)\b|\(\s*\d{3,4}\s*–\s*\d{3,4}\s*\)/;

  if (personCues.test(extract) || yearCues.test(extract)) return true;

  if (
    /\b(is a|was a)\b.*\b(city|country|empire|kingdom|battle|treaty|war|revolution|dynasty|museum|university)\b/.test(
      extract,
    )
  ) {
    return false;
  }

  return true;
}

async function verifyPersonOnWikipedia(name) {
  const q = String(name || "").trim();
  if (!q) return false;

  const title = await wikiSearchTopTitle(q);
  if (!title) return false;

  const summary = await wikiGetSummary(title);
  if (!summary) return false;

  return looksLikePersonSummary(summary);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, worker);
  await Promise.all(workers);
  return out;
}

// ----------------------------------------------------------------------------
// PRELOAD DEDUPE STATE from curiosity_suggestions (history only)
// ----------------------------------------------------------------------------
async function preloadHistoryState() {
  const { data, error } = await supabase
    .from("curiosity_suggestions")
    .select("anchor_entity_norm, topic_tag_norm")
    .eq("category", "history");

  if (error) {
    throw new Error("Failed to preload history state: " + error.message);
  }

  const seenAnchorTopic = new Set();
  const anchorCounts = new Map();

  for (const row of data || []) {
    const a = String(row.anchor_entity_norm || "").trim();
    const t = String(row.topic_tag_norm || "").trim();

    if (a) anchorCounts.set(a, (anchorCounts.get(a) || 0) + 1);
    if (a && t) seenAnchorTopic.add(`history|${a}|${t}`);
  }

  return { seenAnchorTopic, anchorCounts };
}

// ----------------------------------------------------------------------------
// PROMPTS
// ----------------------------------------------------------------------------
function buildPersonListPrompt({ count, avoidAnchors }) {
  return `
You are generating a list of REAL, well-known historical persons.

Task:
Return EXACTLY ${count} lines of JSONL.

Each line MUST be:
{
  "name": "Person Name (add short disambiguator if needed, e.g., 'Elizabeth I')"
}

Rules:
- Must be real and historically notable enough to support strong, sourceable curiosities.
- Prefer rulers, generals, inventors, scientists, revolutionaries, writers, religious figures, explorers, political leaders, and other widely documented historical figures.
- Geographic and temporal diversity.
- Avoid pop-culture celebrities and vague modern fame.
- Avoid names that are likely to produce generic textbook biographies.

Avoid these overused names (do NOT output them):
${avoidAnchors.length ? avoidAnchors.map((x) => `- ${x}`).join("\n") : "- (none)"}

Return ONLY JSONL. No commentary.
`.trim();
}

function buildHistoryPersonCuriosPrompt({ persons, perPerson, minWow }) {
  const list = persons.map((p) => `- ${p}`).join("\n");

  return `
You are generating HIGH-WOW CurioWire "curiosity suggestions" in category HISTORY.
IMPORTANT: Every item MUST be about a PERSON from the allowed list below.

ALLOWED PERSON ANCHORS (must match exactly one of these in anchor_entity):
${list}

Goal:
Generate rare, surprising, real-world curiosities about these historical persons — not broad biography summaries.

A good curiosity:
- feels worth retelling
- contains a specific anchor
- includes a strange, surprising, or little-known detail
- gives meaningful context: what happened, why it mattered, or the unusual condition that makes it interesting

Prefer:
- bizarre personal incidents
- failed plans or costly mistakes
- accidental consequences
- odd legal, military, political, diplomatic, religious, or scientific edge-cases
- unusual constraints, hidden details, or overlooked episodes

Avoid:
- broad life summaries
- generic "X was known for..."
- textbook biography lines
- vague legend framing
- common classroom trivia

QUALITY SELF-CHECK (VERY IMPORTANT):
Before outputting each item, ask yourself:
- Would a curious person retell this to a friend?
- Does it contain a concrete person + a strange or surprising detail?
- Does it avoid sounding like a biography summary or general fact?
If the answer to any of these is NO, discard the item and generate a different one.

Output EXACTLY ${persons.length * perPerson} lines of JSONL.
For each person, generate ${perPerson} distinct curiosities.

SCORING:
Score each item honestly using these independent scales:
- wow_score: overall editorial strength of the curiosity
- novelty_score: how rare / unexpected it feels
- retellability_score: how likely someone would want to repeat it
- specificity_score: how concrete and well-anchored it is
- generic_fact_risk: risk that it reads like a generic fact, summary, or biography line

TRUTH SAFETY:
- Only propose claims that are broadly true and defensible.
- If correctness depends on a fragile exact year or number, omit it or soften wording.
- No "always/never/proved/definitely".
- No vague authority fillers.

OUTPUT format per line:
{
  "category": "history",
  "curiosity": "one sentence, max 220 chars",
  "wow_score": ${minWow}-100,
  "novelty_score": 0-100,
  "retellability_score": 0-100,
  "specificity_score": 0-100,
  "generic_fact_risk": 0-100,
  "verification_query": "2-8 words",
  "anchor_entity": "MUST match one allowed person exactly",
  "topic_tag": "2-8 words, the specific surprising detail, not a generic biography label"
}

Return ONLY JSONL.
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
- For history-person items, it must NOT read like a biography summary.

Rules:
- If likely true but too vague, too generic, too summary-like, or too broad: verdict="rewrite" with a sharper safe_rewrite.
- If true and already feels like a real curiosity: verdict="pass".
- If dubious, misleading, unverifiable, or uninteresting after sharpening: verdict="fail".
- Rewrites MUST NOT add new names, dates, numbers, institutions, or claims unless already present.
- Rewrites must be ONE sentence <= 220 chars and remove generic framing.
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
// DB: insert suggestions row-by-row to gracefully skip dupes
// ----------------------------------------------------------------------------
async function insertSuggestions(rows) {
  let inserted = 0;
  let skipped = 0;

  for (const r of rows) {
    const payload = {
      category: "history",
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
      throw new Error("Supabase insert failed: " + error.message);
    }

    inserted += 1;
  }

  return { inserted, skipped };
}

// ----------------------------------------------------------------------------
// OPTIONAL: verify created rows (status=null) with Wikipedia overlap
// ----------------------------------------------------------------------------
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

async function fetchUnverified(limit = 200) {
  const { data, error } = await supabase
    .from("curiosity_suggestions")
    .select("id, category, curiosity, wow_score, anchor_entity, topic_tag")
    .eq("category", "history")
    .is("status", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error("Fetch unverified failed: " + error.message);
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

    if (error) throw new Error("Apply updates failed: " + error.message);
    ok += 1;
  }

  return ok;
}

// ----------------------------------------------------------------------------
// OPTIONAL: No-URL judge + rewrite for remaining status=null
// ----------------------------------------------------------------------------
async function noUrlJudgeBatch(rows) {
  const prompt = buildNoUrlJudgePrompt(rows);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  return parseJSONL(raw);
}

async function applyNoUrlDecisions(rows, judged) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let verified = 0;
  let flagged = 0;

  for (const j of judged) {
    if (!j || typeof j !== "object") continue;

    const id = j.id;
    if (!id || !byId.has(id)) continue;

    const verdict = String(j.verdict || "")
      .toLowerCase()
      .trim();
    const confidence = clamp(parseInt(j.confidence ?? 3, 10) || 3, 1, 5);
    const scores = extractInternalScores(j);
    const computedWow = computeCompositeWow(scores);
    const rewrite = String(j.safe_rewrite || "").trim();

    const originalRow = byId.get(id);
    const original = originalRow?.curiosity || "";
    const topicTag = originalRow?.topic_tag || "";

    if (verdict === "pass" && confidence >= MIN_CONFIDENCE_TO_VERIFY) {
      if (computedWow < MIN_WOW_TO_KEEP) continue;

      const rejectReason = editorialRejectReason({
        curiosity: original,
        topicTag,
        scores,
      });

      if (rejectReason) {
        await supabase
          .from("curiosity_suggestions")
          .update({
            status: "flagged",
            confidence,
            wow_score: computedWow,
            review_note: `no_url_pass_but_${rejectReason}`,
          })
          .eq("id", id);
        flagged += 1;
        continue;
      }

      await supabase
        .from("curiosity_suggestions")
        .update({
          status: "verified",
          confidence,
          wow_score: computedWow,
          review_note: null,
        })
        .eq("id", id);

      verified += 1;
      continue;
    }

    if (
      verdict === "rewrite" &&
      rewrite &&
      confidence >= MIN_CONFIDENCE_TO_VERIFY
    ) {
      if (computedWow < MIN_WOW_TO_KEEP) {
        await supabase
          .from("curiosity_suggestions")
          .update({
            status: "flagged",
            confidence,
            wow_score: computedWow,
            review_note: "rewrite_below_min_wow",
          })
          .eq("id", id);
        flagged += 1;
        continue;
      }

      const rejectReason = editorialRejectReason({
        curiosity: rewrite,
        topicTag,
        scores,
      });

      if (rejectReason) {
        await supabase
          .from("curiosity_suggestions")
          .update({
            status: "flagged",
            confidence,
            wow_score: computedWow,
            review_note: `rewrite_failed_${rejectReason}`,
          })
          .eq("id", id);
        flagged += 1;
        continue;
      }

      await supabase
        .from("curiosity_suggestions")
        .update({
          status: "verified",
          confidence,
          wow_score: computedWow,
          review_note: null,
          curiosity: rewrite,
        })
        .eq("id", id);

      verified += 1;
      continue;
    }

    if (verdict === "fail") {
      await supabase
        .from("curiosity_suggestions")
        .update({
          status: "flagged",
          confidence,
          wow_score: computedWow,
          review_note: "no_url_judge_fail",
        })
        .eq("id", id);
      flagged += 1;
      continue;
    }
  }

  return { verified, flagged };
}

// ----------------------------------------------------------------------------
// GENERATION: persons -> verify -> curiosities
// ----------------------------------------------------------------------------
async function generatePersons({ count, avoidAnchors }) {
  const prompt = buildPersonListPrompt({ count, avoidAnchors });

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const out = [];
  const seen = new Set();

  for (const r of rows) {
    const name = String(r?.name || "").trim();
    const k = normText(name);
    if (!name || k.length < 3) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(name);
  }

  return out;
}

async function verifyPersons(names) {
  const verdicts = await mapLimit(
    names,
    WIKI_VERIFY_CONCURRENCY,
    async (name) => {
      await sleep(40 + Math.floor(Math.random() * 80));
      const ok = await verifyPersonOnWikipedia(name);
      return ok ? name : null;
    },
  );
  return verdicts.filter(Boolean);
}

async function generateCuriositiesForPersons({
  persons,
  perPerson,
  minWow,
  seenAnchorTopic,
}) {
  const prompt = buildHistoryPersonCuriosPrompt({
    persons,
    perPerson,
    minWow,
  });

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const allowed = new Set(persons.map((p) => p.trim()));
  const cleaned = [];
  const localSeenCur = new Set();

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if (String(r.category || "").toLowerCase() !== "history") continue;

    const curiosity = String(r.curiosity || "").trim();
    const anchor_entity = String(r.anchor_entity || "").trim();
    const topic_tag = String(r.topic_tag || "").trim();
    const verification_query = String(r.verification_query || "").trim();

    if (!curiosity || !anchor_entity || !topic_tag || !verification_query) {
      continue;
    }

    if (!allowed.has(anchor_entity)) continue;

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

    const key = `history|${anchorNorm}|${topicNorm}`;
    if (seenAnchorTopic.has(key)) continue;

    const curKey = normText(curiosity);
    if (!curKey || curKey.length < 10) continue;
    if (localSeenCur.has(curKey)) continue;
    localSeenCur.add(curKey);

    cleaned.push({
      category: "history",
      curiosity,
      wow_score: computedWow,
      anchor_entity,
      anchor_entity_norm: anchorNorm,
      topic_tag,
      topic_tag_norm: topicNorm,
      verification_query,
    });

    seenAnchorTopic.add(key);
  }

  return cleaned;
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  console.log("🧔 addHistoryPersons.js");
  console.log("   model:", MODEL);
  console.log("   TARGET_NEW_PER_RUN:", TARGET_NEW_PER_RUN);
  console.log("   MIN_WOW_TO_KEEP:", MIN_WOW_TO_KEEP);
  console.log("   MIN_NOVELTY_SCORE:", MIN_NOVELTY_SCORE);
  console.log("   MIN_RETELL_SCORE:", MIN_RETELL_SCORE);
  console.log("   MIN_SPECIFICITY_SCORE:", MIN_SPECIFICITY_SCORE);
  console.log("   MAX_GENERIC_FACT_RISK:", MAX_GENERIC_FACT_RISK);
  console.log("   PER_PERSON:", PER_PERSON);
  console.log("   DO_WIKI_VERIFY_CLAIMS:", DO_WIKI_VERIFY_CLAIMS);
  console.log("   DO_NOURL_JUDGE:", DO_NOURL_JUDGE);

  const { seenAnchorTopic, anchorCounts } = await preloadHistoryState();

  const avoidAnchorsNorm = [...anchorCounts.entries()]
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, AVOID_ANCHORS_TOP)
    .map(([k]) => k);

  let insertedTotal = 0;
  let skippedTotal = 0;

  for (let pass = 1; pass <= PASSES_MAX; pass++) {
    if (insertedTotal >= TARGET_NEW_PER_RUN) break;

    console.log(`\n=== PASS ${pass}/${PASSES_MAX} ===`);
    console.log(`Need ${TARGET_NEW_PER_RUN - insertedTotal} more new rows...`);

    const people = await generatePersons({
      count: PERSON_BATCH,
      avoidAnchors: avoidAnchorsNorm,
    });

    if (!people.length) {
      console.log("…no people generated. continuing.");
      continue;
    }

    const verifiedPeople = await verifyPersons(people);

    if (!verifiedPeople.length) {
      console.log("…no Wikipedia-verified persons. continuing.");
      continue;
    }

    console.log(`✅ Verified persons this pass: ${verifiedPeople.length}`);

    const slice = verifiedPeople.slice(
      0,
      Math.min(
        verifiedPeople.length,
        Math.floor(CURIOS_BATCH / Math.max(1, PER_PERSON)),
      ),
    );
    if (!slice.length) continue;

    const suggestions = await generateCuriositiesForPersons({
      persons: slice,
      perPerson: PER_PERSON,
      minWow: MIN_WOW_TO_KEEP,
      seenAnchorTopic,
    });

    if (!suggestions.length) {
      console.log("…no usable curiosities generated (filtered/dupes).");
      continue;
    }

    const { inserted, skipped } = await insertSuggestions(shuffle(suggestions));
    insertedTotal += inserted;
    skippedTotal += skipped;

    console.log(
      `✅ Inserted=${inserted}, skipped(dupes)=${skipped} | totalInserted=${insertedTotal}/${TARGET_NEW_PER_RUN}`,
    );
  }

  console.log("\n🏁 INSERT PHASE DONE");
  console.log("Inserted total:", insertedTotal);
  console.log("Skipped dupes total:", skippedTotal);

  if (DO_WIKI_VERIFY_CLAIMS) {
    console.log("\n=== OPTIONAL PHASE: WIKIPEDIA VERIFY CLAIMS ===");

    let urlVerifiedTotal = 0;
    let stalls = 0;

    while (true) {
      const candidates = await fetchUnverified(URL_VERIFY_BATCH);
      if (!candidates.length) break;

      console.log(`🔎 URL-verify batch: ${candidates.length}...`);
      const updates = await verifyByWikipedia(candidates);

      if (!updates.length) {
        stalls += 1;
        console.log(
          `…no URL-verifications. stall=${stalls}/${URL_VERIFY_MAX_STALLS}`,
        );
        if (stalls >= URL_VERIFY_MAX_STALLS) break;
        continue;
      }

      stalls = 0;
      const applied = await applyUpdates(updates);
      urlVerifiedTotal += applied;

      console.log(
        `✅ URL-verified updated: ${applied} (total=${urlVerifiedTotal})`,
      );
    }

    console.log("🏁 URL verified total:", urlVerifiedTotal);
  }

  if (DO_NOURL_JUDGE) {
    console.log("\n=== OPTIONAL PHASE: NO-URL JUDGE + REWRITE ===");

    let verified = 0;
    let flagged = 0;
    let loops = 0;

    while (true) {
      loops += 1;

      const remaining = await fetchUnverified(NOURL_VERIFY_BATCH);
      if (!remaining.length) break;

      console.log(`🧪 Judge batch: ${remaining.length}...`);
      const judged = await noUrlJudgeBatch(remaining);
      if (!judged.length) {
        console.log("…no decisions returned; stopping.");
        break;
      }

      const res = await applyNoUrlDecisions(remaining, judged);
      verified += res.verified;
      flagged += res.flagged;

      console.log(
        `✅ judge applied: verified+${res.verified}, flagged+${res.flagged} | totals: verified=${verified}, flagged=${flagged}`,
      );

      if (loops > 200) break;
    }

    console.log("🏁 No-URL judge totals:", { verified, flagged });
  }

  console.log("\n🎉 Done.");
}

main().catch((err) => {
  console.error("💥 addHistoryPersons.js failed:", err);
  process.exit(1);
});
