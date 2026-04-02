// ============================================================================
// lib/video/videoPoster.js — v2.5 CurioWire Production
// Social Video Poster
// ============================================================================
// - Auto caption + hashtags
// - YouTube Shorts upload
// - Auto-generate and upload custom YouTube thumbnail
// - Compatible with thumbnail-first Shorts pipeline
// - ✅ Stores youtube_video_id + youtube_url
// ============================================================================

import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";
import { buildCaptionAndHashtags } from "./captionTemplates.js";
import { uploadYouTubeShort } from "./youtubeUploader.js";
import { createYouTubeThumbnail } from "./youtubeThumbnail.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Minimal logger
function log(...args) {
  console.log("[videoPoster]", ...args);
}

// ============================================================================
// 0. Helpers
// ============================================================================

function ensureEnv(name) {
  const v = process.env[name];
  if (!v) {
    log(`⚠️ Missing env var: ${name}`);
    return null;
  }
  return v;
}

function buildCaption(text, hashtags = []) {
  const safeText = String(text || "").trim();
  const safeHashtags = Array.isArray(hashtags)
    ? hashtags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];

  const tags = safeHashtags.length ? "\n\n" + safeHashtags.join(" ") : "";
  return `${safeText}${tags}`.trim();
}

function sanitizePostedResults(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

async function updateVideoRecord(videoId, fields) {
  const { error } = await supabase
    .from("videos")
    .update(fields)
    .eq("id", videoId);

  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }
}

function buildPlatformResult(result, fallbackError = null) {
  return {
    success: Boolean(result?.success),
    error: result?.error || fallbackError || null,
    posted_at: result?.success ? new Date().toISOString() : null,
    detail: result?.detail ?? null,
  };
}

// ✅ Extract YouTube data safely
function extractYouTubeData(result) {
  if (!result?.success) return null;

  const detail = result.detail || {};

  const videoId = detail.videoId || detail.id || detail.video_id || null;

  const url =
    detail.url ||
    (videoId ? `https://www.youtube.com/shorts/${videoId}` : null);

  if (!videoId && !url) return null;

  return { videoId, url };
}

// ============================================================================
// 1. ENTRYPOINT – post video to all selected platforms
// ============================================================================

export async function postVideoToPlatforms(job) {
  const {
    id,
    article,
    category,
    video_path,
    caption: manualCaption,
    hashtags: manualHashtags,
    platforms = [],
    wow_score,
    mode,
    posted_results,
  } = job;

  log(
    `🚀 Posting video ${id} (cat=${category}, wow=${wow_score}, mode=${mode ?? "unknown"})`,
  );

  const existingPostedResults = sanitizePostedResults(posted_results);

  // Verify file exists
  try {
    const stat = await fs.stat(video_path);
    if (!stat.isFile()) {
      throw new Error("Not a valid video file");
    }
  } catch (err) {
    await updateVideoRecord(id, {
      status: "failed",
      posted_results: {
        ...existingPostedResults,
        error: err.message,
      },
      updated_at: new Date().toISOString(),
    });

    throw err;
  }

  // ========================================================================
  // AUTO CAPTION + HASHTAGS
  // ========================================================================
  let finalCaption;
  let finalHashtags;

  if (manualCaption || manualHashtags) {
    finalCaption = manualCaption || "";
    finalHashtags = manualHashtags || [];
    log("✍️ Using MANUAL caption/hashtags");
  } else {
    const generated = await buildCaptionAndHashtags(article);
    finalCaption = generated?.caption || "";
    finalHashtags = generated?.hashtags || [];
    log("✨ Auto-generated caption + hashtags applied");
  }

  const fullText = buildCaption(finalCaption, finalHashtags);

  await updateVideoRecord(id, {
    caption: finalCaption,
    hashtags: finalHashtags,
    updated_at: new Date().toISOString(),
  });

  // ========================================================================
  // 2. Post to each selected platform
  // ========================================================================
  const results = {};
  let latestPostedResults = { ...existingPostedResults };

  for (const platform of platforms) {
    try {
      let result;

      switch (platform) {
        case "tiktok":
          result = await postToTikTok(video_path, fullText);
          break;

        case "youtube":
          result = await postToYouTubeShorts(video_path, fullText, article);
          break;

        case "instagram":
          result = await postToInstagramReels(video_path, fullText);
          break;

        case "facebook":
          result = await postToFacebookReels(video_path, fullText);
          break;

        default:
          result = { success: false, error: "Unknown platform" };
      }

      results[platform] = result;

      latestPostedResults = {
        ...latestPostedResults,
        [platform]: buildPlatformResult(result),
      };

      // ✅ If YouTube success → store ID + URL
      if (platform === "youtube") {
        const yt = extractYouTubeData(result);

        if (yt) {
          await updateVideoRecord(id, {
            youtube_video_id: yt.videoId,
            youtube_url: yt.url,
            updated_at: new Date().toISOString(),
          });

          log(`🎯 Stored YouTube data: videoId=${yt.videoId}, url=${yt.url}`);
        }
      }

      await updateVideoRecord(id, {
        posted_results: latestPostedResults,
        updated_at: new Date().toISOString(),
      });

      log(
        `✅ ${platform} result:`,
        JSON.stringify(latestPostedResults[platform], null, 2),
      );
    } catch (err) {
      log(`❌ ${platform} failed: ${err.message}`);

      results[platform] = { success: false, error: err.message };

      latestPostedResults = {
        ...latestPostedResults,
        [platform]: buildPlatformResult(
          { success: false, error: err.message },
          err.message,
        ),
      };

      await updateVideoRecord(id, {
        posted_results: latestPostedResults,
        updated_at: new Date().toISOString(),
      });
    }
  }

  const anySuccess = Object.values(results).some((r) => r?.success);

  await updateVideoRecord(id, {
    status: anySuccess ? "posted" : "failed",
    posted_at: anySuccess ? new Date().toISOString() : null,
    posted_results: latestPostedResults,
    updated_at: new Date().toISOString(),
  });

  log("📦 POST RESULTS:", results);
  return results;
}

// ============================================================================
// 2. TikTok Posting (Scaffold)
// ============================================================================

async function postToTikTok(videoPath, caption) {
  const token = ensureEnv("TIKTOK_ACCESS_TOKEN");
  if (!token) return fail("Missing TikTok token");

  log("🎯 [TikTok] Uploading...");
  log("ℹ️ TikTok stub mode — integrate API later.");

  return ok("stub");
}

// ============================================================================
// 3. YouTube Shorts Posting + Thumbnail
// ============================================================================

async function postToYouTubeShorts(videoPath, caption, article) {
  const cid = ensureEnv("YOUTUBE_CLIENT_ID");
  const sec = ensureEnv("YOUTUBE_CLIENT_SECRET");
  const ref = ensureEnv("YOUTUBE_REFRESH_TOKEN");

  if (!cid || !sec || !ref) {
    return fail("Missing YouTube OAuth env vars");
  }

  log("🎯 [YouTube] Preparing thumbnail...");

  let thumbnail = null;

  try {
    thumbnail = await createYouTubeThumbnail(article);
    log(
      `🖼️ [YouTube] Thumbnail ready | hook="${thumbnail.hook}" | color=${thumbnail.signalColor} | path=${thumbnail.path}`,
    );
  } catch (err) {
    log(`⚠️ [YouTube] Thumbnail generation failed: ${err.message}`);
  }

  log("🎯 [YouTube] Uploading Shorts...");

  try {
    const result = await uploadYouTubeShort({
      videoPath,
      title: (caption.split("\n")[0] || "CurioWire").slice(0, 95),
      description: caption,
      tags: ["curiowire", "shorts"],
      delayedPublishMinutes: Number(
        process.env.YOUTUBE_DELAYED_PUBLISH_MINUTES || 0,
      ),
      thumbnailPath: thumbnail?.path || null,
    });

    if (result?.publishAt) {
      log(
        `⏰ [YouTube] Uploaded as PRIVATE with scheduled publishAt=${result.publishAt}`,
      );
    } else {
      log("✅ [YouTube] Uploaded as PUBLIC");
    }

    return ok({
      ...result,
      thumbnailHook: thumbnail?.hook || null,
      thumbnailColor: thumbnail?.signalColor || null,
      thumbnailPath: thumbnail?.path || null,
    });
  } catch (err) {
    return fail(err.message);
  }
}

// ============================================================================
// 4. Instagram Reels Posting (Scaffold)
// ============================================================================

async function postToInstagramReels(videoPath, caption) {
  const igUser = ensureEnv("INSTAGRAM_BUSINESS_ID");
  const token = ensureEnv("INSTAGRAM_ACCESS_TOKEN");
  if (!igUser || !token) return fail("Missing Instagram env vars");

  log("🎯 [Instagram] Uploading...");
  log("ℹ️ Instagram stub mode — integrate Graph API later.");

  return ok("stub");
}

// ============================================================================
// 5. Facebook Reels Posting (Scaffold)
// ============================================================================

async function postToFacebookReels(videoPath, caption) {
  const pageId = ensureEnv("FACEBOOK_PAGE_ID");
  const token = ensureEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
  if (!pageId || !token) return fail("Missing Facebook env vars");

  log("🎯 [Facebook] Uploading...");
  log("ℹ️ Facebook stub mode — integrate Graph API later.");

  return ok("stub");
}

// ============================================================================
// Helpers
// ============================================================================

function ok(detail) {
  return { success: true, detail };
}

function fail(msg) {
  return { success: false, error: msg };
}
