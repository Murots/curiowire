// ============================================================================
// app/api/utils/articleBreakPlanner.js — CurioWire (ARTICLE BREAK PLANNER)
// Goal: Choose one visual article break or none, using safe structured output.
// ============================================================================

import { buildArticleBreakPrompt } from "./articleBreakPrompt.js";

const ALLOWED_BREAK_TYPES = new Set([
  "timeline",
  "quote",
  "hero_number",
  "map_dot",
  "factbox",
  "none",
]);

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<h1[\s\S]*?<\/h1>/gi, " ")
    .replace(/<h2[\s\S]*?<\/h2>/gi, " ")
    .replace(/<p[\s\S]*?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countParagraphs(html) {
  return (String(html || "").match(/<p[\s\S]*?<\/p>/gi) || []).length;
}

function extractYears(text) {
  const matches = String(text || "").match(/\b(18|19|20)\d{2}\b/g) || [];
  return [...new Set(matches)].slice(0, 8);
}

function extractNumbers(text) {
  const matches =
    String(text || "").match(
      /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\+?\b|\b\d+\+\b|\b\d+\s?(?:years?|months?|days?|decades?|centuries?)\b/gi,
    ) || [];
  return [...new Set(matches)].slice(0, 8);
}

function extractSummaryField(summaryHtml, field) {
  const re = new RegExp(
    `data-summary-${field}[^>]*>([\\s\\S]*?)<\\/span>`,
    "i",
  );
  const m = String(summaryHtml || "").match(re);
  return safeStr(m?.[1] || "");
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildSignals({ card_text, summary_normalized, title, category }) {
  const plainText = stripHtml(card_text);
  const years = extractYears(plainText);
  const numbers = extractNumbers(plainText);
  const where = extractSummaryField(summary_normalized, "where");
  const when = extractSummaryField(summary_normalized, "when");
  const what = extractSummaryField(summary_normalized, "what");
  const paragraphs = countParagraphs(card_text);
  const sentences = splitSentences(plainText);

  const strongSentence = sentences.find(
    (s) => s.length >= 60 && s.length <= 180,
  );

  const durationHints = (
    plainText.match(
      /\b(?:years?|months?|days?|decades?|centuries?|ongoing|still|today|continues?|continued|lasting)\b/gi,
    ) || []
  ).slice(0, 12);

  return {
    title: safeStr(title),
    category: safeStr(category),
    paragraph_count: paragraphs,
    summary_what: what,
    summary_where: where,
    summary_when: when,
    years_found: years,
    numbers_found: numbers,
    duration_hints: durationHints,
    has_clear_location: Boolean(where),
    has_multiple_years: years.length >= 2,
    has_standout_number: numbers.length >= 1,
    has_strong_sentence: Boolean(strongSentence),
    sample_strong_sentence: strongSentence || "",
  };
}

function extractJson(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  try {
    return JSON.parse(s);
  } catch {}

  const match = s.match(/\{[\s\S]*\}$/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeTimelinePayload(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const cleaned = items
    .map((item) => ({
      label: safeStr(item?.label).slice(0, 24),
      text: safeStr(item?.text).slice(0, 180),
    }))
    .filter((item) => item.label && item.text)
    .slice(0, 4);

  return cleaned.length >= 2 ? { items: cleaned } : null;
}

function normalizeQuotePayload(payload) {
  const text = safeStr(payload?.text).slice(0, 260);
  return text ? { text } : null;
}

function normalizeHeroNumberPayload(payload) {
  const value = safeStr(payload?.value).slice(0, 24);
  const label = safeStr(payload?.label).slice(0, 64);
  const kicker = safeStr(payload?.kicker).slice(0, 80);

  if (!value || !label) return null;

  return {
    value,
    label,
    kicker: kicker || null,
  };
}

function normalizeMapDotPayload(payload) {
  const place = safeStr(payload?.place).slice(0, 120);
  const label = safeStr(payload?.label).slice(0, 80);

  if (!place) return null;

  return {
    place,
    label: label || null,
  };
}

function normalizeFactboxPayload(payload) {
  const title = safeStr(payload?.title).slice(0, 120);
  const entityType = safeStr(payload?.entity_type).slice(0, 40);
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const cleanedItems = items
    .map((item) => ({
      label: safeStr(item?.label).slice(0, 32),
      value: safeStr(item?.value).slice(0, 120),
    }))
    .filter((item) => item.label && item.value)
    .slice(0, 4);

  if (!title || cleanedItems.length < 2) return null;

  return {
    title,
    entity_type: entityType || null,
    items: cleanedItems,
  };
}

function normalizePayload(type, payload) {
  switch (type) {
    case "timeline":
      return normalizeTimelinePayload(payload);
    case "quote":
      return normalizeQuotePayload(payload);
    case "hero_number":
      return normalizeHeroNumberPayload(payload);
    case "map_dot":
      return normalizeMapDotPayload(payload);
    case "factbox":
      return normalizeFactboxPayload(payload);
    case "none":
    default:
      return null;
  }
}

function normalizeBreakPlan(raw, paragraphCount) {
  const plan = raw && typeof raw === "object" ? raw : {};

  const breakType = ALLOWED_BREAK_TYPES.has(plan.break_type)
    ? plan.break_type
    : "none";

  const useBreak =
    Boolean(plan.use_break) && breakType !== "none" && paragraphCount >= 2;

  const confidence =
    typeof plan.confidence === "number" && Number.isFinite(plan.confidence)
      ? clamp(plan.confidence, 0, 1)
      : 0;

  const reason = safeStr(plan.reason).slice(0, 220);

  if (!useBreak) {
    return {
      use_break: false,
      break_type: "none",
      insert_after_paragraph: null,
      confidence: 0,
      reason: reason || "No natural visual break fits this article.",
      payload: null,
    };
  }

  const maxInsertAfter = Math.max(1, paragraphCount - 1);
  const insertAfterRaw = Number(plan.insert_after_paragraph);

  const insertAfter = Number.isInteger(insertAfterRaw)
    ? clamp(insertAfterRaw, 1, maxInsertAfter)
    : 1;

  const payload = normalizePayload(breakType, plan.payload);

  if (!payload) {
    return {
      use_break: false,
      break_type: "none",
      insert_after_paragraph: null,
      confidence: 0,
      reason:
        reason || "The selected break type did not produce a valid payload.",
      payload: null,
    };
  }

  return {
    use_break: true,
    break_type: breakType,
    insert_after_paragraph: insertAfter,
    confidence,
    reason: reason || "Selected the strongest natural visual break.",
    payload,
  };
}

export async function decideArticleBreak({
  openai,
  title,
  category,
  card_text,
  summary_normalized = "",
}) {
  if (!openai) throw new Error("decideArticleBreak: missing openai client");

  const paragraphCount = countParagraphs(card_text);
  if (paragraphCount < 2) {
    return {
      use_break: false,
      break_type: "none",
      insert_after_paragraph: null,
      confidence: 0,
      reason: "Article too short for a natural visual break.",
      payload: null,
    };
  }

  const signals = buildSignals({
    card_text,
    summary_normalized,
    title,
    category,
  });

  const prompt = buildArticleBreakPrompt({
    title,
    category,
    card_text,
    summary_normalized,
    signals,
  });

  const resp = await openai.chat.completions.create({
    model:
      process.env.ARTICLE_BREAK_MODEL ||
      process.env.ARTICLE_MODEL ||
      "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const text = resp.choices[0]?.message?.content?.trim() || "";
  const parsed = extractJson(text);

  return normalizeBreakPlan(parsed, paragraphCount);
}
