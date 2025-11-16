// === app/api/utils/imageSelector.js ===
// CurioWire Smart Image Selector v4.0 (2025)
// - Billig & presist
// - 6 bilder per provider (18 totalt maks)
// - 1–2 nøkkelord (med disambiguering, f.eks. "kennedy president")
// - Vision: én kort beskrivelse per bilde (gpt-4o-mini + image_url)
// - Scoring: én bitteliten prompt per bilde (tall 0–100)
// - Filtrerer vekk feil betydning (seahorse skip vs dyr, kennedy president vs flyplass)
// - DALL·E-fallback + Supabase caching via imageTools.js

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
   🔹 1. Finn visuelt kjerne-substantiv (1–2 ord, med disambiguering)
   ============================================================================================ */
export async function getCoreNoun(title, article) {
  const prompt = `
You are selecting the BEST visual search keyword for a news article image.

Choose ONE or TWO words that describe the most visually specific subject
that should appear in the photo.

Rules:
- Prefer specific animals, people types, objects, buildings, places.
- Avoid generic words ("man", "woman", "person", "world", "city").
- If the main noun is ambiguous (like "kennedy" or "seahorse"),
  add a second word that clarifies the intended meaning, e.g.:
  - "kennedy president" vs "kennedy airport"
  - "seahorse animal" vs "seahorse submarine"
  - "mercury planet" vs "mercury metal"
- If the article is abstract, pick a visual symbol (e.g. "server room", "data center").

Return ONLY the keyword(s), lowercase, 1–2 words.
No explanation.

Title: "${title}"
Article: "${article.slice(0, 800)}"
`;

  try {
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
  } catch (err) {
    console.warn("⚠️ getCoreNoun failed:", err.message);
    return "concept";
  }
}

/* ============================================================================================
   🔹 2. Bildesøk (6 per provider)
   ============================================================================================ */

export async function searchWikimediaImages(query) {
  const endpoint =
    "https://commons.wikimedia.org/w/api.php" +
    `?action=query&format=json&prop=imageinfo` +
    `&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=6` +
    `&iiprop=url|size|mime&origin=*`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];

    return pages
      .map((p) => p.imageinfo?.[0])
      .filter((info) => {
        if (!info?.url || !info.width) return false;

        const url = info.url.toLowerCase();

        // Grovfilter: dropp SVG, ikoner, flagg, kart, logoer etc. før vi bruker Vision
        if (url.endsWith(".svg")) return false;
        if (url.includes("icon")) return false;
        if (url.includes("flag_of")) return false;
        if (url.includes("coat_of_arms")) return false;
        if (url.includes("locator_map")) return false;
        if (url.includes("logo")) return false;
        if (url.includes("map_")) return false;

        return info.width >= 800;
      })
      .map((info) => info.url);
  } catch (err) {
    console.warn("Wikimedia error:", err.message);
    return [];
  }
}

export async function searchPexelsImages(query) {
  if (!PEXELS_KEY) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query
      )}&per_page=6`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.photos?.map((p) => p.src?.large)?.filter(Boolean) || [];
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
      )}&per_page=6&orientation=landscape&client_id=${UNSPLASH_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results?.map((r) => r.urls?.regular)?.filter(Boolean) || [];
  } catch (err) {
    console.warn("Unsplash error:", err.message);
    return [];
  }
}

/* ============================================================================================
   🔹 3. Vision-beskrivelse (ÉN kort setning per bilde)
   ============================================================================================ */
async function describeImage(imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.warn(`describeImage: fetch failed for ${imageUrl}`);
      return "";
    }

    const arrayBuffer = await res.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");
    const ct = res.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${ct};base64,${b64}`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini", // har innebygd vision-støtte via image_url
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "In one short sentence, clearly describe what this photo mainly shows.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 32,
      temperature: 0.1,
    });

    const desc = r.choices[0]?.message?.content?.trim() || "";
    return desc;
  } catch (err) {
    console.warn("describeImage failed:", err.message);
    return "";
  }
}

/* ============================================================================================
   🔹 4. Enkel scoring (0–100) + sense-disambiguering
   ============================================================================================ */
async function scoreImage(description, core, title, article) {
  if (!description) return 0;

  const prompt = `
You are filtering editorial news images.

Intended subject: "${core}"
Article title: "${title}"
Article context (excerpt): "${article.slice(0, 400)}"

Image description: "${description}"

Task:
- Return a single integer from 0 to 100.
- 0–10  = wrong subject or clearly wrong meaning (e.g. "seahorse" ship vs animal, "kennedy" airport vs president).
- 20–60 = vague or loosely related image.
- 70–100 = clearly shows the correct subject in the correct sense for this article.

Return ONLY the number, no words.
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4,
      temperature: 0,
    });

    const raw = r.choices[0]?.message?.content?.trim() || "0";
    const num = parseFloat(raw);
    return isNaN(num) ? 0 : num;
  } catch (err) {
    console.warn("scoreImage failed:", err.message);
    return 0;
  }
}

/* ============================================================================================
   🔹 5. HOVEDFUNKSJON: Velg beste bilde
   ============================================================================================ */
export async function selectBestImage(
  title,
  article,
  category,
  preferredMode = null
) {
  console.log(`🖼️ Selecting image for ${category}: "${title}"`);

  const core = await getCoreNoun(title, article);

  const categoryPref =
    categories[category]?.image === "dalle" ? "dalle" : "photo";

  const mode = preferredMode || categoryPref;

  const candidates = [];

  /* === A: AI-FIRST (DALL·E) for enkelte kategorier === */
  if (mode === "dalle") {
    const dalle = await generateDalleImage(title, core, "cinematic", category);
    if (dalle) {
      const cached = await cacheImageToSupabase(
        dalle,
        `${category}-${Date.now()}`,
        category
      );
      return { imageUrl: cached, source: "DALL·E", score: 100 };
    }
  }

  /* === B: PHOTO-FIRST (Wikimedia → Pexels → Unsplash) === */
  const sources = [
    { name: "Wikimedia", fn: searchWikimediaImages },
    { name: "Pexels", fn: searchPexelsImages },
    { name: "Unsplash", fn: searchUnsplashImages },
  ];

  for (const src of sources) {
    let urls = [];
    try {
      urls = await src.fn(core);
    } catch (err) {
      console.warn(`${src.name} search failed:`, err.message);
      continue;
    }

    if (!urls?.length) continue;

    for (const url of urls) {
      try {
        const desc = await describeImage(url);
        if (!desc) continue;

        const score = await scoreImage(desc, core, title, article);

        // Kun ta vare på bilder som faktisk passer godt
        if (score >= MIN_ACCEPTABLE_SCORE) {
          candidates.push({ url, score, source: src.name, desc });
          console.log(
            `✅ ${src.name} candidate accepted (${score}) → ${desc.slice(
              0,
              80
            )}...`
          );
        } else {
          console.log(
            `❌ ${src.name} candidate rejected (${score}) → ${desc.slice(
              0,
              80
            )}...`
          );
        }
      } catch (err) {
        console.warn(`Candidate from ${src.name} failed:`, err.message);
      }
    }
  }

  /* === Best stock result === */
  if (candidates.length) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const cached = await cacheImageToSupabase(
      best.url,
      `${category}-${Date.now()}`,
      category
    );

    console.log(
      `🏆 Selected ${best.source} (${best.score}) for ${category}: ${best.desc}`
    );

    return { imageUrl: cached, source: best.source, score: best.score };
  }

  /* === C: FALLBACK TO DALL·E === */
  const dalle = await generateDalleImage(title, core, "cinematic", category);
  if (dalle) {
    const cached = await cacheImageToSupabase(
      dalle,
      `${category}-${Date.now()}`,
      category
    );
    console.log(`🎨 Falling back to DALL·E for ${category}`);
    return { imageUrl: cached, source: "DALL·E", score: 100 };
  }

  /* === D: Hvis alt feiler → enkel placeholder === */
  console.warn(
    `⚠️ All image sources failed for ${category}, using placeholder.`
  );
  return {
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(
      category
    )}/800/400`,
    source: "Fallback",
    score: 0,
  };
}
