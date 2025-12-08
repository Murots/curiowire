// cleanAttribution.js
export function cleanWikimediaAttribution(raw) {
  if (!raw || typeof raw !== "string") return "Image by Unknown";

  let text = raw;

  // 1. Remove all HTML tags
  text = text.replace(/<[^>]*>/g, "").trim();

  // 2. Extract artist (before "License:" or comma)
  let artist = text.split("License:")[0].trim();
  artist = artist.replace(/^Image:\s*/i, "").trim();
  artist = artist.replace(/^\s*by\s+/i, "").trim();
  artist = artist.replace(/,$/, "").trim();

  if (!artist) artist = "Unknown";

  // 3. Extract license short name (e.g., CC BY-SA 3.0)
  let licenseMatch = text.match(/License:\s*([^()]+)(\(|$)/i);
  let license = licenseMatch ? licenseMatch[1].trim() : null;

  // Normalize if possible
  if (!license || license.toLowerCase().includes("unknown")) {
    license = "CC BY 4.0";
  }

  // 4. Final clean format
  return `Image by ${artist} — ${license}`;
}
