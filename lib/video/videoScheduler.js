// ============================================================================
// videoScheduler.js — SINGLE VIDEO PER RUN (v4.0)
// CurioWire — Picks ONE best article per 12h window and queues FULL-AI video
// ============================================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXCLUDED_CATEGORIES = ["products"];
const LOOKBACK_HOURS = 12;

/**
 * Check if a full-AI video already exists for this article
 */
async function videoJobExists(articleId) {
  const { data } = await supabase
    .from("videos")
    .select("id")
    .eq("article_id", articleId)
    .eq("is_full_ai", true)
    .maybeSingle();

  return !!data;
}

/**
 * Pick best article (highest WOW) from last LOOKBACK_HOURS
 */
async function pickBestArticle() {
  const since = new Date(
    Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .gte("created_at", since)
    .not("category", "in", `(${EXCLUDED_CATEGORIES.join(",")})`)
    .order("wow_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.log("⚠️ No eligible article found for video.");
    return null;
  }

  return data;
}

/**
 * MAIN ENTRY
 * Queues ONE full-AI video job
 */
export async function scheduleSingleVideo() {
  console.log("🎯 Running single-video scheduler (12h window)…");

  const article = await pickBestArticle();
  if (!article) return null;

  if (await videoJobExists(article.id)) {
    console.log(`⏭️ Video already exists for article ${article.id}, skipping.`);
    return null;
  }

  const payload = {
    article_id: article.id,
    category: article.category,
    wow_score: article.wow_score || 0,
    is_full_ai: true,
    platforms: ["tiktok", "instagram", "youtube", "facebook"],
    status: "queued",
  };

  const { data, error } = await supabase
    .from("videos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("❌ Failed to queue video:", error.message);
    return null;
  }

  console.log(
    `🎬 Queued FULL-AI video for article ${article.id} (WOW ${article.wow_score})`
  );

  return data;
}
