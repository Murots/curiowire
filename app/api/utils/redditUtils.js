// === REDDIT UTILS ===
// Inneholder loadDynamicSubs, getRedditAccessToken, fetchRedditTrends, replaceSubreddit
// Fullstendig kopi av logikken fra trends/route.js

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
let redditSubs = {};

export async function loadDynamicSubs(baseSubs) {
  redditSubs = baseSubs;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subreddits")
    .select("category, name, cooldown_until")
    .eq("active", true)
    .or(`cooldown_until.is.null,cooldown_until.lt.${now}`);

  if (error) {
    console.warn("⚠️ Failed to load subreddits from Supabase:", error.message);
    return redditSubs;
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
  return redditSubs;
}

let redditTokenCache = { token: null, expires: 0 };

export async function getRedditAccessToken() {
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

export async function replaceSubreddit(sub, category) {
  try {
    const cooldownUntil = new Date(
      Date.now() + 72 * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from("subreddits")
      .update({
        active: false,
        cooldown_until: cooldownUntil,
        updated_at: new Date().toISOString(),
      })
      .eq("category", category)
      .eq("name", sub);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Suggest one active, safe, and popular subreddit about ${category}. Return only its name (no r/). Avoid any recently deactivated subreddit.`,
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

    if (newSub.toLowerCase() === sub.toLowerCase()) {
      console.warn(`♻️ GPT suggested same subreddit (${sub}) — skipping.`);
      return;
    }

    console.log(`✅ Replaced r/${sub} → r/${newSub}`);

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

    const i = redditSubs[category].indexOf(sub);
    if (i >= 0) redditSubs[category][i] = newSub;
    else redditSubs[category].push(newSub);
  } catch (err) {
    console.warn("⚠️ Replacement failed:", err.message);
  }
}

export async function fetchRedditTrends(category, subs) {
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

      const titles = posts
        .map((p) => ({
          title: p.data?.title,
          subreddit: sub,
        }))
        .filter((p) => p.title)
        .slice(0, 5);

      if (titles.length === 0) continue;

      const topicHash = titles[0].title.toLowerCase().slice(0, 40);

      const { data: prev } = await supabase
        .from("subreddits")
        .select("last_topic, last_used")
        .eq("category", category)
        .eq("name", sub)
        .single();

      if (prev?.last_topic === topicHash && prev?.last_used) {
        console.warn(`♻️ r/${sub} repeats old USED topic — replacing...`);
        await replaceSubreddit(sub, category);
        continue;
      }

      await supabase.from("subreddits").upsert(
        {
          category,
          name: sub,
          active: true,
          last_topic: topicHash,
          last_used: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "category,name" }
      );

      topics.push(...titles);
    } catch (err) {
      console.warn(`⚠️ Reddit fetch error for r/${sub}:`, err.message);
    }
  }

  return topics.slice(0, 5);
}
