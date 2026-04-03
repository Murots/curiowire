// ============================================================================
// prompts.js — CurioWire vNext (UNIFIED CARD + SHORT SCRIPT PROMPT)
// Goal: Generate a high-retention curiosity card + short-video script
// STRICT: no demonstrably false claims, no fabrication, no invented sources.
// Output: structure-locked blocks + minimal formatting (h1/h2/p only).
// ============================================================================

/**
 * buildArticlePrompt(topic, key, tone, factualFrame, plan)
 *
 * - topic: raw curiosity suggestion text (curiosity_suggestions.curiosity)
 * - key: category key (science, history, mystery, crime, etc.)
 * - tone: optional (default: "neutral")
 * - factualFrame: optional (may be empty; if present, treat as constraints)
 * - plan: editorial plan chosen before writing
 *
 * Returns a single prompt string for the LLM.
 */
export function buildArticlePrompt(
  topic,
  key,
  tone = "neutral",
  factualFrame = "",
  plan = {},
) {
  const safeTopic = String(topic || "").trim();
  const safeKey = String(key || "science").trim();
  const safeTone = String(tone || "neutral").trim();
  const safeFrame = String(factualFrame || "").trim();

  const openingStyle = String(plan.opening_style || "direct").trim();
  const bodyStyle = String(plan.body_style || "explanation_first").trim();
  const explanationStyle = String(plan.explanation_style || "balanced").trim();
  const insightStyle = String(plan.insight_style || "context").trim();
  const endingStyle = String(plan.ending_style || "hard_fact").trim();
  const toneStyle = String(plan.tone_style || "restrained").trim();
  const pacingStyle = String(plan.pacing_style || "mixed").trim();
  const angle = String(
    plan.angle || "State the core curiosity quickly and concretely.",
  ).trim();

  const avoid =
    Array.isArray(plan.avoid) && plan.avoid.length
      ? plan.avoid
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .map((x) => `- ${x}`)
          .join("\n")
      : "- avoid hype\n- avoid vague reflection\n- avoid padded intro";

  return `
You are a viral storyteller, writing concretely, narratively, and with TikTok-style pacing.

INPUT
Category key: ${safeKey}
Tone: ${safeTone}
Topic seed (raw suggestion):
"${safeTopic}"
Optional factual frame (constraints; may be empty):
${safeFrame ? `"${safeFrame}"` : "(none)"}

Editorial plan (follow naturally, not mechanically):
- Opening style: ${openingStyle}
- Body style: ${bodyStyle}
- Explanation style: ${explanationStyle}
- Insight style: ${insightStyle}
- Ending style: ${endingStyle}
- Tone style: ${toneStyle}
- Pacing style: ${pacingStyle}
- Angle: ${angle}

Avoid:
${avoid}

Write:
1) A curiosity-driven, click-strong, SEO-friendly headline (5–8 words)
2) A high-quality, curiosity-driven, SEO-friendly article (350–500 words)
3) A super-viral short-video script for TikTok/YouTube Shorts
4) SEO block (<title>, <description>, <keywords>)
5) Hashtags block (space-separated)

GLOBAL RULES
- Do NOT include any claim or fact that is demonstrably false.
- If information is uncertain/contested/legendary, say it plainly and fast: "allegedly", "claimed", "unconfirmed", "no definitive proof".
- Include time marker and/or place marker and/or names if available, natural and fitting.
- Follow the editorial plan in a flexible, natural way. Do NOT turn it into a rigid template.
- The opening should fit the selected opening style, but still feel natural for the topic.
- The body should follow the selected body and explanation style.
- Include one clear insight in the selected insight style, if it fits naturally.
- The ending/final paragraph should follow the selected ending style and must NOT tell the reader what to do “next time” (avoid “next time you” / “so, next time you” / “so next time you” / “so, the next time you” / “so the next time you” and variations).
- Avoid padded intros, vague reflection, and generic closing questions unless truly necessary.

HEADLINE STYLE RULES
- Prefer natural, curiosity-driven phrasing.
- Avoid academic or bureaucratic wording.
- Avoid subtitles separated by colon unless necessary.

GLOBAL FORMAT RULES (STRICT)
- Return ONLY the required sections. No extra text.
- No emojis, no decorative symbols, no divider lines, no arrows, no ASCII art.
- No markdown (no **, *, backticks).
- No lists of any kind (no bullets, numbering, <ul>/<ol>/<li>) in standard articles.
- Allowed HTML tags: h1, p
- No <strong>, no <em>, no italics/bold, no quotes formatting tricks.

SHORT-VIDEO SCRIPT RULES
- 25-30 seconds spoken length (about 60-80 words).
- The VideoScript must open with an immediate curiosity hook in the first sentence.
- Use short spoken sentences.
- Prioritize tension, surprise, and reveal over chronological explanation.
- The structure should feel like:
  1) hook
  2) tension or mystery
  3) escalation
  4) reveal or payoff
- Keep the wording concrete, vivid, and easy to speak aloud.
- Avoid throat-clearing intros and slow setup.

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
