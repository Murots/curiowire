// // ============================================================================
// // CATEGORY DEFINITIONS — Master semantic definitions for ALL categories
// // Used by: prompts.js, linkedHistoricalStory, seed generators, etc.
// // ============================================================================

// export const CATEGORY_DEFINITIONS = {
//   space:
//     "All content related to the universe beyond Earth: stars, planets, galaxies, cosmic physics, space phenomena, exoplanets, black holes, cosmic timelines.",

//   science:
//     "Evidence-based natural science focused on the fundamental mechanisms of the physical world: biology of non-human organisms at the molecular, cellular, or evolutionary scale; chemistry, physics, geology, climate systems, environmental processes, planetary science, and empirical research that explains how natural phenomena work. This category excludes human health, excludes psychology, excludes medicine, and excludes descriptive wildlife storytelling such as animal behavior, migrations, or ecological scenes.",

//   history:
//     "Past events, civilizations, discoveries, ancient cultures, wars, timelines, historical phenomena, archaeology, myths connected to real history.",

//   world:
//     "Geopolitics, wars, diplomacy, global power structures, borders, nations, international relations, conflict zones, political systems, societal shifts.",

//   nature:
//     "Descriptive and behavioral content about the natural world: animals, plants, ecosystems, survival strategies, biomes, migrations, habitats, food chains, natural phenomena, and the lived experience of wildlife. Focus on observable nature, not laboratory research or scientific mechanism explanations. This category excludes advanced natural science, chemistry, physics, and climate research.",

//   technology:
//     "Human-made technology: machines, AI, digital systems, inventions, engineering, communication systems, algorithms, robotics, innovation.",

//   culture:
//     "Art, language, rituals, traditions, symbols, music, cultural evolution, heritage, identity, shared beliefs.",

//   sports:
//     "Remarkable stories and events from the world of sports: historic competitions, legendary athletes, unexpected victories, psychological turning points, iconic matches, forgotten records, and unusual moments that shaped sporting history. Focus on narrative-driven accounts of competition and achievement, not training science, injury treatment, or human physiology. This category excludes health-related topics, excludes exercise science, and excludes general historical events unrelated to sport.",

//   products:
//     "Consumer products, materials, inventions, manufacturing methods, patents, design oddities, product origins.",

//   health:
//     "All content centered on human physical and mental well-being: human biology, nutrition, disease mechanisms, medicine, epidemiology, public health systems, psychological research, physiology, longevity, sleep, exercise science, immune function, and evidence-based insights into how the human body and mind work. This category excludes general biology, ecology, animal physiology, and any research not focused on humans.",
// };

// ============================================================================
// CATEGORY DEFINITIONS — CurioWire v4.0 Frontier Realism Edition
// Master semantic boundaries for ALL categories.
// These definitions govern:
// • concept generation
// • seed filtering
// • article steering
// • duplication checks
// • factual anchoring
// ============================================================================

export const CATEGORY_DEFINITIONS = {
  // --------------------------------------------------------------------------
  // 🚀 SPACE — Astronomical anomalies, deep-time signals, cosmic puzzles
  // --------------------------------------------------------------------------
  space: `
Space phenomena beyond Earth: extreme stellar behaviour, black holes, 
exoplanet anomalies, orbital oddities, cosmic radiation events, unexplained 
astronomical signals, deep-space transitions, early-universe mysteries,
rare orbital coincidences, and dramatic celestial dynamics.

Excludes:
• geology or atmospheric phenomena on Earth (Science/Nature)
• geopolitical aspects of space programs (World)
`,

  // --------------------------------------------------------------------------
  // 🔬 SCIENCE — Physical & biological frontier mechanisms
  // --------------------------------------------------------------------------
  science: `
Mechanisms of the natural world involving physical, chemical, geological, 
or molecular forces, including rare edge-case physics, unexpected chemical 
behaviour, odd materials, unexplained natural patterns, extreme microbial traits,
and surprising empirical results.

Includes:
• frontier biology (non-human)
• extreme environments
• unexplained lab results (when real)

Excludes:
• human psychology or physiology (Health)
• animal behaviour narratives (Nature)
• cosmic-scale phenomena (Space)
`,

  // --------------------------------------------------------------------------
  // 🏺 HISTORY — Forgotten power struggles, archaeological anomalies
  // --------------------------------------------------------------------------
  history: `
Past civilizations, hidden political intrigue, forgotten conflicts, strange 
archeological discoveries, anomalous artifacts, unexplained historical events,
lost maps, rediscovered technologies, ancient engineering puzzles, and buried 
narratives that challenge the accepted record.

Emphasizes:
• intrigue
• unsolved questions
• sudden historical reversals
• rediscovered evidence

Excludes:
• modern geopolitics (World)
• symbolic/cultural interpretation (Culture)
• technical invention narratives (Products)
`,

  // --------------------------------------------------------------------------
  // 🌍 WORLD — Strange geopolitics, borders, micro-conflicts, demographic shocks
  // --------------------------------------------------------------------------
  world: `
Global-scale human behavior: surprising borders, forgotten treaties, microstates,
breakaway regions, unusual diplomatic incidents, demographic anomalies, 
hidden political manoeuvres, rare conflicts, societal disruptions, and 
geopolitical patterns that feel improbable yet are real.

Includes:
• modern intrigue (last ~150 years)
• strange international alignments
• unusual government actions

Excludes:
• deep historical civilizations (History)
• cultural rituals or symbolism (Culture)
`,

  // --------------------------------------------------------------------------
  // 🌿 NATURE — Ecological oddities, emergent wildlife behaviour
  // --------------------------------------------------------------------------
  nature: `
Animal behaviour, ecological interactions, emergent patterns in ecosystems, 
strange survival strategies, fungi networks, plant oddities, rare species, 
symbiosis, camouflage, migrations, predator-prey inversion, and unexpected 
responses to climate or environment.

Excludes:
• molecular biology (Science)
• human physiology/psychology (Health)
• geological or physical forces (Science)
`,

  // --------------------------------------------------------------------------
  // 🤖 TECHNOLOGY — Hidden mechanisms, surprising algorithms, unseen systems
  // --------------------------------------------------------------------------
  technology: `
Human-made systems and breakthroughs involving engineering, robotics, 
computation, cryptography, information systems, automation, industrial design,
and unexpected failures or origins of technical systems.

Includes:
• algorithmic oddities
• engineering puzzles
• “how it really works” tech revelations

Excludes:
• consumer product histories (Products)
• geopolitical impact of tech (World)
`,

  // --------------------------------------------------------------------------
  // 🎨 CULTURE — Symbolic puzzles, ritual anomalies, artistic mysteries
  // --------------------------------------------------------------------------
  culture: `
Human meaning-making: symbols, rituals, myths, creative movements, artistic
innovation, linguistic evolution, belief systems, aesthetic traditions, 
ritual oddities, cultural taboos, festival origins, and interpretive frameworks 
that shape identity and emotional experience.

Includes:
• symbolic mysteries
• surreal customs
• forgotten artistic gestures

Excludes:
• political intrigue (World)
• archaeological discovery (History)
• invention origins (Products)
`,

  // --------------------------------------------------------------------------
  // 🏃 SPORTS — Extreme human limits, psychological turning points
  // --------------------------------------------------------------------------
  sports: `
Athletic feats under extreme pressure: legendary comebacks, psychological 
breaking points, improbable endurance, forgotten controversies, dramatic 
competition reversals, and rare sports events with deep emotional stakes.

Excludes:
• physiology science (Health)
• non-sport historical events (History)
• business or political angles (World)
`,

  // --------------------------------------------------------------------------
  // 💡 PRODUCTS — Hidden origins, strange prototypes, invention anomalies
  // --------------------------------------------------------------------------
  products: `
Objects and inventions: hidden histories behind tools, design secrets, 
accidental discoveries, rare prototypes, forgotten patents, unusual materials, 
unexpected product evolution, and surprising ways objects reshaped society.

Includes:
• frontier engineering tied to a specific object
• strange design choices
• invention failures and rediscoveries

Excludes:
• broad technology systems (Technology)
• symbolic uses (Culture)
• geopolitical implications (World)
`,

  // --------------------------------------------------------------------------
  // 🧬 HEALTH — Medical mysteries, psychological oddities, human limits
  // --------------------------------------------------------------------------
  health: `
Human physiology and psychology: rare conditions, unusual neurological effects,
medical anomalies, evolutionary quirks, behavioural puzzles, sleep phenomena,
memory distortions, immune surprises, and clinical observations that reveal 
hidden dimensions of the human organism.

Excludes:
• non-human biology (Science/Nature)
• cultural meaning of health rituals (Culture)
• sports narratives (Sports)
`,
};
