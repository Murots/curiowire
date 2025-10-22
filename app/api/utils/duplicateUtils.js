// === DUPLICATE CHECK UTILS ===
// Håndterer duplikatkontroll og likhetssjekk mellom artikler

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Sjekker om temaet allerede finnes nylig i databasen
 */
export async function checkDuplicateTopic(key, topic) {
  const { data: existing } = await supabase
    .from("articles")
    .select("id, title")
    .eq("category", key)
    .gte(
      "created_at",
      new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    );

  const alreadyExists = existing?.some((a) =>
    a.title.toLowerCase().includes(topic.toLowerCase())
  );
  return { existing, alreadyExists };
}

/**
 * Sjekker likhet mot tidligere titler ved hjelp av GPT
 */
export async function checkSimilarTitles(existing, topic, key) {
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
      console.log(`🚫 Similar detected for ${key}: ${topic}`);
      return true;
    }
  }
  return false;
}
