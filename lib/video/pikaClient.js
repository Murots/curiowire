// ============================================================================
// lib/video/pikaClient.js — Fal Video API wrapper (generate video buffer)
// v4.1 — Provider toggle (Pika/Kling) + env-safe (NO import-time caching)
//
// Guarantees (always):
// - duration: 10 seconds (normalized to 10 for models requiring 5/10 enum)
// - aspect_ratio: 9:16
// - negative_prompt: same hardening list for both providers
//
// Providers:
// - PIKA:
//    scenes (pikascenes): image_urls + prompt + aspect_ratio (+ resolution/duration)
//    text:               prompt + aspect_ratio (+ resolution/duration)
//    image:              image_url + prompt (+ resolution/duration) [no aspect_ratio for schema safety]
// - KLING:
//    text:               prompt + aspect_ratio + duration (+ cfg_scale)
//
// Env toggles:
//   VIDEO_PROVIDER="pika" | "kling"            (default: "pika")
//   VIDEO_PRESET="scenes" | "text" | "image"   (default: "scenes" for pika when imageUrls exist, else text; "text" for kling)
//
// Models (env):
//   PIKA_SCENES_MODEL="fal-ai/pika/v2.2/pikascenes"
//   PIKA_TEXT_MODEL="fal-ai/pika/v2.2/text-to-video"
//   PIKA_IMAGE_MODEL="fal-ai/pika/v2.2/image-to-video"
//   KLING_TEXT_MODEL="fal-ai/kling-video/v2.5-turbo/pro/text-to-video"
//
// Kling optional:
//   KLING_CFG_SCALE="0.55" (default 0.5 if unset)
//
// Notes:
// - NO dotenv.config() here. Do it ONCE in your entry scripts (testPika.js, cron, etc.).
// ============================================================================

import fs from "fs-extra";
import fetch from "node-fetch";
import { fal } from "@fal-ai/client";

// ---------------------------
// Hard-locked defaults (per your requirement)
// ---------------------------
const LOCKED_ASPECT_RATIO = "9:16";
const LOCKED_DURATION_SECONDS = 10; // we normalize to 10 for enum-based models

const DEFAULT_NEGATIVE_PROMPT = [
  // text / typography
  "any text",
  "text",
  "letters",
  "words",
  "typography",
  "captions",
  "subtitles",
  "title",
  "headline",
  "numbers",
  "digits",
  "roman numerals",
  "symbols",
  "punctuation",
  // branding / stamps
  "watermark",
  "logo",
  "brand",
  "signature",
  "credits",
  "title card",
  // UI / overlays
  "UI",
  "interface",
  "HUD",
  "overlay",
  "label",
  "tag",
  "annotation",
  "lower third",
  "chyrons",
  "ticker",
  "scoreboard",
  "stats",
  "timestamp",
  "coordinates",
  // codes / signage / graphics
  "QR code",
  "barcode",
  "icon",
  "signage",
  "poster",
  "banner",
  "infographic",
  "diagram",
  "chart",
  "graph",
  "map labels",
  "on-screen text",
  "subtitles burned in",
].join(", ");

// ---------------------------
// Small helpers
// ---------------------------
function maskKey(s) {
  const str = String(s || "");
  if (!str) return "";
  if (str.length <= 6) return "***";
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
}

function truncate(s, max = 240) {
  const str = String(s || "");
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

function normalizeDurationTo510(duration) {
  // For models whose schema expects 5 or 10
  const d = Number(duration);
  if (!Number.isFinite(d)) return 10;
  return d >= 10 ? 10 : 5;
}

function extractVideoUrlFromFalResult(result) {
  return result?.data?.video?.url || null;
}

function toDataUriIfLocal(pathOrUrl) {
  const s = String(pathOrUrl || "");
  if (!s) return null;
  if (s.startsWith("http")) return s;

  const buf = fs.readFileSync(s);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// Read env dynamically at CALL-time (fixes your exact issue)
function getEnvDefaults() {
  const provider = (process.env.VIDEO_PROVIDER || "pika").toLowerCase();
  const preset = (process.env.VIDEO_PRESET || "").toLowerCase();

  const models = {
    pikaScenes: process.env.PIKA_SCENES_MODEL || "fal-ai/pika/v2.2/pikascenes",
    pikaText: process.env.PIKA_TEXT_MODEL || "fal-ai/pika/v2.2/text-to-video",
    pikaImage:
      process.env.PIKA_IMAGE_MODEL || "fal-ai/pika/v2.2/image-to-video",
    klingText:
      process.env.KLING_TEXT_MODEL ||
      "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
  };

  // Pika resolution default (Kling schema you pasted does not include resolution)
  const resolution = process.env.PIKA_RESOLUTION || "1080p";

  const cfgScaleEnvRaw = process.env.KLING_CFG_SCALE;
  const cfgScaleEnv = Number.isFinite(Number(cfgScaleEnvRaw))
    ? Number(cfgScaleEnvRaw)
    : undefined;

  return { provider, preset, models, resolution, cfgScaleEnv };
}

// Decide effective provider/preset based on inputs + env
function resolveProviderPreset({ provider, preset, imageUrl, imageUrls }) {
  const env = getEnvDefaults();

  const p = (provider || env.provider || "pika").toLowerCase();
  let pr = (preset || env.preset || "").toLowerCase();

  if (p === "kling") {
    if (!pr) pr = "text";
    return { provider: "kling", preset: pr };
  }

  // Pika defaults:
  if (!pr) {
    if (Array.isArray(imageUrls) && imageUrls.length) pr = "scenes";
    else if (imageUrl) pr = "image";
    else pr = "text";
  }

  // Guard: if scenes but no imageUrls, fall back
  if (pr === "scenes" && !(Array.isArray(imageUrls) && imageUrls.length)) {
    pr = "text";
  }

  return { provider: "pika", preset: pr };
}

function resolveModel({ provider, preset, model }) {
  if (model) return model;

  const env = getEnvDefaults();

  if (provider === "kling") return env.models.klingText;

  if (preset === "scenes") return env.models.pikaScenes;
  if (preset === "image") return env.models.pikaImage;
  return env.models.pikaText;
}

/**
 * callPikaAPI (name kept for backward compatibility)
 *
 * Now supports BOTH Pika + Kling. Selection is env-driven by default.
 *
 * IMPORTANT: duration/aspect/negative are hard-locked to:
 * - duration=10
 * - aspect_ratio=9:16
 * - negative_prompt=DEFAULT_NEGATIVE_PROMPT
 *
 * You can still pass provider/preset/model explicitly if you want,
 * but the above locks are always enforced.
 */
export async function callPikaAPI({
  // core
  prompt,
  provider,
  preset,
  model,

  // media inputs
  imageUrl,
  imageUrls,

  // optional knobs (ignored/overridden by locks where applicable)
  resolution,
  cfgScale,
} = {}) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) throw new Error("Missing FAL_KEY");

  const trimmedPrompt = String(prompt || "").trim();
  if (!trimmedPrompt) throw new Error("callPikaAPI: Missing prompt");

  // Configure client credentials (server-side safe)
  fal.config({ credentials: FAL_KEY });

  // Resolve provider/preset/model at call-time (env-safe)
  const { provider: effProvider, preset: effPreset } = resolveProviderPreset({
    provider,
    preset,
    imageUrl,
    imageUrls,
  });

  const effModel = resolveModel({
    provider: effProvider,
    preset: effPreset,
    model,
  });

  // HARD LOCKS
  const aspectRatio = LOCKED_ASPECT_RATIO;
  const durEnum = normalizeDurationTo510(LOCKED_DURATION_SECONDS);
  const negativePrompt = DEFAULT_NEGATIVE_PROMPT;

  // Env defaults (for pika resolution and kling cfg)
  const env = getEnvDefaults();

  // ---------------------------
  // Build schema-faithful input
  // ---------------------------
  let inputObj = null;

  if (effProvider === "kling") {
    // Kling 2.5 pro t2v schema (per doc you pasted):
    // prompt, duration(5|10), aspect_ratio(16:9|9:16|1:1), negative_prompt, cfg_scale
    const cfg =
      typeof cfgScale === "number"
        ? cfgScale
        : typeof env.cfgScaleEnv === "number"
          ? env.cfgScaleEnv
          : 0.5;

    inputObj = {
      prompt: trimmedPrompt,
      duration: String(durEnum), // schema shows enum strings; safe
      aspect_ratio: aspectRatio,
      negative_prompt: negativePrompt,
      cfg_scale: cfg,
    };
  } else {
    // Pika modes
    const hasScenes = effPreset === "scenes";
    const hasImage = effPreset === "image";

    inputObj = {
      prompt: trimmedPrompt,
      negative_prompt: negativePrompt,
      duration: durEnum,
    };

    // For schema safety: image-to-video in your pasted schema did NOT list aspect_ratio
    if (!hasImage) {
      inputObj.aspect_ratio = aspectRatio;
    }

    // Pika resolution supported; take explicit arg if provided else env default
    const pikaRes = resolution || env.resolution || "1080p";
    if (pikaRes) inputObj.resolution = pikaRes;

    if (hasScenes) {
      inputObj.image_urls = (imageUrls || [])
        .map(toDataUriIfLocal)
        .filter(Boolean);

      if (!inputObj.image_urls.length) {
        throw new Error(
          "PikaScenes preset requires imageUrls (none provided).",
        );
      }

      // Harden against overlay hallucinations
      inputObj.ingredients_mode = "precise";
    } else if (hasImage) {
      if (!imageUrl) throw new Error("Pika image preset requires imageUrl.");
      inputObj.image_url = toDataUriIfLocal(imageUrl);
    }
  }

  // ---------------------------
  // Logging
  // ---------------------------
  const modeLabel =
    effProvider === "kling"
      ? "kling-text-to-video"
      : effPreset === "scenes"
        ? "pika-pikascenes"
        : effPreset === "image"
          ? "pika-image-to-video"
          : "pika-text-to-video";

  console.log(`🎬 Calling Fal video via @fal-ai/client…`);
  console.log(
    `🧩 provider=${effProvider} | preset=${effPreset} | mode=${modeLabel} | model=${effModel}`,
  );
  console.log(`⏱ duration=${durEnum}s | aspect_ratio=${aspectRatio}`);
  if (effProvider === "pika")
    console.log(`📺 resolution=${inputObj.resolution}`);
  if (effProvider === "kling")
    console.log(`🎛 cfg_scale=${inputObj.cfg_scale}`);
  console.log(`🔑 FAL_KEY: ${maskKey(FAL_KEY)}`);
  console.log(`📝 Prompt (head): ${truncate(trimmedPrompt, 180)}`);
  console.log(`🚫 Negative (head): ${truncate(negativePrompt, 180)}`);
  if (effProvider === "pika" && inputObj.image_urls) {
    console.log(`🖼 image_urls: ${inputObj.image_urls.length}`);
    console.log(`🧪 ingredients_mode: ${inputObj.ingredients_mode}`);
  }

  // ---------------------------
  // Call Fal
  // ---------------------------
  const result = await fal.subscribe(effModel, {
    input: inputObj,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && Array.isArray(update.logs)) {
        update.logs
          .map((l) => l?.message)
          .filter(Boolean)
          .forEach((m) => console.log("🧾", m));
      }
    },
  });

  const url = extractVideoUrlFromFalResult(result);
  if (!url) {
    throw new Error(
      `Fal result missing video.url (model=${effModel}, mode=${modeLabel})`,
    );
  }

  const vidRes = await fetch(url);
  if (!vidRes.ok) {
    throw new Error(`Failed to download video (HTTP ${vidRes.status})`);
  }

  const buf = Buffer.from(await vidRes.arrayBuffer());
  if (!buf || buf.length < 100_000) {
    throw new Error(
      `Video too small — probably broken (size=${buf?.length ?? 0} bytes)`,
    );
  }

  console.log(`✅ Video download ok — size=${buf.length} bytes`);
  return buf;
}
