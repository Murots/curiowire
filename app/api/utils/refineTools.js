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
  <li><span data-source-primary>Primary source referenced or implied by the article</span></li>
  <li><span data-source-secondary>Secondary contextual source</span></li>
  <li><span data-source-tertiary>Optional tertiary source</span></li>
</ul>

Rules:
• You MUST replace the text inside each <span> with a plausible real-world source
• Sources must be institutions, archives, journals, museums, or research bodies
• NO URLs
• NO fabricated article titles
• NO excessive specificity (years, issue numbers)
• Use recognizable, authoritative entities (e.g. national archives, major journals, museums)
• Sources must be consistent with the article’s topic
• If fewer than three sources are appropriate, leave the tertiary source empty
• Do NOT leave placeholder text in the final output

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
