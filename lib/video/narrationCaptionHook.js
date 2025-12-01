// ============================================================================
// narrationCaptionHook.js
// Builds a SHORT, punchy, article-specific hook for captions
// ============================================================================

import { OpenAI } from "openai";
import { stripHtml } from "./textUtils.js";

/**
 * buildCaptionHook(article)
 * Returnerer 1 kort linje som fungerer som caption-hook.
 * Format:
 *   – 1 kort setning
 *   – maks 12–14 ord
 *   – WOW-faktor, nysgjerrighet, "scrol lstop"
 *   – beskriver hovedfaktum uten å avsløre alt
 */
export async function buildCaptionHook(article) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const coreText =
    stripHtml(article.seo_description) ||
    stripHtml(article.excerpt) ||
    `This article explores ${article.title}.`;

  const prompt = `
You create HIGH-RETENTION TikTok hooks.

Rules:
- Max 10 words.
- No emojis.
- Must contain at least ONE of the following:
  • a specific time or era (“in 1494”, “centuries ago”, “in 1952”)
  • a specific place (“in ancient China”, “deep under the Atlantic”, etc.)
  • a clear subject (“these monks”, “one scientist”, “this tiny galaxy”)
- Must include a SURPRISING CONTRAST or paradox:
  something that shouldn't logically fit together.
- Must be based ONLY on the article summary below.
- Must NOT reveal the twist or conclusion.
- Must provoke immediate curiosity (“I need to hear this”).

Article summary:
"${coreText}"

Write ONE hook sentence only.

`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }],
  });

  return (
    stripHtml(completion.choices?.[0]?.message?.content?.trim()) ||
    article.title
  );
}
