import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp"; // 🆕 lagt til

export const runtime = "nodejs"; // 🧩 sikre Buffer/Sharp-støtte

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

// === Kategorier og tone ===
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
  all: { tone: "fascinating general curiosity" },
};

// === Titteltrimmer ===
function trimHeadline(title) {
  const words = title.split(" ");
  return words.length > 12 ? words.slice(0, 12).join(" ") + "…" : title;
}

// === Hjelpefunksjon: hent bilde fra Unsplash ===
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

/* === 🆕 DALL·E-2 med base64-håndtering === */
async function generateDalleImage(title, tone, category) {
  try {
    const imagePrompt = `
Editorial illustration for an article titled "${title}".
Theme: ${tone}.
Style: vintage newspaper photography, realistic lighting, cinematic depth of field.
Avoid text or logos.
    `;

    const result = await openai.images.generate({
      model: "dall-e-2", // 🧩 byttet modell til DALL·E 2 (billigere)
      prompt: imagePrompt,
      size: "1024x1024", // 🧩 lavere kostnad
      response_format: "b64_json", // støttes av DALL·E 2
    });

    // 🔇 Fjernet full JSON-logging – kun kort status
    console.log(`🧠 DALL·E generated base64 for ${category}`);

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      console.warn(
        `❌ DALL·E API failed for ${category}: No base64 image returned`
      );
      return null;
    }

    const pngBuffer = Buffer.from(b64, "base64");

    // 🪄 Komprimer med Sharp før opplasting
    const optimized = await sharp(pngBuffer)
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    // 📦 Last opp direkte til Supabase
    const filename = `${category}-${Date.now()}.jpg`;
    const path = `curiowire/curiowire/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("curiowire")
      .getPublicUrl(path);

    const publicUrl = publicUrlData?.publicUrl;
    console.log(`✅ DALL·E → Supabase OK for ${category}: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(
      `❌ DALL·E error for ${category}:`,
      err?.response?.data || err.message
    );
    return null;
  }
}

// === Komprimer og cache eksisterende (Unsplash) bilder ===
async function cacheImageToSupabase(imageUrl, filename, category) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(
        `⚠️ Failed to fetch image for ${category}: ${response.status}`
      );
      return imageUrl;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const optimized = await sharp(buffer)
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const path = `curiowire/${filename}.jpg`;

    const { error } = await supabase.storage
      .from("curiowire")
      .upload(path, optimized, { contentType: "image/jpeg", upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("curiowire")
      .getPublicUrl(path);

    console.log(
      `✅ Supabase upload OK for ${category}: ${publicUrlData.publicUrl}`
    );
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error(`❌ Supabase cache failed for ${category}:`, err.message);
    return imageUrl;
  }
}

/* === Hoved-rute === */
export async function GET() {
  const results = [];

  for (const [key, { tone, image }] of Object.entries(categories)) {
    if (key === "all") {
      console.log("Skipping 'all' category (aggregate only)");
      continue;
    }

    try {
      // === 1. Generer artikkeltekst ===
      const prompt = `
You are a writer for *CurioWire* — a digital newspaper of fascinating curiosities.

Write a short article in two parts:

1️⃣ A catchy headline (max 10–12 words) that captures the curiosity.
2️⃣ A 120–180 word article body in a 1930s newspaper tone — curious, elegant, lightly humorous, and human.

Category: ${key}.
Tone: ${tone}.

Guidelines:
- Do NOT use "Extra! Extra!" or category slogans — the UI adds that.
- This is NOT a breaking news report. It should feel like a rediscovered story, an odd fact, or a quiet marvel.
- Avoid lists or pure statistics; weave facts naturally into the prose.
- Favor narrative curiosity: why something matters, what makes it strange or poetic.
- Keep it factual but lightly whimsical.
- End the article with: "Read all about it here → [source link]".

Special rule for "products":
- Do NOT advertise or promote.
- Choose a cultural or lifestyle curiosity that connects naturally to a consumer product.
  Example: If the product is a robot vacuum, write about the modern "time squeeze" in families,
  and mention the product subtly near the end as a small illustrative detail.
- Product mentions should feel incidental, not commercial.

Output format:
Headline: <headline text>
Article: <article text>
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      const titleMatch = text.match(/Headline:\s*(.+)/i);
      const bodyMatch = text.match(/Article:\s*([\s\S]+)/i);

      const rawTitle = titleMatch ? titleMatch[1].trim() : "CurioWire Update";
      const title = trimHeadline(rawTitle);
      const article = bodyMatch ? bodyMatch[1].trim() : text;

      // === 3. Hent eller generer bilde ===
      let imageUrl = null;
      if (image === "dalle") {
        imageUrl = await generateDalleImage(title, tone, key);
      } else {
        const query = `${title} ${tone}`;
        imageUrl = await fetchUnsplashImage(query);
      }

      if (!imageUrl) imageUrl = `https://picsum.photos/seed/${key}/800/400`;

      // === 4. Cache bilde i Supabase Storage ===
      const cachedUrl =
        image === "dalle"
          ? imageUrl // DALL·E-bilder lastes allerede opp
          : await cacheImageToSupabase(imageUrl, `${key}-${Date.now()}`, key);

      // === 5. Dummy kilde ===
      const sourceUrl = "https://wikipedia.org";

      // === 6. Lagre i Supabase ===
      const imageCredit =
        image === "unsplash"
          ? "Image courtesy of Unsplash"
          : "Illustration by DALL·E";

      const { error } = await supabase.from("articles").insert([
        {
          category: key,
          title,
          excerpt: article,
          image_url: cachedUrl,
          source_url: sourceUrl,
          image_credit: imageCredit,
        },
      ]);

      if (error) throw error;
      results.push({ key, success: true, imageSource: image, cachedUrl });
    } catch (err) {
      console.error(`❌ Error for ${key}:`, err.message);
      results.push({ key, success: false, error: err.message });
    }
  }

  return NextResponse.json({ success: true, results });
}
