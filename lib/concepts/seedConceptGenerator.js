// ============================================================================
// CurioWire — seedConceptGenerator.js (A1 — FULL CHAOS MODEL)
// v2.0 — GPT-generated abstract seed-words → ultra-wow concepts
// This version replaces category-bound seeds with true semantic chaos.
// ============================================================================

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// MAIN EXPORT: generateConceptSeeds(category)
// Returns exactly 5 WOW-concepts, based on GPT-generated abstract seeds.
// ============================================================================

export async function generateConceptSeeds(category) {
  try {
    // STEP 1 — Ask GPT for 30 abstract, varied, unrelated seed-words
    const seedWords = await generateChaosSeeds(category);

    if (!seedWords.length) {
      console.warn("⚠️ Chaos seed generation failed → using fallback");
      return generateFallbackConcepts(category);
    }

    // STEP 2 — Randomly pick 3 seed words
    const randomSeeds = shuffle(seedWords).slice(0, 3);

    // STEP 3 — Ask GPT to create 5 WOW curiosity concepts
    const conceptPrompt = buildConceptPrompt(category, randomSeeds);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: conceptPrompt }],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const ideas = extractList(raw);

    if (!ideas.length) {
      console.warn(`⚠️ GPT concept list empty for ${category} → fallback`);
      return generateFallbackConcepts(category);
    }

    return ideas.slice(0, 5);
  } catch (err) {
    console.error("💥 Full chaos concept generation failed:", err.message);
    return generateFallbackConcepts(category);
  }
}

// ============================================================================
// STEP 1 — Generate 30 fully abstract, chaotic, category-neutral seed words
// ============================================================================
async function generateChaosSeeds(category) {
  const chaosPrompt = `
You are generating **30 completely abstract, semantically varied, non-category-specific seed words**.

These words must:
• NOT be tied to the category "${category}"
• NOT be overly scientific/technical
• NOT repeat patterns
• Be **weird, conceptual, symbolic, sensory, or metaphorical**
• Have **maximum variety**
• Include textures, motions, fragments, emotions, forces, shapes, artifacts, and abstract nouns
• NEVER form a theme

Examples of acceptable style:
"glass, drift, pulse, fracture, resin, echo, tide, chalk, memory, dust, orbit, trace, anchor"

Examples of what to AVOID:
- famous scientific terms
- category names (astronomy, biology, physics…)
- planets, countries, people
- anything too concrete (lion, doctor, bicycle)
- anything too common (sun, water, light)

Return ONLY a bullet list of **30 single words**.
Each seed must be ONE word only.
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
// STEP 2 — Build WOW concept prompt
// ============================================================================
function buildConceptPrompt(category, seeds) {
  return `
You are generating **5 ultra-wow, mass-appeal curiosity concepts**  
for category: ${category.toUpperCase()}.

Use ALL THREE of these abstract seed words as conceptual inspiration:
→ ${seeds.join(", ")}

These MUST become **concepts**, not titles, not news, not summaries.

====================================================================
🎇 WOW-FACTOR REQUIREMENT — EXTREMELY IMPORTANT
Each concept MUST provoke a “WAIT… WHAT?!” reaction.
Use mechanisms like:

1. **Time Paradox**  
2. **Scale Shock**  
3. **Hidden Connection**  
4. **Natural Absurdity**  
5. **Reversal of Assumption**  
6. **Historical Echo**

====================================================================
RULES:
• Concepts must be clear and not technical  
• Not common knowledge  
• Not tied to current news  
• Not academic papers  
• MUST be about real science/history/culture/nature  
• MUST have a strong curiosity hook  
• Sound like the source of an amazing curiosity article  

====================================================================
FORMAT:
Return ONLY a bullet list of 5 concepts.
Each concept: 1–2 sentences.
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
    .map((l) => l.replace(/[^a-zA-Z]/g, "").toLowerCase())
    .filter((l) => l.length >= 3 && l.length <= 20);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ============================================================================
// FALLBACK (rarely used)
// ============================================================================
function generateFallbackConcepts(category) {
  return [
    `A forgotten discovery reshaping our modern understanding of ${category}.`,
    `An ancient event that predicted a principle in today’s ${category} world.`,
    `A natural phenomenon that behaves opposite of what people assume.`,
    `A timeline paradox in the history of ${category}.`,
    `A hidden connection between two things thought unrelated.`,
  ];
}
