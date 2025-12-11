// ============================================================================
// CurioWire — Topic Signature Engine v5.0 (Unified Signature Format)
// Uses buildUnifiedSignature() to ensure topic + curiosity signatures match
// ============================================================================

import { createClient } from "@supabase/supabase-js";

import {
  buildUnifiedSignature,
  normalizeSignature,
  compareShortSignatures,
  stringOverlap,
  semanticTokenMatch,
  embedText,
} from "./signatureTools.js";

// ============================================================================
// LAZY SUPABASE CLIENT
// ============================================================================
let supabase = null;

function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ Missing Supabase credentials in topicSignature.js");
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ============================================================================
// 1. buildTopicSignature()  (Unified v5)
// ============================================================================
export async function buildTopicSignature({ category, topic }) {
  if (!topic || !topic.trim()) {
    const fallback = normalizeSignature(topic || "");
    return {
      category,
      topic,
      summary: "",
      keywords: [],
      normalized: fallback,
      signature: fallback,
      shortSignature: fallback,
    };
  }

  // === Core unified signature builder ===
  const unified = await buildUnifiedSignature({
    category,
    type: "topic",
    input: topic,
  });

  console.log("\n🔧 Unified TopicSignature built:", {
    category,
    topic,
    normalized: unified.normalized,
    signature: unified.signature,
    short: unified.shortSignature,
    keywords: unified.keywords,
  });

  // Keep output shape identical to old topicSignature.js
  return {
    category,
    topic,
    summary: unified.summary,
    keywords: unified.keywords,
    normalized: unified.normalized,
    signature: unified.signature,
    shortSignature: unified.shortSignature,
  };
}

// ============================================================================
// 2. checkTopicDuplicate()
//    NOTE: This still checks ONLY inside the same category.
//    Uses unified signature fields, identical to curioSignature.js
// ============================================================================
export async function checkTopicDuplicate(topicSig) {
  const db = getSupabase();
  if (!db) {
    console.warn("⚠️ Supabase unavailable — duplicate detection skipped");
    return {
      isDuplicate: false,
      reason: "no-supabase",
      closestTitle: null,
      similarityScore: 0,
    };
  }

  const { category, normalized, signature, shortSignature } = topicSig;
  const query = normalized || signature;

  console.log("\n🔍 CHECK TOPIC DUPLICATE:");
  console.log("   → query:", query);
  console.log("   → shortSignature:", shortSignature);
  console.log("   → category:", category);

  // --------------------------------------------------------------------------
  // STEP 1 — Substring + Short Signature (same category)
  // --------------------------------------------------------------------------
  const { data: rows1, error: err1 } = await db
    .from("articles")
    .select("id, title, category, topic_signature_text, short_topic_signature")
    .eq("category", category)
    .limit(50);

  if (err1) {
    console.error("❌ Supabase error (topic dupe 1):", err1.message);
  }

  if (rows1?.length) {
    for (const row of rows1) {
      const dbText = row.topic_signature_text || "";
      const dbShort = row.short_topic_signature || "";

      // A) Substring match
      if (stringOverlap(query, dbText)) {
        console.log("   🔥 MATCH: topic substring");
        return {
          isDuplicate: true,
          reason: "topic-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      // B) Short-signature fuzzy
      const cmp = compareShortSignatures(shortSignature, dbShort);
      if (cmp.match) {
        console.log("   🔥 MATCH: topic short-signature", cmp.reason);
        return {
          isDuplicate: true,
          reason: "topic-short-signature",
          closestTitle: row.title,
          similarityScore: cmp.score,
        };
      }
    }
  }

  console.log("   ✓ No substring or short-signature match");

  // --------------------------------------------------------------------------
  // STEP 2 — Semantic token overlap
  // --------------------------------------------------------------------------
  for (const row of rows1 || []) {
    const compare = semanticTokenMatch(
      row.topic_signature_text || "",
      query || ""
    );

    if (compare.match) {
      console.log("   🔥 MATCH: topic semantic token overlap");
      return {
        isDuplicate: true,
        reason: "topic-semantic-token-overlap",
        closestTitle: row.title,
        similarityScore: compare.score,
        overlap: compare.overlap,
        ratio: compare.ratio,
      };
    }
  }

  // --------------------------------------------------------------------------
  // STEP 3 — Vector similarity (embedding)
  // --------------------------------------------------------------------------
  const embed = await embedText(query);

  if (!embed) {
    console.log("   ⚠️ Embedding failed → skipping vector check");
    return {
      isDuplicate: false,
      reason: "no-embedding",
      closestTitle: null,
      similarityScore: 0,
    };
  }

  const { data: vecHits, error: err2 } = await db.rpc("match_articles", {
    query_embedding: embed,
    match_threshold: 0.86,
    match_count: 1,
  });

  if (err2) {
    console.error("❌ Supabase RPC error (match_articles):", err2.message);
  }

  if (vecHits?.length > 0) {
    const hit = vecHits[0];

    // Topic duplicate only counts inside same category
    if (hit.category === category) {
      console.log("   🔥 MATCH: topic-vector");
      return {
        isDuplicate: true,
        reason: "topic-vector",
        closestTitle: hit.title,
        similarityScore: hit.similarity,
      };
    }
  }

  console.log("   ✓ No vector match — topic is unique");

  return {
    isDuplicate: false,
    reason: "no-match",
    closestTitle: null,
    similarityScore: 0,
  };
}
