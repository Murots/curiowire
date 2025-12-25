// ============================================================================
// videoGenerator.js (v9.2 — Supabase schema-safe + always FULL-AI jobs support)
// CurioWire Automated Video Generator
// ============================================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { stripHtml } from "./textUtils.js";
import { buildTimedNarrationScriptPrecise } from "./narration.js";

import { generateFullAIVideo } from "./fullAIPipeline.js";
import { generateImageZoomVideo } from "./zoomFallback.js";

dotenv.config({ path: ".env.local" });

// ============================================================================
// 0. Init Supabase client
// ============================================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// 1. Supabase helper
// ============================================================================
async function updateVideoRecord(videoId, fields) {
  await supabase.from("videos").update(fields).eq("id", videoId);
}

// ============================================================================
// 2. MAIN EXPORT — orchestrator
// ============================================================================
export async function generateVideo(videoJob) {
  // videoJob kan komme fra scheduler (is_full_ai=true) eller eldre flow (mode)
  const { id } = videoJob;

  // Ensure article object exists
  const article = videoJob.article || videoJob.article_json;
  if (!article) {
    throw new Error("Video job missing article or article_json");
  }

  const isFullAI =
    typeof videoJob.is_full_ai === "boolean"
      ? videoJob.is_full_ai
      : videoJob.mode === "full";

  const modeLabel = isFullAI ? "full" : "image";

  if (videoJob.article) {
    console.log("📝 Using article from videoJob.article");
  } else {
    console.log("📝 Using article from videoJob.article_json");
  }

  console.log(
    `🎥 Generating video for article ${article.id} — "${article.title}" (${modeLabel})`
  );

  await updateVideoRecord(id, {
    status: "generating",
    updated_at: new Date().toISOString(),
  });

  // Short, clean summary for Full-AI prompt
  const summaryText =
    stripHtml(article.seo_description) ||
    stripHtml(article.excerpt) ||
    `This article explores ${article.title}.`;

  // ========================================================================
  // 🎯 TARGET LENGTH FOR VOICEOVER (SFX-aware)
  // ========================================================================
  //
  // Video composition (typisk):
  //   • 0.0–0.1s   => stillhet (BULB_DELAY_SECONDS)
  //   • 0.1–2.35s  => lightbulb SFX (VOICE_DELAY_SECONDS)
  //   • 2.35–...   => voice + BGM
  //
  // buildTimedNarrationScriptPrecise tilpasser ordmengden automatisk.
  //
  const TARGET_SECONDS = 29;

  console.log(`🎯 Building narration targeting ~${TARGET_SECONDS}s`);
  const narrationScript = await buildTimedNarrationScriptPrecise(
    article,
    TARGET_SECONDS
  );

  let mp4Path = null;

  try {
    if (isFullAI) {
      // FULL MODE: Pika primary → fallback → zoom fallback
      try {
        mp4Path = await generateFullAIVideo(
          article,
          summaryText,
          narrationScript
        );
      } catch (errFull) {
        console.error(
          "⚠️ Full-AI video generation failed, falling back to zoom:",
          errFull.message
        );

        // fallback: still generate something (no subs here per din zoomFallback)
        mp4Path = await generateImageZoomVideo(
          article,
          article.image_url,
          narrationScript
        );
      }
    } else {
      // IMAGE MODE: zoom-only fallback
      mp4Path = await generateImageZoomVideo(
        article,
        article.image_url,
        narrationScript
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

    // ✅ videos-tabellen har ikke error_message-kolonne → bruk posted_results
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
