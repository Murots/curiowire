// ============================================================================
// scheduleSingleVideo.js
// Queues ONE full-AI video job (12h window, best WOW)
// ============================================================================

import dotenv from "dotenv";
import { scheduleSingleVideo } from "../lib/video/videoScheduler.js";

dotenv.config({ path: ".env.local" });

scheduleSingleVideo()
  .then(() => {
    console.log("✅ Video scheduling done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Video scheduling failed:", err);
    process.exit(1);
  });
