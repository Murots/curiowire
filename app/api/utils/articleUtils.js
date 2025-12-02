// === ARTICLE ANALYSIS UTILS ===
// Håndterer linking til historisk kuriositet og korte tematiske sammendrag

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
import { CATEGORY_DEFINITIONS } from "./categoryDefinitions.js";

// ============================================================================
// 1. linkHistoricalStory(topic)
// ============================================================================
// ============================================================================
// MAIN EXPORT
// topic: the WOW concept picked from seedConceptGenerator
// category: the article category ("history", "space", etc.)
// ============================================================================

export async function linkHistoricalStory(topic, category) {
  const categoryDefinition = CATEGORY_DEFINITIONS[category];

  const prompt = `
You are generating a **single factual WOW-echo curiosity** that connects to:

TOPIC:
"${topic}"

CATEGORY:
"${category.toUpperCase()}"

CATEGORY DEFINITION:
"${categoryDefinition}"

Your task is to produce **one real, surprising, verifiable fact** that mirrors or
echoes the concept — BUT it must stay *100% inside this category*.

===============================================================================
STRICT CATEGORY LOCK — DO NOT VIOLATE THIS
===============================================================================
You MUST comply with all three rules:

1) The curiosity MUST clearly belong to the category above.
2) If ANY part of the idea drifts into another domain (history, geopolitics,
   general science, medicine, culture, psychology, etc.), you MUST reject it.
3) If the topic concept naturally pulls toward another domain, reinterpret
   the concept metaphorically so that the resulting curiosity fits the category
   definition — without breaking factual accuracy.

If your idea violates even one rule above:
→ DISCARD IT
→ Generate a new curiosity that fits the category definition perfectly.
===============================================================================

===============================================================================
WOW-FACTOR REQUIREMENTS
===============================================================================
The curiosity must be:

• 100% real and fact-checkable  
• Surprising, paradoxical, ironic, or mind-bending  
• Simple enough that anyone instantly “gets it”  
• Not common knowledge  
• Not a vague summary — must include a concrete event, timeline, or fact  
• Not a metaphor, not poetry, not speculation  
• Not fiction, not mythology (unless historically attested)  
• Suitable as the emotional “hook” for a curiosity article  

It should deliver the same emotional punch as:
• “Cleopatra lived closer to the iPhone than to the pyramids being built.”
• “NASA lost contact with a probe for 22 years — then it suddenly called back.”
• “Ancient Romans used concrete that gets stronger as it ages.”
• “Some Antarctic microbes survive by literally digesting sunlight.”
===============================================================================

FORMAT RULES:
• Output MUST be 1–2 sentences (no more, no less)
• NO bullet points
• NO lists
• NO commentary
• NO disclaimers
• NO intro or outro text

Return ONLY the curiosity.
Begin now.
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85, // high enough for WOW, low enough for factual stability
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const output = res.choices?.[0]?.message?.content?.trim();

    if (!output) {
      console.warn("⚠️ linkedHistoricalStory returned empty — fallback used.");
      return fallbackHistoricalCuriosity(category);
    }

    return output;
  } catch (err) {
    console.error("💥 linkedHistoricalStory error:", err.message);
    return fallbackHistoricalCuriosity(category);
  }
}

// ============================================================================
// FALLBACK (safer than returning null)
// ============================================================================
function fallbackHistoricalCuriosity(category) {
  switch (category) {
    case "history":
      return "In 1835, New York newspapers convinced thousands that the Moon was filled with bat-people, marking one of the earliest and most successful mass-media hoaxes in history.";
    case "space":
      return "In 1972, Apollo 17 astronauts reported seeing mysterious flashes of light in space — cosmic rays striking their retinas directly.";
    case "science":
      return "Some radioactive materials spontaneously heat themselves so much that they can boil water without any flame or spark.";
    case "nature":
      return "The largest living organism on Earth is a single underground fungus in Oregon that spans over 9 square kilometers.";
    case "world":
      return "During the Cold War, Sweden spent decades hunting a 'mysterious foreign submarine' — which turned out to be mating fish releasing popping sounds.";
    case "sports":
      return "In 1960, an Italian marathoner was disqualified for running the Olympic marathon barefoot — yet still finished in the top ten.";
    case "technology":
      return "The first computer bug ever recorded was a literal moth taped inside a logbook at Harvard in 1947.";
    case "culture":
      return "In medieval Ireland, poets held legal status equal to kings, and insulting a poet could result in criminal fines.";
    case "products":
      return "The world’s first synthetic plastic was accidentally created in 1907 when a chemist overheated a mixture he was trying to improve.";
    case "health":
      return "Human bones are constantly dissolving and rebuilding themselves, replacing an entire adult skeleton roughly every decade.";
    default:
      return "Some historical curiosities are stranger than fiction — yet entirely real.";
  }
}
// export async function linkHistoricalStory(topic) {
//   const prompt = `
// Your job is to find ONE *real, factual, verifiable* curiosity that connects in a surprising
// or conceptually mirrored way to this topic:

// "${topic}"

// Your output MUST deliver a strong **WOW-factor**:
// - Mind-blowing, but still real
// - Something that makes the reader literally pause ("Wait, WHAT?!")
// - Not technical, not detailed science, not academic jargon
// - Not common knowledge
// - Must be simple enough for any reader to instantly understand
// - Must be surprising, paradoxical, ironic, or historically shocking
// - Should feel almost impossible — but true

// Absolutely avoid:
// - Overused trivia (e.g. "honey never spoils")
// - Weak comparisons
// - Generic historical facts
// - Broad statements lacking a specific event or detail

// The result must:
// - Be 1–2 sentences
// - Feel like the anchor of a viral curiosity-driven article
// - Produce the same emotional effect as these examples:
//     • "Cleopatra lived closer to the iPhone than to the pyramids being built."
//     • "NASA lost contact with a probe for 22 years — then it suddenly called back."
//     • "In 1904, a solar storm lit up telegraph lines that weren’t even plugged in."
//     • "There are trees alive today that older than the Roman Empire."

// Return ONLY the curiosity. No intro. No explanation.
// `;

//   const res = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//     max_tokens: 150,
//     temperature: 0.9, // litt høyere for kreativitet, men fortsatt faktaforankret
//   });

//   return res.choices[0]?.message?.content?.trim() || null;
// }

// ============================================================================
// 2. summarizeTheme(topic, linkedStory)
// ============================================================================
export async function summarizeTheme(topic, linkedStory) {
  const summaryPrompt = `
Summarize the following two texts into a short dual phrase of no more than 8 words each.

1. A short theme phrase describing the modern topic.
2. A short phrase describing the historical curiosity.

Respond in this exact format:
Theme: <short phrase>
Story: <short phrase>

Text A (topic): ${topic}
Text B (curiosity): ${linkedStory}
`;

  try {
    const compactSummary = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: summaryPrompt }],
      max_tokens: 40,
      temperature: 0.3,
    });

    const compactText = compactSummary.choices[0]?.message?.content || "";

    const themeMatch = compactText.match(/Theme:\s*(.+)/i);
    const storyMatch = compactText.match(/Story:\s*(.+)/i);

    return {
      shortTheme: themeMatch ? themeMatch[1].trim() : "",
      shortStory: storyMatch ? storyMatch[1].trim() : "",
    };
  } catch (err) {
    console.warn("⚠️ Compact summary failed:", err.message);
    return { shortTheme: "", shortStory: "" };
  }
}
