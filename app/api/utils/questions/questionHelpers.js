/* ============================================================================
app/api/utils/questions/questionHelpers.js

CurioWire: Question helper utilities
Shared helpers for frontend + backend.
Full production-ready file.
============================================================================ */

export function safe(v) {
  return String(v || "").trim();
}

/* -------------------------------------------------------------------------- */
/* Slugify */
/* -------------------------------------------------------------------------- */

export function slugifyQuestion(input) {
  return safe(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

/* -------------------------------------------------------------------------- */
/* Clean text */
/* -------------------------------------------------------------------------- */

export function stripHtml(input) {
  return safe(input)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Meta helpers */
/* -------------------------------------------------------------------------- */

export function buildQuestionTitle(question) {
  return safe(question) || "Question";
}

export function buildQuestionDescription(answer) {
  const text = stripHtml(answer);

  if (!text) return "Answer from CurioWire.";

  return text.length <= 160 ? text : `${text.slice(0, 157).trim()}...`;
}

/* -------------------------------------------------------------------------- */
/* Related questions picker */
/* -------------------------------------------------------------------------- */

export function pickRelatedQuestions(items = [], currentId) {
  if (!Array.isArray(items)) return [];

  return items.filter((x) => Number(x?.id) !== Number(currentId)).slice(0, 6);
}

/* -------------------------------------------------------------------------- */
/* Canonical URL */
/* -------------------------------------------------------------------------- */

export function getQuestionUrl(slug) {
  return `https://curiowire.com/questions/${safe(slug)}`;
}
