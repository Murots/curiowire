// ============================================================================
// CurioWire — Curiosity Signature Engine v5.0 (Unified Signature Format)
// Matches format of topicSignature.js and signatureTools.js unified builder
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
    console.error("❌ Missing Supabase credentials in curioSignature.js");
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ============================================================================
// 1. buildCurioSignature() — Unified v5
//    Mirrors topicSignature.js but uses type: "curio"
// ============================================================================
export async function buildCurioSignature({ category, topic, curiosity }) {
  if (!curiosity || !curiosity.trim()) {
    const fallback = normalizeSignature(curiosity || "");
    return {
      category,
      topic,
      curiosity,
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
    type: "curio",
    input: curiosity,
  });

  console.log("\n🔧 Unified CurioSignature built:", {
    category,
    curiosity,
    normalized: unified.normalized,
    signature: unified.signature,
    short: unified.shortSignature,
    keywords: unified.keywords,
  });

  // Output shape must remain identical to v3; only values changed
  return {
    category,
    topic,
    curiosity,
    summary: unified.summary,
    keywords: unified.keywords,
    normalized: unified.normalized,
    signature: unified.signature,
    shortSignature: unified.shortSignature,
  };
}

// ============================================================================
// 2. checkCurioDuplicate() — Full unified logic
//    Checks across ALL categories (curiosities transcend category boundaries)
// ============================================================================
export async function checkCurioDuplicate(sig) {
  const db = getSupabase();
  if (!db) {
    console.warn("⚠️ No Supabase — cannot check curio duplicates");
    return { isDuplicate: false };
  }

  const { normalized, signature, shortSignature, keywords } = sig;
  const query = normalized || signature;

  console.log("\n🔍 CHECK CURIO DUPLICATE:");
  console.log("   → query:", query);
  console.log("   → shortSignature:", shortSignature);

  // Fetch full set of signatures for comparison
  const { data: rows, error } = await db
    .from("articles")
    .select(
      "id, title, category, semantic_signature, curio_signature_text, short_curio_signature"
    )
    .limit(200);

  if (error) {
    console.error("❌ Supabase error in checkCurioDuplicate:", error.message);
    return { isDuplicate: false };
  }

  // ==========================================================================
  // STEP 1 — Substring & short-signature (strong matches)
  // ==========================================================================
  if (rows?.length) {
    for (const row of rows) {
      const sem = row.semantic_signature || "";
      const curio = row.curio_signature_text || "";
      const dbShort = row.short_curio_signature || "";

      // A) Substring semantic_signature
      if (stringOverlap(query, sem)) {
        console.log("   🔥 MATCH: curio-semantic-substring");
        return {
          isDuplicate: true,
          reason: "curio-semantic-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      // B) Substring curio_signature_text
      if (stringOverlap(query, curio)) {
        console.log("   🔥 MATCH: curio-signature-substring");
        return {
          isDuplicate: true,
          reason: "curio-signature-substring",
          closestTitle: row.title,
          similarityScore: 1.0,
        };
      }

      // C) Fuzzy short-signature
      const cmp = compareShortSignatures(shortSignature, dbShort);
      if (cmp.match) {
        console.log("   🔥 MATCH: curio-short-signature", cmp.reason);
        return {
          isDuplicate: true,
          reason: "curio-short-signature",
          closestTitle: row.title,
          similarityScore: cmp.score,
        };
      }
    }
  }

  // ==========================================================================
  // STEP 2 — Keyword overlap (soft but common-sense)
  // ==========================================================================
  if (keywords?.length) {
    for (const row of rows || []) {
      const txt =
        (row.curio_signature_text || "") + " " + (row.semantic_signature || "");
      const hits = keywords.filter((k) => txt.includes(k.toLowerCase().trim()));
      if (hits.length >= 3) {
        console.log("   🔥 MATCH: curio-keyword-overlap");
        return {
          isDuplicate: true,
          reason: "curio-keyword-overlap",
          closestTitle: row.title,
          similarityScore: 0.7,
        };
      }
    }
  }

  // ==========================================================================
  // STEP 3 — Semantic token overlap (unified)
  // ==========================================================================
  for (const row of rows || []) {
    const compare = semanticTokenMatch(
      row.semantic_signature || "",
      sig.normalized || ""
    );

    if (compare.match) {
      console.log("   🔥 MATCH: curio semantic-token-overlap");
      return {
        isDuplicate: true,
        reason: "semantic-token-overlap",
        closestTitle: row.title,
        similarityScore: compare.score,
        overlap: compare.overlap,
        ratio: compare.ratio,
      };
    }
  }

  // ==========================================================================
  // STEP 4 — Vector similarity (embedding)
  // ==========================================================================
  const embed = await embedText(query);
  if (!embed) {
    console.log("   ⚠️ Vector embedding failed — skipping");
    return { isDuplicate: false };
  }

  const { data: vecHits, error: rpcErr } = await db.rpc("match_articles", {
    query_embedding: embed,
    match_threshold: 0.82,
    match_count: 1,
  });

  if (rpcErr) {
    console.error("❌ Supabase RPC error:", rpcErr.message);
    return { isDuplicate: false };
  }

  if (vecHits?.length > 0) {
    const hit = vecHits[0];
    console.log("   🔥 MATCH: curio-vector");
    return {
      isDuplicate: true,
      reason: "curio-vector",
      closestTitle: hit.title,
      similarityScore: hit.similarity,
    };
  }

  // ==========================================================================
  // UNIQUE
  // ==========================================================================
  console.log("   ✓ Curiosity is unique");
  return { isDuplicate: false };
}
