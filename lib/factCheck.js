// ============================================================================
// factCheck.js — CurioWire factual verification module
// ============================================================================

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

/**
 * FACT-CHECKING SYSTEM FOR CURIOWIRE
 *
 * Output always follows one of the following formats:
 *
 * 1) FACT-CHECK: OK
 *
 * 2) FACT-CHECK: ISSUES FOUND
 *    - bullet list of issues
 *    - CORRECTED ARTICLE:
 *      <full corrected article>
 *
 * 3) FACT-CHECK: MAJOR ISSUE
 *    - explanation of why
 *    (means article must be regenerated, not corrected)
 *
 * 4) FACT-CHECK: UNCERTAIN
 *    - used for topics that cannot be fact-checked (myth, speculation)
 *
 * This ensures:
 * - No hallucinations enter database
 * - Concepts remain intact
 * - WOW-factor preserved
 * - Small factual errors are corrected
 * - Large errors trigger regeneration
 */

export async function factCheckArticle(articleHTML, title) {
  if (!articleHTML || articleHTML.length < 100) {
    return "FACT-CHECK: MAJOR ISSUE\nArticle too short to verify.";
  }

  const prompt = `
You are a **professional factual accuracy auditor** for a digital publication.
Your job is to examine an article and determine whether its claims are:
- accurate,
- plausible,
- supported by known history/science/culture,
- free of hallucinated events.

TITLE OF ARTICLE:
"${title}"

ARTICLE TO FACT-CHECK (HTML):
${articleHTML}

Your tasks:

1. Identify ALL factual mistakes, invented events, contradictions, or implausible claims.
2. Categorize the output using EXACTLY ONE of the following labels:

   A) "FACT-CHECK: OK"
      → Use this ONLY if everything is accurate or reasonably plausible.
      → Do NOT list any issues if you choose this.

   B) "FACT-CHECK: ISSUES FOUND"
      → Use this for **small or correctable factual mistakes**.
      → After the issues list, produce a fully corrected version of the article.
      → Keep the **same narrative, WOW-factor, tone, concept, and curiosity hook**.
      → Only correct factual details, not the creative structure.

   C) "FACT-CHECK: MAJOR ISSUE"
      → Use this when the article is built on **fabricated events**, 
        impossible history, or a false foundational premise.
      → DO NOT produce a corrected article.
      → This means the article must be regenerated from the concept.

   D) "FACT-CHECK: UNCERTAIN"
      → Use when the core topic is not historically verifiable 
        (myth, speculation, folklore, unconfirmed theory).

3. Output format rules:
   - Start your response with the status label on the first line.
   - If ISSUES FOUND:
        • List issues (bullet points)
        • Then output:
          "CORRECTED ARTICLE:"
          and the full corrected article HTML.
   - If MAJOR ISSUE or UNCERTAIN:
        • Give a short explanation.
   - DO NOT output anything else.

Return ONLY the result in this exact format.
No commentary, no meta-notes.

Begin fact-checking now.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("⚠️ factCheckArticle failed:", err.message);
    return "FACT-CHECK: MAJOR ISSUE\nFactual analysis failed.";
  }
}

/**
 * Extracts corrected article text from fact-check output (if present)
 */
export function extractCorrectedVersion(factCheckOutput) {
  const match = factCheckOutput.match(/CORRECTED ARTICLE:\s*([\s\S]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Returns the status label (OK, ISSUES FOUND, MAJOR ISSUE, UNCERTAIN)
 */
export function getFactCheckStatus(result) {
  if (result.startsWith("FACT-CHECK: OK")) return "OK";
  if (result.startsWith("FACT-CHECK: ISSUES FOUND")) return "ISSUES";
  if (result.startsWith("FACT-CHECK: MAJOR ISSUE")) return "MAJOR";
  if (result.startsWith("FACT-CHECK: UNCERTAIN")) return "UNCERTAIN";
  return "UNKNOWN";
}
