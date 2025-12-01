// ============================================================================
// audioEngine.js — TTS generation + EXT voice FX + subtitles (ASS karaoke)
// ============================================================================

import fs from "fs-extra";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

import ffmpegBin from "@ffmpeg-installer/ffmpeg";
import ffprobeBin from "@ffprobe-installer/ffprobe";

import { v4 as uuidv4 } from "uuid";
import { OpenAI } from "openai";

import { stripHtml, escapeAss } from "./textUtils.js";

// 🔥 CRITICAL: Force ffmpeg + ffprobe to correct binaries
ffmpeg.setFfmpegPath(ffmpegBin.path);
ffmpeg.setFfprobePath(ffprobeBin.path);

const OUTPUT_DIR = "./generated_videos";
fs.ensureDirSync(OUTPUT_DIR);

// ============================================================================
// Helpers
// ============================================================================
function formatAssTime(seconds) {
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
// 1. TTS GENERATION — woice (darkest & warmest base voice)
//    ⚠ Important: We do NOT do pitch-lowering here — FFmpeg does it later.
// ============================================================================

export async function generateVoiceover(text) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}.mp3`);

  const cleanText =
    stripHtml(text) || "Here is a surprising fact discovered by CurioWire.";

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "onyx", //alt. = fable, onyx, echo

    voice_settings: {
      speed: 0.84,
      pitch: 0.35,
      timbre: "baritone",
      emotion: "serious",
      intensity: 0.6, // softer, storyteller
      darkness: 1.4,
      breathiness: 0.05, // tiny bit of breath = human warmth
    },

    // voice_settings: {
    //   speed: 0.92, // litt tregere, dypere
    //   pitch: -0.55, // EKSTREMT viktig
    //   timbre: "baritone",
    //   emotion: "serious",
    //   intensity: 0.7,
    //   darkness: 1.5, // mer mørk resonans
    //   breathiness: 0.0, // fjern hiss helt
    // },

    input: cleanText.slice(0, 900),
  });

  fs.writeFileSync(outPath, Buffer.from(await response.arrayBuffer()));
  return outPath;
}

// ============================================================================
// 1b. applyVoiceFX — delegates to applyVoiceFX.js (EXTREME DARK processing)
// ============================================================================

import { applyVoiceFX } from "./audio/voiceFx.js";

// ============================================================================
// 2. AUDIO DURATION (required for subtitles timing)
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

// // ============================================================================
// // 3. WORD-BY-WORD SUBTITLES — TikTok-style glow
// // ============================================================================

// export async function buildWordByWordSubtitles(narrationText, audioPath) {
//   const id = uuidv4();
//   const subsPath = path.join(OUTPUT_DIR, `${id}.ass`);

//   const duration = await getAudioDuration(audioPath);

//   const words = narrationText
//     .replace(/[\r\n]+/g, " ")
//     .split(/\s+/)
//     .filter(Boolean);

//   if (!words.length || duration <= 0) {
//     fs.writeFileSync(
//       subsPath,
//       `[Script Info]
// ScriptType: v4.00+
// PlayResX: 1080
// PlayResY: 1920

// [V4+ Styles]
// Style: Word,Inter,72,&H00FFFFFF,&H00000000,&H50000000,&H96000000,-1,0,0,0,100,100,0,0,1,4,2,5,20,20,120,1

// [Events]
// `
//     );
//     return subsPath;
//   }

//   const totalWords = words.length;
//   const secondsPerWord = duration / totalWords;

//   const header = `[Script Info]
// ScriptType: v4.00+
// PlayResX: 1080
// PlayResY: 1920

// [V4+ Styles]
// Style: Word,Inter,72,&H00FFFFFF,&H00000000,&H64000000,&H96000000,-1,0,0,0,100,100,0,0,1,4,2,5,20,20,120,1

// [Events]
// `;

//   const lines = [header];

//   for (let i = 0; i < totalWords; i++) {
//     const start = i * secondsPerWord;
//     const end = (i + 1) * secondsPerWord;

//     const from = formatAssTime(start);
//     const to = formatAssTime(end);
//     const word = escapeAss(words[i]);

//     const dialogue = `Dialogue: 0,${from},${to},Word,,0,0,0,,{\\an5\\fad(60,60)\\blur4\\bord5\\shad2\\fs72}${word}`;
//     lines.push(dialogue);
//   }

//   fs.writeFileSync(subsPath, lines.join("\n"));
//   return subsPath;
// }
