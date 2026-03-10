import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const videoId = process.argv[2];

if (!videoId) {
  console.error("Usage: node scripts/check-youtube-published-time.js VIDEO_ID");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
);

oauth2Client.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
});

const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
});

async function run() {
  const res = await youtube.videos.list({
    part: ["snippet", "status"],
    id: [videoId],
  });

  const video = res.data.items?.[0];

  if (!video) {
    throw new Error(`Video not found for id: ${videoId}`);
  }

  console.log("videoId:", videoId);
  console.log("title:", video.snippet?.title || null);
  console.log("privacyStatus:", video.status?.privacyStatus || null);
  console.log("publishedAt (UTC):", video.snippet?.publishedAt || null);

  if (video.snippet?.publishedAt) {
    const d = new Date(video.snippet.publishedAt);

    console.log(
      "publishedAt (Europe/Oslo):",
      new Intl.DateTimeFormat("nb-NO", {
        timeZone: "Europe/Oslo",
        dateStyle: "full",
        timeStyle: "long",
      }).format(d),
    );
  }
}

run().catch((err) => {
  console.error(err?.response?.data || err?.message || err);
  process.exit(1);
});
