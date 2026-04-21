// lib/feedInterrupts.js

/**
 * Shared feed-interrupt configuration.
 *
 * Goal:
 * - One place to manage all "interrupt" blocks inserted into the feed
 * - Start with Explore by topic
 * - Keep shape ready for future blocks like:
 *   - this_weeks_videos
 *   - old_gems
 *   - most_viewed
 */

/**
 * After how many rendered cards the interrupt should appear.
 *
 * Example:
 * - 8 means:
 *   render first 8 cards
 *   then render the interrupt block
 *   then continue rendering the rest of the feed
 */
export const FEED_INTERRUPT_AFTER_INDEX = 8;

/**
 * Shared topic links for the Explore block.
 *
 * IMPORTANT:
 * These must always behave like a GLOBAL search on the main feed.
 * So they should link to:
 *   /?q=<query>
 * even when the user is currently on a category page.
 *
 * Edit only `label`, `query`, and optionally `title`.
 */
export const EXPLORE_TOPICS = [
  {
    id: "accidents",
    label: "Strange accidents",
    query: "accident",
    title: "Explore articles about strange accidents",
  },
  {
    id: "Moon",
    label: "Moon mysteries",
    query: "moon",
    title: "Explore articles about moon mysteries",
  },
  {
    id: "fish",
    label: "I love fish!",
    query: "fish",
    title: "Explore articles about weird fish",
  },
];

/**
 * Section copy for the Explore block.
 * Keep this small and punchy.
 */
export const EXPLORE_BLOCK_COPY = {
  eyebrow: "Explore by topic",
  title: "Choose your next rabbit hole",
  description: "Tap a topic to search across all CurioWire stories.",
};

/**
 * Future-ready block registry.
 * Right now only one block is active.
 */
export const FEED_INTERRUPTS = [
  {
    id: "explore-topics",
    type: "explore_topics",
    enabled: true,
    insertAfter: FEED_INTERRUPT_AFTER_INDEX,
  },
];

/**
 * Build a GLOBAL search href.
 * Always points to home-search, never category-search.
 *
 * @param {string} query
 * @returns {string}
 */
export function buildGlobalSearchHref(query) {
  const q = String(query || "").trim();
  if (!q) return "/";

  const sp = new URLSearchParams();
  sp.set("q", q);

  return `/?${sp.toString()}`;
}

/**
 * Returns the first enabled feed interrupt that matches the card count position.
 *
 * Example:
 * - if cardsBeforeInterrupt === 8
 * - and a block has insertAfter: 8
 * then that block is returned.
 *
 * @param {number} cardsBeforeInterrupt
 * @returns {object|null}
 */
export function getFeedInterruptAt(cardsBeforeInterrupt) {
  const count = Number(cardsBeforeInterrupt);

  if (!Number.isFinite(count) || count < 1) return null;

  return (
    FEED_INTERRUPTS.find(
      (block) => block.enabled && Number(block.insertAfter) === count,
    ) || null
  );
}
