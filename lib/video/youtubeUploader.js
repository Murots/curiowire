// import fs from "fs";
// import { google } from "googleapis";

// export async function uploadYouTubeShort({
//   videoPath,
//   title,
//   description,
//   tags = [],
// }) {
//   const oauth2Client = new google.auth.OAuth2(
//     process.env.YOUTUBE_CLIENT_ID,
//     process.env.YOUTUBE_CLIENT_SECRET
//   );

//   oauth2Client.setCredentials({
//     refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
//   });

//   const youtube = google.youtube({
//     version: "v3",
//     auth: oauth2Client,
//   });

//   const res = await youtube.videos.insert({
//     part: ["snippet", "status"],
//     requestBody: {
//       snippet: {
//         title: title.slice(0, 95),
//         description: `${description}\n\n#Shorts`,
//         tags,
//         categoryId: "25", // News & Politics (kan endres per kategori)
//       },
//       status: {
//         privacyStatus: "public",
//         selfDeclaredMadeForKids: false,
//       },
//     },
//     media: {
//       body: fs.createReadStream(videoPath),
//     },
//   });

//   return {
//     videoId: res.data.id,
//     url: `https://www.youtube.com/watch?v=${res.data.id}`,
//   };
// }

import fs from "fs";
import { google } from "googleapis";

// small helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadYouTubeShort({
  videoPath,
  title,
  description,
  tags = [],
  delayedPublishMinutes = 0, // ✅ NEW
}) {
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

  const delayMin = Number.isFinite(Number(delayedPublishMinutes))
    ? Math.max(0, Number(delayedPublishMinutes))
    : 0;

  // ✅ Upload as PRIVATE if we intend to delay publishing
  const initialPrivacy = delayMin > 0 ? "private" : "public";

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
        privacyStatus: initialPrivacy,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = res.data.id;

  if (!videoId) {
    throw new Error("YouTube upload succeeded but videoId was missing.");
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // ✅ Delayed publish: wait then flip to public
  if (delayMin > 0) {
    console.log(
      `[youtubeUploader] ⏳ Uploaded PRIVATE. Will publish in ${delayMin} minute(s). videoId=${videoId}`,
    );

    await sleep(delayMin * 60 * 1000);

    console.log(`[youtubeUploader] 🚀 Publishing videoId=${videoId} …`);

    await youtube.videos.update({
      part: ["status"],
      requestBody: {
        id: videoId,
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      },
    });

    console.log(`[youtubeUploader] ✅ Published videoId=${videoId}`);
  } else {
    console.log(`[youtubeUploader] ✅ Uploaded PUBLIC videoId=${videoId}`);
  }

  return { videoId, url };
}
