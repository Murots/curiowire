import crypto from "crypto";
import stringSimilarity from "string-similarity";

export function normalizeSummary(summary) {
  const { what, where, when, how, why } = summary || {};

  return `
    what:${what || ""}
    where:${where || ""}
    when:${when || ""}
    how:${how || ""}
    why:${why || ""}
  `
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function makeSummarySignature(summary) {
  const raw = normalizeSummary(summary);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function summariesAreSimilar(a, b, threshold = 0.82) {
  if (!a || !b) return false;
  return stringSimilarity.compareTwoStrings(a, b) >= threshold;
}
