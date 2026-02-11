// ============================================================================
// summaryPrompt.js — CurioWire vNext (SUMMARY + FUN FACT EXTRACTION)
// Goal: Extract a concise, factual summary and optional fun fact
// STRICT: no fabrication, no speculation
// ============================================================================

export function buildSummaryPrompt(cardText) {
  const safeCard = String(cardText || "").trim();

  return `
You are an editor extracting structured metadata from a finished article.

INPUT
Card text:
${safeCard}

Write:
1) A concise, factual quick summary
2) If possible, one real and relevant fun fact that introduces new information not already stated in the card text

GLOBAL RULES
- Do NOT invent facts.
- Do NOT speculate.
- If something is uncertain, say so plainly.
- If no real fun fact exists, leave FunFact empty.

STRUCTURE LOCK (ABSOLUTE)
Return output in EXACTLY this order with these exact labels:

Summary:
<ul>
  <li><b>What:</b> <span data-summary-what>One clear sentence summarizing the article.</span></li>
  <li><b>Where:</b> <span data-summary-where>Location or environment, if relevant. Otherwise leave empty.</span></li>
  <li><b>When:</b> <span data-summary-when>Time period or historical moment, if relevant. Otherwise leave empty.</span></li>
</ul>

FunFact:
<p>[One SHORT, factual fun fact that adds new information not already mentioned in the card text — or leave empty]</p>

DO NOT add anything else.
`.trim();
}
