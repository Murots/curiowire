// ============================================================================
// fullAIPipeline.js — FULL-AI Pika video pipeline
// Pika → slowdown → intro/outro → TTS+FX → BGM → lightbulb SFX → subs
// FFmpeg-2018 compatible
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

import { preprocessImageForPika } from "./imagePreprocess/autoVerticalImagePreprocess.js";

import {
  slowDownVideoToVertical,
  mergeVideoAndAudio,
  mixVoiceoverWithBGM,
  addIntroAndOutro,
  formatAssTime,
} from "./ffmpegTools.js";

// Sett ffmpeg-bin (samme som i ffmpegTools)
ffmpeg.setFfmpegPath(ffmpegBin.path);

const OUTPUT_DIR = "./generated_videos";
fs.ensureDirSync(OUTPUT_DIR);

// ============================================================================
// Audio-timing-konstanter
// ============================================================================

// Lyspære-lyd ligger her:
const LIGHTBULB_SFX_PATH = path.resolve("./lib/video/audio/fx/lightbulb.wav");

// Sekvens (konseptuelt):
// 0.0–BULB_DELAY_SECONDS              : helt stille
// BULB_DELAY_SECONDS–VOICE_DELAY_SECONDS : lyspære-SFX
// VOICE_DELAY_SECONDS+               : voice + BGM (til video-slutt)
const BULB_DELAY_SECONDS = 0.1; // når lyspæren starter
const VOICE_DELAY_SECONDS = 2.35; // når subs + voice/BGM starter

// ============================================================================
// ASS-tidshjelpere for å forskyve captions
// ============================================================================

function parseAssTimeToSeconds(t) {
  // Format: H:MM:SS.cc (eks 0:00:01.23)
  const match = t.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/);
  if (!match) return 0;
  const [, h, m, s, cs] = match.map(Number);
  return h * 3600 + m * 60 + s + cs / 100;
}

/**
 * Skift alle Dialogue-tider i en ASS-fil med gitt offset (sekunder).
 * Dette lar oss fortsatt generere subs mot ren voice-fil,
 * men vise dem VOICE_DELAY_SECONDS senere (sammen med forsinket lyd).
 */
function shiftAssSubtitles(assPath, offsetSeconds) {
  if (!offsetSeconds || offsetSeconds === 0) return assPath;

  const raw = fs.readFileSync(assPath, "utf8");
  const lines = raw.split(/\r?\n/);

  const shifted = lines.map((line) => {
    if (!line.startsWith("Dialogue:")) return line;

    // ASS format: Dialogue: Layer, Start, End, Style, Name, Margins, Effect, Text
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

/**
 * buildFinalAudioTrack – V4
 *
 * Sekvens:
 * 0.0–BULB_DELAY_SECONDS                 : stillhet
 * BULB_DELAY_SECONDS–VOICE_DELAY_SECONDS : lyspære
 * VOICE_DELAY_SECONDS+                   : voice+BGM
 *
 * Alt trimmes/paddes til eksakt videoDurationSeconds.
 * FFmpeg-2018-safe: bare adelay + amix + atrim, ingen named outputs i CLI.
 */
export async function buildFinalAudioTrack(voiceFileMp3, videoDurationSeconds) {
  const id = uuidv4();

  const voiceWav = path.join(OUTPUT_DIR, `${id}-voice.wav`);
  const outWav = path.join(OUTPUT_DIR, `${id}-final-audio.wav`);

  // Konverter voice+BGM (allerede mixet) til WAV (FFmpeg-2018 safe)
  await new Promise((resolve, reject) => {
    ffmpeg(voiceFileMp3)
      .outputOptions(["-ac 2", "-ar 48000"])
      .save(voiceWav)
      .on("end", resolve)
      .on("error", reject);
  });

  // Bruk faktiske konstanter i stedet for hardkodede ms-verdier
  const bulbDelayMs = Math.round(BULB_DELAY_SECONDS * 1000);
  const voiceDelayMs = Math.round(VOICE_DELAY_SECONDS * 1000);

  const filter = [
    // Lyspære: delay BULB_DELAY_SECONDS
    {
      filter: "adelay",
      options: `${bulbDelayMs}|${bulbDelayMs}`,
      inputs: "0:a",
      outputs: "bulb",
    },
    // Voice+BGM: delay VOICE_DELAY_SECONDS
    {
      filter: "adelay",
      options: `${voiceDelayMs}|${voiceDelayMs}`,
      inputs: "1:a",
      outputs: "voice",
    },
    // Mix (bulb + voice+BGM)
    {
      filter: "amix",
      options: "inputs=2:dropout_transition=0",
      inputs: ["bulb", "voice"],
      outputs: "mix",
    },
    // Trim til eksakt videolengde
    // {
    //   filter: "atrim",
    //   options: `0:${videoDurationSeconds}`,
    //   inputs: "mix",
    //   outputs: "final",
    // },
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
      .input(LIGHTBULB_SFX_PATH) // [0:a] = lyspære
      .input(voiceWav) // [1:a] = voice+BGM (miks for hele video-lengden)
      .complexFilter(filter)
      .outputOptions(["-map [final]", "-ac 2", "-ar 48000"])
      .save(outWav)
      .on("end", () => resolve(outWav))
      .on("error", (err) => reject(new Error(err.message)));
  });
}

// ============================================================================
// FULL-AI VIDEO via Pika → slowdown → intro → outro → audio → subs
// ============================================================================
export async function generateFullAIVideo(
  article,
  summaryText,
  narrationScript
) {
  console.log("🤖 Generating FULL-AI video via Pika (Fal)…");

  // Bruk nye, artikkel-spesifikke hook-systemet for "emotional tone"
  const hook = await buildCaptionHook(article);
  const durationSeconds = 10; // Pika base duration

  // ========================================================================
  // PROMPT
  // ========================================================================
  //   const prompt = `
  // Create a fully AI-generated cinematic vertical video inspired by the provided article image.

  // Goal:
  // Generate a visually rich scene with continuous motion — NOT a static or near-static shot.
  // The video must contain ongoing dynamic elements that remain active throughout the entire clip.

  // Core rules:
  // - Do NOT simply zoom, crop, pan, or animate the original image.
  // - Rebuild and extend the full environment using generative video synthesis.
  // - Preserve the original image’s style, palette, lighting, textures, and atmosphere.

  // Motion Requirements:
  // - The scene must contain continuous visible motion:
  //   drifting particles, fog, dust, steam, nebula shimmer, cosmic plasma currents, atmospheric waves.
  // - No frame should ever appear frozen.

  // Camera:
  // - Gentle, stable macro-motion only.
  // - No fast movements.

  // Category motion hints:
  // Space → cosmic drift, starfields flowing.
  // Science → reflections, holographic pulses.
  // Nature → wind, dust motes, cloud motion.

  // Prohibitions:
  // - No text, UI, captions, watermarks.
  // - No flicker or melting.

  // Video format:
  // - 9:16 vertical, cinematic, high detail.

  // Article context:
  // Category: ${article.category}
  // Title: ${article.title}
  // Core idea: ${summaryText}

  // Emotional tone:
  // "${hook}"
  // `.trim();
  const prompt = `
Cinematic AI-generated vertical video inspired by the provided article image.

This MUST be a fully generated moving scene — not a zoom, crop, pan or animation of the input image. 
Reconstruct the entire environment using generative synthesis.

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
• No fast cuts, no shaking, no zooming from the image.
• Avoid jitter, stutter, flicker, morphing or melting.

== NEGATIVE REQUIREMENTS (strict) ==
NO:
text, subtitles, UI, letters, logos, watermarks, symbols  
NO frame freezing  
NO melting objects or collapsing geometry  
NO heavy distortions  

== STYLE REQUIREMENTS ==
Rebuild the world in the style of the input image:
color palette, lighting, texture complexity, mood, atmosphere.  
Do NOT copy the exact layout — generate a cinematic expanded environment.

== CATEGORY-SPECIFIC MOTION GUIDANCE ==
Space → nebula drift, starfield flow, cosmic plasma movement  
Science → holographic pulses, refractive shimmer, faint energy oscillations  
Nature → currents, dust motes, foliage motion, underwater drift  

== OUTPUT REQUIREMENTS ==
• 9:16 vertical aesthetic  
• Highly detailed  
• Smooth 30fps motion  

== ARTICLE CONTEXT ==
Category: ${article.category}  
Title: ${article.title}  
Core idea: ${summaryText}

Emotional tone:
"${hook}"
`.trim();

  const imageUrl = await preprocessImageForPika(article.image_url);
  const primaryModel = process.env.PIKA_IMAGE_MODEL;
  const fallbackModel = process.env.PIKA_IMAGE_MODEL_FALLBACK;

  if (!primaryModel) console.warn("⚠️ Missing PIKA_IMAGE_MODEL");
  if (!fallbackModel) console.warn("⚠️ Missing PIKA_IMAGE_MODEL_FALLBACK");

  // ========================================================================
  // 1) Generate TTS → Apply FX (men IKKE BGM ennå)
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

  // BGM mikses først etter at vi vet endelig videolengde

  // ========================================================================
  // 2) Pipeline etter at Pika har generert videobuffer
  // ========================================================================
  async function pipelineWithBuffer(pikaBuffer) {
    const tmpId = uuidv4();
    const rawPath = path.join(OUTPUT_DIR, `${tmpId}-pika-raw.mp4`);

    fs.writeFileSync(rawPath, pikaBuffer);
    console.log("🎞 Saved raw Pika video:", rawPath);

    // 2.1 — slow down + 9:16 vertical (≈20s, med "smart" verticalizer i ffmpegTools)
    const slowPath = await slowDownVideoToVertical(rawPath, 0.5);
    console.log("🐌 Slowed + vertical video:", slowPath);

    // 2.2 — intro + main + outro (VIDEO ONLY)
    const introPath = "./lib/video/intro/intro.mp4"; // din lyspære-intro
    console.log("🎬 Adding intro + outro around main video…");
    const videoWithIntroOutro = await addIntroAndOutro(introPath, slowPath);
    console.log(
      "🎬 Intro+main+outro video (no audio yet):",
      videoWithIntroOutro
    );

    // 2.3 — finn faktisk videovarighet (for å time lyd og BGM-lengde)
    const videoDuration = await getAudioDuration(videoWithIntroOutro);
    console.log(`⏱ Final video duration (intro+main+outro): ${videoDuration}s`);

    // 2.4 — miks VOICE + BGM til en fil som varer like lenge som videoen
    console.log("🎵 Mixing voice with BGM to full video duration…");
    const voiceFileWithBGM = await mixVoiceoverWithBGM(voiceFX, videoDuration);
    console.log("🎧 Voice+BGM file:", voiceFileWithBGM);

    let subsPath = await buildWhisperWordSubtitlesFromAudio(voiceFX);
    console.log("💬 Subtitles file (pre-shift, Whisper):", subsPath);

    subsPath = shiftAssSubtitles(subsPath, VOICE_DELAY_SECONDS);
    console.log("💬 Subtitles file (shifted):", subsPath);

    // 2.6 — bygg endelig lydspor:
    // 0.0–BULB_DELAY_SECONDS              : stillhet
    // BULB_DELAY_SECONDS–VOICE_DELAY_SECONDS : lyspære
    // VOICE_DELAY_SECONDS+               : voice + BGM (BGM varer helt til video-slutt)
    const finalAudio = await buildFinalAudioTrack(
      voiceFileWithBGM,
      videoDuration
    );
    console.log("🎧 Final audio track (with SFX + delays):", finalAudio);

    // 2.7 — final merge: video (med intro+outro) + endelig lyd + hard-subs
    const finalPath = await mergeVideoAndAudio(
      videoWithIntroOutro,
      finalAudio,
      subsPath
    );

    console.log(
      "✅ FULL-AI final video with intro/outro + SFX + delayed audio + subs:",
      finalPath
    );

    return finalPath;
  }

  // ========================================================================
  // 3) PIKA primary → fallback
  // ========================================================================
  try {
    console.log(
      `🚀 Calling Pika primary model: ${primaryModel} (image-to-video)…`
    );

    const bufferPrimary = await callPikaAPI({
      prompt,
      imageUrl,
      duration: durationSeconds,
      model: primaryModel,
    });

    const merged = await pipelineWithBuffer(bufferPrimary);
    console.log("✅ Pika primary succeeded:", merged);
    return merged;
  } catch (errPrimary) {
    console.error("⚠️ Pika primary failed:", errPrimary.message);

    try {
      console.log(
        `🚀 Calling Pika fallback model: ${fallbackModel} (image-to-video)…`
      );

      const bufferFallback = await callPikaAPI({
        prompt,
        imageUrl,
        duration: durationSeconds,
        model: fallbackModel,
      });

      const merged = await pipelineWithBuffer(bufferFallback);
      console.log("✅ Pika fallback succeeded:", merged);
      return merged;
    } catch (errFallback) {
      console.error("❌ Pika fallback failed:", errFallback.message);
      throw new Error(
        `Pika primary and fallback both failed: ${errPrimary.message} | ${errFallback.message}`
      );
    }
  }
}
