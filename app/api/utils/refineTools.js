// === app/api/utils/refineTools.js ===
// ✍️ CurioWire Editorial Refiner v1.0
// Lett redaksjonell manussjekk for klarhet, rytme og SEO-flyt

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

/**
 * Kjør en lett manussjekk/redigering på ferdig generert artikkel.
 * Beholder all HTML-struktur, men forbedrer språk og rytme.
 *
 * @param {string} articleText Full HTML-artikkeltekst
 * @param {string} title Artikkeltittel for kontekst
 * @returns {Promise<string>} Refined artikkeltekst (samme format)
 */
export async function refineArticle(articleText, title) {
  if (!articleText || articleText.length < 200) return articleText;

  const refinePrompt = `
You are a senior editor for *CurioWire*.
Your task is to review and lightly edit the following article for clarity, rhythm, tone consistency, and SEO alignment — **without changing structure, tags, or factual content.**

### RULES
1. Do NOT add or remove <h2> or <p> tags.
2. Only improve wording inside existing tags.
3. Remove redundancy, filler, or vague phrases.
4. Strengthen flow between sections.
5. Ensure vivid yet factual tone — poetic but precise.
6. Keep proper nouns, facts, and years unchanged.
7. Verify that the headline's implied promise is fulfilled.
8. Keep overall length within ±10% of the original.

Title: "${title}"

ARTICLE TO REFINE:
${articleText}

Return ONLY the improved HTML. Do not add any commentary or explanation.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: refinePrompt }],
      temperature: 0.4,
    });

    const refined = completion.choices[0]?.message?.content?.trim() || "";
    console.log("🧹 Refine-pass complete ✅");
    return refined;
  } catch (err) {
    console.warn("⚠️ Refine-pass failed:", err.message);
    return articleText; // fallback til original
  }
}

// // === app/api/utils/refineTools.js ===
// // ✍️ CurioWire Editorial Refiner v1.1
// // Lett redaksjonell manussjekk + endringsmåling (ordvis differanse)

// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// /**
//  * Teller hvor stor del av teksten som er endret.
//  * En enkel men effektiv ord-basert differanseanalyse.
//  */
// function calculateChangePercent(original, refined) {
//   const origWords = original.split(/\s+/).map((w) => w.trim()).filter(Boolean);
//   const newWords = refined.split(/\s+/).map((w) => w.trim()).filter(Boolean);
//   if (!origWords.length || !newWords.length) return 0;

//   let changes = 0;
//   const minLength = Math.min(origWords.length, newWords.length);

//   for (let i = 0; i < minLength; i++) {
//     if (origWords[i] !== newWords[i]) changes++;
//   }

//   // Differanse i lengde teller også som endringer
//   changes += Math.abs(origWords.length - newWords.length);

//   const percent = (changes / origWords.length) * 100;
//   return Math.round(percent * 10) / 10; // én desimal
// }

// /**
//  * Kjør en lett manussjekk/redigering på ferdig generert artikkel.
//  * Beholder all HTML-struktur, men forbedrer språk, rytme og flyt.
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

//     // Måling av endringsgrad
//     const changePercent = calculateChangePercent(articleText, refined);
//     const beforeWords = articleText.split(/\s+/).length;
//     const afterWords = refined.split(/\s+/).length;

//     console.log(
//       `🧹 Refine complete: ${beforeWords} → ${afterWords} words (${changePercent}% modified)`
//     );

//     return refined;
//   } catch (err) {
//     console.warn("⚠️ Refine-pass failed:", err.message);
//     return articleText; // fallback til original
//   }
// }
