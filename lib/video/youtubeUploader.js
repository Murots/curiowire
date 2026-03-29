import fs from "fs";
import { google } from "googleapis";

function toFutureIso(minutesFromNow) {
  const mins = Number(minutesFromNow);

  if (!Number.isFinite(mins) || mins <= 0) {
    return null;
  }

  return new Date(Date.now() + mins * 60 * 1000).toISOString();
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))].slice(
    0,
    500,
  );
}

function buildDescription(description) {
  const base = String(description || "").trim();

  if (!base) {
    return "#Shorts";
  }

  return base.includes("#Shorts") ? base : `${base}\n\n#Shorts`;
}

async function setYouTubeThumbnail(youtube, videoId, thumbnailPath) {
  if (!thumbnailPath) {
    return {
      success: false,
      error: "No thumbnailPath provided",
    };
  }

  if (!fs.existsSync(thumbnailPath)) {
    return {
      success: false,
      error: `Thumbnail file does not exist: ${thumbnailPath}`,
    };
  }

  try {
    await youtube.thumbnails.set({
      videoId,
      media: {
        body: fs.createReadStream(thumbnailPath),
      },
    });

    console.log(
      `[youtubeUploader] 🖼️ Thumbnail uploaded successfully for videoId=${videoId}`,
    );

    return {
      success: true,
      thumbnailPath,
    };
  } catch (err) {
    const apiError =
      err?.response?.data?.error ||
      err?.response?.data ||
      err?.errors ||
      err?.message ||
      err;

    console.error("[youtubeUploader] ❌ Thumbnail upload failed:", apiError);

    return {
      success: false,
      error:
        typeof apiError === "string"
          ? apiError
          : JSON.stringify(apiError, null, 2),
    };
  }
}

export async function uploadYouTubeShort({
  videoPath,
  title,
  description,
  tags = [],
  delayedPublishMinutes = 0,
  thumbnailPath = null,
}) {
  if (!videoPath) {
    throw new Error("Missing videoPath.");
  }

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error(
      "Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in environment.",
    );
  }

  if (!process.env.YOUTUBE_REFRESH_TOKEN) {
    throw new Error("Missing YOUTUBE_REFRESH_TOKEN in environment.");
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file does not exist: ${videoPath}`);
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

  const safeDelayMin = Number.isFinite(Number(delayedPublishMinutes))
    ? Math.max(0, Number(delayedPublishMinutes))
    : 0;

  const safeTitle = String(title || "CurioWire")
    .trim()
    .slice(0, 95);
  const safeDescription = buildDescription(description);
  const safeTags = cleanTags(tags);

  const publishAt = safeDelayMin > 0 ? toFutureIso(safeDelayMin) : null;

  const status =
    publishAt != null
      ? {
          privacyStatus: "private",
          publishAt,
          selfDeclaredMadeForKids: false,
        }
      : {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        };

  console.log(
    `[youtubeUploader] 🚀 Starting upload | privacy=${status.privacyStatus} | delayedPublishMinutes=${safeDelayMin}`,
  );

  if (publishAt) {
    console.log(`[youtubeUploader] ⏰ Scheduling publishAt=${publishAt} (UTC)`);
  }

  let res;

  try {
    res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: safeTitle,
          description: safeDescription,
          tags: safeTags,
          categoryId: "25",
        },
        status,
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });
  } catch (err) {
    const apiError =
      err?.response?.data?.error ||
      err?.response?.data ||
      err?.errors ||
      err?.message ||
      err;

    console.error("[youtubeUploader] ❌ Upload failed:", apiError);
    throw new Error(
      typeof apiError === "string"
        ? apiError
        : JSON.stringify(apiError, null, 2),
    );
  }

  const videoId = res?.data?.id;

  if (!videoId) {
    throw new Error("YouTube upload succeeded but videoId was missing.");
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  if (publishAt) {
    console.log(
      `[youtubeUploader] ✅ Uploaded PRIVATE and scheduled for publish. videoId=${videoId}`,
    );
  } else {
    console.log(`[youtubeUploader] ✅ Uploaded PUBLIC. videoId=${videoId}`);
  }

  let thumbnailResult = null;

  if (thumbnailPath) {
    thumbnailResult = await setYouTubeThumbnail(
      youtube,
      videoId,
      thumbnailPath,
    );
  }

  return {
    videoId,
    url,
    privacyStatus: status.privacyStatus,
    publishAt: publishAt || null,
    thumbnail: thumbnailResult,
  };
}
