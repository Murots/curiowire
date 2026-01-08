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

    // Try to parse JSON safely (strip code fences)
    try {
      const cleaned = raw.replace(/```json|```/gi, "").trim();
      return JSON.parse(cleaned);
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
