// ============================================================================
// applyVoiceFX.js — v31 (FFmpeg-2018 Safe Voice FX)
// Stable warm storyteller chain with duration safety guard
//
// Goals:
// - Fix rare duration-collapse bug from aggressive sample-rate pitch tricks
// - Keep a warm, slightly dark, pleasant narrator tone
// - Stay FFmpeg-2018 compatible
// - Be safe for both OpenAI TTS fallback and future ElevenLabs voice input
// ============================================================================

import fs from "fs-extra";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

import ffmpegBin from "@ffmpeg-installer/ffmpeg";
import ffprobeBin from "@ffprobe-installer/ffprobe";

import { v4 as uuidv4 } from "uuid";

ffmpeg.setFfmpegPath(ffmpegBin.path);
ffmpeg.setFfprobePath(ffprobeBin.path);

const OUTPUT_DIR = "./generated_videos";
fs.ensureDirSync(OUTPUT_DIR);

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function getAudioInfo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const audioStream = (data?.streams || []).find(
        (s) => s.codec_type === "audio",
      );

      const duration = Number(data?.format?.duration || 0);
      const sampleRate = Number(audioStream?.sample_rate || 0);
      const channels = Number(audioStream?.channels || 0);

      resolve({
        duration: Number.isFinite(duration) ? duration : 0,
        sampleRate: Number.isFinite(sampleRate) ? sampleRate : 0,
        channels: Number.isFinite(channels) ? channels : 0,
      });
    });
  });
}

async function ensureStableWav(inputPath) {
  const out = path.join(OUTPUT_DIR, `${uuidv4()}-voicefx-base.wav`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .audioChannels(2)
      .audioFrequency(48000)
      .audioCodec("pcm_s16le")
      .format("wav")
      .save(out)
      .on("end", () => resolve(out))
      .on("error", (err) =>
        reject(new Error(`Base normalization failed: ${err.message}`)),
      );
  });
}

async function runFilter(input, filter, label) {
  return new Promise((resolve) => {
    const out = path.join(OUTPUT_DIR, `${uuidv4()}-${label}.wav`);

    ffmpeg()
      .input(input)
      .audioFilters(filter)
      .audioChannels(2)
      .audioFrequency(48000)
      .audioCodec("pcm_s16le")
      .format("wav")
      .save(out)
      .on("end", () => resolve(out))
      .on("error", (err) => {
        console.warn(
          `❌ Filter '${label}' failed → keeping previous`,
          err.message,
        );
        resolve(input);
      });
  });
}

async function exportFinalMp3(inputPath) {
  const out = path.join(OUTPUT_DIR, `${uuidv4()}-voicefx-final.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .audioChannels(2)
      .audioFrequency(48000)
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .format("mp3")
      .save(out)
      .on("end", () => resolve(out))
      .on("error", (err) =>
        reject(new Error(`Final MP3 export failed: ${err.message}`)),
      );
  });
}

function durationLooksBroken(inputDuration, outputDuration) {
  if (!inputDuration || !outputDuration) return false;

  // Reject if result collapses to less than 70% of original length
  // or stretches beyond 130% unexpectedly.
  return (
    outputDuration < inputDuration * 0.7 || outputDuration > inputDuration * 1.3
  );
}

// ============================================================================
// applyVoiceFX.js — v31
// Warm, stable narrator polish with NO fragile pitch/sample-rate tricks
// ============================================================================
export async function applyVoiceFX(inputPath) {
  let p = inputPath;

  let inputInfo;
  try {
    inputInfo = await getAudioInfo(inputPath);
    console.log(
      `🎙 VoiceFX input: duration=${inputInfo.duration.toFixed(2)}s | sampleRate=${inputInfo.sampleRate || "?"} | channels=${inputInfo.channels || "?"}`,
    );
  } catch (err) {
    console.warn("⚠️ Could not probe input audio before VoiceFX:", err.message);
    inputInfo = { duration: 0, sampleRate: 0, channels: 0 };
  }

  try {
    // ------------------------------------------------------------------------
    // 0) Normalize to safe working format first
    //    This removes input variability (e.g. 24k mono mp3 from TTS)
    // ------------------------------------------------------------------------
    p = await ensureStableWav(p);

    // ------------------------------------------------------------------------
    // 1) Gentle cadence shaping
    //    Very light only — we do NOT want duration collapse or weird pacing
    // ------------------------------------------------------------------------
    p = await runFilter(p, "atempo=1.02", "tempo1");
    p = await runFilter(p, "atempo=1.03", "tempo2");

    // ------------------------------------------------------------------------
    // 2) Warm low-end body
    // ------------------------------------------------------------------------
    p = await runFilter(p, "equalizer=f=95:t=q:w=1.3:g=3.2", "bassWarm");
    p = await runFilter(p, "equalizer=f=180:t=q:w=1.3:g=2.0", "bassRound");

    // ------------------------------------------------------------------------
    // 3) Mid presence / velvet
    // ------------------------------------------------------------------------
    p = await runFilter(p, "equalizer=f=420:t=q:w=1.0:g=1.6", "midVelvet");

    // ------------------------------------------------------------------------
    // 4) Slight harshness control
    // ------------------------------------------------------------------------
    p = await runFilter(p, "equalizer=f=2500:t=q:w=1.0:g=-1.4", "presenceTame");

    // ------------------------------------------------------------------------
    // 5) Subtle air softening
    // ------------------------------------------------------------------------
    p = await runFilter(p, "treble=g=-1.0", "trebleSoft");

    // ------------------------------------------------------------------------
    // 6) Light compression for even narration
    // ------------------------------------------------------------------------
    p = await runFilter(
      p,
      "acompressor=threshold=-18dB:ratio=1.6:attack=20:release=200:makeup=1.5dB",
      "smoothComp",
    );

    // ------------------------------------------------------------------------
    // 7) Final level
    // ------------------------------------------------------------------------
    p = await runFilter(p, "volume=1.0", "finalVolume");

    // ------------------------------------------------------------------------
    // 8) Export back to MP3 for pipeline compatibility
    // ------------------------------------------------------------------------
    const finalMp3 = await exportFinalMp3(p);

    // ------------------------------------------------------------------------
    // 9) Duration sanity check
    //    If the processed file is suspiciously short/long, fall back to input
    // ------------------------------------------------------------------------
    try {
      const outInfo = await getAudioInfo(finalMp3);
      console.log(
        `🎙 VoiceFX output: duration=${outInfo.duration.toFixed(2)}s | sampleRate=${outInfo.sampleRate || "?"} | channels=${outInfo.channels || "?"}`,
      );

      if (durationLooksBroken(inputInfo.duration, outInfo.duration)) {
        console.warn(
          `⚠️ VoiceFX duration sanity check failed (input=${inputInfo.duration.toFixed(
            2,
          )}s, output=${outInfo.duration.toFixed(2)}s) → using original input`,
        );
        return inputPath;
      }
    } catch (err) {
      console.warn(
        "⚠️ Could not validate VoiceFX output duration → using processed file anyway:",
        err.message,
      );
    }

    return finalMp3;
  } catch (err) {
    console.warn(
      "⚠️ VoiceFX failed entirely → using original input:",
      err.message,
    );
    return inputPath;
  }
}
