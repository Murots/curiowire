// ============================================================================
// scenePrompt.js — CurioWire (UNIVERSAL 2-STAGE SCENE PROMPT)
// v3.3 — Text → Visual Scene → Final Video Prompt
// Goal: cinematic, stable, slowdown-friendly, high-retention
//
// Model strategy:
// - STEP 1 (visual thinking): GPT-5.4
// - STEP 2 (tight formatting): GPT-5.4-mini
// Fallbacks kept env-configurable.
// ============================================================================

function getCategoryContext(category) {
  switch (category) {
    case "science":
      return "Treat the scene with clarity, physical plausibility, and an observational tone.";
    case "technology":
      return "Treat the scene with precision, material realism, and a contemporary tone.";
    case "space":
      return "Treat the scene with scale, depth, stillness, and atmospheric realism.";
    case "nature":
      return "Treat the scene with ecological coherence, organic life, and environmental presence.";
    case "health":
      return "Treat the scene with human relevance, credibility, calm intensity, and embodied realism.";
    case "history":
      return "Treat the scene with material authenticity, temporal atmosphere, and grounded realism.";
    case "culture":
      return "Treat the scene with social texture, symbolic weight, and respectful realism.";
    case "sports":
      return "Treat the scene with physical focus, controlled intensity, and bodily realism.";
    case "world":
      return "Treat the scene with place-based realism, public atmosphere, and real-world weight.";
    case "crime":
      return "Treat the scene with restraint, tension, and grounded realism rather than spectacle.";
    case "mystery":
      return "Treat the scene with ambiguity, atmosphere, and gradual visual revelation.";
    default:
      return "Treat the scene with grounded cinematic realism.";
  }
}

export async function generateScenePrompt({
  openai,
  title = "",
  category = "",
  video_script = "",
  card_text = "",
}) {
  const safeTitle = String(title || "").trim();
  const safeCat = String(category || "")
    .trim()
    .toLowerCase();
  const safeVideo = String(video_script || "").trim();
  const safeCard = String(card_text || "").trim();

  // products should never generate video scenes
  if (safeCat === "products") return null;

  const sourceText = safeVideo || safeCard;
  if (!sourceText) return null;

  const blueprintModel = process.env.SCENE_BLUEPRINT_MODEL || "gpt-5.4";
  const finalModel = process.env.SCENE_FORMAT_MODEL || "gpt-5.4-mini";

  const categoryContext = getCategoryContext(safeCat);

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

CATEGORY CONTEXT:
- ${categoryContext}

RULES:
- Do NOT invent new factual events.
- Convert the core idea into a visually clear scene or metaphor.
- Use ONE location only.
- Keep ONE main subject focus.
- Create ONE continuous cinematic moment only.
- The action does NOT need to loop back to the beginning.
- The scene should evolve naturally over the shot without abrupt changes.
- Prefer slow actions like drifting, watching, walking slowly, breathing, swaying, unfolding, floating, gliding, or a gentle camera push.
- The scene must feel naturally slow, as if time is slightly stretched.
- Include subtle environmental motion such as wind, particles, fabric, water, light, dust, mist, smoke, drifting debris, or atmospheric shimmer.
- Prefer human presence when appropriate, even if minimal, partial, distant, or silhouetted.
- Avoid static objects with no life or motion.
- Avoid busy action, chaos, fast movement, or multiple competing subjects.
- Keep it simple, cinematic, stable, and filmable.

OUTPUT FORMAT (exactly 1 sentence):
Scene: <one concrete visual scene description>
`.trim();

  const blueprintResp = await openai.chat.completions.create({
    model: blueprintModel,
    messages: [{ role: "user", content: blueprintPrompt }],
    temperature: 0.45,
  });

  const blueprintRaw =
    blueprintResp.choices?.[0]?.message?.content?.trim() || "";

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

CATEGORY:
"${safeCat}"

CATEGORY CONTEXT:
"${categoryContext}"

BASE SCENE:
"${blueprint}"

RULES:
- Output EXACTLY ONE line, 26–38 words.
- Must describe: main subject, setting, lighting, and gentle motion.
- The main subject must remain consistent and recognizable throughout the clip.
- Must feel natural when slowed down to half speed.
- Must include layered motion: subject motion, environmental motion, and subtle camera motion.
- Must enforce a single continuous shot, with no cuts, no morphing, no transformation.
- Must feel like a real continuous moment, not a repeated loop.
- The motion should progress naturally from start to end.
- Prefer subtle human or organic movement when appropriate.
- Keep the image stable, cinematic, and visually coherent.
- Must match the category context without becoming generic or overly literal.
- Must include EXACTLY this phrase at the end:
no text, no letters, no numbers, no symbols, no UI overlays, no watermarks, no logos

Return ONLY the final one-line video prompt.
`.trim();

  const finalResp = await openai.chat.completions.create({
    model: finalModel,
    messages: [{ role: "user", content: finalPrompt }],
    temperature: 0.25,
  });

  const scene = finalResp.choices?.[0]?.message?.content?.trim() || null;

  if (!scene || scene.length < 20) return null;

  return scene.replace(/\s*\n+\s*/g, " ").trim();
}
