// // === ARTICLE ANALYSIS UTILS ===
// // Håndterer linking til historisk kuriositet og korte tematiske sammendrag

// import OpenAI from "openai";
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// import { CATEGORY_DEFINITIONS } from "./categoryDefinitions.js";

// // ============================================================================
// // 1. linkHistoricalStory(topic)
// // ============================================================================
// // ============================================================================
// // MAIN EXPORT
// // topic: the WOW concept picked from seedConceptGenerator
// // category: the article category ("history", "space", etc.)
// // ============================================================================

// export async function linkHistoricalStory(topic, category) {
//   const categoryDefinition = CATEGORY_DEFINITIONS[category];

//   const prompt = `
// You are generating a **single factual WOW-echo curiosity** that connects to:

// TOPIC:
// "${topic}"

// CATEGORY:
// "${category.toUpperCase()}"

// CATEGORY DEFINITION:
// "${categoryDefinition}"

// Your task is to produce **one real, surprising, verifiable fact** that mirrors or
// echoes the concept — BUT it must stay *100% inside this category*.

// ===============================================================================
// STRICT CATEGORY LOCK — DO NOT VIOLATE THIS
// ===============================================================================
// You MUST comply with all three rules:

// 1) The curiosity MUST clearly belong to the category above.
// 2) If ANY part of the idea drifts into another domain (history, geopolitics,
//    general science, medicine, culture, psychology, etc.), you MUST reject it.
// 3) If the topic concept naturally pulls toward another domain, reinterpret
//    the concept metaphorically so that the resulting curiosity fits the category
//    definition — without breaking factual accuracy.

// If your idea violates even one rule above:
// → DISCARD IT
// → Generate a new curiosity that fits the category definition perfectly.
// ===============================================================================

// ===============================================================================
// WOW-FACTOR REQUIREMENTS
// ===============================================================================
// The curiosity must be:

// • 100% real and fact-checkable
// • Surprising, paradoxical, ironic, or mind-bending
// • Simple enough that anyone instantly “gets it”
// • Not common knowledge
// • Not a vague summary — must include a concrete event, timeline, or fact
// • Not a metaphor, not poetry, not speculation
// • Not fiction, not mythology (unless historically attested)
// • Suitable as the emotional “hook” for a curiosity article

// It should deliver the same emotional punch as:
// • “Cleopatra lived closer to the iPhone than to the pyramids being built.”
// • “NASA lost contact with a probe for 22 years — then it suddenly called back.”
// • “Ancient Romans used concrete that gets stronger as it ages.”
// • “Some Antarctic microbes survive by literally digesting sunlight.”
// ===============================================================================

// FORMAT RULES:
// • Output MUST be 1–2 sentences (no more, no less)
// • NO bullet points
// • NO lists
// • NO commentary
// • NO disclaimers
// • NO intro or outro text

// Return ONLY the curiosity.
// Begin now.
// `;

//   try {
//     const res = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       temperature: 0.85, // high enough for WOW, low enough for factual stability
//       max_tokens: 150,
//       messages: [{ role: "user", content: prompt }],
//     });

//     const output = res.choices?.[0]?.message?.content?.trim();

//     if (!output) {
//       console.warn("⚠️ linkedHistoricalStory returned empty — fallback used.");
//       return fallbackHistoricalCuriosity(category);
//     }

//     return output;
//   } catch (err) {
//     console.error("💥 linkedHistoricalStory error:", err.message);
//     return fallbackHistoricalCuriosity(category);
//   }
// }

// // ============================================================================
// // FALLBACK (safer than returning null)
// // ============================================================================
// function fallbackHistoricalCuriosity(category) {
//   switch (category) {
//     case "history":
//       return "In 1835, New York newspapers convinced thousands that the Moon was filled with bat-people, marking one of the earliest and most successful mass-media hoaxes in history.";
//     case "space":
//       return "In 1972, Apollo 17 astronauts reported seeing mysterious flashes of light in space — cosmic rays striking their retinas directly.";
//     case "science":
//       return "Some radioactive materials spontaneously heat themselves so much that they can boil water without any flame or spark.";
//     case "nature":
//       return "The largest living organism on Earth is a single underground fungus in Oregon that spans over 9 square kilometers.";
//     case "world":
//       return "During the Cold War, Sweden spent decades hunting a 'mysterious foreign submarine' — which turned out to be mating fish releasing popping sounds.";
//     case "sports":
//       return "In 1960, an Italian marathoner was disqualified for running the Olympic marathon barefoot — yet still finished in the top ten.";
//     case "technology":
//       return "The first computer bug ever recorded was a literal moth taped inside a logbook at Harvard in 1947.";
//     case "culture":
//       return "In medieval Ireland, poets held legal status equal to kings, and insulting a poet could result in criminal fines.";
//     case "products":
//       return "The world’s first synthetic plastic was accidentally created in 1907 when a chemist overheated a mixture he was trying to improve.";
//     case "health":
//       return "Human bones are constantly dissolving and rebuilding themselves, replacing an entire adult skeleton roughly every decade.";
//     default:
//       return "Some historical curiosities are stranger than fiction — yet entirely real.";
//   }
// }

// // ============================================================================
// // 2. summarizeTheme(topic, linkedStory)
// // ============================================================================
// export async function summarizeTheme(topic, linkedStory) {
//   const summaryPrompt = `
// Summarize the following two texts into a short dual phrase of no more than 8 words each.

// 1. A short theme phrase describing the modern topic.
// 2. A short phrase describing the historical curiosity.

// Respond in this exact format:
// Theme: <short phrase>
// Story: <short phrase>

// Text A (topic): ${topic}
// Text B (curiosity): ${linkedStory}
// `;

//   try {
//     const compactSummary = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: summaryPrompt }],
//       max_tokens: 40,
//       temperature: 0.3,
//     });

//     const compactText = compactSummary.choices[0]?.message?.content || "";

//     const themeMatch = compactText.match(/Theme:\s*(.+)/i);
//     const storyMatch = compactText.match(/Story:\s*(.+)/i);

//     return {
//       shortTheme: themeMatch ? themeMatch[1].trim() : "",
//       shortStory: storyMatch ? storyMatch[1].trim() : "",
//     };
//   } catch (err) {
//     console.warn("⚠️ Compact summary failed:", err.message);
//     return { shortTheme: "", shortStory: "" };
//   }
// }
// ============================================================================
// ARTICLE ANALYSIS UTILS — NEW VERSION
// Replaces historical curiosity with: factual anchor + research domain framing
// ============================================================================

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
import { CATEGORY_DEFINITIONS } from "./categoryDefinitions.js";

// ============================================================================
// 1. linkHistoricalStory(topic, category)
// NEW PURPOSE:
// • NOT generating a new curiosity
// • NOT pulling us toward “classic trivia”
// • INSTEAD: generate a factual research-domain anchor for the chosen concept
//
// Output shape:
// {
//   field: "paleomagnetism",
//   anchor: "deep-ocean sediment core reversal records",
//   note: "mechanism partially debated; evidence well-documented",
//   phrase: "geomagnetic memory in ancient sediments"
// }
//
// The `phrase` is a compact thematic echo used in refinement.
// ============================================================================

export async function linkHistoricalStory(topic, category) {
  const categoryDefinition = CATEGORY_DEFINITIONS[category];

  const prompt = `
You are NOT generating a curiosity.
You are generating a **factual research anchor** that helps an article expand the following concept:

TOPIC:
"${topic}"

CATEGORY:
"${category.toUpperCase()}"

CATEGORY DEFINITION:
"${categoryDefinition}"

===============================================================================
YOUR TASK — VERY IMPORTANT
===============================================================================
Create a compact factual framing that:
• Identifies a **real scientific/historical/cultural research field** connected to the topic  
• Names **one concrete form of evidence or dataset** relevant to that field  
• States **one caution note** (e.g., "mechanism debated", "interpretation disputed", "data incomplete")  
• Produces **one short poetic-but-factual phrase** that summarizes the anchor (max 6–8 words)

===============================================================================
ABSOLUTE REQUIREMENTS (NO EXCEPTIONS)
===============================================================================
• Must not invent fictional fields or discoveries  
• Must not generate a trivia-style curiosity  
• Must not reference overused facts (Roman concrete, tardigrades, Voynich, pyramids, giant fungi, etc.)  
• Must be niche, specific, and academically grounded  
• The field must be a real domain used by real researchers  
• The anchor must reference real types of evidence (ice cores, stratigraphy, inscriptions, tree rings, satellite scatterometry, fossil layers, radiocarbon records)  
• The note must be accurate and cautious  
• The phrase must be factual but evocative

===============================================================================
OUTPUT FORMAT (STRICT)
Return ONLY a JSON object like this:

{
  "field": "...",
  "anchor": "...",
  "note": "...",
  "phrase": "..."
}

No commentary. No additional text.
===============================================================================
Begin now.
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      console.warn("⚠️ linkedHistoricalStory returned empty — using fallback.");
      return fallbackHistoricalAnchor(category);
    }

    // Try to parse JSON safely
    try {
      return JSON.parse(raw);
    } catch {
      console.warn(
        "⚠️ linkedHistoricalStory JSON parse failed — using fallback."
      );
      return fallbackHistoricalAnchor(category);
    }
  } catch (err) {
    console.error("💥 linkedHistoricalStory error:", err.message);
    return fallbackHistoricalAnchor(category);
  }
}

// ============================================================================
// FALLBACK — returns safe anchor structure instead of curiosity
// ============================================================================

function fallbackHistoricalAnchor(category) {
  switch (category) {
    case "history":
      return {
        field: "epigraphy",
        anchor:
          "multilingual stone inscriptions from cross-cultural trade zones",
        note: "translation debates persist between scholars",
        phrase: "trade routes carved in stone",
      };

    case "science":
      return {
        field: "geochemistry",
        anchor: "isotopic signatures in volcanic ash and mineral phases",
        note: "environmental reconstructions remain partially uncertain",
        phrase: "chemistry stored in ancient layers",
      };

    case "space":
      return {
        field: "stellar archaeology",
        anchor: "spectral absorption fingerprints of ancient stars",
        note: "metallicity estimates vary across models",
        phrase: "ancestry written in starlight",
      };

    case "nature":
      return {
        field: "paleoecology",
        anchor: "fossil pollen sequences in lake-bed sediments",
        note: "regional climate correlations under active study",
        phrase: "ecosystems preserved in pollen",
      };

    case "world":
      return {
        field: "historical demography",
        anchor: "archival census fragments and tax rolls",
        note: "population models include uncertainty margins",
        phrase: "societies traced through numbers",
      };

    case "culture":
      return {
        field: "symbolic anthropology",
        anchor: "ritual artifacts found in household strata",
        note: "symbolic interpretations not universally agreed",
        phrase: "meaning encoded in objects",
      };

    case "sports":
      return {
        field: "kinetic performance history",
        anchor: "archived match logs and early motion analyses",
        note: "technique attribution sometimes disputed",
        phrase: "movement recorded through time",
      };

    case "technology":
      return {
        field: "computing history",
        anchor: "lab notebooks from early hardware prototypes",
        note: "authorship of innovations often contested",
        phrase: "ideas etched in circuits",
      };

    case "products":
      return {
        field: "industrial archaeology",
        anchor: "manufacturing marks on early machine components",
        note: "supply chains reconstructed indirectly",
        phrase: "industry hidden in metal",
      };

    case "health":
      return {
        field: "medical paleopathology",
        anchor: "lesion patterns in ancient skeletal remains",
        note: "disease attribution can be probabilistic",
        phrase: "illness traced in bone",
      };

    default:
      return {
        field: "archival studies",
        anchor: "fragmented records preserved through accidental survival",
        note: "interpretations remain open",
        phrase: "memory recovered from dust",
      };
  }
}

// ============================================================================
// 2. summarizeTheme(topic, linkedStory)
// Now expects linkedStory = { field, anchor, note, phrase }
// ============================================================================

export async function summarizeTheme(topic, linkedStory) {
  const summaryPrompt = `
Create two ultra-short summary phrases (max 6–8 words each).

1. Theme: capturing the essence of the TOPIC.
2. Anchor: capturing the essence of the factual FRAME (linkedStory.phrase).

Respond EXACTLY in this format:

Theme: <short theme>
Anchor: <short anchor>

TOPIC:
${topic}

FACTUAL FRAME:
Field: ${linkedStory.field}
Anchor evidence: ${linkedStory.anchor}
Phrase: ${linkedStory.phrase}
Note: ${linkedStory.note}
`;

  try {
    const compactSummary = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: summaryPrompt }],
      max_tokens: 50,
      temperature: 0.3,
    });

    const text = compactSummary.choices[0]?.message?.content || "";

    const themeMatch = text.match(/Theme:\s*(.+)/i);
    const anchorMatch = text.match(/Anchor:\s*(.+)/i);

    return {
      shortTheme: themeMatch ? themeMatch[1].trim() : "",
      shortAnchor: anchorMatch ? anchorMatch[1].trim() : "",
    };
  } catch (err) {
    console.warn("⚠️ summarizeTheme failed:", err.message);
    return { shortTheme: "", shortAnchor: "" };
  }
}
