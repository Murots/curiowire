// ============================================================================
// CurioWire — generateDeviations.js
// Generates reusable, human-aware deviation patterns per category.
// v1.0 — Structural Deviation Layer
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_DEFINITIONS } from "../app/api/utils/categoryDefinitions.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const DEVIATIONS_PER_CATEGORY = 120;
const MODEL = process.env.CURIO_DEVIATIONS_MODEL || "gpt-4o-mini";

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

function normDeviation(s) {
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
function buildDeviationPrompt(category) {
  const definition = CATEGORY_DEFINITIONS[category];
  if (!definition) throw new Error(`No CATEGORY_DEFINITIONS for "${category}"`);

  return `
You are generating STRUCTURAL DEVIATIONS for CurioWire.

A deviation describes *what was unusual, overlooked, contradictory,
or structurally misaligned* in an otherwise normal system.

Deviations are:
• ABSTRACT
• HUMAN-AWARE (but never named individuals)
• REUSABLE across many anchors
• NON-BIOGRAPHICAL
• NON-NARRATIVE

CATEGORY: ${category.toUpperCase()}

CATEGORY DEFINITION (BOUNDARY LAW):
${definition}

CRITICAL RULES:
1) Output EXACTLY ${DEVIATIONS_PER_CATEGORY} deviations as JSONL.
2) Each line MUST be a JSON object with:
   - category: "${category}"
   - deviation: one concise sentence fragment (8–18 words)
   - deviation_type: one of [
       "human_decision",
       "institutional_failure",
       "misinterpreted_signal",
       "ignored_constraint",
       "unintended_consequence",
       "measurement_bias",
       "information_gap",
       "systemic_delay",
       "false_assumption",
       "overconfidence",
       "coordination_failure",
       "ethical_blindspot"
     ]
   - must_include: 1–3 abstract elements the article must surface
   - avoid: 2–4 framing traps or misinterpretations
   - evidence_types: 2–5 generic evidence forms

3) Deviations MUST NOT include:
   ❌ names of people
   ❌ specific events
   ❌ dates or locations
   ❌ single studies or one-off incidents

4) Deviations MUST:
   ✅ apply across multiple anchors
   ✅ introduce human agency without naming actors
   ✅ create tension with an otherwise stable system

5) Avoid:
   - vague wording ("something went wrong")
   - purely descriptive summaries
   - moral preaching
   - hindsight determinism

6) Keep language sharp, neutral, and analytical.

Return ONLY JSONL. No commentary. No headings.
Start now.
`.trim();
}

// ----------------------------------------------------------------------------
// GENERATION
// ----------------------------------------------------------------------------
async function generateDeviationsForCategory(category) {
  const prompt = buildDeviationPrompt(category);

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

    const deviation = (r.deviation || "").trim();
    if (!deviation || deviation.length < 10) continue;

    const key = normDeviation(deviation);
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      category: category.toLowerCase(),
      deviation,
      deviation_type: r.deviation_type,
      must_include: Array.isArray(r.must_include) ? r.must_include : [],
      avoid: Array.isArray(r.avoid) ? r.avoid : [],
      evidence_types: Array.isArray(r.evidence_types) ? r.evidence_types : [],
    });
  }

  return cleaned;
}

async function upsertDeviations(rows) {
  if (!rows.length) return { inserted: 0 };

  const { error } = await supabase
    .from("curiosity_deviations")
    .upsert(rows, { onConflict: "category,deviation" });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return { inserted: rows.length };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  const categories = Object.keys(CATEGORY_DEFINITIONS);

  console.log("🔧 generateDeviations.js — v1.0");
  console.log("   model:", MODEL);
  console.log("   deviations per category:", DEVIATIONS_PER_CATEGORY);

  for (const category of categories) {
    console.log(`\n=== CATEGORY: ${category.toUpperCase()} ===`);

    let deviations = await generateDeviationsForCategory(category);

    let safety = 0;
    while (deviations.length < DEVIATIONS_PER_CATEGORY && safety < 5) {
      safety += 1;
      console.log(
        `⚠️ Got ${deviations.length}/${DEVIATIONS_PER_CATEGORY}. Top-up pass ${safety}...`
      );

      const more = await generateDeviationsForCategory(category);
      const merged = [...deviations, ...more];

      const seen = new Set();
      deviations = merged.filter((x) => {
        const k = normDeviation(x.deviation);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      deviations = deviations.slice(0, DEVIATIONS_PER_CATEGORY);
    }

    if (deviations.length < DEVIATIONS_PER_CATEGORY) {
      console.error(
        `❌ Failed to generate enough deviations for ${category}: ${deviations.length}/${DEVIATIONS_PER_CATEGORY}`
      );
      process.exit(1);
    }

    deviations = shuffle(deviations);
    const res = await upsertDeviations(deviations);

    console.log(
      `✅ Upserted ${res.inserted} deviations into Supabase for ${category}`
    );
  }

  console.log("\n🎉 Done. Deviations generated + stored.");
}

main().catch((err) => {
  console.error("💥 generateDeviations.js failed:", err);
  process.exit(1);
});
