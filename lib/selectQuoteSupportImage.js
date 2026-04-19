// ============================================================================
// lib/selectQuoteSupportImage.js
// CurioWire Quote Image Selector v1
// Goal:
// - Find a strong image of the quote speaker
// - Use ONLY the speaker name as the search query
// - Reuse the same provider/search/cache approach as imageSelector.js
// - No subject analysis, no DALL·E fallback
// - If no strong image exists, return null
// ============================================================================

import OpenAI from "openai";
import { cacheImageToSupabase } from "./imageTools.js";

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-5.4-mini";
const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

const MIN_ACCEPTABLE_SCORE = 75;

// ----------------------------------------------------------------------------
// Attribution builder for Wikimedia images
// ----------------------------------------------------------------------------
function buildAttribution(cand) {
  if (cand.provider !== "Wikimedia") return null;

  const artist = cand.artist || "Unknown author";
  const license = cand.license || "Unknown license";
  const licenseUrl = cand.licenseUrl || "";

  return `Image: ${artist}, License: ${license}${
    licenseUrl ? ` (${licenseUrl})` : ""
  }`;
}

// ----------------------------------------------------------------------------
// Generic JSON helper for Responses API
// ----------------------------------------------------------------------------
async function runImageJSON({
  prompt,
  schema,
  schemaName = "quote_image_task",
}) {
  const res = await openai.responses.create({
    model: IMAGE_MODEL,
    reasoning: { effort: "low" },
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
    input: prompt,
  });

  const txt = (res.output_text || "").trim();
  if (!txt) throw new Error("Empty JSON response");

  return JSON.parse(txt);
}

// ----------------------------------------------------------------------------
// Text helpers
// ----------------------------------------------------------------------------
function stripHtml(s = "") {
  return String(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompareText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s*-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQueryForSearch(text = "") {
  return String(text)
    .replace(/["“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageKey(url = "") {
  return String(url)
    .replace(/\?.*$/, "")
    .replace(/#.*$/, "")
    .toLowerCase()
    .trim();
}

function tokenize(text = "") {
  return normalizeCompareText(text).split(/\s+/).filter(Boolean);
}

function dedupeCandidates(list = []) {
  const seen = new Set();
  const out = [];

  for (const cand of list) {
    const key = normalizeImageKey(cand.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(cand);
  }

  return out;
}

function buildMetadataText(candidate) {
  const parts = [
    stripHtml(candidate.title),
    stripHtml(candidate.description),
    stripHtml(candidate.alt),
    candidate.tags?.join(" "),
    candidate.url,
  ];

  return parts.filter(Boolean).join(" ").toLowerCase();
}

function countTokenMatches(tokens = [], meta = "", metaTokens = new Set()) {
  let hits = 0;

  for (const t of tokens) {
    if (
      meta.includes(t) ||
      metaTokens.has(t) ||
      metaTokens.has(t.replace(/s$/, "")) ||
      metaTokens.has(`${t}s`)
    ) {
      hits++;
    }
  }

  return hits;
}

function uniqueNonEmptyStrings(values = []) {
  const out = [];
  const seen = new Set();

  for (const v of values) {
    const clean = normalizeQueryForSearch(v);
    const key = normalizeCompareText(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  return out;
}

// ----------------------------------------------------------------------------
// Search providers
// ----------------------------------------------------------------------------
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

      const url = String(info.url || "").toLowerCase();
      const mime = String(info.mime || "").toLowerCase();

      if (!mime.startsWith("image/")) continue;
      if (url.endsWith(".svg")) continue;
      if (url.endsWith(".pdf")) continue;
      if (url.endsWith(".djvu")) continue;
      if (url.endsWith(".tif")) continue;
      if (url.endsWith(".tiff")) continue;

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
        title: stripHtml(p.title || ""),
        description: stripHtml(String(desc || "")),
        alt: "",
        tags: [],
        license: ext.LicenseShortName?.value || "Unknown",
        licenseUrl: ext.LicenseUrl?.value || "",
        artist: stripHtml(ext.Artist?.value || ""),
        credit: stripHtml(ext.Credit?.value || ""),
        attributionRequired: ext.AttributionRequired?.value === "true",
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
        query,
      )}&per_page=6`,
      { headers: { Authorization: PEXELS_KEY } },
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
        alt: stripHtml(p.alt || ""),
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
        query,
      )}&per_page=6&orientation=landscape&client_id=${UNSPLASH_KEY}`,
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
        title: stripHtml(r.description || ""),
        description: stripHtml(r.description || ""),
        alt: stripHtml(r.alt_description || ""),
        tags: (r.tags || []).map((t) => t.title).filter(Boolean),
      }));
  } catch (err) {
    console.warn("Unsplash error:", err.message);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Candidate scoring
// ----------------------------------------------------------------------------
function scoreSpeakerCandidate(speakerQuery, candidate) {
  const query = normalizeCompareText(speakerQuery);
  const meta = buildMetadataText(candidate);

  if (!query || !meta) return 0;

  const parts = query.split(/\s+/).filter(Boolean);
  if (!parts.length) return 0;

  const metaTokensRaw = tokenize(meta);
  const metaTokens = new Set(
    metaTokensRaw.flatMap((t) => [t, t.replace(/s$/, ""), `${t}s`]),
  );

  const fullPhraseMatch = meta.includes(query);
  const tokenMatches = countTokenMatches(parts, meta, metaTokens);
  const requiredMatches =
    parts.length <= 2 ? parts.length : Math.max(2, parts.length - 1);

  // Strong grounding requirement: either full phrase or most meaningful tokens
  if (!fullPhraseMatch && tokenMatches < requiredMatches) {
    return 0;
  }

  let score = 76;

  if (fullPhraseMatch) score += 12;
  score += Math.min(tokenMatches * 4, 16);

  if (candidate.width && candidate.width >= 2000) {
    score += 4;
  }

  // Stronger confidence for portrait-like metadata hints
  if (/\bportrait\b|\bheadshot\b|\bphoto of\b|\bphotograph of\b/.test(meta)) {
    score += 4;
  }

  return Math.max(0, Math.min(score, 100));
}

// ----------------------------------------------------------------------------
// Candidate collection
// ----------------------------------------------------------------------------
async function collectCandidatesForQuery(query) {
  const normalizedQuery = normalizeQueryForSearch(query);
  if (!normalizedQuery) return [];

  const sources = [
    { name: "Wikimedia", fn: searchWikimediaImages },
    { name: "Pexels", fn: searchPexelsImages },
    { name: "Unsplash", fn: searchUnsplashImages },
  ];

  const candidates = [];

  for (const src of sources) {
    let found = [];
    try {
      found = await src.fn(normalizedQuery);
    } catch (err) {
      console.warn(
        `${src.name} search failed for "${normalizedQuery}":`,
        err.message,
      );
      continue;
    }

    if (!found?.length) continue;

    for (const cand of found) {
      try {
        const score = scoreSpeakerCandidate(normalizedQuery, cand);

        if (score >= MIN_ACCEPTABLE_SCORE) {
          candidates.push({
            ...cand,
            score,
            queryUsed: normalizedQuery,
          });

          const shortMeta = buildMetadataText(cand).slice(0, 100);
          console.log(
            `✅ ${src.name} accepted (${score}) q="${normalizedQuery}" → ${shortMeta}...`,
          );
        } else {
          const shortMeta = buildMetadataText(cand).slice(0, 100);
          console.log(
            `❌ ${src.name} rejected (${score}) q="${normalizedQuery}" → ${shortMeta}...`,
          );
        }
      } catch (err) {
        console.warn(
          `Candidate from ${src.name} failed for "${normalizedQuery}":`,
          err.message,
        );
      }
    }
  }

  return dedupeCandidates(candidates).sort((a, b) => b.score - a.score);
}

// ----------------------------------------------------------------------------
// Final GPT chooser across finalists
// ----------------------------------------------------------------------------
async function gptSelectBestQuoteImage(speaker, finalists) {
  if (!finalists?.length) return null;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      index: {
        type: "integer",
        minimum: 1,
        maximum: finalists.length,
      },
      reason: { type: "string" },
    },
    required: ["index", "reason"],
  };

  const prompt = `
You are choosing the single BEST image of a historical/public figure.

Goal:
Pick the image most likely to depict this person accurately and directly.

Speaker:
"${speaker}"

Priorities:
1. Direct match to the named person
2. Clear portrait or recognizable photo of the person
3. Avoid unrelated places, crowds, buildings, symbols, books, posters, statues, signatures, paintings of someone else, or generic event imagery
4. Ignore aesthetics; identity relevance matters most

Candidates:
${finalists
  .map(
    (c, i) => `
[Candidate ${i + 1}]
Provider: ${c.provider}
Score: ${c.score}
Query used: ${c.queryUsed}
Title: ${c.title || ""}
Alt: ${c.alt || ""}
Metadata: "${buildMetadataText(c).slice(0, 260)}"
URL: ${c.url}
`,
  )
  .join("\n")}

Return JSON only.
`.trim();

  try {
    const out = await runImageJSON({
      prompt,
      schema,
      schemaName: "final_quote_image_pick",
    });

    const chosen = finalists[(out.index || 1) - 1];
    return chosen || null;
  } catch (err) {
    console.warn("GPT final quote image reviewer failed:", err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Main function
// ----------------------------------------------------------------------------
export async function selectQuoteSupportImage({ speaker, category = "" }) {
  const speakerName = normalizeQueryForSearch(speaker);

  if (!speakerName) {
    console.warn("⚠️ selectQuoteSupportImage called without speaker.");
    return null;
  }

  console.log(
    `🖼️ Selecting quote image for speaker="${speakerName}" category="${category}"`,
  );

  // Primary query is speaker only.
  // Secondary query is optional light variant with "portrait".
  const queries = uniqueNonEmptyStrings([
    speakerName,
    `${speakerName} portrait`,
  ]);

  const allCandidates = [];

  for (const q of queries) {
    const found = await collectCandidatesForQuery(q);
    for (const cand of found) {
      allCandidates.push(cand);
    }

    if (dedupeCandidates(allCandidates).length >= 6) break;
  }

  const finalists = dedupeCandidates(allCandidates)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!finalists.length) {
    console.warn(
      `⚠️ No acceptable quote image candidates for "${speakerName}"`,
    );
    return null;
  }

  console.log("🏁 Quote image finalists:");
  finalists.forEach((c, i) => {
    console.log(
      `   ${i + 1}. ${c.provider} (${c.score}) q="${c.queryUsed}" → ${buildMetadataText(c).slice(0, 90)}...`,
    );
  });

  // Prefer GPT chooser if multiple finalists
  if (finalists.length >= 2) {
    console.log("🤖 Running final GPT quote image reviewer...");

    const gptWinner = await gptSelectBestQuoteImage(speakerName, finalists);

    if (gptWinner) {
      console.log(
        `🤖 GPT selected quote image: ${gptWinner.provider} (${gptWinner.score}) → ${gptWinner.url}`,
      );

      const cached = await cacheImageToSupabase(
        gptWinner.url,
        `${normalizeCompareText(speakerName).replace(/\s+/g, "-")}-${Date.now()}`,
        category || "quote",
      );

      if (cached) {
        return {
          imageUrl: cached,
          source: gptWinner.provider,
          score: gptWinner.score,
          width: gptWinner.width,
          height: gptWinner.height,
          originalUrl: gptWinner.url,
          title: gptWinner.title,
          alt: gptWinner.alt,
          provider: gptWinner.provider,
          license: gptWinner.license,
          licenseUrl: gptWinner.licenseUrl,
          artist: gptWinner.artist,
          attribution: buildAttribution(gptWinner),
          selectedBy: "gpt-final-quote",
          selectedQuery: gptWinner.queryUsed,
        };
      }

      console.warn(
        "⚠️ GPT-selected quote image could not be cached, continuing to fallback.",
      );
    }

    console.warn(
      "⚠️ GPT quote image review failed, falling back to top cachable image.",
    );
  }

  // Fallback: first cachable finalist
  for (const best of finalists) {
    const cached = await cacheImageToSupabase(
      best.url,
      `${normalizeCompareText(speakerName).replace(/\s+/g, "-")}-${Date.now()}`,
      category || "quote",
    );

    if (!cached) {
      console.warn(
        `⚠️ Skipping uncachable quote finalist ${best.provider} → ${best.url}`,
      );
      continue;
    }

    console.log(
      `🏆 Fallback selected quote image ${best.provider} (${best.score}) → ${best.url}`,
    );

    return {
      imageUrl: cached,
      source: best.provider,
      score: best.score,
      width: best.width,
      height: best.height,
      originalUrl: best.url,
      title: best.title,
      alt: best.alt,
      provider: best.provider,
      license: best.license,
      licenseUrl: best.licenseUrl,
      artist: best.artist,
      attribution: buildAttribution(best),
      selectedBy: "fallback-quote",
      selectedQuery: best.queryUsed,
    };
  }

  console.warn(`⚠️ No cachable quote image finalists for "${speakerName}"`);
  return null;
}
