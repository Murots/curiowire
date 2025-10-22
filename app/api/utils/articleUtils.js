// === ARTICLE ANALYSIS UTILS ===
// Håndterer analyse av tema, link til historisk hendelse og sammendrag

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeTopic(topic, key) {
  const analyzePrompt = `
Summarize briefly what this trending topic is about, assuming it belongs to the category "${key}".
Topic: "${topic}"
Return a short description (max 1 sentence).
`;
  const analyzeResp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: analyzePrompt }],
    max_tokens: 40,
    temperature: 0,
  });
  return (
    analyzeResp.choices[0]?.message?.content?.trim() || "no clear summary found"
  );
}

export async function linkHistoricalStory(topicSummary) {
  const linkPrompt = `
Find one real, fascinating historical or human story connected to this theme:
"${topicSummary}"
Return one concise factual description (1–2 sentences).
`;
  const linkResp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: linkPrompt }],
    max_tokens: 80,
    temperature: 0.4,
  });
  return (
    linkResp.choices[0]?.message?.content?.trim() ||
    "no specific historical link found"
  );
}

export async function summarizeTheme(topicSummary, linkedStory) {
  const summaryPrompt = `
Summarize the following two texts into a short thematic description of no more than 8 words each.

1. What is the main *theme* of this topic?  
2. What is the main *historical or human story* referenced?

Respond in this format exactly:
Theme: <short phrase>
Story: <short phrase>

Text A (topic summary): ${topicSummary}
Text B (linked story): ${linkedStory}
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
