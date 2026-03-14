// import { createClient } from "@supabase/supabase-js";
// import sharp from "sharp";
// import fs from "fs";

// const {
//   SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY,
//   PINTEREST_ACCESS_TOKEN,
//   SITE_URL,
//   PINTEREST_POSTING_ENABLED,
// } = process.env;

// if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
// if (!SUPABASE_SERVICE_ROLE_KEY) {
//   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
// }
// if (!SITE_URL) throw new Error("Missing SITE_URL");

// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// const PINTEREST_API_BASE_PROD = "https://api.pinterest.com";

// const BOARD_MAP = {
//   science: process.env.PINTEREST_BOARD_ID_SCIENCE,
//   technology: process.env.PINTEREST_BOARD_ID_TECHNOLOGY,
//   space: process.env.PINTEREST_BOARD_ID_SPACE,
//   nature: process.env.PINTEREST_BOARD_ID_NATURE,
//   health: process.env.PINTEREST_BOARD_ID_HEALTH,
//   history: process.env.PINTEREST_BOARD_ID_HISTORY,
//   culture: process.env.PINTEREST_BOARD_ID_CULTURE,
//   sports: process.env.PINTEREST_BOARD_ID_SPORTS,
//   products: process.env.PINTEREST_BOARD_ID_PRODUCTS,
//   world: process.env.PINTEREST_BOARD_ID_WORLD,
//   crime: process.env.PINTEREST_BOARD_ID_CRIME,
//   mystery: process.env.PINTEREST_BOARD_ID_MYSTERY,
//   general: process.env.PINTEREST_BOARD_ID_GENERAL,
// };

// function safeStr(v, fallback = "") {
//   return typeof v === "string" && v.trim() ? v.trim() : fallback;
// }

// function stripHtml(html) {
//   return String(html || "")
//     .replace(/<[^>]+>/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function normalizeImageSource(source) {
//   return safeStr(source).toLowerCase();
// }

// function needsVisibleCredit(card) {
//   return normalizeImageSource(card.image_source).includes("wikimedia");
// }

// function isPostingEnabled() {
//   return String(PINTEREST_POSTING_ENABLED || "").toLowerCase() === "true";
// }

// function buildDescription(card) {
//   const base =
//     safeStr(card.seo_description) ||
//     stripHtml(card.summary_normalized) ||
//     stripHtml(card.fun_fact) ||
//     stripHtml(card.card_text) ||
//     safeStr(card.title);

//   const articleUrl = `${SITE_URL}/article/${card.id}`;
//   return `${base}\n\nRead more: ${articleUrl}`.slice(0, 800);
// }

// function buildPinterestTitle(title) {
//   let t = safeStr(title);

//   if (!t) return "CurioWire";

//   t = t.replace(/[!?]+$/g, "").trim();

//   const replacements = [
//     [/^the truth about\s+/i, ""],
//     [/^the surprising truth about\s+/i, ""],
//     [/^why\s+/i, "Why "],
//     [/^how\s+/i, "How "],
//     [/^inside\s+/i, ""],
//     [/^discover\s+/i, ""],
//   ];

//   for (const [pattern, replacement] of replacements) {
//     t = t.replace(pattern, replacement).trim();
//   }

//   if (t.length <= 55) return t;

//   const shortened = t
//     .replace(/\s*\([^)]*\)/g, "")
//     .replace(/\s{2,}/g, " ")
//     .trim();

//   if (shortened.length <= 55) return shortened;

//   return shortened.slice(0, 52).replace(/[,:;-\s]+$/, "") + "…";
// }

// function escapeXml(str) {
//   return String(str || "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;");
// }

// function wrapTitle(title, maxLineLength = 20, maxLines = 4) {
//   const words = safeStr(title).split(/\s+/).filter(Boolean);
//   const lines = [];
//   let current = "";

//   for (const word of words) {
//     const candidate = current ? `${current} ${word}` : word;
//     if (candidate.length <= maxLineLength) {
//       current = candidate;
//     } else {
//       if (current) lines.push(current);
//       current = word;
//       if (lines.length >= maxLines - 1) break;
//     }
//   }

//   if (current && lines.length < maxLines) lines.push(current);

//   if (
//     lines.length === maxLines &&
//     words.join(" ").length > lines.join(" ").length
//   ) {
//     lines[maxLines - 1] =
//       lines[maxLines - 1].replace(/[.!?,:;-\s]*$/, "") + "…";
//   }

//   return lines.slice(0, maxLines);
// }

// function buildOverlaySVG(title, credit) {
//   const lines = wrapTitle(title);
//   const startY = 820;

//   const titleSvg = lines
//     .map((line, i) => {
//       const y = startY + i * 88;
//       const text = escapeXml(line);

//       return `
//       <text
//         x="82"
//         y="${y + 2}"
//         fill="black"
//         opacity="0.38"
//         font-size="76"
//         font-weight="800"
//         font-family="Arial, Helvetica, sans-serif"
//       >${text}</text>
//       <text
//         x="80"
//         y="${y}"
//         fill="white"
//         font-size="76"
//         font-weight="800"
//         font-family="Arial, Helvetica, sans-serif"
//       >${text}</text>`;
//     })
//     .join("");

//   const creditText = credit ? `Photo: ${credit}` : "";

//   return `
//   <svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">
//     <defs>
//       <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
//         <stop offset="0%" stop-color="rgba(0,0,0,0.10)" />
//         <stop offset="45%" stop-color="rgba(0,0,0,0.20)" />
//         <stop offset="100%" stop-color="rgba(0,0,0,0.82)" />
//       </linearGradient>
//     </defs>

//     <rect x="0" y="0" width="1000" height="1500" fill="url(#fade)" />

//     <rect
//       x="48"
//       y="710"
//       width="904"
//       height="390"
//       rx="34"
//       fill="black"
//       opacity="0.34"
//     />

//     ${titleSvg}

//     <text
//       x="80"
//       y="1388"
//       fill="white"
//       font-size="36"
//       font-weight="700"
//       font-family="Arial, Helvetica, sans-serif"
//       opacity="0.98"
//     >CurioWire.com</text>

//     ${
//       creditText
//         ? `
//     <text
//       x="80"
//       y="1442"
//       fill="white"
//       font-size="20"
//       font-family="Arial, Helvetica, sans-serif"
//       opacity="0.84"
//     >${escapeXml(creditText)}</text>`
//         : ""
//     }
//   </svg>
//   `;
// }

// async function createPinterestImage(card, overlayTitle) {
//   try {
//     const res = await fetch(card.image_url);
//     if (!res.ok) {
//       throw new Error(`Image download failed: ${res.status}`);
//     }

//     const buffer = Buffer.from(await res.arrayBuffer());

//     const credit = needsVisibleCredit(card) ? safeStr(card.image_credit) : "";
//     const overlaySVG = buildOverlaySVG(overlayTitle, credit);
//     const overlayBuffer = Buffer.from(overlaySVG);

//     const filePath = `/tmp/pinterest-${card.id}.jpg`;

//     await sharp(buffer)
//       .resize(1000, 1500, { fit: "cover", position: "centre" })
//       .composite([{ input: overlayBuffer }])
//       .jpeg({ quality: 92 })
//       .toFile(filePath);

//     return filePath;
//   } catch (err) {
//     console.warn("Pinterest image generation failed:", err.message);
//     return null;
//   }
// }

// async function uploadPinterestImage(filePath, cardId) {
//   try {
//     const storagePath = `pinterest/${cardId}.jpg`;

//     const { error: uploadError } = await supabase.storage
//       .from("curiowire")
//       .upload(storagePath, fs.readFileSync(filePath), {
//         contentType: "image/jpeg",
//         upsert: true,
//       });

//     if (uploadError) throw uploadError;

//     const { data } = supabase.storage
//       .from("curiowire")
//       .getPublicUrl(storagePath);

//     return data.publicUrl;
//   } catch (err) {
//     console.warn("Supabase upload failed:", err.message);
//     return null;
//   }
// }

// async function alreadyHandled(cardId) {
//   const { data, error } = await supabase
//     .from("pinterest_posts")
//     .select("id, status")
//     .eq("card_id", cardId)
//     .maybeSingle();

//   if (error) throw error;
//   return data || null;
// }

// async function postPin({ boardId, title, description, articleUrl, imageUrl }) {
//   if (!PINTEREST_ACCESS_TOKEN) {
//     throw new Error("Missing PINTEREST_ACCESS_TOKEN");
//   }

//   const res = await fetch(`${PINTEREST_API_BASE_PROD}/v5/pins`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       board_id: boardId,
//       title,
//       description,
//       link: articleUrl,
//       media_source: {
//         source_type: "image_url",
//         url: imageUrl,
//       },
//     }),
//   });

//   const data = await res.json().catch(() => ({}));
//   return { res, data };
// }

// async function insertPinterestRow(payload) {
//   const { error } = await supabase.from("pinterest_posts").insert(payload);
//   if (error) throw error;
// }

// async function run() {
//   console.log("Fetching latest article...");

//   const { data: card, error: cardError } = await supabase
//     .from("curiosity_cards")
//     .select("*")
//     .eq("status", "published")
//     .order("created_at", { ascending: false })
//     .limit(1)
//     .single();

//   if (cardError) throw cardError;

//   if (!card) {
//     console.log("No article found");
//     return;
//   }

//   if (!card.image_url) {
//     console.log(`Latest article ${card.id} has no image_url. Skipping.`);
//     return;
//   }

//   const existing = await alreadyHandled(card.id);
//   if (existing) {
//     console.log(
//       `Card ${card.id} already handled for Pinterest with status=${existing.status}. Skipping.`,
//     );
//     return;
//   }

//   console.log("Latest article:", card.id, card.title);

//   const boardId = BOARD_MAP[card.category] || BOARD_MAP.general;

//   if (!boardId) {
//     throw new Error(
//       `Missing production Pinterest board ID for category: ${card.category}`,
//     );
//   }

//   const description = buildDescription(card);
//   const articleUrl = `${SITE_URL}/article/${card.id}`;
//   const pinterestTitle = buildPinterestTitle(card.title);

//   let pinterestImageUrl = card.image_url;

//   const pinterestFile = await createPinterestImage(card, pinterestTitle);

//   if (pinterestFile) {
//     const uploadedUrl = await uploadPinterestImage(pinterestFile, card.id);
//     if (uploadedUrl) {
//       pinterestImageUrl = uploadedUrl;
//     }
//   }

//   if (!isPostingEnabled()) {
//     console.log(
//       "PINTEREST_POSTING_ENABLED is false. Skipping live Pinterest posting and saving test row only.",
//     );

//     await insertPinterestRow({
//       card_id: card.id,
//       pinterest_pin_id: null,
//       board_key: card.category,
//       destination_url: articleUrl,
//       image_url: pinterestImageUrl,
//       pin_title: pinterestTitle,
//       pin_description: description,
//       status: "skipped",
//     });

//     console.log("Pinterest test row stored.");
//     return;
//   }

//   console.log("Posting to Pinterest production API...");

//   const { res, data } = await postPin({
//     boardId,
//     title: pinterestTitle,
//     description,
//     articleUrl,
//     imageUrl: pinterestImageUrl,
//   });

//   console.log("Pinterest result:", data);

//   if (!res.ok || !data?.id) {
//     throw new Error(
//       `Pinterest post failed: ${res.status} ${JSON.stringify(data).slice(0, 500)}`,
//     );
//   }

//   await insertPinterestRow({
//     card_id: card.id,
//     pinterest_pin_id: data.id,
//     board_key: card.category,
//     destination_url: articleUrl,
//     image_url: pinterestImageUrl,
//     pin_title: pinterestTitle,
//     pin_description: description,
//     status: "posted",
//   });

//   console.log("Pinterest post stored.");
// }

// run().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PINTEREST_ACCESS_TOKEN,
  SITE_URL,
  PINTEREST_POSTING_ENABLED,
} = process.env;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}
if (!SITE_URL) throw new Error("Missing SITE_URL");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PINTEREST_API_BASE_PROD = "https://api.pinterest.com";

const BOARD_MAP = {
  science: process.env.PINTEREST_BOARD_ID_SCIENCE,
  technology: process.env.PINTEREST_BOARD_ID_TECHNOLOGY,
  space: process.env.PINTEREST_BOARD_ID_SPACE,
  nature: process.env.PINTEREST_BOARD_ID_NATURE,
  health: process.env.PINTEREST_BOARD_ID_HEALTH,
  history: process.env.PINTEREST_BOARD_ID_HISTORY,
  culture: process.env.PINTEREST_BOARD_ID_CULTURE,
  sports: process.env.PINTEREST_BOARD_ID_SPORTS,
  products: process.env.PINTEREST_BOARD_ID_PRODUCTS,
  world: process.env.PINTEREST_BOARD_ID_WORLD,
  crime: process.env.PINTEREST_BOARD_ID_CRIME,
  mystery: process.env.PINTEREST_BOARD_ID_MYSTERY,
  general: process.env.PINTEREST_BOARD_ID_GENERAL,
};

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageSource(source) {
  return safeStr(source).toLowerCase();
}

function isWikimedia(card) {
  return normalizeImageSource(card.image_source).includes("wikimedia");
}

function isPostingEnabled() {
  return String(PINTEREST_POSTING_ENABLED || "").toLowerCase() === "true";
}

function titleCase(s) {
  return safeStr(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeWhitespace(str) {
  return safeStr(str).replace(/\s+/g, " ").trim();
}

function stripTrailingPunctuation(str) {
  return safeStr(str)
    .replace(/[.!?,:;…\-\s]+$/g, "")
    .trim();
}

function stripParenthetical(str) {
  return safeStr(str)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(str) {
  const s = normalizeWhitespace(str);
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function splitTitleParts(title) {
  const raw = normalizeWhitespace(title);
  if (!raw) return { left: "", right: "" };

  const separators = [":", "—", "–", "-", "|"];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      const left = raw.slice(0, idx).trim();
      const right = raw.slice(idx + 1).trim();
      if (left && right) return { left, right };
    }
  }

  return { left: raw, right: "" };
}

function extractPrimaryTopic(title) {
  const { left } = splitTitleParts(title);
  return stripTrailingPunctuation(stripParenthetical(left || title));
}

function extractSecondaryTopic(title) {
  const { right } = splitTitleParts(title);
  return stripTrailingPunctuation(stripParenthetical(right));
}

function extractInterestingAngle(card) {
  const candidates = [
    safeStr(card.seo_description),
    stripHtml(card.summary_normalized),
    stripHtml(card.fun_fact),
    stripHtml(card.card_text),
  ]
    .map(normalizeWhitespace)
    .filter(Boolean);

  for (const text of candidates) {
    const patterns = [
      /(?:reveals?|show(?:s|ed)?|explains?|uncovers?|suggests?)\s+(.*?)(?:[.?!]|$)/i,
      /(?:understanding of|evidence of|insight into)\s+(.*?)(?:[.?!]|$)/i,
      /(?:about)\s+(.*?)(?:[.?!]|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const cleaned = stripTrailingPunctuation(
          normalizeWhitespace(
            match[1]
              .replace(/^(that|how)\s+/i, "")
              .replace(/\bfrom over .*$/i, "")
              .replace(/\bover \d[\d,.\s-]* years? ago.*$/i, "")
              .replace(/\bmore than \d[\d,.\s-]* years? ago.*$/i, ""),
          ),
        );

        if (cleaned.length >= 8) return cleaned;
      }
    }
  }

  return "";
}

function categoryAngleLabel(category) {
  switch (safeStr(category).toLowerCase()) {
    case "science":
      return "science";
    case "technology":
      return "technology";
    case "space":
      return "space";
    case "nature":
      return "nature";
    case "health":
      return "health";
    case "history":
      return "history";
    case "culture":
      return "culture";
    case "sports":
      return "sports";
    case "products":
      return "design";
    case "world":
      return "history";
    case "crime":
      return "mystery";
    case "mystery":
      return "mystery";
    default:
      return "story";
  }
}

function words(str) {
  return normalizeWhitespace(str).split(" ").filter(Boolean);
}

function limitWords(str, maxWords = 6) {
  const w = words(stripTrailingPunctuation(str));
  if (w.length <= maxWords) return w.join(" ");
  return w.slice(0, maxWords).join(" ");
}

function shortenNaturalByWords(str, maxWords = 6, maxChars = 48) {
  let s = stripTrailingPunctuation(normalizeWhitespace(str));
  if (!s) return "";

  let w = words(s);
  if (w.length > maxWords) {
    s = w.slice(0, maxWords).join(" ");
  }

  if (s.length <= maxChars) return s;

  const trimmed = s.slice(0, maxChars + 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 0) {
    s = trimmed.slice(0, lastSpace);
  } else {
    s = s.slice(0, maxChars);
  }

  return stripTrailingPunctuation(s) + "…";
}

function dedupeTitleCandidates(candidates) {
  const seen = new Set();
  const results = [];

  for (const item of candidates) {
    const normalized = normalizeWhitespace(item.title).toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(item);
  }

  return results;
}

function buildPinterestTitle(title) {
  return shortenNaturalByWords(title, 6, 48);
}

function buildOverlayTitle(title) {
  return shortenNaturalByWords(title, 7, 52);
}

function buildTitleVariants(card) {
  const topic = extractPrimaryTopic(card.title);
  const secondary = extractSecondaryTopic(card.title);
  const angle = extractInterestingAngle(card);
  const categoryLabel = categoryAngleLabel(card.category);

  const baseTopic = stripTrailingPunctuation(topic) || "This Story";
  const shortSecondary = secondary ? limitWords(secondary, 4) : "";
  const shortAngle = angle ? limitWords(sentenceCase(angle), 4) : "";

  const candidates = dedupeTitleCandidates([
    {
      key: "secret",
      title: `The secret of ${baseTopic}`,
    },
    {
      key: "why",
      title: `Why ${baseTopic} matters`,
    },
    {
      key: "inside",
      title: `Inside ${baseTopic}`,
    },
    {
      key: "surprising",
      title: `The surprising ${categoryLabel} of ${baseTopic}`,
    },
    {
      key: "explained",
      title: `${baseTopic} explained`,
    },
    {
      key: "secondary",
      title: shortSecondary
        ? `${shortSecondary} in ${baseTopic}`
        : `What makes ${baseTopic} special`,
    },
    {
      key: "angle",
      title: shortAngle
        ? `${baseTopic} and ${shortAngle}`
        : `What ${baseTopic} reveals`,
    },
    {
      key: "story",
      title: `The story of ${baseTopic}`,
    },
  ]);

  const results = [];

  for (const candidate of candidates) {
    const pinTitle = buildPinterestTitle(candidate.title);
    const overlayTitle = buildOverlayTitle(candidate.title);

    if (!pinTitle || !overlayTitle) continue;

    results.push({
      key: candidate.key,
      pinTitle,
      overlayTitle,
    });

    if (results.length === 3) break;
  }

  if (results.length < 3) {
    const fallbacks = [
      { key: "fallback_1", title: `${baseTopic} explained` },
      { key: "fallback_2", title: `Inside ${baseTopic}` },
      { key: "fallback_3", title: `Why ${baseTopic} matters` },
    ];

    for (const fallback of fallbacks) {
      if (results.length >= 3) break;

      const exists = results.some((r) => r.key === fallback.key);
      if (exists) continue;

      results.push({
        key: fallback.key,
        pinTitle: buildPinterestTitle(fallback.title),
        overlayTitle: buildOverlayTitle(fallback.title),
      });
    }
  }

  return results.slice(0, 3);
}

function buildDescription(card) {
  const base =
    safeStr(card.seo_description) ||
    stripHtml(card.summary_normalized) ||
    stripHtml(card.fun_fact) ||
    stripHtml(card.card_text) ||
    safeStr(card.title);

  const articleUrl = `${SITE_URL}/article/${card.id}`;

  let desc = `${base}\n\nRead more: ${articleUrl}`;

  if (isWikimedia(card) && safeStr(card.image_credit)) {
    desc += `\n\nImage credit: ${stripHtml(card.image_credit)}`;
  }

  return desc.slice(0, 800);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(title, maxLineLength = 18, maxLines = 4) {
  const titleWords = safeStr(title).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of titleWords) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = "";
    }

    if (lines.length >= maxLines - 1) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const original = titleWords.join(" ");
  const rendered = lines.join(" ");
  if (lines.length === maxLines && original.length > rendered.length) {
    lines[maxLines - 1] = stripTrailingPunctuation(lines[maxLines - 1]) + "…";
  }

  return lines.slice(0, maxLines);
}

function buildOverlaySVG(title, category) {
  const lines = wrapTitle(title, 18, 4);
  const lineHeight = 78;
  const blockHeight = lines.length * lineHeight;

  // Tekst litt lenger ned enn før
  const startY = 1500 - 135 - blockHeight;

  // Litt mer luft mellom kategori og tittel
  const kickerGap = 62;

  const titleSvg = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      const text = escapeXml(line);

      return `
      <text
        x="70"
        y="${y + 3}"
        fill="rgba(0,0,0,0.45)"
        font-size="66"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>
      <text
        x="68"
        y="${y}"
        fill="white"
        font-size="66"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>`;
    })
    .join("");

  const kicker = escapeXml(titleCase(category || "CurioWire"));

  return `
  <svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)" />
        <stop offset="18%" stop-color="rgba(0,0,0,0.02)" />
        <stop offset="34%" stop-color="rgba(0,0,0,0.08)" />
        <stop offset="50%" stop-color="rgba(0,0,0,0.18)" />
        <stop offset="66%" stop-color="rgba(0,0,0,0.38)" />
        <stop offset="82%" stop-color="rgba(0,0,0,0.68)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.96)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="1000" height="1500" fill="url(#bottomFade)" />

    <text
      x="70"
      y="${startY - kickerGap}"
      fill="rgba(255,255,255,0.94)"
      font-size="28"
      font-weight="700"
      font-family="Arial, Helvetica, sans-serif"
      letter-spacing="2"
    >${kicker.toUpperCase()}</text>

    ${titleSvg}

    <text
      x="68"
      y="1434"
      fill="rgba(255,255,255,0.95)"
      font-size="30"
      font-weight="600"
      font-family="Arial, Helvetica, sans-serif"
    >CurioWire.com</text>
  </svg>
  `;
}

async function createPinterestImage(card, overlayTitle, variantKey) {
  try {
    const res = await fetch(card.image_url);
    if (!res.ok) {
      throw new Error(`Image download failed: ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const overlaySVG = buildOverlaySVG(overlayTitle, card.category);
    const overlayBuffer = Buffer.from(overlaySVG);

    const filePath = `/tmp/pinterest-${card.id}-${variantKey}.jpg`;

    await sharp(buffer)
      .resize(1000, 1500, { fit: "cover", position: "centre" })
      .composite([{ input: overlayBuffer }])
      .jpeg({ quality: 92 })
      .toFile(filePath);

    return filePath;
  } catch (err) {
    console.warn("Pinterest image generation failed:", err.message);
    return null;
  }
}

async function uploadPinterestImage(filePath, cardId, variantKey) {
  try {
    const storagePath = `pinterest/${cardId}-${variantKey}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("curiowire")
      .upload(storagePath, fs.readFileSync(filePath), {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("curiowire")
      .getPublicUrl(storagePath);

    return data.publicUrl;
  } catch (err) {
    console.warn("Supabase upload failed:", err.message);
    return null;
  }
}

async function existingPostsForCard(cardId) {
  const { data, error } = await supabase
    .from("pinterest_posts")
    .select("id, status, pin_title, variant_key")
    .eq("card_id", cardId);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function postPin({ boardId, title, description, articleUrl, imageUrl }) {
  if (!PINTEREST_ACCESS_TOKEN) {
    throw new Error("Missing PINTEREST_ACCESS_TOKEN");
  }

  const res = await fetch(`${PINTEREST_API_BASE_PROD}/v5/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title,
      description,
      link: articleUrl,
      media_source: {
        source_type: "image_url",
        url: imageUrl,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function insertPinterestRow(payload) {
  const { error } = await supabase.from("pinterest_posts").insert(payload);
  if (error) throw error;
}

async function run() {
  console.log("Fetching latest article...");

  const { data: card, error: cardError } = await supabase
    .from("curiosity_cards")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (cardError) throw cardError;

  if (!card) {
    console.log("No article found");
    return;
  }

  if (!card.image_url) {
    console.log(`Latest article ${card.id} has no image_url. Skipping.`);
    return;
  }

  console.log("Latest article:", card.id, card.title);

  const boardId = BOARD_MAP[card.category] || BOARD_MAP.general;

  if (!boardId) {
    throw new Error(
      `Missing production Pinterest board ID for category: ${card.category}`,
    );
  }

  const articleUrl = `${SITE_URL}/article/${card.id}`;
  const description = buildDescription(card);
  const variants = buildTitleVariants(card);
  const existing = await existingPostsForCard(card.id);

  const existingVariants = new Set(
    existing
      .map((row) => safeStr(row.variant_key).toLowerCase())
      .filter(Boolean),
  );

  console.log(
    "Prepared Pinterest variants:",
    variants
      .map((v) => `[${v.key}] pin="${v.pinTitle}" overlay="${v.overlayTitle}"`)
      .join(" | "),
  );

  for (const variant of variants) {
    if (existingVariants.has(variant.key.toLowerCase())) {
      console.log(
        `Variant already handled for card ${card.id}: "${variant.key}". Skipping.`,
      );
      continue;
    }

    let pinterestImageUrl = card.image_url;

    const pinterestFile = await createPinterestImage(
      card,
      variant.overlayTitle,
      variant.key,
    );

    if (pinterestFile) {
      const uploadedUrl = await uploadPinterestImage(
        pinterestFile,
        card.id,
        variant.key,
      );
      if (uploadedUrl) {
        pinterestImageUrl = uploadedUrl;
      }
    }

    if (!isPostingEnabled()) {
      console.log(
        `PINTEREST_POSTING_ENABLED is false. Saving test row only for variant "${variant.key}".`,
      );

      await insertPinterestRow({
        card_id: card.id,
        variant_key: variant.key,
        pinterest_pin_id: null,
        board_key: card.category,
        destination_url: articleUrl,
        image_url: pinterestImageUrl,
        pin_title: variant.pinTitle,
        pin_description: description,
        status: "skipped",
      });

      console.log(`Pinterest test row stored for variant "${variant.key}".`);
      continue;
    }

    console.log(`Posting to Pinterest: [${variant.key}] ${variant.pinTitle}`);
    console.log(`Overlay title: ${variant.overlayTitle}`);

    const { res, data } = await postPin({
      boardId,
      title: variant.pinTitle,
      description,
      articleUrl,
      imageUrl: pinterestImageUrl,
    });

    console.log("Pinterest result:", data);

    if (!res.ok || !data?.id) {
      throw new Error(
        `Pinterest post failed: ${res.status} ${JSON.stringify(data).slice(0, 500)}`,
      );
    }

    await insertPinterestRow({
      card_id: card.id,
      variant_key: variant.key,
      pinterest_pin_id: data.id,
      board_key: card.category,
      destination_url: articleUrl,
      image_url: pinterestImageUrl,
      pin_title: variant.pinTitle,
      pin_description: description,
      status: "posted",
    });

    console.log(`Pinterest post stored for variant "${variant.key}".`);
  }

  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
