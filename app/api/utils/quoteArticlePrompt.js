// ============================================================================
// app/api/utils/quoteArticlePrompt.js — CurioWire QUOTES
// Goal: Generate a quote-centered article + short video script.
// Focus:
// - the quote itself
// - who said it
// - the historical/public context
// - why it mattered
// - why it resonated and survived
//
// Output format mirrors the standard article pipeline:
// Headline / Card / VideoScript / SEO / Hashtags
// ============================================================================

/**
 * buildQuoteArticlePrompt({
 *   quote_text,
 *   speaker,
 *   quote_context,
 *   category,
 *   tone,
 *   factualFrame,
 *   plan
 * })
 */
export function buildQuoteArticlePrompt({
  quote_text,
  speaker,
  quote_context,
  category,
  tone = "neutral",
  factualFrame = "",
  plan = {},
}) {
  const safe = (v) => String(v || "").trim();

  const openingStyle = safe(plan.opening_style, "direct");
  const bodyStyle = safe(plan.body_style, "explanation_first");
  const explanationStyle = safe(plan.explanation_style, "balanced");
  const insightStyle = safe(plan.insight_style, "context");
  const endingStyle = safe(plan.ending_style, "hard_fact");
  const toneStyle = safe(plan.tone_style, "restrained");
  const pacingStyle = safe(plan.pacing_style, "mixed");
  const angle = safe(
    plan.angle,
    "State the quote, the moment, and why the words mattered.",
  );

  const avoid =
    Array.isArray(plan.avoid) && plan.avoid.length
      ? plan.avoid
          .map((x) => safe(x))
          .filter(Boolean)
          .map((x) => `- ${x}`)
          .join("\n")
      : "- avoid hype\n- avoid vague reflection\n- avoid padded intro";

  return `
You are a viral storyteller and historical explainer, writing concretely, clearly, and with strong narrative control.

TASK
Write a quote-centered article about a real historical/public quote.

CORE FOCUS
This is NOT a generic biography article and NOT just a quote card.
The article must center on:
- the quote itself
- the moment it was spoken or published
- why it mattered in that situation
- why it resonated so strongly
- why it is still remembered

INPUT
Category key: ${safe(category)}
Tone: ${safe(tone)}
Quote text:
${safe(quote_text)}

Speaker:
${safe(speaker)}

Quote context:
${safe(quote_context)}

Optional factual frame (constraints; may be empty):
${safe(factualFrame) || "(none)"}

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

WRITE
1) A strong, clear, SEO-friendly headline (6–12 words)
2) A quote-centered article (350–520 words)
3) A short-video script for TikTok/YouTube Shorts
4) SEO block (<title>, <description>, <keywords>)
5) Hashtags block (space-separated)

GLOBAL RULES
- Do NOT include any claim that is demonstrably false.
- If wording, attribution, or historical detail is uncertain, say so plainly and quickly.
- Do NOT invent dates, locations, transcripts, reactions, or motives.
- The article must clearly introduce the speaker, the quote, and the setting early.
- The article must explain WHY the quote mattered, not just restate that it became famous.
- The article must explain WHY it resonated: timing, pressure, symbolism, rhetoric, public feeling, stakes, or historical setting.
- The article must stay centered on the quote as an event in language, not drift into a broad life summary of the speaker.
- Brief context about the speaker is allowed only when it helps explain the force of the quote.
- Follow the editorial plan naturally, not rigidly.
- Avoid padded intros, vague reflection, and generic closing questions.

ARTICLE SHAPE
Aim for a natural flow like:
- introduce the quote and moment quickly
- explain the historical/public context
- explain why the wording landed so hard
- explain why the quote endured

HEADLINE STYLE RULES
- 6–12 words.
- Lead with the speaker or the quote theme when natural.
- Make the title match likely search intent.
- Prefer clear phrasing over clever phrasing.
- Avoid vague curiosity headlines that hide the subject.
- The title may include the speaker name when useful.
- The title does NOT need to contain the full quote.

GLOBAL FORMAT RULES (STRICT)
- Return ONLY the required sections. No extra text.
- No emojis, no decorative symbols, no divider lines, no arrows, no ASCII art.
- No markdown (no **, *, backticks).
- No lists of any kind (no bullets, numbering, <ul>/<ol>/<li>) in the article body.
- Allowed HTML tags: h1, p
- No <strong>, no <em>, no italics/bold, no quotes formatting tricks.

CARD RULES
- Use multiple <p> paragraphs where it improves pacing.
- Do NOT include the full quote in every paragraph.
- The quote should appear naturally and clearly, but the article should mostly explain it.
- Do NOT turn the article into a generic "famous quotes by X" page.
- Do NOT use fake dialogue or scene reconstruction beyond what is safely supported by the context.

SHORT-VIDEO SCRIPT RULES
- 25–30 seconds spoken length (about 60–85 words).
- The VideoScript must say the quote itself explicitly.
- The quote should appear early, ideally in the first or second <p>.
- The script should feel like:
  1) immediate setup or hook
  2) the quote itself
  3) why it hit so hard
  4) why people still remember it
- Use short spoken sentences.
- Keep wording concrete, vivid, and easy to say aloud.
- Avoid slow throat-clearing intros.
- Do NOT overstuff the script with biography or background.

SEO RULES (plain text only; no HTML tags)
Output exactly:
SEO:
<title> — SAME as headline text (without tags)
<description> — 150–160 characters, factual and specific to this exact article, summarize the quote, the speaker, and why it mattered, no quotes, no emojis
<keywords> — 7–10 comma-separated long-tail keyword phrases (2–6 words each)

HASHTAGS RULES (plain text only; no HTML tags)
Output exactly:
Hashtags:
(space-separated hashtags)
- 7–10 total
- Always include: #CurioWire and #${safe(category)}
- Add 5–8 specific hashtags based on speaker, event, period, movement, place, or theme

STRUCTURE LOCK (ABSOLUTE)
Return output in EXACTLY this order with these exact labels:

Headline:
Card:
VideoScript:
SEO:
Hashtags:

Under each label:
- Headline: <h1>[headline]</h1>
- Card: use multiple <p> paragraphs
- VideoScript: use multiple <p> paragraphs
- SEO: exactly as specified (plain text)
- Hashtags: exactly as specified (plain text)

DO NOT add anything else before or after.
`.trim();
}
