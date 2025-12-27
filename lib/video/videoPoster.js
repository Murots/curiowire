// ============================================================================
// lib/video/videoPoster.js — v2.1 CurioWire Production
// Social Video Poster
// ============================================================================
//
// Nå integrert med captionTemplates.js:
//  - Automatisk generering av caption + hashtags basert på artikkel
//  - Sikrer kategori-spesifikke hooks + artikkelens egne hashtags
//
// Håndterer posting til:
//  - TikTok
//  - YouTube Shorts
//  - Instagram Reels
//  - Facebook Reels
//
// Lagrer resultater i Supabase (videos-tabellen)
// ============================================================================

import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";
import { buildCaptionAndHashtags } from "./captionTemplates.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
  const tags = hashtags.length ? "\n\n" + hashtags.join(" ") : "";
  return `${text}${tags}`.trim();
}

async function updateVideoRecord(videoId, fields) {
  await supabase.from("videos").update(fields).eq("id", videoId);
}

// ============================================================================
// 1. ENTRYPOINT – post video to all selected platforms
// ============================================================================

export async function postVideoToPlatforms(job) {
  const {
    id,
    article,
    article_id,
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
    `🚀 Posting video ${id} (cat=${category}, wow=${wow_score}, mode=${mode})`
  );

  // Verify file exists
  try {
    const stat = await fs.stat(video_path);
    if (!stat.isFile()) throw new Error("Not a valid video file");
  } catch (err) {
    // ✅ videos-tabellen har ikke error_message-kolonne → logg i posted_results
    await updateVideoRecord(id, {
      status: "failed",
      posted_results: {
        ...(posted_results || {}),
        error: err.message,
      },
      updated_at: new Date().toISOString(),
    });
    throw err;
  }

  // ========================================================================
  //  NEW: AUTOMATISK CAPTION + HASHTAGS fra article
  // ========================================================================
  let finalCaption;
  let finalHashtags;

  if (manualCaption || manualHashtags) {
    // Manuell overstyring (beholder fremtidig fleksibilitet)
    finalCaption = manualCaption;
    finalHashtags = manualHashtags || [];
    log("✍️ Using MANUAL caption/hashtags");
  } else {
    // NB: buildCaptionAndHashtags kan være async i din kodebase
    const { caption, hashtags } = await buildCaptionAndHashtags(article);
    finalCaption = caption;
    finalHashtags = hashtags;
    log("✨ Auto-generated caption + hashtags applied");
  }

  const fullText = buildCaption(finalCaption, finalHashtags);

  // ✅ Lagre caption + hashtags i DB (nyttig for debugging og re-post)
  await updateVideoRecord(id, {
    caption: finalCaption,
    hashtags: finalHashtags,
    updated_at: new Date().toISOString(),
  });

  // ========================================================================
  // 2. Post to each selected platform
  // ========================================================================
  const results = {};

  for (const platform of platforms) {
    try {
      let result;

      switch (platform) {
        case "tiktok":
          result = await postToTikTok(video_path, fullText);
          break;

        case "youtube":
          result = await postToYouTubeShorts(video_path, fullText);
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

      // ✅ RIKTIG felt i Supabase: posted_results (ikke posts)
      await updateVideoRecord(id, {
        posted_results: {
          ...(posted_results || {}),
          ...(results || {}),
          [platform]: {
            success: result.success,
            error: result.error || null,
            posted_at: result.success ? new Date().toISOString() : null,
          },
        },
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      log(`❌ ${platform} failed: ${err.message}`);

      results[platform] = { success: false, error: err.message };

      await updateVideoRecord(id, {
        posted_results: {
          ...(posted_results || {}),
          ...(results || {}),
          [platform]: {
            success: false,
            error: err.message,
            posted_at: null,
          },
        },
        updated_at: new Date().toISOString(),
      });
    }
  }

  const anySuccess = Object.values(results).some((r) => r.success);

  await updateVideoRecord(id, {
    status: anySuccess ? "posted" : "failed",
    posted_at: anySuccess ? new Date().toISOString() : null,
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

  const buffer = await fs.readFile(videoPath);

  // Stub:
  log("ℹ️ TikTok stub mode — integrate API later.");

  return ok("stub");
}

// ============================================================================
// 3. YouTube Shorts Posting (Scaffold)
// ============================================================================

import { uploadYouTubeShort } from "./youtubeUploader.js";

async function postToYouTubeShorts(videoPath, caption) {
  const cid = ensureEnv("YOUTUBE_CLIENT_ID");
  const sec = ensureEnv("YOUTUBE_CLIENT_SECRET");
  const ref = ensureEnv("YOUTUBE_REFRESH_TOKEN");
  if (!cid || !sec || !ref) return fail("Missing YouTube OAuth env vars");

  log("🎯 [YouTube] Uploading Shorts...");

  try {
    const result = await uploadYouTubeShort({
      videoPath,
      title: caption.split("\n")[0] || "CurioWire",
      description: caption,
      tags: ["curiowire", "shorts"],
    });

    return ok(result);
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
