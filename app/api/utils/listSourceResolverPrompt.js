// ============================================================================
// app/api/utils/listSourceResolverPrompt.js — CurioWire (LIST SOURCE URLS)
// Purpose: After PASS, find 1–3 verifiable source URLs that support the list.
// ============================================================================

export function buildListSourceResolverPrompt({
  title,
  summary_normalized,
  category,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are a source finder for a fact-checked LIST article that already PASSED.

GOAL:
Find 1 to 3 reasonably credible, publicly accessible web pages that directly support the article’s overall topic and its strongest list items.

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
- Choose 1 to 3 sources that best support the article as a whole or multiple major items in it.
- Prefer broader or more representative sources over sources that support only a minor detail.
- Do NOT invent URLs. Only output URLs that you actually found via web_search results.
- If you cannot find decent supporting sources, output [].
- Keep it simple: no explanations.
- Output ONE valid JSON array only.

INPUT
Title:
${safe(title)}

Summary:
${safe(summary_normalized)}

Category:
${safe(category)}

OUTPUT (JSON ARRAY ONLY):
["https://example.com"] or ["https://example.com","https://example.org"] or []
`.trim();
}
