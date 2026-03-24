// ============================================================================
// listPremiseGatePrompt.js — CurioWire (LIST SUGGESTION REALITY CHECK)
// Goal: Quick reality check on the list package itself before full generation.
// ============================================================================

export function buildListPremiseGatePrompt({
  title,
  theme,
  angle,
  items,
  category,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are a strict verifier of a CurioWire list-article seed package.

TASK:
Decide whether this list package describes a real, coherent, defensible article concept.

Output one of:
- PASS: The package is broadly true and coherent as written.
- FIX: The package is wrong or overstated but can be corrected into a true, closely related package.
- FAIL: The package is false, misleading, or too broken to safely correct without guessing.

RULES:
- Be strict with anchor details like "first", "only", "record", date/year, period, score, person, group, location, etc.
- Be strict if the TITLE overpromises what the items do not actually support.
- Be strict if the THEME is too strong for the supplied items.
- If FIX:
  - preserve the same general wow intent
  - preserve the same overall list identity as much as possible
  - do NOT invent new items
  - you may soften wording or tighten the title/theme/angle
  - you may rewrite item wording for truth/precision
- If you cannot verify a safe correction with high confidence, choose FAIL.
- Keep corrected fields concise.
- CorrectedItems must be valid JSON array.
- Do not add extra commentary.

INPUT
Category: ${safe(category)}
Title: ${safe(title)}
Theme: ${safe(theme)}
Angle: ${safe(angle)}
Items:
${JSON.stringify(items || [], null, 2)}

OUTPUT FORMAT (ABSOLUTE)
Verdict:
PASS | FIX | FAIL

CorrectedTitle:
(one line) OR empty

CorrectedTheme:
(one line) OR empty

CorrectedAngle:
(one line) OR empty

CorrectedItems:
(JSON array) OR []

Reason:
(1 sentence)
`.trim();
}
