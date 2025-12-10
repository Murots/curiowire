// // === CATEGORY CONFIG ===
// // Styrer tone og bildeflyt for hver hovedkategori.
// // -------------------------------------------------------------
// // • image: "photo"  → Foto-først (Wikimedia → Pexels → Unsplash → DALL·E fallback)
// // • image: "dalle"  → AI-først (DALL·E 3 → fallback til fotosøk hvis feiler)
// // -------------------------------------------------------------
// // Oppdatert for balansert visuell dekning:
// //   - Foto-først: realistiske, dokumentariske og nyhetsbaserte kategorier
// //   - AI-først: abstrakte, kreative og konseptuelle kategorier
// // -------------------------------------------------------------

// export const categories = {
//   // 🌌 Vitenskap og teknologi
//   science: {
//     tone: "scientific and intriguing discovery",
//     image: "photo", // realistisk vitenskapelig illustrasjon eller mikroskopbilde
//   },
//   technology: {
//     tone: "cutting-edge invention or digital phenomenon",
//     image: "photo", // ekte miljøer, kontor, utvikling, roboter osv.
//   },

//   // 🚀 Rom og univers – konseptuelt
//   space: {
//     tone: "astronomical or cosmic curiosity",
//     image: "photo", // DALL·E gir spektakulære og konsistente romillustrasjoner
//   },

//   // 🌿 Natur og miljø
//   nature: {
//     tone: "environmental or wildlife phenomenon",
//     image: "photo", // ekte dyre- og naturbilder
//   },

//   // 🧬 Helse og psykologi
//   health: {
//     tone: "psychological or medical curiosity",
//     image: "photo", // laboratorier, forskere, medisinsk miljø
//   },

//   // 🏺 Historie og arkeologi
//   history: {
//     tone: "archaeological or historical rediscovery",
//     image: "photo", // foto-først — arkeologi, ruiner, funn, dokumenter
//   },

//   // 🎨 Kunst og kultur
//   culture: {
//     tone: "artistic or cultural oddity",
//     image: "photo", // DALL·E 3 lager gode kunstneriske og surrealistiske bilder
//   },

//   // 🏃 Sport og utholdenhet
//   sports: {
//     tone: "athletic or human endurance story",
//     image: "photo", // ekte sports- og menneskebilder
//   },

//   // 💡 Produkter og trender
//   products: {
//     tone: "modern consumer trend or lifestyle insight",
//     image: "photo", // visuelle komposisjoner fungerer best med AI
//   },

//   // 🌍 Verden og politikk
//   world: {
//     tone: "geopolitical or global social phenomenon",
//     image: "photo", // foto-først — nyhetsrelevante hendelser, konflikter, miljø
//   },
// };

// === CATEGORY CONFIG — CurioWire v4.0 ⚡ Frontier Realism Edition ===
// Tonene er nå optimalisert for:
// • frontier realism
// • “WTF men sant”
// • intriger, mysterier og dype sammenhenger
// • delbarhet og emosjonell punch
// • sterk variasjon og null repetisjon

export const categories = {
  // 🌌 Science — naturens grensetilfeller og uventede mekanismer
  science: {
    tone: "frontier scientific mystery — rare mechanisms, unexplained data, surprising physical or biological behavior explained with cinematic clarity",
    image: "photo",
  },

  // 🤖 Technology — skjulte maskiner, hemmelige systemer
  technology: {
    tone: "technological intrigue — hidden mechanisms, forgotten breakthroughs, unintended consequences, or strange engineering origins revealed like a backstage secret",
    image: "photo",
  },

  // 🚀 Space — kosmiske anomalier og ekstreme observasjoner
  space: {
    tone: "cosmic frontier realism — rare astronomical anomalies, unexplained signals, dramatic stellar phenomena, vast-scale coincidences presented with awe",
    image: "photo",
  },

  // 🌿 Nature — evolusjonens merkelige side
  nature: {
    tone: "biological or ecological oddity — rare animal behavior, extreme survival strategies, or strange emergent ecosystems described with vivid sensory realism",
    image: "photo",
  },

  // 🧬 Health — medisinske mysterier og menneskelig psyke
  health: {
    tone: "clinical curiosity — rare conditions, unusual cognitive effects, evolutionary quirks, or medical puzzles that reveal hidden truths about the human organism",
    image: "photo",
  },

  // 🏺 History — intriger, anomalier og funn som omskriver fortiden
  history: {
    tone: "historical mystery — archaeological anomalies, forgotten power struggles, geopolitical intrigue, or rediscovered events that challenge the known record",
    image: "photo",
  },

  // 🎨 Culture — symbolske gåter og rituelle rariteter
  culture: {
    tone: "cultural enigma — symbolic traditions, ritual oddities, artistic mysteries, or strange belief systems with hidden emotional and historical depth",
    image: "photo",
  },

  // 🏃 Sports — øyeblikk med psykologisk og fysisk ekstremitet
  sports: {
    tone: "extreme human moment — psychological breaking points, improbable feats, forgotten controversies, or dramatic turning points with emotional weight",
    image: "photo",
  },

  // 💡 Products — skjulte historier, glemte oppfinnelser, tekniske gåter
  products: {
    tone: "product intrigue — strange design choices, forgotten prototypes, accidental discoveries, or hidden engineering truths behind everyday objects",
    image: "photo",
  },

  // 🌍 World — geopolitikkens merkelige historier og skjulte prosesser
  world: {
    tone: "global curiosity — surprising borders, micro-conflicts, secret negotiations, forgotten treaties, demographic shocks, or geopolitical events that feel unbelievable yet true",
    image: "photo",
  },
};
