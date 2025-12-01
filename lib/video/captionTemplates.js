// ============================================================================
// captionTemplates.js — CurioWire Caption Builder (v2.0)
// Uses the NEW dynamic subject-based hook from narration.js
// ============================================================================

// ============================================================================
// captionTemplates.js
// CurioWire — Intelligent Caption + Hashtag Builder (v2.0)
// Now uses article-specific hooks instead of static category hooks
// ============================================================================

import { buildCaptionHook } from "./narrationCaptionHook.js";

// Bredere, faste kategori-hashtags som utfyller artikkelens egne
const CATEGORY_HASHTAGS = {
  space: ["#space", "#universe", "#astrophysics", "#cosmos"],
  science: ["#science", "#sciencenews", "#didyouknow", "#mindblowingfacts"],
  history: ["#history", "#historyfacts", "#historicalmysteries", "#didyouknow"],
  nature: ["#nature", "#wildlife", "#naturefacts", "#planetearth"],
  world: ["#worldnews", "#geopolitics", "#globalhistory", "#worldevents"],
  technology: ["#technology", "#techfacts", "#innovation", "#futuretech"],
};

/**
 * Parser artikkelens hashtags (komma- eller space-separert)
 */
function parseArticleHashtags(hashtagsString) {
  if (!hashtagsString) return [];

  return hashtagsString
    .split(/[\s,]+/g)
    .map((h) => h.trim())
    .filter((h) => h.startsWith("#"));
}

/**
 * Kombinerer artikkelens hashtags + kategori-hashtags
 */
function buildFinalHashtags(article, category) {
  const articleTags = parseArticleHashtags(article.hashtags);
  const categoryTags = CATEGORY_HASHTAGS[category] || [];

  // Unngå duplikater
  const combined = [...new Set([...articleTags, ...categoryTags])];

  // For mange hashtags → negativt på TikTok/Shorts
  return combined.slice(0, 14);
}

/**
 * Bygger caption + hashtags for video
 * @returns { caption: string, hashtags: string[] }
 */
export async function buildCaptionAndHashtags(article) {
  const category = article.category || "science";

  // 🧠 Dette er nye hook-generatoren!
  const hook = await buildCaptionHook(article);

  // Caption er kort og ren
  const caption = `${hook}\n${article.title}`;

  // Kombiner hashtags
  const hashtags = buildFinalHashtags(article, category);

  return { caption, hashtags };
}
