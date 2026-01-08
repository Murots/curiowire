// // ============================================================================
// // CurioWire — seedConceptGenerator.js (A4 — STRUCTURED FRONTIER REALISM)
// // v4.0 — AXIS + ANCHOR + DEVIATION + LENS INTEGRATED
// // ============================================================================

// import OpenAI from "openai";
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// import { CATEGORY_DEFINITIONS } from "../../app/api/utils/categoryDefinitions.js";

// import { selectAxes } from "./selectAxes.js";
// import { selectAnchors } from "./selectAnchors.js";
// import { selectDeviations } from "./selectDeviations.js";
// import { selectLenses } from "./selectLenses.js";

// // ============================================================================
// // MAIN EXPORT
// // ============================================================================

// export async function generateConceptSeeds(category) {
//   try {
//     console.log(`\n=== [CONCEPT SEEDING: ${category.toUpperCase()}] ===`);

//     // ------------------------------------------------------------------------
//     // STEP 0 — Select structural components
//     // ------------------------------------------------------------------------
//     const axes = await selectAxes({ category, count: 1, cooldownHours: 24 });
//     const [anchor] = await selectAnchors({ category, count: 1 });
//     const [deviation] = await selectDeviations({ category, count: 1 });
//     const [lens] = await selectLenses({ category, count: 1 });

//     // Soft sanity check — anchor must semantically fit category
//     if (anchor.category && anchor.category !== category) {
//       console.warn("⚠️ Anchor-category mismatch, aborting generation");
//       return generateFallbackConcepts(category);
//     }

//     if (!axes.length || !anchor || !deviation || !lens) {
//       console.warn("⚠️ Missing structural components — aborting generation");
//       return generateFallbackConcepts(category);
//     }

//     console.log(
//       `🧠 Structural frame selected → ` +
//         `axis="${axes[0].axis}" | ` +
//         `anchor="${anchor.anchor}" | ` +
//         `deviation="${deviation.deviation}" | ` +
//         `lens="${lens.lens}"`
//     );

//     // ------------------------------------------------------------------------
//     // STEP 1 — Generate chaos seeds
//     // ------------------------------------------------------------------------
//     let seedWords = await generateChaosSeeds(category);
//     seedWords = seedWords.filter((w) => !w.includes(" "));

//     if (seedWords.length < 10) {
//       seedWords = await regenerateOneWordSeeds(seedWords);
//     }

//     if (!seedWords.length) {
//       return generateFallbackConcepts(category);
//     }

//     const randomSeeds = [...new Set(shuffle(seedWords))].slice(0, 3);
//     console.log(`[SEEDS] ${randomSeeds.join(", ")}`);

//     // ------------------------------------------------------------------------
//     // STEP 2 — Build prompt
//     // ------------------------------------------------------------------------
//     const prompt = buildConceptPrompt({
//       category,
//       axes,
//       anchor,
//       deviation,
//       lens,
//       seeds: randomSeeds,
//     });

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//     });

//     const raw = completion.choices?.[0]?.message?.content || "";
//     let parsed;

//     try {
//       parsed = JSON.parse(raw.replace(/```json|```/gi, "").trim());
//     } catch {
//       console.warn("⚠️ Failed to parse concept JSON");
//       return generateFallbackConcepts(category);
//     }

//     const ideas = [];

//     for (const item of parsed) {
//       const axisIndex = item.axis_index;
//       if (!axes[axisIndex - 1]) continue;

//       for (const variant of item.variants || []) {
//         ideas.push({
//           axis_id: axes[axisIndex - 1].id,
//           axis_index: axisIndex,
//           anchor_id: anchor.id,
//           deviation_id: deviation.id,
//           lens_id: lens.id,
//           concept: variant.concept.trim(),
//         });
//       }
//     }

//     if (ideas.length < 3) {
//       console.warn("⚠️ Too few valid concepts");
//       return generateFallbackConcepts(category);
//     }

//     return {
//       concepts: ideas,
//       axes,
//       anchor,
//       deviation,
//       lens,
//       seeds: randomSeeds,
//     };
//   } catch (err) {
//     console.error("💥 Concept generation failed:", err.message);
//     return generateFallbackConcepts(category);
//   }
// }

// // ============================================================================
// // PROMPT BUILDER
// // ============================================================================

// function buildConceptPrompt({
//   category,
//   axes,
//   anchor,
//   deviation,
//   lens,
//   seeds,
// }) {
//   return `
// You are generating ultra-wow curiosity concepts for CurioWire.

// CATEGORY:
// ${CATEGORY_DEFINITIONS[category]}

// PRIMARY TOPIC — HARD CONSTRAINT (MUST DOMINATE):
// ${anchor.anchor}

// INTERPRETIVE FORCES (USE ONLY INSOFAR AS THEY APPLY TO THE ANCHOR):

// DEVIATION (EXPECTATION TENSION):
// ${deviation.deviation}

// LENS (INTERPRETIVE ANGLE):
// ${lens.lens}

// AXES:
// ${axes
//   .map(
//     (a, i) => `
// AXIS ${i + 1}:
// ${a.axis}
// Must include: ${a.must_include.join(", ")}
// Avoid: ${a.avoid.join(", ")}
// `
//   )
//   .join("\n")}

// SEEDS (HIDDEN INSPIRATION):
// ${seeds.join(", ")}

// IMPORTANT RULE:
// The ANCHOR defines WHAT the concept is about.
// Axis, deviation and lens define HOW the anchor is explored.

// If any axis, deviation or lens feels only weakly related to the anchor,
// it must be applied metaphorically or interpretively — NEVER allowed
// to replace, override, or shift the main subject away from the anchor.

// The concept MUST fail if removing the ANCHOR would make the idea
// still make sense as a standalone curiosity.

// Each concept should be unrecognizable as the same article
// if the axis, deviation, or lens were changed,
// but immediately recognizable as the same topic
// because the anchor remains the same.

// RULES:
// • EXACTLY 2 sentences per concept
// • Each concept MUST:
//   - Be explicitly grounded in the ANCHOR (this is mandatory).
//   - Use ONE axis as the primary structural driver.
//   - Apply deviation and lens only insofar as they meaningfully illuminate
//   the anchor — they must not introduce a new topic or subject.
// • No speculation presented as fact
// • Must be verifiable in principle

// FORMAT:
// [
//   {
//     "axis_index": 1,
//     "variants": [
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" }
//     ]
//   }
// ]

// No extra text.

// ====================================================================
// FRONTIER REALISM CONSTRAINT (CRITICAL)
// ====================================================================
// You are NOT allowed to invent impossible phenomena.

// Every concept MUST:
// • Be grounded in **real-world, verifiable domains**:
//   - real scientific fields, real types of organisms, real materials
//   - real kinds of astronomical objects, real geological processes
//   - real historical periods, real kinds of artifacts or records
// • Highlight **strange, under-discussed, or counterintuitive aspects** of reality,
//   NOT pure fantasy.

// Allowed:
// • Genuine mysteries and frontiers:
//   - phenomena that are observed but not fully explained
//   - research questions still being debated
//   - rare or extreme edge cases in nature, history, or technology
// • Careful, qualified language WHEN paired with a concrete anchor:
//   - “records from X suggest…”
//   - “researchers studying Y propose…”
//   - “data from Z hints that…”

// Not allowed:
// • Violations of fundamental laws without strong real precedent:
//   - forests thriving forever without any energy source
//   - humans naturally living for centuries
//   - macroscopic objects defying gravity
//   - matter spontaneously appearing from nowhere
// • Explicitly fictional or supernatural entities:
//   - ghosts, demons, angels, curses, magic
//   - alien interventions presented as factual
// • Entirely invented civilizations, planets, or materials.

// If an idea would require rewriting basic physics, chemistry, or biology,
// you MUST discard it and choose a more realistic frontier phenomenon instead.

// ====================================================================
// HARD AVOID LIST — DO NOT USE THESE OR CLOSE VARIANTS
// ====================================================================
// You MUST NOT base any concept on the following overused curiosities
// or their direct analogues. If your idea is “basically the same thing
// with slightly different words”, discard it and try again.

// Forbidden example topics:
// • Roman concrete durability and its volcanic ash mix
// • The Antikythera mechanism as “the first computer”
// • The Voynich manuscript as an uncracked code
// • Tardigrades surviving in space or extreme conditions
// • “Bananas are berries, strawberries are not”
// • “Tomatoes are fruits but used as vegetables”
// • The 52-hertz “lonely whale”
// • Pyramids aligned with stars / Orion / solstices
// • Nazca lines viewed from above
// • Library of Alexandria burning and lost knowledge
// • “You are made of stardust” / gold from supernovae
// • The immortal jellyfish (Turritopsis dohrnii)
// • “There are more trees on Earth than stars in the galaxy”
// • The placebo effect in generic form
// • The Mandela effect / false memory lists
// • Déjà vu described in a generic psychological way

// If a concept feels like something that frequently appears on
// “top 10 mind-blowing facts” lists, you MUST discard it and
// generate a rarer, more niche phenomenon instead.

// ====================================================================
// WOW-FACTOR REQUIREMENTS (WITH REALITY)
// ====================================================================
// Each concept MUST use at least one:
// • Forbidden contrast — two things that “should not” be related, but are,
//   in a real, documented way.
// • Unexpected survival — something tiny, fragile, or overlooked that
//   leaves a massive long-term trace in data, rocks, genomes, archives, or space.
// • Sudden reversal — what people assume is true turns out to be
//   the opposite once you look at the evidence.
// • Lost-and-found mystery — a real artifact, dataset, or natural signal
//   discovered, forgotten, then rediscovered with new meaning.
// • Unlikely chain reaction — a small real cause leading to large,
//   documented consequences (ecological, historical, technological, or social).

// The goal: **“No way… and yet this is real.”**

// ====================================================================
// META-VARIATION REQUIREMENTS (INSIDE THE CATEGORY)
// ====================================================================
// Across the 5 concepts:

// • Each concept must explore a DISTINCT thematic domain inside the category.
//   - Do not reuse the same kind of organism, mechanism, or historical era.
//   - Do not reuse the same narrative structure (“lost → rediscovered”)
//     more than twice, and never in an identical way.

// • Maximize semantic distance between all 5 concepts.
//   They must feel unrelated in imagery, premise, and underlying logic.

// • Favor:
//   - edge cases
//   - deep-time signals
//   - marginal ecosystems
//   - obscure historical episodes
//   - niche subfields of research

// • Avoid:
//   - textbook examples
//   - standard listicle curiosities
//   - phenomena that appear frequently in popular science explainers.

// If ANY two concepts feel similar in structure, theme, domain, mechanism,
// or imagery, you MUST discard the weaker one and regenerate until all 5
// are maximally distinct.

// ====================================================================
// FACTUALITY REQUIREMENT (FRONTIER REALISM VERSION)
// ====================================================================
// • Concepts must be **compatible with a fact-based curiosity article**.
// • You may involve:
//   - unsolved puzzles
//   - competing hypotheses
//   - partial or noisy data
//   as long as you describe them cautiously and do not present speculation as fact.

// • You MUST:
//   - Anchor each concept to at least one real class of thing:
//     • a type of organism, ecosystem, rock, signal, device, archive,
//       archaeological layer, instrument, or dataset
//   - Make it clear that the phenomenon is known or studied in reality,
//     even if not fully understood.

// • You MUST NOT:
//   - Invent a brand-new type of lifeform that fundamentally breaks biology.
//   - Claim that well-known impossibilities (like perpetual motion)
//     are confirmed facts.
//   - Fabricate very specific named institutions, labs, or missions
//     that do not exist; instead, refer generically:
//     “one research team”, “a long-running observatory project”, etc.

// Safe phrasing examples:
// • “In a little-known sediment core, researchers found…”
// • “Geneticists working with archived samples noticed…”
// • “A long-term observatory record reveals an odd pattern where…”
// • “Deep cave surveys uncovered an ecosystem where…”

// ====================================================================
// REAL-WORLD ANCHOR REQUIREMENT (GLOBAL)
// ====================================================================
// Each concept MUST be anchored to at least ONE specific, identifiable
// real-world anchor that could realistically be referenced in an article.

// A valid anchor may be:
// • A named event, incident, or competition
// • A specific place, site, or environment
// • A named dataset, record, archive, or long-running observation
// • A specific organism, material, structure, or artifact
// • A defined research context (e.g. “sediment cores from X”,
//   “satellite data from Y”, “archival match records from Z”)

// For event-driven domains (sports, history, world, culture),
// prefer anchoring concepts to a specific moment in time
// (e.g. year, tournament, match, conflict, or documented incident, etc).

// Note:
// An anchor does NOT require a proper name if the phenomenon itself
// is uniquely identifiable (e.g. a specific type of sediment layer,
// a defined class of stars, a particular long-running measurement record).

// Forbidden:
// • Purely generic situations (“a race”, “a game”, “a study”, “researchers say”)
// • Abstract psychological or sociological claims without a concrete anchor
// • Vague references like “historical records”, “experts believe”,
//   “scientists have found” without specifying WHAT was studied.

// If a concept cannot be tied to a concrete real-world anchor,
// you MUST discard it and generate another.

// ====================================================================
// CATEGORY ALIGNMENT
// ====================================================================
// All 5 concepts MUST clearly belong to the category:
// ${category.toUpperCase()} — defined as:
// "${CATEGORY_DEFINITIONS[category]}"

// They must NOT drift into other categories
// (e.g., pure geopolitics inside science, or pure tech inside history)
// unless the category definition explicitly allows it.

// ====================================================================
// USE OF SEED WORDS
// ====================================================================
// Use the three seed words only as hidden semantic inspiration —
// they should influence:
// • tone
// • contrast
// • imagery
// • type of curiosity

// The concepts do NOT need to mention the seeds explicitly.
// Seeds: ${seeds.join(", ")}

// ====================================================================
// STRUCTURE REQUIREMENT (ALL CATEGORIES)
// ====================================================================
// Each concept MUST be exactly **two sentences**.

// For EACH concept:
// • Sentence 1:
//   - Start with a vivid, surprising image or situation rooted in
//     a real type of place, organism, artifact, dataset, or mechanism.

// • Sentence 2:
//   - Explicitly name or clearly identify the real-world anchor
//     (event, site, dataset, organism, artifact, or research context)
//     that makes the curiosity verifiable.
//   - Explicitly tie it to observation, measurement, records, or research,
//     using formulations like:
//     “scientists studying X have documented…”
//     “long-term records show…”
//     “archaeological surveys reveal…”
//     “genetic analysis indicates…”

// Do NOT write titles or fragments.
// Do NOT use bullet points, headings, or numbering inside the concepts.

// ====================================================================
// FORMAT:
// Return JSON ONLY in the following exact structure:

// [
//   {
//     "axis_index": 1,
//     "variants": [
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" },
//       { "concept": "<exactly two sentences>" }
//     ]
//   }
// ]

// Rules:
// • Return EXACTLY one object per axis
// • Each axis MUST contain EXACTLY 5 variants
// • All variants must obey ALL constraints above
// • Variants must be meaningfully different from each other
// • axis_index MUST match the provided axis index (always 1 in this run)
// • Do NOT reuse axes
// • No extra text outside JSON
// • Do NOT invent new indices

// `;
// }

// // ============================================================================
// // HELPERS
// // ============================================================================
// function extractList(text) {
//   if (!text) return [];
//   return text
//     .split("\n")
//     .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
//     .filter((l) => l.length > 20);
// }

// function extractWordList(text) {
//   if (!text) return [];
//   return text
//     .split("\n")
//     .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
//     .map((l) => l.toLowerCase())
//     .map((l) => l.replace(/[^a-z]/g, "")) // removes any non-letter
//     .filter((l) => l.length >= 3 && l.length <= 20)
//     .filter((l) => !l.includes(" ")); // ABSOLUTE SINGLE-WORD GUARANTEE
// }

// function shuffle(arr) {
//   return [...arr].sort(() => Math.random() - 0.5);
// }

// // ============================================================================
// // 100 abstract, chaotic one-word seed words
// // ============================================================================

// async function generateChaosSeeds(category) {
//   const chaosPrompt = `
// Generate exactly **100 SINGLE-WORD “viral curiosity seeds”**.

// Each word must:
// • Be ONE single English word.
// • Contain emotional or visual tension (mystery, contrast, discovery, risk, decay, rupture, anomaly).
// • Be broad enough to inspire ANY real-world frontier-curiosity article.
// • NOT be a factual claim.
// • NOT be scientific jargon.
// • NOT be category-specific.
// • NOT be synonyms of each other.
// • NOT cluster around the same theme.

// Think in the style of TikTok hooks:
// • “Vanish”
// • “Pulse”
// • “Outlier”
// • “Threshold”
// • “Archive”

// Stylistic requirement:
// • Maximum semantic diversity
// • Geological, cosmic, mechanical, temporal, archival, ecological, structural metaphors

// Forbidden:
// • More than one word
// • Hyphens or numbers
// • Invented nonsense words

// Return ONLY a bullet list.
// Exactly 100 lines.
// One word per line.
// `;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: chaosPrompt }],
//     });

//     return extractWordList(completion.choices[0].message.content);
//   } catch (err) {
//     console.error("❌ Chaos seed generation failed:", err.message);
//     return [];
//   }
// }

// // ============================================================================
// // SECONDARY CLEANUP — regenerate seeds if GPT misbehaves
// // ============================================================================

// async function regenerateOneWordSeeds(previousWords) {
//   const prompt = `
// Fix this list of seed words by returning ONLY valid one-word abstract seeds.

// Rules:
// • One single English word only
// • No spaces, no hyphens, no numbers
// • Abstract, metaphorical, varied
// • No category-specific terms

// Problematic seeds:
// ${previousWords.join(", ")}

// Return a bullet list of 30 correct one-word seeds.
// `;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//     });

//     return extractWordList(completion.choices[0].message.content);
//   } catch {
//     return [];
//   }
// }

// // ============================================================================
// // FALLBACK
// // ============================================================================
// function generateFallbackConcepts(category) {
//   return {
//     concepts: [],
//     axes: [],
//     seeds: [],
//   };
// }

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
