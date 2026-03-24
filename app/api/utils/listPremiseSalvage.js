// ============================================================================
// listPremiseSalvage.js — CurioWire vNext (LIST PREMISE SALVAGE DECIDER)
// Goal: If a generated list article fails premise, decide if there exists a real,
// closely related list package that matches the same wow intent.
// ============================================================================

export function buildListPremiseSalvagePrompt({
  title,
  card_text,
  reason,
  original_list_title,
  original_theme,
  original_angle,
  original_items,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are a premise-salvage decider for a CurioWire list article.

The provided generated article premise appears false or overstated. Your job:
- Decide if there exists a REAL, closely related list package that matches the same overall wow intent.
- If YES: provide a replacement package.
- If NO: do not guess. Say NO.

Rules:
- You may use web search via tools if available to verify specifics.
- Do not invent names/dates/numbers if unsure; if you cannot verify, choose NO.
- Keep it close:
  - same domain
  - same type of wow angle
  - same basic article identity if possible
- Prefer to preserve the original items if they are individually valid.
- ReplacementItems must be ONE valid JSON array.
- If you cannot verify the replacement with high confidence, answer NO.

INPUT

OriginalListTitle:
${safe(original_list_title)}

OriginalTheme:
${safe(original_theme)}

OriginalAngle:
${safe(original_angle)}

OriginalItems:
${JSON.stringify(original_items || [], null, 2)}

GeneratedTitle:
${safe(title)}

GeneratedCard:
${safe(card_text)}

FailReason:
${safe(reason)}

OUTPUT (ABSOLUTE)
Return EXACTLY these labels in this order:

Salvage:
YES or NO

ReplacementTitle:
(one short line, or empty)

ReplacementTheme:
(one short line, or empty)

ReplacementAngle:
(one short line, or empty)

ReplacementItems:
(JSON array, or [])

DO NOT add anything else.
`.trim();
}
