// ============================================================================
// runSingleVideoPipeline.js
// Runs ONE queued video job: generate → post (stub)
// ============================================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateVideo } from "../lib/video/videoGenerator.js";
import { postVideoToPlatforms } from "../lib/video/videoPoster.js";

dotenv.config({ path: ".env.local" });

// ============================================================================
// Supabase client
// ============================================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
    `🎥 Processing video job ${job.id} for article ${job.article_id} (WOW ${job.wow_score})`
  );

  // --------------------------------------------------------------------------
  // 2) Load article from articles-table (SOURCE OF TRUTH)
  // --------------------------------------------------------------------------
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("*")
    .eq("id", job.article_id)
    .single();

  if (articleError || !article) {
    throw new Error(
      `Failed to load article ${job.article_id}: ${articleError?.message}`
    );
  }

  // --------------------------------------------------------------------------
  // 3) Generate video (FULL AI)
  // --------------------------------------------------------------------------
  const videoPath = await generateVideo({
    ...job,
    article, // ✅ injected explicitly
    mode: "full", // force full-AI
  });

  if (!videoPath) {
    console.log("⚠️ Video generation failed, aborting posting.");
    return;
  }

  // --------------------------------------------------------------------------
  // 4) Post video to platforms (currently stub)
  // --------------------------------------------------------------------------
  await postVideoToPlatforms({
    ...job,
    article, // ✅ same article object
    video_path: videoPath,
  });

  console.log("✅ Video generated and (stub) posted successfully");
}

// ============================================================================
// Entrypoint
// ============================================================================
run().catch((err) => {
  console.error("❌ Video pipeline failed:", err.message);
  process.exit(1);
});
