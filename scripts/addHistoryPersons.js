// // ============================================================================
// // CurioWire — addHistoryPersons.js
// // Adds ~100 well-known historical persons to history anchors (category=history)
// // Safe: upsert on (category,anchor) so it only extends, never deletes.
// // ============================================================================

// import dotenv from "dotenv";
// dotenv.config({ path: ".env.local" });

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";
// import { CATEGORY_DEFINITIONS } from "../app/api/utils/categoryDefinitions.js";

// // ----------------------------------------------------------------------------
// // CONFIG
// // ----------------------------------------------------------------------------
// const COUNT = 100;
// const MODEL = process.env.CURIO_ANCHORS_MODEL || "gpt-4o-mini";

// // ----------------------------------------------------------------------------
// // SUPABASE (SERVICE ROLE REQUIRED)
// // ----------------------------------------------------------------------------
// const supabaseUrl =
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

// const supabaseKey =
//   process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// if (!supabaseUrl)
//   throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
// if (!supabaseKey)
//   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY");

// const supabase = createClient(supabaseUrl, supabaseKey);

// // ----------------------------------------------------------------------------
// // OPENAI
// // ----------------------------------------------------------------------------
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// // ----------------------------------------------------------------------------
// // HELPERS
// // ----------------------------------------------------------------------------
// function safeJsonParse(line) {
//   try {
//     return JSON.parse(line);
//   } catch {
//     return null;
//   }
// }

// function normAnchor(s) {
//   return (s || "")
//     .toLowerCase()
//     .replace(/\s+/g, " ")
//     .replace(/[^\p{L}\p{N}\s]/gu, "")
//     .trim();
// }

// function parseJSONL(text) {
//   if (!text) return [];
//   return text
//     .split("\n")
//     .map((l) => l.trim())
//     .filter(Boolean)
//     .map((l) => l.replace(/^[-*]\s*/, "").trim())
//     .map(safeJsonParse)
//     .filter(Boolean);
// }

// // ----------------------------------------------------------------------------
// // PROMPT
// // ----------------------------------------------------------------------------
// function buildPrompt() {
//   const definition = CATEGORY_DEFINITIONS.history;

//   return `
// You are generating REAL-WORLD CURIOSITY ANCHORS for CurioWire.

// CATEGORY: HISTORY
// CATEGORY DEFINITION (BOUNDARY LAW):
// ${definition}

// TASK:
// Output EXACTLY ${COUNT} anchors as JSONL.

// Each line MUST be a JSON object with:
// - category: "history"
// - anchor: "<PERSON NAME> (optional short disambiguator like 'of Macedon' if needed)"
// - anchor_type: "person"
// - must_include: 1–3 structural elements the article must reference (e.g., "primary correspondence", "state records", "battle dispatches")
// - avoid: 2–4 framing traps (e.g., "hero-worship", "simplified morality tale", "modern political projection")
// - evidence_types: 2–5 generic evidence forms (e.g., "letters", "court records", "chronicles", "archival files")
// - time_scope: one of ["any","ancient","medieval","early-modern","modern","contemporary"]

// CONSTRAINTS:
// - Persons must be widely known or historically central (state, war, ideology, institution, empire, revolution, religion, science-in-society).
// - Avoid pure pop-culture celebrities.
// - Avoid biography/career-summary framing: anchor must be a SYSTEM NODE.
// - Do NOT invent people.
// - Ensure geographic + temporal diversity (not only Europe/US).

// Return ONLY JSONL. No headings. No commentary.
// `.trim();
// }

// // ----------------------------------------------------------------------------
// // GENERATE + CLEAN
// // ----------------------------------------------------------------------------
// async function generateHistoryPersons() {
//   const prompt = buildPrompt();

//   const completion = await openai.chat.completions.create({
//     model: MODEL,
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.6,
//   });

//   const raw = completion.choices?.[0]?.message?.content || "";
//   const rows = parseJSONL(raw);

//   const cleaned = [];
//   const seen = new Set();

//   for (const r of rows) {
//     if (!r || typeof r !== "object") continue;

//     const category = (r.category || "").toLowerCase();
//     if (category !== "history") continue;

//     const anchor = (r.anchor || "").trim();
//     if (!anchor || anchor.length < 3) continue;

//     const anchorType = (r.anchor_type || "").trim();
//     if (anchorType !== "person") continue;

//     const key = normAnchor(anchor);
//     if (seen.has(key)) continue;
//     seen.add(key);

//     cleaned.push({
//       category: "history",
//       anchor,
//       anchor_type: "person",
//       must_include: Array.isArray(r.must_include) ? r.must_include : [],
//       avoid: Array.isArray(r.avoid) ? r.avoid : [],
//       evidence_types: Array.isArray(r.evidence_types) ? r.evidence_types : [],
//       time_scope: typeof r.time_scope === "string" ? r.time_scope : "any",
//     });
//   }

//   return cleaned;
// }

// // ----------------------------------------------------------------------------
// // UPSERT
// // ----------------------------------------------------------------------------
// async function upsertAnchors(rows) {
//   if (!rows.length) return { inserted: 0 };

//   const { error } = await supabase
//     .from("curiosity_anchors")
//     .upsert(rows, { onConflict: "category,anchor" });

//   if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
//   return { inserted: rows.length };
// }

// // ----------------------------------------------------------------------------
// // MAIN
// // ----------------------------------------------------------------------------
// async function main() {
//   console.log("👤 addHistoryPersons.js");
//   console.log("   model:", MODEL);
//   console.log("   target count:", COUNT);

//   const { count: beforeCount } = await supabase
//     .from("curiosity_anchors")
//     .select("*", { count: "exact", head: true })
//     .eq("category", "history")
//     .eq("anchor_type", "person");

//   console.log("📊 Persons before:", beforeCount ?? "n/a");

//   let persons = await generateHistoryPersons();

//   // Top-up if model returns too few valid rows
//   let safety = 0;
//   while (persons.length < COUNT && safety < 5) {
//     safety += 1;
//     console.log(`⚠️ Got ${persons.length}/${COUNT}. Top-up pass ${safety}...`);

//     const more = await generateHistoryPersons();
//     const merged = [...persons, ...more];

//     const seen = new Set();
//     persons = merged.filter((x) => {
//       const k = normAnchor(x.anchor);
//       if (seen.has(k)) return false;
//       seen.add(k);
//       return true;
//     });

//     persons = persons.slice(0, COUNT);
//   }

//   if (persons.length < COUNT) {
//     throw new Error(
//       `Failed to generate enough valid persons: ${persons.length}/${COUNT}`
//     );
//   }

//   const res = await upsertAnchors(persons);
//   console.log(`✅ Upserted ${res.inserted} person anchors into Supabase`);

//   const { count: afterCount } = await supabase
//     .from("curiosity_anchors")
//     .select("*", { count: "exact", head: true })
//     .eq("category", "history")
//     .eq("anchor_type", "person");

//   console.log("📊 Persons after:", afterCount ?? "n/a");

//   if (beforeCount != null && afterCount != null) {
//     console.log("📈 Net new persons added:", afterCount - beforeCount);
//   }

//   console.log("🎉 Done.");
// }

// main().catch((err) => {
//   console.error("💥 addHistoryPersons.js failed:", err);
//   process.exit(1);
// });

// ============================================================================
// CurioWire — addHistoryPersons.js (v2, self-contained Wikipedia verify)
// Adds well-known historical persons to history anchors (category=history)
// Safe: upsert on (category,anchor) so it only extends, never deletes.
// - No external wiki client needed (Node 20 fetch)
// - Wikipedia verification to avoid invented people
// - Top-up passes until we have COUNT "new-to-DB" verified persons
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_DEFINITIONS } from "../app/api/utils/categoryDefinitions.js";

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const COUNT = 100; // target NEW verified persons to add
const MODEL = process.env.CURIO_ANCHORS_MODEL || "gpt-4o-mini";

// How many anchors to ask for per call (oversample to survive filtering)
const GEN_BATCH = 140;

// Max top-up passes
const TOPUP_PASSES = 8;

// Wikipedia verification timeout-ish (simple)
const WIKI_VERIFY_CONCURRENCY = 6;

// ----------------------------------------------------------------------------
// SUPABASE (SERVICE ROLE REQUIRED)
// ----------------------------------------------------------------------------
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl)
  throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseKey)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY");

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

function normAnchor(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function clampList(arr, max) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function pickTimeScope(v) {
  const allowed = new Set([
    "any",
    "ancient",
    "medieval",
    "early-modern",
    "modern",
    "contemporary",
  ]);
  const s = String(v || "any")
    .trim()
    .toLowerCase();
  return allowed.has(s) ? s : "any";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ----------------------------------------------------------------------------
// WIKIPEDIA (SELF-CONTAINED)
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
    type: json?.type || "",
  };
}

// Conservative “is this a person page?” heuristic
function looksLikePersonSummary(summary) {
  const extract = String(summary?.extract || "").toLowerCase();
  const type = String(summary?.type || "").toLowerCase();

  // Wikipedia REST sometimes marks pages; "standard" is common for real pages
  if (!extract || extract.length < 60) return false;

  // Basic person cues
  const personCues =
    /\b(was a|was an|is a|is an)\b.*\b(king|queen|emperor|pope|saint|philosopher|general|statesman|revolutionary|scholar|writer|composer|scientist|inventor|explorer|ruler|president|prime minister|monarch|dynasty)\b/;

  // Birth/death parentheses / years cues (very common on person pages)
  const yearCues = /\b(born|died)\b|\(\s*\d{3,4}\s*–\s*\d{3,4}\s*\)/;

  // Disambiguation pages are not what we want
  if (type.includes("disambiguation")) return false;

  if (personCues.test(extract) || yearCues.test(extract)) return true;

  // Some figures won’t match cues; still allow if it’s clearly a biography-ish opening
  // but avoid institutions/places by rejecting common non-person patterns
  if (
    /\b(is a|was a)\b.*\b(city|country|empire|kingdom|battle|treaty|war|revolution|dynasty|museum|university)\b/.test(
      extract,
    )
  )
    return false;

  return true;
}

async function verifyPersonOnWikipedia(name) {
  const q = String(name || "").trim();
  if (!q) return false;

  // 1) Search title
  const title = await wikiSearchTopTitle(q);
  if (!title) return false;

  // 2) Fetch summary
  const summary = await wikiGetSummary(title);
  if (!summary) return false;

  // 3) Check it looks like a person bio page
  return looksLikePersonSummary(summary);
}

// Simple concurrency runner
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
// PROMPT
// ----------------------------------------------------------------------------
function buildPrompt(count) {
  const definition = CATEGORY_DEFINITIONS.history;

  return `
You are generating REAL-WORLD CURIOSITY ANCHORS for CurioWire.

CATEGORY: HISTORY
CATEGORY DEFINITION (BOUNDARY LAW):
${definition}

TASK:
Output EXACTLY ${count} anchors as JSONL.

Each line MUST be a JSON object with:
- category: "history"
- anchor: "<PERSON NAME> (optional short disambiguator like 'of Macedon' if needed)"
- anchor_type: "person"
- must_include: 1–3 structural elements the article must reference (e.g., "primary correspondence", "state records", "battle dispatches")
- avoid: 2–4 framing traps (e.g., "hero-worship", "simplified morality tale", "modern political projection")
- evidence_types: 2–5 generic evidence forms (e.g., "letters", "court records", "chronicles", "archival files")
- time_scope: one of ["any","ancient","medieval","early-modern","modern","contemporary"]

CONSTRAINTS:
- Persons must be widely known or historically central (state, war, ideology, institution, empire, revolution, religion, science-in-society).
- Avoid pure pop-culture celebrities.
- Avoid biography/career-summary framing: anchor must be a SYSTEM NODE.
- Do NOT invent people.
- Ensure geographic + temporal diversity (not only Europe/US).
- Avoid repeating ultra-common names unless disambiguated to a distinct system-node (e.g., "Napoleon III" vs "Napoleon").

Return ONLY JSONL. No headings. No commentary.
`.trim();
}

// ----------------------------------------------------------------------------
// FETCH EXISTING (dedupe vs DB)
// ----------------------------------------------------------------------------
async function fetchExistingPersonAnchors() {
  const seen = new Set();

  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("curiosity_anchors")
      .select("anchor")
      .eq("category", "history")
      .eq("anchor_type", "person")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
    const rows = Array.isArray(data) ? data : [];

    for (const r of rows) {
      const k = normAnchor(r.anchor);
      if (k) seen.add(k);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return seen;
}

// ----------------------------------------------------------------------------
// GENERATE + CLEAN + VERIFY
// ----------------------------------------------------------------------------
async function generateHistoryPersonsBatch(batchCount) {
  const prompt = buildPrompt(batchCount);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  // basic clean
  const cleaned = [];
  const seenLocal = new Set();

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;

    const category = String(r.category || "")
      .toLowerCase()
      .trim();
    if (category !== "history") continue;

    const anchor = String(r.anchor || "").trim();
    if (!anchor || anchor.length < 3) continue;

    const anchorType = String(r.anchor_type || "").trim();
    if (anchorType !== "person") continue;

    const key = normAnchor(anchor);
    if (!key) continue;
    if (seenLocal.has(key)) continue;
    seenLocal.add(key);

    cleaned.push({
      category: "history",
      anchor,
      anchor_type: "person",
      must_include: clampList(r.must_include, 3),
      avoid: clampList(r.avoid, 4),
      evidence_types: clampList(r.evidence_types, 5),
      time_scope: pickTimeScope(r.time_scope),
    });
  }

  return cleaned;
}

async function verifyAndFilterPersons(rows) {
  if (!rows.length) return [];

  // Verify on Wikipedia with limited concurrency
  const verdicts = await mapLimit(
    rows,
    WIKI_VERIFY_CONCURRENCY,
    async (row) => {
      // tiny jitter to be polite
      await sleep(40 + Math.floor(Math.random() * 80));
      const ok = await verifyPersonOnWikipedia(row.anchor);
      return ok ? row : null;
    },
  );

  return verdicts.filter(Boolean);
}

// ----------------------------------------------------------------------------
// UPSERT
// ----------------------------------------------------------------------------
async function upsertAnchors(rows) {
  if (!rows.length) return { inserted: 0 };

  const { error } = await supabase
    .from("curiosity_anchors")
    .upsert(rows, { onConflict: "category,anchor" });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return { inserted: rows.length };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  console.log("👤 addHistoryPersons.js (v2)");
  console.log("   model:", MODEL);
  console.log("   target NEW count:", COUNT);
  console.log("   gen batch:", GEN_BATCH);
  console.log("   topup passes:", TOPUP_PASSES);

  const { count: beforeCount } = await supabase
    .from("curiosity_anchors")
    .select("*", { count: "exact", head: true })
    .eq("category", "history")
    .eq("anchor_type", "person");

  console.log("📊 Persons before:", beforeCount ?? "n/a");

  // Dedupe vs DB so we actually add new ones
  const existing = await fetchExistingPersonAnchors();
  console.log("🧠 Existing person anchors loaded:", existing.size);

  const toAdd = [];
  const seenFinal = new Set(); // normalize across passes too

  for (let pass = 1; pass <= TOPUP_PASSES; pass++) {
    if (toAdd.length >= COUNT) break;

    console.log(`\n--- PASS ${pass}/${TOPUP_PASSES} ---`);
    console.log(`Need ${COUNT - toAdd.length} more new verified persons...`);

    const batch = await generateHistoryPersonsBatch(GEN_BATCH);

    // Remove anything already in DB or already accepted
    const candidates = batch.filter((x) => {
      const k = normAnchor(x.anchor);
      if (!k) return false;
      if (existing.has(k)) return false;
      if (seenFinal.has(k)) return false;
      return true;
    });

    console.log(
      `Generated ${batch.length}, candidates after DB+local dedupe: ${candidates.length}`,
    );

    if (!candidates.length) {
      console.log("…no candidates this pass. continuing.");
      continue;
    }

    const verified = await verifyAndFilterPersons(candidates);
    console.log(`Wikipedia-verified persons this pass: ${verified.length}`);

    for (const v of verified) {
      const k = normAnchor(v.anchor);
      if (!k) continue;
      if (existing.has(k)) continue;
      if (seenFinal.has(k)) continue;

      seenFinal.add(k);
      toAdd.push(v);

      if (toAdd.length >= COUNT) break;
    }

    console.log(`Total new verified queued: ${toAdd.length}/${COUNT}`);
  }

  if (toAdd.length < COUNT) {
    console.warn(
      `⚠️ Could not reach target. Will still upsert what we have: ${toAdd.length}/${COUNT}`,
    );
  }

  const payload = toAdd.slice(0, COUNT);
  const res = await upsertAnchors(payload);
  console.log(`✅ Upserted ${res.inserted} person anchors into Supabase`);

  const { count: afterCount } = await supabase
    .from("curiosity_anchors")
    .select("*", { count: "exact", head: true })
    .eq("category", "history")
    .eq("anchor_type", "person");

  console.log("📊 Persons after:", afterCount ?? "n/a");

  if (beforeCount != null && afterCount != null) {
    console.log("📈 Net new persons added:", afterCount - beforeCount);
  }

  console.log("🎉 Done.");
}

main().catch((err) => {
  console.error("💥 addHistoryPersons.js failed:", err);
  process.exit(1);
});
