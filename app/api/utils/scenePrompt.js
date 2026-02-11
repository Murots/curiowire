// // ============================================================================
// // scenePrompt.js — CurioWire (UNIVERSAL SCENE PROMPT)
// // Goal: ONE cinematic text-to-video scene prompt (visuals only)
// // STRICT: do not invent facts beyond provided text
// // ============================================================================

// export async function generateScenePrompt({
//   openai,
//   title = "",
//   category = "",
//   video_script = "",
//   card_text = "",
// }) {
//   const safeTitle = String(title || "").trim();
//   const safeCat = String(category || "").trim();
//   const safeVideo = String(video_script || "").trim();
//   const safeCard = String(card_text || "").trim();

//   const sourceText = safeVideo || safeCard;
//   if (!sourceText) return null;

//   const prompt = `
// Write ONE cinematic text-to-video prompt (visuals only).

// SOURCE (only truth):
// Title: "${safeTitle}"
// Category: "${safeCat}"
// Text:
// ${sourceText}

// RULES:
// - Use ONLY details stated or directly implied above. Never invent.
// - Make it specific: include 2–4 concrete visual anchors found in the text (e.g., setting, key object, action, person type, time-of-day, mood).
// - If the text lacks specifics, keep it generic and plausible.
// - NO on-screen text anywhere (no signs, screens, labels, captions).
// - Must include exactly: "vertical 9:16, no text, no subtitles, no logos"
// - Output EXACTLY ONE line, 18–32 words.
// - Include: subject, setting, lighting, camera motion, atmosphere.

// Return ONLY the one-line scene prompt.
// `.trim();

//   const resp = await openai.chat.completions.create({
//     model: process.env.SCENE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.4,
//   });

//   const scene = resp.choices[0]?.message?.content?.trim();
//   if (!scene || scene.length < 20) return null;

//   // Ensure it's a single line
//   return scene.replace(/\s*\n+\s*/g, " ").trim();
// }
// ============================================================================
// scenePrompt.js — CurioWire (UNIVERSAL 2-STAGE SCENE PROMPT)
// v2.0 — Text → Visual Scene → Final Pika Prompt
// Goal: cinematic, stable, non-generic, universal
// ============================================================================

export async function generateScenePrompt({
  openai,
  title = "",
  category = "",
  video_script = "",
  card_text = "",
}) {
  const safeTitle = String(title || "").trim();
  const safeCat = String(category || "").trim();
  const safeVideo = String(video_script || "").trim();
  const safeCard = String(card_text || "").trim();

  const sourceText = safeVideo || safeCard;
  if (!sourceText) return null;

  // ==========================================================================
  // STEP 1 — VISUAL SCENE BLUEPRINT (internal)
  // ==========================================================================

  const blueprintPrompt = `
You are a visual director.

Your job: imagine ONE simple cinematic scene that represents the story.

SOURCE:
Title: "${safeTitle}"
Category: "${safeCat}"
Text:
${sourceText}

RULES:
- Do NOT invent new factual events.
- Convert the idea into a visually clear metaphor.
- ONE location only.
- ONE subject focus only.
- ONE continuous action loop (drifting, walking, hovering, unfolding, slow camera push).
- Keep it simple and filmable.

OUTPUT FORMAT (exactly 1 sentence):
Scene: <one concrete visual scene description>
`.trim();

  const blueprintResp = await openai.chat.completions.create({
    model: process.env.SCENE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: blueprintPrompt }],
    temperature: 0.5,
  });

  const blueprintRaw = blueprintResp.choices[0]?.message?.content?.trim() || "";

  const blueprint = blueprintRaw
    .replace(/^Scene:\s*/i, "")
    .replace(/\s*\n+\s*/g, " ")
    .trim();

  if (!blueprint || blueprint.length < 15) return null;

  // ==========================================================================
  // STEP 2 — CONVERT BLUEPRINT → FINAL VIDEO PROMPT
  // ==========================================================================

  const finalPrompt = `
You write text-to-video prompts for cinematic AI generation.

BASE SCENE:
"${blueprint}"

RULES:
- Output EXACTLY ONE line, 26–38 words.
- Must describe: subject + setting + lighting + gentle motion.
- The subject must remain consistent and recognizable throughout the clip.
- Must enforce: single continuous shot, no cuts, no morphing.
- Must include EXACTLY:
"no text, no letters, no numbers, no symbols, no UI overlays, no watermarks, no logos"

Return ONLY the final one-line video prompt.
`.trim();

  const finalResp = await openai.chat.completions.create({
    model: process.env.SCENE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: finalPrompt }],
    temperature: 0.35,
  });

  const scene = finalResp.choices[0]?.message?.content?.trim() || null;

  if (!scene || scene.length < 20) return null;

  return scene.replace(/\s*\n+\s*/g, " ").trim();
}
