// // === app/api/utils/imageTools.js ===
// // 🖼️ CurioWire intelligent image generation & caching
// // Fungerer i både GitHub Actions og Vercel

// import sharp from "sharp";
// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// // === OpenAI-klient ===
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// // === Supabase-klient (trygg for alle miljøer) ===
// const supabase = createClient(
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY ||
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// // === 🔹 Backup: hent bilde fra Unsplash hvis alt annet feiler ===
// export async function fetchUnsplashImage(query) {
//   try {
//     const res = await fetch(
//       `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
//         query
//       )}&orientation=landscape&client_id=${
//         process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
//       }`
//     );
//     const data = await res.json();
//     return data.urls?.regular
//       ? `${data.urls.regular}&auto=format&fit=crop&w=800&q=75`
//       : null;
//   } catch (err) {
//     console.warn("⚠️ Unsplash fetch failed:", err.message);
//     return null;
//   }
// }

// // === 🔹 Generer nytt bilde med DALL·E 3 og trygg GPT-fallback ===
// export async function generateDalleImage(title, topic, tone, category) {
//   async function runDalle(prompt, label = "primary") {
//     try {
//       const result = await openai.images.generate({
//         model: "dall-e-3",
//         prompt,
//         size: "1024x1024",
//         response_format: "b64_json",
//       });

//       const b64 = result?.data?.[0]?.b64_json;
//       if (!b64) throw new Error("DALL·E returned no base64 data");

//       // ✅ Optimaliser til WebP
//       const optimized = await sharp(Buffer.from(b64, "base64"))
//         .resize({ width: 800 })
//         .toFormat("webp", { quality: 80 })
//         .toBuffer();

//       const filename = `${category}-${Date.now()}-${label}.webp`;
//       const path = `curiowire/${filename}`;

//       const { error } = await supabase.storage
//         .from("curiowire")
//         .upload(path, optimized, {
//           contentType: "image/webp",
//           upsert: true,
//         });
//       if (error) throw error;

//       const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
//       console.log(`🎨 DALL·E 3 → Supabase OK for ${category} (${label})`);
//       return data.publicUrl;
//     } catch (err) {
//       console.error(`❌ DALL·E 3 ${label} error for ${category}:`, err.message);
//       throw err;
//     }
//   }

//   // --- Første prompt ---
//   const imagePrompt = `
// Cinematic editorial illustration for "${title}" (${category}).
// Core idea: ${topic}.
// Mood & tone: ${tone}.
// Style: realistic, symbolic, cinematic — no text, words or logos.
// `;

//   try {
//     // 🎨 Første forsøk
//     return await runDalle(imagePrompt, "primary");
//   } catch (err) {
//     if (err.message?.includes("safety system")) {
//       console.warn(
//         "⚠️ DALL·E safety rejection — retrying with softer prompt..."
//       );

//       // ✂️ Rens farlige ord
//       const safePrompt = imagePrompt
//         .replace(/\b(eat|kill|attack|bite|dead|dying|blood|fight|prey)\b/gi, "")
//         .replace(/\s+/g, " ")
//         .trim();

//       const retryPrompt = `
// Editorial wildlife illustration for "${title}" (${category}).
// Scene: natural coexistence between animals — educational and documentary style.
// Core idea: ${safePrompt}.
// Mood: calm, natural, cinematic, without any violence.
// Style: National Geographic photography, realistic lighting, no text or logos.
// `;

//       try {
//         // 🎨 Trygt nytt forsøk
//         return await runDalle(retryPrompt, "safe-retry");
//       } catch (retryErr) {
//         console.warn(
//           "⚠️ Second DALL·E retry failed, switching to GPT fallback..."
//         );

//         // 🧠 GPT fallback — be modellen foreslå trygg prompt
//         try {
//           const gptPromptResponse = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//               {
//                 role: "user",
//                 content: `Suggest a safe, creative image concept for a news article titled "${title}".
// Topic: ${topic}.
// Avoid violence, injury, or conflict.
// Describe a single visually appealing and symbolic scene in one sentence for DALL·E.`,
//               },
//             ],
//             max_tokens: 50,
//             temperature: 0.7,
//           });

//           const safeConcept =
//             gptPromptResponse.choices[0]?.message?.content?.trim() ||
//             "symbolic abstract concept of curiosity and discovery";

//           const gptFallbackPrompt = `
// Editorial illustration for "${title}" (${category}).
// Concept: ${safeConcept}.
// Mood: thoughtful, calm, cinematic lighting.
// Style: magazine illustration — symbolic, clean, no text or logos.
// `;

//           // 🪄 Endelig forsøk med trygg GPT-prompt
//           return await runDalle(gptFallbackPrompt, "gpt-fallback");
//         } catch (gptErr) {
//           console.error("❌ GPT fallback also failed:", gptErr.message);
//           return null;
//         }
//       }
//     }

//     // Andre typer feil (nettverk/API)
//     console.error(`❌ DALL·E 3 error for ${category}:`, err.message);
//     return null;
//   }
// }

// // === 🔹 Cache eksisterende bilde til Supabase som optimalisert WebP ===
// export async function cacheImageToSupabase(imageUrl, filename, category) {
//   try {
//     const res = await fetch(imageUrl);
//     if (!res.ok) return imageUrl;

//     // ✅ riktig: hent data som arrayBuffer
//     const optimized = await sharp(Buffer.from(await res.arrayBuffer()))
//       .resize({ width: 800 })
//       .toFormat("webp", { quality: 80 })
//       .toBuffer();

//     const path = `curiowire/${filename}.webp`;
//     const { error } = await supabase.storage
//       .from("curiowire")
//       .upload(path, optimized, { contentType: "image/webp", upsert: true });
//     if (error) throw error;

//     const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
//     return data.publicUrl;
//   } catch (err) {
//     console.error(`❌ Cache failed for ${category}:`, err.message);
//     return imageUrl;
//   }
// }

// === app/api/utils/imageTools.js ===
// 🖼️ CurioWire intelligent image generation & caching
// Optimalisert for Ultra-Lite Vision v3.0 (2025)
// Fungerer i både GitHub Actions og Vercel

import sharp from "sharp";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// === OpenAI-klient ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// === Supabase-klient (trygg for alle miljøer) ===
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ============================================================================================
   🔹 1. Backup Unsplash-fallback (hvis absolutt alt feiler)
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

    const data = await res.json();
    return data.urls?.regular
      ? `${data.urls.regular}&auto=format&fit=crop&w=800&q=75`
      : null;
  } catch (err) {
    console.warn("⚠️ Unsplash fetch failed:", err.message);
    return null;
  }
}

/* ============================================================================================
   🔹 2. DALL·E 3 generering — robust, med fallback & Supabase-upload
   ============================================================================================ */
export async function generateDalleImage(title, topic, tone, category) {
  async function runDalle(prompt, label = "primary") {
    try {
      const result = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        response_format: "b64_json",
      });

      const b64 = result?.data?.[0]?.b64_json;
      if (!b64) throw new Error("DALL·E returned no base64 data");

      // Optimaliser → 800px WebP
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
      console.log(`🎨 DALL·E 3 → Supabase OK for ${category} (${label})`);
      return data.publicUrl;
    } catch (err) {
      console.error(`❌ DALL·E 3 ${label} error for ${category}:`, err.message);
      throw err;
    }
  }

  // — Første hovedprompt —
  const imagePrompt = `
Cinematic editorial illustration for "${title}" (${category}).
Core idea: ${topic}.
Mood & tone: ${tone}.
Style: realistic, symbolic, cinematic — no text, words or logos.
`;

  try {
    // Første forsøk
    return await runDalle(imagePrompt, "primary");
  } catch (err) {
    // Sikkerhetsavslag → prøve trygt
    if (err.message?.includes("safety system")) {
      console.warn("⚠️ DALL·E safety rejection — retrying with soft prompt...");

      const safePrompt = imagePrompt
        .replace(/\b(eat|kill|fight|bite|dead|blood|prey)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      const retryPrompt = `
Editorial wildlife illustration for "${title}" (${category}).
Scene: natural coexistence — documentary realism, no violence.
Core idea: ${safePrompt}.
Mood: calm, cinematic, natural.
Style: National Geographic photography — no text or logos.
`;

      try {
        return await runDalle(retryPrompt, "safe-retry");
      } catch (retryErr) {
        console.warn("⚠️ Second retry failed — switching to GPT prompt...");

        // GPT → genererer trygg og estetisk setning
        try {
          const gptResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `Suggest a safe, creative image concept for a news article titled "${title}". Topic: ${topic}. Avoid violence, harm, or distress. Describe one symbolic scene in one sentence.`,
              },
            ],
            max_tokens: 50,
            temperature: 0.7,
          });

          const safeConcept =
            gptResponse.choices[0]?.message?.content?.trim() ||
            "symbolic abstract concept of curiosity and discovery";

          const finalPrompt = `
Editorial illustration for "${title}" (${category}).
Concept: ${safeConcept}.
Mood: thoughtful, calm, cinematic.
Style: symbolic, modern magazine illustration — no text or logos.
`;

          return await runDalle(finalPrompt, "gpt-fallback");
        } catch (gptErr) {
          console.error("❌ GPT fallback also failed:", gptErr.message);
          return null;
        }
      }
    }

    // Andre typer feil
    console.error(`❌ DALL·E 3 error for ${category}:`, err.message);
    return null;
  }
}

/* ============================================================================================
   🔹 3. Cache et eksisterende bilde i Supabase som optimalisert WebP
   ============================================================================================ */
export async function cacheImageToSupabase(imageUrl, filename, category) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return imageUrl;

    const optimized = await sharp(Buffer.from(await res.arrayBuffer()))
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
    console.error(`❌ Cache failed for ${category}:`, err.message);
    return imageUrl;
  }
}
