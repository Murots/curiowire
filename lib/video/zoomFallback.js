// ============================================================================
// zoomFallback.js — Image zoom (Ken Burns) + TTS fallback video generator
// FIXED VERSION (proper audio input + correct mapping)
// ============================================================================

import fs from "fs-extra";
import path from "path";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { v4 as uuidv4 } from "uuid";

import { generateVoiceover, getAudioDuration } from "./audioEngine.js";

const OUTPUT_DIR = "./generated_videos";
fs.ensureDirSync(OUTPUT_DIR);

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Download remote image
export async function downloadImage(url) {
  const id = uuidv4();
  const filePath = path.join(OUTPUT_DIR, `${id}.jpg`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image (HTTP ${res.status})`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);

  return filePath;
}

// Ken Burns fallback
export async function generateImageZoomVideo(article, imageUrl, narrationText) {
  console.log("🎞 Generating image-zoom fallback video…");

  const localImage = await downloadImage(imageUrl);

  // Generate voiceover
  const voiceFile = await generateVoiceover(narrationText);
  const audioDur = await getAudioDuration(voiceFile);

  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-zoom.mp4`);

  // Total frames for zoompan (30 fps)
  const totalFrames = Math.max(1, Math.floor(audioDur * 30));

  return new Promise((resolve, reject) => {
    ffmpeg()
      // Input 0: still image (looped)
      .input(localImage)
      .inputOptions(["-loop 1"])
      // Input 1: audio
      .input(voiceFile)
      .complexFilter([
        // Zoom effect over time
        {
          filter: "zoompan",
          inputs: "0:v",
          options: {
            z: "1+0.0006*n",
            d: totalFrames, // number of frames to output
            s: "1080x1920",
            fps: "30",
          },
          outputs: "zp",
        },

        // If zoompan already outputs 1080x1920, this is mostly redundant,
        // but we keep it safe in case the filter changes.
        {
          filter: "scale",
          inputs: "zp",
          options: "1080:1920:force_original_aspect_ratio=decrease",
          outputs: "scaled",
        },
        {
          filter: "pad",
          inputs: "scaled",
          options: "1080:1920:(ow-iw)/2:(oh-ih)/2:black",
          outputs: "finalv",
        },
      ])
      .outputOptions([
        "-map [finalv]",
        "-map 1:a",
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 192k",
        "-shortest",
      ])
      .save(outPath)
      .on("end", () => {
        console.log("🎉 Zoom fallback video created:", outPath);
        resolve(outPath);
      })
      .on("error", (err) =>
        reject(new Error("FFmpeg zoom fallback failed: " + err.message)),
      );
  });
}
