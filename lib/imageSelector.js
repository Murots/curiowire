// === app/api/utils/imageSelector.js ===
// CurioWire Smart Image Selector v5.0 (2025)
// - Billig & presist, *uten* Vision
// - 6 bilder per provider (18 totalt maks)
// - 1–2 nøkkelord (med disambiguering, f.eks. "kennedy president")
// - Ren tekst/metadata-basert scoring (alt-text, title, tags, URL)
// - Filtrerer vekk åpenbare feil (kart, flagg, logoer, ikoner, for små bilder)
// - Streng disambiguering: 2-ords core må matche begge ord i metadata
// - DALL·E-fallback + Supabase caching via imageTools.js

import OpenAI from "openai";
import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
import { categories } from "../app/api/utils/categories.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export const MIN_ACCEPTABLE_SCORE = 75;

// // ============================================================================================
// // 🔹 1. Finn visuelt kjerne-substantiv (1–2 ord, med disambiguering)
// // ============================================================================================
// export async function getCoreNoun(title, article) {
//   const prompt = `
// You are selecting the BEST visual search keyword for a news article image.

// Choose ONE or TWO words that describe the most visually specific subject
// that should appear in the photo.

// Rules:
// - Prefer specific animals, people types, objects, buildings, places.
// - Avoid generic words ("man", "woman", "person", "world", "city").
// - If the main noun is ambiguous (like "kennedy" or "seahorse"),
//   add a second word that clarifies the intended meaning, e.g.:
//   - "kennedy president" vs "kennedy airport"
//   - "seahorse animal" vs "seahorse submarine"
//   - "mercury planet" vs "mercury metal"
// - If the article is abstract, pick a visual symbol (e.g. "server room", "data center").

// Return ONLY the keyword(s), lowercase, 1–2 words.
// No explanation.

// Title: "${title}"
// Article: "${article.slice(0, 800)}"
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 10,
//       temperature: 0.2,
//     });

//     const noun = (r.choices[0]?.message?.content || "")
//       .trim()
//       .toLowerCase()
//       .replace(/["'.]/g, "");

//     const cleaned = noun || "concept";
//     console.log(`🧩 Core noun detected → "${cleaned}"`);
//     return cleaned;
//   } catch (err) {
//     console.warn("⚠️ getCoreNoun failed:", err.message);
//     return "concept";
//   }
// }

// ============================================================================================
// 🔹 1. Finn visuelt kjerne-substantiv (ALLTID fotograferbart, 1–2 ord, med disambiguering)
// ============================================================================================
export async function getCoreNoun(title, article) {
  const prompt = `
You are selecting the BEST visual search keyword for a news article image.

Your output MUST follow these rules:

🎯 VISUAL-ONLY RULES
- Choose ONLY subjects that can clearly appear in a photograph.
- Allowed: animals, people types, objects, vehicles, buildings, landmarks, tools, technology devices, natural scenes.
- NOT allowed: abstract concepts (intelligence, behavior, culture, ethics, memory, inflation, politics, climate impact, privacy, evolution, consciousness).

🎯 DISAMBIGUATION
If the word is ambiguous, add one clarifying word:
- "kennedy president" vs "kennedy airport"
- "seahorse animal" vs "seahorse submarine"
- "mercury planet" vs "mercury metal"

🎯 ABSTRACT ARTICLE LOGIC
If the article topic is abstract:
- Output a symbolic but visual object (e.g. "money", "solar panels", "robot hand", "server room", "data center", "globe", "crowd", "airplane").

🎯 STRICT FORMAT
- Return ONLY 1–2 words.
- Must be lowercase.
- No explanation, no punctuation.

Title: "${title}"
Article: "${article.slice(0, 800)}"
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0.1,
    });

    let noun = (r.choices[0]?.message?.content || "")
      .trim()
      .toLowerCase()
      .replace(/["'.]/g, "");

    // ========================================================================================
    // 🔹 Extra JavaScript-level sanitization (just in case GPT slips)
    // ========================================================================================
    const abstractBans = [
      "intelligence",
      "behavior",
      "impact",
      "trend",
      "culture",
      "ethics",
      "growth",
      "inflation",
      "memory",
      "performance",
      "economy",
      "technology",
      "climate",
      "evolution",
      "privacy",
      "politics",
      "society",
      "warfare",
      "analysis",
      "history",
      "future",
      "design",
    ];

    // Hvis GPT returnerer et abstrakt ord → prøv å hente siste ord (som ofte er konkret)
    const parts = noun.split(" ");
    if (parts.length > 1 && abstractBans.includes(parts[1])) {
      noun = parts[0];
    }
    if (parts.length > 1 && abstractBans.includes(parts[0])) {
      noun = parts.slice(1).join(" ");
    }

    // Ekstra: hvis GPT returnerer "octopus intelligence" → behold dyr, dropp abstrakt ord
    let parts2 = noun.split(" ");
    if (parts2.length > 1) {
      const last = parts2[parts2.length - 1];
      const first = parts2[0];

      // Fjern abstrakt ord i 2-ordskombinasjon
      if (abstractBans.includes(last)) {
        noun = first; // "octopus intelligence" → "octopus"
      }
    }

    // Hvis hele uttrykket fortsatt abstrakt → velg symboler
    if (abstractBans.includes(noun)) {
      noun = "symbol";
    }

    // Plural → singular normalisering
    const pluralFix = noun.replace(/s$/, "");
    if (pluralFix.length >= 3) noun = pluralFix;

    // Siste forsvar: hvis tom → bruk "symbol"
    if (!noun || noun.length < 2) noun = "symbol";

    console.log(`🧩 Core noun detected → "${noun}"`);
    return noun;
  } catch (err) {
    console.warn("⚠️ getCoreNoun failed:", err.message);
    return "symbol";
  }
}

// ============================================================================================
// 🔹 2. Hjelpere for tekst / keywords (lokalt, billig)
// ============================================================================================

function tokenize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "for",
  "to",
  "from",
  "by",
  "with",
  "at",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "as",
  "be",
  "about",
  "into",
  "over",
  "under",
  "up",
  "down",
  "out",
  "off",
  "through",
  "across",
  "their",
  "his",
  "her",
  "they",
  "them",
  "you",
  "your",
  "we",
  "our",
  "but",
  "not",
]);

function extractKeywords(text, max = 12) {
  const freq = new Map();
  for (const t of tokenize(text)) {
    if (STOPWORDS.has(t)) continue;
    if (t.length < 3) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function buildMetadataText(candidate) {
  const parts = [
    candidate.title,
    candidate.description,
    candidate.alt,
    candidate.tags?.join(" "),
    candidate.url,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

// ============================================================================================
// 🔹 3. Bildesøk (6 per provider) → returnerer *kandidater* med metadata
// ============================================================================================

/**
 * Felles kandidat-format:
 * {
 *   url: string,
 *   provider: "Wikimedia" | "Pexels" | "Unsplash",
 *   width?: number,
 *   height?: number,
 *   title?: string,
 *   description?: string,
 *   alt?: string,
 *   tags?: string[]
 * }
 */

export async function searchWikimediaImages(query) {
  const endpoint =
    "https://commons.wikimedia.org/w/api.php" +
    `?action=query&format=json&prop=imageinfo` +
    `&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=6` +
    `&iiprop=url|size|mime|extmetadata&origin=*`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];

    const candidates = [];

    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info?.url || !info.width) continue;

      const url = info.url.toLowerCase();

      // Grovfilter: dropp SVG, ikoner, flagg, kart, logoer etc.
      if (url.endsWith(".svg")) continue;
      if (url.includes("icon")) continue;
      if (url.includes("flag_of")) continue;
      if (url.includes("coat_of_arms")) continue;
      if (url.includes("locator_map")) continue;
      if (url.includes("logo")) continue;
      if (url.includes("map_")) continue;

      if (info.width < 800) continue;

      const ext = info.extmetadata || {};
      const desc =
        ext.ImageDescription?.value || ext.ObjectName?.value || p.title || "";

      candidates.push({
        url: info.url,
        provider: "Wikimedia",
        width: info.width,
        height: info.height,
        title: p.title || "",
        description: String(desc || ""),
        alt: "",
        tags: [],
      });
    }

    return candidates;
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
    const photos = data.photos || [];

    return photos
      .filter((p) => p.src?.large)
      .map((p) => ({
        url: p.src.large,
        provider: "Pexels",
        width: p.width,
        height: p.height,
        title: "",
        description: "",
        alt: p.alt || "",
        tags: [],
      }));
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
    const results = data.results || [];

    return results
      .filter((r) => r.urls?.regular)
      .map((r) => ({
        url: r.urls.regular,
        provider: "Unsplash",
        width: r.width,
        height: r.height,
        title: r.description || "",
        description: r.description || "",
        alt: r.alt_description || "",
        tags: (r.tags || []).map((t) => t.title).filter(Boolean),
      }));
  } catch (err) {
    console.warn("Unsplash error:", err.message);
    return [];
  }
}

// ============================================================================================
// 🔹 4. Streng, tekstbasert scoring (0–100) + disambiguering
//     → ingen GPT-kall per bilde, kun lokal tekstanalyse
// ============================================================================================

function scoreCandidate(core, articleTitle, articleText, candidate) {
  const meta = buildMetadataText(candidate);
  if (!meta) return 0;

  // Tokenize metadata (plural/singular aware) — must be defined early
  const metaTokensRaw = tokenize(meta);
  const metaTokens = new Set(
    metaTokensRaw.flatMap((t) => [
      t, // original
      t.replace(/s$/, ""), // plural → singular
      t + "s", // singular → plural
    ])
  );

  const parts = core.split(/\s+/).filter(Boolean);
  if (!parts.length) return 0;

  const primary = parts[0];
  const secondary = parts[1] || null;
  const ambiguous = !!secondary; // 2-ords core = bevisst disambiguering

  const hasPrimary = meta.includes(primary.toLowerCase());
  const hasSecondary = secondary
    ? meta.includes(secondary.toLowerCase())
    : false;

  // === Streng disambiguering ===
  if (ambiguous) {
    // Vi krever at *begge* ordene i core faktisk finnes i metadata
    if (!hasPrimary || !hasSecondary) return 0;
  } else {
    // Enkelt core-ord:
    // • Primært krever vi treff på hovedordet
    // • Hvis ikke, må det i det minste være god tematisk match mot artikkel
    if (!hasPrimary) {
      const articleKeywords = extractKeywords(
        `${articleTitle}\n${articleText}`,
        10
      );

      // Streng string-match
      const strictHits = articleKeywords.filter((kw) =>
        meta.includes(kw)
      ).length;

      // Token-basert match (plural-aware)
      const tokenHits = articleKeywords.filter(
        (kw) =>
          metaTokens.has(kw) ||
          metaTokens.has(kw.replace(/s$/, "")) ||
          metaTokens.has(kw + "s")
      ).length;

      const totalHits = strictHits + tokenHits;

      // Aksepter hvis tema er svært sterkt (minst 3 treff)
      if (totalHits < 3) return 0;
    }
  }

  // Basisscore hvis den kommer gjennom nåløyet
  let score = 80;

  if (metaTokens.has(primary.toLowerCase())) score += 5;
  if (secondary && metaTokens.has(secondary.toLowerCase())) score += 5;

  // Tematisk bonus: overlap med artikkel-keywords
  const articleKeywords = extractKeywords(
    `${articleTitle}\n${articleText}`,
    12
  );
  let keywordHits = 0;
  for (const kw of articleKeywords) {
    if (meta.includes(kw)) keywordHits++;
  }
  score += Math.min(keywordHits * 3, 15);

  // Liten oppløsningsbonus
  if (candidate.width && candidate.width >= 2000) {
    score += 5;
  }

  // Hvis core er et dyr eller objekt, tillat litt svakere match
  const lenientSubjects = [
    "octopus",
    "seal",
    "dog",
    "cat",
    "tree",
    "fish",
    "bird",
    "coin",
    "mammoth",
    "robot",
    "ship",
  ];
  if (lenientSubjects.includes(primary.toLowerCase()) && score >= 60) {
    score += 10; // mild boost for natur/objektmotiv
  }

  // Streng cutoff
  if (score < MIN_ACCEPTABLE_SCORE) return 0;

  return Math.max(0, Math.min(score, 100));
}

// ============================================================================================
// 🔹 5. HOVEDFUNKSJON: Velg beste bilde
// ============================================================================================
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

  // =====================================================================
  // === A: AI-FIRST (DALL·E) for enkelte kategorier (uendret logikk) ===
  // =====================================================================
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

  // =====================================================================
  // === B: PHOTO-FIRST (Wikimedia → Pexels → Unsplash)               ===
  //       → 6 bilder per provider, metadata-basert scoring            ===
  // =====================================================================
  const sources = [
    { name: "Wikimedia", fn: searchWikimediaImages },
    { name: "Pexels", fn: searchPexelsImages },
    { name: "Unsplash", fn: searchUnsplashImages },
  ];

  const candidates = [];

  for (const src of sources) {
    let found = [];
    try {
      found = await src.fn(core);
    } catch (err) {
      console.warn(`${src.name} search failed:`, err.message);
      continue;
    }

    if (!found?.length) continue;

    for (const cand of found) {
      try {
        const score = scoreCandidate(core, title, article, cand);
        if (score >= MIN_ACCEPTABLE_SCORE) {
          candidates.push({ ...cand, score });
          const shortMeta = buildMetadataText(cand).slice(0, 80);
          console.log(
            `✅ ${src.name} candidate accepted (${score}) → ${shortMeta}...`
          );
        } else {
          const shortMeta = buildMetadataText(cand).slice(0, 80);
          console.log(
            `❌ ${src.name} candidate rejected (${score}) → ${shortMeta}...`
          );
        }
      } catch (err) {
        console.warn(`Candidate from ${src.name} failed:`, err.message);
      }
    }
  }

  // =====================================================================
  // === C: Beste stock-resultat (lagres i Supabase)                  ===
  // =====================================================================
  if (candidates.length) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const cached = await cacheImageToSupabase(
      best.url,
      `${category}-${Date.now()}`,
      category
    );

    console.log(
      `🏆 Selected ${best.provider} (${
        best.score
      }) for ${category}: ${buildMetadataText(best).slice(0, 120)}`
    );

    return { imageUrl: cached, source: best.provider, score: best.score };
  }

  // =====================================================================
  // === D: FALLBACK TIL DALL·E                                    ===
  // =====================================================================
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

  // =====================================================================
  // === E: Absolutt siste utvei → placeholder                      ===
  // =====================================================================
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
