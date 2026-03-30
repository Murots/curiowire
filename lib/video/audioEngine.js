// ============================================================================
// audioEngine.js — TTS generation + provider toggle + voice FX + audio utils
// v2.0
//
// Supports:
// - ElevenLabs via Fal (primary option)
// - OpenAI TTS (fallback / legacy option)
//
// Voice selection examples:
// - TTS_VOICE=callum  -> ElevenLabs Callum
// - TTS_VOICE=gptman  -> OpenAI fallback voice chain
//
// Suggested env:
//   TTS_PROVIDER=eleven
//   TTS_VOICE=callum
//   TTS_FALLBACK_PROVIDER=openai
//   OPENAI_TTS_VOICE=onyx
//   ELEVEN_TTS_MODEL=fal-ai/elevenlabs/tts/eleven-v3
//   ELEVEN_TTS_STABILITY=0.5
// ============================================================================

import fs from "fs-extra";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import { fal } from "@fal-ai/client";

import ffmpegBin from "@ffmpeg-installer/ffmpeg";
import ffprobeBin from "@ffprobe-installer/ffprobe";

import { v4 as uuidv4 } from "uuid";
import { OpenAI } from "openai";

import { stripHtml, escapeAss } from "./textUtils.js";
import { applyVoiceFX } from "./audio/voiceFx.js";

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
    "0",
  )}.${String(cs).padStart(2, "0")}`;
}

function normalizeText(text) {
  return (
    stripHtml(text) || "Here is a surprising fact discovered by CurioWire."
  )
    .replace(/\s+/g, " ")
    .trim();
}

function envStr(name, fallback = "") {
  const v = process.env[name];
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

function envNum(name, fallback) {
  const raw = process.env[name];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function truncateForLog(s, max = 120) {
  const str = String(s || "");
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

function normalizeProvider(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  if (s === "eleven") return "eleven";
  if (s === "openai") return "openai";
  return "eleven";
}

function normalizeVoiceAlias(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function mapElevenVoiceName(aliasOrName) {
  const s = normalizeVoiceAlias(aliasOrName);

  // Known aliases / stable choices
  if (s === "callum") return "Callum";

  // If user later sets a proper Eleven voice name directly, allow it through
  return aliasOrName || "Callum";
}

function resolveTtsSelection() {
  const requestedProvider = normalizeProvider(envStr("TTS_PROVIDER", "eleven"));
  const voiceAlias = normalizeVoiceAlias(envStr("TTS_VOICE", "callum"));

  // Voice alias can override provider
  if (voiceAlias === "gptman") {
    return {
      provider: "openai",
      voiceAlias: "gptman",
      openaiVoice: envStr("OPENAI_TTS_VOICE", "onyx"),
      elevenVoice: null,
      label: `openai:${envStr("OPENAI_TTS_VOICE", "onyx")}`,
    };
  }

  if (voiceAlias === "callum") {
    return {
      provider: "eleven",
      voiceAlias: "callum",
      openaiVoice: envStr("OPENAI_TTS_VOICE", "onyx"),
      elevenVoice: "Callum",
      label: "eleven:Callum",
    };
  }

  if (requestedProvider === "openai") {
    return {
      provider: "openai",
      voiceAlias: voiceAlias || "gptman",
      openaiVoice: envStr("OPENAI_TTS_VOICE", "onyx"),
      elevenVoice: null,
      label: `openai:${envStr("OPENAI_TTS_VOICE", "onyx")}`,
    };
  }

  return {
    provider: "eleven",
    voiceAlias: voiceAlias || "callum",
    openaiVoice: envStr("OPENAI_TTS_VOICE", "onyx"),
    elevenVoice: mapElevenVoiceName(envStr("TTS_VOICE", "Callum")),
    label: `eleven:${mapElevenVoiceName(envStr("TTS_VOICE", "Callum"))}`,
  };
}

async function downloadToFile(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download audio (HTTP ${res.status})`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf || buf.length < 1000) {
    throw new Error(
      `Downloaded audio is unexpectedly small (${buf?.length || 0} bytes)`,
    );
  }

  fs.writeFileSync(outPath, buf);
  return outPath;
}

async function generateVoiceoverWithOpenAI(text) {
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-openai.mp3`);

  const cleanText = normalizeText(text);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const voice = envStr("OPENAI_TTS_VOICE", "onyx");

  console.log(
    `🎙 TTS provider=openai | voice=${voice} | text="${truncateForLog(cleanText)}"`,
  );

  const response = await openai.audio.speech.create({
    model: envStr("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
    voice,

    // Kept from your old chain for legacy compatibility / gptman vibe
    voice_settings: {
      speed: 0.84,
      pitch: 0.35,
      timbre: "baritone",
      emotion: "serious",
      intensity: 0.6,
      darkness: 1.4,
      breathiness: 0.05,
    },

    input: cleanText.slice(0, 900),
  });

  fs.writeFileSync(outPath, Buffer.from(await response.arrayBuffer()));
  return outPath;
}

async function generateVoiceoverWithEleven(text) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) throw new Error("Missing FAL_KEY");

  const cleanText = normalizeText(text);
  const id = uuidv4();
  const outPath = path.join(OUTPUT_DIR, `${id}-eleven.mp3`);

  const model = envStr("ELEVEN_TTS_MODEL", "fal-ai/elevenlabs/tts/eleven-v3");
  const stability = envNum("ELEVEN_TTS_STABILITY", 0.5);
  const voice = mapElevenVoiceName(envStr("TTS_VOICE", "Callum"));
  const languageCode = envStr("ELEVEN_LANGUAGE_CODE", "en") || undefined;
  const textNormalization = envStr("ELEVEN_APPLY_TEXT_NORMALIZATION", "auto");

  fal.config({ credentials: FAL_KEY });

  console.log(
    `🎙 TTS provider=eleven | voice=${voice} | model=${model} | stability=${stability} | text="${truncateForLog(
      cleanText,
    )}"`,
  );

  const result = await fal.subscribe(model, {
    input: {
      text: cleanText.slice(0, 3000),
      voice,
      stability,
      language_code: languageCode,
      apply_text_normalization: textNormalization,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && Array.isArray(update.logs)) {
        update.logs
          .map((log) => log?.message)
          .filter(Boolean)
          .forEach((m) => console.log("🧾", m));
      }
    },
  });

  const audioUrl = result?.data?.audio?.url;
  if (!audioUrl) {
    throw new Error(`ElevenLabs response missing audio.url (model=${model})`);
  }

  await downloadToFile(audioUrl, outPath);
  return outPath;
}

// ============================================================================
// 1. TTS GENERATION — provider toggle with fallback
// ============================================================================
export async function generateVoiceover(text) {
  const selection = resolveTtsSelection();
  const fallbackProvider = normalizeProvider(
    envStr("TTS_FALLBACK_PROVIDER", "openai"),
  );

  try {
    if (selection.provider === "eleven") {
      return await generateVoiceoverWithEleven(text);
    }

    return await generateVoiceoverWithOpenAI(text);
  } catch (err) {
    console.warn(`⚠️ Primary TTS failed (${selection.label}) → ${err.message}`);

    if (fallbackProvider === "openai") {
      console.log("↪ Falling back to OpenAI TTS…");
      return await generateVoiceoverWithOpenAI(text);
    }

    if (fallbackProvider === "eleven") {
      console.log("↪ Falling back to ElevenLabs TTS…");
      return await generateVoiceoverWithEleven(text);
    }

    throw err;
  }
}

// ============================================================================
// 1b. applyVoiceFX — delegates to applyVoiceFX.js
// ============================================================================
export { applyVoiceFX };

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
