// // === CurioWire Intelligent Image Selector v3.7.1 ===
// // Kombinerer artikkelinnhold + GPT-analyse for å finne eller generere
// // det mest relevante bildet for hver artikkel.
// //
// // • Prioritert flyt:
// //   AI-først kategorier  → DALL·E 3 først, deretter Wikimedia / Pexels / Unsplash
// //   Foto-først kategorier → Wikimedia / Pexels / Unsplash først, DALL·E 3 kun som fallback
// //
// // • Relevansvurdering: GPT-basert 0–100 score
// // • Minimum aksept: 75 %
// // • Alle valgte bilder caches til Supabase via imageTools.js
// //

// import OpenAI from "openai";
// import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
// const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

// /* === SETT GRENSE FOR HVA SOM AKSEPTABEL BILDEMATCH IFT ARTIKKELINNHOLD === */
// export const MIN_ACCEPTABLE_SCORE = 75;

// /* === 🔹 1. Bygg detaljert bildebeskrivelse ut fra artikkel === */
// export async function buildImageQuery(article, title, category) {
//   const prompt = `
// Given the following CurioWire article, write a short (max 12 words) visual description
// that captures the most relevant scene or subject for illustration.
// Return ONLY the description – no punctuation, quotes or commentary.

// Title: "${title}"
// Category: ${category}
// Article:
// ${article}
// `;

//   const r = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//     max_tokens: 25,
//     temperature: 0.4,
//   });
//   return r.choices[0]?.message?.content?.trim() || title;
// }

// /* === 🔹 refineVisualConcept v3.6.1 === */
// export async function refineVisualConcept(
//   detailedQuery,
//   title,
//   category,
//   article = ""
// ) {
//   const detectPrompt = `
// From the TITLE and TEXT below, identify if this article clearly centers on a *specific famous person*
// (e.g., "Einstein", "Trump", "Da Vinci", "Van Gogh") OR a *specific historical structure or monument*
// (e.g., "Colosseum", "Stonehenge", "Pyramids", "Mona Lisa", "Taj Mahal").
// If yes, return ONLY that proper name or term (1–2 words, lowercase). If none, return "none".

// Title: "${title}"
// Excerpt: "${article.slice(0, 400)}"
// `;

//   let detected = "none";
//   try {
//     const det = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: detectPrompt }],
//       max_tokens: 8,
//       temperature: 0,
//     });
//     detected = (det.choices[0]?.message?.content || "").trim().toLowerCase();
//   } catch {
//     detected = "none";
//   }

//   if (detected !== "none" && detected.length > 2) {
//     console.log(`📌 Detected famous subject → using only "${detected}"`);
//     return detected;
//   }

//   const refinePrompt = `
// You are an expert photo editor preparing STOCK PHOTO search keywords for an online article.
// Analyze BOTH the title and the article excerpt together — weigh them equally.
// Choose words that best describe a visual scene fitting both.

// Title: "${title}"
// Category: ${category}
// Excerpt: "${article.slice(0, 400)}"
// Additional text: "${detailedQuery}"

// Goal:
// - Output exactly TWO descriptive, visual search words (noun or adjective+noun).
// - Avoid filler words ("the", "of", "and") and abstract concepts.
// - Prioritize imagery typical for this category:
//   SPACE → rocket, star, planet, satellite, galaxy
//   HISTORY → war, ruins, empire, revolution, artifact
//   NATURE → forest, storm, wildlife, drought, flood
//   HEALTH → brain, therapy, hospital, stress, vaccine
//   TECHNOLOGY → ai, robot, circuit, lab, innovation
//   CULTURE → art, painting, film, festival, architecture
//   PRODUCTS → design, gadget, tool, watch, device
//   SPORTS → athlete, stadium, race, football, competition
//   WORLD → travel, skyline, street, city, architecture
// Return exactly two lowercase words.
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: refinePrompt }],
//       max_tokens: 12,
//       temperature: 0.25,
//     });

//     let concept = (r.choices[0]?.message?.content || "").trim();
//     concept = concept.replace(/[^a-zA-Z\s]/g, "").toLowerCase();
//     const words = concept.split(/\s+/).filter(Boolean).slice(0, 2);
//     let sanitized = words.join(" ");
//     if (words.length < 2)
//       sanitized = detailedQuery.split(" ").slice(0, 2).join(" ").toLowerCase();

//     console.log(`🎨 Final visual concept → "${sanitized}"`);
//     return sanitized;
//   } catch (err) {
//     console.warn("⚠️ refineVisualConcept failed:", err.message);
//     return detailedQuery.split(" ").slice(0, 2).join(" ").toLowerCase();
//   }
// }

// /* === 🔹 3. Bildekildesøk === */
// export async function searchWikimediaImages(query) {
//   try {
//     const searchUrl = `https://api.wikimedia.org/core/v1/commons/search/page?q=${encodeURIComponent(
//       query
//     )}&limit=10`;
//     const res = await fetch(searchUrl, {
//       headers: { "User-Agent": "CurioWire/1.0 (curiowire.app@gmail.com)" },
//     });
//     if (!res.ok) return [];
//     const data = await res.json();
//     const pages = data?.pages || [];
//     if (!Array.isArray(pages) || !pages.length) return [];

//     const urls = [];
//     let count = 0;
//     for (const p of pages) {
//       if (count >= 10) break;
//       const title = p.key || p.title;
//       if (!title) continue;
//       const fileUrl = `https://api.wikimedia.org/core/v1/commons/file/${encodeURIComponent(
//         title.replace(/^File:/i, "File:")
//       )}`;
//       try {
//         const fileRes = await fetch(fileUrl, {
//           headers: { "User-Agent": "CurioWire/1.0 (curiowire.app@gmail.com)" },
//         });
//         if (!fileRes.ok) continue;
//         const fileData = await fileRes.json();
//         const fullUrl =
//           fileData?.original?.url ||
//           fileData?.preferred?.url ||
//           (p.thumbnail?.url
//             ? "https:" + p.thumbnail.url.replace(/^https?:/, "")
//             : null);
//         if (fullUrl && /\.(jpg|jpeg|png|webp)$/i.test(fullUrl)) {
//           urls.push(fullUrl.startsWith("http") ? fullUrl : "https:" + fullUrl);
//           count++;
//         }
//       } catch {}
//     }
//     return urls;
//   } catch {
//     return [];
//   }
// }

// export async function searchPexelsImages(query) {
//   const res = await fetch(
//     `https://api.pexels.com/v1/search?query=${encodeURIComponent(
//       query
//     )}&per_page=10`,
//     {
//       headers: { Authorization: PEXELS_KEY },
//     }
//   );
//   const data = await res.json();
//   return data.photos?.map((p) => p.src?.large) || [];
// }

// export async function searchUnsplashImages(query) {
//   const res = await fetch(
//     `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
//       query
//     )}&per_page=10&client_id=${UNSPLASH_KEY}`
//   );
//   const data = await res.json();
//   return data.results?.map((r) => r.urls?.regular) || [];
// }

// /* === 🔹 4. Relevansvurdering === */
// export async function evaluateImageRelevance(imageUrl, title, article) {
//   const prompt = `
// You are an art editor selecting an image for a feature article.
// Estimate how well this image fits the article below. Return only a number 0–100.

// Image URL: ${imageUrl}
// Title: ${title}
// Article: ${article.slice(0, 500)}
// `;
//   const r = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//     max_tokens: 10,
//     temperature: 0,
//   });
//   const score = parseFloat(r.choices[0]?.message?.content?.trim() || "0");
//   return isNaN(score) ? 0 : score;
// }

// /* === 🔹 6. Simplified noun+adjective fallback === */
// /* === 🔹 6. Simplified Fallback Search (noun + simple adjective) v3.8 === */
// async function simplifiedImageSearch(title, article, category) {
//   // --- whitelist for enkle adjektiv ---
//   const SIMPLE_ADJECTIVES = [
//     "ancient",
//     "modern",
//     "dark",
//     "bright",
//     "peaceful",
//     "broken",
//     "angry",
//     "happy",
//     "red",
//     "blue",
//     "crowded",
//     "empty",
//     "night",
//     "day",
//     "classic",
//     "old",
//     "new",
//     "famous",
//     "vintage",
//     "historic",
//     "futuristic",
//   ];

//   // --- 0️⃣ Forsøk å hente direkte egennavn/merke/sted fra tittel ---
//   const knownNames = [
//     "trump",
//     "zelensky",
//     "biden",
//     "putin",
//     "messi",
//     "ronaldo",
//     "tesla",
//     "apple",
//     "google",
//     "amazon",
//     "microsoft",
//     "xbox",
//     "playstation",
//     "colosseum",
//     "stonehenge",
//     "disneyland",
//     "nasa",
//     "gazastrip",
//     "gaza",
//     "eiffel tower",
//     "pyramids",
//     "rome",
//   ];
//   const lowerText = (title + " " + article).toLowerCase();
//   const found = knownNames.find((n) => lowerText.includes(n));
//   if (found) {
//     console.log(`📍 Found known name/brand in text → using "${found}"`);
//     return { url: null, source: "keyword", phrase: found };
//   }

//   // 1️⃣ Finn hoved-substantivet (GPT)
//   const nounPrompt = `
// From the TITLE and ARTICLE below, choose ONE concrete visible noun
// (person, object, animal, place, monument, or brand) that best represents the content.
// If a famous name, monument, or brand is mentioned, prefer that.
// Return one lowercase word or short proper name (max two words).

// Title: "${title}"
// Article: "${article.slice(0, 400)}"
//   `;
//   const nounResp = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: nounPrompt }],
//     max_tokens: 8,
//     temperature: 0.2,
//   });
//   const noun = (nounResp.choices[0]?.message?.content || "")
//     .trim()
//     .toLowerCase();

//   // 2️⃣ Finn ett enkelt adjektiv
//   const adjPrompt = `
// Pick ONE simple, visual adjective (from: ${SIMPLE_ADJECTIVES.join(", ")})
// that naturally describes "${noun}" in a photo context.
// If none fits, return "none".

// Title: "${title}"
// Article: "${article.slice(0, 400)}"
//   `;
//   const adjResp = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: adjPrompt }],
//     max_tokens: 5,
//     temperature: 0.3,
//   });
//   let adj = (adjResp.choices[0]?.message?.content || "").trim().toLowerCase();
//   if (!SIMPLE_ADJECTIVES.includes(adj)) {
//     adj =
//       SIMPLE_ADJECTIVES[Math.floor(Math.random() * SIMPLE_ADJECTIVES.length)];
//   }

//   const phrase = adj === "none" ? noun : `${adj} ${noun}`;
//   console.log(`🪶 Simplified fallback phrase → "${phrase}"`);

//   // 3️⃣ Kjør hurtigsøk (2–3 bilder per kilde)
//   const sources = [
//     { name: "Wikimedia", fn: searchWikimediaImages },
//     { name: "Pexels", fn: searchPexelsImages },
//     { name: "Unsplash", fn: searchUnsplashImages },
//   ];
//   const candidates = [];

//   for (const src of sources) {
//     try {
//       const urls = (await src.fn(phrase)).slice(0, 3);
//       await Promise.all(
//         urls.map(async (url) => {
//           const score = await evaluateImageRelevance(url, title, article);
//           candidates.push({ url, source: src.name, score });
//         })
//       );
//     } catch (err) {
//       console.warn(`⚠️ Fallback search failed for ${src.name}:`, err.message);
//     }
//   }

//   if (!candidates.length) return null;

//   const best = candidates.sort((a, b) => b.score - a.score)[0];
//   if (best.score < 60) return null; // lavere terskel for bredere treff
//   console.log(`✅ Simplified fallback selected (${best.score}%) → ${best.url}`);
//   return best;
// }

// /* === 🔹 5. Samlet bildeflyt === */
// export async function selectBestImage(
//   title,
//   article,
//   category,
//   imagePref = "photo"
// ) {
//   try {
//     console.log(
//       `🖼️  Selecting image for ${category.toUpperCase()}: "${title}"`
//     );

//     if (imagePref === "dalle") {
//       const visualPrompt = await buildImageQuery(article, title, category);
//       const dalle = await generateDalleImage(
//         title,
//         visualPrompt,
//         "cinematic",
//         category
//       );
//       if (dalle) {
//         const cached = await cacheImageToSupabase(
//           dalle,
//           `${category}-${Date.now()}`,
//           category
//         );
//         console.log(`✅ DALL·E 3 image generated successfully`);
//         return { imageUrl: cached, source: "DALL·E", score: 100 };
//       }
//       imagePref = "photo";
//     }

//     const detailed = await buildImageQuery(article, title, category);
//     const refined = await refineVisualConcept(
//       detailed,
//       title,
//       category,
//       article
//     );

//     console.log(`🎨 Visual concept refined (title-weighted): "${refined}"`);
//     const candidates = [];
//     const sources = [
//       { name: "Wikimedia", fn: searchWikimediaImages },
//       { name: "Pexels", fn: searchPexelsImages },
//       { name: "Unsplash", fn: searchUnsplashImages },
//     ];

//     for (const src of sources) {
//       try {
//         const urls = await src.fn(refined);
//         await Promise.all(
//           urls.map(async (url) => {
//             const score = await evaluateImageRelevance(url, title, article);
//             candidates.push({ url, source: src.name, score });
//           })
//         );
//         console.log(`🔎 ${src.name}: ${urls.length} images evaluated`);
//       } catch (err) {
//         console.warn(`⚠️ ${src.name} fetch failed:`, err.message);
//       }
//     }

//     const strongCandidates = candidates.filter(
//       (c) => c.score >= MIN_ACCEPTABLE_SCORE
//     );
//     if (!strongCandidates.length) {
//       console.log(
//         "🧠 No image ≥75% → trying simplified noun-based fallback..."
//       );
//       const simple = await simplifiedImageSearch(title, article, category);
//       if (simple) {
//         const cached = await cacheImageToSupabase(
//           simple.url,
//           `${category}-${Date.now()}`,
//           category
//         );
//         return { imageUrl: cached, source: simple.source, score: simple.score };
//       }
//       console.log("🧠 Simplified fallback failed → generating with DALL·E 3");
//       const dallePrompt = await buildImageQuery(article, title, category);
//       const dalleImg = await generateDalleImage(
//         title,
//         dallePrompt,
//         "cinematic",
//         category
//       );
//       const cached = await cacheImageToSupabase(
//         dalleImg,
//         `${category}-${Date.now()}`,
//         category
//       );
//       return { imageUrl: cached, source: "DALL·E", score: 100 };
//     }

//     const contextChecked = [];
//     await Promise.all(
//       strongCandidates.map(async (c) => {
//         const contextPrompt = `
// You are an experienced image editor verifying if this photo is suitable for the article.

// - Mark "OK" if the image thematically matches the topic or mood, even if it does not show the exact event.
// - Mark "NEUTRAL" if it is generic but acceptable (e.g. a general photo of soldiers for an article about a military incident).
// - Mark "MISMATCH" only if it clearly contradicts the article (e.g. wrong subject, wrong context, wrong era, cartoon instead of photo).

// Minor, but not huge, differences in location, time period, or participants are perfectly acceptable.
// Return one word only: OK, NEUTRAL, or MISMATCH.
// `;

//         try {
//           const contextResp = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [{ role: "user", content: contextPrompt }],
//             max_tokens: 5,
//             temperature: 0,
//           });
//           const result = contextResp.choices[0]?.message?.content
//             ?.trim()
//             .toUpperCase();
//           if (result === "OK" || result === "NEUTRAL")
//             contextChecked.push({ ...c, context: result });
//         } catch {}
//       })
//     );

//     if (!contextChecked.length) {
//       console.log("🧠 No contextually valid image → simplified fallback...");
//       const simple = await simplifiedImageSearch(title, article, category);
//       if (simple) {
//         const cached = await cacheImageToSupabase(
//           simple.url,
//           `${category}-${Date.now()}`,
//           category
//         );
//         return { imageUrl: cached, source: simple.source, score: simple.score };
//       }
//       const dallePrompt = await buildImageQuery(article, title, category);
//       const dalleImg = await generateDalleImage(
//         title,
//         dallePrompt,
//         "cinematic",
//         category
//       );
//       const cached = await cacheImageToSupabase(
//         dalleImg,
//         `${category}-${Date.now()}`,
//         category
//       );
//       return { imageUrl: cached, source: "DALL·E", score: 100 };
//     }

//     const best = contextChecked.sort((a, b) => b.score - a.score)[0];
//     const cached = await cacheImageToSupabase(
//       best.url,
//       `${category}-${Date.now()}`,
//       category
//     );
//     console.log(
//       `✅ Selected ${best.source} (${best.score}%) [${best.context}] → ${best.url}`
//     );
//     return { imageUrl: cached, source: best.source, score: best.score };
//   } catch (err) {
//     console.error("❌ selectBestImage error:", err.message);
//     return {
//       imageUrl: `https://picsum.photos/seed/${category}/800/400`,
//       source: "Fallback",
//       score: 0,
//     };
//   }
// }

// === CurioWire Intelligent Image Selector v4.1 — NounCore Hybrid ===
// Kombinerer enkel substantivlogikk med fleksibel kategori-prioritering.
//
// • AI-first kategorier → DALL·E 3 først, deretter Wikimedia / Pexels / Unsplash
// • Photo-first kategorier → Stock først, DALL·E 3 kun som fallback
// • Relevansvurdering: GPT-basert 0–100 score
// • Minimum aksept: 75 %
// • Alle valgte bilder caches til Supabase via imageTools.js
//

// === CurioWire Intelligent Image Selector v4.0 ===
// Forenklet og forbedret: velger bilde basert på artikkelens kjerne-substantiv.
//
// • Finder ett sentralt substantiv (hva/hvem artikkelen handler om)
// • Søker bilder fra Wikimedia, Pexels og Unsplash
// • Vurderer relevans (0–100) og velger høyest score
// • Bruker DALL·E først eller sist basert på kategoriens image-preferanse
// • Alle valgte bilder caches til Supabase via imageTools.js
// -------------------------------------------------------------

import OpenAI from "openai";
import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
import { categories } from "./categories.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export const MIN_ACCEPTABLE_SCORE = 75;

/* === 🔹 1. Finn sentralt substantiv ("Hva/hvem handler artikkelen om?") === */
export async function getCoreNoun(title, article) {
  const prompt = `
You are a precise photo editor choosing the main search keyword for a news article.
From the TITLE and ARTICLE below, identify *the single most central visible noun* —
the person, object, animal, place, monument, or brand the story is really about.

If multiple are mentioned, pick the most visually specific or recognizable.
Return only one or two words, lowercase, no punctuation.

Title: "${title}"
Article: "${article.slice(0, 600)}"
`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 10,
    temperature: 0.2,
  });

  const noun = (r.choices[0]?.message?.content || "").trim().toLowerCase();
  console.log(`🧩 Core noun detected → "${noun}"`);
  return noun || "concept";
}

/* === 🔹 2. Bildekildesøk === */
export async function searchWikimediaImages(query) {
  try {
    const res = await fetch(
      `https://api.wikimedia.org/core/v1/commons/search/page?q=${encodeURIComponent(
        query
      )}&limit=10`,
      { headers: { "User-Agent": "CurioWire/1.0 (curiowire.app@gmail.com)" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.pages || [];
    const urls = [];

    for (const p of pages) {
      const file = p.key || p.title;
      if (!file) continue;
      const f = await fetch(
        `https://api.wikimedia.org/core/v1/commons/file/${encodeURIComponent(
          file.replace(/^File:/i, "File:")
        )}`,
        { headers: { "User-Agent": "CurioWire/1.0" } }
      );
      if (!f.ok) continue;
      const info = await f.json();
      const url =
        info?.original?.url ||
        info?.preferred?.url ||
        (p.thumbnail?.url ? "https:" + p.thumbnail.url : null);
      if (url && /\.(jpg|jpeg|png|webp)$/i.test(url)) urls.push(url);
      if (urls.length >= 10) break;
    }
    return urls;
  } catch {
    return [];
  }
}

export async function searchPexelsImages(query) {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query
      )}&per_page=10`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    const data = await res.json();
    return data.photos?.map((p) => p.src?.large) || [];
  } catch {
    return [];
  }
}

export async function searchUnsplashImages(query) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=10&client_id=${UNSPLASH_KEY}`
    );
    const data = await res.json();
    return data.results?.map((r) => r.urls?.regular) || [];
  } catch {
    return [];
  }
}

/* === 🔹 3. Vurder bilde mot artikkel === */
export async function evaluateImageRelevance(imageUrl, title, article) {
  const prompt = `
Rate how well this image fits the article below on a scale 0–100.
Return only a number (no text).

Image: ${imageUrl}
Title: ${title}
Excerpt: ${article.slice(0, 500)}
`;
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6,
      temperature: 0,
    });
    const score = parseFloat(r.choices[0]?.message?.content?.trim() || "0");
    return isNaN(score) ? 0 : score;
  } catch {
    return 0;
  }
}

/* === 🔹 4. Hovedflyt basert på kategoriens image-preferanse === */
export async function selectBestImage(title, article, category) {
  try {
    console.log(`🖼️ Selecting image for ${category.toUpperCase()}: "${title}"`);

    const core = await getCoreNoun(title, article);

    // Hent kategoriens image-preferanse fra categories.js
    const imagePref =
      categories[category]?.image === "dalle" ? "dalle" : "photo";
    console.log(
      `⚙️ Category priority: ${
        imagePref === "dalle"
          ? "AI-first (DALL·E first)"
          : "Photo-first (stock first)"
      }`
    );

    const sources = [
      { name: "Wikimedia", fn: searchWikimediaImages },
      { name: "Pexels", fn: searchPexelsImages },
      { name: "Unsplash", fn: searchUnsplashImages },
    ];
    const candidates = [];

    /* === AI-FIRST → DALL·E først === */
    if (imagePref === "dalle") {
      console.log("🎨 AI-first category → generating with DALL·E 3 first...");
      const dallePrompt = `Photo of ${core}, realistic, editorial style`;
      const dalleImg = await generateDalleImage(
        title,
        dallePrompt,
        "cinematic",
        category
      );
      if (dalleImg) {
        const cached = await cacheImageToSupabase(
          dalleImg,
          `${category}-${Date.now()}`,
          category
        );
        console.log(`✅ DALL·E 3 image generated successfully`);
        return { imageUrl: cached, source: "DALL·E", score: 100 };
      }
    }

    /* === FOTO-FIRST (eller DALL·E feilet) === */
    for (const src of sources) {
      try {
        const urls = await src.fn(core);
        await Promise.all(
          urls.map(async (url) => {
            const score = await evaluateImageRelevance(url, title, article);
            candidates.push({ url, source: src.name, score });
          })
        );
        console.log(`🔎 ${src.name}: ${urls.length} images evaluated`);
      } catch (err) {
        console.warn(`⚠️ ${src.name} fetch failed:`, err.message);
      }
    }

    const strong = candidates.filter((c) => c.score >= MIN_ACCEPTABLE_SCORE);
    if (strong.length) {
      const best = strong.sort((a, b) => b.score - a.score)[0];
      const cached = await cacheImageToSupabase(
        best.url,
        `${category}-${Date.now()}`,
        category
      );
      console.log(`✅ Selected ${best.source} (${best.score}%) → ${best.url}`);
      return { imageUrl: cached, source: best.source, score: best.score };
    }

    /* === FALLBACK: DALL·E etter mislykket stock-søk === */
    console.log("🧠 No suitable stock image → generating with DALL·E 3...");
    const dallePrompt = `Photo of ${core}, realistic, editorial style`;
    const dalleImg = await generateDalleImage(
      title,
      dallePrompt,
      "cinematic",
      category
    );
    const cached = await cacheImageToSupabase(
      dalleImg,
      `${category}-${Date.now()}`,
      category
    );
    return { imageUrl: cached, source: "DALL·E", score: 100 };
  } catch (err) {
    console.error("❌ selectBestImage error:", err.message);
    return {
      imageUrl: `https://picsum.photos/seed/${category}/800/400`,
      source: "Fallback",
      score: 0,
    };
  }
}
