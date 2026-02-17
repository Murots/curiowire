// ============================================================================
// prompts.js — CurioWire vNext (UNIFIED CARD + SHORT SCRIPT PROMPT)
// Goal: Generate a high-retention curiosity card + short-video script
// STRICT: no demonstrably false claims, no fabrication, no invented sources.
// Output: structure-locked blocks + minimal formatting (h1/h2/p only).
// ============================================================================

/**
 * buildArticlePrompt(topic, key, tone, factualFrame)
 *
 * - topic: raw curiosity suggestion text (curiosity_suggestions.curiosity)
 * - key: category key (science, history, mystery, crime, etc.)
 * - tone: optional (default: "neutral")
 * - factualFrame: optional (may be empty; if present, treat as constraints)
 *
 * Returns a single prompt string for the LLM.
 */
export function buildArticlePrompt(
  topic,
  key,
  tone = "neutral",
  factualFrame = "",
) {
  const safeTopic = String(topic || "").trim();
  const safeKey = String(key || "science").trim();
  const safeTone = String(tone || "neutral").trim();
  const safeFrame = String(factualFrame || "").trim();

  return `
You are a viral storyteller, writing concretely, narratively, and with TikTok-style pacing.

INPUT
Category key: ${safeKey}
Tone: ${safeTone}
Topic seed (raw suggestion):
"${safeTopic}"
Optional factual frame (constraints; may be empty):
${safeFrame ? `"${safeFrame}"` : "(none)"}

Write:
1) A click-strong and SEO-friendly headline (7–10 words)
2) A super-viral, high-retention wow-curiosity article (300–500 words)
3) A super-viral short-video script for TikTok/YouTube Shorts (25–35 seconds)
4) SEO block (<title>, <description>, <keywords>)
5) Hashtags block (space-separated)

GLOBAL RULES
- Do NOT include any claim or fact that is demonstrably false.
- If information is uncertain/contested/legendary, say it plainly and fast: "allegedly", "claimed", "unconfirmed", "no definitive proof".
- Include time marker and/or place marker and/or names if available, natural and fitting. 
- Do NOT end with “next time you…” (or any variation telling the reader what to do next time).

GLOBAL FORMAT RULES (STRICT)
- Return ONLY the required sections. No extra text.
- No emojis, no decorative symbols, no divider lines, no arrows, no ASCII art.
- No markdown (no **, *, backticks).
- No lists of any kind (no bullets, numbering, <ul>/<ol>/<li>).
- Allowed HTML tags: h1, p
- No <strong>, no <em>, no italics/bold, no quotes formatting tricks.


SEO RULES (plain text only; no HTML tags)
Output exactly:
SEO:
<title> — SAME as headline text (without tags)
<description> — 150–160 characters, factual, curiosity-driven, no quotes, no emojis
<keywords> — 7–10 comma-separated long-tail keyword phrases (2–6 words each)

HASHTAGS RULES (plain text only; no HTML tags)
Output exactly:
Hashtags:
(space-separated hashtags)
- 7–10 total.
- Always include: #CurioWire and #${safeKey}
- Add 5–8 specific, theme-derived hashtags (fields, places, periods, mechanisms, emotional tones).

STRUCTURE LOCK (ABSOLUTE)
Return output in EXACTLY this order with these exact labels:
Headline:
Card:
VideoScript:
SEO:
Hashtags:

Under each label:
- Headline: <h1>[A headline as described above]</h1>
- Card: Use multiple <p> paragraphs where it improves pacing.
- VideoScript: Use multiple <p> paragraphs where it improves pacing.
- SEO: exactly as specified (plain text)
- Hashtags: exactly as specified (plain text)

DO NOT add anything else before or after.
`.trim();
}
