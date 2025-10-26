// === CATEGORY CONFIG ===
// Styrer tone og bildeflyt for hver hovedkategori.
// -------------------------------------------------------------
// • image: "photo"  → Foto-først (Wikimedia → Pexels → Unsplash → DALL·E fallback)
// • image: "dalle"  → AI-først (DALL·E 3 → fallback til fotosøk hvis feiler)
// -------------------------------------------------------------
// Oppdatert for balansert visuell dekning:
//   - Foto-først: realistiske, dokumentariske og nyhetsbaserte kategorier
//   - AI-først: abstrakte, kreative og konseptuelle kategorier
// -------------------------------------------------------------

export const categories = {
  // 🌌 Vitenskap og teknologi
  science: {
    tone: "scientific and intriguing discovery",
    image: "photo", // realistisk vitenskapelig illustrasjon eller mikroskopbilde
  },
  technology: {
    tone: "cutting-edge invention or digital phenomenon",
    image: "photo", // ekte miljøer, kontor, utvikling, roboter osv.
  },

  // 🚀 Rom og univers – konseptuelt
  space: {
    tone: "astronomical or cosmic curiosity",
    image: "photo", // DALL·E gir spektakulære og konsistente romillustrasjoner
  },

  // 🌿 Natur og miljø
  nature: {
    tone: "environmental or wildlife phenomenon",
    image: "photo", // ekte dyre- og naturbilder
  },

  // 🧬 Helse og psykologi
  health: {
    tone: "psychological or medical curiosity",
    image: "photo", // laboratorier, forskere, medisinsk miljø
  },

  // 🏺 Historie og arkeologi
  history: {
    tone: "archaeological or historical rediscovery",
    image: "photo", // foto-først — arkeologi, ruiner, funn, dokumenter
  },

  // 🎨 Kunst og kultur
  culture: {
    tone: "artistic or cultural oddity",
    image: "photo", // DALL·E 3 lager gode kunstneriske og surrealistiske bilder
  },

  // 🏃 Sport og utholdenhet
  sports: {
    tone: "athletic or human endurance story",
    image: "photo", // ekte sports- og menneskebilder
  },

  // 💡 Produkter og trender
  products: {
    tone: "modern consumer trend or lifestyle insight",
    image: "photo", // visuelle komposisjoner fungerer best med AI
  },

  // 🌍 Verden og politikk
  world: {
    tone: "geopolitical or global social phenomenon",
    image: "photo", // foto-først — nyhetsrelevante hendelser, konflikter, miljø
  },
};
