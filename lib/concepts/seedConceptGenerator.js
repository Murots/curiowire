// ============================================================================
// CurioWire — seedConceptGenerator.js (v5.1 — ANCHOR + FOCUS SHIFT + LENS + ESCAPE HATCH)
// Replaces: AXIS + DEVIATION + SEEDS
// Notes:
// - Category-specific anchors remain in Supabase
// - Universal modulators (focus shift + lens) are local constants
// - Adds an "escape hatch" so the model can return empty concepts instead of inventing
// - Adds optional "verifier" field (short, generic) to help later fact-check/linking
// ============================================================================

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

import { CATEGORY_DEFINITIONS } from "../../app/api/utils/categoryDefinitions.js";
import { selectAnchors } from "./selectAnchors.js";

// ============================================================================
// UNIVERSAL MODULATORS (category-agnostic)
// Keep these small + safe. No factual claims.
// ============================================================================

const FOCUS_SHIFTS = [
  "a secondary effect",
  "an unintended consequence",
  "an overlooked constraint",
  "a long-term ripple",
  "a marginal case",
  "a rare exception",
  "a boundary condition",
  "a small failure mode with outsized impact",
  "a hidden dependency",
  "a delayed reaction",
  "a behavioral adaptation",
  "a tradeoff that only appears at scale",
  "a phenomenon visible only under stress",
  "a side effect that became the main driver",
  "a quiet change that reshaped outcomes",
  "a local anomaly with global implications",
  "a workaround that became standard practice",
];

const LENSES = [
  "through risk perception",
  "through design tradeoffs",
  "through incentives and unintended incentives",
  "through human behavior under constraints",
  "through measurement uncertainty",
  "through institutional decision-making",
  "through coordination failures",
  "through reliability and failure analysis",
  "through second-order effects",
  "through information asymmetry",
  "through adaptation over time",
  "through cost versus resilience tradeoffs",
  "through normalization of deviance",
  "through path dependence",
  "through feedback loops",
];

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function generateConceptSeeds(category) {
  try {
    console.log(`\n=== [CONCEPT SEEDING: ${category.toUpperCase()}] ===`);

    // ------------------------------------------------------------------------
    // STEP 0 — Select Anchor + pick universal modulator pair
    // ------------------------------------------------------------------------
    const [anchor] = await selectAnchors({ category, count: 1 });

    if (!anchor) {
      console.warn("⚠️ Missing anchor — aborting generation");
      return generateFallbackConcepts();
    }

    // Soft sanity check — anchor must semantically fit category
    if (anchor.category && anchor.category !== category) {
      console.warn("⚠️ Anchor-category mismatch, aborting generation");
      return generateFallbackConcepts();
    }

    const focusShift = pickRandom(FOCUS_SHIFTS);
    const lens = pickRandom(LENSES);

    console.log(
      `🧠 Frame selected → anchor="${anchor.anchor}" | focus_shift="${focusShift}" | lens="${lens}"`
    );

    // ------------------------------------------------------------------------
    // STEP 1 — Build prompt
    // ------------------------------------------------------------------------
    const prompt = buildConceptPrompt({
      category,
      anchor,
      focusShift,
      lens,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    let parsed;

    try {
      parsed = JSON.parse(raw.replace(/```json|```/gi, "").trim());
    } catch {
      console.warn("⚠️ Failed to parse concept JSON");
      // Optional: log raw for debugging (keep short)
      console.warn("↪ Raw response preview:", raw.slice(0, 300));
      return generateFallbackConcepts();
    }

    // ------------------------------------------------------------------------
    // STEP 2 — Normalize to internal idea objects
    // ------------------------------------------------------------------------
    const ideas = [];

    for (const item of parsed || []) {
      if (!item || typeof item.concept !== "string") continue;

      const c = item.concept.trim();

      // Escape hatch: model is allowed to return empty
      if (!c) continue;

      // Avoid super-short junk
      if (c.length < 40) continue;

      const v = typeof item.verifier === "string" ? item.verifier.trim() : null;

      ideas.push({
        focus_shift: focusShift,
        lens,
        concept: c,
        verifier: v && v.length ? v : null,
      });
    }

    if (!ideas.length) {
      console.warn("⚠️ No valid ideas before plausibility gating");
      return generateFallbackConcepts();
    }

    // --- Plausibility gate (batch) ---
    const gate = await plausibilityGate(ideas, category, anchor.anchor);

    // tag + filter
    const gatedIdeas = ideas
      .map((it, idx) => {
        const verdict = String(gate[idx]?.verdict || "UNCERTAIN")
          .trim()
          .toUpperCase();

        return {
          ...it,
          plausibility_verdict: verdict,
          plausibility_confidence: gate[idx]?.confidence ?? 50,
          plausibility_reason: gate[idx]?.reason || "",
        };
      })
      .filter((it) => it.plausibility_verdict !== "FAIL");

    // Logg litt kort
    console.log("🧪 Plausibility results:");
    gatedIdeas.forEach((it, i) => {
      console.log(
        `   ${i + 1}. ${it.plausibility_verdict} (${
          it.plausibility_confidence
        }) — ${
          it.concept.length > 90 ? it.concept.slice(0, 87) + "..." : it.concept
        }`
      );
    });

    // Hvis gate filtrerte for mye, fall tilbake (eller behold UNCERTAIN-only)
    if (gatedIdeas.length < 3) {
      console.warn("⚠️ Too few concepts after plausibility gating");
      return generateFallbackConcepts();
    }

    return {
      concepts: gatedIdeas,
      anchor,
      focusShift,
      lens,
    };
  } catch (err) {
    console.error("💥 Concept generation failed:", err.message);
    return generateFallbackConcepts();
  }
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildConceptPrompt({ category, anchor, focusShift, lens }) {
  return `
You generate ultra-wow curiosity concepts for CurioWire.

CATEGORY (for alignment only):
${CATEGORY_DEFINITIONS[category]}

ANCHOR (HARD CONSTRAINT — MUST DOMINATE):
${anchor.anchor}

FOCUS SHIFT (WHAT TO ZOOM IN ON):
${focusShift}

LENS (HOW TO INTERPRET / FRAME IT):
${lens}

CRITICAL RULES (ANTI-HALLUCINATION):
• You must NOT invent specific events, stories, numbers, named studies, named institutions, or the foundation of the concept.
• If you cannot think of a real, concrete, known phenomenon connected to the anchor, you MUST output an empty concept ("").
  (It is better to return empty than to invent.)
• You may use cautious language (e.g., "archival records suggest...", "documented incident reports...") ONLY if the underlying phenomenon is real.
• The anchor must remain the main subject; focus shift + lens only change the angle.
• EXACTLY 2 sentences per concept (unless concept is empty).
• Avoid “top 10 trivia” clichés.

QUALITY RULES:
• Each concept must be explicitly grounded in the ANCHOR.
• No speculation presented as fact.
• Must be verifiable in principle.

OPTIONAL "VERIFIER" FIELD:
• Add a short, generic hint about what could verify it (e.g. "court filings", "match footage", "incident reports", "archival forum threads", "observatory data").
• Do NOT invent names of studies or institutions.

OUTPUT FORMAT (JSON ONLY):
[
  { "concept": "<exactly two sentences, or empty string>", "verifier": "<short generic verifier or empty string>" },
  { "concept": "<exactly two sentences, or empty string>", "verifier": "<short generic verifier or empty string>" },
  { "concept": "<exactly two sentences, or empty string>", "verifier": "<short generic verifier or empty string>" },
  { "concept": "<exactly two sentences, or empty string>", "verifier": "<short generic verifier or empty string>" },
  { "concept": "<exactly two sentences, or empty string>", "verifier": "<short generic verifier or empty string>" }
]

No extra text.

====================================================================
FRONTIER REALISM CONSTRAINT (CRITICAL)
====================================================================
You are NOT allowed to invent impossible phenomena.

Every non-empty concept MUST:
• Be grounded in real-world, verifiable domains (real devices, organisms, materials, events, records, datasets).
• Highlight strange, under-discussed, or counterintuitive aspects of reality — NOT pure fantasy.

Not allowed:
• Violations of fundamental laws without strong real precedent.
• Explicitly fictional or supernatural entities.
• Entirely invented civilizations, planets, or materials.
• Purely generic situations (“a race”, “a game”, “a study”, “researchers say”)

====================================================================
HARD AVOID LIST — DO NOT USE THESE OR CLOSE VARIANTS
====================================================================
You MUST NOT base any concept on the following overused curiosities or their direct analogues:

• Roman concrete durability / volcanic ash mix
• Antikythera mechanism as “the first computer”
• Voynich manuscript as an uncracked code
• Tardigrades surviving in space/extremes
• “Bananas are berries...”
• “Tomatoes are fruits...”
• The 52-hertz “lonely whale”
• Pyramids aligned with stars / Orion / solstices
• Nazca lines viewed from above
• Library of Alexandria burning and lost knowledge
• “You are made of stardust” / gold from supernovae
• The immortal jellyfish (Turritopsis dohrnii)
• “More trees on Earth than stars...”
• Placebo effect (generic)
• Mandela effect / false memory lists
• Déjà vu (generic)

====================================================================
WOW-FACTOR REQUIREMENTS (WITH REALITY)
====================================================================
Each non-empty concept MUST use at least one:
• Forbidden contrast
• Unexpected survival
• Sudden reversal
• Lost-and-found mystery
• Unlikely chain reaction

Goal: “No way… and yet this is real.”

====================================================================
META-VARIATION REQUIREMENTS (INSIDE THE CATEGORY)
====================================================================
Across the 5 outputs:
• Maximize semantic distance between concepts (imagery, mechanism, domain).
• Ground them in the anchor, but vary the angle via focus shift + lens.
• If you cannot produce 5 real ones, return empty strings for the remainder.

`;
}

// ============================================================================
// Plausibility-check
// ============================================================================
async function plausibilityGate(concepts, category, anchorText) {
  // concepts = [{ concept, verifier, ... }, ...]
  // Returnerer array i samme rekkefølge: [{ verdict, reason, confidence }, ...]

  const prompt = `
You are a strict plausibility filter for curiosity "concepts".

Context:
- CATEGORY: ${category}
- ANCHOR: ${anchorText}

Task:
For each concept, judge if it is plausibly grounded in real-world verifiable reality.
You MUST be conservative about obvious hallucinations.

Rules:
- FAIL if it asserts or implies specific named events/studies/institutions/numbers that sound invented.
- FAIL if it violates basic reality (impossible physics/biology) or sounds like pure fiction.
- UNCERTAIN if it could be real but is too vague or would require checking.
- PASS if it sounds plausibly real and verifiable in principle.

Return JSON ONLY as an array with the same length/order:
[
  { "verdict": "PASS|UNCERTAIN|FAIL", "confidence": 0-100, "reason": "<short>" }
]

Concepts:
${JSON.stringify(
  concepts.map((c) => c.concept),
  null,
  2
)}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      // Optional: litt mer deterministisk
      temperature: 0.2,
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.replace(/```json|```/gi, "").trim());

    if (!Array.isArray(parsed) || parsed.length !== concepts.length) {
      console.warn("⚠️ plausibilityGate returned invalid shape");
      return concepts.map(() => ({
        verdict: "UNCERTAIN",
        confidence: 50,
        reason: "fallback: invalid gate response",
      }));
    }

    return parsed;
  } catch (err) {
    console.warn("⚠️ plausibilityGate failed:", err.message);
    // Fail-open (ikke stopp pipeline) – merk alt UNCERTAIN
    return concepts.map(() => ({
      verdict: "UNCERTAIN",
      confidence: 50,
      reason: "fallback: gate failed",
    }));
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFallbackConcepts() {
  return {
    concepts: [],
    anchor: null,
    focusShift: null,
    lens: null,
  };
}
