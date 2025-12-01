// ============================================================================
// narration.js — CurioWire WOW-Narration Engine
// v7.0 — Dynamic subject-based hooks + WOW storytelling + precise timing
// ============================================================================

import { OpenAI } from "openai";
import { extractDidYouKnow } from "./extractDidYouKnow.js";
import { generateVoiceover, getAudioDuration } from "./audioEngine.js";
import { stripHtml } from "./textUtils.js";

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
// 2. NEW: Dynamic subject-based hook generator
// ============================================================================
async function generateDynamicHook(article, mainFact) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
You generate TikTok-style hooks.
RULES:
- Maximum 12 words.
- Must be based ONLY on the MAIN FACT.
- Must highlight the SUBJECT + the WOW element.
- Must NOT be generic, must be specific.
- Must be surprising.
- Must be 100% factual and grounded in the fact.

MAIN FACT:
"${mainFact}"

Produce exactly 5 hook options in short bullet points.
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });

  const text = completion.choices[0].message.content;
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-•\d.]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  // Scoring: prefer shorter, specific, surprising
  function scoreHook(h) {
    const len = h.split(/\s+/).length;
    const wow = (
      h.match(
        /\b(ever|never|impossible|secret|hidden|eternal|ancient|mysterious|strange)\b/i
      ) || []
    ).length;
    const subject = (h.match(/\b(this|these|the)\b/i) || []).length;

    return wow * 10 + subject * 3 - Math.abs(len - 10);
  }

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
async function buildWowStory(article, main, supporting) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const supportingText =
    supporting.length > 0 ? supporting.join(" ") : "No extra facts.";

  const prompt = `
Write a WOW-style narration BODY (WITHOUT the hook).
Format: EXACTLY 3 spoken sentences.

Sentence 1:
- Start with a vivid “scene placement” using time and/or location.
- Re-state the main fact in a punchy, amplified way.
- Must be concrete and sensory.

Sentence 2:
- Add context that deepens the surprise.
- Use either a rhetorical “but” / “yet” / “except” / “however” OR contrast.
- Maintain oral, spoken rhythm.

Sentence 3:
- Give ONE final twist, implication, or consequence.
- Must answer: “Why does this matter right now?”
- End with a cognitive punch, not a summary.

Style rules:
- Vivid but factual.
- Oral, simple, modern language.
- No lists, no disclaimers, no meta.
- Avoid passive voice unless dramatically needed.

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

  const hook = await generateDynamicHook(article, main);
  const story = await buildWowStory(article, main, supporting);

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
  targetSeconds = 29
) {
  const MIN = 28;
  const MAX = 30;

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
