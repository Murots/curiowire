// ============================================================================
// app/api/utils/insertSeoHeadings.js — CurioWire vNext (POST-GEN SEO H2 INSERT)
// Goal: Add 2–3 natural, searchable H2 headings into a finished article
// without rewriting the article itself.
// Notes:
// - For standard articles only
// - Keeps original paragraph text intact as much as possible
// - Adds headings only where natural section breaks already exist
// ============================================================================

function safe(v) {
  return String(v || "").trim();
}

function countParagraphs(html) {
  return (String(html || "").match(/<p[\s\S]*?<\/p>/gi) || []).length;
}

function countH2(html) {
  return (String(html || "").match(/<h2[\s\S]*?>[\s\S]*?<\/h2>/gi) || [])
    .length;
}

function hasH2(html) {
  return /<h2[\s\S]*?>[\s\S]*?<\/h2>/i.test(String(html || ""));
}

function normalizeOutput(text, fallback) {
  const s = String(text || "").trim();
  if (!s) return fallback;

  const match = s.match(/Card:\s*([\s\S]*)$/i);
  const out = (match?.[1] || s).trim();

  if (!out) return fallback;
  return out;
}

export function buildInsertSeoHeadingsPrompt({ title, category, card_text }) {
  return `
You are an SEO structure editor.

TASK
Insert 2–3 natural H2 headings into the finished article below.

GOAL
Improve scanability and search structure without rewriting the article.

INPUT
Category: ${safe(category)}
Title: ${safe(title)}

Card:
${safe(card_text)}

RULES
- Add 2–3 <h2> headings only where natural section breaks already exist.
- Keep the article's wording, meaning, order, and paragraph text the same.
- Do NOT rewrite the article except for the minimum formatting needed to place headings.
- Do NOT add new facts, claims, dates, names, or explanations.
- Do NOT remove any existing text.
- Headings must be concrete and search-oriented, clearly naming the main subject or key event/mechanism and matching likely search intent, while avoiding vague or generic phrasing.
- Prefer headings that clarify the topic, entity, or key event.
- Prefer concise H2 headings (3–7 words when possible).
- Avoid full-sentence style headings when a shorter phrase works.
- Avoid poetic or overly abstract phrasing.
- Avoid repeating the exact title wording in every heading.
- Do NOT add an H2 before the very first paragraph.
- Do NOT add an H2 before every paragraph.
- If the article is too short or too compact for 3 good headings, use 2.
- Preserve all existing <p> blocks exactly; only insert <h2> blocks between them.

OUTPUT FORMAT (ABSOLUTE)
Return EXACTLY:

Card:
[full article HTML using existing <p> blocks and inserted <h2> headings only]

DO NOT add anything else.
`.trim();
}

export async function insertSeoHeadings({
  openai,
  title,
  category,
  card_text,
}) {
  if (!openai) throw new Error("insertSeoHeadings: missing openai client");

  const original = safe(card_text);
  if (!original) return original;

  // Skip very short articles
  if (countParagraphs(original) < 4) return original;

  // Skip if headings already exist
  if (hasH2(original)) return original;

  const prompt = buildInsertSeoHeadingsPrompt({
    title,
    category,
    card_text: original,
  });

  const resp = await openai.chat.completions.create({
    model:
      process.env.SEO_HEADING_MODEL ||
      process.env.ARTICLE_MODEL ||
      "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim() || "";
  const output = normalizeOutput(text, original);

  const originalPCount = countParagraphs(original);
  const outputPCount = countParagraphs(output);
  const outputH2Count = countH2(output);

  // Safety: must still contain paragraphs, must not lose paragraphs,
  // and must now contain at least one h2
  if (!/<p[\s\S]*?<\/p>/i.test(output)) return original;
  if (outputPCount < originalPCount) return original;
  if (outputH2Count < 1) return original;

  return output;
}
