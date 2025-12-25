// ============================================================================
// ffmpegTools.js — CurioWire Video Utilities (FFmpeg-2018 Compatible Edition)
// Slowdown, vertical formatting, intro/outro concat, safe BGM mixing,
// subtitle burning, and final merging.
// ============================================================================

import fs from "fs-extra";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { exec } from "child_process";

import ffmpegBin from "@ffmpeg-installer/ffmpeg";
import ffprobeBin from "@ffprobe-installer/ffprobe";

import { v4 as uuidv4 } from "uuid";

// Use explicit binaries (FFmpeg-2018)
ffmpeg.setFfmpegPath(ffmpegBin.path);
ffmpeg.setFfprobePath(ffprobeBin.path);

// Output dir
export const OUTPUT_DIR = "./generated_videos";
fs.ensureDirSync(OUTPUT_DIR);

// ============================================================================
// Utility — format time as ASS timestamps (H:MM:SS.cc)
// ============================================================================
export function formatAssTime(seconds) {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total - Math.floor(total)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(
    2,
    "0"
  )}.${String(cs).padStart(2, "0")}`;
}

// ============================================================================
// Get audio/video duration
// ============================================================================
export function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const dur = data?.format?.duration;
      if (!dur || !Number.isFinite(dur)) {
        return reject(new Error("Could not determine audio duration"));
      }
      resolve(dur);
    });
  });
}

// ============================================================================
// 1. Slowdown + 9:16 vertical formatting (FFmpeg 2018 safe)
// ============================================================================
export async function slowDownVideoToVertical(inputPath, speedFactor = 0.5) {
  const id = uuidv4();
  const slowPath = path.join(OUTPUT_DIR, `${id}-slow.mp4`);
  const verticalPath = path.join(OUTPUT_DIR, `${id}-slow-vertical.mp4`);

  const slowPts = 1 / speedFactor;

  // STEP 1 — slowdown only
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .videoFilters([`setpts=${slowPts}*PTS`])
      .noAudio()
      .outputOptions(["-c:v libx264", "-preset veryfast", "-crf 20"])
      .save(slowPath)
      .on("end", resolve)
      .on("error", (err) =>
        reject(new Error("FFmpeg slowdown failed: " + err.message))
      );
  });

  // STEP 2 — scale + pad to exact 1080x1920
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(slowPath)
      .videoFilters([
        "fps=30",
        "scale=1080:-2:force_original_aspect_ratio=decrease",
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
      ])
      .noAudio()
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-pix_fmt yuv420p",
      ])
      .save(verticalPath)
      .on("end", () => resolve(verticalPath))
      .on("error", (err) =>
        reject(new Error("Vertical-format failed: " + err.message))
      );
  });
}

// ============================================================================
// 2. Merge: video + audio + ASS subtitles
// ============================================================================
export async function mergeVideoAndAudio(videoPath, audioPath, subsPath) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}.mp4`);

  const duration = await getAudioDuration(videoPath);
  const safeAss = subsPath ? subsPath.replace(/\\/g, "/") : null;

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg().input(videoPath).input(audioPath);

    if (safeAss) {
      cmd = cmd.videoFilter(`subtitles='${safeAss.replace(/'/g, "\\'")}'`);
    }

    cmd
      .outputOptions([
        "-map 0:v",
        "-map 1:a",
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 192k",
        `-t ${duration}`,
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) =>
        reject(new Error("FFmpeg merge failed: " + err.message))
      );
  });
}

// ============================================================================
// 3. Mix voice + BGM — FFmpeg 2018 SAFE VERSION
//    - Loop BGM til riktig lengde
//    - Senk BGM-volum
//    - Behold stemme i front
// ============================================================================
// export async function mixVoiceoverWithBGM(voicePath, durationSeconds) {
//   const id = uuidv4();
//   const outPath = path.join(OUTPUT_DIR, `${id}-mixed-voice.mp3`);

//   const bgmDir = "./lib/video/audio/bgm/";

//   const files = fs
//     .readdirSync(bgmDir)
//     .filter((f) => f.toLowerCase().endsWith(".mp3"));

//   if (!files.length) {
//     console.warn("⚠️ No BGM files found — using dry voice.");
//     return voicePath;
//   }

//   const chosen = files[Math.floor(Math.random() * files.length)];
//   const bgmPath = path.join(bgmDir, chosen);

//   console.log(`🎵 Using BGM track: ${chosen}`);

//   // 🗣️ Stemme og bakgrunnsbalanse
//   const bgmVolume = 0.4; // lower BGM
//   const voiceWeight = 3;
//   const bgmWeight = 1.7;

//   const filtergraph =
//     `[1:a]aloop=loop=-1:size=0,volume=${bgmVolume}[bgm];` +
//     `[0:a][bgm]amix=inputs=2:weights=${voiceWeight} ${bgmWeight}:dropout_transition=0[mix]`;

//   return new Promise((resolve) => {
//     ffmpeg()
//       .input(voicePath) // 0:a = voice
//       .input(bgmPath) // 1:a = bgm
//       .complexFilter(filtergraph)
//       .outputOptions(["-map [mix]", `-t ${durationSeconds}`, "-ac 2"])
//       .save(outPath)
//       .on("end", () => resolve(outPath))
//       .on("error", (err) => {
//         console.warn("⚠️ BGM mix failed, fallback to dry voice:", err.message);
//         resolve(voicePath);
//       });
//   });
// }
export async function mixVoiceoverWithBGM(voicePath, durationSeconds) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-mixed-voice.mp3`);

  const bgmDir = "./lib/video/audio/bgm/";

  const files = fs
    .readdirSync(bgmDir)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  if (!files.length) {
    console.warn("⚠️ No BGM files found — using dry voice.");
    return voicePath;
  }

  const chosen = files[Math.floor(Math.random() * files.length)];
  const bgmPath = path.join(bgmDir, chosen);

  console.log(`🎵 Using BGM track: ${chosen}`);

  // ===============================
  // 🎚️ AUDIO TUNING (SAFE + LOUD)
  // ===============================
  const VOICE_GAIN = 2; // main voice boost
  const BGM_GAIN = 0.5; // background only
  const MASTER_GAIN = 1.5; // final loudness lift

  const filtergraph = `
    [0:a]volume=${VOICE_GAIN}[voice];
    [1:a]aloop=loop=-1:size=0,volume=${BGM_GAIN}[bgm];
    [voice][bgm]amix=inputs=2:dropout_transition=0[mix];
    [mix]volume=${MASTER_GAIN}[final]
  `;

  return new Promise((resolve) => {
    ffmpeg()
      .input(voicePath) // 0:a = voice
      .input(bgmPath) // 1:a = bgm
      .complexFilter(filtergraph)
      .outputOptions([
        "-map [final]",
        `-t ${durationSeconds}`,
        "-ac 2",
        "-ar 48000",
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) => {
        console.warn("⚠️ BGM mix failed, fallback to dry voice:", err.message);
        resolve(voicePath);
      });
  });
}

// ============================================================================
// 4. Fade-out video (video-only)
// ============================================================================
export async function fadeOutVideo(mainVideoPath, fadeSeconds = 1) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-main-fadeout.mp4`);

  const dur = await getAudioDuration(mainVideoPath).catch(() => null);
  const total = dur && Number.isFinite(dur) ? dur : 0;
  const start = Math.max(0, total - fadeSeconds);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(mainVideoPath)
      .videoFilters([`fade=t=out:st=${start}:d=${fadeSeconds}`])
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-pix_fmt yuv420p",
        "-an",
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) =>
        reject(new Error("Fade-out failed: " + err.message))
      );
  });
}

// ============================================================================
// 5. Robust Intro Normalizer — fail-soft (never blocks pipeline)
// ============================================================================
export async function normalizeIntroVideo(inputPath) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-intro-normalized.mp4`);

  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        console.warn(
          "⚠️ Intro ffprobe failed, using original intro:",
          err.message
        );
        return resolve(inputPath);
      }

      const stream = metadata.streams.find((s) => s.width && s.height);
      if (!stream) {
        console.warn("⚠️ Intro has no video stream, using original intro.");
        return resolve(inputPath);
      }

      const w = stream.width;
      const h = stream.height;

      console.log(`📏 Intro resolution: ${w}x${h}`);

      // Already correct → skip
      if (w === 1080 && h === 1920) {
        console.log("✅ Intro already 1080x1920, skipping normalization.");
        return resolve(inputPath);
      }

      // Try to normalize; on error, log + fall back to original
      ffmpeg()
        .input(inputPath)
        .videoFilters([
          "fps=30",
          "scale=1080:-2:force_original_aspect_ratio=decrease",
          "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
        ])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 20",
          "-pix_fmt yuv420p",
          "-an",
        ])
        .save(outPath)
        .on("end", () => {
          console.log("✅ Intro normalized to 1080x1920:", outPath);
          resolve(outPath);
        })
        .on("error", (err) => {
          console.log(
            "ℹ️ Intro normalization could not be applied, using original intro:",
            err.message
          );
          resolve(inputPath);
        });
    });
  });
}

// ============================================================================
// 6. Outro generation (video-only)
// ============================================================================
export async function generateCurioWireOutro() {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-outro.mp4`);

  // === PRIMARY: Bold font file ===
  const boldFontPath = path.resolve(
    "./lib/video/fonts/PlayfairDisplay-ExtraBold.ttf"
  );

  // === FALLBACK: Variable font (weight axis ignored by ffmpeg 2018) ===
  const variableFontPath = path.resolve(
    "./lib/video/fonts/PlayfairDisplay-Bold.ttf"
  );

  // Velg font basert på fil som faktisk finnes
  const fontToUse = fs.existsSync(boldFontPath)
    ? boldFontPath
    : variableFontPath;

  async function renderOutro() {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input("color=black:s=1080x1920:r=30")
        .inputFormat("lavfi")
        .duration(3)
        .videoFilters([
          {
            filter: "drawtext",
            options: {
              fontfile: fontToUse,
              text: "CurioWire.com",

              // Stil — visuelt bold
              fontcolor: "white",
              fontsize: 110,
              borderw: 8,
              bordercolor: "black",
              shadowcolor: "black",
              shadowx: 0,
              shadowy: 0,

              // Midt på skjermen
              x: "(w-text_w)/2",
              y: "(h-text_h)/2",

              line_spacing: 0,
            },
          },
        ])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 20",
          "-pix_fmt yuv420p",
          "-an",
        ])
        .save(outPath)
        .on("end", () => resolve(outPath))
        .on("error", reject);
    });
  }

  try {
    return await renderOutro();
  } catch (err) {
    throw new Error("Outro generation failed: " + err.message);
  }
}

// ============================================================================
// 7. Intro + main (fade-out) + outro — concat video-only
// ============================================================================
export async function addIntroAndOutro(introPath, mainVideoPath) {
  const id = uuidv4();
  const concatList = path.join(OUTPUT_DIR, `${id}-concat.txt`);
  const outPath = path.join(OUTPUT_DIR, `${id}-with-intro-outro.mp4`);

  const normalizedIntro = await normalizeIntroVideo(introPath);
  const fadedMain = await fadeOutVideo(mainVideoPath);
  const outro = await generateCurioWireOutro();

  const listContent = `file '${path.resolve(normalizedIntro)}'
file '${path.resolve(fadedMain)}'
file '${path.resolve(outro)}'
`;

  fs.writeFileSync(concatList, listContent);

  return new Promise((resolve, reject) => {
    const cmd = `"${ffmpegBin.path}" \
      -f concat -safe 0 -i "${concatList}" \
      -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
      -an "${outPath}"`;

    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve(outPath);
    });
  });
}

export async function addIntroToVideo(introPath, mainVideoPath) {
  return addIntroAndOutro(introPath, mainVideoPath);
}
