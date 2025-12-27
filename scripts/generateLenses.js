// ============================================================================
// CurioWire — generateLenses.js
// Generates reusable analytical lenses per category.
// v1.1 — Schema-Aligned Interpretive Layer
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_DEFINITIONS } from "../app/api/utils/categoryDefinitions.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const LENSES_PER_CATEGORY = 120;
const MODEL = process.env.CURIO_LENSES_MODEL || "gpt-4o-mini";

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

function normLens(s) {
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
function buildLensPrompt(category) {
  const definition = CATEGORY_DEFINITIONS[category];
  if (!definition) throw new Error(`No CATEGORY_DEFINITIONS for "${category}"`);

  return `
You are generating ANALYTICAL LENSES for CurioWire.

A lens defines HOW a curiosity topic is interpreted —
not WHAT happened, not WHO was involved.

Lenses are:
• ABSTRACT
• THEORY-DRIVEN
• REUSABLE across many anchors and deviations
• NON-NARRATIVE
• NON-DESCRIPTIVE

CATEGORY: ${category.toUpperCase()}

CATEGORY DEFINITION (BOUNDARY LAW):
${definition}

CRITICAL RULES:
1) Output EXACTLY ${LENSES_PER_CATEGORY} lenses as JSONL.
2) Each line MUST be a JSON object with:
   - category: "${category}"
   - lens: concise analytical framing (6–14 words)
   - lens_type: one of [
       "psychological",
       "systems",
       "economic",
       "political",
       "cognitive",
       "ethical",
       "informational",
       "ecological",
       "technological",
       "evolutionary",
       "organizational",
       "methodological"
     ]
   - must_include: 1–3 abstract dimensions the lens emphasizes
   - avoid: 2–4 interpretive pitfalls or framing errors
   - evidence_types: 2–5 generic forms of evidence
   - time_scope: one of ["any","ancient","medieval","early-modern","modern","contemporary"]

3) Lenses MUST NOT include:
   ❌ names of people
   ❌ named events, dates, or locations
   ❌ empirical claims
   ❌ moral conclusions

4) Lenses MUST:
   ✅ shape interpretation without adding facts
   ✅ remain valid across different time periods
   ✅ expose structure, constraint, or tension

5) Avoid:
   - storytelling language
   - causal certainty
   - hindsight bias
   - ideological preaching

6) Keep language neutral, precise, and analytical.

Return ONLY JSONL. No headings. No commentary.
Start now.
`.trim();
}

// ----------------------------------------------------------------------------
// GENERATION
// ----------------------------------------------------------------------------
async function generateLensesForCategory(category) {
  const prompt = buildLensPrompt(category);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.65,
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const cleaned = [];
  const seen = new Set();

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if ((r.category || "").toLowerCase() !== category.toLowerCase()) continue;

    const lens = (r.lens || "").trim();
    if (!lens || lens.length < 6) continue;

    const key = normLens(lens);
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      category: category.toLowerCase(),
      lens,
      lens_type: r.lens_type,
      must_include: Array.isArray(r.must_include) ? r.must_include : [],
      avoid: Array.isArray(r.avoid) ? r.avoid : [],
      evidence_types: Array.isArray(r.evidence_types) ? r.evidence_types : [],
      time_scope: typeof r.time_scope === "string" ? r.time_scope : "any",
    });
  }

  return cleaned;
}

async function upsertLenses(rows) {
  if (!rows.length) return { inserted: 0 };

  const { error } = await supabase
    .from("curiosity_lenses")
    .upsert(rows, { onConflict: "category,lens" });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return { inserted: rows.length };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  const categories = Object.keys(CATEGORY_DEFINITIONS);

  console.log("🔧 generateLenses.js — v1.1");
  console.log("   model:", MODEL);
  console.log("   lenses per category:", LENSES_PER_CATEGORY);

  for (const category of categories) {
    console.log(`\n=== CATEGORY: ${category.toUpperCase()} ===`);

    let lenses = await generateLensesForCategory(category);

    let safety = 0;
    while (lenses.length < LENSES_PER_CATEGORY && safety < 5) {
      safety += 1;
      console.log(
        `⚠️ Got ${lenses.length}/${LENSES_PER_CATEGORY}. Top-up pass ${safety}...`
      );

      const more = await generateLensesForCategory(category);
      const merged = [...lenses, ...more];

      const seen = new Set();
      lenses = merged.filter((x) => {
        const k = normLens(x.lens);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      lenses = lenses.slice(0, LENSES_PER_CATEGORY);
    }

    if (lenses.length < LENSES_PER_CATEGORY) {
      console.error(
        `❌ Failed to generate enough lenses for ${category}: ${lenses.length}/${LENSES_PER_CATEGORY}`
      );
      process.exit(1);
    }

    lenses = shuffle(lenses);
    const res = await upsertLenses(lenses);

    console.log(
      `✅ Upserted ${res.inserted} lenses into Supabase for ${category}`
    );
  }

  console.log("\n🎉 Done. Lenses generated + stored.");
}

main().catch((err) => {
  console.error("💥 generateLenses.js failed:", err);
  process.exit(1);
});
