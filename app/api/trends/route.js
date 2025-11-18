// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// import { NextResponse } from "next/server";

// import { fetchGoogleTrends, cleanTrends } from "../utils/trendsUtils.js";
// import { loadDynamicSubs, fetchRedditTrends } from "../utils/redditUtils.js";

// // === STANDARD SUBREDDITS ===
// let redditSubs = {
//   science: ["science", "Futurology", "TodayILearned", "AskScience", "Space"],
//   technology: ["technology", "technews", "artificial", "Futurology", "gadgets"],
//   space: ["space", "Astronomy", "spaceporn", "SpaceX", "spacefacts"],
//   nature: [
//     "nature",
//     "environment",
//     "EarthPorn",
//     "Wildlife",
//     "NatureIsFuckingLit",
//   ],
//   health: ["health", "nutrition", "psychology", "Fitness", "science"],
//   history: [
//     "history",
//     "AskHistorians",
//     "Archaeology",
//     "AncientHistory",
//     "HistoricalPics",
//   ],
//   culture: ["Art", "books", "movies", "Music", "CulturalCriticism"],
//   sports: ["sports", "soccer", "nba", "baseball", "formula1"],
//   products: [
//     "gadgets",
//     "consumertech",
//     "BuyItForLife",
//     "Design",
//     "ProductTesting",
//   ],
//   world: ["worldnews", "geopolitics", "economics", "travel", "europe"],
// };

// // =====================================================
// // === GET ===
// // Henter Google + Reddit + loader dynamiske subreddits
// // Ingen duplikatkontroll her – det skjer i generate.js
// // =====================================================
// export async function GET() {
//   // Oppdater subreddits basert på Supabase-databasen
//   redditSubs = await loadDynamicSubs(redditSubs);

//   const results = {};

//   for (const category of Object.keys(redditSubs)) {
//     console.log(`🧠 Fetching trends for ${category}...`);

//     // Hent begge kilder parallelt
//     const [googleRaw, redditRaw] = await Promise.all([
//       fetchGoogleTrends(category),
//       fetchRedditTrends(category, redditSubs[category]),
//     ]);

//     // Rens
//     const googleClean = cleanTrends(googleRaw);
//     const redditClean = cleanTrends(redditRaw);

//     // Velg ett tilfeldig fra hver
//     const googlePick =
//       googleClean[Math.floor(Math.random() * googleClean.length)];
//     const redditPick =
//       redditClean[Math.floor(Math.random() * redditClean.length)];

//     results[category] = {
//       google: googleClean,
//       reddit: redditClean,
//       selected: {
//         google: googlePick?.title || googlePick || null,
//         reddit: redditPick?.title || redditPick || null,
//         subreddit: redditPick?.subreddit || null,
//       },
//     };
//   }

//   console.log("✅ Trend scan complete.");
//   return NextResponse.json({ success: true, results });
// }
