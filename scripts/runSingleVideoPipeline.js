// ============================================================================
// runSingleVideoPipeline.js
// Runs ONE queued video job: generate → post (stub)
// Now uses curiosity_cards instead of articles.
// Reuses existing video_path if present locally.
// ============================================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateVideo } from "../lib/video/videoGenerator.js";
import { postVideoToPlatforms } from "../lib/video/videoPoster.js";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

// ============================================================================
// Supabase client
// ============================================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ============================================================================
// MAIN
// ============================================================================
async function run() {
  console.log("🎬 Looking for queued video job...");

  // --------------------------------------------------------------------------
  // 1) Fetch ONE queued video job
  // --------------------------------------------------------------------------
  const { data: jobs, error } = await supabase
    .from("videos")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error("Failed to fetch video jobs: " + error.message);
  }

  if (!jobs || jobs.length === 0) {
    console.log("ℹ️ No queued video jobs.");
    return;
  }

  const job = jobs[0];

  console.log(
    `🎥 Processing video job ${job.id} for card ${job.article_id} (WOW ${job.wow_score})`,
  );

  // --------------------------------------------------------------------------
  // 2) Load card from curiosity_cards (SOURCE OF TRUTH)
  // --------------------------------------------------------------------------
  const { data: article, error: cardError } = await supabase
    .from("curiosity_cards")
    .select("*")
    .eq("id", job.article_id)
    .single();

  if (cardError || !article) {
    throw new Error(
      `Failed to load curiosity_card ${job.article_id}: ${cardError?.message}`,
    );
  }

  // --------------------------------------------------------------------------
  // 3) Generate video (FULL AI) — OR reuse existing local file
  // --------------------------------------------------------------------------
  let videoPath = null;

  if (job.video_path) {
    const resolved = path.resolve(job.video_path);
    if (fs.existsSync(resolved)) {
      console.log(`♻️ Reuse mode: existing video found at ${job.video_path}`);
      videoPath = job.video_path;
    } else {
      console.log(
        `ℹ️ video_path is set but file not found locally: ${job.video_path}`,
      );
    }
  }

  if (!videoPath) {
    videoPath = await generateVideo({
      ...job,
      article, // ✅ inject card explicitly
      mode: "full", // force full-AI (keeps backward compat with older generator logic)
      is_full_ai: true,
    });
  }

  if (!videoPath) {
    console.log("⚠️ Video generation failed, aborting posting.");
    return;
  }

  // Persist new path if needed
  if (videoPath !== job.video_path) {
    await supabase
      .from("videos")
      .update({ video_path: videoPath, updated_at: new Date().toISOString() })
      .eq("id", job.id);
  }

  // --------------------------------------------------------------------------
  // 4) Post video to platforms (currently stub)
  // --------------------------------------------------------------------------
  await postVideoToPlatforms({
    ...job,
    article, // ✅ same card object
    video_path: videoPath,
  });

  console.log("✅ Video pipeline completed successfully");
}

// ============================================================================
// Entrypoint
// ============================================================================
run().catch((err) => {
  console.error("❌ Video pipeline failed:", err.message);
  process.exit(1);
});
