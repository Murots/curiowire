import sharp from "sharp";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// === fetchUnsplashImage beholdes (brukes evt. som enkel backup) ===
export async function fetchUnsplashImage(query) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=landscape&client_id=${
        process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
      }`
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

// === Oppgradert DALL·E 3 generator ===
export async function generateDalleImage(title, topic, tone, category) {
  try {
    const imagePrompt = `
Cinematic editorial illustration for "${title}" (${category}).
Core idea: ${topic}.
Mood & tone: ${tone}.
Style: realistic, symbolic, cinematic — no text, words or logos.
`;

    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) throw new Error("DALL·E returned no base64 data");

    const optimized = await sharp(Buffer.from(b64, "base64"))
      .resize({ width: 800 })
      .jpeg({ quality: 75 })
      .toBuffer();

    const filename = `${category}-${Date.now()}.jpg`;
    const path = `curiowire/${filename}`;

    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
    console.log(`🎨 DALL·E 3 → Supabase OK for ${category}`);
    return data.publicUrl;
  } catch (err) {
    console.error(`❌ DALL·E 3 error for ${category}:`, err.message);
    return null;
  }
}

// === Cache-bilder (uendret) ===
export async function cacheImageToSupabase(imageUrl, filename, category) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return imageUrl;

    const optimized = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize({ width: 800 })
      .jpeg({ quality: 75 })
      .toBuffer();

    const path = `curiowire/${filename}.jpg`;
    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error(`❌ Cache failed for ${category}:`, err.message);
    return imageUrl;
  }
}
