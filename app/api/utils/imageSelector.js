// import OpenAI from "openai";
// import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
// import { categories } from "./categories.js";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
// const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

// export const MIN_ACCEPTABLE_SCORE = 75;

// /* ============================================================================================
//    🔹 1. Finn sentralt substantiv («Hva/hvem handler artikkelen om?»)
//    ============================================================================================ */
// export async function getCoreNoun(title, article) {
//   const prompt = `
// You are a precise photo editor choosing the main search keyword for a news article.
// From the TITLE and ARTICLE below, identify *the single most central visible noun* —
// the person, object, animal, place, monument, or brand the story is really about.

// If multiple are mentioned, pick the most visually specific or recognizable.
// Return only one or two words, lowercase, no punctuation.

// Title: "${title}"
// Article: "${article.slice(0, 600)}"
// `;

//   const r = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//     max_tokens: 10,
//     temperature: 0.2,
//   });

//   const noun = (r.choices[0]?.message?.content || "").trim().toLowerCase();
//   console.log(`🧩 Core noun detected → "${noun}"`);
//   return noun || "concept";
// }

// /* ============================================================================================
//    🔹 2. Bildesøkere
//    ============================================================================================ */
// // export async function searchWikimediaImages(query) {
// //   try {
// //     const res = await fetch(
// //       `https://api.wikimedia.org/core/v1/commons/search/page?q=${encodeURIComponent(
// //         query
// //       )}&limit=10`,
// //       { headers: { "User-Agent": "CurioWire/1.0 (curiowire.app@gmail.com)" } }
// //     );
// //     if (!res.ok) return [];
// //     const data = await res.json();
// //     const pages = data?.pages || [];
// //     const urls = [];

// //     for (const p of pages) {
// //       const file = p.key || p.title;
// //       if (!file) continue;
// //       const f = await fetch(
// //         `https://api.wikimedia.org/core/v1/commons/file/${encodeURIComponent(
// //           file.replace(/^File:/i, "File:")
// //         )}`,
// //         { headers: { "User-Agent": "CurioWire/1.0" } }
// //       );
// //       if (!f.ok) continue;
// //       const info = await f.json();
// //       const url =
// //         info?.original?.url ||
// //         info?.preferred?.url ||
// //         (p.thumbnail?.url ? "https:" + p.thumbnail.url : null);
// //       if (url && /\.(jpg|jpeg|png|webp)$/i.test(url)) urls.push(url);
// //       if (urls.length >= 10) break;
// //     }
// //     return urls;
// //   } catch {
// //     return [];
// //   }
// // }

// export async function searchWikimediaImages(query) {
//   const endpoint =
//     "https://commons.wikimedia.org/w/api.php" +
//     `?action=query` +
//     `&format=json` +
//     `&prop=imageinfo` +
//     `&generator=search` +
//     `&gsrnamespace=6` + // ONLY FILE PAGES
//     `&gsrsearch=${encodeURIComponent(query)}` +
//     `&gsrlimit=20` +
//     `&iiprop=url|size|mime` +
//     `&origin=*`;

//   try {
//     const res = await fetch(endpoint);
//     if (!res.ok) return [];

//     const data = await res.json();
//     if (!data.query?.pages) return [];

//     const pages = Object.values(data.query.pages);

//     return pages
//       .map((p) => p.imageinfo?.[0])
//       .filter(
//         (info) =>
//           info?.url &&
//           /\.(jpg|jpeg|png|webp)$/i.test(info.url) && // only real images
//           info.width >= 600 // prevent tiny thumbnails
//       )
//       .map((info) => info.url);
//   } catch (err) {
//     console.error("Wikimedia error:", err);
//     return [];
//   }
// }

// export async function searchPexelsImages(query) {
//   try {
//     const res = await fetch(
//       `https://api.pexels.com/v1/search?query=${encodeURIComponent(
//         query
//       )}&per_page=10`,
//       { headers: { Authorization: PEXELS_KEY } }
//     );
//     const data = await res.json();
//     return data.photos?.map((p) => p.src?.large) || [];
//   } catch {
//     return [];
//   }
// }

// export async function searchUnsplashImages(query) {
//   try {
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
//         query
//       )}&per_page=10&client_id=${UNSPLASH_KEY}`
//     );
//     const data = await res.json();
//     return data.results?.map((r) => r.urls?.regular) || [];
//   } catch {
//     return [];
//   }
// }

// /* ============================================================================================
//    🔹 3A. describeImage: Beskriv hva som faktisk er i bildet
//    ============================================================================================ */
// async function describeImage(imageUrl) {
//   const prompt = `
// You are an image analyst. Describe ONLY what is visually present in this image.
// Do NOT guess missing information.
// Return a single short factual sentence.

// Image URL: ${imageUrl}
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 40,
//       temperature: 0.1,
//     });

//     return r.choices[0]?.message?.content?.trim() || "";
//   } catch (err) {
//     console.warn("⚠️ describeImage failed:", err.message);
//     return "";
//   }
// }

// /* ============================================================================================
//    🔹 3B. semanticMatch: Sjekk om bildefaktisk handler om core noun
//    ============================================================================================ */
// async function semanticMatch(core, description) {
//   const prompt = `
// Determine if the image description matches the intended subject.

// Subject: "${core}"
// Image shows: "${description}"

// Respond ONLY with: yes or no.
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 2,
//       temperature: 0,
//     });

//     const reply = r.choices[0]?.message?.content?.trim().toLowerCase();
//     return reply === "yes";
//   } catch (err) {
//     console.warn("⚠️ semanticMatch failed:", err.message);
//     return false;
//   }
// }

// /* ============================================================================================
//    🔹 3C. evaluateImageRelevance (oppgradert)
//    ============================================================================================ */
// export async function evaluateImageRelevance(
//   imageUrl,
//   title,
//   article,
//   coreNoun
// ) {
//   try {
//     // 1. Beskriv bildet
//     const description = await describeImage(imageUrl);

//     // 2. Semantisk match
//     const isSemanticMatch = await semanticMatch(coreNoun, description);

//     if (!isSemanticMatch) {
//       console.log(
//         `❌ Rejecting image: "${description}" does NOT match subject "${coreNoun}"`
//       );
//       return 0;
//     }

//     // 3. Finkornet relevans-score som ekstra lag
//     const prompt = `
// Rate how well this image fits the article below on a scale 0–100.
// Return only a number.

// Image description: ${description}
// Title: ${title}
// Excerpt: ${article.slice(0, 500)}
// `;

//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 6,
//       temperature: 0,
//     });

//     const score = parseFloat(r.choices[0]?.message?.content?.trim() || "0");
//     return isNaN(score) ? 0 : score;
//   } catch (err) {
//     console.warn("⚠️ evaluateImageRelevance failed:", err.message);
//     return 0;
//   }
// }

// /* ============================================================================================
//    🔹 4. Velg beste bilde (AI-first eller Photo-first)
//    ============================================================================================ */
// export async function selectBestImage(title, article, category) {
//   try {
//     console.log(`🖼️ Selecting image for ${category.toUpperCase()}: "${title}"`);

//     const core = await getCoreNoun(title, article);

//     const imagePref =
//       categories[category]?.image === "dalle" ? "dalle" : "photo";

//     console.log(
//       `⚙️ Category priority: ${
//         imagePref === "dalle"
//           ? "AI-first (DALL·E first)"
//           : "Photo-first (stock first)"
//       }`
//     );

//     const sources = [
//       { name: "Wikimedia", fn: searchWikimediaImages },
//       { name: "Pexels", fn: searchPexelsImages },
//       { name: "Unsplash", fn: searchUnsplashImages },
//     ];

//     const candidates = [];

//     /* === AI-FIRST === */
//     if (imagePref === "dalle") {
//       console.log("🎨 AI-first category → generating with DALL·E 3 first...");
//       const dallePrompt = `Photo of ${core}, realistic, editorial style`;
//       const dalleImg = await generateDalleImage(
//         title,
//         dallePrompt,
//         "cinematic",
//         category
//       );
//       if (dalleImg) {
//         const cached = await cacheImageToSupabase(
//           dalleImg,
//           `${category}-${Date.now()}`,
//           category
//         );
//         return { imageUrl: cached, source: "DALL·E", score: 100 };
//       }
//     }

//     /* === FOTO-FIRST === */
//     for (const src of sources) {
//       try {
//         const urls = await src.fn(core);
//         await Promise.all(
//           urls.map(async (url) => {
//             const score = await evaluateImageRelevance(
//               url,
//               title,
//               article,
//               core
//             );
//             candidates.push({ url, source: src.name, score });
//           })
//         );
//         console.log(`🔎 ${src.name}: ${urls.length} images evaluated`);
//       } catch (err) {
//         console.warn(`⚠️ ${src.name} fetch failed:`, err.message);
//       }
//     }

//     const strong = candidates.filter((c) => c.score >= MIN_ACCEPTABLE_SCORE);

//     if (strong.length) {
//       const best = strong.sort((a, b) => b.score - a.score)[0];
//       const cached = await cacheImageToSupabase(
//         best.url,
//         `${category}-${Date.now()}`,
//         category
//       );
//       console.log(`✅ Selected ${best.source} (${best.score}%) → ${best.url}`);
//       return { imageUrl: cached, source: best.source, score: best.score };
//     }

//     /* === FALLBACK: DALL·E etter mislykket søk === */
//     console.log("🧠 No suitable stock image → generating with DALL·E 3...");
//     const dallePrompt = `Photo of ${core}, realistic, editorial style`;
//     const dalleImg = await generateDalleImage(
//       title,
//       dallePrompt,
//       "cinematic",
//       category
//     );
//     const cached = await cacheImageToSupabase(
//       dalleImg,
//       `${category}-${Date.now()}`,
//       category
//     );
//     return { imageUrl: cached, source: "DALL·E", score: 100 };
//   } catch (err) {
//     console.error("❌ selectBestImage error:", err.message);
//     return {
//       imageUrl: `https://picsum.photos/seed/${category}/800/400`,
//       source: "Fallback",
//       score: 0,
//     };
//   }
// }

// === app/api/utils/imageSelector.js ===
// Intelligent image selection for CurioWire v2.1
// - Core noun extraction
// - Stock search (Wikimedia / Pexels / Unsplash)
// - Vision-based relevance scoring
// - Optional DALL·E generation & Supabase caching

import OpenAI from "openai";
import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
import { categories } from "./categories.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export const MIN_ACCEPTABLE_SCORE = 75;

/* ============================================================================================
   🔹 1. Finn sentralt substantiv («Hva/hvem handler artikkelen VISUELT om?»)
   ============================================================================================ */
export async function getCoreNoun(title, article) {
  const prompt = `
You are selecting the BEST visual search keyword for a news article image.

From the TITLE and ARTICLE, choose ONE or TWO words that describe the most
visually specific subject that should appear in the photo.

Rules:
- Prefer concrete things like: animals, people types, objects, buildings, places, scenes.
- Avoid generic words like: "man", "woman", "person", "people", "city", "world", "culture".
- If the article is about a specific person, place, brand, animal or object → use that.
- If it is about an abstract idea, pick a strong visual symbol (e.g. "data center", "server room").

Return:
- only the keyword(s), lowercase
- no punctuation, no quotes, no explanation.

Title: "${title}"
Article: "${article.slice(0, 800)}"
`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 10,
    temperature: 0.2,
  });

  const noun = (r.choices[0]?.message?.content || "")
    .trim()
    .toLowerCase()
    .replace(/["'.]/g, "");

  const cleaned = noun || "concept";
  console.log(`🧩 Core noun detected → "${cleaned}"`);
  return cleaned;
}

/* ============================================================================================
   🔹 2. Bildesøkere
   ============================================================================================ */

export async function searchWikimediaImages(query) {
  const endpoint =
    "https://commons.wikimedia.org/w/api.php" +
    `?action=query` +
    `&format=json` +
    `&prop=imageinfo` +
    `&generator=search` +
    `&gsrnamespace=6` + // ONLY FILE PAGES
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=20` +
    `&iiprop=url|size|mime` +
    `&origin=*`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.query?.pages) return [];

    const pages = Object.values(data.query.pages);

    return pages
      .map((p) => p.imageinfo?.[0])
      .filter(
        (info) =>
          info?.url &&
          /\.(jpg|jpeg|png|webp)$/i.test(info.url) && // only real images
          info.width >= 800 // litt strengere for å unngå små thumbnails
      )
      .map((info) => info.url);
  } catch (err) {
    console.error("Wikimedia error:", err.message);
    return [];
  }
}

export async function searchPexelsImages(query) {
  if (!PEXELS_KEY) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query
      )}&per_page=10`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.photos?.map((p) => p.src?.large) || [];
  } catch (err) {
    console.warn("Pexels error:", err.message);
    return [];
  }
}

export async function searchUnsplashImages(query) {
  if (!UNSPLASH_KEY) return [];
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=10&orientation=landscape&client_id=${UNSPLASH_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results?.map((r) => r.urls?.regular) || [];
  } catch (err) {
    console.warn("Unsplash error:", err.message);
    return [];
  }
}

/* ============================================================================================
   🔹 3. Vision helper – hent bilde som base64 data-URL
   ============================================================================================ */

async function fetchImageAsDataUrl(imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.warn("⚠️ fetchImageAsDataUrl: HTTP not OK:", res.status);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const b64 = buffer.toString("base64");

    // Prøv å gjette mimetype
    const contentType =
      res.headers.get("content-type") ||
      (imageUrl.match(/\.(jpe?g)$/i) && "image/jpeg") ||
      (imageUrl.match(/\.png$/i) && "image/png") ||
      (imageUrl.match(/\.webp$/i) && "image/webp") ||
      "image/jpeg";

    return `data:${contentType};base64,${b64}`;
  } catch (err) {
    console.warn("⚠️ fetchImageAsDataUrl failed:", err.message);
    return null;
  }
}

/* ============================================================================================
   🔹 3A. describeImage: Beskriv hva som faktisk er i bildet (VISION)
   ============================================================================================ */
async function describeImage(imageUrl) {
  // Last ned bildet og gjør det om til data-URL slik at modellen GARANTERT får pixlene
  const dataUrl = await fetchImageAsDataUrl(imageUrl);
  if (!dataUrl) {
    console.warn("⚠️ describeImage: Could not fetch image, skipping.");
    return "";
  }

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
You are an image analyst. Describe ONLY what is visually present in this image.
- Be factual and neutral.
- Mention the main subject first.
- One short sentence, no speculation.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 40,
      temperature: 0.1,
    });

    const description = r.choices[0]?.message?.content?.trim() || "";
    console.log(`🖼️ Vision description: "${description}"`);
    return description;
  } catch (err) {
    console.warn("⚠️ describeImage failed:", err.message);
    return "";
  }
}

/* ============================================================================================
   🔹 3B. semanticMatch: Sjekk om bilde faktisk handler om core noun
   ============================================================================================ */
async function semanticMatch(core, description) {
  if (!description) return false;

  const prompt = `
Determine if the image description matches the intended subject.

Subject (what the article is about): "${core}"
Image shows (purely visual): "${description}"

Rules:
- Answer "yes" ONLY if the subject is clearly present or strongly implied.
- If the subject is missing, unrelated, or only vaguely connected → answer "no".
- Answer with ONLY: yes or no.
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2,
      temperature: 0,
    });

    const reply = r.choices[0]?.message?.content?.trim().toLowerCase();
    const ok = reply === "yes";
    if (!ok) {
      console.log(
        `❌ semanticMatch: "${description}" does NOT match subject "${core}"`
      );
    }
    return ok;
  } catch (err) {
    console.warn("⚠️ semanticMatch failed:", err.message);
    return false;
  }
}

/* ============================================================================================
   🔹 3C. evaluateImageRelevance (vision + fin-score)
   ============================================================================================ */
export async function evaluateImageRelevance(
  imageUrl,
  title,
  article,
  coreNoun
) {
  try {
    // 1. Beskriv bildet med vision
    const description = await describeImage(imageUrl);
    if (!description) return 0;

    // 2. Semantisk match
    const isSemanticMatch = await semanticMatch(coreNoun, description);
    if (!isSemanticMatch) {
      return 0;
    }

    // 3. Finkornet relevans-score som ekstra lag
    const prompt = `
Rate how well this image fits the article below on a scale 0–100.
Consider:
- Does it show the main subject ("${coreNoun}") clearly?
- Does it fit the tone and topic of the article?
- Would it be a good editorial image for this story?

Return ONLY a number.

Image description: ${description}
Title: ${title}
Excerpt: ${article.slice(0, 500)}
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6,
      temperature: 0,
    });

    const score = parseFloat(r.choices[0]?.message?.content?.trim() || "0");
    const finalScore = isNaN(score) ? 0 : score;

    console.log(
      `📊 Relevance score for image (${coreNoun}) → ${finalScore.toFixed(1)}`
    );
    return finalScore;
  } catch (err) {
    console.warn("⚠️ evaluateImageRelevance failed:", err.message);
    return 0;
  }
}

/* ============================================================================================
   🔹 4. Velg beste bilde (AI-first eller Photo-first)
   ============================================================================================ */
// NB: fjerde parameter (preferredMode) er OPTIONAL override fra generate.js
export async function selectBestImage(
  title,
  article,
  category,
  preferredMode = null
) {
  try {
    console.log(`🖼️ Selecting image for ${category.toUpperCase()}: "${title}"`);

    // 1) Finn visuelt kjerne-substantiv
    const core = await getCoreNoun(title, article);

    // 2) Bestem strategi: DALL·E først, eller foto først
    const categoryPref =
      categories[category]?.image === "dalle" ? "dalle" : "photo";

    const imagePref = preferredMode || categoryPref;

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

    /* === 4A. AI-FIRST (DALL·E 3 direkte) === */
    if (imagePref === "dalle") {
      console.log("🎨 AI-first category → generating with DALL·E 3 first...");
      const dallePrompt = `photo of ${core}, realistic, editorial style, cinematic lighting`;
      const dalleImg = await generateDalleImage(
        title,
        dallePrompt,
        "cinematic",
        category
      );
      if (dalleImg) {
        // DALL·E-bildet ligger allerede i Supabase via generateDalleImage,
        // men vi sender det gjennom cacheImageToSupabase for konsistent naming.
        const cached = await cacheImageToSupabase(
          dalleImg,
          `${category}-${Date.now()}`,
          category
        );
        return { imageUrl: cached, source: "DALL·E", score: 100 };
      }
    }

    /* === 4B. FOTO-FIRST: Wikimedia / Pexels / Unsplash === */
    for (const src of sources) {
      try {
        const urls = await src.fn(core);
        if (!urls?.length) {
          console.log(`🔎 ${src.name}: 0 images found for "${core}"`);
          continue;
        }

        console.log(`🔎 ${src.name}: evaluating ${urls.length} images…`);

        // Evaluer hver kandidat med vision-basert relevans
        await Promise.all(
          urls.map(async (url) => {
            const score = await evaluateImageRelevance(
              url,
              title,
              article,
              core
            );
            if (score > 0) {
              candidates.push({ url, source: src.name, score });
            }
          })
        );
      } catch (err) {
        console.warn(`⚠️ ${src.name} fetch failed:`, err.message);
      }
    }

    // Filtrer ut kun gode matcher
    const strong = candidates.filter((c) => c.score >= MIN_ACCEPTABLE_SCORE);

    if (strong.length) {
      // Velg beste kandidat
      strong.sort((a, b) => b.score - a.score);
      const best = strong[0];

      const cached = await cacheImageToSupabase(
        best.url,
        `${category}-${Date.now()}`,
        category
      );

      console.log(
        `✅ Selected ${best.source} (${best.score}%) → ${best.url} (core="${core}")`
      );
      return { imageUrl: cached, source: best.source, score: best.score };
    }

    /* === 4C. FALLBACK: DALL·E hvis ingen stock-bilder passer === */
    console.log(
      "🧠 No suitable stock image → generating editorial illustration with DALL·E 3..."
    );
    const dallePrompt = `photo of ${core}, realistic, editorial style, cinematic lighting`;
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
      return { imageUrl: cached, source: "DALL·E", score: 100 };
    }

    /* === 4D. Siste utvei: generisk placeholder === */
    console.error(
      "❌ DALL·E fallback also failed – using generic placeholder image."
    );
    return {
      imageUrl: `https://picsum.photos/seed/${category}/800/400`,
      source: "Fallback",
      score: 0,
    };
  } catch (err) {
    console.error("❌ selectBestImage error:", err.message);
    return {
      imageUrl: `https://picsum.photos/seed/${category}/800/400`,
      source: "Fallback",
      score: 0,
    };
  }
}
