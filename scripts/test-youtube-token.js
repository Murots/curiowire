import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
);

oauth2Client.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
});

async function run() {
  try {
    // get access token from refresh token
    const { token } = await oauth2Client.getAccessToken();

    console.log("Access token acquired:", !!token);

    // inspect scopes
    const info = await oauth2Client.getTokenInfo(token);

    console.log("\n🔐 Scopes granted:\n");

    info.scopes.forEach((s) => console.log("-", s));

    console.log("\n✅ Token is valid.");
  } catch (err) {
    console.error("❌ Token test failed:");
    console.error(err.response?.data || err.message || err);
  }
}

run();
