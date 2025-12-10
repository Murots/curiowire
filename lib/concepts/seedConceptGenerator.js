// // ============================================================================
// // CurioWire — seedConceptGenerator.js (A1 — FULL CHAOS MODEL)
// // v2.3 — TRUE ONE-WORD SEEDS (Guaranteed)
// // Now includes:
// // • Mandatory one-word constraint
// // • Hard filtering + GPT validation fallback
// // • Category definitions
// // • Strict category alignment in prompts
// // • Enhanced logging
// // ============================================================================

// import OpenAI from "openai";
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// import { CATEGORY_DEFINITIONS } from "../../app/api/utils/categoryDefinitions.js";

// // ============================================================================
// // MAIN EXPORT: generateConceptSeeds(category)
// // ============================================================================
// export async function generateConceptSeeds(category) {
//   try {
//     console.log(`\n=== [CONCEPT SEEDING: ${category.toUpperCase()}] ===`);

//     // STEP 1 — Generate 30 chaos seeds
//     let seedWords = await generateChaosSeeds(category);

//     // Filter out multiword seeds (failsafe)
//     const before = seedWords.length;
//     seedWords = seedWords.filter((w) => !w.includes(" "));
//     const after = seedWords.length;

//     if (before !== after) {
//       console.warn(
//         `🚫 Filtered out ${before - after} invalid multi-word seeds.`
//       );
//     }

//     // If GPT still returned garbage, regenerate
//     if (seedWords.length < 10) {
//       console.warn(
//         "⚠️ Too few valid seeds → regenerating via fallback GPT cleanup…"
//       );
//       seedWords = await regenerateOneWordSeeds(seedWords);
//     }

//     if (!seedWords.length) {
//       console.warn("⚠️ Chaos seed final fail → using fallback concepts");
//       return generateFallbackConcepts(category);
//     }

//     // STEP 2 — Pick 3 random seeds
//     const randomSeeds = shuffle(seedWords).slice(0, 3);
//     console.log(`[SEEDS PICKED] ${category}: ${randomSeeds.join(", ")}`);

//     // STEP 3 — Build and run WOW concept generator
//     const conceptPrompt = buildConceptPrompt(category, randomSeeds);

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: conceptPrompt }],
//     });

//     const raw = completion.choices?.[0]?.message?.content || "";
//     const ideas = extractList(raw);

//     if (!ideas.length) {
//       console.warn(`⚠️ Empty concept list for ${category} → fallback`);
//       return generateFallbackConcepts(category);
//     }

//     console.log(`[CONCEPTS RETURNED] ${ideas.length} items for ${category}`);

//     return ideas.slice(0, 5);
//   } catch (err) {
//     console.error("💥 Full chaos concept generation failed:", err.message);
//     return generateFallbackConcepts(category);
//   }
// }

// // ============================================================================
// // STEP 1 — 30 abstract, chaotic seed words (strictly one-word)
// // ============================================================================
// async function generateChaosSeeds(category) {
//   const chaosPrompt = `
// You are generating exactly **30 SINGLE-WORD abstract seed terms**.

// STRICT RULES:
// • Each seed MUST be **one single English word** (no spaces, no hyphens).
// • Not related to the category topic — these seeds must be abstract only.
// • NOT related to: ${CATEGORY_DEFINITIONS[category]}
// • NOT scientific terms, not concrete nouns (no animals, objects, tools, planets)
// • Must be abstract, metaphorical, sensory, symbolic, emotional, or conceptual.
// • Maximize variation: textures, moods, fragments, distortions, forces, shapes.
// • NEVER form a theme or cluster.
// • NO repeated words.
// • NO multi-word expressions.

// Return ONLY a bullet list of **30 single words**.
// One word per line.
// No explanations.
// Start now.
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
// // SECONDARY CLEANUP — regenerate seeds if too many invalid
// // ============================================================================
// async function regenerateOneWordSeeds(previousWords) {
//   const prompt = `
// Fix this list of seed words by returning **ONLY valid one-word abstract seeds**.

// Rules:
// • One single English word only
// • No spaces, no hyphens
// • No numbers
// • No category-related terms
// • No concrete nouns
// • Abstract, varied, metaphorical

// Here are the problematic seeds:
// ${previousWords.join(", ")}

// Return a bullet list of **30 correct one-word seeds**.
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
// // STEP 2 — WOW CONCEPT PROMPT
// // ============================================================================
// function buildConceptPrompt(category, seeds) {
//   return `
// You are generating **5 ultra-wow, mass-appeal curiosity concepts**
// for category: **${category.toUpperCase()}**.

// The concept MUST fit this category definition:
// "${CATEGORY_DEFINITIONS[category]}"

// ${
//   category === "technology"
//     ? `
// ====================================================================
// IMPORTANT TECHNOLOGY RULES:
// • The concept must be explicitly rooted in modern or future technology.
// • Must include at least one concrete technological mechanism
//   (e.g., AI system, neural interface, encryption method, robotics process,
//    microchip architecture, data transmission, algorithmic behavior).
// • Must not drift into historical or mythological themes unless they relate
//   directly to a technological process or device.
// • No vague metaphors as stand-alone concepts (e.g., 'whispering AI' is NOT allowed
//   unless supported by a real mechanism).
// • Must reference a real or speculative device, system, algorithm, or invention.
// ====================================================================
// `
//     : ""
// }

// Use ALL THREE abstract seeds:
// → ${seeds.join(", ")}

// ====================================================================
// WOW-FACTOR REQUIREMENTS:
// Each concept MUST use at least one:
// • Time paradox
// • Scale shock
// • Hidden connection
// • Natural absurdity
// • Reversal of assumption
// • Historical echo
// ====================================================================

// ====================================================================
// FACTUALITY REQUIREMENT (NEW RULE):
// • Concepts must be grounded in factual reality.
// • They may be surprising or counterintuitive — but NOT fictional.
// • They MUST be compatible with creating a **fact-based curiosity article**
//   that can pass a strict fact-check afterward.
// • Avoid any scenario that contradicts known science, history, or physical laws.
// ====================================================================

// RULES:
// • Must be clear, non-technical
// • Not tied to news
// • MUST feel like a curiosity article seed
// • MUST be original, surprising, highly engaging
// • MUST fit the category definition above
// • MUST be plausible and fact-compatible

// ====================================================================
// STRUCTURE REQUIREMENT (ALL CATEGORIES):
// Each concept MUST be exactly **two sentences**.
// No single-phrase titles or fragments are allowed.
// Each concept must clearly describe:
// • What the phenomenon is
// • Why it is surprising or important
// ====================================================================

// FORMAT:
// Return ONLY a bullet list of 5 concepts.
// Each concept must be **exactly two sentences**.
// Start now.
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
// // FALLBACK
// // ============================================================================
// function generateFallbackConcepts(category) {
//   return [
//     `A forgotten discovery reshaping our modern understanding of ${category}.`,
//     `A paradox in ${category} that challenges assumptions.`,
//     `A natural mechanism in ${category} that behaves opposite of what people believe.`,
//     `A timeline twist in the history of ${category}.`,
//     `A hidden connection between two unrelated phenomena in ${category}.`,
//   ];
// }
// ============================================================================
// CurioWire — seedConceptGenerator.js (A1 — FULL CHAOS MODEL)
// v2.3 — TRUE ONE-WORD SEEDS (Guaranteed)
// Now includes:
// • Mandatory one-word constraint
// • Hard filtering + GPT validation fallback
// • Category definitions
// • Strict category alignment in prompts
// • Enhanced logging
// ============================================================================

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
import { CATEGORY_DEFINITIONS } from "../../app/api/utils/categoryDefinitions.js";

// ============================================================================
// MAIN EXPORT: generateConceptSeeds(category)
// ============================================================================
export async function generateConceptSeeds(category) {
  try {
    console.log(`\n=== [CONCEPT SEEDING: ${category.toUpperCase()}] ===`);

    // STEP 1 — Generate 30 chaos seeds
    let seedWords = await generateChaosSeeds(category);

    // Filter out multiword seeds (failsafe)
    const before = seedWords.length;
    seedWords = seedWords.filter((w) => !w.includes(" "));
    const after = seedWords.length;

    if (before !== after) {
      console.warn(
        `🚫 Filtered out ${before - after} invalid multi-word seeds.`
      );
    }

    // If GPT still returned garbage, regenerate
    if (seedWords.length < 10) {
      console.warn(
        "⚠️ Too few valid seeds → regenerating via fallback GPT cleanup…"
      );
      seedWords = await regenerateOneWordSeeds(seedWords);
    }

    if (!seedWords.length) {
      console.warn("⚠️ Chaos seed final fail → using fallback concepts");
      return generateFallbackConcepts(category);
    }

    // STEP 2 — Pick 3 random seeds
    const randomSeeds = shuffle(seedWords).slice(0, 3);
    console.log(`[SEEDS PICKED] ${category}: ${randomSeeds.join(", ")}`);

    // STEP 3 — Build and run WOW concept generator
    const conceptPrompt = buildConceptPrompt(category, randomSeeds);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: conceptPrompt }],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const ideas = extractList(raw);

    if (!ideas.length) {
      console.warn(`⚠️ Empty concept list for ${category} → fallback`);
      return generateFallbackConcepts(category);
    }

    console.log(`[CONCEPTS RETURNED] ${ideas.length} items for ${category}`);

    return ideas.slice(0, 5);
  } catch (err) {
    console.error("💥 Full chaos concept generation failed:", err.message);
    return generateFallbackConcepts(category);
  }
}

// ============================================================================
// STEP 1 — 30 abstract, chaotic seed words (strictly one-word)
// ============================================================================
async function generateChaosSeeds(category) {
  const chaosPrompt = `
Generate exactly **30 SINGLE-WORD “viral curiosity seeds”**.

These words must:
• Be ONE single English word.
• Suggest visual or emotional tension (mystery, contrast, discovery).
• Be broad enough to apply to ANY real-world curiosity.
• NOT be factual claims themselves.
• NOT be scientific jargon or technical terms.
• NOT be category-specific.
• Avoid overly poetic or abstract terms.

Think in the style of TikTok hooks:
• “Vanish”
• “Pulse”
• “Outlier”
• “Threshold”
• “Echoes”
• “Signal”
• “Collapse”
• “Archive”
• “Fossil”
• “Storm”
• “Pattern”

Return ONLY a bullet list of 30 single words.
One word per line.
No explanations.
Start now.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: chaosPrompt }],
    });

    return extractWordList(completion.choices[0].message.content);
  } catch (err) {
    console.error("❌ Chaos seed generation failed:", err.message);
    return [];
  }
}

// ============================================================================
// SECONDARY CLEANUP — regenerate seeds if too many invalid
// ============================================================================
async function regenerateOneWordSeeds(previousWords) {
  const prompt = `
Fix this list of seed words by returning **ONLY valid one-word abstract seeds**.

Rules:
• One single English word only
• No spaces, no hyphens
• No numbers
• No category-related terms
• No concrete nouns
• Abstract, varied, metaphorical

Here are the problematic seeds:
${previousWords.join(", ")}

Return a bullet list of **30 correct one-word seeds**.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return extractWordList(completion.choices[0].message.content);
  } catch {
    return [];
  }
}

// ============================================================================
// STEP 2 — WOW CONCEPT PROMPT
// ============================================================================
function buildConceptPrompt(category, seeds) {
  return `
You are generating **5 ultra-wow, mass-appeal curiosity concepts**  
for category: **${category.toUpperCase()}**.

The concept MUST fit this category definition:
"${CATEGORY_DEFINITIONS[category]}"

${
  category === "technology"
    ? `
====================================================================
IMPORTANT TECHNOLOGY RULES:
• The concept must be explicitly rooted in modern or future technology.
• Must include at least one concrete technological mechanism 
  (e.g., AI system, neural interface, encryption method, robotics process,
   microchip architecture, data transmission, algorithmic behavior).
• Must not drift into historical or mythological themes unless they relate 
  directly to a technological process or device.
• No vague metaphors as stand-alone concepts (e.g., 'whispering AI' is NOT allowed 
  unless supported by a real mechanism).
• Must reference a real or speculative device, system, algorithm, or invention.
====================================================================
`
    : ""
}

Use the three seed words only as hidden semantic inspiration — 
the concept does NOT need to mention them. 
Let them influence tone, contrast, imagery, or the type of curiosity 
without appearing in the text.
Seeds: ${seeds.join(", ")}

====================================================================
WOW-FACTOR REQUIREMENTS:
Each concept MUST use at least one:
• Forbidden contrast (two things that “should not” be related, but are)
• Unexpected survival (something tiny or forgotten that changed something big)
• Sudden reversal (the thing people assume is true turns out opposite)
• Lost-and-found mystery (a rediscovered event, artifact, or phenomenon)
• Unlikely chain reaction (small cause → huge effect)
====================================================================

====================================================================
META-VARIATION REQUIREMENTS (CRITICAL)
====================================================================
• Avoid all high-frequency curiosity topics that commonly appear in 
  online lists, popular science explainers, or AI-generated trivia. 
  If the idea resembles a commonly known curiosity, discard it.

• Each of the 5 concepts must explore a DISTINCT thematic domain.
  No two may rely on the same type of phenomenon, historical era, 
  scientific field, narrative structure, or emotional hook.

• Maximize semantic distance between all 5 concepts. They must feel 
  unrelated in imagery, premise, and underlying logic.

• Favor low-probability, under-represented real-world phenomena. 
  Prefer surprising angles, niche facts, rare mechanisms, forgotten 
  events, or overlooked scientific findings.

• Concepts should feel statistically rare — the opposite of 
  mainstream examples.
• After generating all 5 concepts, evaluate your own list. 
  If ANY two concepts feel similar in structure, theme, domain, 
  mechanism, or imagery, you MUST discard the weaker one and regenerate 
  until all 5 are maximally distinct.
====================================================================

====================================================================
FACTUALITY REQUIREMENT (REVISED):
• Concepts must be compatible with creating a fact-based curiosity article.
• They may involve mysteries, open questions, or phenomena that are still debated,
  as long as you describe them cautiously (“records suggest…”, “researchers propose…”).
• Do NOT use fictional events or supernatural claims.
• Your concept must remain grounded in reality, but may highlight strange, surprising,
  or little-known aspects of it.
• A mystery is allowed as long as the concept is grounded in verifiable 
  real-world research, phenomena, or historical documentation.
====================================================================

RULES:
• Must be clear, non-technical
• Not tied to news
• MUST feel like a curiosity article seed
• MUST be original, surprising, highly engaging
• MUST fit the category definition above
• MUST be plausible and fact-compatible

====================================================================
STRUCTURE REQUIREMENT (ALL CATEGORIES):
Each concept MUST be exactly **two sentences**.
No single-phrase titles or fragments are allowed.
Each concept must:
• Begin with a vivid, surprising image or claim.
• Then reveal the factual anchor that makes the curiosity real.
====================================================================

FORMAT:
Return ONLY a bullet list of 5 concepts.
Each concept must be **exactly two sentences**.
Start now.
`;
}

// ============================================================================
// HELPERS
// ============================================================================
function extractList(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
    .filter((l) => l.length > 20);
}

function extractWordList(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
    .map((l) => l.toLowerCase())
    .map((l) => l.replace(/[^a-z]/g, "")) // removes any non-letter
    .filter((l) => l.length >= 3 && l.length <= 20)
    .filter((l) => !l.includes(" ")); // ABSOLUTE SINGLE-WORD GUARANTEE
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ============================================================================
// FALLBACK
// ============================================================================
function generateFallbackConcepts(category) {
  return [
    `A forgotten discovery reshaping our modern understanding of ${category}.`,
    `A paradox in ${category} that challenges assumptions.`,
    `A natural mechanism in ${category} that behaves opposite of what people believe.`,
    `A timeline twist in the history of ${category}.`,
    `A hidden connection between two unrelated phenomena in ${category}.`,
  ];
}
