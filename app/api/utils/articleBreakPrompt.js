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
}) {
  const safe = (v) => String(v || "").trim();

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

ALLOWED BREAK TYPES
- timeline
- quote
- hero_number
- map_dot
- factbox
- none

WHEN TO USE EACH
timeline:
- Use only if the article clearly contains a meaningful progression over time.
- Best when there are 2–4 meaningful milestones such as years, dates, periods, or "today".
- Do not use for a single isolated date.

quote:
- Use only if the article contains one strong sentence that works well alone.
- The quote must be copied exactly from the article text, not rewritten.
- Do not choose a weak summary sentence.

hero_number:
- Use when one number, year, duration, rank, or scale is the strongest visual hook.
- Best when the article has a clear standout value such as "1962", "60+", "3,000", "2 years", etc.
- Keep supporting labels short.

map_dot:
- Use when the article is clearly anchored to one specific place.
- This is a minimal location marker, not a full travel guide.
- Only use if the place is explicit and central.

factbox:
- Use when the article is mainly about a specific place, person, object, or phenomenon.
- The factbox should be compact and factual.
- Use only short fields supported by the article/summary.

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
  "value": "1962",
  "label": "Fire began",
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
