// === app/api/utils/imageTools.js ===
// 🖼️ CurioWire Image Tools (2025, Clean Edition)
// -----------------------------------------------
// Denne filen håndterer:
// • Generering av DALL·E 3-bilder (med retry-logic ved safety-rejects)
// • Optimalisering av bilder (Sharp → WebP 800px)
// • Caching av eksterne bilder i Supabase-bucket
// • Minimal Unsplash fallback (brukes kun som siste utvei)
//
// ❗ Denne filen driver *ikke* bildesøk, analyse eller scoring.
//    Det håndteres nå 100% i imageSelector.js.
//
// Kode er gjort renere, mer stabil og mer lesbar – uten endringer i funksjonalitet.
//

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import sharp from "sharp";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// === OpenAI-klient ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// === Supabase-klient ===
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ============================================================================================
   🔹 1. Minimal Unsplash-fallback — kun brukt hvis absolutt alt feiler
   ============================================================================================ */
export async function fetchUnsplashImage(query) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=landscape&client_id=${
        process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
      }`
    );

    if (!res.ok) return null;

    const data = await res.json();

    return data.urls?.regular
      ? `${data.urls.regular}&auto=format&fit=crop&w=800&q=75`
      : null;
  } catch (err) {
    console.warn("⚠️ Unsplash fallback failed:", err.message);
    return null;
  }
}

/* ============================================================================================
   🔹 2. DALL·E 3 generator — robust + automatisk rebuild ved safety reject
   ============================================================================================ */
export async function generateDalleImage(title, topic, tone, category) {
  // Gjenbrukbar funksjon for å kjøre DALL·E + optimalisere + uploade
  async function runDalle(prompt, label = "primary") {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        response_format: "b64_json",
      });

      const b64 = response?.data?.[0]?.b64_json;
      if (!b64) throw new Error("DALL·E returned no image data");

      const optimized = await sharp(Buffer.from(b64, "base64"))
        .resize({ width: 800 })
        .toFormat("webp", { quality: 80 })
        .toBuffer();

      const filename = `${category}-${Date.now()}-${label}.webp`;
      const path = `curiowire/${filename}`;

      const { error } = await supabase.storage
        .from("curiowire")
        .upload(path, optimized, {
          contentType: "image/webp",
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
      console.log(`🎨 DALL·E → Supabase OK (${label})`);

      return data.publicUrl;
    } catch (err) {
      console.error(`❌ DALL·E error (${label}):`, err.message);
      throw err;
    }
  }

  // === Primærprompt ===
  const basePrompt = `
Cinematic editorial illustration for "${title}" (${category}).
Core idea: ${topic}.
Mood: ${tone}.
Style: realistic, symbolic, cinematic — no text or logos.
`;

  try {
    // 1️⃣ Første forsøk
    return await runDalle(basePrompt, "primary");
  } catch (err) {
    // 2️⃣ Safety reject → prøv mildere prompt
    if (err.message?.toLowerCase().includes("safety")) {
      console.warn(
        "⚠️ DALL·E safety reject — retrying with softened prompt..."
      );

      const safePrompt = basePrompt
        .replace(/\b(eat|kill|fight|dead|blood|bite|weapon)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      const retryPrompt = `
Editorial illustration for "${title}" (${category}).
Naturalistic, symbolic, non-violent scene.
Concept: ${safePrompt}.
Style: calm cinematic photography — no text or logos.
`;

      try {
        return await runDalle(retryPrompt, "safe-retry");
      } catch {
        console.warn("⚠️ Safe retry failed — generating AI-safe concept...");
      }
    }

    // 3️⃣ GPT genererer en trygg, kreativ setning
    try {
      const conceptResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Suggest a safe, creative image concept for a news article titled "${title}" about ${topic}. One sentence, non-violent.`,
          },
        ],
        max_tokens: 50,
      });

      const concept =
        conceptResp.choices[0]?.message?.content?.trim() ||
        "symbolic abstract concept relating to the topic";

      const finalPrompt = `
Editorial illustration for "${title}" (${category}).
Concept: ${concept}.
Mood: cinematic, symbolic.
Style: modern digital illustration, no text.
`;

      return await runDalle(finalPrompt, "gpt-fallback");
    } catch (gptErr) {
      console.error("❌ GPT fallback failed:", gptErr.message);
      return null;
    }
  }
}

/* ============================================================================================
   🔹 3. Cache eksternt bilde → optimalisert WebP i Supabase
   ============================================================================================ */
export async function cacheImageToSupabase(imageUrl, filename, category) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return imageUrl;

    const arrayBuffer = await res.arrayBuffer();

    const optimized = await sharp(Buffer.from(arrayBuffer))
      .resize({ width: 800 })
      .toFormat("webp", { quality: 80 })
      .toBuffer();

    const path = `curiowire/${filename}.webp`;

    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("curiowire").getPublicUrl(path);

    return data.publicUrl;
  } catch (err) {
    console.error(`❌ cacheImageToSupabase failed:`, err.message);
    return imageUrl; // fallback: bruk original URL
  }
}
