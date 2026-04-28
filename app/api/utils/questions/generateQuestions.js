// /* ============================================================================
// app/api/utils/questions/generateQuestions.js

// CurioWire: Generate + save related questions for one article
// Full production-ready file.
// ============================================================================ */

// import { buildQuestionPrompt } from "./questionPrompt.js";

// /* -------------------------------------------------------------------------- */
// /* Helpers */
// /* -------------------------------------------------------------------------- */

// function safe(v) {
//   return String(v || "").trim();
// }

// function normalizeJson(text) {
//   const raw = safe(text);

//   if (!raw) return [];

//   try {
//     return JSON.parse(raw);
//   } catch {}

//   const match = raw.match(/\[[\s\S]*\]/);
//   if (!match) return [];

//   try {
//     return JSON.parse(match[0]);
//   } catch {}

//   return [];
// }

// function cleanItems(items) {
//   if (!Array.isArray(items)) return [];

//   return items
//     .map((row, i) => ({
//       position: Number(row?.position) || i + 1,
//       question: safe(row?.question),
//       slug: safe(row?.slug),
//       answer: safe(row?.answer),
//     }))
//     .filter(
//       (row) =>
//         row.question &&
//         row.slug &&
//         row.answer &&
//         row.question.length >= 6 &&
//         row.answer.length >= 40,
//     )
//     .slice(0, 5);
// }

// /* -------------------------------------------------------------------------- */
// /* Main */
// /* -------------------------------------------------------------------------- */

// export async function generateQuestions({ openai, supabase, card }) {
//   if (!openai) throw new Error("generateQuestions: missing openai");
//   if (!supabase) throw new Error("generateQuestions: missing supabase");
//   if (!card?.id) throw new Error("generateQuestions: missing card");

//   const prompt = buildQuestionPrompt({
//     title: card.title,
//     category: card.category,
//     card_text: card.card_text,
//     summary_normalized: card.summary_normalized,
//   });

//   const resp = await openai.chat.completions.create({
//     model:
//       process.env.QUESTION_MODEL || process.env.ARTICLE_MODEL || "gpt-4o-mini",
//     temperature: 0.4,
//     messages: [{ role: "user", content: prompt }],
//   });

//   const text = resp.choices?.[0]?.message?.content || "";

//   const parsed = cleanItems(normalizeJson(text));

//   if (!parsed.length) return [];

//   const rows = parsed.map((item) => ({
//     card_id: Number(card.id),
//     category: safe(card.category).toLowerCase(),
//     question: item.question,
//     answer: item.answer,
//     slug: item.slug,
//     position: item.position,
//     status: "published",
//     is_indexed: true,
//   }));

//   // Remove old rows first (safe refresh)
//   await supabase
//     .from("article_questions")
//     .delete()
//     .eq("card_id", Number(card.id));

//   const { data, error } = await supabase
//     .from("article_questions")
//     .insert(rows)
//     .select("*");

//   if (error) {
//     throw new Error(`generateQuestions insert failed: ${error.message}`);
//   }

//   return data || [];
// }

/* ============================================================================
app/api/utils/questions/generateQuestions.js

CurioWire: Generate + save related questions for one article
Full production-ready file.
Now with:
- duplicate prevention
- source_url required
- web_search enabled
- answer must be generated from source
- source URL validation before save
- retry loop before giving up
============================================================================ */

import { buildQuestionPrompt } from "./questionPrompt.js";
import {
  cleanUrl,
  isValidHttpUrl,
  isBlockedSourceUrl,
  validateSourceUrl,
} from "../sourceUrlValidator.js";

/* -------------------------------------------------------------------------- */
/* Config */
/* -------------------------------------------------------------------------- */

const MAX_QUESTION_ATTEMPTS = Number(process.env.QUESTION_ATTEMPTS || 3);

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

function safe(v) {
  return String(v || "").trim();
}

function norm(v) {
  return safe(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashQuestion(v) {
  return norm(v)
    .replace(
      /\b(the|a|an|was|were|is|are|am|be|been|being|did|does|do|can|could|would|should|will|what|why|how|when|where|who|which)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeJson(text) {
  const raw = safe(text);

  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {}

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    return JSON.parse(match[0]);
  } catch {}

  return [];
}

function cleanItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((row, i) => {
      const question = safe(row?.question);
      const canonicalQuestion = safe(row?.canonical_question) || question;
      const source_url = cleanUrl(row?.source_url);

      return {
        position: Number(row?.position) || i + 1,
        question,
        slug: safe(row?.slug),
        answer: safe(row?.answer),

        source_url,

        anchor_entity: safe(row?.anchor_entity),
        anchor_entity_norm: norm(row?.anchor_entity),

        topic_tag: safe(row?.topic_tag),
        topic_tag_norm: norm(row?.topic_tag),

        canonical_question: canonicalQuestion,
        question_hash: hashQuestion(canonicalQuestion),
      };
    })
    .filter(
      (row) =>
        row.question &&
        row.slug &&
        row.answer &&
        row.question.length >= 6 &&
        row.answer.length >= 40 &&
        row.canonical_question &&
        row.question_hash &&
        isValidHttpUrl(row.source_url) &&
        !isBlockedSourceUrl(row.source_url),
    )
    .slice(0, 5);
}

function dedupeWithinBatch(items) {
  const seenHashes = new Set();
  const seenAnchorTopics = new Set();

  const out = [];

  for (const item of items) {
    const hashKey = item.question_hash;

    const anchorTopicKey =
      item.anchor_entity_norm && item.topic_tag_norm
        ? `${item.anchor_entity_norm}::${item.topic_tag_norm}`
        : "";

    if (hashKey && seenHashes.has(hashKey)) continue;
    if (anchorTopicKey && seenAnchorTopics.has(anchorTopicKey)) continue;

    if (hashKey) seenHashes.add(hashKey);
    if (anchorTopicKey) seenAnchorTopics.add(anchorTopicKey);

    out.push(item);
  }

  return out;
}

async function loadExistingQuestionKeys({ supabase, category }) {
  const cat = safe(category).toLowerCase();

  if (!cat) {
    return {
      hashes: new Set(),
      anchorTopics: new Set(),
    };
  }

  const { data, error } = await supabase
    .from("article_questions")
    .select("question_hash, anchor_entity_norm, topic_tag_norm")
    .eq("category", cat)
    .eq("status", "published")
    .eq("is_indexed", true);

  if (error) {
    throw new Error(`generateQuestions dedupe load failed: ${error.message}`);
  }

  const hashes = new Set();
  const anchorTopics = new Set();

  for (const row of data || []) {
    const hash = safe(row?.question_hash);
    const anchor = safe(row?.anchor_entity_norm);
    const topic = safe(row?.topic_tag_norm);

    if (hash) hashes.add(hash);
    if (anchor && topic) anchorTopics.add(`${anchor}::${topic}`);
  }

  return { hashes, anchorTopics };
}

function filterExistingDuplicates(items, existing) {
  return items.filter((item) => {
    const hashKey = item.question_hash;

    const anchorTopicKey =
      item.anchor_entity_norm && item.topic_tag_norm
        ? `${item.anchor_entity_norm}::${item.topic_tag_norm}`
        : "";

    if (hashKey && existing.hashes.has(hashKey)) return false;
    if (anchorTopicKey && existing.anchorTopics.has(anchorTopicKey))
      return false;

    return true;
  });
}

async function generateQuestionCandidates({ openai, prompt }) {
  const resp = await openai.responses.create({
    model:
      process.env.QUESTION_MODEL ||
      process.env.FACTCHECK_MODEL ||
      process.env.ARTICLE_MODEL ||
      "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  return resp.output_text || "";
}

/* -------------------------------------------------------------------------- */
/* Main */
/* -------------------------------------------------------------------------- */

export async function generateQuestions({ openai, supabase, card }) {
  if (!openai) throw new Error("generateQuestions: missing openai");
  if (!supabase) throw new Error("generateQuestions: missing supabase");
  if (!card?.id) throw new Error("generateQuestions: missing card");

  const category = safe(card.category).toLowerCase();

  const existing = await loadExistingQuestionKeys({
    supabase,
    category,
  });

  let uniqueItems = [];
  const failedUrls = new Set();

  for (let attempt = 1; attempt <= MAX_QUESTION_ATTEMPTS; attempt++) {
    const prompt = buildQuestionPrompt({
      title: card.title,
      category,
      card_text: card.card_text,
      summary_normalized: card.summary_normalized,
      avoidUrls: Array.from(failedUrls),
    });

    const text = await generateQuestionCandidates({
      openai,
      prompt,
    });

    const parsed = dedupeWithinBatch(cleanItems(normalizeJson(text)));

    if (!parsed.length) continue;

    const sourceValidItems = [];

    for (const item of parsed) {
      const verifiedUrl = await validateSourceUrl(item.source_url);

      if (verifiedUrl) {
        sourceValidItems.push({
          ...item,
          source_url: verifiedUrl,
        });
      } else {
        failedUrls.add(String(item.source_url || "").toLowerCase());
      }
    }

    if (!sourceValidItems.length) continue;

    uniqueItems = filterExistingDuplicates(sourceValidItems, existing);

    if (uniqueItems.length) break;
  }

  if (!uniqueItems.length) {
    return [];
  }

  const rows = uniqueItems.map((item, index) => ({
    card_id: Number(card.id),
    category,

    question: item.question,
    answer: item.answer,
    slug: item.slug,
    position: index + 1,

    source_url: item.source_url,

    anchor_entity: item.anchor_entity || null,
    anchor_entity_norm: item.anchor_entity_norm || null,

    topic_tag: item.topic_tag || null,
    topic_tag_norm: item.topic_tag_norm || null,

    canonical_question: item.canonical_question,
    question_hash: item.question_hash,

    status: "published",
    is_indexed: true,
  }));

  // Remove old rows only after we know we have valid rows to insert.
  await supabase
    .from("article_questions")
    .delete()
    .eq("card_id", Number(card.id));

  const { data, error } = await supabase
    .from("article_questions")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`generateQuestions insert failed: ${error.message}`);
  }

  return data || [];
}
