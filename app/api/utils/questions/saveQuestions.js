/* ============================================================================
app/api/utils/questions/saveQuestions.js

CurioWire: Save pre-generated questions safely
Use when questions already exist in memory.
Full production-ready file.
============================================================================ */

function safe(v) {
  return String(v || "").trim();
}

function cleanRows(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((row, i) => ({
      position: Number(row?.position) || i + 1,
      question: safe(row?.question),
      answer: safe(row?.answer),
      slug: safe(row?.slug),
    }))
    .filter(
      (row) =>
        row.question &&
        row.answer &&
        row.slug &&
        row.question.length >= 6 &&
        row.answer.length >= 30,
    );
}

export async function saveQuestions({
  supabase,
  cardId,
  category,
  items = [],
}) {
  if (!supabase) throw new Error("saveQuestions: missing supabase");
  if (!cardId) throw new Error("saveQuestions: missing cardId");

  const clean = cleanRows(items);

  if (!clean.length) return [];

  const rows = clean.map((item) => ({
    card_id: Number(cardId),
    category: safe(category).toLowerCase(),
    question: item.question,
    answer: item.answer,
    slug: item.slug,
    position: item.position,
    status: "published",
    is_indexed: true,
  }));

  await supabase
    .from("article_questions")
    .delete()
    .eq("card_id", Number(cardId));

  const { data, error } = await supabase
    .from("article_questions")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`saveQuestions failed: ${error.message}`);
  }

  return data || [];
}
