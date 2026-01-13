// ============================================================================
// factCheck.js — CurioWire factual verification module
// v4 — FRONTIER REALISM, LENGTH-SAFE, STRUCTURE-LOCKED, OUTPUT-NORMALIZED
// ============================================================================

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

/**
 * CURIOWIRE FACT-CHECK DOCTRINE (v4)
 *
 * CurioWire publishes frontier realism:
 * edge-case science, unresolved anomalies, archaeological puzzles,
 * rare biological mechanisms, unusual engineering history, and
 * surprising factual events.
 *
 * Therefore:
 * - WOW is allowed.
 * - Mystery is allowed.
 * - Emerging / debated interpretations are allowed.
 *
 * Only **demonstrably false** concrete claims are errors.
 *
 * The fact-checker MUST NOT:
 * - shorten the article,
 * - delete sentences,
 * - rewrite paragraphs,
 * - neutralize strong claims just because they are surprising,
 * - alter structure, tone, or emotional arc,
 * - reorder/remove <h2> or <p> blocks.
 *
 * Corrections must be:
 * - minimal,
 * - precise,
 * - phrase-level edits only,
 * - length-preserving (±5% of original word count).
 *
 * "Did You Know?" may only be corrected if a fact is provably wrong.
 *
 * Output MUST follow one of the exact formats below.
 */

/**
 * FACT-CHECK OUTPUT FORMATS (STRICT):
 *
 * 1) FACT-CHECK: OK
 *
 * 2) FACT-CHECK: ISSUES FOUND
 *    - bullet list of each incorrect statement → corrected version
 *    CORRECTED ARTICLE:
 *    <full corrected HTML, structure unchanged>
 *
 * 3) FACT-CHECK: MAJOR ISSUE
 *    <one short reason line>
 *
 * 4) FACT-CHECK: UNCERTAIN
 *    <one short reason line>
 */

function buildFactCheckPrompt(articleHTML, title, factualFrame = "") {
  return `
You are the **Frontier Realism Factual Auditor** for *CurioWire* — a publication
specializing in emerging science, archaeology, deep-time anomalies, extreme biology,
rare evolutionary mechanisms, unexplained physical events, and unusual engineering history.

Your mission: **Only correct PROVABLE factual errors.**
Never remove mystery. Never weaken WOW.

=====================================================================
FRONTIER REALISM PROTECTION LAYER (STRICT)
=====================================================================
The following are NOT errors unless provably false:

• rare, surprising, or extreme biological mechanisms
• unknowns, anomalies, unexplained data
• archaeological interpretations with ongoing debate
• geologic or astronomical outlier events
• emerging or frontier research
• unusual evolutionary traits
• anomalous records that are documented but unexplained

Treat surprising claims as POTENTIALLY TRUE unless disproven.

=====================================================================
ABSOLUTE PROHIBITIONS (DO NOT EVER DO THESE)
=====================================================================
❌ Do NOT shorten the article
❌ Do NOT delete any sentence
❌ Do NOT merge or compress content
❌ Do NOT rewrite paragraphs
❌ Do NOT neutralize strong or dramatic factual statements
❌ Do NOT generalize or soften frontier realism
❌ Do NOT alter emotional or cinematic tone
❌ Do NOT change the number or order of <h2> or <p> blocks
❌ Do NOT reorder headings or paragraphs
❌ Do NOT alter Did You Know unless the fact itself is provably wrong
❌ Do NOT add new facts, sources, citations, or external context

=====================================================================
ALLOWED ACTIONS (ONLY WHEN NECESSARY)
=====================================================================
✔ Replace ONLY the incorrect factual phrase inside the same sentence
✔ Keep article length within ±5%
✔ Preserve sentence rhythm and meaning
✔ Correct attribution (wrong person/date/location) ONLY if clearly wrong
✔ Correct physical impossibilities
✔ Fix internal contradictions (phrase-level)

=====================================================================
STATUS DEFINITIONS
=====================================================================

A) FACT-CHECK: OK
Use if:
• no provable factual errors exist
• no factual frame violations exist
• the article does NOT require an "uncertainty label" (i.e. it is not primarily a debated/unknown frontier claim)

B) FACT-CHECK: ISSUES FOUND
Use only if:
• errors are small and correctable
• core narrative remains intact
• corrections can be phrase-level only

Output format (STRICT):
FACT-CHECK: ISSUES FOUND
- "<incorrect claim snippet>" → "<corrected wording>"
- "<incorrect claim snippet>" → "<corrected wording>"
CORRECTED ARTICLE:
<full corrected HTML>

C) FACT-CHECK: MAJOR ISSUE
Use only if:
• the core premise is invented or contradicts well-established fact
• it cannot be repaired with phrase-level corrections

Output format (STRICT):
FACT-CHECK: MAJOR ISSUE
<one short reason line>

D) FACT-CHECK: UNCERTAIN
Use if ALL are true:
• There are NO provable factual errors.
• There are NO factual frame violations (no concrete claims outside the frame).
• The topic is genuinely frontier / debated / unresolved (as allowed by the frame).
• The article uses appropriate uncertainty language (e.g. "may", "could", "records suggest", "researchers debate").
UNCERTAIN is acceptable for publication and does NOT require rewriting.

Output format (STRICT):
FACT-CHECK: UNCERTAIN
<one short reason line>


=====================================================================
CRITICAL INSTRUCTIONS
=====================================================================
1) You MUST preserve the exact HTML block structure:
   - Keep the same count and order of <h2> and <p> blocks.
   - If you output CORRECTED ARTICLE, it must contain the full article HTML.
2) Only edit within sentences that contain errors (phrase-level).
3) Do not add or remove headings, paragraphs, or sections.
4) Do not add sources, links, citations, or extra commentary.
5) If there are zero provable factual errors AND no factual frame violations:
   - output ONLY: "FACT-CHECK: OK" OR "FACT-CHECK: UNCERTAIN" depending on the definitions above.
6) If ANY concrete claim is outside the factual frame, you MUST output ISSUES FOUND (not OK, not UNCERTAIN). Concrete claim = names, dates/years, locations, quantities, institutions, study titles, or “according to X” attributions.
7) If the topic is unresolved/debated AND the article states it as certainty ("is", "proves", "confirmed"), you MUST output ISSUES FOUND and rewrite ONLY those certainty phrases into uncertainty language.

=====================================================================

TITLE OF ARTICLE:
"${title}"

=====================================================================
FACT WHITELIST (FRAME + OPTIONAL FACTPACK)
=====================================================================
The article was generated under a strict whitelist.
Only details in this frame are allowed as concrete facts.

If the article includes specific claims NOT present in this frame, treat those as potential factual violations.

FRAME (verbatim):
${factualFrame || "(none provided)"}

Rules:
• If a claim is not supported by the frame, do NOT “correct” it by inventing a new fact.
• Instead, treat it as ISSUES FOUND and minimally edit the sentence to remove the unsupported concrete detail
  OR rewrite it into uncertainty language, while preserving the WOW tone and structure — but the status MUST remain ISSUES FOUND.
• Do NOT add new sources, citations, institutions, or dates that are not in the frame.

IMPORTANT:
• Claims outside the factual frame are NOT considered "UNCERTAIN".
• Frame violations MUST be handled as ISSUES FOUND, even if rewritten with uncertainty language.
• Use FACT-CHECK: UNCERTAIN ONLY for genuinely unresolved topics already allowed by the frame.
• If ANY claim is outside the frame, you MUST NOT output FACT-CHECK: OK.
• NEVER use FACT-CHECK: UNCERTAIN to handle frame violations. Frame violations are always ISSUES FOUND.
• Even if you rewrite an out-of-frame claim into uncertainty language, it is STILL a frame violation and must remain ISSUES FOUND.

=====================================================================

ARTICLE TO FACT-CHECK (HTML):
${articleHTML}

Begin frontier-realism factual verification now.
`.trim();
}

/**
 * Normalize model output to strict formats, best-effort.
 * - Ensures status line exists.
 * - If status OK → returns exactly "FACT-CHECK: OK"
 * - Otherwise returns trimmed output as-is.
 */
function normalizeFactCheckOutput(raw) {
  const out = (raw || "").trim();
  if (!out) {
    return "FACT-CHECK: MAJOR ISSUE\nFactual analysis failed.";
  }

  // === Happy path: korrekt prefiks ===
  if (out.startsWith("FACT-CHECK: OK")) {
    return "FACT-CHECK: OK";
  }

  if (
    out.startsWith("FACT-CHECK: ISSUES FOUND") ||
    out.startsWith("FACT-CHECK: UNCERTAIN") ||
    out.startsWith("FACT-CHECK: MAJOR ISSUE")
  ) {
    return out;
  }

  // === Fallback: modellen glemte prefiks, men indikerer tydelig status ===
  const upper = out.toUpperCase();

  if (upper.includes("ISSUES FOUND")) {
    return `FACT-CHECK: ISSUES FOUND\n${out}`;
  }

  if (upper.includes("UNCERTAIN")) {
    return `FACT-CHECK: UNCERTAIN\n${out}`;
  }

  if (upper.includes("MAJOR ISSUE")) {
    return `FACT-CHECK: MAJOR ISSUE\n${out}`;
  }

  // === Absolutt failsafe ===
  return "FACT-CHECK: MAJOR ISSUE\nOutput format invalid.";
}

export async function factCheckArticle(articleHTML, title, factualFrame = "") {
  if (!articleHTML || articleHTML.length < 100) {
    return "FACT-CHECK: MAJOR ISSUE\nArticle too short to verify.";
  }

  const prompt = buildFactCheckPrompt(articleHTML, title, factualFrame);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.CURIO_FACTCHECK_MODEL || "gpt-4o-mini",
      temperature: 0.05,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion?.choices?.[0]?.message?.content?.trim() || "";
    return normalizeFactCheckOutput(content);
  } catch (err) {
    console.error("⚠️ factCheckArticle failed:", err?.message || err);
    return "FACT-CHECK: MAJOR ISSUE\nFactual analysis failed.";
  }
}

/**
 * Extract corrected article version from fact-check output (if present).
 */
export function extractCorrectedVersion(factCheckOutput) {
  if (!factCheckOutput) return null;
  const match = factCheckOutput.match(/CORRECTED ARTICLE:\s*([\s\S]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract the status label (OK, ISSUES, MAJOR, UNCERTAIN).
 */
export function getFactCheckStatus(result) {
  const r = (result || "").trim();
  if (r.startsWith("FACT-CHECK: OK")) return "OK";
  if (r.startsWith("FACT-CHECK: ISSUES FOUND")) return "ISSUES";
  if (r.startsWith("FACT-CHECK: MAJOR ISSUE")) return "MAJOR";
  if (r.startsWith("FACT-CHECK: UNCERTAIN")) return "UNCERTAIN";
  return "UNKNOWN";
}
