// ============================================================================
// zoomFallback.js — Image zoom (Ken Burns) + TTS fallback video generator
// FIXED VERSION (FFmpeg label-safe + padding + audio)
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
  if (!res.ok) throw new Error("Failed to download image");

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);

  return filePath;
}

// Ken Burns fallback
export async function generateImageZoomVideo(article, imageUrl, narrationText) {
  console.log("🎞 Generating image-zoom fallback video…");

  const localImage = await downloadImage(imageUrl);
  const voiceFile = await generateVoiceover(narrationText);
  const audioDur = await getAudioDuration(voiceFile);

  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-zoom.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(localImage)
      .loop(audioDur)
      // Label video input as [v0]
      .inputOptions(["-loop 1"])
      .complexFilter([
        // Zoom effect
        {
          filter: "zoompan",
          inputs: "0:v",
          options: {
            z: "1+0.0006*n",
            d: "1",
            fps: "30",
          },
          outputs: "zoomed",
        },

        // Scale + pad into 1080×1920
        {
          filter: "scale",
          inputs: "zoomed",
          options: "1080:-2:force_original_aspect_ratio=decrease",
          outputs: "scaled",
        },
        {
          filter: "pad",
          inputs: "scaled",
          options: "1080:1920:(ow-iw)/2:(oh-ih)/2:black",
          outputs: "finalv",
        },
      ])
      // Video
      .addOutputOptions([
        "-map [finalv]",
        "-map 1:a", // use full audio
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-c:a aac",
        "-shortest",
      ])
      .save(outPath)
      .on("end", () => {
        console.log("🎉 Zoom fallback video created:", outPath);
        resolve(outPath);
      })
      .on("error", (err) =>
        reject(new Error("FFmpeg zoom fallback failed: " + err.message))
      );
  });
}
