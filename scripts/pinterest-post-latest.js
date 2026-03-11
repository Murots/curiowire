import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PINTEREST_ACCESS_TOKEN,
  SITE_URL,
} = process.env;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}
if (!PINTEREST_ACCESS_TOKEN) {
  throw new Error("Missing PINTEREST_ACCESS_TOKEN");
}
if (!SITE_URL) throw new Error("Missing SITE_URL");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function needsVisibleCredit(card) {
  return normalizeImageSource(card.image_source).includes("wikimedia");
}

function buildDescription(card) {
  const base =
    safeStr(card.seo_description) ||
    stripHtml(card.summary_normalized) ||
    stripHtml(card.fun_fact) ||
    stripHtml(card.card_text) ||
    safeStr(card.title);

  const articleUrl = `${SITE_URL}/article/${card.id}`;
  return `${base}\n\nRead more: ${articleUrl}`.slice(0, 800);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(title, maxLineLength = 24, maxLines = 4) {
  const words = safeStr(title).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);

  if (
    lines.length === maxLines &&
    words.join(" ").length > lines.join(" ").length
  ) {
    lines[maxLines - 1] =
      lines[maxLines - 1].replace(/[.!?,:;-\s]*$/, "") + "…";
  }

  return lines.slice(0, maxLines);
}

function buildOverlaySVG(title, credit) {
  const lines = wrapTitle(title);
  const titleSvg = lines
    .map((line, i) => {
      const y = 980 + i * 82;
      return `
      <text
        x="80"
        y="${y}"
        fill="white"
        font-size="64"
        font-weight="700"
        font-family="Arial, Helvetica, sans-serif"
      >${escapeXml(line)}</text>`;
    })
    .join("");

  const creditText = credit ? `Photo: ${credit}` : "";

  return `
  <svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0.08)" />
        <stop offset="55%" stop-color="rgba(0,0,0,0.18)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.72)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="1000" height="1500" fill="url(#fade)" />

    ${titleSvg}

    <text
      x="80"
      y="1400"
      fill="white"
      font-size="34"
      font-weight="600"
      font-family="Arial, Helvetica, sans-serif"
      opacity="0.95"
    >CurioWire.com</text>

    ${
      creditText
        ? `
    <text
      x="80"
      y="1450"
      fill="white"
      font-size="20"
      font-family="Arial, Helvetica, sans-serif"
      opacity="0.82"
    >${escapeXml(creditText)}</text>`
        : ""
    }
  </svg>
  `;
}

async function createPinterestImage(card) {
  try {
    const res = await fetch(card.image_url);
    if (!res.ok) {
      throw new Error(`Image download failed: ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    const credit = needsVisibleCredit(card) ? safeStr(card.image_credit) : "";
    const overlaySVG = buildOverlaySVG(card.title, credit);
    const overlayBuffer = Buffer.from(overlaySVG);

    const filePath = `/tmp/pinterest-${card.id}.jpg`;

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

async function uploadPinterestImage(filePath, cardId) {
  try {
    const storagePath = `pinterest/${cardId}.jpg`;

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

async function alreadyPosted(cardId) {
  const { data, error } = await supabase
    .from("pinterest_posts")
    .select("id")
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
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

  if (await alreadyPosted(card.id)) {
    console.log(`Card ${card.id} already posted to Pinterest. Skipping.`);
    return;
  }

  console.log("Latest article:", card.id, card.title);

  const boardId =
    BOARD_MAP[card.category] || process.env.PINTEREST_BOARD_ID_GENERAL;

  if (!boardId) {
    throw new Error(
      `Missing Pinterest board ID for category: ${card.category}`,
    );
  }

  let pinterestImageUrl = card.image_url;

  const pinterestFile = await createPinterestImage(card);

  if (pinterestFile) {
    const uploadedUrl = await uploadPinterestImage(pinterestFile, card.id);
    if (uploadedUrl) {
      pinterestImageUrl = uploadedUrl;
    }
  }

  const description = buildDescription(card);
  const articleUrl = `${SITE_URL}/article/${card.id}`;

  console.log("Posting to Pinterest...");

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title: safeStr(card.title).slice(0, 100),
      description,
      link: articleUrl,
      media_source: {
        source_type: "image_url",
        url: pinterestImageUrl,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  console.log("Pinterest result:", data);

  if (!res.ok || !data?.id) {
    throw new Error(
      `Pinterest post failed: ${res.status} ${JSON.stringify(data).slice(0, 500)}`,
    );
  }

  const { error: insertError } = await supabase.from("pinterest_posts").insert({
    card_id: card.id,
    pinterest_pin_id: data.id,
    board_key: card.category,
    destination_url: articleUrl,
    image_url: pinterestImageUrl,
    pin_title: card.title,
    pin_description: description,
    status: "posted",
  });

  if (insertError) throw insertError;

  console.log("Pinterest post stored.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
