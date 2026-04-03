// ============================================================================
// app/api/utils/articlePlanner.js — CurioWire vNext (EDITORIAL PLANNER RUNNER)
// Goal: Run the planner prompt and return a safe normalized article plan.
// Notes:
// - No randomness
// - Theme/category-driven
// - Cheap and robust
// ============================================================================

import { buildArticlePlannerPrompt } from "./articlePlannerPrompt.js";

const ALLOWED = {
  opening_style: new Set([
    "direct",
    "scene",
    "compressed_curiosity",
    "contrast",
  ]),
  body_style: new Set([
    "event_first",
    "explanation_first",
    "object_first",
    "condition_then_event",
    "list_escalation",
    "concept_then_example",
  ]),
  explanation_style: new Set(["sparse", "balanced", "explanation_heavy"]),
  insight_style: new Set([
    "rarity",
    "scale",
    "misconception",
    "consequence",
    "context",
    "none",
  ]),
  ending_style: new Set([
    "hard_fact",
    "minimal",
    "unresolved",
    "concrete_implication",
  ]),
  tone_style: new Set([
    "restrained",
    "grave",
    "eerie",
    "matter_of_fact",
    "vivid",
  ]),
  pacing_style: new Set(["brisk", "steady", "mixed"]),
};

const DEFAULT_PLAN = {
  opening_style: "direct",
  body_style: "explanation_first",
  explanation_style: "balanced",
  insight_style: "context",
  ending_style: "hard_fact",
  tone_style: "restrained",
  pacing_style: "mixed",
  angle: "State the core curiosity quickly and concretely.",
  avoid: ["avoid hype", "avoid vague reflection", "avoid padded intro"],
};

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function normalizeEnum(value, allowedSet, fallback) {
  const v = safeStr(value).trim();
  return allowedSet.has(v) ? v : fallback;
}

function normalizeAvoid(value) {
  if (!Array.isArray(value)) return DEFAULT_PLAN.avoid;
  const cleaned = value
    .map((x) => safeStr(x))
    .filter(Boolean)
    .slice(0, 5);

  return cleaned.length ? cleaned : DEFAULT_PLAN.avoid;
}

function extractJson(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  try {
    return JSON.parse(s);
  } catch {}

  const match = s.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizePlan(raw) {
  const plan = raw && typeof raw === "object" ? raw : {};

  return {
    opening_style: normalizeEnum(
      plan.opening_style,
      ALLOWED.opening_style,
      DEFAULT_PLAN.opening_style,
    ),
    body_style: normalizeEnum(
      plan.body_style,
      ALLOWED.body_style,
      DEFAULT_PLAN.body_style,
    ),
    explanation_style: normalizeEnum(
      plan.explanation_style,
      ALLOWED.explanation_style,
      DEFAULT_PLAN.explanation_style,
    ),
    insight_style: normalizeEnum(
      plan.insight_style,
      ALLOWED.insight_style,
      DEFAULT_PLAN.insight_style,
    ),
    ending_style: normalizeEnum(
      plan.ending_style,
      ALLOWED.ending_style,
      DEFAULT_PLAN.ending_style,
    ),
    tone_style: normalizeEnum(
      plan.tone_style,
      ALLOWED.tone_style,
      DEFAULT_PLAN.tone_style,
    ),
    pacing_style: normalizeEnum(
      plan.pacing_style,
      ALLOWED.pacing_style,
      DEFAULT_PLAN.pacing_style,
    ),
    angle: safeStr(plan.angle, DEFAULT_PLAN.angle),
    avoid: normalizeAvoid(plan.avoid),
  };
}

export async function decideArticlePlan({
  openai,
  topic,
  category,
  factualFrame = "",
}) {
  if (!openai) throw new Error("decideArticlePlan: missing openai client");

  const prompt = buildArticlePlannerPrompt({
    topic,
    category,
    factualFrame,
  });

  const resp = await openai.chat.completions.create({
    model:
      process.env.ARTICLE_PLANNER_MODEL ||
      process.env.ARTICLE_MODEL ||
      "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const text = resp.choices[0]?.message?.content?.trim() || "";
  const parsed = extractJson(text);

  return normalizePlan(parsed);
}
