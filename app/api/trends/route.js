export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";

// === OpenAI klient for automatisk subreddit-reparasjon og fallback ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === Reddit-subreddits per kategori (utvidet til 5 hver) ===
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

/* === 1️⃣ Hent fra Google Trends (RSS-basert, stabil metode) === */
async function fetchGoogleTrends(category) {
  try {
    const res = await fetch(
      "https://trends.google.com/trendingsearches/daily/rss?geo=US"
    );
    const xml = await res.text();

    const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)];
    const allTitles = matches.map((m) => m[1]).slice(1);

    const relevant = allTitles.filter((t) =>
      t.toLowerCase().includes(category.toLowerCase())
    );

    return relevant.length > 0 ? relevant.slice(0, 5) : allTitles.slice(0, 5);
  } catch (err) {
    console.warn(
      `⚠️ Google Trends RSS fetch failed for ${category}:`,
      err.message
    );
    return [];
  }
}

/* === 2️⃣ REDDIT AUTH TOKEN + TREND FETCH (stabil versjon med GPT fallback) === */
let redditTokenCache = { token: null, expires: 0 };
const subredditCooldown = {}; // track for GPT-refresh cooldown

// === Hent (og cache) Reddit access token ===
async function getRedditAccessToken() {
  const now = Date.now();

  if (redditTokenCache.token && now < redditTokenCache.expires) {
    return redditTokenCache.token;
  }

  const auth = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await res.json();
    if (!data.access_token) {
      console.error("❌ Failed to obtain Reddit token:", data);
      return null;
    }

    redditTokenCache = {
      token: data.access_token,
      expires: now + (data.expires_in - 60) * 1000,
    };

    console.log("🔑 New Reddit OAuth token fetched.");
    return redditTokenCache.token;
  } catch (err) {
    console.error("❌ Reddit token request failed:", err.message);
    return null;
  }
}

/* === Hent Reddit-trender via OAuth (med utvidelser) === */
async function fetchRedditTrends(category, subs) {
  const topics = [];
  const token = await getRedditAccessToken();

  if (!token) {
    console.warn(`⚠️ Missing Reddit token — skipping ${category}`);
    return topics;
  }

  // 🎲 Velg tilfeldig 2 subreddits av de tilgjengelige
  const randomSubs = subs.sort(() => 0.5 - Math.random()).slice(0, 2);

  for (const sub of randomSubs) {
    try {
      const res = await fetch(
        `https://oauth.reddit.com/r/${sub}/hot.json?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "CurioWireBot/1.0 (+https://curiowire.com)",
          },
        }
      );

      // Hvis subreddit ikke finnes eller er privat
      if (res.status === 403 || res.status === 404) {
        console.warn(`⚠️ r/${sub} is dead, replacing it for ${category}...`);

        // Spør GPT om én ny subreddit i samme kategori
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Suggest one active, safe, and popular subreddit about ${category}. Return only its name (no r/).`,
            },
          ],
        });

        const newSub = completion.choices[0]?.message?.content
          ?.replace("r/", "")
          ?.trim();

        if (newSub) {
          console.log(`✅ Replaced ${sub} → ${newSub}`);
          const index = redditSubs[category].indexOf(sub);
          redditSubs[category][index] = newSub;
        }

        continue;
      }

      if (!res.ok) {
        console.warn(`⚠️ Reddit fetch failed for r/${sub}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const posts = data?.data?.children || [];
      const titles = posts
        .map((p) => p.data?.title)
        .filter(Boolean)
        .slice(0, 3);
      topics.push(...titles);
    } catch (err) {
      console.warn(`⚠️ Reddit fetch error for r/${sub}:`, err.message);
    }
  }

  // === Hvis ingen eller alle duplikater → generer relatert, faktabasert emne ===
  if (topics.length === 0) {
    console.log(
      `🧠 No fresh topics for ${category} — generating related factual topic...`
    );
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `
Suggest one factual, relevant, and current topic related to the category "${category}".
It should reflect real-world knowledge or ongoing discussions that could plausibly trend on Reddit or Google today.
Avoid fiction, politics, or speculative themes.
Return only the short topic title (5–10 words).
            `,
          },
        ],
      });

      const related = completion.choices[0]?.message?.content?.trim();
      if (related) {
        console.log(`✅ Related factual topic for ${category}: ${related}`);
        topics.push(related);
      }
    } catch (err) {
      console.error(
        `❌ GPT related-topic generation failed for ${category}:`,
        err.message
      );
    }
  }

  return topics.slice(0, 5);
}

/* === 3️⃣ Kombiner, rens og returnér === */
export async function GET() {
  const results = {};

  for (const category of Object.keys(redditSubs)) {
    console.log(`🧠 Fetching trends for ${category}...`);

    const [google, reddit] = await Promise.all([
      fetchGoogleTrends(category),
      fetchRedditTrends(category, redditSubs[category]),
    ]);

    const googleClean = Array.from(new Set(google))
      .map((t) => t.replace(/&amp;/g, "&").trim())
      .filter((t) => t.length > 3 && !t.match(/reddit|thread|discussion/i))
      .slice(0, 5);

    const redditClean = Array.from(new Set(reddit))
      .map((t) => t.replace(/&amp;/g, "&").trim())
      .filter((t) => t.length > 3 && !t.match(/reddit|thread|discussion/i))
      .slice(0, 5);

    const redditTopic =
      redditClean[Math.floor(Math.random() * redditClean.length)];
    const googleTopic =
      googleClean[Math.floor(Math.random() * googleClean.length)];

    results[category] = {
      google: googleClean,
      reddit: redditClean,
      selected: {
        google: googleTopic || null,
        reddit: redditTopic || null,
      },
    };
  }

  console.log("✅ Trend scan complete.");
  return NextResponse.json({ success: true, results });
}
