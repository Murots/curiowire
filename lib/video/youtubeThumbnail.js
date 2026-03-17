// // ============================================================================
// // lib/video/youtubeThumbnail.js
// // CurioWire YouTube thumbnail generator
// // v1: article image + GPT hook + bold signal color text
// // ============================================================================

// import OpenAI from "openai";
// import sharp from "sharp";
// import fs from "fs-extra";
// import path from "path";
// import crypto from "crypto";

// const TMP_DIR = "./generated_videos/thumbnails";
// fs.ensureDirSync(TMP_DIR);

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// function safeStr(v, fallback = "") {
//   return typeof v === "string" && v.trim() ? v.trim() : fallback;
// }

// function stripHtml(html) {
//   return String(html || "")
//     .replace(/<[^>]+>/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function normalizeWhitespace(str) {
//   return safeStr(str).replace(/\s+/g, " ").trim();
// }

// function words(str) {
//   return normalizeWhitespace(str).split(" ").filter(Boolean);
// }

// function stripQuotes(str) {
//   return safeStr(str)
//     .replace(/["'“”‘’]/g, "")
//     .trim();
// }

// function limitWords(str, maxWords = 5) {
//   const w = words(str);
//   if (w.length <= maxWords) return w.join(" ");
//   return w.slice(0, maxWords).join(" ");
// }

// function normalizeForCompare(str) {
//   return normalizeWhitespace(str)
//     .toLowerCase()
//     .replace(/[^\w\s]/g, "")
//     .trim();
// }

// function isValidHook(str) {
//   const s = normalizeWhitespace(stripQuotes(str));
//   if (!s) return false;

//   const count = words(s).length;
//   if (count < 2 || count > 5) return false;
//   if (s.length > 32) return false;

//   return true;
// }

// function toUpperDisplay(str) {
//   return stripQuotes(normalizeWhitespace(str)).toUpperCase();
// }

// function wrapTitle(title, maxLineLength = 12, maxLines = 3) {
//   const titleWords = safeStr(title).split(/\s+/).filter(Boolean);
//   const lines = [];
//   let current = "";

//   for (const word of titleWords) {
//     const candidate = current ? `${current} ${word}` : word;

//     if (candidate.length <= maxLineLength) {
//       current = candidate;
//       continue;
//     }

//     if (current) {
//       lines.push(current);
//       current = word;
//     } else {
//       lines.push(word);
//       current = "";
//     }

//     if (lines.length >= maxLines - 1) break;
//   }

//   if (current && lines.length < maxLines) {
//     lines.push(current);
//   }

//   const original = titleWords.join(" ");
//   const rendered = lines.join(" ");
//   if (lines.length === maxLines && original.length > rendered.length) {
//     lines[maxLines - 1] =
//       lines[maxLines - 1].replace(/[.!?,:;…\-\s]+$/g, "") + "…";
//   }

//   return lines.slice(0, maxLines);
// }

// function pickSignalColor(card) {
//   const palette = [
//     "#FF2D8D", // signal pink
//     "#B6FF00", // signal lime
//     "#FFD400", // signal yellow
//     "#FF6A00", // signal orange
//     "#00E5FF", // signal cyan
//   ];

//   const seed = `${safeStr(card.category)}-${safeStr(card.title)}-${safeStr(card.id)}`;
//   const hash = crypto.createHash("md5").update(seed).digest("hex");
//   const idx = parseInt(hash.slice(0, 8), 16) % palette.length;
//   return palette[idx];
// }

// function buildFallbackHooks(card) {
//   const title = safeStr(card.title);
//   const category = safeStr(card.category).toLowerCase();

//   const generic = [
//     "YOU WONT BELIEVE THIS",
//     "THIS WAS REAL",
//     "HISTORY HID THIS",
//   ];

//   if (!title) return generic;

//   if (title.toLowerCase().includes("ottoman")) {
//     return [
//       "A DEADLY PALACE JOB",
//       "THE SULTAN ATE LAST",
//       "THEY TASTED FOR POISON",
//     ];
//   }

//   if (title.toLowerCase().includes("qing")) {
//     return [
//       "THE HIDDEN PRICE OF SALT",
//       "THE EMPIRE TOOK A CUT",
//       "TRADE WAS NEVER CHEAP",
//     ];
//   }

//   if (category === "history") {
//     return [
//       "HISTORY HID THIS",
//       "THEY NEVER TAUGHT THIS",
//       "THE PAST WAS BRUTAL",
//     ];
//   }

//   if (category === "science") {
//     return [
//       "SCIENCE FOUND THIS",
//       "THIS CHANGED EVERYTHING",
//       "THE RESULT WAS WILD",
//     ];
//   }

//   if (category === "space") {
//     return ["SPACE HID THIS", "THIS SHOULDNT EXIST", "THE SKY GOT STRANGER"];
//   }

//   return generic;
// }

// async function generateThumbnailHooksWithGPT(card) {
//   const prompt = `
// Create 3 ultra-clickable YouTube thumbnail hooks for a Shorts video.

// Rules:
// - Return ONLY valid JSON.
// - Write in English.
// - Each hook must be 2 to 5 words.
// - Maximum 32 characters per hook.
// - Make them punchy, bold, curiosity-driven.
// - They must be factually tied to the article.
// - Avoid generic filler like AMAZING, INCREDIBLE, INTERESTING.
// - Avoid punctuation except apostrophes if absolutely needed.
// - No emojis.
// - No quotation marks.
// - Do NOT simply restate the article title.
// - Prefer dramatic compression over full explanation.

// Return exactly:
// {
//   "hooks": [
//     "hook one",
//     "hook two",
//     "hook three"
//   ]
// }

// Article title: ${safeStr(card.title)}
// Category: ${safeStr(card.category)}
// SEO description: ${safeStr(card.seo_description)}
// Summary: ${stripHtml(card.summary_normalized).slice(0, 500)}
// Fun fact: ${stripHtml(card.fun_fact).slice(0, 300)}
// Card text: ${stripHtml(card.card_text).slice(0, 500)}
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 120,
//       temperature: 0.8,
//       response_format: { type: "json_object" },
//     });

//     const content = r.choices?.[0]?.message?.content || "{}";
//     const parsed = JSON.parse(content);
//     return Array.isArray(parsed.hooks) ? parsed.hooks : [];
//   } catch (err) {
//     console.warn("⚠️ GPT thumbnail hook generation failed:", err.message);
//     return [];
//   }
// }

// async function selectBestHook(card) {
//   const gptHooks = await generateThumbnailHooksWithGPT(card);

//   const seen = new Set();
//   const valid = [];

//   for (const hook of gptHooks) {
//     const cleaned = normalizeWhitespace(stripQuotes(hook));
//     if (!isValidHook(cleaned)) continue;

//     const normalized = normalizeForCompare(cleaned);
//     if (!normalized || seen.has(normalized)) continue;

//     seen.add(normalized);
//     valid.push(cleaned);
//   }

//   if (valid.length) {
//     return toUpperDisplay(limitWords(valid[0], 5));
//   }

//   const fallback = buildFallbackHooks(card);
//   for (const hook of fallback) {
//     if (isValidHook(hook)) {
//       return toUpperDisplay(limitWords(hook, 5));
//     }
//   }

//   return "WATCH THIS";
// }

// function escapeXml(str) {
//   return String(str || "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;");
// }

// function buildOverlaySvg(hook, category, signalColor) {
//   const lines = wrapTitle(hook, 12, 3);
//   const lineHeight = 112;
//   const blockHeight = lines.length * lineHeight;
//   const startY = 720 - 110 - blockHeight;

//   const titleSvg = lines
//     .map((line, i) => {
//       const y = startY + i * lineHeight;
//       const text = escapeXml(line);

//       return `
//       <text
//         x="74"
//         y="${y + 6}"
//         fill="rgba(0,0,0,0.60)"
//         font-size="96"
//         font-weight="900"
//         font-family="Arial Black, Impact, Arial, Helvetica, sans-serif"
//       >${text}</text>
//       <text
//         x="68"
//         y="${y}"
//         fill="${signalColor}"
//         font-size="96"
//         font-weight="900"
//         font-family="Arial Black, Impact, Arial, Helvetica, sans-serif"
//       >${text}</text>`;
//     })
//     .join("");

//   const kicker = escapeXml((safeStr(category) || "CurioWire").toUpperCase());

//   return `
//   <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
//     <defs>
//       <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
//         <stop offset="0%" stop-color="rgba(0,0,0,0.78)" />
//         <stop offset="45%" stop-color="rgba(0,0,0,0.42)" />
//         <stop offset="100%" stop-color="rgba(0,0,0,0.02)" />
//       </linearGradient>
//       <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
//         <stop offset="0%" stop-color="rgba(0,0,0,0)" />
//         <stop offset="65%" stop-color="rgba(0,0,0,0.12)" />
//         <stop offset="100%" stop-color="rgba(0,0,0,0.48)" />
//       </linearGradient>
//     </defs>

//     <rect x="0" y="0" width="1280" height="720" fill="url(#leftFade)" />
//     <rect x="0" y="0" width="1280" height="720" fill="url(#bottomFade)" />

//     <rect x="68" y="48" width="210" height="44" rx="8" fill="${signalColor}" />
//     <text
//       x="86"
//       y="79"
//       fill="black"
//       font-size="24"
//       font-weight="900"
//       font-family="Arial Black, Impact, Arial, Helvetica, sans-serif"
//       letter-spacing="1.2"
//     >${kicker}</text>

//     ${titleSvg}

//     <text
//       x="70"
//       y="678"
//       fill="rgba(255,255,255,0.95)"
//       font-size="28"
//       font-weight="800"
//       font-family="Arial, Helvetica, sans-serif"
//       letter-spacing="1.1"
//     >CURIOWIRE</text>
//   </svg>
//   `;
// }

// export async function createYouTubeThumbnail(card) {
//   const imageUrl = safeStr(card?.image_url);
//   if (!imageUrl) {
//     throw new Error("createYouTubeThumbnail: Missing card.image_url");
//   }

//   const hook = await selectBestHook(card);
//   const signalColor = pickSignalColor(card);

//   const response = await fetch(imageUrl);
//   if (!response.ok) {
//     throw new Error(`Thumbnail image download failed: ${response.status}`);
//   }

//   const imageBuffer = Buffer.from(await response.arrayBuffer());
//   const overlaySvg = buildOverlaySvg(hook, card.category, signalColor);
//   const overlayBuffer = Buffer.from(overlaySvg);

//   const filename = `${safeStr(card.id, "card")}-youtube-thumb.jpg`;
//   const outPath = path.join(TMP_DIR, filename);

//   await sharp(imageBuffer)
//     .resize(1280, 720, {
//       fit: "cover",
//       position: "centre",
//     })
//     .composite([{ input: overlayBuffer }])
//     .jpeg({ quality: 92, mozjpeg: true })
//     .toFile(outPath);

//   console.log("🖼️ YouTube thumbnail created:", outPath);
//   console.log("🧠 YouTube thumbnail hook:", hook);

//   return {
//     path: outPath,
//     hook,
//     signalColor,
//   };
// }

// ============================================================================
// lib/video/youtubeThumbnail.js
// CurioWire YouTube thumbnail generator
// v3: Shorts-first vertical thumbnail (1080x1920)
// - article image + GPT hook + bold signal color text
// - optimized for 4–5 word hooks with layout-aware fallback
// - CURIOWIRE.COM placed directly under hook
// - text placed high enough for Shorts preview safety
// ============================================================================

import OpenAI from "openai";
import sharp from "sharp";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";

const TMP_DIR = "./generated_videos/thumbnails";
fs.ensureDirSync(TMP_DIR);

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return new OpenAI({ apiKey });
}

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWhitespace(str) {
  return safeStr(str).replace(/\s+/g, " ").trim();
}

function words(str) {
  return normalizeWhitespace(str).split(" ").filter(Boolean);
}

function stripQuotes(str) {
  return safeStr(str)
    .replace(/["'“”‘’]/g, "")
    .trim();
}

function limitWords(str, maxWords = 5) {
  const w = words(str);
  if (w.length <= maxWords) return w.join(" ");
  return w.slice(0, maxWords).join(" ");
}

function normalizeForCompare(str) {
  return normalizeWhitespace(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

function isValidHook(str) {
  const s = normalizeWhitespace(stripQuotes(str));
  if (!s) return false;

  const count = words(s).length;
  if (count < 4 || count > 5) return false;
  if (s.length > 42) return false;

  return true;
}

function toUpperDisplay(str) {
  return stripQuotes(normalizeWhitespace(str)).toUpperCase();
}

function wrapTitle(title, maxLineLength = 14, maxLines = 3) {
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
    lines[maxLines - 1] =
      lines[maxLines - 1].replace(/[.!?,:;…\-\s]+$/g, "") + "…";
  }

  return lines.slice(0, maxLines);
}

function pickSignalColor(card) {
  const palette = [
    "#FF2D8D", // signal pink
    "#B6FF00", // signal lime
    "#FFD400", // signal yellow
    "#FF6A00", // signal orange
    "#00E5FF", // signal cyan
  ];

  const seed = `${safeStr(card.category)}-${safeStr(card.title)}-${safeStr(card.id)}`;
  const hash = crypto.createHash("md5").update(seed).digest("hex");
  const idx = parseInt(hash.slice(0, 8), 16) % palette.length;
  return palette[idx];
}

function buildFallbackHooks(card) {
  const title = safeStr(card.title);
  const category = safeStr(card.category).toLowerCase();

  const generic = [
    "YOU WONT BELIEVE THIS",
    "THIS WAS MORE BRUTAL",
    "HISTORY HID THIS TRUTH",
  ];

  if (!title) return generic;

  if (title.toLowerCase().includes("ottoman")) {
    return [
      "A DEADLY PALACE JOB",
      "THE SULTAN ATE LAST",
      "THEY TASTED FOR POISON",
    ];
  }

  if (title.toLowerCase().includes("qing")) {
    return [
      "THE HIDDEN PRICE OF SALT",
      "THE EMPIRE TOOK A CUT",
      "TRADE WAS NEVER CHEAP",
    ];
  }

  if (title.toLowerCase().includes("okina")) {
    return [
      "THE SECRET OF OKINA",
      "WHY THIS MASK MATTERS",
      "JAPANS OLDEST MASK RITUAL",
    ];
  }

  if (title.toLowerCase().includes("noh")) {
    return [
      "THE SECRET NOH RITUAL",
      "WHY THIS MASK MATTERS",
      "A SACRED STAGE TRADITION",
    ];
  }

  if (category === "history") {
    return [
      "HISTORY HID THIS TRUTH",
      "THEY NEVER TAUGHT THIS",
      "THE PAST WAS MORE BRUTAL",
    ];
  }

  if (category === "science") {
    return [
      "SCIENCE FOUND SOMETHING STRANGE",
      "THIS CHANGED EVERYTHING FAST",
      "THE RESULT WAS TRULY WILD",
    ];
  }

  if (category === "space") {
    return [
      "SPACE HID SOMETHING STRANGE",
      "THIS SHOULD NOT EXIST",
      "THE SKY GOT EVEN STRANGER",
    ];
  }

  if (category === "culture") {
    return [
      "THE SECRET RITUAL BEHIND THIS",
      "WHY THIS MASK MATTERS",
      "A SACRED HIDDEN STAGE TRADITION",
    ];
  }

  return generic;
}

async function generateThumbnailHooksWithGPT(card) {
  const openai = getOpenAI();

  const prompt = `
Create 3 ultra-clickable YouTube thumbnail hooks for a Shorts video.

Rules:
- Return ONLY valid JSON.
- Write in English.
- Each hook must be 4 to 5 words.
- Prefer 5 words when it improves clickability.
- Use 4 words if that makes the hook cleaner, punchier, or easier to fit on 3 lines.
- Maximum 42 characters per hook.
- Make them punchy, bold, curiosity-driven.
- They must be factually tied to the article.
- Avoid generic filler like AMAZING, INCREDIBLE, INTERESTING.
- Avoid punctuation except apostrophes if absolutely needed.
- No emojis.
- No quotation marks.
- Do NOT simply restate the article title.
- Prefer dramatic compression over full explanation.
- Prefer hooks that still feel specific, not vague.
- Strongly prefer hooks that work visually on a Shorts cover.
- The best hook should feel more clickable than the article title.

Return exactly:
{
  "hooks": [
    "hook one",
    "hook two",
    "hook three"
  ]
}

Article title: ${safeStr(card.title)}
Category: ${safeStr(card.category)}
SEO description: ${safeStr(card.seo_description)}
Summary: ${stripHtml(card.summary_normalized).slice(0, 500)}
Fun fact: ${stripHtml(card.fun_fact).slice(0, 300)}
Card text: ${stripHtml(card.card_text).slice(0, 500)}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = r.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.hooks) ? parsed.hooks : [];
  } catch (err) {
    console.warn("⚠️ GPT thumbnail hook generation failed:", err.message);
    return [];
  }
}

async function selectBestHook(card) {
  function fitHookForLayout(rawHook) {
    const cleaned = normalizeWhitespace(stripQuotes(rawHook));
    if (!cleaned) return null;

    const fiveWord = limitWords(cleaned, 5);
    const fiveDisplay = toUpperDisplay(fiveWord);
    const fiveLines = wrapTitle(fiveDisplay, 16, 3);
    const fiveOverflow = fiveLines.some((line) => line.endsWith("…"));

    if (!fiveOverflow) {
      return fiveDisplay;
    }

    const fourWord = limitWords(cleaned, 4);
    const fourDisplay = toUpperDisplay(fourWord);
    const fourLines = wrapTitle(fourDisplay, 16, 3);
    const fourOverflow = fourLines.some((line) => line.endsWith("…"));

    if (!fourOverflow) {
      return fourDisplay;
    }

    return fourDisplay;
  }

  const gptHooks = await generateThumbnailHooksWithGPT(card);

  const seen = new Set();
  const valid = [];

  for (const hook of gptHooks) {
    const cleaned = normalizeWhitespace(stripQuotes(hook));
    if (!isValidHook(cleaned)) continue;

    const normalized = normalizeForCompare(cleaned);
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    valid.push(cleaned);
  }

  if (valid.length) {
    return fitHookForLayout(valid[0]);
  }

  const fallback = buildFallbackHooks(card);
  for (const hook of fallback) {
    if (isValidHook(hook)) {
      return fitHookForLayout(hook);
    }
  }

  return "WATCH THIS NOW";
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOverlaySvg(hook, category, signalColor) {
  const lines = wrapTitle(hook, 16, 3);
  const lineHeight = 128;
  const blockHeight = lines.length * lineHeight;

  // Keep hook high in frame for Shorts preview safety
  const startY = 300;

  const titleSvg = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      const text = escapeXml(line);

      return `
      <text
        x="88"
        y="${y + 7}"
        fill="rgba(0,0,0,0.62)"
        font-size="104"
        font-weight="900"
        font-family="Arial Black, Impact, Arial, Helvetica, sans-serif"
      >${text}</text>
      <text
        x="80"
        y="${y}"
        fill="${signalColor}"
        font-size="104"
        font-weight="900"
        font-family="Arial Black, Impact, Arial, Helvetica, sans-serif"
      >${text}</text>`;
    })
    .join("");

  const kicker = escapeXml((safeStr(category) || "CurioWire").toUpperCase());

  const brandY = startY + blockHeight + 54;

  return `
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0.72)" />
        <stop offset="36%" stop-color="rgba(0,0,0,0.34)" />
        <stop offset="68%" stop-color="rgba(0,0,0,0.08)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.00)" />
      </linearGradient>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)" />
        <stop offset="58%" stop-color="rgba(0,0,0,0.06)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.40)" />
      </linearGradient>
      <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(0,0,0,0.34)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.00)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="1080" height="1920" fill="url(#topFade)" />
    <rect x="0" y="0" width="1080" height="1920" fill="url(#bottomFade)" />
    <rect x="0" y="0" width="1080" height="1920" fill="url(#leftFade)" />

    <rect x="80" y="88" width="260" height="58" rx="12" fill="${signalColor}" />
    <text
      x="104"
      y="128"
      fill="black"
      font-size="30"
      font-weight="900"
      font-family="Arial Black, Impact, Arial, Helvetica, sans-serif"
      letter-spacing="1.4"
    >${kicker}</text>

    ${titleSvg}

    <text
      x="84"
      y="${brandY}"
      fill="rgba(255,255,255,0.96)"
      font-size="42"
      font-weight="800"
      font-family="Arial, Helvetica, sans-serif"
      letter-spacing="1.1"
    >CURIOWIRE.COM</text>
  </svg>
  `;
}

export async function createYouTubeThumbnail(card) {
  const imageUrl = safeStr(card?.image_url);
  if (!imageUrl) {
    throw new Error("createYouTubeThumbnail: Missing card.image_url");
  }

  const hook = await selectBestHook(card);
  const signalColor = pickSignalColor(card);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Thumbnail image download failed: ${response.status}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const overlaySvg = buildOverlaySvg(hook, card.category, signalColor);
  const overlayBuffer = Buffer.from(overlaySvg);

  const filename = `${safeStr(card.id, "card")}-youtube-thumb.jpg`;
  const outPath = path.join(TMP_DIR, filename);

  await sharp(imageBuffer)
    .resize(1080, 1920, {
      fit: "cover",
      position: "centre",
    })
    .composite([{ input: overlayBuffer }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outPath);

  console.log("🖼️ YouTube thumbnail created:", outPath);
  console.log("🧠 YouTube thumbnail hook:", hook);

  return {
    path: outPath,
    hook,
    signalColor,
  };
}
