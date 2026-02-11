// ============================================================================
// narration.js — CurioWire Narration (v8.0)
// NEW: video_script-first + precise timing (28s target) for curiosity_cards
// - Uses article.video_script as base (already written upstream)
// - ONLY job here: clean → tune to target duration (no “did you know” extraction)
// - Keeps old exports for backward compatibility where reasonable
// ============================================================================

import { OpenAI } from "openai";
import { generateVoiceover, getAudioDuration } from "./audioEngine.js";
import { stripHtml } from "./textUtils.js";

// ============================================================================
// 0. Utility: clean spoken text
// ============================================================================

function clean(str) {
  return stripHtml(str || "")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

// ============================================================================
// 1. Core: rewrite a draft to target spoken word count (NO NEW FACTS)
// ============================================================================

async function rewriteToTargetWords(draft, targetWords) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const safeDraft = clean(draft);

  const prompt = `
Rewrite the voiceover text to about ${targetWords} spoken words.

HARD RULES:
- Preserve the SAME facts and meaning.
- Do NOT add new facts, numbers, names, places, causes, or conclusions.
- Do NOT introduce claims not present in the original.
- Keep it natural spoken English.
- Keep the same overall tone.
- No headings, no lists, no emojis, no quotes.

VOICEOVER (source of truth):
"""${safeDraft}"""
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return clean(completion.choices?.[0]?.message?.content || safeDraft);
}

// Small “nudge” if we’re barely off after iterations
async function microAdjust(draft, direction) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const safeDraft = clean(draft);

  const prompt =
    direction === "longer"
      ? `
Add ONE short spoken sentence to the end of this voiceover.

RULES:
- Do NOT add new facts, numbers, names, places, or causes.
- Only rephrase or slightly elaborate what is already implied.
- Keep it punchy and spoken.

VOICEOVER:
"""${safeDraft}"""
`.trim()
      : `
Remove a small non-essential phrase to make this voiceover slightly shorter.

RULES:
- Do NOT remove key facts.
- Keep it coherent and spoken.

VOICEOVER:
"""${safeDraft}"""
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return clean(completion.choices?.[0]?.message?.content || safeDraft);
}

// ============================================================================
// 2. PUBLIC: build narration directly from the saved draft (video_script)
// ============================================================================

/**
 * buildNarrationScript(article)
 * Simple: returns cleaned video_script (or a safe fallback)
 */
export async function buildNarrationScript(article) {
  const base =
    clean(article?.video_script) ||
    clean(article?.seo_description) ||
    clean(article?.card_text) ||
    `This story is about ${clean(article?.title) || "a surprising topic"}.`;

  return base;
}

/**
 * buildTimedNarrationFromDraft(article, targetSeconds=28)
 * Precision engine:
 * - Start from article.video_script
 * - Generate TTS preview → measure duration
 * - Rewrite to target word count until duration is within window
 */
export async function buildTimedNarrationFromDraft(
  article,
  targetSeconds = 23,
) {
  const MIN = Math.max(1, targetSeconds - 1);
  const MAX = targetSeconds + 1;

  let text =
    clean(article?.video_script) ||
    clean(article?.seo_description) ||
    clean(article?.card_text) ||
    `This story is about ${clean(article?.title) || "a surprising topic"}.`;

  // If script is extremely short, don’t overthink — let rewrite expand
  if (countWords(text) < 10) {
    text = `Here’s what happened: ${text}`;
  }

  for (let i = 0; i < 8; i++) {
    const tmp = await generateVoiceover(text);
    const dur = await getAudioDuration(tmp);

    console.log(`⏱️ Timing pass ${i + 1}: ${dur.toFixed(2)} sec`);

    if (dur >= MIN && dur <= MAX) return text;

    const words = countWords(text);
    const wps = words / Math.max(0.1, dur);
    const targetWords = Math.max(18, Math.round(wps * targetSeconds));

    text = await rewriteToTargetWords(text, targetWords);
  }

  // Final micro adjust
  {
    const tmp = await generateVoiceover(text);
    const dur = await getAudioDuration(tmp);

    if (dur < MIN) text = await microAdjust(text, "longer");
    else if (dur > MAX) text = await microAdjust(text, "shorter");
  }

  return text;
}

// ============================================================================
// 3. BACKWARD COMPAT EXPORT (kept name)
//    Some older code may call this. We map it to the new behavior.
// ============================================================================

export async function buildTimedNarrationScriptPrecise(
  article,
  targetSeconds = 23,
) {
  return buildTimedNarrationFromDraft(article, targetSeconds);
}
