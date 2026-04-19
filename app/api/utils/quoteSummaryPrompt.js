// ============================================================================
// app/api/utils/quoteSummaryPrompt.js — CurioWire QUOTES
// Goal: Extract quote-specific structured metadata from a finished quote article.
// Focus:
// - who said it
// - where / setting
// - when
// - why it mattered
//
// Also allows an optional extra note / fun fact when genuinely useful.
// ============================================================================

export function buildQuoteSummaryPrompt({ card_text, quote_text, speaker }) {
  const safe = (v) => String(v || "").trim();

  return `
You are an editor extracting structured metadata from a finished quote-centered article.

TASK
Read the article and extract:
1) a concise structured summary
2) optionally one short extra fact if a real, relevant one exists

INPUT
Quote text:
${safe(quote_text)}

Speaker:
${safe(speaker)}

Card text:
${safe(card_text)}

SUMMARY GOAL
This is a quote article, so the summary must identify:
- WHO said it
- WHERE / in what setting it was said, if relevant
- WHEN it was said, if relevant
- WHY it mattered

GLOBAL RULES
- Do NOT invent facts.
- Do NOT speculate.
- Do NOT add details not supported by the article.
- If the article does not clearly support a field, leave that field empty.
- Keep each summary field short, factual, and concrete.
- "Why" should explain why the quote mattered historically, politically, culturally, rhetorically, or publicly.
- Do NOT restate the full quote inside every field.
- Do NOT use placeholders such as "unknown", "none", "not available", or explanations about missing data.

FUN FACT RULES
- Add FunFact only if there is one SHORT, factual, genuinely relevant extra detail.
- It must introduce something not already clearly stated in the card text.
- Good examples:
  - a tighter note about how the quote was later remembered
  - a brief note about a commonly shortened form
  - a note about how the quote entered public memory
- If no real extra fact exists, return an empty FunFact: <p></p>
- Do NOT write filler.
- Do NOT write placeholder text.

STRUCTURE LOCK (ABSOLUTE)
Return output in EXACTLY this order with these exact labels:

Summary:
<ul>
  <li><b>Who:</b> <span data-summary-who>Who said the quote.</span></li>
  <li><b>Where:</b> <span data-summary-where>Place, forum, setting, or environment, if relevant. Otherwise leave empty.</span></li>
  <li><b>When:</b> <span data-summary-when>Time period, year, event moment, or historical occasion, if relevant. Otherwise leave empty.</span></li>
  <li><b>Why:</b> <span data-summary-why>One clear sentence explaining why the quote mattered.</span></li>
</ul>

FunFact:
<p>[One short factual extra detail, or empty]</p>

DO NOT add anything else.
`.trim();
}
