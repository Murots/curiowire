// ============================================================================
// listRefinePackage.js — CurioWire vNext (LIGHT LANGUAGE POLISH PASS FOR LISTS)
// Goal: Improve flow/grammar/clarity with MINIMAL edits, no new facts.
// STRICT: preserve meaning, structure, all uncertainty markers, and all <h2>/<p>.
// ============================================================================

export function buildListRefinePackagePrompt({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are an editor doing a LIGHT language polish pass on a list article.

INPUT FIELDS

Title:
${safe(title)}

Card:
${safe(card_text)}

VideoScript:
${safe(video_script)}

Summary:
${safe(summary_normalized)}

FunFact:
${safe(fun_fact)}

YOUR TASK
- Fix ONLY: awkward phrasing, grammar, spelling, punctuation, clarity, and flow.
- Keep the SAME meaning, SAME claims, SAME uncertainty markers.
- Do NOT add new facts, numbers, dates, names, locations, or explanations.
- Do NOT remove claims either.
- Do NOT change structure, formatting, or sections.
- Preserve HTML tag structure.

CARD HTML RULES
- Preserve all existing <h2> headings.
- Preserve all existing <p> blocks.
- You may edit text inside tags, but do not remove or reorder sections.

VIDEO RULES
- Preserve <p> blocks exactly; you may edit text inside them.

SUMMARY RULES
- Keep the <ul> structure and the <span data-summary-*> attributes.

FUN FACT RULES
- Keep as <p>...</p> or empty <p></p>.

OUTPUT FORMAT (ABSOLUTE)
Return EXACTLY these labels in this exact order:

Title:
[title text only, no HTML]

Card:
[HTML, preserve <h2> and <p> structure]

VideoScript:
[HTML, preserve <p> structure]

Summary:
[HTML, keep the <ul> structure and the <span data-summary-*> attributes]

FunFact:
[HTML <p>...</p> OR empty <p></p> if none]

DO NOT add anything else.
`.trim();
}
