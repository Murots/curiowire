// ============================================================================
// CurioWire — generateCuriositySuggestions.js
// Generates viral "Curiosity Suggestions" + verifies them in 3 phases:
// 1) Generate (assumed true) → status=null
// 2) URL verify (Wikipedia)  → status='verified' + source_urls
// 3) No-URL judge (LLM)      → status='verified' or 'flagged' (with safe rewrite)
// v1.1 — concrete-wow enforced, anti-theme, anti-common, frontier-safe
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// --- Uses your existing enrichment wikipedia client (already in your repo)
import {
  wikiSearchTopTitle,
  wikiGetSummary,
} from "../lib/enrichment/wikipediaClient.js";

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MODEL = process.env.CURIO_SUGGESTIONS_MODEL || "gpt-4o-mini";

// Enforce “wow-only” population
const MIN_WOW_TO_KEEP = parseInt(process.env.CURIO_MIN_WOW ?? "75", 10);

// Target counts
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
const TOPUP_PASSES = 10;

// Verification batching
const URL_VERIFY_BATCH = 50;
const NOURL_VERIFY_BATCH = 25;

// No-URL judge threshold
const MIN_CONFIDENCE_TO_VERIFY = 4;

// Supabase insert strategy:
// You have a UNIQUE INDEX on (category, md5(lower(trim(curiosity)))).
// Supabase upsert cannot target that expression index directly.
// So we insert row-by-row and skip duplicate constraint errors safely.
const INSERT_ROW_BY_ROW = true;

// Wikipedia phase: avoid getting stuck in infinite loops when no progress
const URL_VERIFY_MAX_STALLS = 3;

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

function normCuriosity(s) {
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
  // Safe enough for internal storage — exact canonical URL can be normalized later
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(
    title.replace(/ /g, "_")
  )}`;
}

function looksLikeListicleOrFiller(s) {
  const t = (s || "").toLowerCase();
  if (!t) return true;
  if (t.length < 18) return true;
  if (t.length > 260) return true; // keep them tight
  if (/^(did you know|fun fact|here are|top \d+)/i.test(s)) return true;
  if (/(scientists say|studies show|experts agree)/i.test(s)) return true; // too vague
  if (/(always|never|proved|definitely|guarantees)/i.test(s)) return true; // too absolute
  if (/(click here|subscribe|follow for)/i.test(s)) return true; // CTA
  return false;
}

// Explicitly block theme sentences
function looksLikeThemeSentence(s) {
  const t = (s || "").toLowerCase();
  if (!t) return true;

  // Classic “theme” phrasing
  if (
    /(remains a mystery|continues to mystify|mystif(y|ies)|researchers have theories|theories range|is debated|debated among|purpose.*unknown)/i.test(
      s
    )
  ) {
    return true;
  }

  // Overly generic “it is believed/it is thought” framing without mechanism
  if (/(it is believed|it is thought|many believe|some believe)/i.test(s)) {
    // allow only if there's an explicit constraint cue
    if (
      !/(only when|because|due to|in (the|a) (experiment|study|trial|test)|under (certain|specific) conditions)/i.test(
        s
      )
    ) {
      return true;
    }
  }

  // Require at least one “constraint cue” token to keep it concrete
  const hasConstraintCue =
    /(only when|because|due to|under |in (the|a) (experiment|study|trial|test)|from (the|a) archive|measurement limit|detection threshold|signal.*only|works.*only)/i.test(
      s
    );

  // Not mandatory for every category, but helps enforce concreteness hard
  if (!hasConstraintCue) return true;

  return false;
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
- Prefer concrete historical nodes (named person/event/document/institution/method).
- One sentence must include: (Anchor) + (Twist) + (Constraint/Mechanism).
- Avoid theme phrasing ("purpose debated", "mystifies researchers").
- Avoid fragile exact years unless truly uncontested.
`.trim();
  }

  if (category === "crime") {
    return `
${COMMON_BANS}

CRIME STYLE:
- Real cases / forensic edge-cases / investigative or legal constraints.
- No gore. No instructions.
- Avoid private individuals. Prefer famous public cases or general forensic phenomena.
- Must be concrete: include a specific mechanism/constraint (mis-ID mode, evidence limitation, procedural twist).
`.trim();
  }

  if (category === "mystery") {
    return `
${COMMON_BANS}

MYSTERY STYLE:
- Real unresolved puzzles are allowed ONLY if tied to a concrete constraint (missing record, measurement limit, contradictory evidence).
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

  return `
${COMMON_BANS}

GENERAL STYLE:
- Must be concrete: Anchor + Twist + Constraint/Mechanism.
- No theme sentences, no vague "experts say".
`.trim();
}

function buildGenerationPrompt(category, count) {
  return `
You are generating REAL-WORLD CurioWire "curiosity suggestions" for category: ${category.toUpperCase()}.

Goal: viral, shocking-but-true micro-claims for a short card or short video.
Each item MUST be a single concrete WOW-CLAIM (not a theme sentence).

${buildCategoryStyleRules(category)}

ABSOLUTE BAN (NO THEME SENTENCES):
- Do NOT write: "remains a mystery", "researchers have theories", "continues to mystify", "is debated"
  (unless paired with a HARD constraint/mechanism in the SAME sentence).

REQUIRED CLAIM FORMAT (stored as "curiosity"):
- ONE sentence, max 220 characters.
- Must include ALL 3 components:
  1) ANCHOR: a specific named thing (phenomenon/experiment/dataset/case/person/object/term)
  2) TWIST: the surprising property/outcome
  3) CONSTRAINT/MECHANISM: "only when..." / "because..." / "due to..." / "in X experiment..." / "under Y condition..."
- If you cannot include all 3, DO NOT output the item.

ANTI-COMMON RULE:
- Avoid well-known viral trivia. If it sounds like a top-10 fun fact, discard it and create a new one.

TRUTH SAFETY:
- Only propose claims that are broadly true and defensible.
- If correctness depends on a specific number/date, omit the number or soften wording.
- No "always/never/proved/definitely". No vague authority fillers ("scientists say").

OUTPUT (JSONL, exactly ${count} lines):
Each line MUST be a JSON object:
{
  "category": "${category}",
  "curiosity": "ONE sentence concrete wow-claim (<=220 chars)",
  "wow_score": 0-100,
  "verification_query": "2-8 words, prefer proper noun/term"
}

Return ONLY JSONL. No extra text.
Start now.
`.trim();
}

function buildNoUrlJudgePrompt(rows) {
  const items = rows
    .map((r) => ({
      id: r.id,
      category: r.category,
      curiosity: r.curiosity,
      wow_score: r.wow_score,
    }))
    .slice(0, NOURL_VERIFY_BATCH);

  return `
You are CurioWire's verifier for short "curiosity suggestions".
Judge if each item is (A) broadly true AND (B) concrete (not a theme sentence).

Concrete definition:
- Must include: a specific anchor + a surprising twist + a constraint/mechanism ("only when/because/due to/in X experiment...").

Rules:
- If likely true but too vague/theme-y OR too strong: verdict="rewrite" with a MORE CONCRETE safe_rewrite.
- If true and already concrete: verdict="pass".
- If dubious/misleading/unverifiable as a claim: verdict="fail".
- Rewrites MUST NOT add new names/dates/numbers/institutions unless already present.
- Rewrites must be ONE sentence <= 220 chars and remove theme phrasing ("mystify", "debated", "researchers have theories").
- If you cannot rewrite without adding new facts, choose "fail".

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
// PHASE 1: GENERATE
// ----------------------------------------------------------------------------
async function generateForCategory(category, targetCount) {
  const want = Math.min(GEN_BATCH, targetCount);
  const prompt = buildGenerationPrompt(category, want);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const cleaned = [];
  const seen = new Set();

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if ((r.category || "").toLowerCase() !== category.toLowerCase()) continue;

    const curiosity = (r.curiosity || "").trim();
    if (looksLikeListicleOrFiller(curiosity)) continue;

    // Hard anti-theme / concreteness gate
    if (looksLikeThemeSentence(curiosity)) continue;

    const key = normCuriosity(curiosity);
    if (!key || key.length < 10) continue;
    if (seen.has(key)) continue;
    seen.add(key);

    const wow = clamp(parseInt(r.wow_score ?? 50, 10) || 50, 0, 100);
    if (wow < MIN_WOW_TO_KEEP) continue;

    const verification_query = (r.verification_query || "").trim();

    cleaned.push({
      category: category.toLowerCase(),
      curiosity,
      wow_score: wow,
      status: null,
      source_urls: [],
      confidence: null,
      review_note: null,
      _verification_query: verification_query, // internal helper (not stored)
    });
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
    };

    const { error } = await supabase
      .from("curiosity_suggestions")
      .insert(payload);

    if (error) {
      const msg = (error.message || "").toLowerCase();

      if (
        msg.includes("duplicate key") ||
        msg.includes("curiosity_suggestions_unique") ||
        msg.includes("already exists")
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
// PHASE 2: URL VERIFY (Wikipedia)
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

function keywordOverlapScore(text, extract) {
  const t = normCuriosity(text);
  const e = normCuriosity(extract || "");
  if (!t || !e) return 0;

  const words = t.split(" ").filter((w) => w.length >= 5);
  if (!words.length) return 0;

  let hits = 0;
  for (const w of new Set(words)) {
    if (e.includes(w)) hits += 1;
  }

  return hits / Math.min(words.length, 10);
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

    if (verdict === "pass" && confidence >= MIN_CONFIDENCE_TO_VERIFY) {
      // Still enforce wow + concreteness
      if (wow < MIN_WOW_TO_KEEP) continue;
      const original = byId.get(id)?.curiosity || "";
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
      // Safety + quality gates
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

    // Low confidence → leave status null for future passes
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
  console.log("🔧 generateCuriositySuggestions.js — v1.1");
  console.log("   model:", MODEL);
  console.log("   categories:", CATEGORIES.join(", "));
  console.log("   MIN_WOW_TO_KEEP:", MIN_WOW_TO_KEEP);

  // ------------------------------------------------------------
  // PHASE 1: Generate + Insert
  // ------------------------------------------------------------
  console.log("\n=== PHASE 1: GENERATE + INSERT ===");

  for (const category of CATEGORIES) {
    const target = TARGET_BY_CATEGORY[category];
    console.log(
      `\n--- CATEGORY: ${category.toUpperCase()} (target=${target}) ---`
    );

    // Count before
    const { count: beforeCount, error: beforeErr } = await supabase
      .from("curiosity_suggestions")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    if (beforeErr) {
      console.warn(`⚠️ pre-count failed for ${category}:`, beforeErr.message);
    } else {
      console.log(`📊 existing total in ${category}: ${beforeCount}`);
    }

    let totalInserted = 0;
    let totalSkipped = 0;

    let safety = 0;
    while (totalInserted < target && safety < TOPUP_PASSES) {
      safety += 1;

      const remaining = target - totalInserted;
      const ask = Math.min(GEN_BATCH, remaining);

      console.log(`🧠 gen pass ${safety}: asking ${ask}...`);
      const batch = await generateForCategory(category, ask);

      // Local dedupe within this pass
      const seen = new Set();
      const uniqueBatch = batch.filter((x) => {
        const k = normCuriosity(x.curiosity);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (!uniqueBatch.length) {
        console.log("…no usable items in this pass (all filtered).");
        continue;
      }

      const { inserted, skipped } = await insertCuriosities(
        shuffle(uniqueBatch)
      );
      totalInserted += inserted;
      totalSkipped += skipped;

      console.log(
        `✅ pass ${safety}: inserted=${inserted}, skipped(dupes)=${skipped}, totalInserted=${totalInserted}/${target}`
      );
    }

    console.log(
      `🏁 ${category}: inserted=${totalInserted}, dupesSkipped=${totalSkipped}`
    );

    const { count: afterCount, error: afterErr } = await supabase
      .from("curiosity_suggestions")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    if (!afterErr) {
      console.log(`📊 total rows in ${category}: ${afterCount}`);
    }
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
        `…no URL-verifications in this batch. stall=${stalls}/${URL_VERIFY_MAX_STALLS}`
      );
      if (stalls >= URL_VERIFY_MAX_STALLS) break;
      continue;
    }

    stalls = 0;
    const applied = await applyUpdates(updates);
    urlVerifiedTotal += applied;

    console.log(
      `✅ URL-verified + updated: ${applied} (total=${urlVerifiedTotal})`
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
      `✅ applied ${applied} updates (verified+${noUrlVerified}, flagged+${flagged})`
    );

    if (loops > 300) break;
  }

  console.log("\n🎉 DONE.");
  console.log("URL-verified:", urlVerifiedTotal);
  console.log("No-URL verified:", noUrlVerified);
  console.log("Flagged:", flagged);
}

main().catch((err) => {
  console.error("💥 generateCuriositySuggestions.js failed:", err);
  process.exit(1);
});
