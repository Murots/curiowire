// ============================================================================
// app/api/utils/premiseSalvage.js — CurioWire vNext (PREMISE SALVAGE DECIDER)
// Goal: If premise is false, decide if there's a real, closely related story.
// Output: SALVAGE YES/NO + one replacement seed sentence.
// ============================================================================

export function buildPremiseSalvagePrompt({ title, card_text, reason }) {
  const safe = (v) => String(v || "").trim();

  return `
You are a premise-salvage decider.

The provided article premise appears false. Your job:
- Decide if there exists a REAL, closely related event/story that matches the same "wow intent".
- If YES: provide ONE short replacement seed sentence describing the real event to rebuild on.
- If NO: do not guess. Say NO.

Rules:
- You may use web search via tools if available to verify specifics.
- Do not invent names/dates/numbers if unsure; if you cannot verify, choose NO.
- Keep it close: same domain AND the SAME wow-claim type (first/record/oldest/longest/etc.), even if the specific event/person/year must change.
- ReplacementSeed must be ONE sentence, suitable as a new topic seed.
- If you cannot verify the replacement with high confidence, answer NO.

INPUT
Title:
${safe(title)}

Card:
${safe(card_text)}

FailReason:
${safe(reason)}

OUTPUT (ABSOLUTE)
Return EXACTLY these labels in this order:

Salvage:
YES or NO

ReplacementSeed:
(one short sentence, or empty)

DO NOT add anything else.
`.trim();
}
