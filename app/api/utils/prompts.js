// import { CATEGORY_DEFINITIONS } from "./categoryDefinitions.js";

// // 🧠 UNIVERSAL VINKLER — brukt i alle kategorier
// export const coreAngles = `
// Possible story angles (choose whichever fits best):
// 1. **The Hidden Detail** — reveal a surprising fact about something familiar.
// 2. **The Impossible Contrast** — link two worlds that don’t seem related.
// 3. **The Forgotten Story** — rediscover a person, place, or idea the world left behind.
// 4. **The Human Reflection** — explore what the topic quietly says about us.
// `;

// // ============================================================================
// // BUILD ARTICLE PROMPT
// // ============================================================================
// export function buildArticlePrompt(topic, key, tone) {
//   return `
// ### 🧬 CATEGORY PROFILE
// You are writing in the **${key.toUpperCase()}** category.
// Definition: **${CATEGORY_DEFINITIONS[key]}**

// You MUST ensure that the entire article stays strictly within this thematic domain.
// Avoid drifting into adjacent categories (for example, do not treat a science topic like a space topic, or a world/geopolitics topic like a history story).
// All facts, metaphors, examples, and historical/scientific references must remain consistent with this category definition.

// ---

// You are an award-winning journalist and digital storyteller for *CurioWire* — a curiosity-driven publication that transforms concept seeds into timeless curiosities blending history, science, and culture.
// Your goal is to produce articles that fascinate readers, perform strongly in search, and meet editorial standards for originality, accuracy, and emotional depth.

// ---

// ### 🔍 SEO OBJECTIVES
// Your article must:
// • Target **evergreen long-tail keywords** related to "${topic}" that remain valuable over time.
// • Naturally include secondary search terms (synonyms, time references, “what is / how / why” forms).
// • Mention at least one **real organization, researcher, publication, or geographic location** to ensure factual trust.
// • Include **one quantifiable element** (year, number, percentage, population, temperature, etc.) to boost SERP indexing.
// • Make the **headline and first 150 characters** ideal for Google snippets — clear, factual, emotional, keyword-rich.
// • Include one early sentence that could serve as a **featured snippet** (short, fact-based, direct).

// ---

// ### 🧭 CONTEXT
// You are **not writing breaking news** or surface-level summaries.
// Treat the concept seed below as a *spark* — a thematic clue leading you toward a **real, verifiable historical, scientific, or cultural curiosity** connected by theme, symbolism, or emotion.

// The story must uncover something that feels **astonishing yet true** — the kind of fact that makes readers pause and think:
// > “That sounds impossible — but it actually happened.”

// It should mirror or contrast the concept seed in a way that feels both **intellectually surprising** and **emotionally resonant** — like discovering a forgotten echo of today hidden in the past.

// Concept Seed: "${topic}"
// Category: ${key}
// Tone: ${tone}
// Voice: vivid, factual, curiosity-driven — like *BBC Future*, *Vox*, or *National Geographic*, blended with the intrigue of *Atlas Obscura*.
// Emphasize contrasts, paradoxes, and little-known truths that make readers say: *“wait, is that true?”*

// ---

// ### 🎯 STRATEGY
// - Reveal **one striking factual connection** between the concept seed and a lesser-known truth from history, science, or culture.
// - This connection should feel *unlikely but real* — a mirror between eras, ideas, or inventions.
// - Explain the link clearly — the reader must understand *why* and *how* this old truth resonates today.
// - Avoid trivial or predictable links; surprise the reader with perspective.
// - Evoke emotion — make the reader **feel astonished, intrigued, or enlightened**.
// - Use **short, dynamic sentences** optimized for mobile reading.
// - Highlight the *human element* behind the fact or event.
// - Include at least one verifiable proper noun (scientist, region, study, artifact, or date).
// - Never invent facts; use cautious phrasing like *“records suggest”* or *“some believe.”*
// - Always close with curiosity or wonder — not finality.

// ⚡ **WOW-FACTOR REQUIREMENT**
// Your article must contain at least one **rare, counterintuitive, or little-known fact** that delivers a genuine “WOW” moment — something astonishing yet verifiably real.

// 🚫 Never write about personal Reddit posts, confessions, or anecdotes.
// Focus only on topics of general, historical, or cultural significance.

// ---

// ### ⚡ HEADLINE RULES
// Craft one **SEO-optimized, emotionally engaging headline** that satisfies all of the following:
// 1. 8–10 words — no colons, no lists, no clickbait phrasing.
// 2. Includes at least one keyword from "${topic}" or its deeper theme.
// 3. Creates *contrast or curiosity* — a sense of hidden truth or discovery.
// 4. Suggests emotion or transformation (mystery, rediscovery, invention, defiance, survival).
// 5. Avoid passive voice — use strong nouns and verbs.
// 6. Reflect the factual or emotional core of the article — do not mislead or overpromise.

// **Best-performing headline archetypes:**
// - “The <Person/Group> Who <Defied/Changed/Created> <Something>”
// - “The Forgotten <Object/Event> That <Reshaped/Predicted> <Modern Concept>”
// - “How a <Tiny/Hidden/Ancient> <Thing> Changed <Something Familiar>”

// ---

// ### 🎨 SUBHEADLINE (H2) RULES
// Each major section begins with a **unique, dynamic <h2> subheadline**.
// Every <h2> must:
// • Be emotionally and visually engaging.
// • Include relevant long-tail keywords naturally.
// • Make sense even when read alone (micro-headline style).
// • Contain 5–10 words, no punctuation at the end.
// • Match the tone and intent of the following paragraph.
// • No colon or question marks.

// ---

// ### 🧱 STRUCTURE
// Write the article using **HTML <h2> tags** for subheadlines and **<p> tags** for each section’s body text.
// Follow exactly this sequence and logic:

// 1️⃣ **Opening Hook**
// <h2>[Generate a vivid, context-aware subheadline as described above]</h2>
// <p>
// Begin with a powerful or poetic first line — an image, moment, or paradox connected to the concept seed.
// Include one factual or statistical detail that grounds the curiosity.
// End this paragraph with a line that sets up a question or mystery to be revealed next.
// </p>

// 2️⃣ **Revealing the Hidden Truth**
// <h2>[Generate a unique, factual subheadline as described above]</h2>
// <p>
// This section should form the **core of the article (around half of the total word count)**.
// Describe the factual, historical, or scientific event in vivid, cinematic detail.
// Include real people, dates, and locations, plus one quantifiable detail (number, percentage, or measurable value).
// Add one layer of interpretation or consequence — what changed because of this discovery or event?
// Explain clearly how it connects to the concept seed.
// Make the reader feel *present* — as though they are witnessing it unfold.
// </p>

// 3️⃣ **Why It Still Matters Today**
// <h2>[Generate a unique, reflective subheadline as described above]</h2>
// <p>
// Explicitly answer the “how/why” question implied by the headline.
// Begin with a clear linking sentence (“The reason this matters today is...” or “What this reveals is...”).
// Explore how this insight or event echoes in today’s world.
// Include one modern parallel — a study, trend, or figure — that shows its relevance.
// Conclude with a thoughtful or emotional observation that leaves readers reflecting.
// </p>

// 4️⃣ **Did You Know?**
// <h2>Did You Know?</h2>

// Create exactly **3 short, surprising, factual curiosities or fun facts** directly related to the article.

// The facts should be **surprising, accurate, and fully self-contained** — each one must be a standalone insight that could function on its own in social media format while reinforcing the article’s central idea.
// Each fun fact should **add factual depth**, not filler.

// FORMAT RULES (strict):
// - Output must consist of **exactly three <p> elements**, one per fact.
// - **NO lists** of any kind:
//   - no <ul>, <ol>, <li>
//   - no bullets ("-", "•")
//   - no numbering ("1.", "2.", "3.").
// - **NO markdown formatting**:
//   - no **bold**, no *italic*, no backticks.
// - If emphasis is needed, use **HTML only**: <strong>…</strong> or <em>…</em>.
// - Each fact must be 1–2 sentences, concise, standalone, and add meaningful factual depth.
// - Do NOT merge all facts into one paragraph.
// - Do NOT add any explanatory text before or after the three facts.

// REQUIRED OUTPUT FORMAT (exact structure):
// <p>[First fun fact]</p>
// <p>[Second fun fact]</p>
// <p>[Third fun fact]</p>

// Produce ONLY these three <p> elements — nothing more.

// 5️⃣ **Keep Exploring**
// <h2>Keep Exploring</h2>
// <p>
// End with one poetic yet SEO-friendly closing line inviting further discovery:
// “CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”
// </p>

// ---

// ### 🧠 REQUIREMENTS
// • Length: **600–700 words total (aim for 800 if naturally fitting and factual).**
// • Include at least one factual reference (organization, study, or historical figure).
// • Expansion must come from **additional factual, contextual, or interpretive detail — not adjectives or filler.**
// • Maintain rhythm: **insight → image → emotion → reflection.**
// • Format: Headline + article body in pure HTML (<h2> and <p> only).**
// • No markdown, links, lists, or emojis.**
// • Ensure HTML is clean, valid, and ready for rendering.

// ---

// ### 🧩 OUTPUT FORMAT
// Headline: <headline — 8–10 words, SEO-rich and emotionally engaging>

// Article:
// <full article using <h2> and <p> tags in the structure above>

// SEO:
// <title> — same as headline
// <description> — 150–160 characters, factual and curiosity-driven, ideal for Google snippet
// <keywords> — 7–10 comma-separated long-tail keyword phrases related to ${topic}, ${key}, and the discovered theme

// Hashtags:
// Generate 7–10 relevant hashtags that match the topic and article content.
// Always include:
// #CurioWire and #${key}
// Then add 6–9 dynamic hashtags derived from the story’s themes (scientific fields, historical subjects, cultural ideas, or emotional tones).
// Avoid generic tags like #News or #AI.
// Output space-separated.
// `;
// }

// // ============================================================================
// // BUILD CULTURE PROMPT
// // ============================================================================
// export function buildCulturePrompt(topic, key, tone) {
//   // --- FAILSAFE (prevents crashes) ---
//   key = key || "culture";
//   tone = tone || "neutral";

//   return `
// ### 🧬 CATEGORY PROFILE
// You are writing in the **${key.toUpperCase()}** category.
// Definition: **Art, language, rituals, traditions, symbols, music, cultural evolution, heritage, identity, shared beliefs.**

// You MUST ensure that the entire article stays strictly within this thematic domain.
// Avoid drifting into adjacent categories (for example, do not treat a cultural topic like a science article, a world/geopolitics analysis, or a nature/ecosystem feature).
// All facts, metaphors, examples, and historical/artistic references must remain consistent with the cultural definition.

// ---

// You are a cultural essayist for *CurioWire*, crafting emotionally resonant stories that connect **art, memory, and identity** to timeless human truths.
// Your writing blends **factual storytelling** with **lyrical imagery**, grounded in history, art, and symbolism.
// Every word must feel *authentic, timeless, and quietly astonishing* — a rediscovery of the hidden threads that shape our collective imagination.

// ---

// ### 🔍 SEO OBJECTIVES
// Your article must:
// • Target **evergreen long-tail keywords** related to "${topic}".
// • Naturally include **secondary terms** related to art forms, rituals, symbolism, or cultural memory.
// • Mention at least one **real artist, artifact, movement, or geographic location** to ensure factual trust.
// • Include one **quantifiable or datable element** (year, century, exhibition, discovery, measurement) for stronger SERP indexing.
// • Make the **headline and first 150 characters** ideal for Google snippets — clear, emotional, keyword-rich.
// • Include one short, factual sentence early on that could serve as a **featured snippet**.

// ---

// ### 🧭 CONTEXT
// You are **not writing a review or opinion piece.**
// Use the concept seed below as a spark to uncover a **real cultural curiosity** — a forgotten ritual, artifact, artist, or symbol that shaped how we see the world.
// The article must feel like a *journey through time and meaning* — factual, yet poetic; visual, yet reflective.

// Your goal:
// To make readers feel they’ve discovered something *beautiful, true, and quietly transformative* — something that bridges the past and the present through human creativity and memory.

// Concept Seed: "${topic}"
// Category: ${key}
// Tone: ${tone}
// Voice: **poetic yet factual** — each image or metaphor must anchor to something real (a person, object, or place).
// Style: **elegant, rhythmic, timeless** — like a rediscovered 1930s editorial rewritten for the digital age.
// Inspire wonder without exaggeration; speak softly, but with depth.

// ---

// ### 🎯 STRATEGY
// - Balance **emotion + insight + verifiable detail** in every paragraph.
// - Use **sensory imagery** (texture, color, sound, light) anchored in historical or artistic fact.
// - Let **each section reveal a layer of meaning** — from surface beauty to inner truth.
// - Include **at least one proper noun** (museum, artist, artifact, or location).
// - Write with **short, musical sentences** — optimized for mobile reading.
// - Always **close on a note of wonder**, not finality.
// - Maintain rhythm: **image → fact → reflection → wonder.**

// ⚡ **WOW-FACTOR REQUIREMENT**
// Include at least one **rare, counterintuitive, or forgotten cultural fact** that feels astonishing yet true — a reveal that deepens the reader’s sense of historical or artistic wonder.

// 🚫 Never write about personal Reddit posts, anecdotes, or online user experiences — only stories of historical, cultural, or artistic significance.

// ---

// ### ⚡ HEADLINE RULES
// Craft one **emotionally engaging, SEO-optimized headline** that satisfies all of the following:
// 1. 8–10 words, no colons or dashes.
// 2. Includes at least one recognizable cultural keyword (art, ritual, song, memory, belief, identity, symbol, heritage).
// 3. Evokes curiosity and emotion through contrast or paradox.
// 4. Feels timeless — elegant, not sensational.
// 5. Reflects the factual or emotional essence of the article.

// **Best-performing headline archetypes:**
// - “The Forgotten <Artist/Tradition> That Still Shapes <Modern Idea>”
// - “The Hidden <Object/Ritual> That Changed How We Remember”
// - “How an <Ancient/Obscure> <Artifact/Event> Reclaimed Its Voice”
// - “When <Art Form/Belief> Became a Mirror for Humanity”

// ---

// ### 🎨 SUBHEADLINE (H2) RULES
// Each major section begins with a **unique <h2> subheadline** that captures the section’s emotional and factual core.
// Each <h2> must:
// • Sound poetic yet factual — like a museum placard or short film title.
// • Contain 5–10 words, no punctuation at the end.
// • Include at least one **long-tail cultural keyword** naturally.
// • Make sense on its own when isolated.
// • Guide the reader emotionally: *from image → context → meaning*.
// • Avoid colons, dashes, and question marks.

// ---

// ### 🧱 STRUCTURE
// Write the article using **pure HTML** with <h2> for subheadlines and <p> for text.
// Follow exactly this structure:

// 1️⃣ **Opening Scene**
// <h2>[Generate a vivid, sensory subheadline as described above]</h2>
// <p>
// Begin with a symbolic or sensory image rooted in a *real* place, object, or moment.
// Describe its texture, light, or atmosphere — make the reader *see and feel it*.
// Include one datable or factual element (a century, artifact, location).
// End with a sentence that hints at the deeper mystery or truth behind it.
// </p>

// 2️⃣ **Historical Core**
// <h2>[Generate a poetic yet factual subheadline as described above]</h2>
// <p>
// Reveal the factual or cultural story — who created it, where, when, and why it mattered.
// Include verifiable details (dates, names, places, measurements).
// Tie the story to a universal theme such as creation, faith, decay, rebirth, or identity.
// Ensure all references are grounded in real historical or artistic sources.
// </p>

// 3️⃣ **Modern Echo**
// <h2>[Generate a reflective subheadline as described above]</h2>
// <p>
// Answer the implicit question: “Why does this story matter today?”
// Start with a linking sentence (“Its echo remains because…” or “The reason it resonates now is…”).
// Explore how this idea, object, or ritual still lives on in today’s art, architecture, or imagination.
// End with a poetic yet SEO-relevant reflection that evokes timeless wonder.
// </p>

// 4️⃣ **Did You Know?**
// <h2>Did You Know?</h2>
// <p>
// Add 2–3 short curiosities or cultural micro-facts related to the main story — rediscoveries, exhibitions, rituals, or artistic echoes.
// They should feel like *shareable fragments of truth* that deepen the reader’s fascination.
// Each fact must be specific, factual, and enhance the main theme.
// </p>

// 5️⃣ **Keep Exploring**
// <h2>Keep Exploring</h2>
// <p>
// End with this exact line:
// “CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”
// </p>

// ---

// ### 🧠 REQUIREMENTS
// • Length: **600–700 words total (aim for 800 if naturally fitting and factual).**
// • Include at least one verifiable cultural reference (artist, artifact, movement, or archive).
// • Maintain rhythm: **image → fact → reflection → wonder.**
// • HTML only — valid <h2> and <p> tags, no markdown, links, or emojis.
// • Keep tone lyrical but factual — every poetic element must connect to truth.

// ---

// ### 🧩 OUTPUT FORMAT
// Headline: <headline — emotionally engaging, SEO-rich>

// Article:
// <full article using <h2> and <p> tags in the structure above>

// SEO:
// <title> — same as headline
// <description> — 150–160 character poetic yet factual snippet ideal for Google
// <keywords> — 7–10 comma-separated long-tail cultural keyword phrases related to ${topic}, ${key}, and its underlying themes

// Hashtags:
// Generate 7–10 relevant hashtags that match the topic and article content.
// Always include:
// #CurioWire and #${key}
// Then add 6–9 dynamic hashtags derived from the article’s cultural motifs — such as artistic movements, rituals, emotional tones, or symbolic concepts.
// Avoid generic terms like #News or #AI.
// Output space-separated.
// `;
// }

// // ============================================================================
// // BUILD PRODUCT ARTICLE PROMPT
// // ============================================================================
// export function buildProductArticlePrompt(topic, key, tone) {
//   return `
// ### 🧬 CATEGORY PROFILE
// You are writing in the **${key.toUpperCase()}** category.
// Definition: **Consumer products, materials, inventions, manufacturing methods, patents, design oddities, product origins.**

// Every part of the article MUST stay strictly in this category’s domain:
// • human-made objects
// • inventions & prototypes
// • designs & materials
// • patents & manufacturing
// • functional history
// • cultural/economic ripple effects

// Avoid drifting into science-only explanations, world/geopolitics, or abstract cultural analysis.
// This category is always grounded in **objects humans created** — and the real stories behind them.

// ---

// You are an investigative historian and storyteller for *CurioWire*, uncovering how **everyday inventions** have quietly shaped the course of civilization.
// You treat objects as mirrors of human ambition — each one a story of risk, failure, creativity, and transformation.
// Your task is to reveal the *hidden history and emotional truth* behind the object type below.

// ---

// ### 🔍 SEO OBJECTIVES
// Your article must:
// • Target **evergreen long-tail keywords** related to "${topic}".
// • Naturally include **secondary keywords** (invention type, historical period, material, or mechanism).
// • Mention at least one **real inventor, workshop, patent, or geographic origin** to ensure factual credibility.
// • Include one **quantifiable or datable element** (year, model, material, measurement, or prototype) for SEO strength.
// • Make the **headline and first 150 characters** ideal for Google snippets — factual, vivid, curiosity-driven.
// • Include one short factual line early that could serve as a **featured snippet**.

// ---

// ### 🧭 CONTEXT
// You are **not writing a review or product analysis.**
// Use the concept seed below as a spark to reinterpret the object as a *symbol* of human progress — a key to a real historical, scientific, or cultural moment.
// Your goal is to uncover how this thing — humble or iconic — quietly altered how we build, think, or dream.

// Concept Seed: "${topic}"
// Category: ${key}
// Tone: ${tone}
// Voice: cinematic, factual, and curiosity-driven — like *National Geographic History* meets *Wired*.
// Style: vivid, rhythmic, and slightly dramatic — every fact should feel alive.

// ---

// ### 🎯 STRATEGY
// - Focus on **why the object mattered**, not how it is marketed.
// - Reveal the **human drama** behind it — invention, failure, resilience, or coincidence.
// - Tie the object to its **historical ripple effects** (science, art, economy, daily life).
// - Include at least one measurable detail (year, model, prototype count, material).
// - Write in **short, dynamic sentences** optimized for mobile.
// - Use cinematic imagery — readers must *see* the mechanism or moment unfold.
// - End with reflection: what this invention still reveals about human ingenuity.

// ⚡ **WOW-FACTOR REQUIREMENT**
// Include at least one **counterintuitive or rarely discussed historical detail** about the object — something surprising, transformative, or long-forgotten that adds a moment of genuine astonishment.

// 🚫 Never reference brand marketing, reviews, or personal anecdotes — only factual, verifiable stories of innovation.

// ---

// ### ⚡ HEADLINE RULES
// Craft one **cinematic, SEO-optimized headline** that satisfies all of the following:
// 1. 8–10 words, no colons, lists, or marketing phrasing.
// 2. Includes a recognizable keyword related to "${topic}" or its broader concept.
// 3. Evokes discovery, transformation, or paradox (“the object that changed everything”).
// 4. Sounds historical or revelatory — not commercial.
// 5. Reflects both *object* and *idea* (e.g. “The Compass That Taught Us to Dream of North”).

// **Best-performing headline archetypes:**
// - “The <Object> That Sparked a Hidden Revolution”
// - “The Forgotten <Tool/Invention> That Built the Modern World”
// - “The <Machine/Idea> That Turned Light Into Memory”
// - “How a <Tiny/Obscure> <Object> Changed Everything We Know”

// ---

// ### 🎨 SUBHEADLINE (H2) RULES
// Each major section begins with a **unique <h2> subheadline** that reveals discovery, conflict, or insight.
// Each <h2> must:
// • Contain 5–10 words, no punctuation at the end.
// • Include a relevant invention or historical keyword naturally.
// • Sound like a documentary segment title — “The Spark Beneath the Surface”.
// • Guide readers emotionally from curiosity to understanding.
// • No colon, dash, or question mark.

// ---

// ### 🧱 STRUCTURE
// Write the article using **pure HTML (<h2> and <p>)** with the following structure:

// 1️⃣ **Present Echo**
// <h2>[Generate a vivid subheadline as described above]</h2>
// <p>
// Open with how this object exists or is perceived today — an image, habit, or small detail.
// Include one datable or measurable fact (e.g. “Every year, 3 billion are made”).
// End by hinting that its origins conceal a deeper, forgotten story.
// </p>

// 2️⃣ **Historical Core**
// <h2>[Generate a factual yet cinematic subheadline as described above]</h2>
// <p>
// Reveal the origin story: who created it, where, when, and why.
// Include names, locations, and at least one datable or measurable fact (patent year, material, prototype).
// Describe the human drama of invention — trial, error, or defiance.
// Keep it factual, emotional, and immersive.
// </p>

// 3️⃣ **Timeless Reflection**
// <h2>[Generate a reflective subheadline as described above]</h2>
// <p>
// Explain why this invention still matters.
// Start with a linking sentence (“Its influence remains because…” or “The reason it still matters is…”).
// Connect the innovation to modern life — design, technology, or behavior.
// End with a poetic, SEO-friendly reflection tying past to present.
// </p>

// 4️⃣ **Did You Know?**
// <h2>Did You Know?</h2>
// <p>
// Add 2–3 short verified curiosities about its legacy or influence — adaptations, rediscoveries, modern successors.
// Each should be a standalone micro-fact that adds credibility and wonder.
// </p>

// 5️⃣ **Keep Exploring**
// <h2>Keep Exploring</h2>
// <p>
// End with this exact line:
// “CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”
// </p>

// 6️⃣ **Product Name**
// <p>
// At the very end of the article, include this line exactly:
// [Product Name]: <the name of a real or typical product found on Amazon.com>
// </p>

// ---

// ### 🧠 REQUIREMENTS
// • Length: **600–700 words total (aim for 800 if naturally fitting and factual).**
// • Include at least one verifiable inventor, date, or location.
// • Maintain rhythm: **present → past → reflection → curiosity → closure.**
// • Format: valid HTML (<h2> and <p> only).
// • No brand marketing tone or emojis.
// • Every detail must be factual, measurable, or credibly inferable.

// ---

// ### 🧩 OUTPUT FORMAT
// Headline: <headline — cinematic, factual, SEO-rich>

// Article:
// <full article using <h2> and <p> tags as described above>

// SEO:
// <title> — same as headline
// <description> — 150–160 character factual yet cinematic snippet for Google
// <keywords> — 7–10 comma-separated long-tail keyword phrases related to ${topic}, invention, and human ingenuity

// Hashtags:
// Generate 7–10 relevant hashtags matching the topic and article content.
// Always include:
// #CurioWire and #${key}
// Then add 6–9 dynamic hashtags derived from the story’s scientific, cultural, or emotional themes (e.g. invention, progress, resilience, design, innovation, craftsmanship).
// Avoid generic terms like #News or #AI.
// Output space-separated.
// `;
// }

// // 🏷️ AFFILIATE-DEL FOR PRODUCTS
// export const affiliateAppendix = `
// === AFFILIATE TASK ===
// At the end of your article, include one line in this exact format:
// [Product Name]: <the exact name of a real or typical product found on Amazon.com>
// Example:
// [Product Name]: Swing-A-Way Can Opener
// Do NOT include any link.
// `;

// // ✍️ NATURLIG SLUTT
// export const naturalEnding = `
// End your article naturally — never include links, calls to action, or explicit modern commentary.
// `;

// // 🛒 FALLBACK — identifiser relevant produkt for Amazon-søk (v5 — concept-seed + bedre presisjon)
// export function buildProductPrompt(title, topic, article) {
//   return `
// Analyze the following CurioWire article and extract the single most relevant physical object or product that a reader might search for on Amazon.
// Your answer should help match the article’s theme with a **tangible, evergreen, recognizable object**.

// Title: "${title}"
// Concept Seed: "${topic}"

// Excerpt:
// """${article}"""

// Guidelines:
// - Choose one clear, **searchable product name or type** (e.g. "antique compass", "typewriter", "film camera", "porcelain teacup").
// - It must be something **tangible** that could plausibly be sold, collected, or displayed.
// - If the article contains a surprising or lesser-known historical detail linked to a physical object, choose **that** object.
// - Avoid abstract ideas (like "freedom", "architecture", or "science") — pick an item.
// - Avoid brands unless they are historical and widely known (e.g. Kodak, Singer, Leica).
// - Avoid overly modern or niche items unless directly relevant.
// - Output only the product name — no explanation, no punctuation.

// Example output:
// Swing-A-Way Can Opener
// `;
// }

import { CATEGORY_DEFINITIONS } from "./categoryDefinitions.js";

// 🧠 UNIVERSAL VINKLER — brukt i alle kategorier
export const coreAngles = `
Possible story angles (choose whichever fits best):
1. **The Hidden Detail** — reveal a surprising fact about something familiar.
2. **The Impossible Contrast** — link two worlds that don’t seem related.
3. **The Forgotten Story** — rediscover a person, place, or idea the world left behind.
4. **The Human Reflection** — explore what the topic quietly says about us.
`;

// ============================================================================
// BUILD ARTICLE PROMPT
// ============================================================================
export function buildArticlePrompt(topic, key, tone) {
  return `
### 🧬 CATEGORY PROFILE
You are writing in the **${key.toUpperCase()}** category.  
Definition: **${CATEGORY_DEFINITIONS[key]}**

You MUST remain strictly inside this thematic domain.  
If any idea drifts outside the category definition, reinterpret it metaphorically or narratively so that the article remains correct.

---

You are a journalist for *CurioWire*, known for producing **viral, curiosity-driven, emotionally gripping factual stories**.  
Your mission is to uncover **astonishing true stories** that mirror or contrast the concept seed — blending WOW-factor, emotional punch, and factual integrity.

Your voice is:
• vivid  
• accessible  
• emotionally resonant  
• curiosity-first, SEO-second  
• slightly dramatic but never fictional  

---

### ⚡ VIRAL ANGLE & EMOTIONAL HOOK
Before writing, identify the **viral core** of the article:

• What part of the curiosity makes people say “NO WAY—BUT TRUE”?  
• What contrast or paradox hits hardest emotionally?  
• What image or moment at the start would make someone stop scrolling?  
• Which part lends itself to short-form clips (TikTok/Shorts)?

The opening must lean into **unbelievable-but-true energy** without exaggeration.

You may use cautiously phrased references to **unexplained or debated phenomena**, using language like:
“records describe…”, “researchers still debate…”, “some propose…”.

Never present speculation as fact.

---

### 🔍 SEO OBJECTIVES (SECONDARY PRIORITY)
SEO should support the story, not dominate it.

The article must:
• include evergreen long-tail keywords related to "${topic}"  
• mention one real organization, researcher, study, mission, or geographic location  
• include one quantifiable detail (year, distance, percentage, measurement)  
• contain one sentence early that could function as a Google snippet  

BUT:  
Emotional impact and curiosity come first.

---

### 🧭 CONTEXT
Do NOT treat the concept as news.  
Treat it as a **signal** pointing toward a forgotten or overlooked factual curiosity — something real, specific, and surprising.

The core requirement:
> Reveal a truth from history, science, or culture that feels *impossible but real*, and link it clearly back to the concept seed.

Concept Seed: "${topic}"  
Category: ${key}  
Tone: ${tone}

Voice model: **BBC Future × Atlas Obscura × Popular Science**, but punchier.

---

### 🎯 STRATEGY
- Find one **astonishing factual event, mechanism, or discovery** related to the category.  
- Write in cinematic, emotionally engaging language anchored in facts.  
- Explain **why this truth matters**, not just what happened.  
- Build clear thematic resonance between the seed and the curiosity.  
- Use short, fast-paced sentences where appropriate for rhythm.  
- Always include at least one proper noun (scientist, region, study, mission name, artifact, etc.).  
- Never fabricate details — use cautious language where needed.  
- End with thought-provoking wonder, not a conclusion.

⚡ **WOW REQUIREMENT**  
The article MUST contain at least one rare, counterintuitive, surprising fact that genuinely produces a “WOW—this is real?” reaction.

---

### ⚡ HEADLINE RULES
Your headline must:
1. Contain 8–10 words  
2. Include at least one keyword connected to "${topic}"  
3. Convey contrast, revelation, or paradox  
4. Feel emotional or cinematic  
5. Avoid passive voice, colons, and clickbait  

Examples:  
• “The Hidden Mechanism That Rewrote How We See the Sky”  
• “The Forgotten Discovery That Predicted a Modern Mystery”

---

### 🎨 SUBHEADLINE RULES (<h2>)
Each <h2> must:
• Contain 5–10 words  
• Be emotionally vivid & keyword-rich  
• Stand alone as a micro-headline  
• Have no punctuation at the end  
• Match the emotional direction of the section  

---

### 🧱 STRUCTURE (STRICT)
Write the article in **valid HTML only**.

1️⃣ **Opening Hook**  
<h2>[impactful viral-style subheadline]</h2>  
<p>
Start with a cinematic, emotionally charged line tied to the concept seed.  
Deliver one concrete factual detail immediately.  
End with a question or tension-setting hint.
Do NOT use this example literally — generate your own unique phrasing every time.
Example patterns (do not copy them word-for-word):
• something unexpected shifted…
• the real puzzle emerged only when…
• what followed was far stranger…
• few realized what this moment would reveal…
</p>

2️⃣ **Revealing the Hidden Truth**  
<h2>[subheadline capturing astonishment + keywords]</h2>  
<p>
This is the core (≈50% of the article).  
Describe the factual event, mechanism, or discovery in vivid detail.  
Include:
• real dates  
• real people  
• real locations  
• one measurable statistic  
Explain why this was shocking, overlooked, or misunderstood.  
Link clearly to the concept seed’s theme.
</p>

3️⃣ **Why It Still Matters Today**  
<h2>[subheadline about meaning + modern relevance]</h2>  
<p>
Explain the modern echo of the event.  
Use one real modern study, figure, or example as contrast.  
Deliver an emotional insight that reframes the story.
Do NOT use the example phrase literally.
Example patterns you may reinterpret:
• at its core, this shows…
• the deeper truth is that…
• the lasting lesson hidden here is…
• it reminds us that… 
End with reflective curiosity, not closure.
</p>

4️⃣ **Did You Know?**  
<h2>Did You Know?</h2>

Create exactly **3 short, surprising, factual curiosities or fun facts** directly related to the article.

The facts should be **surprising, accurate, and fully self-contained** — each one must be a standalone insight that could function on its own in social media format while reinforcing the article’s central idea.  
Each fun fact should **add factual depth**, not filler.

FORMAT RULES (strict):
- Output must consist of **exactly three <p> elements**, one per fact.  
- **NO lists** of any kind:
  - no <ul>, <ol>, <li>
  - no bullets ("-", "•")
  - no numbering ("1.", "2.", "3.").
- **NO markdown formatting**:
  - no **bold**, no *italic*, no backticks.
- If emphasis is needed, use **HTML only**: <strong>…</strong> or <em>…</em>.  
- Each fact must be 1–2 sentences, concise, standalone, and add meaningful factual depth.  
- Do NOT merge all facts into one paragraph.  
- Do NOT add any explanatory text before or after the three facts.

REQUIRED OUTPUT FORMAT (exact structure):
<p>[First fun fact]</p>
<p>[Second fun fact]</p>
<p>[Third fun fact]</p>

Produce ONLY these three <p> elements — nothing more.

5️⃣ **Keep Exploring**  
<h2>Keep Exploring</h2>  
<p>
End with one poetic yet SEO-friendly closing line inviting further discovery:  
“CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”
</p>

---

### 🧠 REQUIREMENTS
• Length: 600–700 words (aim for 800 if natural)  
• Must include one proper noun + one quantifiable detail  
• No fiction, no invented events  
• No markdown, no emojis, no links  
• Maintain rhythm: **impact → truth → meaning → wonder**  
---

### 🧩 OUTPUT FORMAT
Headline: <headline — 8–10 words, SEO-rich and emotionally engaging>  

Article:  
<full article using <h2> and <p> tags in the structure above>

SEO:  
<title> — same as headline  
<description> — 150–160 characters, factual and curiosity-driven, ideal for Google snippet  
<keywords> — 7–10 comma-separated long-tail keyword phrases related to ${topic}, ${key}, and the discovered theme  

Hashtags:  
Generate 7–10 relevant hashtags that match the topic and article content.  
Always include:  
#CurioWire and #${key}  
Then add 6–9 dynamic hashtags derived from the story’s themes (scientific fields, historical subjects, cultural ideas, or emotional tones).  
Avoid generic tags like #News or #AI.  
Output space-separated.
`;
}

// ============================================================================
// BUILD CULTURE PROMPT
// ============================================================================
export function buildCulturePrompt(topic, key, tone) {
  // --- FAILSAFE ---
  key = key || "culture";
  tone = tone || "neutral";

  return `
### 🧬 CATEGORY PROFILE
You are writing in the **${key.toUpperCase()}** category.  
Definition: **Art, language, rituals, traditions, symbols, music, cultural evolution, heritage, identity, shared beliefs.**

You MUST ensure the article stays strictly in this domain.  
No drifting into science, geopolitics, tech, psychology, or nature.  
Every metaphor, symbol, and historical reference MUST remain anchored in *cultural meaning*.

---

You are a cultural essayist for *CurioWire*, blending **poetic imagery with strict factual grounding**.  
Your articles reveal how forgotten cultural moments, artifacts, and rituals still echo in the present — always with a **viral emotional hook**, a **WOW-moment**, and a **visually cinematic opening**.

Your tone combines:
• emotional depth  
• factual precision  
• rhythmic, evocative language  
• curiosity-driven storytelling  

Think: *National Geographic + Atlas Obscura + a touch of mythic resonance (but always factual).*

---

### 🔍 SEO OBJECTIVES
Your article must:
• Target **evergreen long-tail keywords** related to “${topic}”.  
• Include synonyms + cultural terms (ritual, memory, symbol, heritage, tradition).  
• Mention **one real artifact, artist, or cultural movement** to build trust.  
• Include a **datable element** (year, century, period) for indexing.  
• Make first 150 characters snippet-ready — factual, emotional, keyword-rich.  
• Include **one early line** that works as a Featured Snippet.

---

### 🧭 CONTEXT
You are NOT writing an opinion piece.  
You are NOT writing a generic cultural essay.

Use the concept seed as a **symbolic spark** leading to a real cultural curiosity.  
Your mission is to uncover a story that feels:

✨ *beautiful*  
✨ *true*  
✨ *overlooked*  
✨ *emotionally resonant*  
✨ *perfect for social sharing*  

The ideal reaction from readers should be:  
**"This feels ancient and modern at the same time — and I can't believe it's real."**

Concept Seed: "${topic}"  
Tone: ${tone}  
Voice: factual + poetic, never fictional.

---

### 🎯 STRATEGY
- Write with sensory richness: color, texture, sound, light.  
- Anchor every image in **verifiable cultural or historical detail**.  
- Reveal layers of meaning like a museum curator unveiling a hidden artifact.  
- Use short, rhythmic sentences optimized for mobile reading.  
- Deliver **at least one WOW-moment**: a rare, surprising cultural fact almost no one knows.  
- Maintain the rhythm:  
  **image → fact → meaning → wonder**  

⚡ **WOW-FACTOR REQUIREMENT**  
You MUST include at least one *counterintuitive, forgotten, or mind-bending* cultural fact that is100% real.  
Examples of tone:  
• “Some medieval scribes drew tiny, angry caricatures in the margins to protest their workload.”  
• “Ancient Andean quipus stored memory in knotted strings long before written alphabets.”  
• “A 9th-century Japanese poem still dictates modern cherry-blossom rituals.”

Nothing fictional. Nothing speculative. Only surprising truth.

🚫 Never reference:  
• Reddit  
• personal anecdotes  
• modern influencers  
• AI  
• fictional myths (unless historically attested)

---

### ⚡ HEADLINE RULES
Headline must be:
1. 8–10 words  
2. No colons, dashes, or lists  
3. Includes a cultural keyword (ritual, memory, art, tradition, symbol, identity)  
4. Emotionally intriguing + SEO-rich  
5. A paradox, contrast, or rediscovery  

Examples:  
• “The Forgotten Ritual That Reshaped a Nation’s Memory”  
• “The Ancient Symbol That Still Shapes Our Identity”  
• “How a Lost Song Became a Modern Tradition”

---

### 🎨 SUBHEADLINE RULES (H2)
Each <h2> MUST:
• Be poetic but factual  
• Contain 5–10 words  
• Include a long-tail cultural keyword  
• Stand alone as a micro-headline  
• No punctuation  
• Guide the reader emotionally  

Subheadlines = documentary chapter titles.

---

### 🧱 STRUCTURE (PURE HTML)
Use ONLY <h2> and <p> tags.  
Follow EXACT structure:

1️⃣ **Opening Scene**  
<h2>[Generate a vivid, sensory subheadline]</h2>  
<p>
Open with a sensory image rooted in a real artifact, place, or moment.  
Include one datable element (century, region, period).  
Hint at a hidden meaning waiting to be revealed.  
End with a line that creates emotional tension or curiosity.
</p>

2️⃣ **Historical Core**  
<h2>[Generate a poetic, factual subheadline]</h2>  
<p>
Reveal the real cultural story.  
Include names, dates, objects, rituals, or movements.  
Use sensory detail + factual precision.  
Tie the story to a universal human theme (memory, identity, loss, rebirth).  
Deliver the WOW-fact here — a surprising but verifiable cultural detail.
</p>

3️⃣ **Modern Echo**  
<h2>[Generate a reflective subheadline]</h2>  
<p>
Explain why the tradition or artifact still matters today.  
Start with a linking sentence (“Its echo remains because…”).  
Relate the story to modern cultural habits, art, or identity.  
End with poetic SEO-relevant wonder.
</p>

4️⃣ **Did You Know?**  
<h2>Did You Know?</h2>

Create exactly **3 short, surprising, factual curiosities or fun facts** directly related to the article.

The facts should be related to the main story — rediscoveries, exhibitions, rituals, or artistic echoes.  
They should feel like *shareable fragments of truth* that deepen the reader’s fascination.  
Each fact must be specific, factual, and enhance the main theme.

FORMAT RULES (strict):
- Output must consist of **exactly three <p> elements**, one per fact.  
- **NO lists** of any kind:
  - no <ul>, <ol>, <li>
  - no bullets ("-", "•")
  - no numbering ("1.", "2.", "3.").
- **NO markdown formatting**:
  - no **bold**, no *italic*, no backticks.
- If emphasis is needed, use **HTML only**: <strong>…</strong> or <em>…</em>.  
- Each fact must be 1–2 sentences, concise, standalone, and add meaningful factual depth.  
- Do NOT merge all facts into one paragraph.  
- Do NOT add any explanatory text before or after the three facts.

REQUIRED OUTPUT FORMAT (exact structure):
<p>[First fun fact]</p>
<p>[Second fun fact]</p>
<p>[Third fun fact]</p>

Produce ONLY these three <p> elements — nothing more.

5️⃣ **Keep Exploring**  
<h2>Keep Exploring</h2>  
<p>
End with this exact line:  
“CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”
</p>

---

### 🧠 REQUIREMENTS
• 600–700 words (800 if natural and factual)  
• One real cultural reference (artist, artifact, movement, museum, archive)  
• All poetic elements must anchor in **verifiable reality**  
• HTML only — no markdown  

---

### 🧩 OUTPUT FORMAT
Headline: <headline — emotionally engaging, SEO-rich>  

Article:  
<full article using <h2> and <p> tags in the structure above>

SEO:  
<title> — same as headline  
<description> — 150–160 character poetic yet factual snippet ideal for Google  
<keywords> — 7–10 comma-separated long-tail cultural keyword phrases related to ${topic}, ${key}, and its underlying themes  

Hashtags:  
Generate 7–10 relevant hashtags that match the topic and article content.  
Always include:  
#CurioWire and #${key}  
Then add 6–9 dynamic hashtags derived from the article’s cultural motifs — such as artistic movements, rituals, emotional tones, or symbolic concepts.  
Avoid generic terms like #News or #AI.  
Output space-separated.
`;
}

// ============================================================================
// BUILD PRODUCT ARTICLE PROMPT
// ============================================================================
export function buildProductArticlePrompt(topic, key, tone) {
  return `
### 🧬 CATEGORY PROFILE
You are writing in the **${key.toUpperCase()}** category.  
Definition: **Human-made objects, inventions, prototypes, materials, manufacturing, patents, and design histories.**

Everything MUST remain inside this domain:
• inventions and engineering  
• materials and unexpected functions  
• prototypes, failures, breakthroughs  
• cultural and economic ripple effects  
• strange or astonishing historical product origins  

Avoid:
• modern brand marketing  
• consumer reviews  
• unrelated science, geopolitics, or culture  

Your job is to reveal *the unbelievable but true story* behind a human-made object.

---

You are an investigative storyteller for *CurioWire*.  
Your articles blend:
• cinematic imagery  
• emotional tension  
• factual invention history  
• astonishing “hidden truth” revelations  

Your mission:  
Turn a simple object into a **viral curiosity with deep factual roots**.

---

### 🔥 VIRAL OBJECTIVE (PRIORITY OVER SEO)
Your article must feel:
• surprising  
• mind-bending  
• emotionally charged  
• like a forgotten secret of invention history  

Required emotional reactions:
**“Wait… this object did WHAT?”**  
**“How is this not widely known?”**

SEO still matters, but *secondary*.

---

### 🧭 CONTEXT
The concept seed is your thematic spark — NOT the article’s topic.  
It guides mood, symbolism, irony, contrast, or emotional shape.

Concept Seed: "${topic}"  
Category: ${key}  
Tone: ${tone}  
Voice: cinematic, factual, curiosity-driven — like *Wired* + *Atlas Obscura* + *National Geographic History*.

---

### ⚡ STRATEGY (STRICT)
Every article must contain:
• one **astonishing factual twist**  
• one **rarely discussed invention detail**  
• one **human drama or coincidence**  
• one **quantifiable detail** (year, model, measurement, patent no.)  
• one **modern echo**  

Allow *debated interpretations* using safe phrasing:
• “Some engineers argue…”  
• “Records from the workshop suggest…”  
• “One early patent hints that…”  

Never fabricate facts.

---

### ⚡ WOW-FACTOR REQUIREMENT
Mandatory:
The article MUST include one **counterintuitive, surprising, or nearly forgotten truth** about the invention or object.

Examples of acceptable WOW flavor:
• accidental discoveries  
• failed prototypes that reshaped history  
• obscure patents that predate fame  
• objects used in bizarre or unintended ways  
• inventions that caused unintended ripple effects  

Reject:
• common knowledge  
• textbook history  
• marketing language  
• modern influencer/consumer culture  

---

### 🎯 HEADLINE RULES
Write one **cinematic, viral, SEO-optimized headline**:
1. 8–10 words  
2. no colon, dash, or list formatting  
3. evoke transformation, mystery, or rediscovery  
4. include at least one recognizable object/invention keyword  
5. avoid marketing tone  

Approved headline templates:
• “The Forgotten <Object> That Quietly Changed the World”  
• “How a <Tiny/Obscure Tool> Altered Modern Life”  
• “The <Prototype> That Sparked an Unexpected Revolution”  

---

### 🎨 SUBHEADLINE (H2) RULES
Each <h2> must:
• be 5–10 words  
• include a relevant invention keyword  
• feel cinematic, like a documentary segment  
• avoid punctuation at the end  
• vary emotional tone each time (mystery → conflict → meaning)

---

### 🧱 STRUCTURE (STRICT HTML)
Write the article using **valid HTML only** (<h2>, <p>).

1️⃣ **Present Echo**  
<h2>[cinematic subheadline — present → hint of mystery]</h2>  
<p>
Begin with a striking, modern image of the object.  
Include one surprising measurable detail about its current usage or presence.  
End with a tension-building line (but avoid always using the same phrase).  
Examples of varied cues:
• “Yet its origins tell a stranger story.”  
• “But few remember where it truly began.”  
• “Yet the real twist lies buried in history.”  
</p>

2️⃣ **Historical Core**  
<h2>[factual + dramatic subheadline]</h2>  
<p>
Reveal the origin story with cinematic precision.  
Include:
• at least one real inventor  
• one real date  
• one real location  
• one measurable detail (material, patent number, prototype count)  

Highlight conflict:
• accidents  
• disputes  
• failures  
• surprising inspirations  

Explain why this moment is astonishing or rarely known.
</p>

3️⃣ **Timeless Reflection**  
<h2>[subheadline about meaning + influence]</h2>  
<p>
Explain why this invention still matters today.  
Start with a varied linking phrase (rotate structure):
• “Its influence endures in…”  
• “Today, its legacy appears in…”  
• “Modern design still echoes…”  
• “Engineers still borrow from…”  

Connect past → present → enduring insight.  
End with a poetic but factual closing image.
</p>

4️⃣ **Did You Know?**  
<h2>Did You Know?</h2>

Create exactly **3 short, surprising, factual curiosities or fun facts** directly related to the product.

The facts should be about the legacy or influence — adaptations, rediscoveries, modern successors of the product.  
Each should be a standalone micro-fact that adds credibility and wonder.

FORMAT RULES (strict):
- Output must consist of **exactly three <p> elements**, one per fact.  
- **NO lists** of any kind:
  - no <ul>, <ol>, <li>
  - no bullets ("-", "•")
  - no numbering ("1.", "2.", "3.").
- **NO markdown formatting**:
  - no **bold**, no *italic*, no backticks.
- If emphasis is needed, use **HTML only**: <strong>…</strong> or <em>…</em>.  
- Each fact must be 1–2 sentences, concise, standalone, and add meaningful factual depth.  
- Do NOT merge all facts into one paragraph.  
- Do NOT add any explanatory text before or after the three facts.

REQUIRED OUTPUT FORMAT (exact structure):
<p>[First fun fact]</p>
<p>[Second fun fact]</p>
<p>[Third fun fact]</p>

Produce ONLY these three <p> elements — nothing more.

5️⃣ **Keep Exploring**  
<h2>Keep Exploring</h2>  
<p>
End with this exact line:  
“CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”
</p>

6️⃣ **Product Name**  
<p>
At the very end of the article, include this line exactly:  
[Product Name]: <the name of a real, trending, or best-selling product type commonly found on Amazon.com>
</p>

---

### 🧠 REQUIREMENTS
• 600–700 words (800 allowed if naturally driven by facts)  
• Must include one real inventor, one real date, one real location  
• Zero marketing tone  
• HTML only  
• Rhythm: **present → past → insight → micro-curiosities → closure**

---

### 🧩 OUTPUT FORMAT
Headline: <headline — cinematic, factual, SEO-rich>  

Article:  
<full article using <h2> and <p> tags as described above>

SEO:  
<title> — same as headline  
<description> — 150–160 character factual yet cinematic snippet for Google  
<keywords> — 7–10 comma-separated long-tail keyword phrases related to ${topic}, invention, and human ingenuity  

Hashtags:  
Generate 7–10 relevant hashtags matching the topic and article content.  
Always include:  
#CurioWire and #${key}  
Then add 6–9 dynamic hashtags derived from the story’s scientific, cultural, or emotional themes (e.g. invention, progress, resilience, design, innovation, craftsmanship).  
Avoid generic terms like #News or #AI.  
Output space-separated.
`;
}

// 🏷️ AFFILIATE-DEL FOR PRODUCTS
export const affiliateAppendix = `
=== AFFILIATE TASK ===
At the end of your article, include one line in this exact format:
[Product Name]: <the exact name of a real or typical product found on Amazon.com>
Example:
[Product Name]: Swing-A-Way Can Opener
Do NOT include any link.
`;

// ✍️ NATURLIG SLUTT
export const naturalEnding = `
End your article naturally — never include links, calls to action, or explicit modern commentary.
`;

// 🛒 FALLBACK — identifiser relevant produkt for Amazon-søk (v5 — concept-seed + bedre presisjon)
export function buildProductPrompt(title, topic, article) {
  return `
Analyze the following CurioWire article and choose ONE product that satisfies ALL criteria below:

1. It must be **relevant** to the article’s theme or historical object.
2. It must be a **real, physical item** commonly sold on Amazon.
3. It must belong to a category that is **popular, trending, or has high search volume** on Amazon.
4. It must be **appealing or interesting** to a general audience — avoid boring items if a more intriguing option fits.
5. It should be something a reader might realistically want to buy after reading the article.
6. Prefer product types with **broad demand** (tools, gadgets, kits, replicas, historical collectibles, design objects, educational items, etc.)

Return ONLY the product name — no extra text and no punctuation.

Examples of valid outputs:
• "brass compass"
• "mechanical wristwatch"
• "hand-carved wooden puzzle box"
• "vintage-style lantern"
• "retro typewriter"
• "geology sample kit"

Examples of invalid outputs:
• abstract concepts
• fictional objects
• brand-heavy consumer products not relevant to the story

Title: "${title}"
Concept Seed: "${topic}"

Excerpt:
"""${article}"""

Guidelines:
- Choose one clear, **searchable product name or type** (e.g. "antique compass", "typewriter", "film camera", "porcelain teacup").
- It must be something **tangible** that could plausibly be sold, collected, or displayed.
- If the article contains a surprising or lesser-known historical detail linked to a physical object, choose **that** object.
- Avoid abstract ideas (like "freedom", "architecture", or "science") — pick an item.
- Avoid brands unless they are historical and widely known (e.g. Kodak, Singer, Leica).
- Avoid overly modern or niche items unless directly relevant or trending.
- Output only the product name — no explanation, no punctuation.

Example output:
Swing-A-Way Can Opener
`;
}
