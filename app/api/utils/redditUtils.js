// === REDDIT UTILS (CurioWire v3.6) ===
// Fullstendig, selvreparerende Reddit-håndtering for CurioWire
// • Automatisk utskifting og cooldown
// • Permanent ekskludering av døde subreddits
// • Fail-teller og logikk for gjentatte duplikater

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let redditSubs = {};

// === 🔹 Last inn dynamiske subreddits fra Supabase ===
export async function loadDynamicSubs(baseSubs) {
  redditSubs = baseSubs;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subreddits")
    .select("category, name, cooldown_until")
    .eq("active", true)
    .eq("dead", false) // 🚫 filtrer ut døde subreddits
    .or(`cooldown_until.is.null,cooldown_until.lt.${now}`);

  if (error) {
    console.warn("⚠️ Failed to load subreddits from Supabase:", error.message);
    return redditSubs;
  }

  if (data?.length > 0) {
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

// === 🔑 Reddit OAuth-token med caching ===
let redditTokenCache = { token: null, expires: 0 };

export async function getRedditAccessToken() {
  const now = Date.now();
  if (redditTokenCache.token && now < redditTokenCache.expires)
    return redditTokenCache.token;

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

// === ♻️ Erstatt eller marker subreddit som inaktiv/død ===
export async function replaceSubreddit(sub, category, reason = "default") {
  try {
    const cooldownHours = reason === "duplicate" ? 150 : 72;
    const cooldownUntil = new Date(
      Date.now() + cooldownHours * 60 * 60 * 1000
    ).toISOString();

    // 🧊 Sett eksisterende på pause
    await supabase
      .from("subreddits")
      .update({
        active: false,
        cooldown_until: cooldownUntil,
        updated_at: new Date().toISOString(),
      })
      .eq("category", category)
      .eq("name", sub);

    // 📈 Øk fail_count
    const { data: existing } = await supabase
      .from("subreddits")
      .select("fail_count")
      .eq("category", category)
      .eq("name", sub)
      .single();

    const failCount = (existing?.fail_count || 0) + 1;
    await supabase
      .from("subreddits")
      .update({ fail_count })
      .eq("category", category)
      .eq("name", sub);

    // 💀 Marker som død ved gjentatte duplikater
    if (reason === "duplicate" && failCount >= 2) {
      console.warn(`💀 r/${sub} marked as DEAD after repeated duplicates`);
      await supabase
        .from("subreddits")
        .update({ active: false, dead: true })
        .eq("category", category)
        .eq("name", sub);
    }

    // 🧠 GPT foreslår ny subreddit
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Suggest one active, safe, and popular subreddit about ${category}.
Avoid ${sub} or any subreddit that has been deactivated or marked as dead.`,
        },
      ],
      max_tokens: 15,
      temperature: 0.5,
    });

    const newSub = completion.choices[0]?.message?.content
      ?.replace(/^r\//, "")
      .trim();

    if (!newSub || newSub.toLowerCase() === sub.toLowerCase()) {
      console.warn(
        `⚠️ GPT did not suggest a valid replacement for ${category}.`
      );
      return;
    }

    // 🚫 Ikke bruk døde subreddits selv om GPT foreslår dem
    const { data: existingDead } = await supabase
      .from("subreddits")
      .select("dead")
      .eq("category", category)
      .eq("name", newSub)
      .single();

    if (existingDead?.dead) {
      console.warn(`💀 GPT suggested dead subreddit (${newSub}) — skipping.`);
      return;
    }

    console.log(`✅ Replaced r/${sub} → r/${newSub}`);

    // 🔄 Lagre ny i Supabase
    await supabase.from("subreddits").upsert(
      {
        category,
        name: newSub,
        active: true,
        dead: false,
        last_topic: null,
        last_used: null,
        fail_count: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "category,name" }
    );

    // 🔁 Oppdater i runtime
    redditSubs[category] = redditSubs[category]?.filter((s) => s !== sub) || [];
    redditSubs[category].push(newSub);
  } catch (err) {
    console.warn("⚠️ Replacement failed:", err.message);
  }
}

// === 🔎 Hent Reddit-trender for en gitt kategori ===
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

      // 💀 Døde eller stengte subreddits
      if (res.status === 403 || res.status === 404) {
        console.warn(`⚠️ r/${sub} is dead — replacing...`);
        await replaceSubreddit(sub, category, "dead");
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

      // 🚫 Gjentatt tema → lang cooldown og ev. dødsmerking
      if (prev?.last_topic === topicHash && prev?.last_used) {
        console.warn(`♻️ r/${sub} repeats old USED topic — duplicate detected`);
        await replaceSubreddit(sub, category, "duplicate");
        continue;
      }

      // ✅ Oppdater metadata
      await supabase.from("subreddits").upsert(
        {
          category,
          name: sub,
          active: true,
          dead: false,
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
