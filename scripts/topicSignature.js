// === CurioWire Topic Signature Engine v1.0 ===
// Løser problemet med to artikler om "samme tema" (f.eks. to octopus-intelligence-artikler).
// Billig, presis, og kun noen få tokens per topic.

// ----------------------------------------------------
// Imports
// ----------------------------------------------------
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// OpenAI init
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supabase (trengs kun hvis vi legger inn embedding senere)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ----------------------------------------------------
// Local normalize helper
// ----------------------------------------------------
export function normalizeTopic(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(the|a|an|and|of|in|on|for|to|from|by|with|at|is|was|were|has|had|this|that|these|those)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------------------------------
// buildTopicSignature(topic)
// ----------------------------------------------------
export async function buildTopicSignature({ category, topic }) {
  const prompt = `
You are creating a semantic fingerprint for a *topic idea* of a news article.
Return JSON ONLY.

Topic: "${topic}"
Category: "${category}"

Return exactly:

{
  "summary": "1–2 sentence topic summary",
  "keywords": ["5-10 sharp keywords"],
  "normalized": "short normalized signature",
  "signature": "compact signature string"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.1,
    });

    const raw = r.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const summary = parsed.summary || topic;
    const keywords = parsed.keywords || [];
    const normalized = parsed.normalized || normalizeTopic(summary);

    const signature =
      parsed.signature || `${normalized} ${keywords.join(" ")}`.trim();

    return {
      category,
      topic,
      summary,
      keywords,
      normalized,
      signature: normalizeTopic(signature),
    };
  } catch (err) {
    console.error("❌ buildTopicSignature failed:", err.message);

    const fallback = normalizeTopic(topic);
    return {
      category,
      topic,
      summary: topic,
      keywords: [],
      normalized: fallback,
      signature: fallback,
    };
  }
}

// ----------------------------------------------------
// checkTopicDuplicate
// ----------------------------------------------------
export async function checkTopicDuplicate(topicSig) {
  const { normalized, signature, category } = topicSig;
  const query = normalized || signature;

  // 1. substring match against topic_signature_text
  const { data: rows1 } = await supabase
    .from("articles")
    .select("id, title, category, topic_signature_text")
    .eq("category", category) // viktig!
    .ilike("topic_signature_text", `%${query}%`)
    .limit(1);

  if (rows1?.length > 0) {
    return {
      isDuplicate: true,
      reason: "topic-substring",
      closestTitle: rows1[0].title,
      similarityScore: 1.0,
    };
  }

  // 2. vector similarity (reuse articles.embedding)
  const { data: vecHits } = await supabase.rpc("match_articles", {
    query_embedding: await embedTopic(query),
    match_threshold: 0.86,
    match_count: 1,
  });

  if (vecHits?.length > 0) {
    const hit = vecHits[0];
    if (hit.category === category) {
      return {
        isDuplicate: true,
        reason: "topic-vector",
        closestTitle: hit.title,
        similarityScore: hit.similarity,
      };
    }
  }

  return {
    isDuplicate: false,
    reason: "no-match",
    closestTitle: null,
    similarityScore: 0,
  };
}

async function embedTopic(text) {
  try {
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return r.data[0].embedding;
  } catch {
    return null;
  }
}
