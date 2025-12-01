// ============================================================================
// pikaClient.js — Fal/PIKA API wrapper (generate video buffer)
// ============================================================================

import fetch from "node-fetch";
import fs from "fs-extra";
/**
 * Build full model path for Fal if raw id is provided.
 * Example:
 *   "pika-v2.2" → "fal-ai/pika-v2.2"
 */
export function buildFalModelPath(modelIdRaw) {
  if (!modelIdRaw) throw new Error("No Pika model id provided");
  return modelIdRaw.startsWith("fal-ai/") ? modelIdRaw : `fal-ai/${modelIdRaw}`;
}

/**
 * Call Pika via Fal API:
 * - Generates video (image + prompt → video buffer)
 * - No polling (Fal returns completed video)
 * - Performs robust URL extraction from response
 * - Throws error if video is too small (<100 KB)
 */
export async function callPikaAPI({ prompt, imageUrl, duration = 10, model }) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) throw new Error("Missing FAL_KEY");

  const falModel = buildFalModelPath(model);

  console.log(`🎬 Calling Fal/PIKA (model=${falModel})…`);

  const body = {
    prompt,
    duration,
    seconds: duration,
    num_frames: duration * 30, // 30fps
    aspect_ratio: "9:16",
    resolution: "1080p",
  };

  if (imageUrl.startsWith("http")) {
    body.image_url = imageUrl;
  } else {
    // Local file → convert to base64 Data URI
    const data = fs.readFileSync(imageUrl);
    const base64 = `data:image/png;base64,${data.toString("base64")}`;
    body.image_url = base64;
  }

  const res = await fetch(`https://fal.run/${falModel}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${FAL_KEY}`,
    },
    body: JSON.stringify(body),
  });

  let json = null;
  try {
    json = await res.json();
  } catch (err) {
    throw new Error(`Fal/PIKA returned non-JSON response: ${err.message}`);
  }

  const url =
    json?.video?.url ||
    json?.output?.video?.url ||
    json?.result?.video?.url ||
    json?.videos?.[0]?.url;

  if (!url) {
    throw new Error(
      `Fal/PIKA bad JSON (no video url found): ${JSON.stringify(json)}`
    );
  }

  // Fetch binary MP4
  const vidRes = await fetch(url);
  if (!vidRes.ok) {
    throw new Error(`Failed to download Pika video (HTTP ${vidRes.status})`);
  }

  const buf = Buffer.from(await vidRes.arrayBuffer());

  // If too small — probably <3 seconds or broken
  if (!buf || buf.length < 100_000) {
    throw new Error(
      `Video too small — probably <3 sec (size=${buf.length} bytes)`
    );
  }

  return buf;
}
