export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/* === 🔐 INITIAL SETUP === */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* === 🗂️ STANDARD FALLBACK SUBREDDITS === */
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

/* === 🧭 HENT DYNAMISKE SUBREDDITS FRA SUPABASE === */
async function loadDynamicSubs() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subreddits")
    .select("category, name, cooldown_until")
    .eq("active", true)
    .or(`cooldown_until.is.null,cooldown_until.lt.${now}`); // ← filtrer bort pågående cooldown

  if (error) {
    console.warn("⚠️ Failed to load subreddits from Supabase:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`📥 Loaded ${data.length} active subreddits from Supabase.`);
    const dynamic = {};
    for (const row of data) {
      if (!dynamic[row.category]) dynamic[row.category] = [];
      dynamic[row.category].push(row.name);
    }
    for (const key of Object.keys(redditSubs)) {
      const base = redditSubs[key] || [];
      const fromDB = dynamic[key] || [];
      redditSubs[key] = Array.from(new Set([...fromDB, ...base]));
    }
  } else {
    console.log("⚠️ No eligible subreddits found (all may be in cooldown).");
  }
}

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

/* === 2️⃣ REDDIT AUTH TOKEN === */
let redditTokenCache = { token: null, expires: 0 };

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
    if (!data.access_token) return null;
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

/* === 3️⃣ REDDIT TREND FETCH + AUTO-LÆRING === */
async function fetchRedditTrends(category, subs) {
  const topics = [];
  const baseUrl = "https://oauth.reddit.com";
  const token = await getRedditAccessToken();
  if (!token) {
    console.warn(`⚠️ Missing Reddit token — skipping ${category}`);
    return topics;
  }

  const randomSubs = subs.sort(() => 0.5 - Math.random()).slice(0, 5);

  for (const sub of randomSubs) {
    try {
      const res = await fetch(`${baseUrl}/r/${sub}/hot.json?limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "CurioWireBot/1.0 (+https://curiowire.com)",
        },
      });

      if (res.status === 403 || res.status === 404) {
        console.warn(`⚠️ r/${sub} is dead — replacing...`);
        await replaceSubreddit(sub, category);
        continue;
      }

      if (!res.ok) continue;
      const data = await res.json();
      const posts = data?.data?.children || [];
      // 🔁 Nå returnerer vi både tittel og hvilken subreddit den kom fra
      const titles = posts
        .map((p) => ({
          title: p.data?.title,
          subreddit: sub,
        }))
        .filter((p) => p.title)
        .slice(0, 5);
      if (titles.length === 0) continue;

      //   // 🧠  Læringsmekanisme: Hvis forrige topic er identisk, bytt ut sub
      //   const topicHash = titles[0].toLowerCase().slice(0, 40);
      //   const { data: prev } = await supabase
      //     .from("subreddits")
      //     .select("last_topic")
      //     .eq("category", category)
      //     .eq("name", sub)
      //     .single();

      //   if (prev?.last_topic && prev.last_topic === topicHash) {
      //     console.warn(`♻️ r/${sub} repeats old topic — replacing...`);
      //     await replaceSubreddit(sub, category);
      //     continue;
      //   }

      //   // ✅ Oppdater Supabase med nyeste hash
      //   await supabase.from("subreddits").upsert(
      //     {
      //       category,
      //       name: sub,
      //       active: true,
      //       last_topic: topicHash,
      //       updated_at: new Date().toISOString(),
      //     },
      //     { onConflict: "category,name" }
      //   );

      // 🧠 Læringsmekanisme: sjekk bare om subreddit gjentar emne *som faktisk ble valgt sist gang*
      const topicHash = titles[0].title.toLowerCase().slice(0, 40);

      const { data: prev } = await supabase
        .from("subreddits")
        .select("last_topic, last_used")
        .eq("category", category)
        .eq("name", sub)
        .single();

      // ✅ Bytt bare ut subredditen hvis:
      // - Den gjentar samme emne, og
      // - Den faktisk ble brukt sist (last_used = true)
      if (prev?.last_topic === topicHash && prev?.last_used) {
        console.warn(`♻️ r/${sub} repeats old USED topic — replacing...`);
        await replaceSubreddit(sub, category);
        continue;
      }

      // 🧠 Oppdater Supabase med nyeste hash (men marker ikke "used" ennå)
      await supabase.from("subreddits").upsert(
        {
          category,
          name: sub,
          active: true,
          last_topic: topicHash,
          last_used: false, // markeres som brukt først hvis valgt i /generate
          updated_at: new Date().toISOString(),
        },
        { onConflict: "category,name" }
      );

      topics.push(...titles);
    } catch (err) {
      console.warn(`⚠️ Reddit fetch error for r/${sub}:`, err.message);
    }
  }

  // 🧩 GPT-fallback hvis ingen topics funnet
  if (topics.length === 0) {
    const related = await generateFallbackTopic(category);
    if (related) topics.push(related);
  }

  return topics.slice(0, 5);
}

/* === 🔁 Auto-erstatning ved døde eller dupliserte subreddits med 24t cooldown === */
async function replaceSubreddit(sub, category) {
  try {
    const cooldownUntil = new Date(
      Date.now() + 48 * 60 * 60 * 1000
    ).toISOString();

    // Merk gammel subreddit som inaktiv + cooldown
    await supabase
      .from("subreddits")
      .update({
        active: false,
        cooldown_until: cooldownUntil,
        updated_at: new Date().toISOString(),
      })
      .eq("category", category)
      .eq("name", sub);

    // Foreslå ny subreddit via GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Suggest one active, safe, and popular subreddit about ${category}. Return only its name (no r/). Avoid using any subreddit that might have been recently deactivated.`,
        },
      ],
      max_tokens: 15,
      temperature: 0.4,
    });

    const newSub = completion.choices[0]?.message?.content
      ?.replace("r/", "")
      .trim();

    if (!newSub) {
      console.warn(`⚠️ GPT did not suggest a valid subreddit for ${category}.`);
      return;
    }

    // Unngå at GPT foreslår samme subreddit som den som ble deaktivert
    if (newSub.toLowerCase() === sub.toLowerCase()) {
      console.warn(`♻️ GPT suggested same subreddit (${sub}) — skipping.`);
      return;
    }

    console.log(`✅ Replaced r/${sub} → r/${newSub}`);

    // Lagre ny subreddit i Supabase
    await supabase.from("subreddits").upsert(
      {
        category,
        name: newSub,
        active: true,
        last_topic: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "category,name" }
    );

    // Oppdater lokal cache
    const i = redditSubs[category].indexOf(sub);
    if (i >= 0) redditSubs[category][i] = newSub;
    else redditSubs[category].push(newSub);
  } catch (err) {
    console.warn("⚠️ Replacement failed:", err.message);
  }
}

/* === GPT-fallback når Reddit og Google er tomme === */
async function generateFallbackTopic(category) {
  try {
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Suggest one factual, current topic related to ${category}. Avoid fiction or speculation.`,
        },
      ],
      max_tokens: 40,
      temperature: 0.5,
    });
    return c.choices[0]?.message?.content?.trim();
  } catch {
    return null;
  }
}

/* === 4️⃣ Kombiner og returnér === */
export async function GET() {
  await loadDynamicSubs();
  const results = {};

  for (const category of Object.keys(redditSubs)) {
    console.log(`🧠 Fetching trends for ${category}...`);
    const [google, reddit] = await Promise.all([
      fetchGoogleTrends(category),
      fetchRedditTrends(category, redditSubs[category]),
    ]);

    const clean = (arr) =>
      Array.from(
        new Map(
          arr.map((item) => {
            const title = typeof item === "string" ? item : item.title;
            const subreddit = typeof item === "string" ? null : item.subreddit;
            return [title, { title, subreddit }];
          })
        ).values()
      )
        .map((obj) => ({
          title: obj.title.replace(/&amp;/g, "&").trim(),
          subreddit: obj.subreddit,
        }))
        .filter(
          (obj) =>
            obj.title.length > 3 &&
            !obj.title.match(/reddit|thread|discussion/i)
        )
        .slice(0, 5);

    const googleClean = clean(google);
    const redditClean = clean(reddit);

    const redditPick =
      redditClean[Math.floor(Math.random() * redditClean.length)];
    const redditTopic = redditPick?.title || redditPick || null;
    const redditSubreddit = redditPick?.subreddit || null;

    const googleTopic =
      googleClean[Math.floor(Math.random() * googleClean.length)];

    results[category] = {
      google: googleClean,
      reddit: redditClean,
      selected: {
        google: googleTopic || null,
        reddit: redditTopic || null,
        subreddit: redditSubreddit || null, // 🔥 nytt
      },
    };
  }

  console.log("✅ Trend scan complete.");
  return NextResponse.json({ success: true, results });
}
