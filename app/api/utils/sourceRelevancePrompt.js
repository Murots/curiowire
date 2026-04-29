// ============================================================================
// app/api/utils/sourceRelevancePrompt.js — CurioWire
// Purpose: Check whether a validated source URL actually supports the article.
// ============================================================================

export function buildSourceRelevancePrompt({
  title,
  summary_normalized,
  sourceUrl,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are a strict source relevance checker for a fact-checked CurioWire article.

GOAL:
Decide whether the given source URL directly supports the article's core topic or main claim.

IMPORTANT:
A URL can be technically valid but still irrelevant. Your job is to reject weak, generic, or only loosely related sources.

RULES:
- Use web_search.
- Check the given URL specifically.
- PASS only if the page clearly discusses the same specific subject as the article.
- PASS only if the page supports the article's core claim, not just the broad category.
- FAIL if the page is generic, tangential, or only broadly related.
- FAIL if the page does not mention the key event, person, place, object, practice, discovery, or claim.
- FAIL if the page is mainly about a different topic.
- FAIL if the page is a homepage, index page, category page, or general overview that does not directly cover the article topic.
- Be strict. Prefer false negatives over weak sources.

ARTICLE TITLE:
${safe(title)}

ARTICLE SUMMARY:
${safe(summary_normalized)}

SOURCE URL:
${safe(sourceUrl)}

OUTPUT EXACTLY:
Verdict: PASS or FAIL
Reason: one short sentence
`.trim();
}
