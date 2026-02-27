// ============================================================================
// app/api/utils/sourceResolverPrompt.js — CurioWire (ONE SOURCE URL)
// Purpose: After PASS, find 1 verifiable source URL for the core claim.
// ============================================================================

export function buildSourceResolverPrompt({ title, card_text, category }) {
  const safe = (v) => String(v || "").trim();

  return `
You are a source finder for a fact-checked article that already PASSED.

GOAL:
Find ONE reasonably credible, publicly accessible web page that directly supports the article’s core curiosity claim.

PRIORITY (flexible, not a whitelist):
Prefer sources such as:
- Encyclopedias / reference works (e.g., Britannica, Wikipedia)
- Reputable news / science media
- Museums, universities, .gov/.edu sites
- Academic publishers or journals (if easily accessible)
Avoid:
- Forums, social posts, Quora/Reddit
- Content farms / obvious SEO spam
- Product pages, affiliate pages
- Mirrors/scrapers that copy other sites

RULES:
- Use web_search.
- Choose the SINGLE best source that most directly confirms the main claim.
- If you cannot find a decent supporting source, output NONE.
- Do NOT invent URLs. Only output a URL that you actually found via web_search results.
- Keep it simple: no explanations.

INPUT
Title:
${safe(title)}

Category:
${safe(category)}

Article:
${safe(card_text)}

OUTPUT (EXACTLY ONE LINE):
URL: <direct URL>   OR   URL: NONE
`.trim();
}
