import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import sharp from "sharp";
import fs from "fs";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SITE_URL,
  OPENAI_API_KEY,

  X_POSTING_ENABLED,
  X_API_KEY,
  X_API_KEY_SECRET,
  X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET,
} = process.env;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}
if (!SITE_URL) throw new Error("Missing SITE_URL");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const X_API_BASE = "https://api.x.com";

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

function stripTrailingPunctuation(str) {
  return safeStr(str)
    .replace(/[.!?,:;…\-\s]+$/g, "")
    .trim();
}

function words(str) {
  return normalizeWhitespace(str).split(" ").filter(Boolean);
}

function shortenNaturalByWords(str, maxWords = 8, maxChars = 64) {
  let s = stripTrailingPunctuation(normalizeWhitespace(str));
  if (!s) return "";

  const w = words(s);
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

function isPostingEnabled() {
  return String(X_POSTING_ENABLED || "").toLowerCase() === "true";
}

function titleCase(s) {
  return safeStr(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildArticleUrl(card) {
  return `${SITE_URL}/article/${card.id}`;
}

function truncateForX(str, maxChars = 220) {
  const s = normalizeWhitespace(str);
  if (!s) return "";
  if (s.length <= maxChars) return s;

  const trimmed = s.slice(0, maxChars + 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 0) {
    return stripTrailingPunctuation(trimmed.slice(0, lastSpace)) + "…";
  }

  return stripTrailingPunctuation(trimmed.slice(0, maxChars)) + "…";
}

function buildFallbackHook(card) {
  return shortenNaturalByWords(card.title || "Curious story", 8, 64);
}

async function generateXHook(card) {
  const prompt = `
Create 1 short X post hook for this article.

Rules:
- Return ONLY valid JSON.
- Write in English.
- Maximum 9 words.
- Prefer 5 to 8 words.
- Curiosity-driven, accurate, not exaggerated.
- No emojis.
- No hashtags.
- No quotation marks.
- No colon.
- It should work as overlay text too.

Return this exact JSON:
{
  "hook": "your hook here"
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
      max_tokens: 80,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = r.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const hook = shortenNaturalByWords(parsed.hook || "", 9, 64);

    if (hook) return hook;
  } catch (err) {
    console.warn("X hook generation failed:", err.message);
  }

  return buildFallbackHook(card);
}

async function generateXPostText(card, hook) {
  const prompt = `
Write 1 concise X post for a news/discovery article.

Rules:
- Return ONLY valid JSON.
- Write in English.
- Conversational, clear, not clickbait.
- No hashtags unless absolutely necessary.
- Do not use all caps.
- Keep it short.
- Include NO URL in the generated text.
- Maximum 180 characters.
- It should feel native to X, not like SEO copy.
- Avoid repeating the exact article title.

Return this exact JSON:
{
  "post_text": "your post text here"
}

Hook: ${safeStr(hook)}
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
      max_tokens: 140,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = r.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const generated = truncateForX(parsed.post_text || "", 180);

    if (generated) return generated;
  } catch (err) {
    console.warn("X post text generation failed:", err.message);
  }

  const fallbackBase =
    safeStr(card.seo_description) ||
    stripHtml(card.summary_normalized) ||
    stripHtml(card.fun_fact) ||
    safeStr(card.title);

  return truncateForX(`${hook}. ${fallbackBase}`, 180);
}

function buildFinalXText(postText, articleUrl) {
  return `${truncateForX(postText, 220)}\n\n${articleUrl}`;
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(title, maxLineLength = 20, maxLines = 3) {
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

function buildXOverlaySVG(title, category) {
  const width = 1200;
  const height = 675;
  const lines = wrapTitle(title, 20, 3);

  const lineHeight = 72;
  const blockHeight = lines.length * lineHeight;
  const startY = height - 120 - blockHeight;
  const kickerGap = 48;

  const titleSvg = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      const text = escapeXml(line);

      return `
      <text
        x="62"
        y="${y + 3}"
        fill="rgba(0,0,0,0.42)"
        font-size="58"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>
      <text
        x="60"
        y="${y}"
        fill="white"
        font-size="58"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>`;
    })
    .join("");

  const kicker = escapeXml(titleCase(category || "CurioWire"));

  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)" />
        <stop offset="22%" stop-color="rgba(0,0,0,0.03)" />
        <stop offset="40%" stop-color="rgba(0,0,0,0.10)" />
        <stop offset="58%" stop-color="rgba(0,0,0,0.24)" />
        <stop offset="76%" stop-color="rgba(0,0,0,0.52)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.88)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bottomFade)" />

    <text
      x="60"
      y="${startY - kickerGap}"
      fill="rgba(255,255,255,0.94)"
      font-size="24"
      font-weight="700"
      font-family="Arial, Helvetica, sans-serif"
      letter-spacing="2"
    >${kicker.toUpperCase()}</text>

    ${titleSvg}

    <text
      x="60"
      y="${height - 32}"
      fill="rgba(255,255,255,0.95)"
      font-size="24"
      font-weight="600"
      font-family="Arial, Helvetica, sans-serif"
    >CurioWire.com</text>
  </svg>
  `;
}

async function createXImage(card, overlayTitle) {
  const res = await fetch(card.image_url);
  if (!res.ok) {
    throw new Error(`Image download failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const overlaySVG = buildXOverlaySVG(overlayTitle, card.category);
  const overlayBuffer = Buffer.from(overlaySVG);

  const filePath = `/tmp/x-${card.id}.jpg`;

  await sharp(buffer)
    .resize(1200, 675, { fit: "cover", position: "centre" })
    .composite([{ input: overlayBuffer }])
    .jpeg({ quality: 90 })
    .toFile(filePath);

  return filePath;
}

async function uploadXImage(filePath, cardId) {
  const storagePath = `x/${cardId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("curiowire")
    .upload(storagePath, fs.readFileSync(filePath), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("curiowire").getPublicUrl(storagePath);
  return data.publicUrl;
}

async function existingPostForCard(cardId) {
  const { data, error } = await supabase
    .from("x_posts")
    .select("id, status, x_post_id")
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function insertXRow(payload) {
  const { error } = await supabase.from("x_posts").insert(payload);
  if (error) throw error;
}

const oauth = new OAuth({
  consumer: {
    key: X_API_KEY || "",
    secret: X_API_KEY_SECRET || "",
  },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return crypto.createHmac("sha1", key).update(baseString).digest("base64");
  },
});

function getOAuthHeader(url, method) {
  if (
    !X_API_KEY ||
    !X_API_KEY_SECRET ||
    !X_ACCESS_TOKEN ||
    !X_ACCESS_TOKEN_SECRET
  ) {
    throw new Error(
      "Missing one or more X credentials: X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET",
    );
  }

  const authData = oauth.authorize(
    { url, method },
    {
      key: X_ACCESS_TOKEN,
      secret: X_ACCESS_TOKEN_SECRET,
    },
  );

  return oauth.toHeader(authData);
}

async function uploadMediaToX(filePath) {
  const url = `${X_API_BASE}/2/media/upload`;

  const fileBuffer = fs.readFileSync(filePath);
  const form = new FormData();

  const blob = new Blob([fileBuffer], { type: "image/jpeg" });
  form.append("media", blob, "curiowire.jpg");
  form.append("media_category", "tweet_image");
  form.append("media_type", "image/jpeg");
  form.append("shared", "false");

  const oauthHeader = getOAuthHeader(url, "POST");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...oauthHeader,
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `X media upload failed: ${res.status} ${JSON.stringify(data).slice(0, 800)}`,
    );
  }

  const mediaId = data?.data?.id || data?.media_id_string || data?.media_id;

  if (!mediaId) {
    throw new Error(
      `X media upload missing media id: ${JSON.stringify(data).slice(0, 800)}`,
    );
  }

  return String(mediaId);
}

async function createXPost({ text, mediaId }) {
  const url = `${X_API_BASE}/2/tweets`;
  const oauthHeader = getOAuthHeader(url, "POST");

  const payload = mediaId
    ? {
        text,
        media: {
          media_ids: [mediaId],
        },
      }
    : { text };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `X create post failed: ${res.status} ${JSON.stringify(data).slice(0, 800)}`,
    );
  }

  const postId = data?.data?.id;
  if (!postId) {
    throw new Error(
      `X create post missing id: ${JSON.stringify(data).slice(0, 800)}`,
    );
  }

  return String(postId);
}

async function run() {
  console.log("Fetching latest article...");

  const { data: card, error: cardError } = await supabase
    .from("curiosity_cards")
    .select("*")
    .eq("status", "published")
    .eq("is_listed", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (cardError) throw cardError;

  if (!card) {
    console.log("No article found.");
    return;
  }

  if (!card.image_url) {
    console.log(`Latest article ${card.id} has no image_url. Skipping.`);
    return;
  }

  const existing = await existingPostForCard(card.id);
  if (existing) {
    console.log(`X post already handled for card ${card.id}. Skipping.`);
    return;
  }

  const articleUrl = buildArticleUrl(card);
  const overlayTitle = await generateXHook(card);
  const xBody = await generateXPostText(card, overlayTitle);
  const finalText = buildFinalXText(xBody, articleUrl);

  console.log("Prepared X overlay:", overlayTitle);
  console.log("Prepared X text:", finalText);

  let xImageUrl = card.image_url;
  let localImagePath = null;

  try {
    localImagePath = await createXImage(card, overlayTitle);
    const uploadedUrl = await uploadXImage(localImagePath, card.id);
    if (uploadedUrl) {
      xImageUrl = uploadedUrl;
    }
  } catch (err) {
    console.warn(
      "Custom X image generation failed, using original image:",
      err.message,
    );
  }

  if (!isPostingEnabled()) {
    console.log("X_POSTING_ENABLED is false. Saving test row only.");

    await insertXRow({
      card_id: card.id,
      x_post_id: null,
      destination_url: articleUrl,
      image_url: xImageUrl,
      overlay_title: overlayTitle,
      post_text: finalText,
      status: "skipped",
      error_message: null,
      posted_at: null,
    });

    console.log("X test row stored.");
    return;
  }

  if (!localImagePath) {
    // If custom image failed completely, generate a local temp file from the source image.
    const res = await fetch(card.image_url);
    if (!res.ok)
      throw new Error(`Fallback image download failed: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    localImagePath = `/tmp/x-fallback-${card.id}.jpg`;
    await sharp(buffer)
      .resize(1200, 675, { fit: "cover", position: "centre" })
      .jpeg({ quality: 90 })
      .toFile(localImagePath);
  }

  try {
    const mediaId = await uploadMediaToX(localImagePath);
    const xPostId = await createXPost({
      text: finalText,
      mediaId,
    });

    await insertXRow({
      card_id: card.id,
      x_post_id: xPostId,
      destination_url: articleUrl,
      image_url: xImageUrl,
      overlay_title: overlayTitle,
      post_text: finalText,
      status: "posted",
      error_message: null,
      posted_at: new Date().toISOString(),
    });

    console.log("X post stored:", xPostId);
  } catch (err) {
    await insertXRow({
      card_id: card.id,
      x_post_id: null,
      destination_url: articleUrl,
      image_url: xImageUrl,
      overlay_title: overlayTitle,
      post_text: finalText,
      status: "failed",
      error_message: String(err?.message || err || "").slice(0, 800),
      posted_at: null,
    });

    throw err;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
