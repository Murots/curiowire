export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { fetchGoogleTrends, cleanTrends } from "../utils/trendsUtils.js";
import { loadDynamicSubs, fetchRedditTrends } from "../utils/redditUtils.js";
import { normalize } from "../utils/duplicateUtils.js";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

// =====================================================
// 🔍 Google Prefilter Function — NEW
// Sjekker google-trender mot articles.semantic_signature
// =====================================================
async function filterGoogleTrends(titles) {
  if (!titles?.length) return [];

  const filtered = [];

  for (const item of titles) {
    const rawTitle = item?.title || item;
    const signature = normalize(rawTitle);

    // 🔎 sjekk semantic_signature i articles
    const { data } = await supabase
      .from("articles")
      .select("id")
      .ilike("semantic_signature", `%${signature}%`)
      .limit(1);

    if (data?.length > 0) {
      console.log(`♻️ Google trend dupe filtered out: "${rawTitle}"`);
      continue;
    }

    filtered.push(item);
  }

  return filtered;
}

// =====================================================
// === GET ===
// =====================================================
export async function GET() {
  redditSubs = await loadDynamicSubs(redditSubs);

  const results = {};

  for (const category of Object.keys(redditSubs)) {
    console.log(`🧠 Fetching trends for ${category}...`);

    // === Hent Google og Reddit parallelt
    const [google, reddit] = await Promise.all([
      fetchGoogleTrends(category),
      fetchRedditTrends(category, redditSubs[category]),
    ]);

    const googleClean = cleanTrends(google);
    const redditClean = cleanTrends(reddit);

    // === NEW: Filtrer Google-trender mot semantic_signature
    const googleFiltered = await filterGoogleTrends(googleClean);

    // === Velg et tilfeldig emne fra hver
    const googlePick =
      googleFiltered[Math.floor(Math.random() * googleFiltered.length)];

    const redditPick =
      redditClean[Math.floor(Math.random() * redditClean.length)];

    const googleTopic = googlePick?.title || googlePick || null;
    const redditTopic = redditPick?.title || redditPick || null;

    const redditSubreddit = redditPick?.subreddit || null;

    // === Returner begge kildene, + valgt trend
    results[category] = {
      google: googleFiltered,
      reddit: redditClean,
      selected: {
        google: googleTopic || null,
        reddit: redditTopic || null,
        subreddit: redditSubreddit || null,
      },
    };
  }

  console.log("✅ Trend scan complete.");
  return NextResponse.json({ success: true, results });
}
