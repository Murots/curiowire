// // === ARTICLE ANALYSIS UTILS ===
// // Håndterer analyse av tema, link til historisk hendelse og sammendrag

// import OpenAI from "openai";
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function analyzeTopic(topic, key) {
//   const analyzePrompt = `
// Summarize briefly what this concept is about, assuming it belongs to the category "${key}".
// Topic: "${topic}"
// Return a short description (max 1 sentence).
// `;
//   const analyzeResp = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: analyzePrompt }],
//     max_tokens: 40,
//     temperature: 0,
//   });
//   return (
//     analyzeResp.choices[0]?.message?.content?.trim() || "no clear summary found"
//   );
// }

// // === Forbedret kobling mot kuriositet ===
// export async function linkHistoricalStory(topicSummary) {
//   const prompt = `
// Find a surprising factual curiosity that connects conceptually to this modern topic:
// "${topicSummary}"

// The curiosity must:
// - Be real and verifiable (scientific, historical, cultural, or natural fact)
// - Sound almost unbelievable, paradoxical, or ironic
// - Create a surprising contrast or mirror to the modern topic
// - Be something the average person would not know
// - Trigger curiosity or awe ("Wait, that can't be true — but it is")
// - Avoid generic comparisons or overused trivia

// Examples of tone and structure:
// - "Cleopatra lived closer to the iPhone than the pyramids were built."
// - "NASA lost contact with a probe for 22 years — then it called back."
// - "Trees can 'talk' through underground fungal networks."

// Return ONE short 1–2 sentence fact that could serve as the foundation for a curiosity-driven article.
// `;

//   const res = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//     max_tokens: 120,
//     temperature: 0.8,
//   });

//   return res.choices[0]?.message?.content?.trim() || null;
// }

// export async function summarizeTheme(topicSummary, linkedStory) {
//   const summaryPrompt = `
// Summarize the following two texts into a short thematic description of no more than 8 words each.

// 1. What is the main *theme* of this topic?
// 2. What is the main *historical or human story* referenced?

// Respond in this format exactly:
// Theme: <short phrase>
// Story: <short phrase>

// Text A (topic summary): ${topicSummary}
// Text B (linked story): ${linkedStory}
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

// === ARTICLE ANALYSIS UTILS ===
// Håndterer linking til historisk kuriositet og korte tematiske sammendrag

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// 1. linkHistoricalStory(topic)
// ============================================================================
export async function linkHistoricalStory(topic) {
  const prompt = `
Your job is to find ONE *real, factual, verifiable* curiosity that connects in a surprising
or conceptually mirrored way to this topic:

"${topic}"

Your output MUST deliver a strong **WOW-factor**:
- Mind-blowing, but still real
- Something that makes the reader literally pause ("Wait, WHAT?!")
- Not technical, not detailed science, not academic jargon
- Not common knowledge
- Must be simple enough for any reader to instantly understand
- Must be surprising, paradoxical, ironic, or historically shocking
- Should feel almost impossible — but true

Absolutely avoid:
- Overused trivia (e.g. "honey never spoils")
- Weak comparisons
- Generic historical facts
- Broad statements lacking a specific event or detail

The result must:
- Be 1–2 sentences
- Feel like the anchor of a viral curiosity-driven article
- Produce the same emotional effect as these examples:
    • "Cleopatra lived closer to the iPhone than to the pyramids being built."
    • "NASA lost contact with a probe for 22 years — then it suddenly called back."
    • "In 1904, a solar storm lit up telegraph lines that weren’t even plugged in."
    • "There are trees alive today that older than the Roman Empire."

Return ONLY the curiosity. No intro. No explanation.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150,
    temperature: 0.9, // litt høyere for kreativitet, men fortsatt faktaforankret
  });

  return res.choices[0]?.message?.content?.trim() || null;
}

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
