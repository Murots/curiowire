// === app/api/utils/duplicateUtils.js ===
// 🧠 CurioWire Duplicate & Similarity Tools
// Brukes for å unngå dupliserte artikler og overlappende temaer

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// === INIT ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔐 Støtter både lokal/Vercel (NEXT_PUBLIC_) og GitHub Actions (uten prefix)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * 🔹 Genererer embedding for gitt tekst
 */
async function generateEmbedding(text) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return emb.data[0].embedding;
  } catch (err) {
    console.warn("⚠️ Embedding generation failed:", err.message);
    return null;
  }
}

/**
 * 🔹 Sjekker om tema allerede finnes (enkelt søk + vektor-søk)
 */
export async function checkDuplicateTopic(category, topic) {
  try {
    // 1️⃣ Rask tittelmatch fra siste 48 timer
    const { data: recent, error: fetchErr } = await supabase
      .from("articles")
      .select("id, title, embedding, created_at")
      .eq("category", category)
      .gte(
        "created_at",
        new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      );

    if (fetchErr) {
      console.warn("⚠️ Supabase fetch error:", fetchErr.message);
      return { existing: [], alreadyExists: false };
    }

    const alreadyExists = recent?.some((a) =>
      a.title?.toLowerCase().includes(topic.toLowerCase())
    );
    if (alreadyExists) {
      console.log(`🚫 Title duplicate found for ${category}: ${topic}`);
      return { existing: recent, alreadyExists: true };
    }

    // 2️⃣ Embedding-sjekk mot vektorfeltet
    const topicEmbedding = await generateEmbedding(topic);
    if (!topicEmbedding) {
      return { existing: recent, alreadyExists: false };
    }

    const { data: similarArticles, error } = await supabase.rpc(
      "match_articles", // custom SQL RPC function
      {
        query_embedding: topicEmbedding,
        match_threshold: 0.85, // 0–1 cosine similarity
        match_count: 3,
      }
    );

    if (error) {
      console.warn("⚠️ Embedding RPC not available:", error.message);
      return { existing: recent, alreadyExists: false };
    }

    const highSim = similarArticles?.some(
      (a) => a.similarity && a.similarity > 0.85
    );

    if (highSim) {
      console.log(`🚫 Vector match found for ${category}: ${topic}`);
      return { existing: recent, alreadyExists: true };
    }

    return { existing: recent, alreadyExists: false };
  } catch (err) {
    console.warn("⚠️ checkDuplicateTopic failed:", err.message);
    return { existing: [], alreadyExists: false };
  }
}

/**
 * 🔹 Sjekker semantisk likhet mellom titler (GPT fallback)
 */
export async function checkSimilarTitles(existing, topic, category) {
  try {
    const recentTitles = existing?.slice(-10).map((a) => a.title) || [];
    for (const prev of recentTitles) {
      const simPrompt = `
Determine if these two headlines describe the *same underlying topic*.
Answer only "YES" or "NO".
Headline A: "${prev}"
Headline B: "${topic}"
`;
      const simCheck = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: simPrompt }],
        max_tokens: 2,
        temperature: 0,
      });

      const ans = simCheck.choices[0]?.message?.content?.trim().toUpperCase();
      if (ans?.includes("YES")) {
        console.log(
          `🚫 GPT semantic similarity detected for ${category}: ${topic}`
        );
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn("⚠️ checkSimilarTitles failed:", err.message);
    return false;
  }
}
