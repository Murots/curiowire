// ============================================================================
// videoGenerator.js (v10 — curiosity_cards + video_script-first + FULL-AI)
// ============================================================================

import { createClient } from "@supabase/supabase-js";

import { stripHtml } from "./textUtils.js";
import { buildTimedNarrationFromDraft } from "./narration.js";

import { generateFullAIVideo } from "./fullAIPipeline.js";
import { generateImageZoomVideo } from "./zoomFallback.js";

// NOTE:
// dotenv.config() should be done in entry scripts (e.g. scripts/testPika.js, cron runners).
// This module lazily creates Supabase client to avoid import-order/env issues.

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_URL is missing (env not loaded?)");
  if (!key)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing (env not loaded?)");

  _supabase = createClient(url, key);
  return _supabase;
}

async function updateVideoRecord(videoId, fields) {
  const supabase = getSupabase();
  await supabase.from("videos").update(fields).eq("id", videoId);
}

async function fetchCuriosityCardById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("curiosity_cards")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateVideo(videoJob) {
  const { id } = videoJob;

  // Resolve card/article payload
  let article = videoJob.article || videoJob.article_json || null;

  // If not embedded, fetch from curiosity_cards using article_id
  if (!article) {
    const cardId = videoJob.article_id;
    if (!cardId)
      throw new Error("Video job missing article/article_json AND article_id");

    article = await fetchCuriosityCardById(cardId);
    if (!article)
      throw new Error(`Could not fetch curiosity_card id=${cardId}`);
    console.log("📝 Using curiosity_card fetched from DB:", article.id);
  } else {
    console.log("📝 Using article payload from job (article/article_json)");
  }

  const isFullAI =
    typeof videoJob.is_full_ai === "boolean"
      ? videoJob.is_full_ai
      : videoJob.mode === "full";

  const modeLabel = isFullAI ? "full" : "image";

  console.log(
    `🎥 Generating video for card ${article.id} — "${article.title}" (${modeLabel})`,
  );

  await updateVideoRecord(id, {
    status: "generating",
    updated_at: new Date().toISOString(),
  });

  // Short summary (for model context if needed)
  const summaryText =
    stripHtml(article.seo_description) ||
    stripHtml(article.card_text) ||
    `This story is about ${article.title}.`;

  const TARGET_SECONDS = 23;

  console.log(
    `🎯 Building narration targeting ~${TARGET_SECONDS}s (video_script-first)`,
  );

  const narrationScript = await buildTimedNarrationFromDraft(
    article,
    TARGET_SECONDS,
  );

  let mp4Path = null;

  try {
    if (isFullAI) {
      try {
        mp4Path = await generateFullAIVideo(
          article,
          summaryText,
          narrationScript,
        );
      } catch (errFull) {
        console.error(
          "⚠️ Full-AI video generation failed, falling back to zoom:",
          errFull.message,
        );

        mp4Path = await generateImageZoomVideo(
          article,
          article.image_url,
          narrationScript,
        );
      }
    } else {
      mp4Path = await generateImageZoomVideo(
        article,
        article.image_url,
        narrationScript,
      );
    }

    await updateVideoRecord(id, {
      status: "ready",
      video_path: mp4Path,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return mp4Path;
  } catch (err) {
    console.error("❌ Video generation failed:", err.message);

    await updateVideoRecord(id, {
      status: "failed",
      posted_results: {
        ...(videoJob.posted_results || {}),
        error: err.message,
      },
      updated_at: new Date().toISOString(),
    });

    return null;
  }
}
