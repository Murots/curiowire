// ============================================================================
// CurioWire — addHistoryPersons.js
// Adds ~100 well-known historical persons to history anchors (category=history)
// Safe: upsert on (category,anchor) so it only extends, never deletes.
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_DEFINITIONS } from "../app/api/utils/categoryDefinitions.js";

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const COUNT = 100;
const MODEL = process.env.CURIO_ANCHORS_MODEL || "gpt-4o-mini";

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

function normAnchor(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
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

// ----------------------------------------------------------------------------
// PROMPT
// ----------------------------------------------------------------------------
function buildPrompt() {
  const definition = CATEGORY_DEFINITIONS.history;

  return `
You are generating REAL-WORLD CURIOSITY ANCHORS for CurioWire.

CATEGORY: HISTORY
CATEGORY DEFINITION (BOUNDARY LAW):
${definition}

TASK:
Output EXACTLY ${COUNT} anchors as JSONL.

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

Return ONLY JSONL. No headings. No commentary.
`.trim();
}

// ----------------------------------------------------------------------------
// GENERATE + CLEAN
// ----------------------------------------------------------------------------
async function generateHistoryPersons() {
  const prompt = buildPrompt();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const cleaned = [];
  const seen = new Set();

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;

    const category = (r.category || "").toLowerCase();
    if (category !== "history") continue;

    const anchor = (r.anchor || "").trim();
    if (!anchor || anchor.length < 3) continue;

    const anchorType = (r.anchor_type || "").trim();
    if (anchorType !== "person") continue;

    const key = normAnchor(anchor);
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      category: "history",
      anchor,
      anchor_type: "person",
      must_include: Array.isArray(r.must_include) ? r.must_include : [],
      avoid: Array.isArray(r.avoid) ? r.avoid : [],
      evidence_types: Array.isArray(r.evidence_types) ? r.evidence_types : [],
      time_scope: typeof r.time_scope === "string" ? r.time_scope : "any",
    });
  }

  return cleaned;
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
  console.log("👤 addHistoryPersons.js");
  console.log("   model:", MODEL);
  console.log("   target count:", COUNT);

  const { count: beforeCount } = await supabase
    .from("curiosity_anchors")
    .select("*", { count: "exact", head: true })
    .eq("category", "history")
    .eq("anchor_type", "person");

  console.log("📊 Persons before:", beforeCount ?? "n/a");

  let persons = await generateHistoryPersons();

  // Top-up if model returns too few valid rows
  let safety = 0;
  while (persons.length < COUNT && safety < 5) {
    safety += 1;
    console.log(`⚠️ Got ${persons.length}/${COUNT}. Top-up pass ${safety}...`);

    const more = await generateHistoryPersons();
    const merged = [...persons, ...more];

    const seen = new Set();
    persons = merged.filter((x) => {
      const k = normAnchor(x.anchor);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    persons = persons.slice(0, COUNT);
  }

  if (persons.length < COUNT) {
    throw new Error(
      `Failed to generate enough valid persons: ${persons.length}/${COUNT}`
    );
  }

  const res = await upsertAnchors(persons);
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
