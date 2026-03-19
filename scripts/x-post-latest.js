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

const CATEGORY_COLORS = {
  science: "#005ae0",
  space: "#9d00db",
  history: "#b07a22",
  nature: "#008f45",
  world: "#c90500",

  technology: "#0099d9",
  culture: "#e84f1b",
  health: "#c8006a",
  sports: "#009f80",

  products: "#e6b800",
  crime: "#775232",
  mystery: "#00d6d6",
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

function shortenNaturalByWords(str, maxWords = 6, maxChars = 42) {
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

  return stripTrailingPunctuation(s);
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

function normalizeImageSource(source) {
  return safeStr(source).toLowerCase();
}

function isWikimedia(card) {
  return normalizeImageSource(card.image_source).includes("wikimedia");
}

function compactImageCredit(raw) {
  const cleaned = normalizeWhitespace(
    safeStr(raw)
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\([^)]*creativecommons[^)]*\)/gi, "")
      .replace(/\s+/g, " "),
  );

  if (!cleaned) return "";
  return truncateForX(cleaned, 120);
}

function buildFallbackHook(card) {
  const title = safeStr(card.title);
  if (!title) return "Curious Story";
  return shortenNaturalByWords(title, 6, 42) || "Curious Story";
}

function parseHashtags(raw, maxTags = 2) {
  const tags = safeStr(raw).match(/#[\p{L}\p{N}_]+/gu) || [];
  const deduped = [];
  const seen = new Set();

  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(tag);
    if (deduped.length >= maxTags) break;
  }

  return deduped;
}

function categoryColor(category) {
  return CATEGORY_COLORS[safeStr(category).toLowerCase()] || "#1f2937";
}

async function generateXHook(card) {
  const prompt = `
Create 1 short overlay hook for an X image.

Rules:
- Return ONLY valid JSON.
- Write in English.
- Maximum 6 words.
- Prefer 3 to 6 words.
- Clear, intriguing, accurate.
- No emojis.
- No hashtags.
- No quotation marks.
- No colon.
- No filler words like "discover", "explore", "surprising", "amazing".
- Avoid starting with "What if" unless essential.
- Use Title Case.
- Do not end with ellipsis.
- It must look strong as large overlay text on an image.

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
    const hook = shortenNaturalByWords(parsed.hook || "", 6, 42);

    if (hook) return titleCase(hook);
  } catch (err) {
    console.warn("X hook generation failed:", err.message);
  }

  return titleCase(buildFallbackHook(card));
}

async function generateXPostText(card, hook) {
  const prompt = `
Write 1 concise X post for a discovery/news article.

Rules:
- Return ONLY valid JSON.
- Write in English.
- Conversational, clear, not clickbait.
- Do not use all caps.
- Keep it short.
- Include NO URL in the generated text.
- Include NO image credit.
- Include NO hashtags.
- Maximum 170 characters.
- It should feel native to X, not like SEO copy.
- It must complement the hook without repeating it word-for-word.

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
    const generated = truncateForX(parsed.post_text || "", 170);

    if (generated) return generated;
  } catch (err) {
    console.warn("X post text generation failed:", err.message);
  }

  const fallbackBase =
    safeStr(card.seo_description) ||
    stripHtml(card.summary_normalized) ||
    stripHtml(card.fun_fact) ||
    safeStr(card.title);

  return truncateForX(fallbackBase, 170);
}

function buildFinalXText(postText, articleUrl, hashtagList = []) {
  const tags = hashtagList.join(" ").trim();
  const urlBlock = articleUrl;
  const reserved = urlBlock.length + (tags ? tags.length + 4 : 2) + 2;

  const bodyBudget = Math.max(90, 280 - reserved);
  const body = truncateForX(postText, bodyBudget);

  if (tags) {
    return `${body}\n\n${urlBlock}\n\n${tags}`;
  }

  return `${body}\n\n${urlBlock}`;
}

function getReplyVariant(cardId) {
  const variants = [
    "why_it_matters",
    "fun_fact",
    "question",
    "context",
    "historical_angle",
  ];

  const numeric = Number(cardId) || 0;
  return variants[numeric % variants.length];
}

async function generateXReply(card, mainPostText, variant) {
  const prompt = `
Write 1 short follow-up X reply for an article thread.

Rules:
- Return ONLY valid JSON.
- Write in English.
- Maximum 220 characters before any optional image credit.
- No hashtags.
- No URL.
- Do not repeat the main post.
- Add complementary value only.
- Sound natural on X.
- One concise paragraph.

Reply angle to use: ${variant}

Main post:
${safeStr(mainPostText)}

Article title: ${safeStr(card.title)}
Category: ${safeStr(card.category)}
SEO description: ${safeStr(card.seo_description)}
Summary: ${stripHtml(card.summary_normalized).slice(0, 500)}
Fun fact: ${stripHtml(card.fun_fact).slice(0, 300)}
Card text: ${stripHtml(card.card_text).slice(0, 500)}

Return this exact JSON:
{
  "reply": "text here"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 140,
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = r.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const reply = truncateForX(parsed.reply || "", 220);
    if (reply) return reply;
  } catch (err) {
    console.warn("X reply generation failed:", err.message);
  }

  const seo = safeStr(card.seo_description);
  const summary = stripHtml(card.summary_normalized);
  const funFact = stripHtml(card.fun_fact);

  switch (variant) {
    case "fun_fact":
      return truncateForX(
        funFact || summary || seo || safeStr(card.title),
        220,
      );
    case "question":
      return truncateForX(
        "What part of this story stands out most to you?",
        220,
      );
    case "context":
      return truncateForX(summary || seo || safeStr(card.title), 220);
    case "historical_angle":
      return truncateForX(
        "Stories like this stand out because they do not fit the pattern people usually expect.",
        220,
      );
    case "why_it_matters":
    default:
      return truncateForX(
        seo ||
          summary ||
          "This matters because it shows how strange real history and geography can be.",
        220,
      );
  }
}

function buildReplyWithImageCredit(card, replyText) {
  if (!isWikimedia(card) || !safeStr(card.image_credit)) {
    return truncateForX(replyText, 240);
  }

  const credit = compactImageCredit(card.image_credit);
  if (!credit) return truncateForX(replyText, 240);

  const candidate = `${truncateForX(replyText, 200)}\n\nImage credit: ${credit}`;
  return truncateForX(candidate, 280);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(title, maxLineLength = 18, maxLines = 3) {
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

  return lines.slice(0, maxLines);
}

function buildCategoryBadgeSVG(category, x, y) {
  const label = escapeXml(titleCase(category || "CurioWire"));
  const fill = categoryColor(category);
  const approxTextWidth = Math.max(76, label.length * 10.8);
  const width = approxTextWidth + 38;
  const height = 38;
  const radius = 19;

  return `
    <rect
      x="${x}"
      y="${y}"
      width="${width}"
      height="${height}"
      rx="${radius}"
      ry="${radius}"
      fill="${fill}"
      opacity="0.98"
    />
    <text
      x="${x + width / 2}"
      y="${y + 25}"
      text-anchor="middle"
      fill="white"
      font-size="18"
      font-weight="700"
      font-family="Arial, Helvetica, sans-serif"
      letter-spacing="0.2"
    >${label}</text>
  `;
}

function buildXOverlaySVG(title, category) {
  const width = 1200;
  const height = 1200;
  const lines = wrapTitle(title, 18, 3);

  const lineHeight = 60;
  const blockHeight = lines.length * lineHeight;

  const startY = height - 145 - blockHeight;
  const badgeY = startY - 72;
  const badgeX = 56;

  const titleSvg = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      const text = escapeXml(titleCase(line));

      return `
      <text
        x="58"
        y="${y + 2}"
        fill="rgba(0,0,0,0.62)"
        font-size="52"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>
      <text
        x="56"
        y="${y}"
        fill="white"
        font-size="52"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>`;
    })
    .join("");

  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)" />
        <stop offset="22%" stop-color="rgba(0,0,0,0.04)" />
        <stop offset="40%" stop-color="rgba(0,0,0,0.16)" />
        <stop offset="56%" stop-color="rgba(0,0,0,0.36)" />
        <stop offset="72%" stop-color="rgba(0,0,0,0.62)" />
        <stop offset="86%" stop-color="rgba(0,0,0,0.82)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.96)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bottomFade)" />

    ${buildCategoryBadgeSVG(category, badgeX, badgeY)}

    ${titleSvg}

    <text
      x="56"
      y="${height - 46}"
      fill="rgba(255,255,255,0.96)"
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

  const originalBuffer = Buffer.from(await res.arrayBuffer());
  const overlaySVG = buildXOverlaySVG(overlayTitle, card.category);
  const overlayBuffer = Buffer.from(overlaySVG);

  const filePath = `/tmp/x-${card.id}.jpg`;

  await sharp(originalBuffer)
    .resize(1200, 1200, { fit: "cover", position: "centre" })
    .composite([{ input: overlayBuffer, top: 0, left: 0 }])
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

async function updateXRowByCardId(cardId, payload) {
  const { error } = await supabase
    .from("x_posts")
    .update(payload)
    .eq("card_id", cardId);
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

async function createXReply({ text, replyToId }) {
  const url = `${X_API_BASE}/2/tweets`;
  const oauthHeader = getOAuthHeader(url, "POST");

  const payload = {
    text,
    reply: {
      in_reply_to_tweet_id: replyToId,
    },
  };

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
      `X reply failed: ${res.status} ${JSON.stringify(data).slice(0, 800)}`,
    );
  }

  const replyId = data?.data?.id;
  if (!replyId) {
    throw new Error(
      `X reply missing id: ${JSON.stringify(data).slice(0, 800)}`,
    );
  }

  return String(replyId);
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
  const hashtagList = parseHashtags(card.hashtags, 2);
  const finalText = buildFinalXText(xBody, articleUrl, hashtagList);

  const replyVariant = getReplyVariant(card.id);
  const rawReply = await generateXReply(card, xBody, replyVariant);
  const replyText = buildReplyWithImageCredit(card, rawReply);

  console.log("Prepared X overlay:", overlayTitle);
  console.log("Prepared X text:", finalText);
  console.log("Prepared X reply variant:", replyVariant);
  console.log("Prepared X reply:", replyText);

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
      reply_text: replyText,
      reply_post_id: null,
      reply_variant: replyVariant,
    });

    console.log("X test row stored.");
    return;
  }

  if (!localImagePath) {
    const res = await fetch(card.image_url);
    if (!res.ok) {
      throw new Error(`Fallback image download failed: ${res.status}`);
    }

    const originalBuffer = Buffer.from(await res.arrayBuffer());
    localImagePath = `/tmp/x-fallback-${card.id}.jpg`;

    const overlayBuffer = Buffer.from(
      buildXOverlaySVG(overlayTitle, card.category),
    );

    await sharp(originalBuffer)
      .resize(1200, 1200, { fit: "cover", position: "centre" })
      .composite([{ input: overlayBuffer, top: 0, left: 0 }])
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
      reply_text: replyText,
      reply_post_id: null,
      reply_variant: replyVariant,
    });

    if (replyText) {
      try {
        const replyPostId = await createXReply({
          text: replyText,
          replyToId: xPostId,
        });

        await updateXRowByCardId(card.id, {
          reply_post_id: replyPostId,
        });

        console.log("X reply stored:", replyPostId);
      } catch (replyErr) {
        console.warn("Reply failed:", replyErr.message);

        await updateXRowByCardId(card.id, {
          error_message: truncateForX(
            `Main post published, but reply failed: ${String(replyErr?.message || replyErr || "")}`,
            800,
          ),
        });
      }
    }

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
      reply_text: replyText,
      reply_post_id: null,
      reply_variant: replyVariant,
    });

    throw err;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
