// ============================================================================
// app/api/utils/premiseGatePrompt.js — CurioWire (SUGGESTION REALITY CHECK)
// Goal: Quick reality check on the seed itself.
// ============================================================================

export function buildPremiseGatePrompt({ curiosity, category }) {
  const safe = (v) => String(v || "").trim();

  return `
You are a strict verifier of a single curiosity seed.

TASK:
Decide whether the seed describes a real event/claim.

Output one of:
- PASS: The seed is broadly true as written (minor wording ok).
- FIX: The seed is wrong but can be corrected into a true, closely related seed.
- FAIL: The seed is false/made-up and cannot be safely corrected without guessing.

RULES:
- Be strict with anchor details like "the first", "only", "record", date/year, period, score, person, group, location, etc.
- If FIX: correct the seed into a true one-sentence curiosity that preserves the SAME "wow intent".
- "Close in topic" means: same domain + same type of wow-claim (e.g., first/record/oldest/longest), even if the specific event/person/year must change.
- If the wow-claim is false and you cannot verify the true replacement with high confidence, choose FAIL.
- Keep corrected seed short (one sentence), plain text, no quotes.

INPUT
Category: ${safe(category)}
Seed: ${safe(curiosity)}

OUTPUT FORMAT (ABSOLUTE)
Verdict:
PASS | FIX | FAIL

CorrectedSeed:
(one sentence) OR empty

Reason:
(1 sentence)
`.trim();
}
