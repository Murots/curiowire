// ============================================================================
// extractDidYouKnow.js
// CurioWire — Extract "Did You Know?" facts from article HTML
// ============================================================================

import { JSDOM } from "jsdom";

/**
 * Extracts the "Did You Know?" fact list from an article's HTML.
 * Returns an array of 1–3 short facts.
 *
 * @param {string} html - Full HTML of the article.
 * @returns {string[]} facts
 */
export function extractDidYouKnow(html) {
  if (!html || typeof html !== "string") return [];

  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Find the <h2>Did You Know?</h2> header
    const headers = [...doc.querySelectorAll("h2")];
    const didYouKnowHeader = headers.find((h) =>
      h.textContent.toLowerCase().includes("did you know")
    );

    if (!didYouKnowHeader) return [];

    // The next sibling is usually a <p> or <ul>
    let next = didYouKnowHeader.nextElementSibling;
    if (!next) return [];

    // Case 1: list <ul><li>...</li></ul>
    if (next.tagName === "UL") {
      const lis = [...next.querySelectorAll("li")].map((li) =>
        li.textContent.trim()
      );

      return cleanAndShortenFacts(lis);
    }

    // Case 2: paragraph with bullet-like text
    if (next.tagName === "P") {
      const text = next.textContent.trim();

      // Split on hyphens or newlines
      let parts = text
        .split(/[-•\n]/g)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      return cleanAndShortenFacts(parts);
    }

    return [];
  } catch (err) {
    console.error("extractDidYouKnow() parsing failed:", err.message);
    return [];
  }
}

/**
 * Cleans, truncates and returns 1–3 facts.
 */
function cleanAndShortenFacts(arr) {
  if (!arr || !arr.length) return [];

  // Remove long sentences — keep sentences under ~200 chars
  const cleaned = arr
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 0 && t.length < 220);

  if (!cleaned.length) return [];

  // Prioritize 2–3 facts
  return cleaned.slice(0, 3);
}
