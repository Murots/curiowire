//
// ============================================================================
// testPika.js — manual test script for CurioWire video pipeline
// v4 — follows env provider/preset automatically (Pika/Kling) + clear logging
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { generateVideo } from "../lib/video/videoGenerator.js";
import readline from "readline";

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Simple CLI helper
function ask(q) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(q, (ans) => {
      rl.close();
      resolve(ans.trim());
    }),
  );
}

function short(s, n = 80) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function envStr(k, fallback = "—") {
  const v = process.env[k];
  if (v === undefined || v === null || String(v).trim() === "") return fallback;
  return String(v);
}

function normalizeProvider(p) {
  const s = String(p || "")
    .trim()
    .toLowerCase();
  if (s === "kling") return "kling";
  return "pika";
}

function normalizePreset(p) {
  const s = String(p || "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  return s;
}

function resolveEnvVideoSelection() {
  const provider = normalizeProvider(process.env.VIDEO_PROVIDER || "pika");
  let preset = normalizePreset(process.env.VIDEO_PRESET || "");

  // sensible defaults, matching pikaClient.js logic
  if (!preset) {
    preset = provider === "kling" ? "text" : "scenes";
  }

  return { provider, preset };
}

function modelForEnv({ provider, preset }) {
  if (provider === "kling") {
    return (
      process.env.KLING_TEXT_MODEL ||
      "fal-ai/kling-video/v2.5-turbo/pro/text-to-video"
    );
  }

  // pika
  if (preset === "scenes") {
    return process.env.PIKA_SCENES_MODEL || "fal-ai/pika/v2.2/pikascenes";
  }
  if (preset === "image") {
    return process.env.PIKA_IMAGE_MODEL || "fal-ai/pika/v2.2/image-to-video";
  }
  return process.env.PIKA_TEXT_MODEL || "fal-ai/pika/v2.2/text-to-video";
}

async function pickFromLast6({ category = null, allowWithoutScene = true }) {
  let q = supabase
    .from("curiosity_cards")
    .select(
      "id,category,title,wow_score,created_at,scene_prompt,image_url,video_script,seo_description,card_text",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    throw new Error(
      category
        ? `No published curiosity_cards found in category: ${category}`
        : "No published curiosity_cards found.",
    );
  }

  console.log(
    "\n🧪 Last 6 published curiosity_cards" +
      (category ? ` (category=${category})` : "") +
      ":",
  );
  data.forEach((c, i) => {
    const hasScene = !!c.scene_prompt;
    console.log(
      `${i + 1}. [${c.id}] ${c.category} | WOW ${c.wow_score} | ${new Date(
        c.created_at,
      ).toISOString()}`,
    );
    console.log(`    Title: ${short(c.title, 90)}`);
    console.log(
      `    scene_prompt: ${hasScene ? "✔" : "—"} | video_script: ${
        c.video_script ? "✔" : "—"
      } | image_url: ${c.image_url ? "✔" : "—"}`,
    );
    if (hasScene) console.log(`    Scene: ${short(c.scene_prompt, 110)}`);
  });

  // If they want to force picking a card that has scene_prompt
  if (!allowWithoutScene) {
    const anyWithScene = data.some((c) => !!c.scene_prompt);
    if (!anyWithScene) {
      throw new Error(
        "None of the last 6 cards have scene_prompt yet. Ensure the newest card with scene_prompt is within last 6.",
      );
    }
  }

  const choice = await ask("\nPick card number (1–6): ");
  const idx = parseInt(choice, 10) - 1;

  if (Number.isNaN(idx) || idx < 0 || idx >= data.length) {
    throw new Error("Invalid choice — expected 1–6");
  }

  const picked = data[idx];

  if (!allowWithoutScene && !picked.scene_prompt) {
    throw new Error(
      "Selected card has no scene_prompt. Pick the one marked scene_prompt: ✔",
    );
  }

  return picked;
}

async function main() {
  console.log("🔧 Manual Video Model Test (CurioWire)\n");

  const envSel = resolveEnvVideoSelection();
  const envModel = modelForEnv(envSel);

  console.log("📌 Provider/model configuration (from .env.local):");
  console.log(
    "   VIDEO_PROVIDER:            ",
    envStr("VIDEO_PROVIDER", "pika"),
  );
  console.log(
    "   VIDEO_PRESET:              ",
    envStr("VIDEO_PRESET", envSel.preset),
  );
  console.log("   ➜ effective provider:      ", envSel.provider);
  console.log("   ➜ effective preset:        ", envSel.preset);
  console.log("   ➜ effective model:         ", envModel);
  console.log("");

  // keep old logs too, because they’re handy
  console.log("📌 Pika env:");
  console.log("   PIKA_SCENES_MODEL:         ", envStr("PIKA_SCENES_MODEL"));
  console.log("   PIKA_TEXT_MODEL:           ", envStr("PIKA_TEXT_MODEL"));
  console.log("   PIKA_IMAGE_MODEL:          ", envStr("PIKA_IMAGE_MODEL"));
  console.log(
    "   PIKA_IMAGE_MODEL_FALLBACK: ",
    envStr("PIKA_IMAGE_MODEL_FALLBACK"),
  );
  console.log("");

  console.log("📌 Kling env:");
  console.log("   KLING_TEXT_MODEL:          ", envStr("KLING_TEXT_MODEL"));
  console.log("   KLING_CFG_SCALE:           ", envStr("KLING_CFG_SCALE"));
  console.log("");

  console.log(
    "   FAL_KEY:                   ",
    process.env.FAL_KEY ? "✔ Found" : "❌ Missing",
  );
  console.log("");

  // Optional category filter
  const categoryInput = await ask(
    "Category filter (optional, press Enter to skip) e.g. science/space/history/...: ",
  );
  const category = categoryInput || null;

  // Mode selection (kept for compatibility with generator pipeline)
  const mode =
    (await ask(
      "Mode ('full' = AI video model, 'image' = Zoom fallback) [default: full]: ",
    )) || "full";

  // Require scene_prompt?
  const requireScene =
    (await ask("Require scene_prompt? (y/N) [default: N]: ")) || "n";
  const allowWithoutScene = !/^y(es)?$/i.test(requireScene);

  const card = await pickFromLast6({ category, allowWithoutScene });

  console.log("\n✅ Selected card:");
  console.log(`   id:        ${card.id}`);
  console.log(`   category:  ${card.category}`);
  console.log(`   wow_score: ${card.wow_score}`);
  console.log(`   title:     ${card.title}`);
  console.log(
    `   scene:     ${
      card.scene_prompt ? short(card.scene_prompt, 160) : "(none)"
    }`,
  );
  console.log("");

  // Create a "job" object compatible with your generator.
  // NOTE: We DON'T hardcode provider/model here — we want the pipeline to follow env.
  // If you later add explicit overrides (job.video_provider etc.), you can set them here.
  const job = {
    id: "manual-" + Date.now(),
    article_id: card.id,
    article: card,
    article_json: card,
    mode, // generator still supports mode fallback
    is_full_ai: mode === "full",
  };

  console.log(`🎬 Generating video for: ${card.title}\n`);
  console.log(
    `🧭 Following env selection: provider=${envSel.provider} preset=${envSel.preset} model=${envModel}\n`,
  );

  const result = await generateVideo(job);

  console.log("\n🎉 DONE!");
  if (result) console.log("📹 Video saved at:", result);
  else console.log("❌ Video could not be generated.");
}

main().catch((err) => {
  console.error("❌ Test failed:", err.message);
  console.error(err.stack);
});
