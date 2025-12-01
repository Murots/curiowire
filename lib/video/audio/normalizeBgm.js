import fs from "fs-extra";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { v4 as uuidv4 } from "uuid";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const BGM_DIR = "./lib/video/audio/bgm";
const CACHE_DIR = "./generated_videos/bgm_normalized";
fs.ensureDirSync(CACHE_DIR);

// Target loudness in LUFS (TikTok standard: -14 to -16)
const TARGET_LUFS = -15;

export async function normalizeBgm(bgmPath) {
  const name = path.basename(bgmPath, ".mp3");
  const outPath = path.join(CACHE_DIR, `${name}-norm.mp3`);

  if (fs.existsSync(outPath)) {
    return outPath; // cached
  }

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(bgmPath)
      .audioFilters([`loudnorm=I=${TARGET_LUFS}:TP=-1.0:LRA=11`])
      .output(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) => reject(err))
      .run();
  });
}
