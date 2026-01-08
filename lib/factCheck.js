// ============================================================================
// factCheck.js — CurioWire factual verification module
// v3 — FRONTIER REALISM, LENGTH-SAFE, WOW-PRESERVING EDITION
// ============================================================================

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

/**
 * NEW CURIOWIRE FACT-CHECK DOCTRINE (v3)
 *
 * CurioWire publishes frontier realism — verified edge-cases, strange science,
 * unresolved anomalies, archaeological puzzles, rare biological mechanisms,
 * and surprising factual events.
 *
 * Therefore:
 * - WOW is allowed.
 * - Mystery is allowed.
 * - Emerging science is allowed.
 * - Rare mechanisms are allowed.
 * - Unresolved debates are allowed.
 * - Unusual but documented observations are allowed.
 *
 * Only **demonstrably false** factual claims are errors.
 *
 * The fact-checker MUST NOT:
 * - shorten the article,
 * - delete sentences,
 * - rewrite paragraphs,
 * - neutralize strong or surprising factual details,
 * - weaken dramatic or frontier-realism claims,
 * - alter the article’s structure, tone, or emotional arc.
 *
 * Corrections must be:
 * - minimal,
 * - precise,
 * - phrase-level only (no rewriting),
 * - length-preserving (±5% of original word count).
 *
 * Did You Know facts may only be corrected if factually wrong.
 *
 * Structure Lock:
 * - Never reorder or remove <h2> or <p> blocks.
 * - Only modify the specific sentence containing an error.
 */

/**
 * FACT-CHECK OUTPUT FORMATS:
 *
 * 1) FACT-CHECK: OK
 *
 * 2) FACT-CHECK: ISSUES FOUND
 *    - bullet list of each incorrect statement + corrected version
 *    - CORRECTED ARTICLE:
 *      <full corrected HTML, structure unchanged>
 *
 * 3) FACT-CHECK: MAJOR ISSUE
 *    - central premise false → cannot be salvaged
 *
 * 4) FACT-CHECK: UNCERTAIN
 *    - only if topic is inherently unresolved AND article does NOT claim certainty
 */

export async function factCheckArticle(articleHTML, title) {
  if (!articleHTML || articleHTML.length < 100) {
    return "FACT-CHECK: MAJOR ISSUE\nArticle too short to verify.";
  }

  const prompt = `
You are the **Frontier Realism Factual Auditor** for *CurioWire* — a publication
specializing in emerging science, archaeology, deep-time anomalies, extreme biology,
rare evolutionary mechanisms, unexplained physical events, and unusual engineering history.

Your mission: **Only correct PROVABLE factual errors.**
Never remove mystery. Never weaken WOW.

=====================================================================
FRONTIER REALISM PROTECTION LAYER  (STRICT)
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
ABSOLUTE PROHIBITIONS  (DO NOT EVER DO THESE)
=====================================================================
❌ Do NOT shorten the article  
❌ Do NOT delete any sentence  
❌ Do NOT merge or compress content  
❌ Do NOT rewrite paragraphs  
❌ Do NOT neutralize strong or dramatic factual statements  
❌ Do NOT generalize or soften frontier realism  
❌ Do NOT alter emotional or cinematic tone  
❌ Do NOT change the number or order of <h2> or <p> blocks  
❌ Do NOT alter Did You Know unless the fact itself is wrong  

=====================================================================
ALLOWED ACTIONS  (ONLY WHEN NECESSARY)
=====================================================================
✔ Replace ONLY the incorrect factual phrase  
✔ Maintain article length within ±5%  
✔ Preserve sentence rhythm and meaning  
✔ Correct attribution (wrong person/date/location)  
✔ Correct physical impossibilities  
✔ Fix contradictions inside the article  

=====================================================================
STATUS DEFINITIONS
=====================================================================

A) FACT-CHECK: OK  
Use if:
• no factual errors exist  
• surprising claims remain plausible  
• uncertainties are correctly phrased  

B) FACT-CHECK: ISSUES FOUND  
Use only if:
• errors are small and correctable  
• core narrative remains intact  
• corrections can be phrase-level only  

Output format:
- list bullet points of incorrect → corrected
- then output:
CORRECTED ARTICLE:
<full corrected HTML>

C) FACT-CHECK: MAJOR ISSUE  
Use only if:
• the core premise is invented or contradicts well-established fact  
• the article cannot be repaired with small corrections  

D) FACT-CHECK: UNCERTAIN  
Use only if:
• topic is inherently unresolved AND  
• the article accidentally treats it as fully established fact  

=====================================================================
OUTPUT RULES
=====================================================================
Your output MUST:
• Start with “FACT-CHECK: <STATUS>”  
• Follow the exact structures above  
• No explanation beyond required fields  
• No additional commentary or prose  

=====================================================================

TITLE OF ARTICLE:
"${title}"

ARTICLE TO FACT-CHECK (HTML):
${articleHTML}

Begin frontier-realism factual verification now.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.05,
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("⚠️ factCheckArticle failed:", err.message);
    return "FACT-CHECK: MAJOR ISSUE\nFactual analysis failed.";
  }
}

/**
 * Extract corrected article version from fact-check output (if present).
 */
export function extractCorrectedVersion(factCheckOutput) {
  const match = factCheckOutput.match(/CORRECTED ARTICLE:\s*([\s\S]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract the status label (OK, ISSUES, MAJOR, UNCERTAIN).
 */
export function getFactCheckStatus(result) {
  if (result.startsWith("FACT-CHECK: OK")) return "OK";
  if (result.startsWith("FACT-CHECK: ISSUES FOUND")) return "ISSUES";
  if (result.startsWith("FACT-CHECK: MAJOR ISSUE")) return "MAJOR";
  if (result.startsWith("FACT-CHECK: UNCERTAIN")) return "UNCERTAIN";
  return "UNKNOWN";
}
