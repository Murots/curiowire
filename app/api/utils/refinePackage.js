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
- Rewrite or tighten typical AI-style phrasing where it appears (e.g. vague transitions, generic contrast lines, abstract filler). Prefer direct, concrete wording. Do this minimally, without changing meaning or adding new facts.
- If the LAST paragraph ends with “next time you” / “so, next time you” / “so next time you” / “so, the next time you” / “so the next time you” (any casing/punctuation), rephrase that sentence to remove this framing while keeping the same meaning and claims and without adding new facts.
- Keep the SAME meaning, SAME claims, SAME uncertainty markers (allegedly/claimed/unconfirmed/no definitive proof).
- Do NOT add new facts, numbers, dates, names, locations, or explanations.
- Do NOT remove claims either. If a sentence is unclear, rewrite it minimally.
- Do NOT change structure, formatting, or sections.
- Preserve HTML tags and block structure as-is.
- If Card contains <h2> and <p> blocks, keep them in the same order and preserve them exactly; you may edit text inside them only.
- Preserve the same tag style per field.

OUTPUT FORMAT (ABSOLUTE)
Return EXACTLY these labels in this exact order:

Title:
[title text only, no HTML]

Card:
[HTML, preserve existing <h2> and <p> blocks exactly; you may edit text inside them]

VideoScript:
[HTML, preserve <p> blocks exactly; you may edit text inside them]

Summary:
[HTML, keep the <ul> structure and the <span data-summary-*> attributes]

FunFact:
[HTML <p>...</p> if present, otherwise leave empty]

DO NOT add anything else.
`.trim();
}
