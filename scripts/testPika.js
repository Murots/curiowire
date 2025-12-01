// ============================================================================
// testPika.js — manual test script for Pika (Fal) + Zoom fallback
// v2 — with better input handling + clearer logging
// ============================================================================
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { generateVideo } from "../lib/video/videoGenerator.js";
import readline from "readline";

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
    })
  );
}

async function pickArticle(category) {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("category", category)
    .order("wow_score", { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);
  if (!data.length)
    throw new Error(`No articles found in category: ${category}`);

  console.log("\n📚 Top 5 articles in category:", category);
  data.forEach((a, i) =>
    console.log(`${i + 1}. [${a.id}] (WOW ${a.wow_score}) — ${a.title}`)
  );

  const choice = await ask("\nPick article number (1–5): ");
  const idx = parseInt(choice) - 1;

  if (isNaN(idx) || idx < 0 || idx >= data.length) {
    throw new Error("Invalid choice — expected 1–5");
  }

  return data[idx];
}

async function main() {
  console.log("🔧 Manual Pika/Zoom Test\n");

  console.log("📌 Model configuration:");
  console.log("   Primary model:   ", process.env.PIKA_IMAGE_MODEL);
  console.log("   Fallback model:  ", process.env.PIKA_IMAGE_MODEL_FALLBACK);
  console.log("   Text model:      ", process.env.PIKA_TEXT_MODEL);
  console.log(
    "   Fal key:         ",
    process.env.FAL_KEY ? "✔ Found" : "❌ Missing"
  );

  const category =
    (await ask(
      "Category (science, space, history, nature, world, technology) [default: science]: "
    )) || "science";

  const mode =
    (await ask(
      "Mode ('full' = Pika/Turbo + fallback, 'image' = Zoom only) [default: full]: "
    )) || "full";

  const article = await pickArticle(category);

  const job = {
    id: "manual-" + Date.now(),
    article,
    article_json: article,
    mode,
  };

  console.log(`\n🎬 Generating video for: ${article.title}\n`);

  const result = await generateVideo(job);

  console.log("\n🎉 DONE!");
  if (result) console.log("📹 Video saved at:", result);
  else console.log("❌ Video could not be generated.");
}

main().catch((err) => {
  console.error("❌ Test failed:", err.message);
  console.error(err.stack);
});
