// ============================================================================
// videoGenerator.js (v9.1 — 25-second precision TTS + SFX-aware timing)
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
  const { id, mode } = videoJob;

  // Ensure article object exists
  const article = videoJob.article || videoJob.article_json;
  if (!article) {
    throw new Error("Video job missing article or article_json");
  }

  if (videoJob.article) {
    console.log("📝 Using article from videoJob.article");
  } else {
    console.log("📝 Using article from videoJob.article_json");
  }

  console.log(
    `🎥 Generating video for article ${article.id} — "${article.title}" (${mode})`
  );

  await updateVideoRecord(id, { status: "generating" });

  // Short, clean summary for Full-AI prompt
  const summaryText =
    stripHtml(article.seo_description) ||
    stripHtml(article.excerpt) ||
    `This article explores ${article.title}.`;

  // ========================================================================
  // 🎯 NEW TARGET LENGTH FOR VOICEOVER
  // ========================================================================
  //
  // Video composition:
  //   • 0.0–0.5s   => silence
  //   • 0.5–2.5s   => lightbulb SFX
  //   • 2.5–27.5s  => voice (≈25 sec)
  //   • 27.5–28.0s => outro tail
  //
  // Therefore the narration script must target ~25 seconds.
  // buildTimedNarrationScriptPrecise will adapt text density accordingly.
  //
  const TARGET_SECONDS = 29;

  console.log(`🎯 Building narration targeting ~${TARGET_SECONDS}s`);
  const narrationScript = await buildTimedNarrationScriptPrecise(
    article,
    TARGET_SECONDS
  );

  let mp4Path = null;

  try {
    if (mode === "full") {
      // FULL MODE: Pika turbo → v2.2 → zoom fallback
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
        mp4Path = await generateImageZoomVideo(
          article,
          article.image_url,
          narrationScript
        );
      }
    } else {
      // IMAGE MODE: zoom-only fallback (no subs for now)
      mp4Path = await generateImageZoomVideo(
        article,
        article.image_url,
        narrationScript
      );
    }

    await updateVideoRecord(id, {
      status: "ready",
      video_path: mp4Path,
      updated_at: new Date().toISOString(),
    });

    return mp4Path;
  } catch (err) {
    console.error("❌ Video generation failed:", err.message);

    await updateVideoRecord(id, {
      status: "failed",
      error_message: err.message,
      updated_at: new Date().toISOString(),
    });

    return null;
  }
}
