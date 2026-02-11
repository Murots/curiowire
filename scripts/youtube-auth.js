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

const REDIRECT_URI = "http://localhost:8080"; // must match Google console exactly

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

const scopes = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // <— important to force refresh_token
  scope: scopes,
});

console.log("\n🔗 Open this URL in your browser:\n");
console.log(authUrl);

console.log("\nAfter approving, paste the 'code' here:\n");
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", async (code) => {
  code = code.trim();
  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n🎉 SUCCESS! Tokens received:\n");
    console.log(tokens);

    if (!tokens.refresh_token) {
      console.log(
        "\n⚠️ No refresh_token returned. This usually means Google reused a prior consent.\n" +
          "Try again with prompt:'consent' (already set) AND make sure you are signing into the correct Google account.\n" +
          "If it still happens, remove CurioWire access in your Google Account security settings and rerun.\n",
      );
      process.exit(0);
    }

    console.log("\n✅ Your refresh token:\n");
    console.log(tokens.refresh_token);

    console.log(
      `\n➕ Add this to your .env.local:\n\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Error while getting token:", err?.response?.data || err);
    process.exit(1);
  }
});
