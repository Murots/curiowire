// ============================================================================
// fullAIPipeline.js — FULL-AI video pipeline (provider-toggle)
// Provider via env:
//   VIDEO_PROVIDER="pika" | "kling"
//   VIDEO_PRESET="scenes" | "text" | "image"  (kling uses "text")
//
// Pipeline:
// model (PikaScenes/PikaText/KlingText) → slowdown → intro/outro → TTS+FX → BGM
// → SFX → subs → final mux
// FFmpeg-2018 compatible
//
// vNext update (fallback):
// - If provider=kling: try Kling first
// - On Kling failure: fallback to Pika Scenes (if image anchor available)
// - On Scenes failure: fallback to Pika Text
// - If no anchor: skip scenes and go directly to Pika Text
// ============================================================================

import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { generateVoiceover, getAudioDuration } from "./audioEngine.js";
import { buildWhisperWordSubtitlesFromAudio } from "./whisperWordSubtitles.js";

import { applyVoiceFX } from "./audio/voiceFx.js";
import { callPikaAPI } from "./pikaClient.js";
import { buildCaptionHook } from "./narrationCaptionHook.js";

import ffmpeg from "fluent-ffmpeg";
import ffmpegBin from "@ffmpeg-installer/ffmpeg";

import {
  slowDownVideoToVertical,
  mergeVideoAndAudio,
  mixVoiceoverWithBGM,
  addIntroAndOutro,
  formatAssTime,
  logVideoInfo,
} from "./ffmpegTools.js";

// Local-only image preprocess to guaranteed 1080x1920 anchor (used for Pika scenes)
import { preprocessImageForPika } from "./imagePreprocess/autoVerticalImagePreprocess.js";

ffmpeg.setFfmpegPath(ffmpegBin.path);

const OUTPUT_DIR = "./generated_videos";
fs.ensureDirSync(OUTPUT_DIR);

// ============================================================================
// Audio timing constants
// ============================================================================
const LIGHTBULB_SFX_PATH = path.resolve("./lib/video/audio/fx/lightbulb.wav");

// 0.0–BULB_DELAY_SECONDS                 : silence
// BULB_DELAY_SECONDS–VOICE_DELAY_SECONDS : lightbulb SFX
// VOICE_DELAY_SECONDS+                   : voice + BGM
const BULB_DELAY_SECONDS = 0.1;
const VOICE_DELAY_SECONDS = 2.35;

// ============================================================================
// ASS helpers
// ============================================================================
function parseAssTimeToSeconds(t) {
  const match = t.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/);
  if (!match) return 0;
  const [, h, m, s, cs] = match.map(Number);
  return h * 3600 + m * 60 + s + cs / 100;
}

function shiftAssSubtitles(assPath, offsetSeconds) {
  if (!offsetSeconds || offsetSeconds === 0) return assPath;

  const raw = fs.readFileSync(assPath, "utf8");
  const lines = raw.split(/\r?\n/);

  const shifted = lines.map((line) => {
    if (!line.startsWith("Dialogue:")) return line;

    const parts = line.split(",");
    if (parts.length < 10) return line;

    const startStr = parts[1].trim();
    const endStr = parts[2].trim();

    const startSec = parseAssTimeToSeconds(startStr) + offsetSeconds;
    const endSec = parseAssTimeToSeconds(endStr) + offsetSeconds;

    parts[1] = formatAssTime(startSec);
    parts[2] = formatAssTime(endSec);

    return parts.join(",");
  });

  fs.writeFileSync(assPath, shifted.join("\n"), "utf8");
  return assPath;
}

// ============================================================================
// buildFinalAudioTrack
// ============================================================================
export async function buildFinalAudioTrack(voiceFileMp3, videoDurationSeconds) {
  const id = uuidv4();

  const voiceWav = path.join(OUTPUT_DIR, `${id}-voice.wav`);
  const outWav = path.join(OUTPUT_DIR, `${id}-final-audio.wav`);

  await new Promise((resolve, reject) => {
    ffmpeg(voiceFileMp3)
      .outputOptions(["-ac 2", "-ar 48000"])
      .save(voiceWav)
      .on("end", resolve)
      .on("error", reject);
  });

  const bulbDelayMs = Math.round(BULB_DELAY_SECONDS * 1000);
  const voiceDelayMs = Math.round(VOICE_DELAY_SECONDS * 1000);

  const filter = [
    {
      filter: "adelay",
      options: `${bulbDelayMs}|${bulbDelayMs}`,
      inputs: "0:a",
      outputs: "bulb",
    },
    {
      filter: "adelay",
      options: `${voiceDelayMs}|${voiceDelayMs}`,
      inputs: "1:a",
      outputs: "voice",
    },
    {
      filter: "amix",
      options: "inputs=2:dropout_transition=0",
      inputs: ["bulb", "voice"],
      outputs: "mix",
    },
    {
      filter: "volume",
      options: "1.5",
      inputs: "mix",
      outputs: "boosted",
    },
    {
      filter: "atrim",
      options: `0:${videoDurationSeconds}`,
      inputs: "boosted",
      outputs: "final",
    },
  ];

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(LIGHTBULB_SFX_PATH)
      .input(voiceWav)
      .complexFilter(filter)
      .outputOptions(["-map [final]", "-ac 2", "-ar 48000"])
      .save(outWav)
      .on("end", () => resolve(outWav))
      .on("error", (err) => reject(new Error(err.message)));
  });
}

// ============================================================================
// Provider helpers
// ============================================================================
function getVideoProviderEnv() {
  const provider = (process.env.VIDEO_PROVIDER || "pika").toLowerCase();
  const presetRaw = (process.env.VIDEO_PRESET || "").toLowerCase();
  return { provider, presetRaw };
}

function resolvePreset(provider, presetRaw, article) {
  if (provider === "kling") return "text";

  // Pika:
  // If preset explicitly set, use it.
  if (presetRaw) return presetRaw;

  // Default for Pika: scenes if we have an image, else text
  if (article?.image_url) return "scenes";
  return "text";
}

// ============================================================================
// Prompt helpers
// ============================================================================
function cleanScenePrompt(scenePrompt) {
  const s = String(scenePrompt || "").trim();
  if (!s) return "";

  let out = s.replace(/\s+/g, " ").trim();

  const mustHave = ["no text", "no subtitles", "no logos", "no watermark"];
  const lower = out.toLowerCase();
  const missing = mustHave.filter((m) => !lower.includes(m));
  if (missing.length) out = `${out}, ${missing.join(", ")}`;

  return out;
}

// ============================================================================
// Main
// ============================================================================
export async function generateFullAIVideo(
  article,
  summaryText,
  narrationScript,
) {
  const { provider, presetRaw } = getVideoProviderEnv();
  const preset = resolvePreset(provider, presetRaw, article);

  console.log(
    `🤖 Generating FULL-AI video via ${provider.toUpperCase()} (Fal)… (preset=${preset})`,
  );

  const hook = await buildCaptionHook(article);

  // NOTE:
  // duration/aspect/negative are HARD-LOCKED inside pikaClient.js per your requirement.
  // We do NOT pass them here.

  // ========================================================================
  // BASE PROMPT (shared)
  // ========================================================================
  const scenePrompt = cleanScenePrompt(article.scene_prompt);

  const fallbackScene = `
Cinematic vertical scene that visually represents:
"${summaryText}"
vertical 9:16, no text, no subtitles, no logos, no watermark.
`.trim();

  const sceneSeed = scenePrompt || fallbackScene;

  const prompt = `
${sceneSeed}

== VIDEO GOALS ==
• Continuous motion in every part of the frame — no still areas.
• High physical coherence: consistent lighting, shadows, reflections, depth.
• Lush atmosphere: volumetric light, soft particulate motion, environmental depth.
• Natural motion: subtle turbulence, drifting elements, fluid ambience.

== MANDATORY MOTION ELEMENTS ==
Include at least 3 of the following simultaneously:
• drifting fog / atmospheric haze
• floating dust or particulate shimmer
• soft camera parallax or extremely gentle dolly movement
• fluid or wave-like motion in background layers
• environmental glows, energy shimmer, bioluminescent flicker
• micro-movement in textures (NOT melting)

The motion must be continuous from frame 1 to frame last.

== CAMERA BEHAVIOR ==
• Extremely gentle macro-motion only.
• No fast cuts, no shaking, no zooming.
• Avoid jitter, stutter, flicker, morphing or melting.

== NEGATIVE REQUIREMENTS (strict) ==
NO:
text, subtitles, UI, letters, logos, watermarks, symbols
NO frame freezing
NO melting objects or collapsing geometry
NO heavy distortions

== OUTPUT REQUIREMENTS ==
• 9:16 vertical
• Highly detailed
• Smooth 30fps motion

== ARTICLE CONTEXT ==
Category: ${article.category}
Title: ${article.title}
Core idea: ${summaryText}

Emotional tone:
"${hook}"
`.trim();

  // ========================================================================
  // 1) Voiceover → FX
  // ========================================================================
  console.log("🎙 Generating base voiceover…");
  const dryVoice = await generateVoiceover(narrationScript);

  console.log("🌑 Applying dark voice FX…");
  const voiceFX = await applyVoiceFX(dryVoice);

  const voiceDuration = await getAudioDuration(voiceFX).catch(() => null);
  if (voiceDuration) {
    console.log(`⏱ Voice duration after FX: ${voiceDuration.toFixed(2)}s`);
  } else {
    console.log("⏱ Voice duration after FX: (unknown, fallback mode)");
  }

  // ========================================================================
  // 2) Buffer → full pipeline
  // ========================================================================
  async function pipelineWithBuffer(videoBuffer, label = "MODEL") {
    const tmpId = uuidv4();
    const rawPath = path.join(OUTPUT_DIR, `${tmpId}-model-raw.mp4`);

    fs.writeFileSync(rawPath, videoBuffer);
    console.log("🎞 Saved raw model video:", rawPath);

    await logVideoInfo(`${label} RAW`, rawPath);

    // Slowdown + vertical shaping (your existing behavior)
    const slowPath = await slowDownVideoToVertical(rawPath, 0.5);
    console.log("🐌 Slowed + vertical video:", slowPath);
    await logVideoInfo(`${label} SLOW+VERTICAL`, slowPath);

    // Intro/outro (video-only)
    const introPath = "./lib/video/intro/intro.mp4";
    console.log("🎬 Adding intro + outro around main video…");
    const videoWithIntroOutro = await addIntroAndOutro(introPath, slowPath);
    console.log(
      "🎬 Intro+main+outro video (no audio yet):",
      videoWithIntroOutro,
    );
    await logVideoInfo(`${label} INTRO+OUTRO`, videoWithIntroOutro);

    // Get final duration to fit audio/BGM
    const videoDuration = await getAudioDuration(videoWithIntroOutro);
    console.log(`⏱ Final video duration (intro+main+outro): ${videoDuration}s`);

    // Mix VOICE + BGM to full video duration
    console.log("🎵 Mixing voice with BGM to full video duration…");
    const voiceFileWithBGM = await mixVoiceoverWithBGM(voiceFX, videoDuration);
    console.log("🎧 Voice+BGM file:", voiceFileWithBGM);

    // Subs on dry voice, then shift
    let subsPath = await buildWhisperWordSubtitlesFromAudio(voiceFX);
    console.log("💬 Subtitles file (pre-shift, Whisper):", subsPath);

    subsPath = shiftAssSubtitles(subsPath, VOICE_DELAY_SECONDS);
    console.log("💬 Subtitles file (shifted):", subsPath);

    // Final audio track (silence → bulb → voice+BGM)
    const finalAudio = await buildFinalAudioTrack(
      voiceFileWithBGM,
      videoDuration,
    );
    console.log("🎧 Final audio track (with SFX + delays):", finalAudio);

    // Final mux
    const finalPath = await mergeVideoAndAudio(
      videoWithIntroOutro,
      finalAudio,
      subsPath,
    );

    console.log(
      "✅ FULL-AI final video with intro/outro + SFX + delayed audio + subs:",
      finalPath,
    );

    await logVideoInfo(`${label} FINAL`, finalPath);
    return finalPath;
  }

  // ========================================================================
  // Helper: attempt Pika Scenes (if anchor possible), else throw
  // ========================================================================
  async function tryPikaScenesOrThrow() {
    let anchorPath = null;

    try {
      if (article.image_url) {
        anchorPath = await preprocessImageForPika(article.image_url);
      }
    } catch (e) {
      console.warn("⚠️ Anchor preprocess failed:", e.message);
      anchorPath = null;
    }

    if (!anchorPath) {
      throw new Error("No anchor image available for Pika scenes.");
    }

    console.log("🚀 Calling PIKA scenes (anchor + prompt, env-driven)…");

    const buffer = await callPikaAPI({
      provider: "pika",
      preset: "scenes",
      prompt,
      imageUrls: [anchorPath],
      // duration/aspect/negative locked in pikaClient.js
    });

    return await pipelineWithBuffer(buffer, "PIKA SCENES");
  }

  // ========================================================================
  // Helper: Pika text fallback
  // ========================================================================
  async function runPikaText() {
    console.log("🚀 Calling PIKA text-to-video (env-driven)…");

    const buffer = await callPikaAPI({
      provider: "pika",
      preset: "text",
      prompt,
      // duration/aspect/negative locked in pikaClient.js
    });

    return await pipelineWithBuffer(buffer, "PIKA TEXT");
  }

  // ========================================================================
  // 3) Provider routing + FALLBACKS
  // ========================================================================

  // A) Kling primary
  if (provider === "kling") {
    console.log("🚀 Calling KLING text-to-video (env-driven)…");

    try {
      const buffer = await callPikaAPI({
        provider: "kling",
        preset: "text",
        prompt,
      });

      return await pipelineWithBuffer(buffer, "KLING TEXT");
    } catch (errKling) {
      console.error(
        "⚠️ KLING failed, falling back to PIKA…:",
        errKling.message,
      );

      // Fallback 1: Pika scenes if possible
      try {
        return await tryPikaScenesOrThrow();
      } catch (errScenes) {
        console.error("⚠️ PIKA scenes fallback failed:", errScenes.message);
      }

      // Fallback 2: Pika text
      return await runPikaText();
    }
  }

  // B) Pika normal behavior (your original logic)
  if (preset === "scenes") {
    try {
      return await tryPikaScenesOrThrow();
    } catch (e) {
      console.error("⚠️ Pika scenes failed, falling back to text:", e.message);
      return await runPikaText();
    }
  }

  // C) Pika text fallback/default
  return await runPikaText();
}
