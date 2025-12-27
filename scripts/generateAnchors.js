// ============================================================================
// CurioWire — generateAnchors.js
// Generates reusable, conceptually-rich real-world curiosity anchors per category.
// v2.2 — Controlled Person Distribution (History / Sports / Culture)
// ============================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_DEFINITIONS } from "../app/api/utils/categoryDefinitions.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const ANCHORS_PER_CATEGORY = 180;
const MODEL = process.env.CURIO_ANCHORS_MODEL || "gpt-4o-mini";

// ----------------------------------------------------------------------------
// CATEGORY-SPECIFIC ANCHOR TYPES (ONTOLOGY-ALIGNED)
// ----------------------------------------------------------------------------
const ANCHOR_TYPES_BY_CATEGORY = {
  space: [
    "astronomical_object",
    "signal",
    "dataset",
    "observatory",
    "mission",
    "instrument",
    "phenomenon",
    "region",
  ],

  science: [
    "phenomenon",
    "material",
    "process",
    "mechanism",
    "system",
    "dataset",
    "instrument",
  ],

  history: [
    "period",
    "event",
    "person",
    "institution",
    "document",
    "archive",
    "site",
    "artifact",
  ],

  world: [
    "state",
    "region",
    "organization",
    "treaty",
    "movement",
    "policy",
    "demographic_process",
    "event",
  ],

  nature: [
    "taxonomic_family",
    "genus",
    "ecosystem",
    "biome",
    "evolutionary_strategy",
    "behavioral_pattern",
    "interaction",
    "environmental_system",
  ],

  technology: [
    "technology",
    "system",
    "platform",
    "protocol",
    "infrastructure",
    "algorithmic_class",
    "technical_layer",
    "failure_mode",
  ],

  culture: [
    "person",
    "symbol",
    "ritual",
    "belief_system",
    "text",
    "tradition",
    "artifact",
    "site",
    "movement",
  ],

  sports: [
    "athlete",
    "match",
    "tournament",
    "event",
    "team",
    "rule",
    "incident",
    "venue",
  ],

  products: [
    "product",
    "prototype",
    "artifact",
    "material",
    "patent",
    "design",
    "failure_case",
  ],

  health: [
    "condition",
    "diagnostic_category",
    "physiological_system",
    "neurological_process",
    "psychological_phenomenon",
    "treatment_class",
    "dataset",
  ],
};

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
function buildAnchorPrompt(category) {
  const definition = CATEGORY_DEFINITIONS[category];
  const allowedTypes = ANCHOR_TYPES_BY_CATEGORY[category];

  if (!definition) throw new Error(`No CATEGORY_DEFINITIONS for "${category}"`);
  if (!allowedTypes)
    throw new Error(`No ANCHOR_TYPES defined for "${category}"`);

  let distributionRules = "";

  if (category === "history") {
    distributionRules = `
DISTRIBUTION REQUIREMENT (HISTORY):
• ~30% of anchors MUST use anchor_type "person"
• Remaining anchors MUST span period, event, institution, document, archive, site, artifact
• Persons must be major historical system-actors (state, war, ideology, institution)
• NO biographical framing
`;
  }

  if (category === "sports") {
    distributionRules = `
DISTRIBUTION REQUIREMENT (SPORTS):
• ~20% of anchors MUST use anchor_type "athlete"
• Remaining anchors MUST span match, tournament, team, rule, event, venue
• Athletes must be historically or structurally significant (not trivia)
• Avoid career summaries or personal-life framing
`;
  }

  if (category === "culture") {
    distributionRules = `
DISTRIBUTION REQUIREMENT (CULTURE):
• ~20% of anchors MUST use anchor_type "person"
• Persons must function as cultural system-nodes (ideas, movements, symbols)
• Avoid biography or personality-driven framing
• Remaining anchors MUST span text, ritual, belief_system, artifact, tradition, site, movement
`;
  }

  return `
You are generating REAL-WORLD CURIOSITY ANCHORS for CurioWire.

A curiosity anchor is a CONCEPTUAL GRAVITY CENTER — not a one-off datapoint.
It must allow MULTIPLE distinct curiosity articles to be generated
when combined with different deviations, lenses, and seeds.

CATEGORY: ${category.toUpperCase()}

CATEGORY DEFINITION (BOUNDARY LAW):
${definition}

ANCHOR TYPE CONSTRAINT (CRITICAL):
anchor_type MUST be one of:
${allowedTypes.join(", ")}

${distributionRules}

CRITICAL RULES:
1) Output EXACTLY ${ANCHORS_PER_CATEGORY} anchors as JSONL.
2) Each line MUST be a JSON object with:
   - category: "${category}"
   - anchor: concise but identifiable real-world reference
   - anchor_type: one of the allowed types
   - must_include: 1–3 structural elements the article must reference
   - avoid: 2–4 framing traps or oversimplifications
   - evidence_types: 2–5 generic evidence forms
   - time_scope: one of ["any","ancient","medieval","early-modern","modern","contemporary"]

3) Anchors MUST be REAL and verifiable in principle.
4) Anchors MUST be REUSABLE — not single-study or single-incident locks.
5) Avoid formulations like:
   - “the implications of…”
   - “the discovery of…”
   - “a study showing…”
6) Stay STRICTLY inside the category definition.
7) Avoid listicle clichés and overused trivia.
8) No fictional, supernatural, or speculative entities.
9) Named individuals are allowed ONLY when explicitly permitted above.
10) Do NOT explain or interpret the anchor.

Return ONLY JSONL. No headings. No commentary.
Start now.
`.trim();
}

// ----------------------------------------------------------------------------
// GENERATION / STORAGE (unchanged)
// ----------------------------------------------------------------------------
async function generateAnchorsForCategory(category) {
  const prompt = buildAnchorPrompt(category);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  const rows = parseJSONL(raw);

  const cleaned = [];
  const seen = new Set();
  const allowedTypes = new Set(ANCHOR_TYPES_BY_CATEGORY[category]);

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if ((r.category || "").toLowerCase() !== category.toLowerCase()) continue;

    const anchor = (r.anchor || "").trim();
    if (!anchor || anchor.length < 8) continue;
    if (!allowedTypes.has(r.anchor_type)) continue;

    const key = normAnchor(anchor);
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      category: category.toLowerCase(),
      anchor,
      anchor_type: r.anchor_type,
      must_include: Array.isArray(r.must_include) ? r.must_include : [],
      avoid: Array.isArray(r.avoid) ? r.avoid : [],
      evidence_types: Array.isArray(r.evidence_types) ? r.evidence_types : [],
      time_scope: typeof r.time_scope === "string" ? r.time_scope : "any",
    });
  }

  return cleaned;
}

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
  const categories = Object.keys(CATEGORY_DEFINITIONS);

  console.log("🔧 generateAnchors.js — v2.2");
  console.log("   model:", MODEL);
  console.log("   anchors per category:", ANCHORS_PER_CATEGORY);

  for (const category of categories) {
    console.log(`\n=== CATEGORY: ${category.toUpperCase()} ===`);

    let anchors = await generateAnchorsForCategory(category);

    let safety = 0;
    while (anchors.length < ANCHORS_PER_CATEGORY && safety < 5) {
      safety += 1;
      console.log(
        `⚠️ Got ${anchors.length}/${ANCHORS_PER_CATEGORY}. Top-up pass ${safety}...`
      );

      const more = await generateAnchorsForCategory(category);
      const merged = [...anchors, ...more];

      const seen = new Set();
      anchors = merged.filter((x) => {
        const k = normAnchor(x.anchor);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      anchors = anchors.slice(0, ANCHORS_PER_CATEGORY);
    }

    if (anchors.length < ANCHORS_PER_CATEGORY) {
      console.error(
        `❌ Failed to generate enough anchors for ${category}: ${anchors.length}/${ANCHORS_PER_CATEGORY}`
      );
      process.exit(1);
    }

    anchors = shuffle(anchors);
    const res = await upsertAnchors(anchors);

    console.log(
      `✅ Upserted ${res.inserted} anchors into Supabase for ${category}`
    );
  }

  console.log("\n🎉 Done. Anchors generated + stored.");
}

main().catch((err) => {
  console.error("💥 generateAnchors.js failed:", err);
  process.exit(1);
});
