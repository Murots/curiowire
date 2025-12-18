// // ============================================================================
// // CurioWire — seedConceptGenerator.js (A3 — FRONTIER REALISM MODEL)
// // v3.0 — REALITY-FIRST, ULTRA-WOW CONCEPTS
// // Now includes:
// // • Mandatory one-word chaos seeds (unchanged API)
// // • Category-aware, frontier-realism concept generator
// // • Hard avoidance of overbrukte “AI curiosity clichés” (Roman concrete, etc.)
// // • Strong factual grounding — ingen ren fantasi
// // • Variasjon mellom konsepter innen samme kategori
// // ============================================================================

// import OpenAI from "openai";
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// import { CATEGORY_DEFINITIONS } from "../../app/api/utils/categoryDefinitions.js";

// // ============================================================================
// // MAIN EXPORT: generateConceptSeeds(category)
// // ============================================================================
// export async function generateConceptSeeds(category) {
//   try {
//     console.log(`\n=== [CONCEPT SEEDING: ${category.toUpperCase()}] ===`);

//     // STEP 1 — Generate 30 chaos seeds
//     let seedWords = await generateChaosSeeds(category);

//     // Filter out multiword seeds (failsafe)
//     const before = seedWords.length;
//     seedWords = seedWords.filter((w) => !w.includes(" "));
//     const after = seedWords.length;

//     if (before !== after) {
//       console.warn(
//         `🚫 Filtered out ${before - after} invalid multi-word seeds.`
//       );
//     }

//     // If GPT still returned garbage, regenerate
//     if (seedWords.length < 10) {
//       console.warn(
//         "⚠️ Too few valid seeds → regenerating via fallback GPT cleanup…"
//       );
//       seedWords = await regenerateOneWordSeeds(seedWords);
//     }

//     if (!seedWords.length) {
//       console.warn("⚠️ Chaos seed final fail → using fallback concepts");
//       return generateFallbackConcepts(category);
//     }

//     // STEP 2 — Pick 3 random seeds
//     const randomSeeds = shuffle(seedWords).slice(0, 3);
//     console.log(`[SEEDS PICKED] ${category}: ${randomSeeds.join(", ")}`);

//     // STEP 3 — Build and run WOW concept generator (frontier realism)
//     const conceptPrompt = buildConceptPrompt(category, randomSeeds);

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: conceptPrompt }],
//     });

//     const raw = completion.choices?.[0]?.message?.content || "";
//     const ideas = extractList(raw);

//     if (!ideas.length) {
//       console.warn(`⚠️ Empty concept list for ${category} → fallback`);
//       return generateFallbackConcepts(category);
//     }

//     console.log(`[CONCEPTS RETURNED] ${ideas.length} items for ${category}`);

//     // Vi returnerer maks 5, som før
//     return ideas.slice(0, 5);
//   } catch (err) {
//     console.error("💥 Full chaos concept generation failed:", err.message);
//     return generateFallbackConcepts(category);
//   }
// }

// // ============================================================================
// // STEP 1 — 30 abstract, chaotic seed words (strictly one-word)
// // ============================================================================
// async function generateChaosSeeds(category) {
//   const chaosPrompt = `
// Generate exactly **100 SINGLE-WORD “viral curiosity seeds”**.

// Each word must:
// • Be ONE single English word.
// • Contain emotional or visual tension (mystery, contrast, discovery, risk, decay, rupture, anomaly).
// • Be broad enough to inspire ANY real-world frontier-curiosity article.
// • NOT be a factual claim.
// • NOT be scientific jargon.
// • NOT be a category-specific word (no physics-only terms, no biology-only terms).
// • NOT repeat examples from the prompt.
// • NOT be synonyms of each other.
// • NOT cluster around the same theme.

// Think in the style of TikTok hooks:
// • “Vanish”
// • “Pulse”
// • “Outlier”
// • “Threshold”
// • “Archive”

// Stylistic requirement:
// Words must maximize DIVERSITY.
// Use wide semantic range:
// • geological
// • cosmic
// • psychological
// • mechanical
// • archaeological
// • atmospheric
// • evolutionary
// • temporal
// • sensory
// • symbolic
// • structural

// Forbidden:
// • repeated themes
// • synonyms
// • poetic nonsense words
// • invented jargon
// • more than one word

// Return ONLY a bullet list.
// Exactly 100 lines.
// Each line: one bullet, one word, nothing else.

// Start now.
// `;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: chaosPrompt }],
//     });

//     return extractWordList(completion.choices[0].message.content);
//   } catch (err) {
//     console.error("❌ Chaos seed generation failed:", err.message);
//     return [];
//   }
// }

// // ============================================================================
// // SECONDARY CLEANUP — regenerate seeds if too many invalid
// // ============================================================================
// async function regenerateOneWordSeeds(previousWords) {
//   const prompt = `
// Fix this list of seed words by returning **ONLY valid one-word abstract seeds**.

// Rules:
// • One single English word only
// • No spaces, no hyphens
// • No numbers
// • No category-related terms
// • No concrete nouns
// • Abstract, varied, metaphorical

// Here are the problematic seeds:
// ${previousWords.join(", ")}

// Return a bullet list of **30 correct one-word seeds**.
// `;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//     });

//     return extractWordList(completion.choices[0].message.content);
//   } catch {
//     return [];
//   }
// }

// // ============================================================================
// // STEP 2 — WOW CONCEPT PROMPT (FRONTIER REALISM)
// // ============================================================================
// function buildConceptPrompt(category, seeds) {
//   return `
// You are generating **5 ultra-wow, mass-appeal curiosity concepts**
// for category: **${category.toUpperCase()}**.

// The concept MUST fit this category definition:
// "${CATEGORY_DEFINITIONS[category]}"

// ====================================================================
// FRONTIER REALISM CONSTRAINT (CRITICAL)
// ====================================================================
// You are NOT allowed to invent impossible phenomena.

// Every concept MUST:
// • Be grounded in **real-world, verifiable domains**:
//   - real scientific fields, real types of organisms, real materials
//   - real kinds of astronomical objects, real geological processes
//   - real historical periods, real kinds of artifacts or records
// • Highlight **strange, under-discussed, or counterintuitive aspects** of reality,
//   NOT pure fantasy.

// Allowed:
// • Genuine mysteries and frontiers:
//   - phenomena that are observed but not fully explained
//   - research questions still being debated
//   - rare or extreme edge cases in nature, history, or technology
// • Careful language:
//   - “records suggest…”
//   - “some researchers propose…”
//   - “data hints that…”
//   - “one study reports…”

// Not allowed:
// • Violations of fundamental laws without strong real precedent:
//   - forests thriving forever without any energy source
//   - humans naturally living for centuries
//   - macroscopic objects defying gravity
//   - matter spontaneously appearing from nowhere
// • Explicitly fictional or supernatural entities:
//   - ghosts, demons, angels, curses, magic
//   - alien interventions presented as factual
// • Entirely invented civilizations, planets, or materials.

// If an idea would require rewriting basic physics, chemistry, or biology,
// you MUST discard it and choose a more realistic frontier phenomenon instead.

// ====================================================================
// HARD AVOID LIST — DO NOT USE THESE OR CLOSE VARIANTS
// ====================================================================
// You MUST NOT base any concept on the following overused curiosities
// or their direct analogues. If your idea is “basically the same thing
// with slightly different words”, discard it and try again.

// Forbidden example topics:
// • Roman concrete durability and its volcanic ash mix
// • The Antikythera mechanism as “the first computer”
// • The Voynich manuscript as an uncracked code
// • Tardigrades surviving in space or extreme conditions
// • “Bananas are berries, strawberries are not”
// • “Tomatoes are fruits but used as vegetables”
// • The 52-hertz “lonely whale”
// • Pyramids aligned with stars / Orion / solstices
// • Nazca lines viewed from above
// • Library of Alexandria burning and lost knowledge
// • “You are made of stardust” / gold from supernovae
// • The immortal jellyfish (Turritopsis dohrnii)
// • “There are more trees on Earth than stars in the galaxy”
// • The placebo effect in generic form
// • The Mandela effect / false memory lists
// • Déjà vu described in a generic psychological way

// If a concept feels like something that frequently appears on
// “top 10 mind-blowing facts” lists, you MUST discard it and
// generate a rarer, more niche phenomenon instead.

// ====================================================================
// WOW-FACTOR REQUIREMENTS (WITH REALITY)
// ====================================================================
// Each concept MUST use at least one:
// • Forbidden contrast — two things that “should not” be related, but are,
//   in a real, documented way.
// • Unexpected survival — something tiny, fragile, or overlooked that
//   leaves a massive long-term trace in data, rocks, genomes, archives, or space.
// • Sudden reversal — what people assume is true turns out to be
//   the opposite once you look at the evidence.
// • Lost-and-found mystery — a real artifact, dataset, or natural signal
//   discovered, forgotten, then rediscovered with new meaning.
// • Unlikely chain reaction — a small real cause leading to large,
//   documented consequences (ecological, historical, technological, or social).

// The goal: **“No way… and yet this is real.”**

// ====================================================================
// META-VARIATION REQUIREMENTS (INSIDE THE CATEGORY)
// ====================================================================
// Across the 5 concepts:

// • Each concept must explore a DISTINCT thematic domain inside the category.
//   - Do not reuse the same kind of organism, mechanism, or historical era.
//   - Do not reuse the same narrative structure (“lost → rediscovered”)
//     more than twice, and never in an identical way.

// • Maximize semantic distance between all 5 concepts.
//   They must feel unrelated in imagery, premise, and underlying logic.

// • Favor:
//   - edge cases
//   - deep-time signals
//   - marginal ecosystems
//   - obscure historical episodes
//   - niche subfields of research

// • Avoid:
//   - textbook examples
//   - standard listicle curiosities
//   - phenomena that appear frequently in popular science explainers.

// If ANY two concepts feel similar in structure, theme, domain, mechanism,
// or imagery, you MUST discard the weaker one and regenerate until all 5
// are maximally distinct.

// ====================================================================
// FACTUALITY REQUIREMENT (FRONTIER REALISM VERSION)
// ====================================================================
// • Concepts must be **compatible with a fact-based curiosity article**.
// • You may involve:
//   - unsolved puzzles
//   - competing hypotheses
//   - partial or noisy data
//   as long as you describe them cautiously and do not present speculation as fact.

// • You MUST:
//   - Anchor each concept to at least one real class of thing:
//     • a type of organism, ecosystem, rock, signal, device, archive,
//       archaeological layer, instrument, or dataset
//   - Make it clear that the phenomenon is known or studied in reality,
//     even if not fully understood.

// • You MUST NOT:
//   - Invent a brand-new type of lifeform that fundamentally breaks biology.
//   - Claim that well-known impossibilities (like perpetual motion)
//     are confirmed facts.
//   - Fabricate very specific named institutions, labs, or missions
//     that do not exist; instead, refer generically:
//     “one research team”, “a long-running observatory project”, etc.

// Safe phrasing examples:
// • “In a little-known sediment core, researchers found…”
// • “Geneticists working with archived samples noticed…”
// • “A long-term observatory record reveals an odd pattern where…”
// • “Deep cave surveys uncovered an ecosystem where…”

// ====================================================================
// CATEGORY ALIGNMENT
// ====================================================================
// All 5 concepts MUST clearly belong to the category:
// ${category.toUpperCase()} — defined as:
// "${CATEGORY_DEFINITIONS[category]}"

// They must NOT drift into other categories
// (e.g., pure geopolitics inside science, or pure tech inside history)
// unless the category definition explicitly allows it.

// ====================================================================
// USE OF SEED WORDS
// ====================================================================
// Use the three seed words only as hidden semantic inspiration —
// they should influence:
// • tone
// • contrast
// • imagery
// • type of curiosity

// The concepts do NOT need to mention the seeds explicitly.
// Seeds: ${seeds.join(", ")}

// ====================================================================
// STRUCTURE REQUIREMENT (ALL CATEGORIES)
// ====================================================================
// Each concept MUST be exactly **two sentences**.

// For EACH concept:
// • Sentence 1:
//   - Start with a vivid, surprising image or situation rooted in
//     a real type of place, organism, artifact, dataset, or mechanism.

// • Sentence 2:
//   - Reveal the factual anchor that makes the curiosity real.
//   - Explicitly tie it to observation, measurement, records, or research,
//     using formulations like:
//     “scientists studying X have documented…”
//     “long-term records show…”
//     “archaeological surveys reveal…”
//     “genetic analysis indicates…”

// Do NOT write titles or fragments.
// Do NOT use bullet points, headings, or numbering inside the concepts.

// ====================================================================
// FORMAT:
// Return ONLY a bullet list of 5 concepts.
// Each concept must be **exactly two sentences**.
// No extra commentary.
// Start now.
// `;
// }

// // ============================================================================
// // HELPERS
// // ============================================================================
// function extractList(text) {
//   if (!text) return [];
//   return text
//     .split("\n")
//     .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
//     .filter((l) => l.length > 20);
// }

// function extractWordList(text) {
//   if (!text) return [];
//   return text
//     .split("\n")
//     .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
//     .map((l) => l.toLowerCase())
//     .map((l) => l.replace(/[^a-z]/g, "")) // removes any non-letter
//     .filter((l) => l.length >= 3 && l.length <= 20)
//     .filter((l) => !l.includes(" ")); // ABSOLUTE SINGLE-WORD GUARANTEE
// }

// function shuffle(arr) {
//   return [...arr].sort(() => Math.random() - 0.5);
// }

// // ============================================================================
// // FALLBACK
// // ============================================================================
// function generateFallbackConcepts(category) {
//   return [
//     `A forgotten discovery reshaping our modern understanding of ${category}.`,
//     `A paradox in ${category} that challenges assumptions.`,
//     `A natural mechanism in ${category} that behaves opposite of what people believe.`,
//     `A timeline twist in the history of ${category}.`,
//     `A hidden connection between two unrelated phenomena in ${category}.`,
//   ];
// }
// ============================================================================
// CurioWire — seedConceptGenerator.js (A3 — FRONTIER REALISM MODEL)
// v3.0 — REALITY-FIRST, ULTRA-WOW CONCEPTS
// Now includes:
// • Mandatory one-word chaos seeds (unchanged API)
// • Category-aware, frontier-realism concept generator
// • Hard avoidance of overbrukte “AI curiosity clichés” (Roman concrete, etc.)
// • Strong factual grounding — ingen ren fantasi
// • Variasjon mellom konsepter innen samme kategori
// ============================================================================

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

import { CATEGORY_DEFINITIONS } from "../../app/api/utils/categoryDefinitions.js";
import { selectAxes } from "./selectAxes.js";

// ============================================================================
// MAIN EXPORT: generateConceptSeeds(category)
// ============================================================================

export async function generateConceptSeeds(category) {
  try {
    console.log(`\n=== [CONCEPT SEEDING: ${category.toUpperCase()}] ===`);

    // ------------------------------------------------------------------------
    // STEP 0 — Select curiosity axes (NEW, ADDITIVE)
    // ------------------------------------------------------------------------
    const axes = await selectAxes({
      category,
      count: 5,
      cooldownHours: 24,
    });

    if (axes.length) {
      console.log(
        `🧭 Axes selected:\n${axes.map((a) => "• " + a.axis).join("\n")}`
      );
    } else {
      console.warn(
        "⚠️ No axes available — proceeding without axis constraints"
      );
    }

    // STEP 1 — Generate 30 chaos seeds
    let seedWords = await generateChaosSeeds(category);

    // Filter out multiword seeds (failsafe)
    const before = seedWords.length;
    seedWords = seedWords.filter((w) => !w.includes(" "));
    const after = seedWords.length;

    if (before !== after) {
      console.warn(
        `🚫 Filtered out ${before - after} invalid multi-word seeds.`
      );
    }

    // If GPT still returned garbage, regenerate
    if (seedWords.length < 10) {
      console.warn(
        "⚠️ Too few valid seeds → regenerating via fallback GPT cleanup…"
      );
      seedWords = await regenerateOneWordSeeds(seedWords);
    }

    if (!seedWords.length) {
      console.warn("⚠️ Chaos seed final fail → using fallback concepts");
      return generateFallbackConcepts(category);
    }

    // STEP 2 — Pick 3 random UNIQUE seeds
    const randomSeeds = [...new Set(shuffle(seedWords))].slice(0, 3);
    console.log(`[SEEDS PICKED] ${category}: ${randomSeeds.join(", ")}`);

    // STEP 3 — Build and run WOW concept generator (frontier realism)
    const conceptPrompt = buildConceptPrompt(category, randomSeeds, axes);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: conceptPrompt }],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    let ideas;

    try {
      const parsed = JSON.parse(raw);

      ideas = parsed
        .filter(
          (item) =>
            Number.isInteger(item.axis_index) &&
            item.axis_index >= 1 &&
            item.axis_index <= axes.length &&
            typeof item.concept === "string"
        )
        .map((item) => ({
          axis_id: axes[item.axis_index - 1].id,
          concept: item.concept.trim(),
        }));
    } catch (err) {
      console.warn("⚠️ Failed to parse axis-bound concepts");
      return generateFallbackConcepts(category);
    }

    if (ideas.length < axes.length) {
      console.warn(
        `⚠️ Only ${ideas.length}/${axes.length} concepts generated for ${category}`
      );
    }

    // En akse → ett konsept (hard garanti)
    const used = new Set();
    ideas = ideas.filter((i) => {
      if (used.has(i.axis_id)) return false;
      used.add(i.axis_id);
      return true;
    });

    return {
      concepts: ideas.slice(0, 5),
      axes,
      seeds: randomSeeds,
    };
  } catch (err) {
    console.error("💥 Full chaos concept generation failed:", err.message);
    return generateFallbackConcepts(category);
  }
}

// ============================================================================
// STEP 1 — 30 abstract, chaotic seed words (strictly one-word)
// ============================================================================

async function generateChaosSeeds(category) {
  const chaosPrompt = `
Generate exactly **100 SINGLE-WORD “viral curiosity seeds”**.

Each word must:
• Be ONE single English word.
• Contain emotional or visual tension (mystery, contrast, discovery, risk, decay, rupture, anomaly).
• Be broad enough to inspire ANY real-world frontier-curiosity article.
• NOT be a factual claim.
• NOT be scientific jargon.
• NOT be a category-specific word (no physics-only terms, no biology-only terms).
• NOT repeat examples from the prompt.
• NOT be synonyms of each other.
• NOT cluster around the same theme.

Think in the style of TikTok hooks:
• “Vanish”
• “Pulse”
• “Outlier”
• “Threshold”
• “Archive”

Stylistic requirement:
Words must maximize DIVERSITY.
Use wide semantic range:
• geological
• cosmic
• psychological
• mechanical
• archaeological
• atmospheric
• evolutionary
• temporal
• sensory
• symbolic
• structural

Forbidden:
• repeated themes
• synonyms
• poetic nonsense words
• invented jargon
• more than one word

Return ONLY a bullet list.
Exactly 100 lines.
Each line: one bullet, one word, nothing else.

Start now.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: chaosPrompt }],
    });

    return extractWordList(completion.choices[0].message.content);
  } catch (err) {
    console.error("❌ Chaos seed generation failed:", err.message);
    return [];
  }
}

// ============================================================================
// SECONDARY CLEANUP — regenerate seeds if too many invalid
// ============================================================================

async function regenerateOneWordSeeds(previousWords) {
  const prompt = `
Fix this list of seed words by returning **ONLY valid one-word abstract seeds**.

Rules:
• One single English word only
• No spaces, no hyphens
• No numbers
• No category-related terms
• No concrete nouns
• Abstract, varied, metaphorical

Here are the problematic seeds:
${previousWords.join(", ")}

Return a bullet list of **30 correct one-word seeds**.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return extractWordList(completion.choices[0].message.content);
  } catch {
    return [];
  }
}

// ============================================================================
// STEP 2 — WOW CONCEPT PROMPT (FRONTIER REALISM)
// ============================================================================

function buildConceptPrompt(category, seeds, axes = []) {
  const axisBlock = axes.length
    ? `
====================================================================
CURIOSITY AXES (ADDITIVE CONSTRAINT)
====================================================================
Each concept MUST be driven by ONE of the following abstract axes.
Do NOT reuse the same axis twice.
Axes define the LENS, not the story.

${axes
  .map(
    (a, i) => `
AXIS ${i + 1}:
• Lens: ${a.axis}
• Must include: ${a.must_include.join(", ")}
• Prefer: ${a.prefer.join(", ")}
• Avoid: ${a.avoid.join(", ")}
• Evidence types: ${a.evidence_types.join(", ")}
• Time scope: ${a.time_scope}
`
  )
  .join("\n")}
`
    : "";

  return `
You are generating **5 ultra-wow, mass-appeal curiosity concepts**  
for category: **${category.toUpperCase()}**.

The concept MUST fit this category definition:
"${CATEGORY_DEFINITIONS[category]}"

${axisBlock}

====================================================================
FRONTIER REALISM CONSTRAINT (CRITICAL)
====================================================================
You are NOT allowed to invent impossible phenomena.

Every concept MUST:
• Be grounded in **real-world, verifiable domains**:
  - real scientific fields, real types of organisms, real materials
  - real kinds of astronomical objects, real geological processes
  - real historical periods, real kinds of artifacts or records
• Highlight **strange, under-discussed, or counterintuitive aspects** of reality,
  NOT pure fantasy.

Allowed:
• Genuine mysteries and frontiers:
  - phenomena that are observed but not fully explained
  - research questions still being debated
  - rare or extreme edge cases in nature, history, or technology
• Careful language:
  - “records suggest…”
  - “some researchers propose…”
  - “data hints that…”
  - “one study reports…”

Not allowed:
• Violations of fundamental laws without strong real precedent:
  - forests thriving forever without any energy source
  - humans naturally living for centuries
  - macroscopic objects defying gravity
  - matter spontaneously appearing from nowhere
• Explicitly fictional or supernatural entities:
  - ghosts, demons, angels, curses, magic
  - alien interventions presented as factual
• Entirely invented civilizations, planets, or materials.

If an idea would require rewriting basic physics, chemistry, or biology,
you MUST discard it and choose a more realistic frontier phenomenon instead.

====================================================================
HARD AVOID LIST — DO NOT USE THESE OR CLOSE VARIANTS
====================================================================
You MUST NOT base any concept on the following overused curiosities
or their direct analogues. If your idea is “basically the same thing
with slightly different words”, discard it and try again.

Forbidden example topics:
• Roman concrete durability and its volcanic ash mix
• The Antikythera mechanism as “the first computer”
• The Voynich manuscript as an uncracked code
• Tardigrades surviving in space or extreme conditions
• “Bananas are berries, strawberries are not”
• “Tomatoes are fruits but used as vegetables”
• The 52-hertz “lonely whale”
• Pyramids aligned with stars / Orion / solstices
• Nazca lines viewed from above
• Library of Alexandria burning and lost knowledge
• “You are made of stardust” / gold from supernovae
• The immortal jellyfish (Turritopsis dohrnii)
• “There are more trees on Earth than stars in the galaxy”
• The placebo effect in generic form
• The Mandela effect / false memory lists
• Déjà vu described in a generic psychological way

If a concept feels like something that frequently appears on
“top 10 mind-blowing facts” lists, you MUST discard it and
generate a rarer, more niche phenomenon instead.

====================================================================
WOW-FACTOR REQUIREMENTS (WITH REALITY)
====================================================================
Each concept MUST use at least one:
• Forbidden contrast — two things that “should not” be related, but are,
  in a real, documented way.
• Unexpected survival — something tiny, fragile, or overlooked that
  leaves a massive long-term trace in data, rocks, genomes, archives, or space.
• Sudden reversal — what people assume is true turns out to be
  the opposite once you look at the evidence.
• Lost-and-found mystery — a real artifact, dataset, or natural signal
  discovered, forgotten, then rediscovered with new meaning.
• Unlikely chain reaction — a small real cause leading to large,
  documented consequences (ecological, historical, technological, or social).

The goal: **“No way… and yet this is real.”**

====================================================================
META-VARIATION REQUIREMENTS (INSIDE THE CATEGORY)
====================================================================
Across the 5 concepts:

• Each concept must explore a DISTINCT thematic domain inside the category.
  - Do not reuse the same kind of organism, mechanism, or historical era.
  - Do not reuse the same narrative structure (“lost → rediscovered”)
    more than twice, and never in an identical way.

• Maximize semantic distance between all 5 concepts.
  They must feel unrelated in imagery, premise, and underlying logic.

• Favor:
  - edge cases
  - deep-time signals
  - marginal ecosystems
  - obscure historical episodes
  - niche subfields of research

• Avoid:
  - textbook examples
  - standard listicle curiosities
  - phenomena that appear frequently in popular science explainers.

If ANY two concepts feel similar in structure, theme, domain, mechanism,
or imagery, you MUST discard the weaker one and regenerate until all 5
are maximally distinct.

====================================================================
FACTUALITY REQUIREMENT (FRONTIER REALISM VERSION)
====================================================================
• Concepts must be **compatible with a fact-based curiosity article**.
• You may involve:
  - unsolved puzzles
  - competing hypotheses
  - partial or noisy data
  as long as you describe them cautiously and do not present speculation as fact.

• You MUST:
  - Anchor each concept to at least one real class of thing:
    • a type of organism, ecosystem, rock, signal, device, archive,
      archaeological layer, instrument, or dataset
  - Make it clear that the phenomenon is known or studied in reality,
    even if not fully understood.

• You MUST NOT:
  - Invent a brand-new type of lifeform that fundamentally breaks biology.
  - Claim that well-known impossibilities (like perpetual motion)
    are confirmed facts.
  - Fabricate very specific named institutions, labs, or missions
    that do not exist; instead, refer generically:
    “one research team”, “a long-running observatory project”, etc.

Safe phrasing examples:
• “In a little-known sediment core, researchers found…”
• “Geneticists working with archived samples noticed…”
• “A long-term observatory record reveals an odd pattern where…”
• “Deep cave surveys uncovered an ecosystem where…”

====================================================================
CATEGORY ALIGNMENT
====================================================================
All 5 concepts MUST clearly belong to the category:
${category.toUpperCase()} — defined as:
"${CATEGORY_DEFINITIONS[category]}"

They must NOT drift into other categories
(e.g., pure geopolitics inside science, or pure tech inside history)
unless the category definition explicitly allows it.

====================================================================
USE OF SEED WORDS
====================================================================
Use the three seed words only as hidden semantic inspiration —
they should influence:
• tone
• contrast
• imagery
• type of curiosity

The concepts do NOT need to mention the seeds explicitly.
Seeds: ${seeds.join(", ")}

====================================================================
STRUCTURE REQUIREMENT (ALL CATEGORIES)
====================================================================
Each concept MUST be exactly **two sentences**.

For EACH concept:
• Sentence 1:
  - Start with a vivid, surprising image or situation rooted in
    a real type of place, organism, artifact, dataset, or mechanism.

• Sentence 2:
  - Reveal the factual anchor that makes the curiosity real.
  - Explicitly tie it to observation, measurement, records, or research,
    using formulations like:
    “scientists studying X have documented…”
    “long-term records show…”
    “archaeological surveys reveal…”
    “genetic analysis indicates…”

Do NOT write titles or fragments.
Do NOT use bullet points, headings, or numbering inside the concepts.

====================================================================
FORMAT:
Return JSON ONLY in the following exact structure:

[
  {
  "axis_index": 1,
  "concept": "<exactly two sentences>"
  }
]

Rules:
• Return EXACTLY one object per axis
• axis_index MUST match the axis numbers (1–5) listed above
• Do NOT reuse axes
• Do NOT invent new indices
• Each concept MUST be driven ONLY by its axis
• No extra text outside JSON
• axis_index MUST be the number of the axis (1–5) as listed above
• Do NOT invent new indices

`;
}

// ============================================================================
// HELPERS
// ============================================================================
function extractList(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
    .filter((l) => l.length > 20);
}

function extractWordList(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^[\-\*\d\.\s]+/, "").trim())
    .map((l) => l.toLowerCase())
    .map((l) => l.replace(/[^a-z]/g, "")) // removes any non-letter
    .filter((l) => l.length >= 3 && l.length <= 20)
    .filter((l) => !l.includes(" ")); // ABSOLUTE SINGLE-WORD GUARANTEE
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ============================================================================
// FALLBACK
// ============================================================================
function generateFallbackConcepts(category) {
  return {
    concepts: [],
    axes: [],
    seeds: [],
  };
}
