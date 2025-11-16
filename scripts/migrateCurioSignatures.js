// ===============================================================
// CurioWire Migration Script: Generate curio_signature_text
// for ALL existing articles in Supabase.
//
// Kjør én gang med: node migrateCurioSignatures.js
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
// Normalizer (samme som i curioSignature.js)
// ---------------------------------------------------------------
function normalizeSignature(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------
// Generate CurioSignature for legacy articles
// ---------------------------------------------------------------
async function generateCurioSignature(text) {
  const prompt = `
Generate a compact semantic signature for the article excerpt below.

Text:
"${text}"

Return JSON ONLY:

{
  "summary": "1–2 sentences",
  "keywords": ["6–10 keywords"],
  "normalized": "short normalized signature"
}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.1,
    });

    const parsed = JSON.parse(r.choices[0]?.message?.content || "{}");

    return {
      summary: parsed.summary || "",
      keywords: parsed.keywords || [],
      normalized:
        parsed.normalized ||
        normalizeSignature(parsed.summary || text.slice(0, 200)),
    };
  } catch (err) {
    console.warn("⚠️ Fallback signature (GPT fail):", err.message);
    return {
      summary: text.slice(0, 200),
      keywords: [],
      normalized: normalizeSignature(text),
    };
  }
}

// ---------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------
async function migrate() {
  console.log("🚀 Starting CurioSignature migration…");

  // 1) Fetch all articles
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, excerpt, curio_signature_text");

  if (error) {
    console.error("❌ Could not fetch articles:", error.message);
    process.exit(1);
  }

  console.log(`📄 Found ${articles.length} articles.`);

  let processed = 0;

  for (const article of articles) {
    // Skip if signature already exists
    if (
      article.curio_signature_text &&
      article.curio_signature_text.length > 10
    ) {
      console.log(`⏭️  Skip ID ${article.id} (already has signature)`);
      continue;
    }

    const baseText =
      article.excerpt?.slice(0, 600) ||
      article.title ||
      "unknown article content";

    console.log(`🧠 Generating signature for ID ${article.id}…`);

    const sig = await generateCurioSignature(baseText);

    const textToStore = `${sig.summary}\nKeywords: ${sig.keywords.join(
      ", "
    )}\nNormalized: ${sig.normalized}`;

    const { error: updateErr } = await supabase
      .from("articles")
      .update({ curio_signature_text: textToStore })
      .eq("id", article.id);

    if (updateErr) {
      console.error(`❌ Failed to update ID ${article.id}:`, updateErr.message);
      continue;
    }

    processed++;
    console.log(`✅ Updated ID ${article.id}`);
  }

  console.log(`\n🎉 Migration finished. Updated ${processed} articles.`);
  process.exit(0);
}

// ---------------------------------------------------------------
// RUN
// ---------------------------------------------------------------
migrate();
