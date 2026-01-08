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
export function buildArticlePrompt(topic, key, tone, factualFrame) {
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

• What part of the factual frame makes people say “NO WAY—BUT TRUE”?  
• What contrast or paradox hits hardest emotionally?  
• What image or moment at the start would make someone stop scrolling?  
• Which part lends itself to short-form clips (TikTok/Shorts)?

The opening must lean into **unbelievable-but-true energy** without exaggeration.

You may use cautiously phrased references to **unexplained or debated phenomena**, using language like:
“records describe…”, “researchers still debate…”, “some propose…”.

Never present speculation as fact.

---

### 🔬 FACTUAL RESEARCH FRAME (MUST BE FOLLOWED)
Use this factual frame as the ONLY source of factual grounding:

${factualFrame}

You may:
✔ expand it narratively  
✔ create emotional atmosphere  
✔ interpret the implications  

You may NOT:
✘ introduce new factual claims  
✘ contradict the frame  
✘ add external information not implied by the frame  

---

### ⚓ ANCHOR NAMING RULE (STRICT)
The anchor must be explicitly named or unmistakably referenced in the first 1–2 paragraphs of the article.
It must appear in the Opening Hook section.
Name the anchor clearly (dataset/archive/study/site/object), not vaguely as “research” or “records”.
Do not delay the anchor reveal.

---

### 🔍 SEO OBJECTIVES (SECONDARY PRIORITY)
SEO should support the story, not dominate it.

The article must:
• include evergreen long-tail keywords related to "${topic}"  
• You may add supporting real-world references ONLY if they are explicitly present or clearly implied by the factual research frame.
• include one quantifiable detail (year, distance, percentage, measurement) ONLY if present or clearly implied by the factual research frame (otherwise omit)
• contain one sentence early that could function as a Google snippet

BUT:  
Emotional impact and curiosity come first.

---

### 🧭 CONTEXT
Do NOT treat the concept as news.  
Treat it as a **signal** pointing toward the emotional tone and narrative contrast.

The core requirement:
Use the concept seed only to shape the emotional tone and narrative contrast. All factual content must come from the factual research frame.

Concept Seed: "${topic}"  
Category: ${key}  
Tone: ${tone}

Voice model: **BBC Future × Atlas Obscura × Popular Science**, but punchier.

---

### 🎯 STRATEGY
- Expand the provided factual research frame into a vivid, surprising narrative.  
- Do NOT invent new factual claims — all factual grounding must come from the research frame.  
- Write in cinematic, emotionally engaging language anchored in facts.  
- Explain **why this truth matters**, not just what happened.  
- Build clear thematic resonance between the seed and the factual research frame.  
- Use short, fast-paced sentences where appropriate for rhythm.  
- Include at least one proper noun ONLY if present or clearly implied by the factual research frame (otherwise omit).  
- Never fabricate details — use cautious language where needed.  
- End with thought-provoking wonder, not a conclusion.

⚡ **WOW REQUIREMENT**  
Highlight the rare or counterintuitive character already inherent in the factual research frame, that genuinely produces a “WOW—this is real?” reaction.

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
Start with a cinematic line inspired by the concept seed and immediately anchor the opening in the factual research frame.  
Deliver one concrete factual detail immediately.  
End with a question or tension-setting hint.
Do NOT use the examples literally — generate your own phrasing.
</p>

2️⃣ **Revealing the Hidden Truth**  
<h2>[subheadline capturing astonishment + keywords]</h2>  
<p>
This is the core (≈50% of the article).  
Expand the factual frame (field, anchor, note, theme phrase) into a rich explanatory narrative.  
You may add context, but avoid adding new factual claims not supported by the frame.  
Explain why this was shocking, overlooked, or misunderstood.  
Link clearly to the concept seed’s emotional theme.
</p>

3️⃣ **Why It Still Matters Today**  
<h2>[subheadline about meaning + modern relevance]</h2>  
<p>
Explain the modern echo of the event.  
Use one real modern study, figure, or example ONLY if compatible with the factual frame.  
Deliver an emotional insight that reframes the story.  
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
• Length: Minimum 600–700 words (aim for 800 if natural)  
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
export function buildCulturePrompt(topic, key, tone, factualFrame) {
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

### 🔬 FACTUAL RESEARCH FRAME (STRICT)
Use this factual frame as the **only source** of factual content:

${factualFrame}

You may:
✔ expand it narratively  
✔ create sensory atmosphere  
✔ highlight symbolism implied by the frame  

You may NOT:
✘ invent new facts  
✘ contradict the frame  
✘ import unrelated historical material  

All factual grounding MUST come from the frame and nowhere else.

---

### ⚓ ANCHOR NAMING RULE (STRICT)
The anchor must be explicitly named or unmistakably referenced in the first 1–2 paragraphs.
It must appear in the Opening Scene section.
Name the anchor clearly (artifact, archive, exhibition, tradition, site, etc.), not as a vague “sources say”.
Do not delay the anchor reveal.

---

### 🧭 CONTEXT
You are NOT writing an opinion piece.  
You are NOT writing a generic cultural essay.

Use the concept seed as a **symbolic spark**, shaping tone, imagery, and emotional contrast — NOT as a source of facts.

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
- Anchor every image in **verifiable cultural or historical detail from the factual frame**.  
- Reveal layers of meaning like a museum curator unveiling a hidden artifact.  
- Use short, rhythmic sentences optimized for mobile reading.  
- Deliver **at least one WOW-moment**: a rare, surprising cultural fact already present or implied in the factual frame.  
- Maintain the rhythm:  
  **image → fact → meaning → wonder**  

⚡ **WOW-FACTOR REQUIREMENT**  
You MUST include at least one *counterintuitive, forgotten, or mind-bending* cultural detail that arises naturally from the factual frame.  
Nothing fictional. Nothing speculative.

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
Open with a sensory image rooted in a real artifact, place, or moment from the factual research frame.  
Include one datable element (century, region, period).  
Hint at a hidden meaning waiting to be revealed.  
End with a line that creates emotional tension or curiosity.
</p>

2️⃣ **Historical Core**  
<h2>[Generate a poetic, factual subheadline]</h2>  
<p>
Reveal the real cultural story entirely from the factual frame.  
Include names, dates, objects, rituals, or movements only if they appear or are implied in the frame.  
Use sensory detail + factual precision.  
Tie the story to a universal human theme (memory, identity, loss, rebirth).  
Deliver the WOW-fact here — a surprising but verifiable cultural detail grounded in the frame.
</p>

3️⃣ **Modern Echo**  
<h2>[Generate a reflective subheadline]</h2>  
<p>
Explain why the tradition or artifact still matters today.  
Start with a linking sentence (“Its echo remains because…”).  
Relate the story to modern cultural habits, art, or identity, without adding new historical facts.  
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
• Minimum 600–700 words (800 if natural and factual)  
• One real cultural reference (artist, artifact, movement, museum, archive) ONLY if present in the factual frame  
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
export function buildProductArticlePrompt(topic, key, tone, factualFrame) {
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

### 🔬 FACTUAL RESEARCH FRAME (STRICT)
Use the following frame as the **sole factual foundation** for the article:

${factualFrame}

Rules:
✔ You may expand the frame narratively  
✔ You may describe sensory detail, mood, texture, conflict  
✔ You may add emotional emphasis and thematic framing  

But you may NOT:
✘ introduce new historical facts  
✘ name new inventors, dates, locations, materials not present or implied in the frame  
✘ contradict the frame in any way  

All factual content MUST come from the research frame.

---

### ⚓ ANCHOR NAMING RULE (STRICT)
The anchor must be explicitly named or unmistakably referenced in the first 1–2 paragraphs.
It must appear in the Present Echo section.
Name the anchor clearly (patent, prototype, workshop, artifact, catalog, etc.), not as a vague “historical records”.
Do not delay the anchor reveal.

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
The concept seed shapes:
• mood  
• symbolism  
• contrast  
• emotional tone  

NOT factual content.

Concept Seed: "${topic}"  
Category: ${key}  
Tone: ${tone}  
Voice: cinematic, factual, curiosity-driven — like *Wired* + *Atlas Obscura* + *National Geographic History*.

---

### ⚡ STRATEGY (STRICT)
Every article must contain:
• one **astonishing factual twist** grounded in the factual frame  
• one **rarely discussed invention detail** from the frame  
• one **human drama or coincidence** only if implied in the frame  
• one **quantifiable detail** (year, model, measurement, patent number)  
• one **modern echo** rooted in factual implications  

Allow *debated interpretations* using safe phrasing:
• “Some engineers argue…”  
• “Records from the workshop suggest…”  
• “One early patent hints that…”  

Never fabricate facts.

---

### ⚡ WOW-FACTOR REQUIREMENT
Mandatory:
Include one **counterintuitive, surprising, or nearly forgotten truth** about the object or invention — already present, implied, or inferable from the factual frame.

Acceptable WOW directions:
• accidental discoveries  
• failures leading to breakthroughs  
• obscure prototypes  
• materials used in bizarre ways  
• unintended consequences  

Reject:
• common knowledge  
• textbook history  
• marketing language  
• invented anecdotes  

---

### 🎯 HEADLINE RULES
Write one **cinematic, viral, SEO-optimized headline**:
1. 8–10 words  
2. no colon, dash, or list formatting  
3. evoke transformation, mystery, or rediscovery  
4. include at least one recognizable object/invention keyword  
5. avoid marketing tone  

Examples:
• “The Forgotten <Object> That Quietly Changed the World”  
• “How a <Tiny/Obscure Tool> Altered Modern Life”  
• “The <Prototype> That Sparked an Unexpected Revolution”  

---

### 🎨 SUBHEADLINE (H2) RULES
Each <h2> must:
• be 5–10 words  
• contain an invention-relevant keyword  
• feel cinematic  
• avoid punctuation  
• vary emotional tone  

---

### 🧱 STRUCTURE (STRICT HTML)
Use **valid HTML only** (<h2>, <p>).

---

1️⃣ **Present Echo**  
<h2>[cinematic subheadline — present → hint of mystery]</h2>  
<p>
Begin with a striking, modern image of the object that aligns with the factual frame.  
Include one surprising measurable detail about its present influence or presence.  
End with a tension-building line (vary phrasing each time).
</p>

---

2️⃣ **Historical Core**  
<h2>[factual + dramatic subheadline]</h2>  
<p>
Reveal the origin story strictly from the factual frame.  
Include:
• at least one real inventor (if present in the frame)  
• one real date  
• one real location  
• one measurable detail (material, patent number, prototype count)  

Highlight conflict ONLY if implied:
• accidents  
• failures  
• disputed ideas  
• unexpected breakthroughs  

Explain why this moment is astonishing or rarely known.
</p>

---

3️⃣ **Timeless Reflection**  
<h2>[subheadline about meaning + influence]</h2>  
<p>
Explain why the invention still matters today.  
Link past → present using only implications allowed by the factual frame.  
End with a poetic but factual closing image.
</p>

---

4️⃣ **Did You Know?**  
<h2>Did You Know?</h2>

Create exactly **3 short, surprising, factual curiosities or fun facts** directly related to the product.

The facts should relate to legacy, influence, rediscoveries, or modern echoes consistent with the frame.

FORMAT RULES (strict):
- Exactly **three <p> elements**  
- No lists, no bullets, no numbering  
- No markdown  
- 1–2 standalone sentences each  
- Must add meaningful depth  

REQUIRED OUTPUT FORMAT:
<p>[First fun fact]</p>  
<p>[Second fun fact]</p>  
<p>[Third fun fact]</p>

ONLY these three paragraphs.

---

5️⃣ **Keep Exploring**  
<h2>Keep Exploring</h2>  
<p>
End with this exact line:  
“CurioWire continues to uncover the world’s hidden histories — one curiosity at a time.”
</p>

---

6️⃣ **Product Name**  
<p>
At the very end of the article, include this line exactly:  
[Product Name]: <the name of a real, trending, or best-selling product type commonly found on Amazon.com>
</p>

---

### 🧠 REQUIREMENTS
• Minimum 600–700 words (800 allowed if natural)  
• Must include one real inventor, one real date, one real location — ONLY if present in the factual frame  
• Zero marketing tone  
• HTML only  
• Rhythm: **present → past → insight → curiosities → closure**  

---

### 🧩 OUTPUT FORMAT
Headline: <headline — cinematic, factual, SEO-rich>  

Article:  
<full article using <h2> and <p> tags as described>

SEO:  
<title> — same as headline  
<description> — 150–160 character factual yet cinematic snippet for Google  
<keywords> — 7–10 long-tail keywords tied to ${topic}, invention, ingenuity  

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
[Product Name]: <the name of a real, trending, or best-selling product type commonly found on Amazon.com>
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
