// ============================================================================
// app/api/utils/quoteFactCheckPackage.js — CurioWire QUOTES
// Goal:
// Strict fact-check pass for quote-centered articles.
//
// This pass should:
// - fail the package if the core quote premise is wrong
// - minimally correct wording, attribution, or context if safely possible
// - preserve style and structure as much as possible
//
// Output labels expected by generateQuoteArticle.js:
// Verdict:
// Reason:
// QuoteText:
// Title:
// Card:
// VideoScript:
// Summary:
// FunFact:
// ============================================================================

export function buildQuoteFactCheckPackagePrompt({
  quote_text,
  speaker,
  quote_context,
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are a strict fact checker for a quote-centered article package.

TASK (DECISION FIRST)

The CORE PREMISE of this package is:
- that this quote is real or defensibly represented,
- that it is correctly attributed to this speaker,
- that the historical/public context is broadly correct,
- and that the article is still about THIS quote story.

If the core premise is false, misleading, misattributed, or too unstable to defend, return FAIL_PREMISE.

If the quote can be minimally corrected while preserving the SAME quote story, return PASS and make the minimum necessary edits.

"SAME quote story" means:
- same speaker
- same famous quote or defensible standard short form
- same historical/public moment
- same reason the quote is remembered

FAIL_PREMISE if:
- the quote is fake
- the quote is commonly misattributed and not defensible here
- the wording changes would effectively make it a different quote
- the context is materially wrong and correcting it would change the story
- the article overstates certainty about a disputed or unstable quote in a way that cannot be fixed minimally

PASS with edits if:
- the quote needs small normalization
- the wording should be softened or clarified
- the context needs light tightening
- exactness is risky and should be phrased more carefully

EDIT RULES (MINIMUM EDITS ONLY)

- If a claim is demonstrably false, you MUST correct it or FAIL_PREMISE.
- If a claim uses risky precision you cannot strongly support, you MUST soften it.
- Preserve the same structure and general writing style.
- Do NOT invent facts.
- Do NOT add unsupported dates, locations, reactions, or transcript details.
- Do NOT rewrite for tone.
- Do NOT remove or reorder existing <h2> or <p> blocks.
- Do NOT remove the quote-centered focus.

QUOTE RULES

- The quote text may be kept if it is a defensible commonly cited form.
- If a shorter or slightly normalized form is safer, use it.
- Do NOT replace the quote with a different quote by the same speaker.
- Do NOT claim exact wording certainty unless highly defensible.
- If needed, the article may use careful language such as:
  "often quoted as"
  "widely remembered as"
  "commonly rendered as"
  but only where necessary.

VIDEO SCRIPT RULE

- The VideoScript must still explicitly say the quote itself or the defensibly normalized form of it.
- Do not remove the quote from the script.

SUMMARY RULES

- Keep the existing <ul> structure.
- Keep the existing <span data-summary-*> attributes.
- Only edit the text inside them if needed for factual correction.

FUN FACT RULES

- Keep <p></p> if empty.
- Remove or correct any unsupported extra fact.
- If the fun fact cannot be defended, return <p></p>.

INPUT

QuoteText:
${safe(quote_text)}

Speaker:
${safe(speaker)}

QuoteContext:
${safe(quote_context)}

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

QuoteText:
[quote text only, no HTML, no quotation marks]

Title:
[title text only, no HTML]

Card:
[HTML; preserve existing <h2> and <p> blocks exactly; edit text inside only if needed]

VideoScript:
[HTML; preserve <p> blocks exactly; edit text inside only if needed]

Summary:
[HTML; keep the <ul> structure and <span data-summary-*> attributes]

FunFact:
[HTML <p>...</p> OR empty <p></p>]

DO NOT add anything else.
`.trim();
}
