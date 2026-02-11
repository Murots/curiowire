// ============================================================================
// app/api/utils/factCheckPackage.js — CurioWire vNext (DEMONSTRABLY-FALSE + RISKY PRECISION)
// Goal: Fix objectively wrong claims + soften risky precision.
// ============================================================================

export function buildFactCheckPackagePrompt({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are a strict fact checker. Keep style and structure the same.

TASK (DECISION FIRST):
- “Core premise” = the wow-claim itself (first/record/etc.) + what it refers to.
- If the core premise is false (the main event did not happen as described), return FAIL_PREMISE.
- If the wow-claim is wrong and cannot be corrected within the same story, return FAIL_PREMISE (do not ‘soften’ it into a generic story).
- Otherwise return PASS and apply the minimum necessary edits below.

EDIT RULES (MINIMUM EDITS ONLY):
- If a claim is demonstrably false, you MUST correct it.
- If a claim uses risky precision you cannot be highly confident about with high confidence, you MUST soften it.
  Treat these as risky unless truly uncontroversial:
  "the first", "the only", "record", "never", "best/most/least", "exactly", "confirmed", and exact numbers/dates/times/scores.

HOW TO SOFTEN (WITHOUT ADDING FACTS):
- Replace with safer language: "about", "roughly", "reported", "widely described as", "often cited as".
- If unsure, remove the precise part rather than guessing.

DO NOT:
- invent sources
- add new facts
- rewrite for tone
- restructure or reformat HTML

INPUT
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

OUTPUT FORMAT (ABSOLUTE)
Return EXACTLY these labels in this order:

Verdict:
PASS or FAIL_PREMISE

Reason:
(1–3 sentences. If PASS, briefly state what you changed OR "No changes needed.")

Title:
[title text only, no HTML]

Card:
[HTML; preserve <p> blocks exactly; edit text inside only if needed]

VideoScript:
[HTML; preserve <p> blocks exactly; edit text inside only if needed]

Summary:
[HTML; keep the <ul> structure and <span data-summary-*> attributes]

FunFact:
[HTML <p>...</p> OR empty <p></p>]

DO NOT add anything else.
`.trim();
}
