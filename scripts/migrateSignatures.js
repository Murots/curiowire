// ===============================================================
// CurioWire Migration Script: Generate BOTH curio_signature_text
// AND topic_signature_text for ALL existing articles.
//
// Kjør med:
//   node migrateSignatures.js
// ===============================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------
// INIT
// ---------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------
// Normalizer (samme som i curioSignature.js og topicSignature.js)
// ---------------------------------------------------------------
function normalizeSignature(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------
// GPT: CurioSignature Generator (excerpt-basert)
// ---------------------------------------------------------------
async function generateCurioSignature(text) {
  const prompt = `
You are creating a semantic curiosity signature for an article.

Given this article excerpt:

"${text}"

Return JSON EXACTLY like this:

{
  "summary": "1-2 sentence curiosity summary",
  "keywords": ["6-10 keywords"],
  "normalized": "short normalized signature"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 180,
      temperature: 0.1,
    });

    return JSON.parse(r.choices[0]?.message?.content || "{}");
  } catch (err) {
    console.warn("⚠️ CurioSignature fallback:", err.message);
    return {
      summary: text.slice(0, 200),
      keywords: [],
      normalized: normalizeSignature(text),
    };
  }
}

// ---------------------------------------------------------------
// GPT: TopicSignature Generator (tittel-basert)
// ---------------------------------------------------------------
async function generateTopicSignature(title) {
  const prompt = `
You generate a semantic topic signature for clustering.

Given this article title:

"${title}"

Return JSON EXACTLY like this:

{
  "topic": "2-5 word summary",
  "keywords": ["4-8 topic keywords"],
  "normalized": "short normalized signature"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.1,
    });

    return JSON.parse(r.choices[0]?.message?.content || "{}");
  } catch (err) {
    console.warn("⚠️ TopicSignature fallback:", err.message);
    return {
      topic: title,
      keywords: [],
      normalized: normalizeSignature(title),
    };
  }
}

// ---------------------------------------------------------------
// MAIN MIGRATOR
// ---------------------------------------------------------------
async function migrate() {
  console.log("🚀 Starting combined signature migration…");

  // Fetch all articles
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, excerpt, curio_signature_text, topic_signature_text");

  if (error) {
    console.error("❌ Could not fetch articles:", error.message);
    process.exit(1);
  }

  console.log(`📄 Found ${articles.length} articles.`);

  let updated = 0;

  for (const a of articles) {
    const missingCurio = !a.curio_signature_text;
    const missingTopic = !a.topic_signature_text;

    if (!missingCurio && !missingTopic) {
      console.log(`⏭️  Skip ID ${a.id} (already complete)`);
      continue;
    }

    const baseExcerpt =
      a.excerpt?.slice(0, 600) || a.title || "no excerpt available";

    console.log(`\n🧠 Processing ID ${a.id}…`);

    let curioSig = null;
    let topicSig = null;

    if (missingCurio) {
      curioSig = await generateCurioSignature(baseExcerpt);
    }
    if (missingTopic) {
      topicSig = await generateTopicSignature(a.title || baseExcerpt);
    }

    const updatePayload = {};

    if (missingCurio) {
      updatePayload.curio_signature_text =
        `${curioSig.summary}\n` +
        `Keywords: ${curioSig.keywords.join(", ")}\n` +
        `Normalized: ${curioSig.normalized}`;
    }

    if (missingTopic) {
      updatePayload.topic_signature_text =
        `${topicSig.topic}\n` +
        `Keywords: ${topicSig.keywords.join(", ")}\n` +
        `Normalized: ${topicSig.normalized}`;
    }

    const { error: upErr } = await supabase
      .from("articles")
      .update(updatePayload)
      .eq("id", a.id);

    if (upErr) {
      console.error(`❌ Failed updating ID ${a.id}:`, upErr.message);
      continue;
    }

    updated++;
    console.log(`✅ Updated ID ${a.id}`);
  }

  console.log(`\n🎉 Migration complete. Updated ${updated} articles.`);
  process.exit(0);
}

// ---------------------------------------------------------------
// RUN
// ---------------------------------------------------------------
migrate();
