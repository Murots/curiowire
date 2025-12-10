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
// CATEGORY DEFINITIONS — CurioWire v3.6
// Master semantic boundaries for ALL categories.
// These definitions drive concept generation, seed filtering,
// article steering, dupe-checking, and factual linking.
// They must be precise, exhaustive, and non-overlapping.
// ============================================================================

export const CATEGORY_DEFINITIONS = {
  // --------------------------------------------------------------------------
  // 🚀 SPACE — Cosmic phenomena and universe-scale mysteries
  // --------------------------------------------------------------------------
  space: `
Content about the universe beyond Earth: astronomical events, planets, stars,
galaxies, nebulae, cosmic radiation, black holes, exoplanets, orbital mechanics,
space-time, astrophysics, cosmic evolution, early universe conditions, and
observational or theoretical cosmology. Includes strange cosmic phenomena,
rare orbital coincidences, deep-space mysteries, space exploration discoveries,
and dramatic large-scale celestial dynamics.

Excludes:
• Earth-bound atmospheric weather or geology (belongs to Science/Nature)
• Human spaceflight culture unless tied directly to cosmic science
• Geopolitics of space programs (belongs to World)
`,

  // --------------------------------------------------------------------------
  // 🔬 SCIENCE — Mechanisms of the natural world (non-human)
  // --------------------------------------------------------------------------
  science: `
Evidence-based natural science focused on mechanisms, causes, and physical laws:
physics, chemistry, geology, geophysics, volcanology, seismology, atmospheric
science, oceanography, climate systems, microbiology, non-human evolutionary
biology, molecular processes, DNA/RNA mechanisms, natural forces, materials
science, and laboratory-based or field-based empirical research.

Suitable for: strange experiments, unexpected natural mechanisms, unusual
chemical reactions, odd physical phenomena, evolutionary surprises.

Excludes:
• Human health or psychology (belongs to Health)
• Animal behavior narratives (belongs to Nature)
• Ecology, habitats, migrations (belongs to Nature)
• Pure astronomy or cosmic-scale physics (belongs to Space)
`,

  // --------------------------------------------------------------------------
  // 🏺 HISTORY — The past, rediscovered or reinterpreted
  // --------------------------------------------------------------------------
  history: `
Past civilizations, wars, empires, leadership events, ancient technologies,
lost cultures, archaeology, artifacts, excavation discoveries, forgotten
historical episodes, unusual traditions, unexplained historical events, old maps,
trade networks, historical coincidences, cultural clashes, and myth-like stories
rooted in real-world evidence.

Excludes:
• Modern geopolitics (belongs to World)
• Cultural analysis or symbolism (belongs to Culture)
• Sports history unless central to athletic achievement (belongs to Sports)
`,

  // --------------------------------------------------------------------------
  // 🌍 WORLD — Global patterns, geopolitics, societal oddities
  // --------------------------------------------------------------------------
  world: `
Global-scale human stories: geopolitics, borders, diplomatic incidents, microstates,
breakaway regions, strange laws, disputed territories, unusual government actions,
societal shifts, unexpected global trends, demographic anomalies, and bizarre
international events. Includes forgotten conflicts, rare treaties, and
"how did this become real?" world-phenomena.

Excludes:
• Historical events beyond ~100 years unless framed as global/social phenomenon
• Cultural rituals, art, or symbolism (belongs to Culture)
• Pure science or environmental phenomena (Science/Nature)
`,

  // --------------------------------------------------------------------------
  // 🌿 NATURE — Living ecosystems, animals, odd behaviors
  // --------------------------------------------------------------------------
  nature: `
Observable natural world phenomena: animal behavior, migrations, predator-prey
interactions, unusual wildlife strategies, symbiosis, camouflage, plants, fungi,
ecosystems, biomes, food webs, climate effects on living organisms, rare species,
emergent ecological dynamics, and sensory or experiential descriptions of the wild.

Excludes:
• Molecular biology or lab science (belongs to Science)
• Human biology or psychology (belongs to Health)
• Geology or atmospheric mechanisms (belongs to Science)
`,

  // --------------------------------------------------------------------------
  // 🤖 TECHNOLOGY — Human-made systems and breakthroughs
  // --------------------------------------------------------------------------
  technology: `
Human-built innovations: engineering breakthroughs, algorithms, robotics,
AI systems, communications technology, computing, cryptography, mechanical
ingenuity, infrastructure, materials engineering, automation, industrial design,
unexpected technological origins, surprising failures, and behind-the-scenes
mechanisms of modern devices.

Excludes:
• Consumer product histories (belongs to Products)
• Geopolitical implications of technology (belongs to World)
• Artistic symbolism (belongs to Culture)
`,

  // --------------------------------------------------------------------------
  // 🎨 CULTURE — Human beliefs, symbols, rituals, and identity
  // --------------------------------------------------------------------------
  culture: `
Art, literature, mythology, symbolism, language evolution, rituals, festivals,
traditions, spiritual practices, folk customs, aesthetic movements, artistic
innovations, cultural artifacts, collective identity, social meaning-making,
and emotional/creative human expression across time.

Excludes:
• Political or geopolitical behavior (World)
• Archaeological discovery (History)
• Product/invention origin (Products)
`,

  // --------------------------------------------------------------------------
  // 🏃 SPORTS — Human limits, legendary moments, emotional stakes
  // --------------------------------------------------------------------------
  sports: `
Extraordinary athletic feats, iconic competitions, underdog stories, turning
points, extreme endurance, psychological battles in sport, record-breaking
moments, forgotten teams, dramatic collapses, remarkable comebacks, and
little-known historical sports events with human emotional weight.

Excludes:
• Physiology or injury mechanisms (Health)
• General historical events not tied to sport
• Modern sports business or politics (World)
`,

  // --------------------------------------------------------------------------
  // 💡 PRODUCTS — Objects, inventions, materials, hidden origins
  // --------------------------------------------------------------------------
  products: `
Man-made objects and the hidden truths behind them: invention histories,
materials, manufacturing, prototypes, failures, patents, design innovations,
accidental discoveries, craft traditions, industrial processes, and strange or
unexpected ways objects shaped society. Includes both historical and modern
product narratives.

Excludes:
• General technology breakthroughs (Technology)
• Art or symbolism (Culture)
• Geopolitical consequences (World)
`,

  // --------------------------------------------------------------------------
  // 🧬 HEALTH — Human body, mind, and medical science
  // --------------------------------------------------------------------------
  health: `
Human biology and psychology: disease mechanisms, physiology, nutrition, medicine,
mental health, cognitive processes, epidemiology, public health, clinical findings,
sleep science, immune function, evolutionary physiology, behavioral insights,
and evidence-based explanations of how the human body and mind operate.

Excludes:
• Non-human biology (Science/Nature)
• Cultural interpretation of health rituals (Culture)
• Sports performance unless physiological (Sports)
`,
};
