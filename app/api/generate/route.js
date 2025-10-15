import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { updateAndPingSearchEngines } from "../utils/seoTools.js";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

// 🔁 Lokal minnevariabel for rotasjon mellom kilder
let lastUsedSource = "google";

/* === 1️⃣ Kategorier og tone === */
const categories = {
  science: { tone: "scientific and intriguing discovery", image: "unsplash" },
  technology: {
    tone: "cutting-edge invention or digital phenomenon",
    image: "unsplash",
  },
  space: { tone: "astronomical or cosmic curiosity", image: "dalle" },
  nature: { tone: "environmental or wildlife phenomenon", image: "unsplash" },
  health: { tone: "psychological or medical curiosity", image: "unsplash" },
  history: { tone: "archaeological or historical rediscovery", image: "dalle" },
  culture: { tone: "artistic or cultural oddity", image: "dalle" },
  sports: { tone: "athletic or human endurance story", image: "unsplash" },
  products: {
    tone: "modern consumer trend or lifestyle insight",
    image: "dalle",
  },
  world: { tone: "geopolitical or global social phenomenon", image: "dalle" },
};

/* === 2️⃣ Verktøy === */
function trimHeadline(title) {
  const words = title.split(" ");
  return words.length > 12 ? words.slice(0, 12).join(" ") + "…" : title;
}

async function fetchTrendingTopics() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/trends`);
    const data = await res.json();
    return data.results || {};
  } catch (err) {
    console.error("⚠️ Failed to fetch trending topics:", err.message);
    return {};
  }
}

/* === 3️⃣ Bildelogikk === */
async function fetchUnsplashImage(query) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=landscape&client_id=${UNSPLASH_KEY}`
    );
    const data = await res.json();
    return data.urls?.regular
      ? `${data.urls.regular}&auto=format&fit=crop&w=800&q=75`
      : null;
  } catch (err) {
    console.warn("⚠️ Unsplash fetch failed:", err.message);
    return null;
  }
}

async function generateDalleImage(title, topic, tone, category) {
  try {
    // 🔑 Hent nøkkelord fra tittelen (gir DALL·E mer presis kontekst)
    const keywords = title
      .split(" ")
      .filter((w) => w.length > 3)
      .slice(0, 6)
      .join(", ");

    // 🎨 Forbedret prompt: fjerner "newspaper"-referanser og forbyr tekst
    const imagePrompt = `
Cinematic editorial illustration for a feature titled "${title}" (about "${topic}").
Core ideas and visual cues: ${keywords}.
Category: ${category}.
Mood & tone: ${tone}.
Style: realistic 1930s-inspired cinematic photography — soft light, symbolic composition, subtle color depth.
Focus on atmosphere, metaphor, and emotional storytelling — not literal reporting or text elements.
Do NOT include any text, letters, numbers, words, handwriting, logos, captions, signs, screens, or printed materials.
Absolutely no visible writing, titles, or words in the scene.
`;

    // 🧠 Generer bilde
    const result = await openai.images.generate({
      model: "dall-e-2",
      prompt: imagePrompt,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      console.warn(`⚠️ DALL·E returned no base64 for ${category}`);
      return null;
    }

    // 🪄 Optimaliser og komprimer
    const optimized = await sharp(Buffer.from(b64, "base64"))
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    // 📦 Last opp til Supabase Storage
    const filename = `${category}-${Date.now()}.jpg`;
    const path = `curiowire/${filename}`;

    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
    console.log(`🎨 DALL·E → Supabase OK for ${category}`);
    return data.publicUrl;
  } catch (err) {
    console.error(`❌ DALL·E error for ${category}:`, err.message);
    return null;
  }
}

async function cacheImageToSupabase(imageUrl, filename, category) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return imageUrl;
    const optimized = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const path = `curiowire/${filename}.jpg`;
    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (error) throw error;

    const { data } = supabase.storage.from("curiowire").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error(`❌ Cache failed for ${category}:`, err.message);
    return imageUrl;
  }
}

/* === 4️⃣ Hovedrute === */
export async function GET() {
  const topicsByCategory = await fetchTrendingTopics();
  const results = [];

  // 🔁 Bytter kilde annenhver kjøring
  const primarySource = lastUsedSource === "google" ? "reddit" : "google";
  const fallbackSource = primarySource === "google" ? "reddit" : "google";
  lastUsedSource = primarySource;
  console.log(`🌀 Using ${primarySource.toUpperCase()} as primary source.`);

  for (const [key, { tone, image }] of Object.entries(categories)) {
    const topicData = topicsByCategory[key];
    const primaryList = topicData?.[primarySource] || [];
    const fallbackList = topicData?.[fallbackSource] || [];

    let topic =
      primaryList[Math.floor(Math.random() * primaryList.length)] ||
      fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
      `notable ${key} curiosity`;

    if (!topic && primarySource === "reddit" && Array.isArray(primaryList)) {
      for (const alt of primaryList) {
        if (alt && alt !== topic) {
          topic = alt;
          break;
        }
      }
    }

    if (!topic) {
      console.warn(`⚠️ ${key} empty — switching to ${fallbackSource}`);
      topic =
        fallbackList[Math.floor(Math.random() * fallbackList.length)] ||
        `notable ${key} curiosity`;
    }

    try {
      const { data: existing } = await supabase
        .from("articles")
        .select("id, title")
        .eq("category", key)
        .gte(
          "created_at",
          new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        );

      const alreadyExists = existing?.some((a) =>
        a.title.toLowerCase().includes(topic.toLowerCase())
      );
      if (alreadyExists) continue;

      const recentTitles = existing?.slice(-5).map((a) => a.title) || [];
      let isSimilar = false;

      for (const prev of recentTitles) {
        const simPrompt = `
Determine if these two headlines are about the *same underlying topic*.
Answer with "YES" if they describe the same story or idea.
Headline A: "${prev}"
Headline B: "${topic}"
`;
        const simCheck = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: simPrompt }],
          max_tokens: 2,
          temperature: 0,
        });
        const ans = simCheck.choices[0]?.message?.content
          ?.trim()
          ?.toUpperCase();
        if (ans?.includes("YES")) {
          isSimilar = true;
          console.log(`🚫 Similar detected for ${key}: ${topic}`);
          break;
        }
      }

      if (isSimilar) {
        const backup =
          fallbackList.find((t) => t !== topic) ||
          primaryList.find((t) => t !== topic);
        if (backup) {
          console.log(`🔁 Retrying ${key} with backup: ${backup}`);
          topic = backup;
        } else continue;
      }

      /* === 🧾 PROMPT (full versjon) === */
      const prompt = `
You are a journalist for *CurioWire* — a digital newspaper devoted to unusual facts, discoveries, and quiet marvels.
Your assignment: write a short feature article about the trending topic: "${topic}".

Category: ${key}
Tone: ${tone}
Voice: 1930s newsroom — articulate, poetic, lightly humorous, subtly dramatic.
Audience: modern readers seeking wonder, beauty, and intelligent curiosity.

=== PURPOSE ===
CurioWire articles are not breaking news — they are rediscoveries.
They transform ordinary or trending facts into small works of storytelling.
Each piece should feel *fresh, surprising, and resonant* — even if the topic has appeared before.

=== VARIATION LOGIC ===
- If this topic has been covered before, approach it from a **new human or philosophical angle**.
- Example: If the last story was about the invention itself, explore the human consequences, the cultural echo, or symbolic meaning.
- Avoid repetition or flat exposition. Every article must feel alive.

=== STRUCTURE ===
1️⃣ **Headline** — up to 12 words. Emotionally intriguing, poetic but natural.  
2️⃣ **Body** — 130–190 words.  
   - Hook immediately with a vivid first line.  
   - Explain the essence of the topic clearly.  
   - Add one human, cultural, or reflective layer.  
   - Maintain rhythm, musicality, and curiosity throughout.  
3️⃣ End with: "Read all about it here → [source link]"

=== STYLE RULES ===
- No dates, “today”, “recently”, or time anchors.
- No marketing or sensational tone.
- Integrate the topic naturally for SEO (1–2 mentions).
- Prefer metaphor and sensory phrasing over plain exposition.
- Maintain a timeless, thoughtful journalistic rhythm.

=== OUTPUT FORMAT ===
Headline: <headline>
Article: <body>
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      const titleMatch = text.match(/Headline:\s*(.+)/i);
      const bodyMatch = text.match(/Article:\s*([\s\S]+)/i);
      const rawTitle = titleMatch ? titleMatch[1].trim() : topic;
      const title = trimHeadline(rawTitle);
      const article = bodyMatch ? bodyMatch[1].trim() : text;

      /* === 🎨 Bilde === */
      const keywords = title
        .split(" ")
        .filter((w) => w.length > 3)
        .slice(0, 6)
        .join(", ");

      let imageUrl =
        image === "dalle"
          ? await generateDalleImage(title, topic, tone, key)
          : await fetchUnsplashImage(`${title} ${keywords} ${key}`);

      if (!imageUrl && image === "dalle")
        imageUrl = await fetchUnsplashImage(`${title} ${keywords} ${key}`);
      if (!imageUrl) imageUrl = `https://picsum.photos/seed/${key}/800/400`;

      const cachedUrl =
        imageUrl.includes("unsplash") || imageUrl.includes("photos")
          ? await cacheImageToSupabase(imageUrl, `${key}-${Date.now()}`, key)
          : imageUrl;

      const imageCredit = imageUrl.includes("unsplash")
        ? "Image courtesy of Unsplash"
        : imageUrl.includes("picsum")
        ? "Placeholder image via Picsum"
        : "Illustration by DALL·E";

      const { error } = await supabase.from("articles").insert([
        {
          category: key,
          title,
          excerpt: article,
          image_url: cachedUrl,
          source_url: "https://wikipedia.org",
          image_credit: imageCredit,
        },
      ]);
      if (error) throw error;

      console.log(`✅ Article saved for ${key}: ${title}`);
      results.push({ category: key, topic, success: true });
    } catch (err) {
      console.error(`❌ Error for ${key}:`, err.message);
      results.push({ category: key, topic, success: false });
    }
  }

  await updateAndPingSearchEngines();
  return NextResponse.json({ success: true, results });
}
