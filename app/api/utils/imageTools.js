import sharp from "sharp";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Bevarer samme init som i route
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

// === fetchUnsplashImage (identisk) ===
export async function fetchUnsplashImage(query) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=landscape&client_id=${UNSPLASH_KEY}`
    );
    const data = await res.json();
    return data.urls?.regular
      ? `${data.urls.regular}&auto=format&fit=crop&w=800&q=75`
      : null;
  } catch (err) {
    console.warn("⚠️ Unsplash fetch failed:", err.message);
    return null;
  }
}

// === generateDalleImage (identisk tekst & logikk) ===
export async function generateDalleImage(title, topic, tone, category) {
  try {
    const keywords = title
      .split(" ")
      .filter((w) => w.length > 3)
      .slice(0, 6)
      .join(", ");

    const imagePrompt = `
Cinematic editorial illustration for a feature titled "${title}" (about "${topic}").
Core ideas and visual cues: ${keywords}.
Category: ${category}.
Mood & tone: ${tone}.
Style: realistic 1930s-inspired cinematic photography — soft light, symbolic composition, subtle color depth.
Focus on atmosphere, metaphor, and emotional storytelling — not literal reporting or text elements.
Do NOT include any text, letters, numbers, words, handwriting, logos, captions, signs, screens, or printed materials.
Absolutely no visible writing, titles, or words in the scene.
`;

    const result = await openai.images.generate({
      model: "dall-e-2",
      prompt: imagePrompt,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      console.warn(`⚠️ DALL·E returned no base64 for ${category}`);
      return null;
    }

    const optimized = await sharp(Buffer.from(b64, "base64"))
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const filename = `${category}-${Date.now()}.jpg`;
    const path = `curiowire/${filename}`;

    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
    console.log(`🎨 DALL·E → Supabase OK for ${category}`);
    return data.publicUrl;
  } catch (err) {
    console.error(`❌ DALL·E error for ${category}:`, err.message);
    return null;
  }
}

// === cacheImageToSupabase (identisk logikk) ===
export async function cacheImageToSupabase(imageUrl, filename, category) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return imageUrl;

    const optimized = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const path = `curiowire/${filename}.jpg`;
    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (error) throw error;

    const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error(`❌ Cache failed for ${category}:`, err.message);
    return imageUrl;
  }
}
