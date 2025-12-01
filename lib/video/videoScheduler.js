// ============================================================================
// videoScheduler.js (v3.0)
// CurioWire — Automated Social Video Scheduler
//
// - Henter beste artikler basert på WOW-score
// - Velger full-AI vs image-mode
// - Lagrer komplette video-jobber i Supabase "videos"
// - Klargjort for bruk med videoPoster v2.1
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PRIORITY_CATEGORIES = [
  "science",
  "space",
  "history",
  "nature",
  "world",
  "technology",
];

const FULL_AI_ELIGIBLE = ["science", "space", "history"];

const LOOKBACK_HOURS = 24;

/**
 * Fetch all articles in the last 24 hours
 */
async function fetchRecentArticles() {
  const since = new Date(
    Date.now() - LOOKBACK_HOURS * 3600 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .gte("created_at", since);

  if (error) {
    console.error("❌ Failed to fetch recent articles:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Pick top WOW article from each category
 */
function pickBestPerCategory(articles) {
  const best = {};

  for (const cat of PRIORITY_CATEGORIES) {
    const subset = articles.filter((a) => a.category === cat);

    if (!subset.length) {
      best[cat] = null;
      continue;
    }

    subset.sort((a, b) => (b.wow_score || 0) - (a.wow_score || 0));
    best[cat] = subset[0];
  }
  return best;
}

/**
 * Pick 2 best WOW-scoring articles among the FULL AI eligible categories
 */
function pickFullAIVideos(bestPerCategory) {
  const eligible = FULL_AI_ELIGIBLE.map((cat) => bestPerCategory[cat]).filter(
    Boolean
  );

  if (!eligible.length) return [];

  eligible.sort((a, b) => (b.wow_score || 0) - (a.wow_score || 0));

  return eligible.slice(0, 2);
}

/**
 * Prevent duplicate jobs (per article per mode)
 */
async function jobExists(articleId, mode) {
  const { data } = await supabase
    .from("videos")
    .select("id")
    .eq("article_id", articleId)
    .eq("is_full_ai", mode === "full")
    .maybeSingle();

  return !!data;
}

/**
 * Clean captions (strip HTML)
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Store job in Supabase
 */
async function storeVideoJob({ article, category, mode }) {
  if (await jobExists(article.id, mode)) {
    console.log(
      `⏭️ Video job already exists for article ${article.id} + mode ${mode}`
    );
    return null;
  }

  const caption =
    article.seo_description ||
    stripHtml(article.excerpt || "") ||
    article.title ||
    "New discovery from CurioWire";

  const hashtags = article.hashtags
    ? article.hashtags.split(",").map((h) => h.trim())
    : [];

  const platforms =
    mode === "full"
      ? ["tiktok", "facebook", "instagram", "youtube"]
      : ["tiktok", "facebook"];

  const payload = {
    article_id: article.id,
    article_json: article, // ⭐ Full article data stored
    category,
    wow_score: article.wow_score || 0,
    is_full_ai: mode === "full",
    caption,
    hashtags,
    platforms,
    status: "queued",
  };

  const { data, error } = await supabase
    .from("videos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(
      `❌ Failed to queue video for article ${article.id}:`,
      error.message
    );
    return null;
  }

  console.log(
    `📥 Queued video: [${mode}] category=${category} article=${article.id}`
  );

  return data;
}

/**
 * MAIN — generate and store all video jobs
 */
export async function scheduleDailyVideos() {
  console.log("📅 Running videoScheduler…");

  const articles = await fetchRecentArticles();
  if (!articles.length) {
    console.log("⚠️ No recent articles.");
    return [];
  }

  const best = pickBestPerCategory(articles);
  const fullAI = pickFullAIVideos(best);
  const fullAIIds = new Set(fullAI.map((a) => a.id));

  const schedule = [];

  for (const cat of PRIORITY_CATEGORIES) {
    const article = best[cat];
    if (!article) continue;

    const mode = fullAIIds.has(article.id) ? "full" : "image";

    schedule.push({
      article,
      category: cat,
      mode,
      wow_score: article.wow_score || 0,
    });
  }

  console.log("📋 Final schedule:");
  schedule.forEach((s) =>
    console.log(
      ` → ${s.category}: ${s.mode.toUpperCase()} (WOW ${s.wow_score}) - ${
        s.article.title
      }`
    )
  );

  const results = [];
  for (const job of schedule) {
    const res = await storeVideoJob(job);
    if (res) results.push(res);
  }

  console.log(`🎬 Queued videos: ${results.length}`);
  return results;
}
