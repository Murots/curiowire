/* ============================================================================
app/api/utils/questions/backfillQuestions.js

CurioWire: Backfill missing questions for older articles
Run manually / cron / admin route.
Full production-ready file.
============================================================================ */

import { generateQuestions } from "./generateQuestions.js";

export async function backfillQuestions({ openai, supabase, limit = 25 }) {
  if (!openai) throw new Error("backfillQuestions: missing openai");
  if (!supabase) throw new Error("backfillQuestions: missing supabase");

  const { data: cards, error } = await supabase
    .from("curiosity_cards")
    .select(
      `
      id,
      category,
      title,
      card_text,
      summary_normalized
    `,
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (error) {
    throw new Error(`backfillQuestions load cards failed: ${error.message}`);
  }

  const results = [];

  for (const card of cards || []) {
    const { count } = await supabase
      .from("article_questions")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("card_id", Number(card.id));

    if (Number(count) > 0) {
      results.push({
        card_id: card.id,
        skipped: true,
      });
      continue;
    }

    try {
      const rows = await generateQuestions({
        openai,
        supabase,
        card,
      });

      results.push({
        card_id: card.id,
        created: rows.length,
      });
    } catch (err) {
      results.push({
        card_id: card.id,
        error: err.message,
      });
    }
  }

  return results;
}
