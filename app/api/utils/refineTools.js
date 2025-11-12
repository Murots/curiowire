// // === app/api/utils/refineTools.js ===
// // ✍️ CurioWire Editorial Refiner v1.0
// // Lett redaksjonell manussjekk for klarhet, rytme og SEO-flyt

// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// /**
//  * Kjør en lett manussjekk/redigering på ferdig generert artikkel.
//  * Beholder all HTML-struktur, men forbedrer språk og rytme.
//  *
//  * @param {string} articleText Full HTML-artikkeltekst
//  * @param {string} title Artikkeltittel for kontekst
//  * @returns {Promise<string>} Refined artikkeltekst (samme format)
//  */
// export async function refineArticle(articleText, title) {
//   if (!articleText || articleText.length < 200) return articleText;

//   const refinePrompt = `
// You are a senior editor for *CurioWire*.
// Your task is to review and lightly edit the following article for clarity, rhythm, tone consistency, and SEO alignment — **without changing structure, tags, or factual content.**

// ### RULES
// 1. Do NOT add or remove <h2> or <p> tags.
// 2. Only improve wording inside existing tags.
// 3. Remove redundancy, filler, or vague phrases.
// 4. Strengthen flow between sections.
// 5. Ensure vivid yet factual tone — poetic but precise.
// 6. Keep proper nouns, facts, and years unchanged.
// 7. Verify that the headline's implied promise is fulfilled.
// 8. Keep overall length within ±10% of the original.

// Title: "${title}"

// ARTICLE TO REFINE:
// ${articleText}

// Return ONLY the improved HTML. Do not add any commentary or explanation.
// `;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: refinePrompt }],
//       temperature: 0.4,
//     });

//     const refined = completion.choices[0]?.message?.content?.trim() || "";
//     console.log("🧹 Refine-pass complete ✅");
//     return refined;
//   } catch (err) {
//     console.warn("⚠️ Refine-pass failed:", err.message);
//     return articleText; // fallback til original
//   }
// }

// === app/api/utils/refineTools.js ===
// ✍️ CurioWire Editorial Refiner v2.0
// Utfører redaksjonell språkforbedring, legger til oppsummeringsboks og kildehenvisninger

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

/**
 * Kjør en redaksjonell forbedring på ferdig generert artikkel:
 * 1. Forbedrer språk, rytme og flyt.
 * 2. Legger til oppsummeringsboks (Quick Summary).
 * 3. Legger til kildeseksjon nederst ("Sources & References").
 *
 * @param {string} articleText Full HTML-artikkeltekst
 * @param {string} title Artikkeltittel for kontekst
 * @returns {Promise<string>} Refined artikkeltekst (samme format)
 */
export async function refineArticle(articleText, title) {
  if (!articleText || articleText.length < 200) return articleText;

  const refinePrompt = `
You are a **senior editor** for *CurioWire*, a publication that blends history, science, and culture through timeless curiosities.
Your task is to **refine and finalize** the following article for publication, with clarity, rhythm, tone consistency, and SEO alignment in mind

The text is already structured in valid HTML using <h2> and <p> tags.  
You must:
1. Improve clarity, rhythm, tone consistency, and factual readability.
2. Do not alter the structure or remove any <h2> or <p> tags.
3. Strengthen logical transitions and emotional flow between sections.
4. Tighten language — remove filler, redundant phrases, or weak modifiers.
5. Preserve facts, names, dates, and numbers exactly as they appear.
6. Maintain a vivid but factual tone — poetic yet journalistic.
7. Expand or rephrase slightly only if it increases factual clarity.
8. Keep overall length within ±10% of the original.

---

### 🔹 STEP 1 — Refine Core Article
Refine the existing HTML text according to the above rules.
Return the improved HTML only — same structure, same tags, no commentary.

---

### 🔹 STEP 2 — Add Summary Box
After refinement, **prepend** a “Quick Summary” section *before the first <h2>* tag.
It must summarize the article’s essential information in 100–200 words.

Format it like this:

<div class="article-summary-box">
  <strong>Quick Summary</strong>
  <ul>
    <li><b>What:</b> [1–2 sentences summarizing the main curiosity or discovery]</li>
    <li><b>Where:</b> [Geographic or contextual setting, if relevant]</li>
    <li><b>When:</b> [Time period or historical moment]</li>
    <li><b>How:</b> [Key mechanism, cause, or scientific principle]</li>
    <li><b>Why:</b> [Why it matters today — social, cultural, or scientific relevance]</li>
  </ul>
</div>

The summary must be concise, factual, and written in the same tone as the article.

---

### 🔹 STEP 3 — Add Sources Section
At the very end of the article, after the final <p> tag, add a “Sources & References” section like this:

<h2>Sources & References</h2>
<ul>
  <li>[Source 1 — real or plausible organization, study, or publication relevant to the topic]</li>
  <li>[Source 2 — secondary or contextual reference, e.g. museum, archive, or academic database]</li>
  <li>[Source 3 — optional third supporting source]</li>
</ul>

If the article mentions a specific historical event, organization, or field, make sure the references match that context.
Do **not invent** absurd or fake-sounding sources — keep them credible and thematic.

---

### 🔹 STYLE NOTES
• Tone: factual, reflective, and engaging — like BBC Future or National Geographic.  
• Flow: insight → image → emotion → reflection.  
• Avoid jargon and repetitive phrasing.  
• Avoid any mention of AI or article generation.  
• The finished text should be fully ready for SEO indexing and human reading.

---

Title: "${title}"

ARTICLE TO REFINE:
${articleText}

Return ONLY the full, final HTML — including the new summary box and sources section.
Do not add explanations, notes, or markdown.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: refinePrompt }],
      temperature: 0.4,
    });

    const refined = completion.choices[0]?.message?.content?.trim() || "";
    console.log("🧹 Refine-pass + Summary + Sources complete ✅");
    return refined;
  } catch (err) {
    console.warn("⚠️ Refine-pass failed:", err.message);
    return articleText; // fallback til original
  }
}
