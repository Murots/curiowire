// // lib/video/ffmpegTools.js — CurioWire Video Utilities (FFmpeg-2018 Compatible)
// // Slowdown, vertical formatting, intro/outro concat, safe BGM mixing,
// // subtitle burning, and final merging.
// //
// // vNext update:
// // - Adds robust video-inspection helpers (ffprobe JSON + concise logger)
// // - Improves intro normalization reliability (force 1080x1920@30, setsar=1)
// // - Makes concat inputs more consistent to avoid concat mismatch failures
// // - ✅ Smooth slowdown: tries minterpolate first, auto-fallback if unsupported
// // - ✅ CFR hardening: -r 30 + -vsync cfr
// // - ✅ NEW: main→outro transition: freeze last frame for 3s + fade to black across freeze
// // ============================================================================

// import fs from "fs-extra";
// import path from "path";
// import ffmpeg from "fluent-ffmpeg";
// import { exec, execFile } from "child_process";

// import ffmpegBin from "@ffmpeg-installer/ffmpeg";
// import ffprobeBin from "@ffprobe-installer/ffprobe";

// import { v4 as uuidv4 } from "uuid";

// // Use explicit binaries (FFmpeg-2018)
// ffmpeg.setFfmpegPath(ffmpegBin.path);
// ffmpeg.setFfprobePath(ffprobeBin.path);

// // Output dir
// export const OUTPUT_DIR = "./generated_videos";
// fs.ensureDirSync(OUTPUT_DIR);

// // ============================================================================
// // Utility — format time as ASS timestamps (H:MM:SS.cc)
// // ============================================================================
// export function formatAssTime(seconds) {
//   const total = Math.max(0, seconds);
//   const h = Math.floor(total / 3600);
//   const m = Math.floor((total % 3600) / 60);
//   const s = Math.floor(total % 60);
//   const cs = Math.floor((total - Math.floor(total)) * 100);
//   return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(
//     2,
//     "0",
//   )}.${String(cs).padStart(2, "0")}`;
// }

// // ============================================================================
// // Get audio/video duration
// // ============================================================================
// export function getAudioDuration(filePath) {
//   return new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(filePath, (err, data) => {
//       if (err) return reject(err);
//       const dur = data?.format?.duration;
//       if (!dur || !Number.isFinite(dur)) {
//         return reject(new Error("Could not determine audio duration"));
//       }
//       resolve(dur);
//     });
//   });
// }

// // ============================================================================
// // ffprobe helpers (log what model actually returns)
// // ============================================================================
// export function ffprobeJson(filePath) {
//   return new Promise((resolve, reject) => {
//     execFile(
//       ffprobeBin.path,
//       [
//         "-v",
//         "error",
//         "-print_format",
//         "json",
//         "-show_streams",
//         "-show_format",
//         filePath,
//       ],
//       (err, stdout) => {
//         if (err) return reject(err);
//         try {
//           resolve(JSON.parse(stdout));
//         } catch (e) {
//           reject(e);
//         }
//       },
//     );
//   });
// }

// function safeRatio(num, den) {
//   const n = Number(num);
//   const d = Number(den);
//   if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
//   return n / d;
// }

// /**
//  * logVideoInfo — prints a concise line:
//  *  width x height | pxAR | DAR | SAR | fps
//  */
// export async function logVideoInfo(label, filePath) {
//   try {
//     const info = await ffprobeJson(filePath);
//     const v = (info?.streams || []).find((s) => s.codec_type === "video");
//     if (!v) {
//       console.log(`📐 ${label}: (no video stream) ${filePath}`);
//       return null;
//     }

//     const w = v.width;
//     const h = v.height;

//     const dar = v.display_aspect_ratio || null; // e.g. "16:9"
//     const sar = v.sample_aspect_ratio || null; // e.g. "1:1"
//     const r = v.r_frame_rate || null; // e.g. "30/1"

//     const fps = (() => {
//       if (!r || !r.includes("/")) return null;
//       const [a, b] = r.split("/");
//       return safeRatio(a, b);
//     })();

//     const px = w && h ? (w / h).toFixed(4) : null;

//     console.log(
//       `📐 ${label}: ${w}x${h} | pxAR=${px} | DAR=${dar} | SAR=${sar} | fps=${
//         fps ? fps.toFixed(2) : "?"
//       }`,
//     );

//     return { width: w, height: h, dar, sar, fps };
//   } catch (e) {
//     console.log(`📐 ${label}: ffprobe failed: ${e.message}`);
//     return null;
//   }
// }

// // ============================================================================
// // Internal: normalize any segment to concat-safe vertical
// // (1080x1920, 30fps, SAR=1, h264/yuv420p, no audio)
// // ============================================================================
// async function normalizeForConcat(inputPath, label = "SEG") {
//   const id = uuidv4();
//   const outPath = path.join(OUTPUT_DIR, `${id}-${label}-normalized.mp4`);

//   return new Promise((resolve, reject) => {
//     ffmpeg()
//       .input(inputPath)
//       .videoFilters(["scale=1080:1920", "fps=30", "setsar=1"])
//       .noAudio()
//       .outputOptions([
//         "-c:v libx264",
//         "-preset veryfast",
//         "-crf 20",
//         "-pix_fmt yuv420p",
//         "-r 30",
//         "-vsync cfr",
//       ])
//       .save(outPath)
//       .on("end", () => resolve(outPath))
//       .on("error", (err) =>
//         reject(new Error(`Normalize for concat failed: ${err.message}`)),
//       );
//   });
// }

// // ============================================================================
// // 1. Slowdown + 9:16 vertical formatting (FFmpeg 2018 safe) + SMOOTH
// // - Tries minterpolate first (creates in-between frames)
// // - Auto fallback if minterpolate unsupported by your FFmpeg build
// // - Outputs TRUE CFR 30fps, SAR=1, 1080x1920
// // ============================================================================
// export async function slowDownVideoToVertical(inputPath, speedFactor = 0.5) {
//   const id = uuidv4();
//   const verticalPath = path.join(OUTPUT_DIR, `${id}-slow-vertical.mp4`);

//   const slowPts = 1 / speedFactor;

//   const baseChain = [
//     `setpts=${slowPts}*PTS`,
//     // lock stable CFR 30
//     "fps=30",
//     // Scale/pad to vertical
//     "scale=1080:-2:force_original_aspect_ratio=decrease",
//     "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
//     "setsar=1",
//   ];

//   const smoothChain = [
//     `setpts=${slowPts}*PTS`,
//     // Interpolate to create in-between frames (smoother slow motion)
//     // We interpolate to 60fps then lock final to CFR 30
//     "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1",
//     "fps=30",
//     "scale=1080:-2:force_original_aspect_ratio=decrease",
//     "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
//     "setsar=1",
//   ];

//   function runWithFilterChain(chain, label) {
//     const vf = chain.join(",");
//     return new Promise((resolve, reject) => {
//       ffmpeg()
//         .input(inputPath)
//         .videoFilters(vf)
//         .noAudio()
//         .outputOptions([
//           "-c:v libx264",
//           // slightly higher quality helps after interpolation and for subtitles
//           "-preset medium",
//           "-crf 18",
//           "-pix_fmt yuv420p",
//           // CFR hardening
//           "-r 30",
//           "-vsync cfr",
//         ])
//         .save(verticalPath)
//         .on("end", () => resolve({ ok: true, label }))
//         .on("error", (err) => reject(err));
//     });
//   }

//   // Try smooth first; fallback if unsupported
//   try {
//     await runWithFilterChain(smoothChain, "minterpolate");
//     return verticalPath;
//   } catch (err) {
//     const msg = String(err?.message || err);
//     // Common symptom: "No such filter: 'minterpolate'" or similar
//     console.warn(
//       "⚠️ Smooth slowdown (minterpolate) failed; falling back to basic CFR30 slowdown:",
//       msg,
//     );

//     await runWithFilterChain(baseChain, "basic");
//     return verticalPath;
//   }
// }

// // ============================================================================
// // 2. Merge: video + audio + ASS subtitles
// // ============================================================================
// export async function mergeVideoAndAudio(videoPath, audioPath, subsPath) {
//   const id = uuidv4();
//   const outPath = path.join(OUTPUT_DIR, `${id}.mp4`);

//   const duration = await getAudioDuration(videoPath);
//   const safeAss = subsPath ? subsPath.replace(/\\/g, "/") : null;

//   return new Promise((resolve, reject) => {
//     let cmd = ffmpeg().input(videoPath).input(audioPath);

//     if (safeAss) {
//       cmd = cmd.videoFilter(`subtitles='${safeAss.replace(/'/g, "\\'")}'`);
//     }

//     cmd
//       .outputOptions([
//         "-map 0:v",
//         "-map 1:a",
//         "-c:v libx264",
//         "-preset medium",
//         "-crf 18",
//         "-pix_fmt yuv420p",
//         "-c:a aac",
//         "-b:a 192k",
//         "-r 30",
//         "-vsync cfr",
//         `-t ${duration}`,
//       ])
//       .save(outPath)
//       .on("end", () => resolve(outPath))
//       .on("error", (err) =>
//         reject(new Error("FFmpeg merge failed: " + err.message)),
//       );
//   });
// }

// // ============================================================================
// // 3. Mix voice + BGM — FFmpeg 2018 SAFE VERSION
// // ============================================================================
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

//   const VOICE_GAIN = 2.45;
//   const BGM_GAIN = 0.5;
//   const MASTER_GAIN = 1.5;

//   const filtergraph = `
//     [0:a]volume=${VOICE_GAIN}[voice];
//     [1:a]aloop=loop=-1:size=0,volume=${BGM_GAIN}[bgm];
//     [voice][bgm]amix=inputs=2:dropout_transition=0[mix];
//     [mix]volume=${MASTER_GAIN}[final]
//   `;

//   return new Promise((resolve) => {
//     ffmpeg()
//       .input(voicePath)
//       .input(bgmPath)
//       .complexFilter(filtergraph)
//       .outputOptions([
//         "-map [final]",
//         `-t ${durationSeconds}`,
//         "-ac 2",
//         "-ar 48000",
//       ])
//       .save(outPath)
//       .on("end", () => resolve(outPath))
//       .on("error", (err) => {
//         console.warn("⚠️ BGM mix failed, fallback to dry voice:", err.message);
//         resolve(voicePath);
//       });
//   });
// }

// // ============================================================================
// // 4. Freeze last frame for 3s + fade to black across freeze (video-only)
// // - Exactly matches requested behavior for main→outro transition.
// // - Keeps everything else unchanged.
// // ============================================================================
// export async function fadeOutVideo(mainVideoPath, fadeSeconds = 1) {
//   const id = uuidv4();
//   const outPath = path.join(OUTPUT_DIR, `${id}-main-freeze-fade.mp4`);

//   // Requested behavior:
//   // - Freeze the LAST frame for 3 seconds
//   // - Fade to black across those same 3 seconds (ending in full black)
//   //
//   // We keep the existing signature but interpret fadeSeconds as the freeze/fade window.
//   // Default remains 1 for backwards-compat, but addIntroAndOutro calls it with 3 below.
//   const freezeSeconds = fadeSeconds;

//   const dur = await getAudioDuration(mainVideoPath).catch(() => null);
//   const total = dur && Number.isFinite(dur) ? dur : 0;

//   // Fade should start at the end of the ORIGINAL video, then run during the appended freeze
//   const fadeStart = Math.max(0, total);

//   return new Promise((resolve, reject) => {
//     ffmpeg()
//       .input(mainVideoPath)
//       .videoFilters([
//         "fps=30",
//         // Extend by cloning the final frame for freezeSeconds
//         `tpad=stop_mode=clone:stop_duration=${freezeSeconds}`,
//         // Fade out across the freeze window (ending in full black)
//         `fade=t=out:st=${fadeStart}:d=${freezeSeconds}`,
//         "setsar=1",
//       ])
//       .outputOptions([
//         "-c:v libx264",
//         "-preset veryfast",
//         "-crf 20",
//         "-pix_fmt yuv420p",
//         "-r 30",
//         "-vsync cfr",
//         "-an",
//       ])
//       .save(outPath)
//       .on("end", () => resolve(outPath))
//       .on("error", (err) =>
//         reject(new Error("Freeze+fade failed: " + err.message)),
//       );
//   });
// }

// // ============================================================================
// // 5. Robust Intro Normalizer — fail-soft (never blocks pipeline)
// // ============================================================================
// export async function normalizeIntroVideo(inputPath) {
//   const id = uuidv4();
//   const outPath = path.join(OUTPUT_DIR, `${id}-intro-normalized.mp4`);

//   return new Promise((resolve) => {
//     ffmpeg.ffprobe(inputPath, (err, metadata) => {
//       if (err) {
//         console.warn(
//           "⚠️ Intro ffprobe failed, using original intro:",
//           err.message,
//         );
//         return resolve(inputPath);
//       }

//       const stream = metadata.streams.find((s) => s.width && s.height);
//       if (!stream) {
//         console.warn("⚠️ Intro has no video stream, using original intro.");
//         return resolve(inputPath);
//       }

//       const w = stream.width;
//       const h = stream.height;

//       console.log(`📏 Intro resolution: ${w}x${h}`);

//       if (w === 1080 && h === 1920) {
//         console.log("✅ Intro already 1080x1920, skipping normalization.");
//         return resolve(inputPath);
//       }

//       ffmpeg()
//         .input(inputPath)
//         .videoFilters(["scale=1080:1920", "fps=30", "setsar=1"])
//         .outputOptions([
//           "-c:v libx264",
//           "-preset veryfast",
//           "-crf 20",
//           "-pix_fmt yuv420p",
//           "-r 30",
//           "-vsync cfr",
//           "-an",
//         ])
//         .save(outPath)
//         .on("end", () => {
//           console.log("✅ Intro normalized to 1080x1920:", outPath);
//           resolve(outPath);
//         })
//         .on("error", (err2) => {
//           console.log(
//             "ℹ️ Intro normalization could not be applied, using original intro:",
//             err2.message,
//           );
//           resolve(inputPath);
//         });
//     });
//   });
// }

// export async function generateCurioWireOutro() {
//   const id = uuidv4();
//   const outPath = path.join(OUTPUT_DIR, `${id}-outro.mp4`);

//   const boldFontPath = path.resolve(
//     "./lib/video/fonts/PlayfairDisplay-ExtraBold.ttf",
//   );
//   const fallbackFontPath = path.resolve(
//     "./lib/video/fonts/PlayfairDisplay-Bold.ttf",
//   );

//   const fontToUse = fs.existsSync(boldFontPath)
//     ? boldFontPath
//     : fallbackFontPath;

//   const logoPath = path.resolve("./public/logoVideo.png");

//   async function renderOutro() {
//     return new Promise((resolve, reject) => {
//       ffmpeg()
//         .input("color=black:s=1080x1920:r=30:d=3")
//         .inputFormat("lavfi")
//         .input(logoPath)
//         .complexFilter([
//           {
//             filter: "drawtext",
//             options: {
//               fontfile: fontToUse,
//               text: "Visit",
//               fontcolor: "white",
//               fontsize: 70,
//               borderw: 6,
//               bordercolor: "black",
//               x: "(w-text_w)/2",
//               y: "(h/2)-300",
//             },
//             inputs: "0:v",
//             outputs: "visit_text",
//           },
//           {
//             filter: "scale",
//             options: { w: 420, h: -1 },
//             inputs: "1:v",
//             outputs: "logo_scaled",
//           },
//           {
//             filter: "overlay",
//             options: {
//               x: "(W-w)/2",
//               y: "(H-h)/2-20",
//             },
//             inputs: ["visit_text", "logo_scaled"],
//             outputs: "with_logo",
//           },
//           {
//             filter: "drawtext",
//             options: {
//               fontfile: fontToUse,
//               text: "for more",
//               fontcolor: "white",
//               fontsize: 70,
//               borderw: 4,
//               bordercolor: "black",
//               x: "(w-text_w)/2",
//               y: "(h/2)+240",
//             },
//             inputs: "with_logo",
//             outputs: "final",
//           },
//         ])
//         .outputOptions([
//           "-map [final]",
//           "-t 3",
//           "-c:v libx264",
//           "-preset veryfast",
//           "-crf 20",
//           "-pix_fmt yuv420p",
//           "-r 30",
//           "-vsync cfr",
//           "-an",
//         ])
//         .save(outPath)
//         .on("end", () => resolve(outPath))
//         .on("error", reject);
//     });
//   }

//   try {
//     return await renderOutro();
//   } catch (err) {
//     throw new Error("Outro generation failed: " + err.message);
//   }
// }

// // ============================================================================
// // 7. Intro + main (freeze+fade) + outro — concat video-only
// // ============================================================================
// export async function addIntroAndOutro(introPath, mainVideoPath) {
//   const id = uuidv4();
//   const concatList = path.join(OUTPUT_DIR, `${id}-concat.txt`);
//   const outPath = path.join(OUTPUT_DIR, `${id}-with-intro-outro.mp4`);

//   const normalizedIntro = await normalizeIntroVideo(introPath);

//   // Freeze last frame for 3s + fade to black across those 3s, then normalize
//   const fadedMain = await fadeOutVideo(mainVideoPath, 3.5);
//   const outro = await generateCurioWireOutro();

//   // Normalize all segments to be concat-safe (prevents mismatch)
//   const introN = await normalizeForConcat(normalizedIntro, "intro");
//   const mainN = await normalizeForConcat(fadedMain, "main");
//   const outroN = await normalizeForConcat(outro, "outro");

//   const listContent = `file '${path.resolve(introN)}'
// file '${path.resolve(mainN)}'
// file '${path.resolve(outroN)}'
// `;

//   fs.writeFileSync(concatList, listContent);

//   return new Promise((resolve, reject) => {
//     const cmd = `"${ffmpegBin.path}" \
//       -f concat -safe 0 -i "${concatList}" \
//       -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
//       -r 30 -vsync cfr \
//       -an "${outPath}"`;

//     exec(cmd, (err) => {
//       if (err) return reject(err);
//       resolve(outPath);
//     });
//   });
// }

// export async function addIntroToVideo(introPath, mainVideoPath) {
//   return addIntroAndOutro(introPath, mainVideoPath);
// }

// lib/video/ffmpegTools.js — CurioWire Video Utilities (FFmpeg-2018 Compatible)
// Slowdown, vertical formatting, intro/outro concat, safe BGM mixing,
// subtitle burning, and final merging.
//
// vNext update:
// - Adds robust video-inspection helpers (ffprobe JSON + concise logger)
// - Improves intro normalization reliability (force 1080x1920@30, setsar=1)
// - Makes concat inputs more consistent to avoid concat mismatch failures
// - ✅ Smooth slowdown: tries minterpolate first, auto-fallback if unsupported
// - ✅ CFR hardening: -r 30 + -vsync cfr
// - ✅ NEW: main→outro transition: freeze last frame for 3s + fade to black across freeze
// - ✅ NEW: create 1-frame thumbnail video for Shorts preview/manual selection
// - ✅ NEW: concat flow supports thumbnail → intro → main → outro
// ============================================================================

import fs from "fs-extra";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { exec, execFile } from "child_process";

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
    "0",
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
// ffprobe helpers (log what model actually returns)
// ============================================================================
export function ffprobeJson(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobeBin.path,
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        filePath,
      ],
      (err, stdout) => {
        if (err) return reject(err);
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

function safeRatio(num, den) {
  const n = Number(num);
  const d = Number(den);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return n / d;
}

/**
 * logVideoInfo — prints a concise line:
 *  width x height | pxAR | DAR | SAR | fps
 */
export async function logVideoInfo(label, filePath) {
  try {
    const info = await ffprobeJson(filePath);
    const v = (info?.streams || []).find((s) => s.codec_type === "video");
    if (!v) {
      console.log(`📐 ${label}: (no video stream) ${filePath}`);
      return null;
    }

    const w = v.width;
    const h = v.height;

    const dar = v.display_aspect_ratio || null; // e.g. "16:9"
    const sar = v.sample_aspect_ratio || null; // e.g. "1:1"
    const r = v.r_frame_rate || null; // e.g. "30/1"

    const fps = (() => {
      if (!r || !r.includes("/")) return null;
      const [a, b] = r.split("/");
      return safeRatio(a, b);
    })();

    const px = w && h ? (w / h).toFixed(4) : null;

    console.log(
      `📐 ${label}: ${w}x${h} | pxAR=${px} | DAR=${dar} | SAR=${sar} | fps=${
        fps ? fps.toFixed(2) : "?"
      }`,
    );

    return { width: w, height: h, dar, sar, fps };
  } catch (e) {
    console.log(`📐 ${label}: ffprobe failed: ${e.message}`);
    return null;
  }
}

// ============================================================================
// Internal: normalize any segment to concat-safe vertical
// (1080x1920, 30fps, SAR=1, h264/yuv420p, no audio)
// ============================================================================
async function normalizeForConcat(inputPath, label = "SEG") {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-${label}-normalized.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .videoFilters(["scale=1080:1920", "fps=30", "setsar=1"])
      .noAudio()
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-pix_fmt yuv420p",
        "-r 30",
        "-vsync cfr",
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) =>
        reject(new Error(`Normalize for concat failed: ${err.message}`)),
      );
  });
}

// ============================================================================
// NEW: Create a 1-frame thumbnail video (video-only, concat-safe source)
// - Input: image path
// - Output: 1080x1920, 30fps, 1 frame, yuv420p, no audio
// ============================================================================
export async function createThumbnailVideo(
  imagePath,
  durationSeconds = 1 / 30,
) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-thumbnail.mp4`);

  if (!imagePath) {
    throw new Error("createThumbnailVideo: Missing imagePath");
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error(`createThumbnailVideo: File does not exist: ${imagePath}`);
  }

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .loop(durationSeconds)
      .videoFilters(["scale=1080:1920", "fps=30", "setsar=1"])
      .noAudio()
      .outputOptions([
        `-t ${durationSeconds}`,
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-pix_fmt yuv420p",
        "-r 30",
        "-vsync cfr",
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) =>
        reject(new Error(`Thumbnail video creation failed: ${err.message}`)),
      );
  });
}

// ============================================================================
// 1. Slowdown + 9:16 vertical formatting (FFmpeg 2018 safe) + SMOOTH
// - Tries minterpolate first (creates in-between frames)
// - Auto fallback if minterpolate unsupported by your FFmpeg build
// - Outputs TRUE CFR 30fps, SAR=1, 1080x1920
// ============================================================================
export async function slowDownVideoToVertical(inputPath, speedFactor = 0.5) {
  const id = uuidv4();
  const verticalPath = path.join(OUTPUT_DIR, `${id}-slow-vertical.mp4`);

  const slowPts = 1 / speedFactor;

  const baseChain = [
    `setpts=${slowPts}*PTS`,
    "fps=30",
    "scale=1080:-2:force_original_aspect_ratio=decrease",
    "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
    "setsar=1",
  ];

  const smoothChain = [
    `setpts=${slowPts}*PTS`,
    "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1",
    "fps=30",
    "scale=1080:-2:force_original_aspect_ratio=decrease",
    "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
    "setsar=1",
  ];

  function runWithFilterChain(chain, label) {
    const vf = chain.join(",");
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        .videoFilters(vf)
        .noAudio()
        .outputOptions([
          "-c:v libx264",
          "-preset medium",
          "-crf 18",
          "-pix_fmt yuv420p",
          "-r 30",
          "-vsync cfr",
        ])
        .save(verticalPath)
        .on("end", () => resolve({ ok: true, label }))
        .on("error", (err) => reject(err));
    });
  }

  try {
    await runWithFilterChain(smoothChain, "minterpolate");
    return verticalPath;
  } catch (err) {
    const msg = String(err?.message || err);
    console.warn(
      "⚠️ Smooth slowdown (minterpolate) failed; falling back to basic CFR30 slowdown:",
      msg,
    );

    await runWithFilterChain(baseChain, "basic");
    return verticalPath;
  }
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
        "-preset medium",
        "-crf 18",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 192k",
        "-r 30",
        "-vsync cfr",
        `-t ${duration}`,
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) =>
        reject(new Error("FFmpeg merge failed: " + err.message)),
      );
  });
}

// ============================================================================
// 3. Mix voice + BGM — FFmpeg 2018 SAFE VERSION
// ============================================================================
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

  const VOICE_GAIN = 2.45;
  const BGM_GAIN = 0.5;
  const MASTER_GAIN = 1.5;

  const filtergraph = `
    [0:a]volume=${VOICE_GAIN}[voice];
    [1:a]aloop=loop=-1:size=0,volume=${BGM_GAIN}[bgm];
    [voice][bgm]amix=inputs=2:dropout_transition=0[mix];
    [mix]volume=${MASTER_GAIN}[final]
  `;

  return new Promise((resolve) => {
    ffmpeg()
      .input(voicePath)
      .input(bgmPath)
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
// 4. Freeze last frame for 3s + fade to black across freeze (video-only)
// - Exactly matches requested behavior for main→outro transition.
// - Keeps everything else unchanged.
// ============================================================================
export async function fadeOutVideo(mainVideoPath, fadeSeconds = 1) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-main-freeze-fade.mp4`);

  const freezeSeconds = fadeSeconds;

  const dur = await getAudioDuration(mainVideoPath).catch(() => null);
  const total = dur && Number.isFinite(dur) ? dur : 0;

  const fadeStart = Math.max(0, total);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(mainVideoPath)
      .videoFilters([
        "fps=30",
        `tpad=stop_mode=clone:stop_duration=${freezeSeconds}`,
        `fade=t=out:st=${fadeStart}:d=${freezeSeconds}`,
        "setsar=1",
      ])
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-crf 20",
        "-pix_fmt yuv420p",
        "-r 30",
        "-vsync cfr",
        "-an",
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) =>
        reject(new Error("Freeze+fade failed: " + err.message)),
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
          err.message,
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

      if (w === 1080 && h === 1920) {
        console.log("✅ Intro already 1080x1920, skipping normalization.");
        return resolve(inputPath);
      }

      ffmpeg()
        .input(inputPath)
        .videoFilters(["scale=1080:1920", "fps=30", "setsar=1"])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 20",
          "-pix_fmt yuv420p",
          "-r 30",
          "-vsync cfr",
          "-an",
        ])
        .save(outPath)
        .on("end", () => {
          console.log("✅ Intro normalized to 1080x1920:", outPath);
          resolve(outPath);
        })
        .on("error", (err2) => {
          console.log(
            "ℹ️ Intro normalization could not be applied, using original intro:",
            err2.message,
          );
          resolve(inputPath);
        });
    });
  });
}

// ============================================================================
// 6. Outro
// ============================================================================
export async function generateCurioWireOutro() {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-outro.mp4`);

  const boldFontPath = path.resolve(
    "./lib/video/fonts/PlayfairDisplay-ExtraBold.ttf",
  );
  const fallbackFontPath = path.resolve(
    "./lib/video/fonts/PlayfairDisplay-Bold.ttf",
  );

  const fontToUse = fs.existsSync(boldFontPath)
    ? boldFontPath
    : fallbackFontPath;

  const logoPath = path.resolve("./public/logoVideo.png");

  async function renderOutro() {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input("color=black:s=1080x1920:r=30:d=3")
        .inputFormat("lavfi")
        .input(logoPath)
        .complexFilter([
          {
            filter: "drawtext",
            options: {
              fontfile: fontToUse,
              text: "Visit",
              fontcolor: "white",
              fontsize: 70,
              borderw: 6,
              bordercolor: "black",
              x: "(w-text_w)/2",
              y: "(h/2)-300",
            },
            inputs: "0:v",
            outputs: "visit_text",
          },
          {
            filter: "scale",
            options: { w: 420, h: -1 },
            inputs: "1:v",
            outputs: "logo_scaled",
          },
          {
            filter: "overlay",
            options: {
              x: "(W-w)/2",
              y: "(H-h)/2-20",
            },
            inputs: ["visit_text", "logo_scaled"],
            outputs: "with_logo",
          },
          {
            filter: "drawtext",
            options: {
              fontfile: fontToUse,
              text: "for more",
              fontcolor: "white",
              fontsize: 70,
              borderw: 4,
              bordercolor: "black",
              x: "(w-text_w)/2",
              y: "(h/2)+240",
            },
            inputs: "with_logo",
            outputs: "final",
          },
        ])
        .outputOptions([
          "-map [final]",
          "-t 3",
          "-c:v libx264",
          "-preset veryfast",
          "-crf 20",
          "-pix_fmt yuv420p",
          "-r 30",
          "-vsync cfr",
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
// 7. Thumbnail + intro + main (freeze+fade) + outro — concat video-only
// ============================================================================
export async function addIntroAndOutro(
  introPath,
  mainVideoPath,
  thumbnailImagePath = null,
) {
  const id = uuidv4();
  const concatList = path.join(OUTPUT_DIR, `${id}-concat.txt`);
  const outPath = path.join(OUTPUT_DIR, `${id}-with-intro-outro.mp4`);

  const normalizedIntro = await normalizeIntroVideo(introPath);

  const fadedMain = await fadeOutVideo(mainVideoPath, 3.5);
  const outro = await generateCurioWireOutro();

  let thumbnailN = null;

  if (thumbnailImagePath) {
    const thumbnailVideo = await createThumbnailVideo(
      thumbnailImagePath,
      1 / 30,
    );
    thumbnailN = await normalizeForConcat(thumbnailVideo, "thumbnail");
  }

  const introN = await normalizeForConcat(normalizedIntro, "intro");
  const mainN = await normalizeForConcat(fadedMain, "main");
  const outroN = await normalizeForConcat(outro, "outro");

  const listEntries = [];

  if (thumbnailN) {
    listEntries.push(`file '${path.resolve(thumbnailN)}'`);
  }

  listEntries.push(`file '${path.resolve(introN)}'`);
  listEntries.push(`file '${path.resolve(mainN)}'`);
  listEntries.push(`file '${path.resolve(outroN)}'`);

  fs.writeFileSync(concatList, `${listEntries.join("\n")}\n`);

  return new Promise((resolve, reject) => {
    const cmd = `"${ffmpegBin.path}" \
      -f concat -safe 0 -i "${concatList}" \
      -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
      -r 30 -vsync cfr \
      -an "${outPath}"`;

    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve(outPath);
    });
  });
}

export async function addIntroToVideo(
  introPath,
  mainVideoPath,
  thumbnailImagePath = null,
) {
  return addIntroAndOutro(introPath, mainVideoPath, thumbnailImagePath);
}
