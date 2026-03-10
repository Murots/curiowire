// ============================================================================
// scripts/testVoice.js
// Generate voice test assets:
// 1) dry TTS
// 2) processed voice FX
// 3) processed voice + BGM mix
//
// Usage:
//   node scripts/testVoice.js "your text here"
//
// Perfect for rapid tuning without full video generation
// ============================================================================

import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  generateVoiceover,
  getAudioDuration,
} from "../lib/video/audioEngine.js";

import { applyVoiceFX } from "../lib/video/audio/voiceFx.js";
import { mixVoiceoverWithBGM } from "../lib/video/ffmpegTools.js";

const OUTPUT_DIR = "./generated_voice_tests";
fs.ensureDirSync(OUTPUT_DIR);

function safeStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function copyToOutput(srcPath, label, ext = ".mp3") {
  const outPath = path.join(
    OUTPUT_DIR,
    `${safeStamp()}-${label}-${uuidv4()}${ext}`,
  );
  await fs.copy(srcPath, outPath);
  return outPath;
}

async function main() {
  const text = process.argv.slice(2).join(" ").trim();

  if (!text) {
    console.log("\nUsage:");
    console.log('  node scripts/testVoice.js "your text here"');
    console.log("");
    process.exit(0);
  }

  console.log("\n🎤 Generating test voice...\n");

  // -------------------------------------------------------------------------
  // 1) Dry TTS
  // -------------------------------------------------------------------------
  const dry = await generateVoiceover(text);
  const dryDuration = await getAudioDuration(dry).catch(() => null);

  console.log("📁 Dry voice generated:", dry);
  if (dryDuration) {
    console.log(`⏱ Dry duration: ${dryDuration.toFixed(2)}s`);
  }

  const dryCopy = await copyToOutput(dry, "dry");
  console.log("📁 Dry copy saved:", dryCopy);

  // -------------------------------------------------------------------------
  // 2) Voice FX
  // -------------------------------------------------------------------------
  console.log("\n🎛️ Applying voice FX...\n");

  const fx = await applyVoiceFX(dry);
  const fxDuration = await getAudioDuration(fx).catch(() => null);

  console.log("📁 FX voice generated:", fx);
  if (fxDuration) {
    console.log(`⏱ FX duration: ${fxDuration.toFixed(2)}s`);
  }

  const fxCopy = await copyToOutput(fx, "fx");
  console.log("📁 FX copy saved:", fxCopy);

  // -------------------------------------------------------------------------
  // 3) Voice + BGM mix
  // -------------------------------------------------------------------------
  console.log("\n🎵 Mixing FX voice with BGM...\n");

  const mixDuration = fxDuration || dryDuration || 10;
  const mixed = await mixVoiceoverWithBGM(fx, mixDuration);
  const mixedDuration = await getAudioDuration(mixed).catch(() => null);

  console.log("📁 Mixed voice+BGM generated:", mixed);
  if (mixedDuration) {
    console.log(`⏱ Mixed duration: ${mixedDuration.toFixed(2)}s`);
  }

  const mixedCopy = await copyToOutput(mixed, "mixed");
  console.log("📁 Mixed copy saved:", mixedCopy);

  console.log("\n✅ DONE");
  console.log("Check these files:");
  console.log(" - Dry:", dryCopy);
  console.log(" - FX:", fxCopy);
  console.log(" - Mixed:", mixedCopy);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ testVoice failed:");
  console.error(err?.message || err);
  process.exit(1);
});
