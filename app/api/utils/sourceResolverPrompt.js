// // ============================================================================
// // app/api/utils/sourceResolverPrompt.js — CurioWire (ONE SOURCE URL)
// // Purpose: After PASS, find 1 verifiable source URL for the core claim.
// // ============================================================================

// export function buildSourceResolverPrompt({
//   title,
//   summary_normalized,
//   category,
// }) {
//   const safe = (v) => String(v || "").trim();

//   return `
// You are a source finder for a fact-checked article that already PASSED.

// GOAL:
// Find ONE reasonably credible, publicly accessible web page that directly supports the article’s core curiosity claim.

// PRIORITY (flexible, not a whitelist):
// Prefer sources such as:
// - Encyclopedias / reference works (e.g., Britannica, Wikipedia)
// - Reputable news / science media
// - Museums, universities, .gov/.edu sites
// - Academic publishers or journals (if easily accessible)
// Avoid:
// - Forums, social posts, Quora/Reddit
// - Content farms / obvious SEO spam
// - Product pages, affiliate pages
// - Mirrors/scrapers that copy other sites

// RULES:
// - Use web_search.
// - Choose the SINGLE best source that most directly confirms the main claim.
// - If you cannot find a decent supporting source, output NONE.
// - Do NOT invent URLs. Only output a URL that you actually found via web_search results.
// - Keep it simple: no explanations.

// INPUT
// Title:
// ${safe(title)}

// Summary:
// ${safe(summary_normalized)}

// Category:
// ${safe(category)}

// OUTPUT (EXACTLY ONE LINE):
// URL: <direct URL>   OR   URL: NONE
// `.trim();
// }

// ============================================================================
// app/api/utils/sourceResolverPrompt.js — CurioWire (ONE SOURCE URL)
// Purpose: After PASS, find 1 verifiable source URL for the core claim.
// ============================================================================

export function buildSourceResolverPrompt({
  title,
  summary_normalized,
  category,
  avoidUrls = [],
}) {
  const safe = (v) => String(v || "").trim();

  const blocked = Array.isArray(avoidUrls)
    ? avoidUrls.map(safe).filter(Boolean)
    : [];

  return `
You are a source finder for a fact-checked article that already PASSED.

GOAL:
Find ONE credible, publicly accessible web page that directly supports the article’s core curiosity claim.

PRIORITY:
Prefer:
- Encyclopedias / reference works, including Britannica and Wikipedia
- Reputable science, history, news, or educational publishers
- Museums, universities, .gov/.edu sites
- Official organizations
- Accessible academic publishers or journals

Avoid:
- Forums, Reddit, Quora, social media
- Content farms / SEO spam
- Product pages or affiliate pages
- Mirrors or scraper sites
- Login-only pages
- Broken or unavailable pages
- File/document links (.pdf, .doc, .xls, .ppt, downloads)
- Generic homepages unless the homepage itself clearly contains the claim
- URLs listed in DO NOT RETURN

RULES:
- Use web_search.
- Choose the SINGLE best source that most directly confirms the main claim.
- Prefer a direct article/page URL, not a homepage or file download.
- Only output a URL you actually found through web_search.
- Do not guess, invent, or construct URLs.
- Do not return a vague page that only loosely relates to the topic.
- If the best result redirects to a homepage, choose another result.
- If you cannot find a good source, output NONE.
- Keep it simple: no explanations.

DO NOT RETURN:
${blocked.length ? blocked.map((url) => `- ${url}`).join("\n") : "- None"}

INPUT

Title:
${safe(title)}

Summary:
${safe(summary_normalized)}

Category:
${safe(category)}

OUTPUT (EXACTLY ONE LINE):
URL: <direct URL>   OR   URL: NONE
`.trim();
}
