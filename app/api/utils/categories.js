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

// === CATEGORY CONFIG — CurioWire v3.5 ⚡ Enhanced Viral Tone ===
// Tonene er nå optimalisert for WOW, delbarhet og emosjonell punch,
// samtidig som de holder seg innenfor faktasjekkbar, seriøs journalistikk.

export const categories = {
  // 🌌 Science — mer mysterium, mindre lærebok
  science: {
    tone: "curiosity-driven scientific mystery, strange phenomenon, or unexpected natural mechanism — explained clearly but with cinematic tension and awe",
    image: "photo",
  },

  // 🤖 Technology — teknologien bak kulissene
  technology: {
    tone: "surprising technological breakthrough, hidden mechanism, or unexpected origin story — framed as a behind-the-scenes revelation",
    image: "photo",
  },

  // 🚀 Space — storslått og uforståelig
  space: {
    tone: "cosmic enigma, dramatic astronomical event, or mind-bending scale-shift presented with quiet awe and vivid cosmic atmosphere",
    image: "photo",
  },

  // 🌿 Nature — naturens “wtf”-øyeblikk
  nature: {
    tone: "strange ecological behavior, rare wildlife oddity, or unusual natural chain-reaction — described with sensory detail and subtle scientific grounding",
    image: "photo",
  },

  // 🧬 Health & Psychology — menneskelig og uventet
  health: {
    tone: "psychological quirk, medical oddity, or surprising human behavior pattern that reveals hidden aspects of how we think, feel, or survive",
    image: "photo",
  },

  // 🏺 History — fortidens store overraskelser
  history: {
    tone: "forgotten historical twist, archaeological mystery, or rediscovered human drama with narrative stakes and sense of revelation",
    image: "photo",
  },

  // 🎨 Culture — kunst, symbolikk og rare tradisjoner
  culture: {
    tone: "artistic or cultural oddity, surreal historical tradition, or symbolic ritual with strong emotional or visual contrast",
    image: "photo",
  },

  // 🏃 Sports — ekstreme øyeblikk, ikke resultater
  sports: {
    tone: "extraordinary physical feat, psychological endurance, or pivotal moment where sport intersects human limits and emotion",
    image: "photo",
  },

  // 💡 Products — skjulte historier bak ting
  products: {
    tone: "astonishing origin story, design secret, or hidden truth behind a man-made object — blending craft, engineering, and curiosity",
    image: "photo",
  },

  // 🌍 World — global WOW, inkludert geopolitikk som kuriositet
  world: {
    tone: "geopolitical or societal curiosity — strange borders, forgotten micro-conflicts, unusual diplomatic events, or surprising global patterns with a human edge",
    image: "photo",
  },
};
