import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * 🔹 Genererer embedding for gitt tekst
 */
async function generateEmbedding(text) {
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return emb.data[0].embedding;
}

/**
 * 🔹 Sjekker om tema allerede finnes (enkelt søk + vektor-søk)
 */
export async function checkDuplicateTopic(category, topic) {
  // 1️⃣ Rask tittelmatch fra siste 48 timer
  const { data: recent } = await supabase
    .from("articles")
    .select("id, title, embedding")
    .eq("category", category)
    .gte(
      "created_at",
      new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    );

  const alreadyExists = recent?.some((a) =>
    a.title?.toLowerCase().includes(topic.toLowerCase())
  );
  if (alreadyExists) {
    return { existing: recent, alreadyExists: true };
  }

  // 2️⃣ Embedding-sjekk mot vektorfeltet
  try {
    const topicEmbedding = await generateEmbedding(topic);

    const { data: similarArticles, error } = await supabase.rpc(
      "match_articles", // custom SQL RPC function
      {
        query_embedding: topicEmbedding,
        match_threshold: 0.85, // 0–1 cosine similarity
        match_count: 3,
      }
    );

    if (error) {
      console.warn("⚠️ Embedding RPC not available, skipping:", error.message);
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
    console.warn("⚠️ Embedding similarity check failed:", err.message);
    return { existing: recent, alreadyExists: false };
  }
}

/**
 * 🔹 Sjekker semantisk likhet mellom titler (GPT fallback)
 */
export async function checkSimilarTitles(existing, topic, category) {
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
      console.log(`🚫 GPT similarity detected for ${category}: ${topic}`);
      return true;
    }
  }
  return false;
}
