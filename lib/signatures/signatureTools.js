// ============================================================================
// CurioWire — signatureTools.js v4.3
// Universal signature utilities shared across CurioWire
// Works in BOTH Next.js runtime + Node CLI scripts
// ============================================================================

import OpenAI from "openai";

// ============================================================================
// 0. LAZY-LOADED OPENAI CLIENT  ⚠️ critical for CLI usage
// ============================================================================
let openaiClient = null;

function getOpenAI() {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      console.error(
        "❌ ERROR: Missing OPENAI_API_KEY — embedText() cannot run."
      );
      return null;
    }

    openaiClient = new OpenAI({ apiKey: key });
  }

  return openaiClient;
}

// ============================================================================
// 1. NORMALIZATION
// ============================================================================
export function normalizeSignature(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(the|a|an|and|of|in|on|for|to|from|by|with|at|is|was|were|has|had|this|that|these|those|as|it|its|be|are|or)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// 2. TOKEN EXTRACTION
// ============================================================================
export function extractKeyTokens(str = "") {
  const n = normalizeSignature(str);
  const tokens = n.split(" ").filter((t) => t.length > 2);

  return tokens
    .filter((t) => !/^(very|more|much|many|most|some|any)$/.test(t))
    .slice(0, 12);
}

// ============================================================================
// 3. BUILD SHORT SIGNATURE
// ============================================================================
export function buildShortSignature({ topic, summary, curiosity }) {
  const combined = [topic, summary, curiosity].filter(Boolean).join(" ");

  const tokens = extractKeyTokens(combined);
  const uniq = [...new Set(tokens)];

  return uniq.slice(0, 5).join("_") || normalizeSignature(topic);
}

// ============================================================================
// 4. TOKEN OVERLAP
// ============================================================================
export function tokenOverlap(arrA = [], arrB = []) {
  const setB = new Set(arrB);
  let hits = 0;

  for (const t of arrA) if (setB.has(t)) hits++;
  return hits;
}

// ============================================================================
// 5. STRING OVERLAP
// ============================================================================
export function stringOverlap(a = "", b = "") {
  const A = normalizeSignature(a);
  const B = normalizeSignature(b);

  if (!A || !B) return false;
  if (A.length < 3 || B.length < 3) return false;

  return A.includes(B) || B.includes(A);
}

// ============================================================================
// 6. SHORT SIGNATURE COMPARISON (Fuzzy Matching)
// ============================================================================
export function compareShortSignatures(sigA = "", sigB = "") {
  const A = normalizeSignature(sigA);
  const B = normalizeSignature(sigB);

  if (!A || !B) return { match: false, reason: null, score: 0 };

  // 1) exact match
  if (A === B) {
    return { match: true, reason: "short-exact", score: 1.0 };
  }

  // 2) token overlap
  const aTokens = A.replace(/_/g, " ").split(" ");
  const bTokens = B.replace(/_/g, " ").split(" ");

  const overlap = tokenOverlap(aTokens, bTokens);

  if (overlap >= 3) {
    return { match: true, reason: "short-token-overlap", score: 0.8 };
  }

  // 3) substring
  if (A.includes(B) || B.includes(A)) {
    return { match: true, reason: "short-substring", score: 0.7 };
  }

  return { match: false, reason: null, score: 0 };
}

// ============================================================================
// 7. EMBEDDINGS (safe in CLI + Next.js)
// ============================================================================
export async function embedText(text) {
  try {
    const client = getOpenAI();
    if (!client) return null;

    const r = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 2000),
    });

    return r.data[0]?.embedding || null;
  } catch (err) {
    console.error("❌ embedText failed:", err.message);
    return null;
  }
}

// ============================================================================
// 8. COSINE SIMILARITY
// ============================================================================
export function cosineSimilarity(vecA = [], vecB = []) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] ** 2;
    magB += vecB[i] ** 2;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
