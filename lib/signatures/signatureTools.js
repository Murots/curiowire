// // ============================================================================
// // CurioWire — signatureTools.js v4.3
// // Universal signature utilities shared across CurioWire
// // Works in BOTH Next.js runtime + Node CLI scripts
// // ============================================================================

// import OpenAI from "openai";

// // ============================================================================
// // 0. LAZY-LOADED OPENAI CLIENT  ⚠️ critical for CLI usage
// // ============================================================================
// let openaiClient = null;

// function getOpenAI() {
//   if (!openaiClient) {
//     const key = process.env.OPENAI_API_KEY;

//     if (!key) {
//       console.error(
//         "❌ ERROR: Missing OPENAI_API_KEY — embedText() cannot run."
//       );
//       return null;
//     }

//     openaiClient = new OpenAI({ apiKey: key });
//   }

//   return openaiClient;
// }

// // ============================================================================
// // 1. NORMALIZATION
// // ============================================================================
// export function normalizeSignature(str = "") {
//   return str
//     .toLowerCase()
//     .replace(/[^a-z0-9\s]/g, " ")
//     .replace(
//       /\b(the|a|an|and|of|in|on|for|to|from|by|with|at|is|was|were|has|had|this|that|these|those|as|it|its|be|are|or)\b/g,
//       " "
//     )
//     .replace(/\s+/g, " ")
//     .trim();
// }

// // ============================================================================
// // 2. TOKEN EXTRACTION
// // ============================================================================
// export function extractKeyTokens(str = "") {
//   const n = normalizeSignature(str);
//   const tokens = n.split(" ").filter((t) => t.length > 2);

//   return tokens
//     .filter((t) => !/^(very|more|much|many|most|some|any)$/.test(t))
//     .slice(0, 12);
// }

// // ============================================================================
// // 3. BUILD SHORT SIGNATURE
// // ============================================================================
// export function buildShortSignature({ topic, summary, curiosity }) {
//   const combined = [topic, summary, curiosity].filter(Boolean).join(" ");

//   const tokens = extractKeyTokens(combined);
//   const uniq = [...new Set(tokens)];

//   return uniq.slice(0, 5).join("_") || normalizeSignature(topic);
// }

// // ============================================================================
// // 4. TOKEN OVERLAP
// // ============================================================================
// export function tokenOverlap(arrA = [], arrB = []) {
//   const setB = new Set(arrB);
//   let hits = 0;

//   for (const t of arrA) if (setB.has(t)) hits++;
//   return hits;
// }

// // ============================================================================
// // 5. STRING OVERLAP
// // ============================================================================
// export function stringOverlap(a = "", b = "") {
//   const A = normalizeSignature(a);
//   const B = normalizeSignature(b);

//   if (!A || !B) return false;
//   if (A.length < 3 || B.length < 3) return false;

//   return A.includes(B) || B.includes(A);
// }

// // ============================================================================
// // 6. SHORT SIGNATURE COMPARISON (Fuzzy Matching)
// // ============================================================================
// export function compareShortSignatures(sigA = "", sigB = "") {
//   const A = normalizeSignature(sigA);
//   const B = normalizeSignature(sigB);

//   if (!A || !B) return { match: false, reason: null, score: 0 };

//   // 1) exact match
//   if (A === B) {
//     return { match: true, reason: "short-exact", score: 1.0 };
//   }

//   // 2) token overlap
//   const aTokens = A.replace(/_/g, " ").split(" ");
//   const bTokens = B.replace(/_/g, " ").split(" ");

//   const overlap = tokenOverlap(aTokens, bTokens);

//   if (overlap >= 3) {
//     return { match: true, reason: "short-token-overlap", score: 0.8 };
//   }

//   // 3) substring
//   if (A.includes(B) || B.includes(A)) {
//     return { match: true, reason: "short-substring", score: 0.7 };
//   }

//   return { match: false, reason: null, score: 0 };
// }

// // ============================================================================
// // 7. EMBEDDINGS (safe in CLI + Next.js)
// // ============================================================================
// export async function embedText(text) {
//   try {
//     const client = getOpenAI();
//     if (!client) return null;

//     const r = await client.embeddings.create({
//       model: "text-embedding-3-small",
//       input: text.slice(0, 2000),
//     });

//     return r.data[0]?.embedding || null;
//   } catch (err) {
//     console.error("❌ embedText failed:", err.message);
//     return null;
//   }
// }

// // ============================================================================
// // 9. TOKENIZE SEMANTIC SIGNATURE FOR UNIVERSAL COMPARISON
// // ============================================================================
// export function tokenizeSemanticSignature(text = "") {
//   const clean = normalizeSignature(text);
//   return clean.split(" ").filter((t) => t.length > 2);
// }

// // ============================================================================
// // 10. UNIVERSAL SEMANTIC TOKEN MATCHER
// // ============================================================================
// export function semanticTokenMatch(sigA = "", sigB = "") {
//   const A = tokenizeSemanticSignature(sigA);
//   const B = tokenizeSemanticSignature(sigB);

//   if (A.length < 4 || B.length < 4) {
//     return { match: false, score: 0 };
//   }

//   const setA = new Set(A);
//   const setB = new Set(B);

//   let overlap = 0;
//   for (const token of setA) {
//     if (setB.has(token)) overlap++;
//   }

//   const ratio = overlap / Math.min(A.length, B.length);

//   return {
//     match: overlap >= 5 && ratio >= 0.55,
//     score: ratio,
//     overlap,
//     ratio,
//   };
// }

// // ============================================================================
// // 8. COSINE SIMILARITY
// // ============================================================================
// export function cosineSimilarity(vecA = [], vecB = []) {
//   if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

//   let dot = 0;
//   let magA = 0;
//   let magB = 0;

//   for (let i = 0; i < vecA.length; i++) {
//     dot += vecA[i] * vecB[i];
//     magA += vecA[i] ** 2;
//     magB += vecB[i] ** 2;
//   }

//   if (magA === 0 || magB === 0) return 0;
//   return dot / (Math.sqrt(magA) * Math.sqrt(magB));
// }

// ============================================================================
// CurioWire — signatureTools.js v5.0
// Unified signature utilities shared across CurioWire
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
        "❌ ERROR: Missing OPENAI_API_KEY — OpenAI-powered signature tools cannot run."
      );
      return null;
    }

    openaiClient = new OpenAI({ apiKey: key });
  }

  return openaiClient;
}

// ============================================================================
// 1. NORMALIZATION
//    Shared for ALL signature types (topic + curio)
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
// 2. TOKEN EXTRACTION (unified)
// ============================================================================
export function extractKeyTokens(str = "") {
  const n = normalizeSignature(str);
  const tokens = n.split(" ").filter((t) => t.length > 2);

  return tokens
    .filter((t) => !/^(very|more|much|many|most|some|any)$/.test(t))
    .slice(0, 12);
}

// Internal helper: build short signature from tokens
function buildShortFromTokens(tokens = []) {
  if (!tokens.length) return "";
  const uniq = [...new Set(tokens)];
  return uniq.slice(0, 5).join("_");
}

// ============================================================================
// 3. BUILD SHORT SIGNATURE (backwards compatible wrapper)
//    NOTE: Used by older code, now aligned with unified token logic.
// ============================================================================
export function buildShortSignature({ topic, summary, curiosity } = {}) {
  const combined = [topic, summary, curiosity].filter(Boolean).join(" ");
  const tokens = extractKeyTokens(combined);
  const short = buildShortFromTokens(tokens);

  return short || normalizeSignature(topic || summary || curiosity || "") || "";
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

// ============================================================================
// 9. TOKENIZE SEMANTIC SIGNATURE FOR UNIVERSAL COMPARISON
// ============================================================================
export function tokenizeSemanticSignature(text = "") {
  const clean = normalizeSignature(text);
  return clean.split(" ").filter((t) => t.length > 2);
}

// ============================================================================
// 10. UNIVERSAL SEMANTIC TOKEN MATCHER
// ============================================================================
export function semanticTokenMatch(sigA = "", sigB = "") {
  const A = tokenizeSemanticSignature(sigA);
  const B = tokenizeSemanticSignature(sigB);

  if (A.length < 4 || B.length < 4) {
    return { match: false, score: 0, overlap: 0, ratio: 0 };
  }

  const setA = new Set(A);
  const setB = new Set(B);

  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap++;
  }

  const ratio = overlap / Math.min(A.length, B.length);

  return {
    match: overlap >= 5 && ratio >= 0.55,
    score: ratio,
    overlap,
    ratio,
  };
}

// ============================================================================
// 11. UNIFIED SIGNATURE BUILDER (v5 core)
//     Used by both topicSignature.js & curioSignature.js
//     Ensures IDENTICAL structure for topic + curio signatures
// ============================================================================

export async function buildUnifiedSignature({
  category = "",
  type = "topic", // "topic" | "curio" (semantic label only)
  input = "",
}) {
  const baseInput = (input || "").trim();

  if (!baseInput) {
    return {
      category,
      type,
      input: "",
      summary: "",
      keywords: [],
      normalized: "",
      signature: "",
      shortSignature: "",
    };
  }

  const client = getOpenAI();

  // If vi ikke har OpenAI (f.eks. i lokal test uten nøkkel),
  // bruker vi en ren, deterministisk fallback uten GPT.
  if (!client) {
    const summary = baseInput.slice(0, 200);
    const keywords = extractKeyTokens(baseInput).slice(0, 8);
    const normalized = normalizeSignature(summary + " " + baseInput);
    const tokens = extractKeyTokens(normalized);
    const shortSignature =
      buildShortFromTokens(tokens) || normalizeSignature(baseInput);
    const signature = normalized || shortSignature;

    return {
      category,
      type,
      input: baseInput,
      summary,
      keywords,
      normalized,
      signature,
      shortSignature,
    };
  }

  const systemHint =
    type === "curio"
      ? "You are generating a semantic fingerprint for a factual curiosity used in a curiosity-driven article."
      : "You are generating a semantic fingerprint for a high-level article topic or concept.";

  const prompt = `
${systemHint}

Input text (the core idea):
"${baseInput}"

Return JSON ONLY, with this exact shape:

{
  "summary": "1–2 sentence summary of the input idea",
  "keywords": ["5–8 strongest keywords (single or short phrases)"],
  "normalized": "very short normalized signature text",
  "signature": "compact signature string ideally combining normalized + key ideas"
}
`;

  let summary = "";
  let keywords = [];
  let normalized = "";
  let signature = "";

  try {
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.1,
    });

    let raw = r.choices[0]?.message?.content || "{}";

    // strip ev. kodeblokker / støy
    raw = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^json\s*/i, "")
      .replace(/[\u0000-\u001F]+/g, "")
      .trim();

    const match = raw.match(/\{[\s\S]*\}/);
    if (match) raw = match[0];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("❌ buildUnifiedSignature JSON parse failed, raw:", raw);
      throw err;
    }

    summary = (parsed.summary || baseInput).toString().trim();
    keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k) => k.toString().toLowerCase().trim())
      : [];

    const normalizedSource =
      parsed.normalized || normalizeSignature(summary + " " + baseInput);

    normalized = normalizeSignature(normalizedSource);

    const sigSource =
      parsed.signature ||
      `${normalized} ${keywords.join(" ")}`.trim() ||
      normalized ||
      baseInput;

    signature = normalizeSignature(sigSource);
  } catch (err) {
    console.error("❌ buildUnifiedSignature GPT phase failed:", err.message);

    // Fallback: deterministisk basert på input
    summary = baseInput.slice(0, 200);
    keywords = extractKeyTokens(baseInput).slice(0, 8);
    normalized = normalizeSignature(summary + " " + baseInput);
    signature = normalized || normalizeSignature(baseInput);
  }

  const tokenBase = [summary, baseInput].filter(Boolean).join(" ");
  const tokens = extractKeyTokens(tokenBase);
  const shortSignature =
    buildShortFromTokens(tokens) || signature || normalizeSignature(baseInput);

  return {
    category,
    type,
    input: baseInput,
    summary,
    keywords,
    normalized,
    signature,
    shortSignature,
  };
}
