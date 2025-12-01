// ============================================================================
// autoVerticalImagePreprocess.js
// Local-only image crop → 9:16 → upscale → return local temp file
// No Supabase. No uploads. Pure FFmpeg 2018-safe.
// ============================================================================

import fs from "fs-extra";
import path from "path";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegBin from "@ffmpeg-installer/ffmpeg";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

ffmpeg.setFfmpegPath(ffmpegBin.path);

const TMP_DIR = "./generated_videos/tmp_preprocess/";
fs.ensureDirSync(TMP_DIR);

// Download image → buffer
async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Pure local preprocessing:
 * - read image buffer
 * - determine center-crop for 9:16
 * - optionally upscale to ~2160 height
 * - save to local PNG
 * - return local path
 */
export async function preprocessImageForPika(imageUrl) {
  console.log("🖼️ Auto-preprocess input image for 9:16… (local-only)");

  try {
    const buf = await downloadImage(imageUrl);
    const id = uuidv4();
    const outPath = path.join(TMP_DIR, `${id}-preprocessed.png`);

    const img = sharp(buf);
    const meta = await img.metadata();

    const { width, height } = meta;

    if (!width || !height) {
      throw new Error("Could not read image dimensions");
    }

    // Desired ratio = 9:16 = 0.5625
    const targetRatio = 9 / 16;
    const inputRatio = width / height;

    let cropWidth, cropHeight;

    if (inputRatio > targetRatio) {
      // image too wide → crop sides
      cropHeight = height;
      cropWidth = Math.floor(height * targetRatio);
    } else {
      // image too tall/narrow → crop top/bottom
      cropWidth = width;
      cropHeight = Math.floor(width / targetRatio);
    }

    const left = Math.floor((width - cropWidth) / 2);
    const top = Math.floor((height - cropHeight) / 2);

    // Perform crop + resize to ensure high-quality 1080x1920 feed
    await img
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize({
        width: 1080,
        height: 1920,
        fit: "cover",
      })
      .png()
      .toFile(outPath);

    console.log("📐 9:16 preprocessed image (local):", outPath);

    return outPath; // local path passed directly to Pika
  } catch (err) {
    console.warn("⚠️ Auto-vertical image preprocess failed:", err.message);
    return imageUrl; // fallback to original
  }
}
