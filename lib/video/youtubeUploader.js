import fs from "fs";
import { google } from "googleapis";

export async function uploadYouTubeShort({
  videoPath,
  title,
  description,
  tags = [],
}) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.slice(0, 95),
        description: `${description}\n\n#Shorts`,
        tags,
        categoryId: "25", // News & Politics (kan endres per kategori)
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  return {
    videoId: res.data.id,
    url: `https://www.youtube.com/watch?v=${res.data.id}`,
  };
}
