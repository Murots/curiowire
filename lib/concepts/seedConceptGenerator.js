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

// ============================================================================
// CATEGORY DEFINITIONS — ensures each concept fits the intended category
// ============================================================================
const CATEGORY_DEFINITIONS = {
  space:
    "All content related to the universe beyond Earth: stars, planets, galaxies, cosmic physics, space phenomena, exoplanets, black holes, cosmic timelines.",
  science:
    "Evidence-based natural science: biology, chemistry, physics, geology, evolution, medicine, climate research, empirical studies, natural mechanisms.",
  history:
    "Past events, civilizations, discoveries, ancient cultures, wars, timelines, historical phenomena, archaeology, myths connected to real history.",
  world:
    "Geopolitics, wars, diplomacy, global power structures, borders, nations, international relations, conflict zones, political systems, societal shifts.",
  nature:
    "Ecosystems, animals, plants, biomes, environment, oceans, forests, climate, survival mechanisms, natural cycles.",
  tech: "Human-made technology: machines, AI, digital systems, inventions, engineering, communication systems, algorithms, robotics, innovation.",
  culture:
    "Art, language, rituals, traditions, symbols, music, cultural evolution, heritage, identity, shared beliefs.",
  sport:
    "Physical performance, movement, sports history, competitive instincts, athletic limits, biomechanics, ancient games.",
  products:
    "Consumer products, materials, inventions, manufacturing methods, patents, design oddities, product origins.",
};

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
You are generating exactly **30 SINGLE-WORD abstract seed terms**.

STRICT RULES:
• Each seed MUST be **one single English word** (no spaces, no hyphens).
• NOT tied to the category "${category}"
• NOT related to: ${CATEGORY_DEFINITIONS[category]}
• NOT scientific terms, not concrete nouns (no animals, objects, tools, planets)
• Must be abstract, metaphorical, sensory, symbolic, emotional, or conceptual.
• Maximize variation: textures, moods, fragments, distortions, forces, shapes.
• NEVER form a theme or cluster.
• NO repeated words.
• NO multi-word expressions.

Return ONLY a bullet list of **30 single words**.
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

Use ALL THREE abstract seeds:
→ ${seeds.join(", ")}

====================================================================
WOW-FACTOR REQUIREMENTS:
Each concept MUST use at least one:
• Time paradox
• Scale shock
• Hidden connection
• Natural absurdity
• Reversal of assumption
• Historical echo
====================================================================
RULES:
• Must be clear, non-technical
• Not tied to news
• MUST feel like a curiosity article seed
• MUST be original, surprising, highly engaging
• MUST fit the category definition above
====================================================================
FORMAT:
Return ONLY a bullet list of 5 concepts.
Each 1–2 sentences long.
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
