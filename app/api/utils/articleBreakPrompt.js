// ============================================================================
// app/api/utils/articleBreakPrompt.js — CurioWire (ARTICLE BREAK PLANNER PROMPT)
// Goal: Choose at most one visual article break, or none.
// Output: strict JSON only.
// ============================================================================

export function buildArticleBreakPrompt({
  title,
  category,
  card_text,
  summary_normalized,
  signals = {},
  disallowedBreakTypes = [],
}) {
  const safe = (v) => String(v || "").trim();

  const disallowed = Array.isArray(disallowedBreakTypes)
    ? disallowedBreakTypes.map((x) => safe(x)).filter(Boolean)
    : [];

  return `
You are a visual article-break planner.

TASK
Choose the SINGLE best visual break for the finished article below.
If nothing fits naturally, choose "none".

IMPORTANT
- Choose AT MOST ONE break type.
- Prefer no break over a weak or forced break.
- Use ONLY information already present in the article or summary.
- Do NOT invent facts, dates, names, labels, categories, or locations.
- Do NOT rewrite the article.
- Do NOT return HTML.
- The break should be visually useful and feel editorial, not decorative.
- Do NOT choose any break type listed under DISALLOWED FOR THIS RUN.

ALLOWED BREAK TYPES
- timeline
- quote
- hero_number
- map_dot
- factbox
- none

DISALLOWED FOR THIS RUN
${disallowed.length ? disallowed.map((x) => `- ${x}`).join("\n") : "- (none)"}

WHEN TO USE EACH
timeline:
- Use only if the article clearly contains a meaningful progression over time.
- Best when there are 2–4 meaningful milestones such as years, dates, periods, or "today".
- Do not use for a single isolated date.

quote:
- Use only if the article contains one strong sentence that works well alone.
- The quote must be copied exactly from the article text, not rewritten.
- Do not choose a weak summary sentence.
- Do NOT choose a sentence from paragraph 1.
- Prefer a sentence from paragraph 2 or later.

hero_number:
- Use when one number or quantity carries the core curiosity of the story.
- Prefer durations, counts, sizes, distances, scores, or magnitudes.
- Hero_number is especially strong when the same number or quantity is central to the title, repeated in the article, or defines the tension of the story.
- Avoid using a year unless the year itself is unusually central to the curiosity.
- If the strongest candidate is just a historical year, prefer another type or none.
- Keep supporting labels short.

map_dot:
- Use when the place is explicit and central to the identity of the story.
- The location should contribute meaning, not just background context.
- Do not use map_dot for a place that is merely where something happened.

factbox:
- Use when the article centers on a specific place, person, animal, fish, insect, plant, object, phenomenon, tool, technology, event, incident, or case.
- Only use factbox if the content can be organized naturally into 2–4 short labeled facts.
- Do not use factbox as a generic fallback.
- If the article is mainly flowing narrative and the fields would feel forced, prefer another type or none.

none:
- Use if none of the above feels naturally strong.

PLACEMENT RULES
- insert_after_paragraph must be an integer paragraph index after which the break should appear.
- Count only <p> paragraphs in the article body.
- Prefer a natural pause:
  - hero_number or map_dot: often after paragraph 1 or 2
  - timeline: often after paragraph 2 or 3
  - quote: often after paragraph 2 or 3
  - factbox: often after paragraph 1, 2, or 3
- If break_type = "none", insert_after_paragraph must be null.

INPUT
Title:
${safe(title)}

Category:
${safe(category)}

Signals:
${JSON.stringify(signals, null, 2)}

Card:
${safe(card_text)}

Summary:
${safe(summary_normalized)}

OUTPUT
Return ONLY valid JSON in exactly this shape:

{
  "use_break": true,
  "break_type": "timeline",
  "insert_after_paragraph": 2,
  "confidence": 0.84,
  "reason": "One short sentence.",
  "payload": {
    "items": [
      { "label": "1962", "text": "The underground fire began." },
      { "label": "1981", "text": "A sinkhole incident sharpened public alarm." },
      { "label": "Today", "text": "The fire still smolders beneath part of the town." }
    ]
  }
}

PAYLOAD RULES

For timeline:
{
  "items": [
    { "label": "short label", "text": "short factual text" }
  ]
}
- 2 to 4 items only
- labels should be short
- text should be short, concrete, factual

For quote:
{
  "text": "exact sentence copied from article"
}

For hero_number:
{
  "value": "3 seconds",
  "label": "left on the clock",
  "kicker": "optional short line"
}

For map_dot:
{
  "place": "Centralia, Pennsylvania",
  "label": "optional short line"
}

For factbox:
{
  "title": "Centralia",
  "entity_type": "Place",
  "items": [
    { "label": "Type", "value": "Mining town" },
    { "label": "Known for", "value": "Underground coal fire" },
    { "label": "Where", "value": "Pennsylvania, United States" },
    { "label": "Since", "value": "1962" }
  ]
}
- 2 to 4 items only
- labels must be short
- values must be short

For none:
{
  "use_break": false,
  "break_type": "none",
  "insert_after_paragraph": null,
  "confidence": 0.00,
  "reason": "One short sentence.",
  "payload": null
}

FINAL RULES
- If uncertain, choose none.
- Keep payload compact.
- Confidence must be between 0 and 1.
- Reason must be short.
- Return JSON only.
`.trim();
}
