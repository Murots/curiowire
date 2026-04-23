// // lib/feedInterrupts.js

// /**
//  * Shared feed-interrupt configuration.
//  *
//  * Goal:
//  * - One place to manage all "interrupt" blocks inserted into the feed
//  * - Start with Explore by topic
//  * - Keep shape ready for future blocks like:
//  *   - this_weeks_videos
//  *   - old_gems
//  *   - most_viewed
//  */

// /**
//  * After how many rendered cards each interrupt should appear.
//  */
// export const EXPLORE_INTERRUPT_AFTER_INDEX = 16;
// export const VIDEO_INTERRUPT_AFTER_INDEX = 6;

// /**
//  * Shared topic links for the Explore block.
//  *
//  * IMPORTANT:
//  * These must always behave like a GLOBAL search on the main feed.
//  * So they should link to:
//  *   /?q=<query>
//  * even when the user is currently on a category page.
//  *
//  * Edit only `label`, `query`, and optionally `title`.
//  */
// export const EXPLORE_TOPICS = [
//   {
//     id: "accidents",
//     label: "Strange accidents",
//     query: "accident",
//     title: "Explore articles about strange accidents",
//   },
//   {
//     id: "moon",
//     label: "Moon mysteries",
//     query: "moon",
//     title: "Explore articles about moon mysteries",
//   },
//   {
//     id: "fish",
//     label: "I love fish!",
//     query: "fish",
//     title: "Explore articles about weird fish",
//   },
// ];

// /**
//  * Section copy for the Explore block.
//  */
// export const EXPLORE_BLOCK_COPY = {
//   eyebrow: "Explore by topic",
//   title: "Choose your next rabbit hole",
//   description: "Tap a topic to search across all CurioWire stories.",
// };

// /**
//  * Section copy for the Video block.
//  */
// export const VIDEO_BLOCK_COPY = {
//   eyebrow: "This week’s videos",
//   title: "Fresh curiosities, ready to watch",
//   description: "A rotating pick of recent CurioWire videos worth opening.",
// };

// /**
//  * Future-ready block registry.
//  */
// export const FEED_INTERRUPTS = [
//   {
//     id: "explore-topics",
//     type: "explore_topics",
//     enabled: true,
//     insertAfter: EXPLORE_INTERRUPT_AFTER_INDEX,
//   },
//   {
//     id: "video-carousel",
//     type: "video_carousel",
//     enabled: true,
//     insertAfter: VIDEO_INTERRUPT_AFTER_INDEX,
//   },
// ];

// /**
//  * Build a GLOBAL search href.
//  * Always points to home-search, never category-search.
//  *
//  * @param {string} query
//  * @returns {string}
//  */
// export function buildGlobalSearchHref(query) {
//   const q = String(query || "").trim();
//   if (!q) return "/";

//   const sp = new URLSearchParams();
//   sp.set("q", q);

//   return `/?${sp.toString()}`;
// }

// /**
//  * Returns the enabled feed interrupt that matches the card count position.
//  *
//  * Example:
//  * - if cardsBeforeInterrupt === 8
//  * - and a block has insertAfter: 8
//  * then that block is returned.
//  *
//  * @param {number} cardsBeforeInterrupt
//  * @returns {object|null}
//  */
// export function getFeedInterruptAt(cardsBeforeInterrupt) {
//   const count = Number(cardsBeforeInterrupt);

//   if (!Number.isFinite(count) || count < 1) return null;

//   return (
//     FEED_INTERRUPTS.find(
//       (block) => block.enabled && Number(block.insertAfter) === count,
//     ) || null
//   );
// }

// /**
//  * Returns all enabled feed interrupts that should appear
//  * within the current number of loaded cards.
//  *
//  * Example:
//  * - if currentCardCount === 30
//  * - and blocks are configured for 8 and 20
//  * then both are returned in ascending order.
//  *
//  * @param {number} currentCardCount
//  * @returns {Array}
//  */
// export function getEligibleFeedInterrupts(currentCardCount) {
//   const count = Number(currentCardCount);

//   if (!Number.isFinite(count) || count < 1) return [];

//   return FEED_INTERRUPTS.filter(
//     (block) => block.enabled && Number(block.insertAfter) <= count,
//   ).sort((a, b) => Number(a.insertAfter) - Number(b.insertAfter));
// }

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
 * After how many rendered cards each interrupt should appear.
 */
export const VIDEO_INTERRUPT_AFTER_INDEX = 6;
export const OLD_GEMS_INTERRUPT_AFTER_INDEX = 16;
export const EXPLORE_INTERRUPT_AFTER_INDEX = 26;

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
    id: "moon",
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
 */
export const EXPLORE_BLOCK_COPY = {
  eyebrow: "Explore by topic",
  title: "Choose your next rabbit hole",
  description: "Tap a topic to search across all CurioWire stories.",
};

/**
 * Section copy for the Video block.
 */
export const VIDEO_BLOCK_COPY = {
  eyebrow: "This week’s videos",
  title: "Fresh curiosities, ready to watch",
  description: "A rotating pick of recent CurioWire videos worth opening.",
};

/**
 * Section copy for the Old Gems block.
 */
export const OLD_GEMS_BLOCK_COPY = {
  eyebrow: "From the archives",
  title: "Old gems worth rediscovering",
  description: "A rotating pick of older CurioWire stories readers loved.",
};

/**
 * Future-ready block registry.
 */
export const FEED_INTERRUPTS = [
  {
    id: "explore-topics",
    type: "explore_topics",
    enabled: true,
    insertAfter: EXPLORE_INTERRUPT_AFTER_INDEX,
  },
  {
    id: "video-carousel",
    type: "video_carousel",
    enabled: true,
    insertAfter: VIDEO_INTERRUPT_AFTER_INDEX,
  },
  {
    id: "old-gems-carousel",
    type: "old_gems",
    enabled: true,
    insertAfter: OLD_GEMS_INTERRUPT_AFTER_INDEX,
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
 * Returns the enabled feed interrupt that matches the card count position.
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

/**
 * Returns all enabled feed interrupts that should appear
 * within the current number of loaded cards.
 *
 * Example:
 * - if currentCardCount === 30
 * - and blocks are configured for 8 and 20
 * then both are returned in ascending order.
 *
 * @param {number} currentCardCount
 * @returns {Array}
 */
export function getEligibleFeedInterrupts(currentCardCount) {
  const count = Number(currentCardCount);

  if (!Number.isFinite(count) || count < 1) return [];

  return FEED_INTERRUPTS.filter(
    (block) => block.enabled && Number(block.insertAfter) <= count,
  ).sort((a, b) => Number(a.insertAfter) - Number(b.insertAfter));
}
