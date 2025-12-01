// ============================================================================
// testVoice.js — Generate ONLY the voice (TTS → applyVoiceFX)
// Perfect for rapid tuning without video generation
// ============================================================================

import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { generateVoiceover } from "../lib/video/audioEngine.js";
import { applyVoiceFX } from "../lib/video/audio/voiceFx.js";

const OUTPUT_DIR = "./generated_voice_tests";
fs.ensureDirSync(OUTPUT_DIR);

async function main() {
  const text = process.argv.slice(2).join(" ").trim();

  if (!text) {
    console.log("\nUsage:");
    console.log('  node scripts/testVoice.js "your text here"');
    console.log("");
    process.exit(0);
  }

  console.log("\n🎤 Generating test voice…");

  // Step 1: TTS
  const dry = await generateVoiceover(text);

  console.log("📁 Dry voice saved:", dry);

  // Copy the dry file for easier access
  const dryCopy = path.join(OUTPUT_DIR, `dry-${uuidv4()}.mp3`);
  fs.copyFileSync(dry, dryCopy);
  console.log("📁 Copied to:", dryCopy);

  // Step 2: Full FX
  console.log("🎛️ Applying voice FX (dark)…");

  const finalVoice = await applyVoiceFX(dry);

  const finalCopy = path.join(OUTPUT_DIR, `final-${uuidv4()}.mp3`);
  fs.copyFileSync(finalVoice, finalCopy);

  console.log("📁 Final dark voice saved:", finalCopy);

  console.log("\n✨ DONE — Check generated_voice_tests/\n");
}

main();
