// // scripts/youtube-auth.js
// import { google } from "googleapis";
// import dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });

// const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
// const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

// if (!CLIENT_ID || !CLIENT_SECRET) {
//   console.error(
//     "❌ Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env.local",
//   );
//   process.exit(1);
// }

// const REDIRECT_URI = "http://localhost:8080"; // must match Google console exactly

// const oauth2Client = new google.auth.OAuth2(
//   CLIENT_ID,
//   CLIENT_SECRET,
//   REDIRECT_URI,
// );

// const scopes = [
//   "https://www.googleapis.com/auth/youtube.upload",
//   "https://www.googleapis.com/auth/youtube.readonly",
// ];

// const authUrl = oauth2Client.generateAuthUrl({
//   access_type: "offline",
//   prompt: "consent", // <— important to force refresh_token
//   scope: scopes,
// });

// console.log("\n🔗 Open this URL in your browser:\n");
// console.log(authUrl);

// console.log("\nAfter approving, paste the 'code' here:\n");
// process.stdin.resume();
// process.stdin.setEncoding("utf8");

// process.stdin.on("data", async (code) => {
//   code = code.trim();
//   try {
//     const { tokens } = await oauth2Client.getToken(code);

//     console.log("\n🎉 SUCCESS! Tokens received:\n");
//     console.log(tokens);

//     if (!tokens.refresh_token) {
//       console.log(
//         "\n⚠️ No refresh_token returned. This usually means Google reused a prior consent.\n" +
//           "Try again with prompt:'consent' (already set) AND make sure you are signing into the correct Google account.\n" +
//           "If it still happens, remove CurioWire access in your Google Account security settings and rerun.\n",
//       );
//       process.exit(0);
//     }

//     console.log("\n✅ Your refresh token:\n");
//     console.log(tokens.refresh_token);

//     console.log(
//       `\n➕ Add this to your .env.local:\n\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`,
//     );
//     process.exit(0);
//   } catch (err) {
//     console.error("❌ Error while getting token:", err?.response?.data || err);
//     process.exit(1);
//   }
// });

// scripts/youtube-auth.js
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "❌ Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env.local",
  );
  process.exit(1);
}

// Must match an authorized redirect URI in Google Cloud Console exactly
const REDIRECT_URI = "http://localhost:8080";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

// Use broader scope so the token can:
// - upload videos
// - update video status/privacy
// - schedule publishing
//
// youtube.upload alone is NOT enough for videos.update.
// youtube includes the needed write permissions.
const scopes = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: scopes,
  include_granted_scopes: true,
});

console.log("\n🔗 Open this URL in your browser:\n");
console.log(authUrl);

console.log("\nAfter approving, paste the full 'code' here and press Enter:\n");

process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", async (input) => {
  const code = input.trim();

  if (!code) {
    console.error("❌ No code provided.");
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n🎉 SUCCESS! Tokens received.\n");

    if (tokens.scope) {
      console.log("🔐 Granted scopes:");
      for (const scope of tokens.scope.split(" ")) {
        console.log(`- ${scope}`);
      }
      console.log("");
    }

    console.log("Access token returned:", Boolean(tokens.access_token));
    console.log("Refresh token returned:", Boolean(tokens.refresh_token));
    console.log("Expiry date:", tokens.expiry_date || "n/a");

    if (!tokens.refresh_token) {
      console.log(
        "\n⚠️ No refresh_token returned.\n" +
          "This usually means Google reused an earlier consent session.\n\n" +
          "Try this:\n" +
          "1. Go to your Google Account permissions\n" +
          "2. Remove this app's access\n" +
          "3. Run this script again\n" +
          "4. Make sure you approve with the correct YouTube/Google account\n",
      );
      process.exit(0);
    }

    console.log("\n✅ Your new refresh token:\n");
    console.log(tokens.refresh_token);

    console.log(
      `\n➕ Add this to your .env.local:\n\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`,
    );

    console.log(
      "📝 Recommended next step: replace the old YOUTUBE_REFRESH_TOKEN everywhere this app runs.",
    );

    process.exit(0);
  } catch (err) {
    console.error(
      "\n❌ Error while getting token:\n",
      err?.response?.data || err?.message || err,
    );
    process.exit(1);
  }
});
