// ============================================================================
// refinePackage.js — CurioWire vNext (LIGHT LANGUAGE POLISH PASS)
// Goal: Improve flow/grammar/clarity with MINIMAL edits, no new facts.
// STRICT: preserve meaning, structure, and all uncertainty markers.
// ============================================================================

export function buildRefinePackagePrompt({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are an editor doing a LIGHT language polish pass.

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
- If the LAST paragraph ends with “next time you” / “so, next time you” / “so next time you” / “so, the next time you” / “so the next time you” (any casing/punctuation), rephrase that sentence to remove this framing while keeping the same meaning and claims and without adding new facts.
- Keep the SAME meaning, SAME claims, SAME uncertainty markers (allegedly/claimed/unconfirmed/no definitive proof).
- Do NOT add new facts, numbers, dates, names, locations, or explanations.
- Do NOT remove claims either. If a sentence is unclear, rewrite it minimally.
- Do NOT change structure, formatting, or sections.
- Preserve HTML tags as-is and keep the same tag style per field.

OUTPUT FORMAT (ABSOLUTE)
Return EXACTLY these labels in this exact order:

Title:
[title text only, no HTML]

Card:
[HTML, preserve <p> blocks exactly; you may edit text inside them]

VideoScript:
[HTML, preserve <p> blocks exactly; you may edit text inside them]

Summary:
[HTML, keep the <ul> structure and the <span data-summary-*> attributes]

FunFact:
[HTML <p>...</p> OR empty <p></p> if none]

DO NOT add anything else.
`.trim();
}
