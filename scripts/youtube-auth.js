// scripts/youtube-auth.js
import { google } from "googleapis";
import dotenv from "dotenv";

// 👇 Sørg for at .env.local lastes
dotenv.config({ path: ".env.local" });

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

// Desktop apps MUST use a loopback redirect with a specific port:
const REDIRECT_URI = "http://localhost:8080";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
});

console.log("\n🔗 Open this URL in your browser:\n");
console.log(authUrl);

console.log("\nAfter approving, paste the 'code' here:");
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", async (code) => {
  code = code.trim();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n🎉 SUCCESS! Your refresh token:\n");
    console.log(tokens.refresh_token);

    console.log(`
➕ Add this to your .env file:

YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}
    `);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error while getting token:", err);
    process.exit(1);
  }
});
