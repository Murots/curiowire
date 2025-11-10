export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// === Utils ===
import { fetchGoogleTrends, cleanTrends } from "../utils/trendsUtils.js";
import { loadDynamicSubs, fetchRedditTrends } from "../utils/redditUtils.js";

// === STANDARD SUBREDDITS ===
let redditSubs = {
  science: ["science", "Futurology", "TodayILearned", "AskScience", "Space"],
  technology: ["technology", "technews", "artificial", "Futurology", "gadgets"],
  space: ["space", "Astronomy", "spaceporn", "SpaceX", "spacefacts"],
  nature: [
    "nature",
    "environment",
    "EarthPorn",
    "Wildlife",
    "NatureIsFuckingLit",
  ],
  health: ["health", "nutrition", "psychology", "Fitness", "science"],
  history: [
    "history",
    "AskHistorians",
    "Archaeology",
    "AncientHistory",
    "HistoricalPics",
  ],
  culture: ["Art", "books", "movies", "Music", "CulturalCriticism"],
  sports: ["sports", "soccer", "nba", "baseball", "formula1"],
  products: [
    "gadgets",
    "consumertech",
    "BuyItForLife",
    "Design",
    "ProductTesting",
  ],
  world: ["worldnews", "geopolitics", "economics", "travel", "europe"],
};

// === GET ===
export async function GET() {
  // 🔁 Hent eventuelle dynamiske subreddit-oppdateringer
  redditSubs = await loadDynamicSubs(redditSubs);

  const results = {};

  for (const category of Object.keys(redditSubs)) {
    console.log(`🧠 Fetching trends for ${category}...`);

    // Hent Google + Reddit-trender parallelt
    const [google, reddit] = await Promise.all([
      fetchGoogleTrends(category),
      fetchRedditTrends(category, redditSubs[category]),
    ]);

    const googleClean = cleanTrends(google);
    const redditClean = cleanTrends(reddit);

    // Velg et tilfeldig emne fra hver kilde
    const redditPick =
      redditClean[Math.floor(Math.random() * redditClean.length)];
    const redditTopic = redditPick?.title || redditPick || null;
    const redditSubreddit = redditPick?.subreddit || null;
    const googleTopic =
      googleClean[Math.floor(Math.random() * googleClean.length)];

    // Bygg resultatobjekt
    results[category] = {
      google: googleClean,
      reddit: redditClean,
      selected: {
        google: googleTopic || null,
        reddit: redditTopic || null,
        subreddit: redditSubreddit || null,
      },
    };

    // 🧩 Fallback fjernet — ikke nødvendig lenger
    // Tidligere brukte vi generateFallbackTopic(category)
    // Nå håndteres tomme kategorier senere i generatoren
  }

  console.log("✅ Trend scan complete.");
  return NextResponse.json({ success: true, results });
}
