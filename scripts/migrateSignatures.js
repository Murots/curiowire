// ============================================================================
// CurioWire Full Signature Migration
// - Rebuilds topic_signature_text
// - Rebuilds curio_signature_text
// - Rebuilds short embedding for duplicate detection
//
// Run:  node scripts/migrateSignatures.js
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------------------
// INIT
// ----------------------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ----------------------------------------------------------------------------
// Normalizer
// ----------------------------------------------------------------------------
function normalize(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function snakeify(str = "") {
  return normalize(str).replace(/\s+/g, "_");
}

// ----------------------------------------------------------------------------
// GPT Helper: Generate compact topic + curio signatures
// ----------------------------------------------------------------------------
async function generateSignatures(title, excerpt) {
  const prompt = `
You MUST return a JSON object. 
Do NOT wrap it in code fences.
Do NOT add backticks.
Do NOT add any explanation before or after.

Create two signatures for duplicate detection:

TITLE:
${title}

TEXT (excerpt):
${excerpt.slice(0, 600)}

Return JSON ONLY:

{
  "topic": "very short 2-5 word topic phrase",
  "curio": ["6-10 strong essence keywords"],
  "summary": "1-2 sentence summary"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.0,
    });

    let raw = r.choices[0].message.content.trim();

    // ---- NEW: strip accidental code fences ----
    raw = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(raw);

    return {
      topic: snakeify(parsed.topic),
      curio_keywords: parsed.curio.map((k) => normalize(k)),
      summary: parsed.summary.trim(),
    };
  } catch (err) {
    console.warn("⚠️ GPT failed, using fallback:", err.message);
    return {
      topic: snakeify(title),
      curio_keywords: normalize(excerpt).split(" ").slice(0, 10),
      summary: excerpt.slice(0, 300),
    };
  }
}

// ----------------------------------------------------------------------------
// Generate short semantic embedding
// ----------------------------------------------------------------------------
async function makeEmbedding(text) {
  try {
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return r.data[0].embedding;
  } catch (err) {
    console.warn("⚠️ Embedding failed:", err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// MAIN MIGRATION
// ----------------------------------------------------------------------------
async function run() {
  console.log("🚀 Starting signature migration…");

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, excerpt");

  if (error) {
    console.error("❌ Could not fetch articles:", error.message);
    process.exit(1);
  }

  console.log(`📄 Found ${articles.length} articles.`);
  let count = 0;

  for (const a of articles) {
    console.log(`\n🧠 Processing ID ${a.id}…`);

    const sig = await generateSignatures(a.title, a.excerpt);

    const combinedText = `${a.title}. ${
      sig.summary
    }. keywords: ${sig.curio_keywords.join(", ")}`;

    const embedding = await makeEmbedding(combinedText);

    const { error: updateErr } = await supabase
      .from("articles")
      .update({
        topic_signature_text: sig.topic,
        curio_signature_text: sig.curio_keywords.join(" "),
        semantic_signature: combinedText,
        embedding,
      })
      .eq("id", a.id);

    if (updateErr) {
      console.error(`❌ Failed to update ${a.id}:`, updateErr.message);
      continue;
    }

    console.log(`✅ Updated article ${a.id}`);
    count++;
  }

  console.log(`\n🎉 Migration complete. Updated ${count} articles.`);
  process.exit(0);
}

run();
