// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// /* ------------------------------------------------------------
//  * Utility: Clean Markdown (**bold**, *italic*) → <strong>/<em>
//  * ------------------------------------------------------------ */
// function cleanMarkdown(html) {
//   return html
//     .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
//     .replace(/\*(.+?)\*/g, "<em>$1</em>");
// }

// /* ------------------------------------------------------------
//  * Utility: Normalize the Did You Know? section
//  * - Cleans up list markup into <p> facts
//  * ------------------------------------------------------------ */
// function normalizeDidYouKnow(html) {
//   return html.replace(
//     /<h2>Did You Know\?<\/h2>([\s\S]*?)(?=<h2>|$)/,
//     (match, sectionContent) => {
//       let cleaned = sectionContent
//         // Remove list wrappers
//         .replace(/<\/?ul>|<\/?ol>/g, "")
//         // Convert any <li> to <p>
//         .replace(/<li>/g, "<p>")
//         .replace(/<\/li>/g, "</p>")
//         // Remove bullets, dashes, or numbering at line start
//         .replace(/^\s*([-•]|\d+\.)\s*/gm, "")
//         // If multiple facts end up on the same line: split after punctuation + number
//         .replace(/(\.)\s*(\d+\.)/g, "$1\n")
//         .trim();

//       const facts = cleaned
//         .split(/\n+/)
//         .map((f) => f.trim())
//         .filter(Boolean)
//         .map((f) => (f.startsWith("<p>") ? f : `<p>${f}</p>`));

//       return `<h2>Did You Know?</h2>\n${facts.join("\n")}\n`;
//     }
//   );
// }

// /**
//  * Kjør en redaksjonell forbedring på ferdig generert artikkel:
//  * 1. Forbedrer språk, rytme og flyt.
//  * 2. Legger til oppsummeringsboks (Quick Summary).
//  * 3. Legger til kildeseksjon nederst ("Sources & References").
//  * 4. Bevarer SEO-intensjon, WOW-faktor og spesiallinjer.
//  *
//  * @param {string} articleText Full HTML-artikkeltekst
//  * @param {string} title Artikkeltittel for kontekst
//  * @returns {Promise<string>} Refined artikkeltekst (samme format)
//  */
// export async function refineArticle(articleText, title) {
//   if (!articleText || articleText.length < 200) return articleText;

//   const refinePrompt = `
// You are a **senior editor** for *CurioWire*, a publication blending science,
// history, culture, products and curiosity into highly shareable, SEO-strong stories.

// Your job: **refine the article WITHOUT changing its factual content or structural intent**.
// You are polishing language, rhythm, clarity and emotional impact – not rewriting the story.

// =====================================================================
// 🔒 STRICT FACTUAL LOCKDOWN (NO FACT DRIFT)
// =====================================================================
// You MUST NOT introduce ANY new factual information.
// You MUST NOT:
// • Add new names, dates, locations, events, causes, or mechanisms
// • Remove any factual elements that are present
// • Generalize specific facts (e.g. “In 1942” → “In the 1940s”)
// • Make vague facts more specific (e.g. “some scientists” → “three scientists at MIT”)
// • Flip cause/effect or change the order of events
// • Infer missing details that are not explicitly stated
// • “Clarify” by inventing context, numbers, or attributions

// You may ONLY adjust phrasing, sentence structure and word choice.
// If you are uncertain whether a change affects meaning or factual precision,
// **keep the original wording**.

// =====================================================================
// 🎯 SEO & STRUCTURE SAFETY
// =====================================================================
// The article you receive was generated under strict SEO and category rules.

// You MUST:
// • Preserve the **core keywords and key phrases** already present in:
//   - the first paragraph (snippet potential)
//   - each <h2> subheadline
//   - any repeated concept terms throughout the article

// • You may lightly polish <h2> text for clarity and rhythm, but:
//   - Do NOT remove or replace the main topic nouns and key entities.
//   - Keep long-tail feel intact (no flattening into generic headings).

// • Do NOT:
//   - Introduce emojis, markdown, or new list structures (<ul>, <ol>, <li>).
//   - Add hashtags, links, or calls to action.
//   - Reframe the article into a new thematic domain (e.g. into health, politics, medicine, or psychology) if that was not already present.

// • Respect structure:
//   - Do NOT add or remove any <h2> elements.
//   - Do NOT move sections around.
//   - You may split or merge <p> blocks minimally for readability,
//     but the logical section order must stay identical.

// • In the <h2>Did You Know?</h2> section:
//   - You may polish individual sentences.
//   - Do NOT introduce lists or markdown.
//   - Prefer keeping exactly the same number of <p> facts that are already present.

// =====================================================================
// 🧷 CRITICAL LINES & PATTERNS TO PRESERVE VERBATIM
// =====================================================================
// If any of the following patterns exist in the article, you MUST copy them EXACTLY,
// without changing a single character (spacing and punctuation included):

// 1) The closing tagline:

//   “CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”

// If this sentence appears, do not change wording, punctuation, or dash type.

// 2) The affiliate product line (used in the PRODUCTS category):

//   A <p> paragraph beginning with:
//   [Product Name]:

// For that paragraph:
// • Do NOT change “[Product Name]:” label.
// • Do NOT add adjectives, commentary, or extra context.
// • Do NOT modify, rephrase, or translate the product name text.
// Copy the entire line exactly as it appears.

// =====================================================================
// 🔥 WOW PRESERVATION & MASS APPEAL
// =====================================================================
// CurioWire content is built around a **WOW-factor** and broad accessibility.

// You MUST:
// • Preserve the emotional punch and “astonishing yet true” reveals.
// • Maintain curiosity hooks and contrasts (ancient vs modern, tiny vs immense, etc.).
// • Keep language:
//   - clear and readable for a general audience
//   - rhythmic and vivid, but not purple or overly ornate
//   - optimized for mobile reading with mostly short sentences.

// You may:
// • Tighten wording to increase impact.
// • Remove redundancy or weak modifiers.
// • Make metaphors clearer, as long as they stay grounded in the text’s existing facts.

// You MUST NOT:
// • Tone down or neutralize the WOW-moments.
// • Replace surprising specific details with vague generalities.

// =====================================================================
// 🧭 EDITORIAL RULES (LANGUAGE ONLY)
// =====================================================================
// 1. Do not modify, remove, or reorder any <h2> tags.
// 2. Do not introduce new sections or headings.
// 3. Improve clarity, rhythm, and readability of existing <p> content.
// 4. Reduce redundancy and tighten phrasing.
// 5. Preserve all factual claims exactly (see factual lockdown).
// 6. Keep overall length within ±10% of the original articleText.
// 7. No emojis, no markdown, no inline links.

// =====================================================================
// STEP 1 — Refine Core Article (NO FACT CHANGES)
// =====================================================================
// Refine the existing HTML text according to all rules above.
// Return **only** the improved HTML (still using <h2> and <p>), no commentary.

// =====================================================================
// STEP 2 — Prepend “Quick Summary”
// =====================================================================
// After refining, prepend a “Quick Summary” section **before the first <h2>** tag.

// Use this format exactly:

// <div class="article-summary-box">
//   <strong>Quick Summary</strong>
//   <ul>
//     <li><b>What:</b> <span data-summary-what>1 factual sentence summarizing the central curiosity, event, or phenomenon.</span></li>
//     <li><b>Where:</b> [Location or environment, if relevant]</li>
//     <li><b>When:</b> [Time period or historical moment]</li>
//     <li><b>How:</b> [Mechanism, cause, or scientific principle already present in the article]</li>
//     <li><b>Why:</b> [Why it matters today, based ONLY on ideas already in the article]</li>
//   </ul>
// </div>

// Requirements for WHAT:
// • One neutral, factual sentence.
// • Do not generalize or invent new detail.
// • Must begin directly with the subject, not with meta-language
//   (“In ancient Mesopotamia…”, “Population III stars represent…”, etc.).
// • Must NOT mention “this article” or “this piece”.

// You may NOT invent new facts in the summary; it must only condense what already exists.

// =====================================================================
// STEP 3 — Add Sources Section
// =====================================================================
// At the very end of the article, after the final <p> block, append:

// <h2>Sources & References</h2>
// <ul>
//   <li>[Credible source 1 related to the topic — e.g. archive, journal, museum, space agency]</li>
//   <li>[Credible source 2 — secondary or contextual reference]</li>
//   <li>[Credible source 3 — optional, if naturally fitting]</li>
// </ul>

// The sources must be:
// • Plausible and thematically correct.
// • Generic but credible (no absurd or joke institutions).
// • Not tied to any specific URL or marketing.

// =====================================================================
// STYLE GUIDELINES
// =====================================================================
// Tone: factual, reflective, and engaging — like BBC Future, Vox, National Geographic + Atlas Obscura.
// Flow pattern: insight → image → emotion → reflection.
// Avoid:
// • Jargon where not needed
// • Repetitive phrasing
// • AI/self-reference of any kind

// Do NOT alter the <span data-summary-what> wrapper.
// Do NOT wrap the Quick Summary or its elements in additional containers.

// =====================================================================

// Title: "${title}"

// ARTICLE TO REFINE (HTML):
// ${articleText}

// Return ONLY the full, final HTML — including:
// - the new Quick Summary box,
// - the refined article body,
// - the Sources & References section.
// No explanations, no markdown, no extra commentary.
// `;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: refinePrompt }],
//       temperature: 0.4,
//     });

//     let refined = completion.choices[0]?.message?.content?.trim() || "";

//     // 🔧 CLEAN MARKDOWN → HTML if model sneaks in ** or *
//     refined = cleanMarkdown(refined);

//     // 🔧 NORMALIZE DID YOU KNOW? (convert lists → <p> facts)
//     refined = normalizeDidYouKnow(refined);

//     console.log("🧹 Refine-pass complete (FACT-LOCK + SEO-SAFE + WOW-SAFE) ✅");
//     return refined;
//   } catch (err) {
//     console.warn("⚠️ Refine-pass failed:", err.message);
//     return articleText; // fallback til original
//   }
// }
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

/* ------------------------------------------------------------
 * Utility: Clean Markdown (**bold**, *italic*) → <strong>/<em>
 * ------------------------------------------------------------ */
function cleanMarkdown(html) {
  return html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/* ------------------------------------------------------------
 * Utility: Normalize the Did You Know? section
 * ------------------------------------------------------------ */
function normalizeDidYouKnow(html) {
  return html.replace(
    /<h2>Did You Know\?<\/h2>([\s\S]*?)(?=<h2>|$)/,
    (match, sectionContent) => {
      let cleaned = sectionContent
        .replace(/<\/?ul>|<\/?ol>/g, "")
        .replace(/<li>/g, "<p>")
        .replace(/<\/li>/g, "</p>")
        .replace(/^\s*([-•]|\d+\.)\s*/gm, "")
        .replace(/(\.)\s*(\d+\.)/g, "$1\n")
        .trim();

      const facts = cleaned
        .split(/\n+/)
        .map((f) => f.trim())
        .filter(Boolean)
        .map((f) => (f.startsWith("<p>") ? f : `<p>${f}</p>`));

      return `<h2>Did You Know?</h2>\n${facts.join("\n")}\n`;
    }
  );
}

/* ------------------------------------------------------------
 * MAIN: refineArticle
 * ------------------------------------------------------------ */
export async function refineArticle(articleText, title) {
  if (!articleText || articleText.length < 200) return articleText;

  const refinePrompt = `
You are a **senior editor** for *CurioWire*, working under the Frontier Realism mandate:
high-density factual wonder, frontier-level science/culture/history, strong rhythm, 
and absolute factual safety.

Your task: **refine the article WITHOUT changing meaning, facts, structure, or length profile**.

Your edits focus on:
• clarity  
• flow  
• rhythm  
• eliminating true redundancy  
• strengthening transitions  
• preserving vivid frontier realism language  

DO NOT shorten the article unless:
• a sentence is pure repetition  
• two sentences express the same idea identically  
• the removed text does NOT reduce meaning  

DO NOT expand the article unless:
• the original sentence is unclear  
• improved flow requires microscopic clarification  
• expansion stays within the article’s established facts  
Any added text must be **value-adding and fact-neutral**.

=====================================================================
🔒 STRICT FACTUAL LOCKDOWN (NO FACT DRIFT)
=====================================================================
You MUST NOT introduce ANY new factual information.

Forbidden:
• new names, dates, mechanisms, events  
• invented clarity  
• implying new causes  
• adding scientific context not already in the article  
• merging vague sentences into more specific ones with new facts  

If uncertain: **do NOT change the factual sentence**.

=====================================================================
🌋 FRONTIER REALISM PRESERVATION
=====================================================================
CurioWire operates in the factual frontier zone:
rare phenomena, overlooked mechanisms, emerging research, unusual truths.

You MUST:
• preserve intensity and strangeness  
• preserve emotionally striking contrasts  
• preserve every unusual detail exactly  
• preserve the tone of scientific awe  

You MAY:
• polish language  
• improve pacing  
• avoid softening or mainstreaming rare facts  

NEVER:
• weaken the strange  
• dilute the sense of discovery  
• tone down the frontier aspects  

=====================================================================
🎯 HIGH INFORMATION DENSITY RULE
=====================================================================
Every paragraph must contain at least one of:
• a concrete factual detail  
• a meaningful conceptual insight  
• a narrative transition with purpose  
• an emotional pivot grounded in reality  

Remove ONLY sentences that contain:
• no factual value  
• no conceptual insight  
• no emotional or structural relevance  

=====================================================================
🎯 SEO & STRUCTURE SAFETY
=====================================================================
• preserve keywords  
• preserve long-tail phrasing  
• preserve all <h2> tags exactly  
• do NOT alter category framing  
• keep length within ±10%  

No:
• emojis  
• markdown  
• CTAs  
• hyperlinks  
• hashtag changes  

=====================================================================
🧷 CRITICAL LINES TO PRESERVE VERBATIM
=====================================================================
1) The closing tagline:
“CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”

2) Product appendix lines beginning with:
[Product Name]:

These lines must be preserved EXACTLY.

=====================================================================
STEP 1 — REFINE CORE ARTICLE
=====================================================================
Return the improved HTML — same structure, same factual content,
same thematic direction, but with better rhythm, flow, density,
and purified frontier realism clarity.

=====================================================================
STEP 2 — ADD “Quick Summary” BEFORE FIRST <h2>
=====================================================================

<div class="article-summary-box">
  <strong>Quick Summary</strong>
  <ul>
    <li><b>What:</b> <span data-summary-what>1 factual sentence summarizing the central curiosity, event, or phenomenon.</span></li>
    <li><b>Where:</b> [Location or environment, if relevant]</li>
    <li><b>When:</b> [Time period or historical moment]</li>
    <li><b>How:</b> [Mechanism or principle explicitly stated in the article]</li>
    <li><b>Why:</b> [Why it matters, based ONLY on ideas in the article]</li>
  </ul>
</div>

Rules:
• NO new facts  
• WHAT must begin directly with the subject  
• Keep summary tight but meaningful  

IMPORTANT:
The WHAT line MUST always contain this wrapper:
<span data-summary-what> ... </span>

Do NOT remove, replace, paraphrase, or omit this span wrapper.
It is required for downstream components.
If the input article does not include it, you MUST generate it.

=====================================================================
STEP 3 — ADD SOURCES SECTION
=====================================================================

<h2>Sources & References</h2>
<ul>
  <li>[Credible thematic source — archive, journal, museum, research body]</li>
  <li>[Secondary contextual source]</li>
  <li>[Optional tertiary source]</li>
</ul>

Sources must be:
• plausible  
• generic descriptors (no URLs)  
• not invented with excessive specificity  

=====================================================================
STYLE RULES
=====================================================================
Tone: vivid, reflective, frontier-realism factuality  
Flow: insight → image → tension → resolution → wonder  
No jargon unless already present  
No text simplification that reduces density  
No generic filler language  
No AI references  

=====================================================================

Title: "${title}"

ARTICLE TO REFINE (HTML):
${articleText}

Return ONLY the final HTML, containing:
• Quick Summary  
• refined article  
• Sources section  
No commentary.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: refinePrompt }],
      temperature: 0.4,
    });

    let refined = completion.choices[0]?.message?.content?.trim() || "";

    // Clean stray markdown
    refined = cleanMarkdown(refined);

    // Normalize the Did You Know? section
    refined = normalizeDidYouKnow(refined);

    console.log(
      "🧹 Refine-pass complete (FRONTIER-SAFE + FACT-LOCKED + FLOW-OPTIMIZED) ✅"
    );
    return refined;
  } catch (err) {
    console.warn("⚠️ Refine-pass failed:", err.message);
    return articleText;
  }
}
