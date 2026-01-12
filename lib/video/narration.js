// ============================================================================
// narration.js — CurioWire WOW-Narration Engine
// v7.0 — Dynamic subject-based hooks + WOW storytelling + precise timing
// ============================================================================

import { OpenAI } from "openai";
import { extractDidYouKnow } from "./extractDidYouKnow.js";
import { generateVoiceover, getAudioDuration } from "./audioEngine.js";
import { stripHtml } from "./textUtils.js";
import { parseSummaryNormalized } from "./summaryParser.js";

// ============================================================================
// 0. Utility: clean sentences
// ============================================================================
function clean(str) {
  return stripHtml(str || "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// 1. Extract facts + main fact scoring
// ============================================================================
function buildFactList(article) {
  const html = article.excerpt || "";
  const rawFacts = extractDidYouKnow(html) || [];

  const cleaned = rawFacts
    .map((f) => clean(f))
    .map((f) => f.replace(/^\s*[-•\d.]+\s*/, ""))
    .filter(Boolean);

  if (cleaned.length > 0) return cleaned;

  const fallback =
    clean(article.seo_description) ||
    clean(article.excerpt) ||
    `This article explores ${article.title}.`;

  return [fallback];
}

function scoreFact(fact) {
  const digits = (fact.match(/\d/g) || []).length;
  const emph = (
    fact.match(
      /\b(oldest|first|only|massive|eruption|erupted|billion|million|ancient|mysterious|paradox|impossible|killed|death|extinction|eternal|immortal)\b/gi
    ) || []
  ).length;

  return digits * 10 + emph * 5 + fact.length / 10;
}

function selectMainFact(facts) {
  if (facts.length === 1) return { main: facts[0], supporting: [] };

  let best = facts[0];
  let bestScore = scoreFact(facts[0]);

  for (let i = 1; i < facts.length; i++) {
    const s = scoreFact(facts[i]);
    if (s > bestScore) {
      best = facts[i];
      bestScore = s;
    }
  }

  const supporting = facts.filter((f) => f !== best);
  return { main: best, supporting };
}

// ============================================================================
// 2. NEW: Dynamic subject-based hook generator (v2 — universal viral-first)
// ============================================================================
//
// Goals:
// - Universal (works across categories)
// - High scroll-stop potential (retention-first)
// - Deterministic scoring (no “semantic magic”)
// - Still 100% grounded in MAIN FACT (no new claims)
//
// Strategy:
// 1) Ask for 5 options with strict “viral” constraints (anchor + expectation break + open loop)
// 2) Parse cleanly
// 3) Score options with expanded signals (anchors, contradiction, open loop, clarity, readability)
// 4) Pick best
//
// ============================================================================
async function generateDynamicHook(
  article,
  mainFact,
  contextWhat,
  supportingFacts = []
) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const supportingText = supportingFacts?.length
    ? supportingFacts.join(" ")
    : "No extra facts.";

  const prompt = `
You generate HIGH-RETENTION short-video hooks.

NON-NEGOTIABLE RULES:
- Output EXACTLY 5 options as short bullet points.
- Max 12 words per hook.
- Each hook MUST be based ONLY on the FACTS provided below.
- Do NOT add new facts, numbers, names, places, causes, or conclusions.
- Must be 100% factual and directly supported by the FACTS (Context + Main + Supporting).
- No emojis. No hashtags. No quotes. No “Did you know”.

RETENTION / VIRALITY TARGET:

HARD CONSTRAINTS (non-negotiable):
- The hook MUST explicitly reference the CONTEXT SUBJECT.
- The hook MUST include the MAIN FACT’s strongest concrete anchor
  (number, time, or measurable quantity), if present.

VIRAL OPTIMIZATION GOALS:
Each hook should try to include AT LEAST TWO of the following effects
without inventing facts or adding new information:

1) CONCRETE ANCHOR:
Reference something specific and tangible (e.g., a measurable quantity,
a defined time/era, or a clearly identifiable thing).

2) EXPECTATION BREAK:
Signal that the situation behaves differently than expected or
contradicts common assumptions.

3) CLEAR SUBJECT:
Explicitly name the main object, system, or entity involved.
Avoid vague references.

4) OPEN LOOP:
Imply missing or unresolved information that creates curiosity
without revealing the conclusion.

STYLE:
- Short, punchy, spoken rhythm.
- Low cognitive load.
- Specific > generic.

FACTS (the only allowed sources):
CONTEXT (must be referenced):
"${contextWhat || "No context available."}"

MAIN FACT:
"${mainFact}"

SUPPORTING (optional):
"${supportingText}"

Produce exactly 5 hook options in short bullet points.
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });

  const text = completion.choices?.[0]?.message?.content || "";
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-•\d.]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  // Fallback safety
  if (!lines.length) return String(mainFact).trim().split(".")[0].slice(0, 90);

  // --------------------------------------------------------------------------
  // Deterministic scoring (universal, genre-agnostic)
  // --------------------------------------------------------------------------
  function scoreHook(h) {
    const s = String(h || "").trim();
    const words = s.split(/\s+/).filter(Boolean);
    const len = words.length;

    // 1) Concrete anchors (numbers, units, time/era/place cues)
    const digits = (s.match(/\d/g) || []).length;

    const units = (
      s.match(
        /\b(sec|second|seconds|ms|km|kilometers?|miles?|meters?|cm|mm|years?|days?|hours?|minutes?|percent|%|mph|km\/h|°c|°f|kg|g|tons?|million|billion|trillion)\b/gi
      ) || []
    ).length;

    const timePlaceCue = (
      s.match(
        /\b(in\s+\d{3,4}|century|centuries|decades|today|yesterday|deep|under|inside|across|near|beneath|above|ancient|medieval|modern)\b/gi
      ) || []
    ).length;

    // 2) Expectation break / contradiction signals
    const contrast = (
      s.match(
        /\b(but|yet|however|although|though|despite|instead|except|nevertheless|still|while)\b/gi
      ) || []
    ).length;

    const violation = (
      s.match(
        /\b(shouldn['’]?t|cannot|can['’]?t|impossible|paradox|paradoxical|defies|breaks|violates|contradicts|unexpected|unexplained|counterintuitive|anomaly|anomalous|doesn['’]?t add up|wrong)\b/gi
      ) || []
    ).length;

    // 3) Open loop (curiosity without resolving)
    // Include both direct question forms and "missing piece" phrasing.
    const openLoop = (
      s.match(
        /\b(why|how|until|only|still|the reason|what happened|what makes|no one knew|no one noticed|no one expected)\b/gi
      ) || []
    ).length;

    // 4) Subject clarity (penalize vague pronouns unless other strong anchors exist)
    const vagueSubject = (
      s.match(/\b(this|these|it|they|something|someone)\b/gi) || []
    ).length;

    // 5) Readability penalties (easy to parse in ~0.8s)
    const punctuationPenalty = (s.match(/[,;:()]/g) || []).length;
    const longWordPenalty = words.filter((w) => w.length >= 13).length;

    // Length preference: 7–11 words (universal sweet spot)
    const lenPenalty = Math.abs(len - 9);

    const anchorScore = digits * 10 + units * 6 + timePlaceCue * 4;
    const violationScore = contrast * 6 + violation * 10;
    const openLoopScore = openLoop * 4;

    // Penalize too-vague hooks (but don't kill them if other signals are strong)
    const subjectPenalty = Math.max(0, vagueSubject - 1) * 2;

    const readabilityPenalty = punctuationPenalty * 2 + longWordPenalty * 2;

    return (
      anchorScore +
      violationScore +
      openLoopScore -
      subjectPenalty -
      lenPenalty -
      readabilityPenalty
    );
  }

  // Pick best-scoring hook
  let best = lines[0];
  let bestScore = scoreHook(best);

  for (const h of lines) {
    const s = scoreHook(h);
    if (s > bestScore) {
      best = h;
      bestScore = s;
    }
  }

  return best;
}

// ============================================================================
// 3. NEW: WOW Story Builder (3-sentence structure)
// ============================================================================
async function buildWowStory(article, main, supporting, contextWhat) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const supportingText =
    supporting.length > 0 ? supporting.join(" ") : "No extra facts.";

  const prompt = `
Write a WOW-style narration BODY (WITHOUT the hook).
Format: EXACTLY 3 spoken sentences.

HARD REQUIREMENTS:
- You MUST explicitly reference the CONTEXT subject in sentence 1 or 2.
- You MUST include the MAIN FACT’s key concrete anchor (number/time).
- Sentence 2 MUST include ONE supporting fact if any supporting exists.
- Do NOT invent anything. Use only the facts below.

Sentence 1:
- Start with vivid scene placement using time and/or location.
- Mention the CONTEXT subject clearly.
- Re-state the MAIN FACT in a punchy, amplified way.
- Must be concrete and sensory.

Sentence 2:
- Add context that deepens the surprise.
- Use a rhetorical contrast ("but/yet/however/except") AND include one supporting fact.
- Maintain oral, spoken rhythm.

Sentence 3:
- Give ONE final twist, implication, or consequence.
- Must answer: "Why does this matter right now?"
- End with a cognitive punch, not a summary.

Style rules:
- Vivid but factual.
- Oral, simple, modern language.
- No lists, no disclaimers, no meta.
- Avoid passive voice unless dramatically needed.
- Avoid proper nouns unless they appear in the facts.
- Prefer short clauses and strong verbs.

CONTEXT:
"${contextWhat || "No context available."}"

MAIN FACT:
"${main}"

SUPPORTING:
"${supportingText}"
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.45,
  });

  return clean(completion.choices[0].message.content);
}

// ============================================================================
// 4. Build initial full script (hook + 3-sentence WOW story)
// ============================================================================
async function generateInitialScript(article) {
  const facts = buildFactList(article);
  const { main, supporting } = selectMainFact(facts);

  // NEW: Quick Summary context from Supabase column
  const { what } = parseSummaryNormalized(article.summary_normalized || "");
  const contextWhat =
    clean(what) ||
    clean(article.seo_description) ||
    clean(article.title) ||
    "This story’s core topic";

  const hook = await generateDynamicHook(
    article,
    main,
    contextWhat,
    supporting
  );
  const story = await buildWowStory(article, main, supporting, contextWhat);

  return { hook, story };
}

// ============================================================================
// 5. Rewrite BODY to match target word count
// ============================================================================
async function rewriteStoryToTargetWords(hook, story, targetWords) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
HOOK (do NOT include in answer):
"${hook}"

Rewrite ONLY the BODY below to about ${targetWords} spoken words.
Do NOT restate or mention the hook.

BODY:
"""${story}"""
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25,
  });

  return clean(completion.choices[0].message.content);
}

// ============================================================================
// 6. MICRO ADJUST
// ============================================================================
async function microAdjustStory(hook, story, direction) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt =
    direction === "longer"
      ? `
HOOK:
"${hook}"

Add ONE short spoken sentence to the BODY below.

BODY:
"""${story}"""
`
      : `
HOOK:
"${hook}"

Remove a small non-essential phrase to make the BODY slightly shorter.

BODY:
"""${story}"""
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25,
  });

  return clean(completion.choices[0].message.content);
}

// ============================================================================
// 7. PUBLIC: Simple narration
// ============================================================================
export async function buildNarrationScript(article) {
  const { hook, story } = await generateInitialScript(article);
  return `${hook} ${story}`.trim();
}

// ============================================================================
// 8. PRECISION ENGINE — EXACT 23–25 SECONDS
// ============================================================================
export async function buildTimedNarrationScriptPrecise(
  article,
  targetSeconds = 28
) {
  const MIN = 27;
  const MAX = 29;

  let { hook, story } = await generateInitialScript(article);

  for (let i = 0; i < 10; i++) {
    const full = `${hook} ${story}`;
    const tmp = await generateVoiceover(full);
    const dur = await getAudioDuration(tmp);

    console.log(`⏱️ Pass ${i + 1}: ${dur.toFixed(2)} sec`);

    if (dur >= MIN && dur <= MAX) return full;

    const totalWords = full.split(/\s+/).length;
    const hookWords = hook.split(/\s+/).length;
    const wps = totalWords / dur;
    const targetTotalWords = Math.round(wps * targetSeconds);
    const targetStoryWords = Math.max(6, targetTotalWords - hookWords);

    story = await rewriteStoryToTargetWords(hook, story, targetStoryWords);
  }

  let final = `${hook} ${story}`;
  let preview = await generateVoiceover(final);
  let dur = await getAudioDuration(preview);

  if (dur < MIN) {
    story = await microAdjustStory(hook, story, "longer");
  } else if (dur > MAX) {
    story = await microAdjustStory(hook, story, "shorter");
  }

  return `${hook} ${story}`.trim();
}
