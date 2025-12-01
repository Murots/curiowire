// ============================================================================
// applyVoiceFX.js — v16 (FFmpeg-2018 Guaranteed Dark Voice)
// The ONLY stable deep-voice chain for 2018 builds
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

async function runFilter(input, filter, label) {
  return new Promise((resolve) => {
    const out = path.join(OUTPUT_DIR, `${uuidv4()}-${label}.mp3`);

    ffmpeg()
      .input(input)
      .audioFilters(filter)
      .outputOptions(["-ac 2"])
      .save(out)
      .on("end", () => resolve(out))
      .on("error", (err) => {
        console.warn(
          `❌ Filter '${label}' failed → keeping previous`,
          err.message
        );
        resolve(input);
      });
  });
}

// // ============================================================================
// // applyVoiceFX.js — v25 (Dark, Clean, No-Noise Cinematic Voice)
// // ============================================================================

// export async function applyVoiceFX(inputPath) {
//   let p = inputPath;

//   // --------------------------------------------------------------------------
//   // 1) Deep pitch — clean method
//   // --------------------------------------------------------------------------
//   p = await runFilter(p, "asetrate=44100*0.46", "pitchdrop");
//   p = await runFilter(p, "aresample=44100", "resample");

//   // --------------------------------------------------------------------------
//   // 2) Slight tempo correction (keeps clarity)
//   // --------------------------------------------------------------------------
//   p = await runFilter(p, "atempo=1.08", "tempo1");
//   p = await runFilter(p, "atempo=1.08", "tempo2");

//   // --------------------------------------------------------------------------
//   // 3) Bass warmth — CLEAN (no rasp)
//   // --------------------------------------------------------------------------
//   p = await runFilter(p, "equalizer=f=110:t=q:w=1.0:g=4", "bass1");
//   p = await runFilter(p, "equalizer=f=180:t=q:w=1.0:g=2", "bass2");

//   // --------------------------------------------------------------------------
//   // 4) Remove harshness but keep clarity
//   // --------------------------------------------------------------------------
//   p = await runFilter(p, "lowpass=f=6500", "lowpass"); // higher cutoff = less fizz
//   p = await runFilter(p, "treble=g=-2", "treblecut"); // gentle

//   // --------------------------------------------------------------------------
//   // 5) Clean compressor (zero distortion, smooth tone)
//   // --------------------------------------------------------------------------
//   p = await runFilter(
//     p,
//     "acompressor=threshold=-16dB:ratio=2:attack=20:release=200:makeup=2dB",
//     "compressor"
//   );

//   // --------------------------------------------------------------------------
//   // 6) FINAL VOLUME TRIM — lower voice so BGM is audible again
//   // --------------------------------------------------------------------------
//   p = await runFilter(p, "volume=0.82", "finalVolume");

//   return p;
// }

// ============================================================================
// applyVoiceFX.js — v30 (Morgan Freeman Inspired — Deep, Warm, Velvety)
// ============================================================================

export async function applyVoiceFX(inputPath) {
  let p = inputPath;

  // --------------------------------------------------------------
  // 1) Deep tone: pitch shift via safe asetrate method
  //    0.55 = dark but smooth (Morgan Freeman territory)
  // --------------------------------------------------------------
  p = await runFilter(p, "asetrate=44100*0.50", "pitchdrop");
  p = await runFilter(p, "aresample=44100", "resample");

  // --------------------------------------------------------------
  // 2) Tempo shaping — slows slightly to storyteller cadence
  // --------------------------------------------------------------
  p = await runFilter(p, "atempo=1.04", "tempo1");
  p = await runFilter(p, "atempo=1.08", "tempo2");

  // --------------------------------------------------------------
  // 3) Warm velvet bass (clean, no distortion)
  //    Morgan Freeman has a warm, not booming bass
  // --------------------------------------------------------------
  p = await runFilter(p, "equalizer=f=95:t=q:w=1.3:g=4", "bassWarm");
  p = await runFilter(p, "equalizer=f=180:t=q:w=1.3:g=3", "bassRound");

  // --------------------------------------------------------------
  // 4) Clear mid warmth — this adds the “velvet” quality
  // --------------------------------------------------------------
  p = await runFilter(p, "equalizer=f=500:t=q:w=1.0:g=2", "midVelvet");

  // --------------------------------------------------------------
  // 5) Rasp simulation (very subtle)
  //    Safe: small high-mid dip, small low-shelf boost (no distortion)
  // --------------------------------------------------------------
  p = await runFilter(p, "equalizer=f=2500:t=q:w=1.0:g=-1.8", "raspShaper");
  p = await runFilter(p, "equalizer=f=60:t=q:w=1.0:g=1.2", "lowShelf");

  // --------------------------------------------------------------
  // 6) Treble softening — smoother storyteller tone
  // --------------------------------------------------------------
  p = await runFilter(p, "treble=g=-1.2", "trebleSoft");

  // --------------------------------------------------------------
  // 7) Light compression — NO artifacts
  //    Morgan Freeman’s voice is very even in dynamics
  // --------------------------------------------------------------
  p = await runFilter(
    p,
    "acompressor=threshold=-18dB:ratio=1.6:attack=20:release=200:makeup=1.5dB",
    "smoothComp"
  );

  // --------------------------------------------------------------
  // 8) Lower overall level so BGM breathes
  // --------------------------------------------------------------
  p = await runFilter(p, "volume=0.88", "finalVolume");

  //   // 1) Mild pitch-drop — mørk, men ikke digital
  //   p = await runFilter(p, "asetrate=44100*0.47", "pitchdrop");
  //   p = await runFilter(p, "aresample=44100", "resample");

  //   // 2) Ingen tempoøkning (fjernet atempo 1.08 + 1.12)
  //   // Morgan Freeman har IKKE rask tale — han er stabil og rolig.

  //   // 3) Warm bass — hovedkilden til dyphet
  //   p = await runFilter(p, "equalizer=f=95:t=q:w=1.3:g=4", "bassWarm");
  //   p = await runFilter(p, "equalizer=f=180:t=q:w=1.3:g=3", "bassRound");

  //   // 4) Velvet mids (gjør stemmen fyldig og trygg)
  //   p = await runFilter(p, "equalizer=f=500:t=q:w=1.0:g=2", "midVelvet");

  //   // 5) De-esser — fjerner “shhh” uten å fjerne mørkhet
  //   p = await runFilter(
  //     p,
  //     "equalizer=f=7500:t=h:w=0.7:g=-1.0",
  //     "sibilanceControl"
  //   );

  //   // 6) Mild compression — jevn kvalitet, men ikke pumpende
  //   p = await runFilter(
  //     p,
  //     "acompressor=threshold=-18dB:ratio=1.55:attack=25:release=180:makeup=0.8dB",
  //     "smoothComp"
  //   );

  //   p = await runFilter(p, "atempo=1.04", "tempo1");
  //   p = await runFilter(p, "atempo=1.08", "tempo2");

  //   // 7) Final gain
  //   p = await runFilter(p, "volume=0.94", "finalVolume");

  return p;
}
