// // === TRENDS UTILS ===
// // Håndterer Google Trends og rensing/kombinasjon av data

// export async function fetchGoogleTrends(category) {
//   try {
//     const res = await fetch(
//       "https://trends.google.com/trendingsearches/daily/rss?geo=US"
//     );
//     const xml = await res.text();
//     const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)];
//     const allTitles = matches.map((m) => m[1]).slice(1);
//     const relevant = allTitles.filter((t) =>
//       t.toLowerCase().includes(category.toLowerCase())
//     );
//     return relevant.length > 0 ? relevant.slice(0, 5) : allTitles.slice(0, 5);
//   } catch (err) {
//     console.warn(
//       `⚠️ Google Trends RSS fetch failed for ${category}:`,
//       err.message
//     );
//     return [];
//   }
// }

// export function cleanTrends(arr) {
//   return Array.from(
//     new Map(
//       arr.map((item) => {
//         const title = typeof item === "string" ? item : item.title;
//         const subreddit = typeof item === "string" ? null : item.subreddit;
//         return [title, { title, subreddit }];
//       })
//     ).values()
//   )
//     .map((obj) => ({
//       title: obj.title.replace(/&amp;/g, "&").trim(),
//       subreddit: obj.subreddit,
//     }))
//     .filter(
//       (obj) =>
//         obj.title.length > 3 && !obj.title.match(/reddit|thread|discussion/i)
//     )
//     .slice(0, 5);
// }

// === TRENDS UTILS ===
// Håndterer Google Trends + rensing/kombinasjon av data

// Kategori-ord som fanger opp relevante Google-trender
const CATEGORY_KEYWORDS = {
  science: ["science", "scientist", "research", "study", "discovery"],
  technology: [
    "tech",
    "technology",
    "ai",
    "robot",
    "software",
    "device",
    "update",
    "innovation",
  ],
  space: [
    "space",
    "nasa",
    "moon",
    "mars",
    "orbit",
    "astronomy",
    "asteroid",
    "galaxy",
  ],
  nature: [
    "nature",
    "climate",
    "wildlife",
    "animal",
    "environment",
    "earth",
    "ecosystem",
  ],
  health: [
    "health",
    "doctor",
    "medical",
    "disease",
    "brain",
    "study",
    "nutrition",
    "therapy",
  ],
  history: [
    "history",
    "archaeology",
    "ancient",
    "artifact",
    "discovered",
    "historic",
  ],
  culture: ["art", "music", "movie", "culture", "film", "book", "festival"],
  sports: [
    "sport",
    "match",
    "league",
    "team",
    "player",
    "championship",
    "football",
    "soccer",
    "nba",
  ],
  products: [
    "product",
    "gadget",
    "device",
    "review",
    "consumer",
    "release",
    "launch",
  ],
  world: [
    "world",
    "global",
    "country",
    "international",
    "geopolitics",
    "election",
    "economy",
    "war",
    "government",
  ],
};

// =========================================================
// 🔍 Hent Google Trends → med forbedret kategorimatch
// =========================================================
export async function fetchGoogleTrends(category) {
  try {
    const res = await fetch(
      "https://trends.google.com/trendingsearches/daily/rss?geo=US"
    );

    const xml = await res.text();

    // • Hent alle <title>-verdier
    const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)];

    // Første tittel er alltid "Daily Search Trends" → hopp over
    const allTitles = matches.map((m) => m[1]).slice(1);

    const cat = category.toLowerCase();
    const keywords = CATEGORY_KEYWORDS[cat] || [];

    // • Match titler basert på kategori-nøkkelord
    const relevant = allTitles.filter((t) => {
      const lower = t.toLowerCase();
      return keywords.some((w) => lower.includes(w));
    });

    // Returner maks 5, fall tilbake til generelle titler hvis kategori-match mangler
    return relevant.length > 0 ? relevant.slice(0, 5) : allTitles.slice(0, 5);
  } catch (err) {
    console.warn(
      `⚠️ Google Trends RSS fetch failed for ${category}:`,
      err.message
    );
    return [];
  }
}

// =========================================================
// 🧹 RENS TRENDER
// Fjerner duplikater, unødvendige HTML entities,
// for korte og åpenbart irrelevante titler.
// =========================================================
export function cleanTrends(arr) {
  return Array.from(
    new Map(
      arr.map((item) => {
        const title = typeof item === "string" ? item : item.title;
        return [title, { title }];
      })
    ).values()
  )
    .map((obj) => ({
      title: obj.title.replace(/&amp;/g, "&").trim(),
    }))
    .filter((obj) => {
      const t = obj.title.toLowerCase();
      return (
        t.length > 3 &&
        !t.match(/reddit|thread|discussion|subreddit/i) &&
        !t.startsWith("ask ") &&
        !t.startsWith("how to") &&
        !t.startsWith("why does")
      );
    })
    .slice(0, 5);
}
