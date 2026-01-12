// ============================================================================
// videoScheduler.js — SINGLE VIDEO PER RUN (v4.1)
// CurioWire — Picks ONE best eligible article per 12h window and queues FULL-AI video
// Fix: don't get stuck on top WOW article that already has a video job.
// ============================================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const LOOKBACK_HOURS = 12;
const CANDIDATE_LIMIT = 25;

// If true, scheduler may retry articles that only have FAILED video jobs
const ALLOW_RETRY_FAILED = false;

/**
 * Returns true if a FULL-AI video job exists that should block scheduling.
 * - If ALLOW_RETRY_FAILED=false: ANY existing record blocks (including failed).
 * - If ALLOW_RETRY_FAILED=true: only non-failed records block.
 */
async function videoJobBlocksScheduling(articleId) {
  let q = supabase
    .from("videos")
    .select("id,status")
    .eq("article_id", articleId)
    .eq("is_full_ai", true);

  if (ALLOW_RETRY_FAILED) {
    q = q.not("status", "eq", "failed");
  }

  const { data, error } = await q.limit(1).maybeSingle();
  if (error) {
    console.warn("⚠️ videoJobBlocksScheduling query failed:", error.message);
    // Fail-safe: block scheduling to avoid duplicates
    return true;
  }

  return !!data;
}

/**
 * Fetch top N candidates in the time window (excluding products),
 * then pick the first one that does NOT have a blocking video job.
 */
async function pickBestEligibleArticle() {
  const since = new Date(
    Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: candidates, error } = await supabase
    .from("articles")
    .select("*")
    .gte("created_at", since)
    .neq("category", "products")
    .order("wow_score", { ascending: false })
    .limit(CANDIDATE_LIMIT);

  if (!error) {
    console.log(
      "🧪 Candidates:",
      (candidates || [])
        .map((c) => `${c.id}:${c.category}:${c.wow_score}`)
        .join(" | ")
    );
  }

  if (error || !candidates || candidates.length === 0) {
    console.log("⚠️ No eligible articles found for video.");
    return null;
  }

  for (const a of candidates) {
    const blocked = await videoJobBlocksScheduling(a.id);
    if (!blocked) return a;
  }

  console.log(
    `ℹ️ All top ${CANDIDATE_LIMIT} candidates already have video jobs.`
  );
  return null;
}

/**
 * MAIN ENTRY
 * Queues ONE full-AI video job
 */
export async function scheduleSingleVideo() {
  console.log("🎯 Running single-video scheduler (12h window)…");

  const article = await pickBestEligibleArticle();
  if (!article) return null;

  const payload = {
    article_id: article.id,
    category: article.category,
    wow_score: article.wow_score || 0,
    is_full_ai: true,
    platforms: ["youtube"], // testfase
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
