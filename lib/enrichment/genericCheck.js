// web/lib/enrichment/genericCheck.js

export function isGenericArticle(articleHtml) {
  let text = articleHtml || "";

  // Remove Did You Know block content to avoid counting list/tall/proper nouns there
  text = text.replace(
    /<h2>\s*Did You Know\?\s*<\/h2>[\s\S]*?(?=<h2>|$)/gi,
    " "
  );
  // Remove Keep Exploring (fast tagline)
  text = text.replace(
    /<h2>\s*Keep Exploring\s*<\/h2>[\s\S]*?(?=<h2>|$)/gi,
    " "
  );

  text = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 600) return true;

  const hasNumbers = /\b\d{3,4}\b|\b\d+\b/.test(text);
  const properNounHits = (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;

  const vagueHits = (
    text.match(
      /\b(researchers|scientists|experts|records|sources|it is believed|some propose|many think)\b/gi
    ) || []
  ).length;

  if (!hasNumbers && properNounHits < 8) return true;
  if (vagueHits > 10 && properNounHits < 10) return true;

  return false;
}
