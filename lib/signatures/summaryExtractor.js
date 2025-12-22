// ============================================================================
// QUICK SUMMARY EXTRACTOR
// HTML → { what, where, when, how, why }
// ============================================================================

export function extractSummaryObject(html) {
  if (!html || typeof html !== "string") return null;

  const extract = (label) => {
    const regex = new RegExp(
      `<li[^>]*>\\s*<(?:b|strong)>\\s*${label}:\\s*<\\/(?:b|strong)>[\\s\\S]*?(?:<span[^>]*>)?([\\s\\S]*?)(?:<\\/span>)?\\s*<`,
      "i"
    );
    const match = html.match(regex);
    return match ? match[1].replace(/<[^>]+>/g, "").trim() : null;
  };

  const summary = {
    what: extract("What"),
    where: extract("Where"),
    when: extract("When"),
    how: extract("How"),
    why: extract("Why"),
  };

  // Minimumskrav: WHAT må finnes
  if (!summary.what) return null;

  return summary;
}
