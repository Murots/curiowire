// ============================================================================
// summaryParser.js
// CurioWire — parse summary_normalized (what/where/when/how/why)
// Example string:
// "what:... where:... when:... how:... why:..."
// ============================================================================

export function parseSummaryNormalized(summaryNormalized) {
  if (!summaryNormalized || typeof summaryNormalized !== "string") return {};

  const s = summaryNormalized.replace(/\s+/g, " ").trim();

  // We capture each field until next field label or end.
  function grab(key) {
    const re = new RegExp(
      `\\b${key}\\s*:\\s*(.+?)(?=\\bwhat\\s*:|\\bwhere\\s*:|\\bwhen\\s*:|\\bhow\\s*:|\\bwhy\\s*:|$)`,
      "i"
    );
    const m = s.match(re);
    return m?.[1]?.trim() || null;
  }

  return {
    what: grab("what"),
    where: grab("where"),
    when: grab("when"),
    how: grab("how"),
    why: grab("why"),
  };
}
