// ============================================================================
// QUICK SUMMARY EXTRACTOR
// HTML → { what, where, when, how, why }
// ============================================================================

// lib/signatures/summaryExtractor.js

import { cleanText } from "../../app/api/utils/cleanText.js";

export function extractSummaryObject(html) {
  if (!html) return null;

  const getField = (label) => {
    const regex = new RegExp(
      `<li>\\s*<b>${label}:<\\/b>\\s*(.*?)<\\/li>`,
      "is"
    );
    const match = html.match(regex);
    return match ? cleanText(match[1]) : null;
  };

  const whatSpanMatch = html.match(
    /<span\s+data-summary-what[^>]*>(.*?)<\/span>/is
  );

  const summary = {
    what: whatSpanMatch ? cleanText(whatSpanMatch[1]) : null,
    where: getField("Where"),
    when: getField("When"),
    how: getField("How"),
    why: getField("Why"),
  };

  // Require all fields
  if (
    !summary.what ||
    !summary.where ||
    !summary.when ||
    !summary.how ||
    !summary.why
  ) {
    return null;
  }

  return summary;
}
