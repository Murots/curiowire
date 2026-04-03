// ============================================================================
// app/api/utils/articlePlannerPrompt.js — CurioWire vNext (EDITORIAL PLANNER)
// Goal: Decide the best article form BEFORE writing.
// Style: short, universal, no randomness.
// Output: strict JSON only.
// ============================================================================

export function buildArticlePlannerPrompt({
  topic,
  category,
  factualFrame = "",
}) {
  const safe = (v) => String(v || "").trim();

  return `
You are an editorial planner.

TASK
Decide the best article form for this topic before writing.

PRIORITY
Choose what best fits the specific topic, not what sounds most dramatic.

INPUT
Category: ${safe(category)}
Topic: ${safe(topic)}
FactualFrame: ${safe(factualFrame) || "(none)"}

DECIDE:
- opening_style
- body_style
- explanation_style
- insight_style
- ending_style
- tone_style
- pacing_style
- angle
- avoid

FIELD RULES
opening_style:
- direct
- scene
- compressed_curiosity
- contrast

body_style:
- event_first
- explanation_first
- object_first
- condition_then_event
- list_escalation
- concept_then_example

explanation_style:
- sparse
- balanced
- explanation_heavy

insight_style:
- rarity
- scale
- misconception
- consequence
- context
- none

ending_style:
- hard_fact
- minimal
- unresolved
- concrete_implication

tone_style:
- restrained
- grave
- eerie
- matter_of_fact
- vivid

pacing_style:
- brisk
- steady
- mixed

angle:
- one short sentence stating what makes this article interesting

avoid:
- array of short instructions like:
  ["avoid hype","avoid vague reflection","avoid poetic ending"]

RULES
- Pick the most natural form for THIS topic.
- Do not optimize for clickbait.
- Prefer directness over fluff.
- Use scene only if the topic naturally supports it.
- Use unresolved ending only if unresolvedness is central.
- Use list_escalation only if the topic is clearly a list article.
- Keep "angle" concrete, not abstract.
- Keep "avoid" short and useful.

OUTPUT
Return ONLY valid JSON in this exact shape:

{
  "opening_style": "",
  "body_style": "",
  "explanation_style": "",
  "insight_style": "",
  "ending_style": "",
  "tone_style": "",
  "pacing_style": "",
  "angle": "",
  "avoid": ["", "", ""]
}
`.trim();
}
