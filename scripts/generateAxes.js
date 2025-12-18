// ============================================================================
// CurioWire — generateAxes.js
// Generates 150 curiosity axis objects per category and stores in Supabase.
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_DEFINITIONS } from "../app/api/utils/categoryDefinitions.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const AXES_PER_CATEGORY = 150;
const MODEL = process.env.CURIO_AXES_MODEL || "gpt-4o-mini";

// IMPORTANT: use SERVICE ROLE key (server only)
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl)
  throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseKey)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (required)");

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// ----------------------------------------------------------------------------
// Helpers
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

// very light dedupe normalization
function normAxis(s) {
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
    .map((l) => l.replace(/^[-*]\s*/, "").trim()) // allow bullet-prefixed lines
    .map(safeJsonParse)
    .filter(Boolean);
}

function buildAxisPrompt(category) {
  const definition = CATEGORY_DEFINITIONS[category];
  if (!definition)
    throw new Error(`No CATEGORY_DEFINITIONS found for "${category}"`);

  return `
You are generating "curiosity axes" for CurioWire.

A curiosity axis is NOT a story.
It is an ABSTRACT lens that forces a specific kind of verifiable curiosity article.

CATEGORY: ${category.toUpperCase()}

CATEGORY DEFINITION (BOUNDARY LAW):
${definition}

RULES (CRITICAL):
1) Output EXACTLY ${AXES_PER_CATEGORY} axes as JSONL: one JSON object per line.
2) Each object MUST have these fields:
   - category (string): must equal "${category}"
   - axis (string): one sentence fragment describing the lens
   - must_include (array of strings): 2–4 required elements for the concept
   - prefer (array of strings): 2–4 preferences
   - avoid (array of strings): 2–5 avoid rules
   - evidence_types (array of strings): 3–6 plausible evidence types (generic)
   - time_scope (string): one of ["any","ancient","medieval","early-modern","modern","contemporary"]

3) Axes MUST stay strictly INSIDE the category definition and its excludes.
4) Axes must be HIGH-DIVERSITY: avoid overlap and avoid repeating the same structure.
5) Axes must be ABSTRACT:
   - NO specific people, no specific institutions, no named events, no exact dates.
   - NO listicle clichés (Roman concrete, Antikythera, Voynich, etc.)
6) Each axis must be able to generate a real-world, verifiable article.
7) Keep axis text concise (8–18 words), vivid, and strongly “curiosity-driving”.
8) Evidence types must be plausible and generic (no URLs, no fake lab names).

Return ONLY JSONL. No commentary. No headings.
Start now.
`.trim();
}

async function generateAxesForCategory(category) {
  const prompt = buildAxisPrompt(category);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  // Basic validation + cleanup
  const cleaned = [];
  const seen = new Set();

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if ((r.category || "").toLowerCase() !== category.toLowerCase()) continue;

    const axis = (r.axis || "").trim();
    if (!axis || axis.length < 10) continue;

    const key = normAxis(axis);
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      category: category.toLowerCase(),
      axis,
      must_include: Array.isArray(r.must_include) ? r.must_include : [],
      prefer: Array.isArray(r.prefer) ? r.prefer : [],
      avoid: Array.isArray(r.avoid) ? r.avoid : [],
      evidence_types: Array.isArray(r.evidence_types) ? r.evidence_types : [],
      time_scope: typeof r.time_scope === "string" ? r.time_scope : "any",
    });
  }

  // If we didn't get enough, we will top-up by regenerating smaller batches
  // to reach AXES_PER_CATEGORY.
  return cleaned;
}

async function upsertAxes(rows) {
  if (!rows.length) return { inserted: 0 };

  // Upsert on (category, axis) unique index
  const { error } = await supabase
    .from("curiosity_axes")
    .upsert(rows, { onConflict: "category,axis" });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return { inserted: rows.length };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  const categories = Object.keys(CATEGORY_DEFINITIONS);

  console.log("🔧 generateAxes.js");
  console.log("   model:", MODEL);
  console.log("   categories:", categories.join(", "));
  console.log("   axes per category:", AXES_PER_CATEGORY);

  for (const category of categories) {
    console.log(`\n=== CATEGORY: ${category.toUpperCase()} ===`);

    // 1) Generate a batch
    let axes = await generateAxesForCategory(category);

    // 2) Top-up if needed
    let safety = 0;
    while (axes.length < AXES_PER_CATEGORY && safety < 5) {
      safety += 1;
      console.log(
        `⚠️ Got ${axes.length}/${AXES_PER_CATEGORY}. Top-up pass ${safety}...`
      );

      const more = await generateAxesForCategory(category);
      const merged = [...axes, ...more];

      // re-dedupe after merge
      const seen = new Set();
      axes = merged.filter((x) => {
        const k = normAxis(x.axis);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      axes = axes.slice(0, AXES_PER_CATEGORY);
    }

    // 3) If still short, fail loudly
    if (axes.length < AXES_PER_CATEGORY) {
      console.error(
        `❌ Failed to generate enough axes for ${category}: ${axes.length}/${AXES_PER_CATEGORY}`
      );
      process.exit(1);
    }

    // 4) Shuffle before insert (nice distribution)
    axes = shuffle(axes);

    // 5) Upsert to Supabase
    const res = await upsertAxes(axes);
    console.log(
      `✅ Upserted ${res.inserted} axes into Supabase for ${category}`
    );
  }

  console.log("\n🎉 Done. Axes generated + stored.");
}

main().catch((err) => {
  console.error("💥 generateAxes.js failed:", err);
  process.exit(1);
});
