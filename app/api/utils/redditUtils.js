// // === REDDIT UTILS (CurioWire v4.0) ===
// // Selv-reparerende Reddit-håndtering m/ semantic duplicate detection
// // • Automatisk utskifting og cooldown
// // • Permanent ekskludering av døde subreddits
// // • Fail-teller + AI-basert erstatning
// // • NEW: semantic_signature duplikatkontroll
// // • NEW: unngå subreddits som gir like temaer
// // • NEW: lagrer signature i subreddits for læring over tid

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";
// import { normalize } from "./duplicateUtils.js"; // NYTT

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// const supabase = createClient(
//   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY ||
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// let redditSubs = {};

// // ================================================================
// // 🔹 Last inn dynamiske subreddits fra Supabase
// // ================================================================
// export async function loadDynamicSubs(baseSubs) {
//   redditSubs = baseSubs;
//   const now = new Date().toISOString();

//   const { data, error } = await supabase
//     .from("subreddits")
//     .select("category, name, cooldown_until")
//     .eq("active", true)
//     .eq("dead", false)
//     .or(`cooldown_until.is.null,cooldown_until.lt.${now}`);

//   if (error) {
//     console.warn("⚠️ Failed to load subreddits from Supabase:", error.message);
//     return redditSubs;
//   }

//   if (data?.length > 0) {
//     console.log(`📥 Loaded ${data.length} active subreddits from Supabase.`);
//     const dynamic = {};

//     for (const row of data) {
//       if (!dynamic[row.category]) dynamic[row.category] = [];
//       dynamic[row.category].push(row.name);
//     }

//     for (const key of Object.keys(redditSubs)) {
//       const base = redditSubs[key] || [];
//       const fromDB = dynamic[key] || [];
//       redditSubs[key] = Array.from(new Set([...fromDB, ...base]));
//     }
//   } else {
//     console.log("⚠️ No eligible subreddits found (all may be in cooldown).");
//   }

//   return redditSubs;
// }

// // ================================================================
// // 🔑 Reddit OAuth caching
// // ================================================================
// let redditTokenCache = { token: null, expires: 0 };

// export async function getRedditAccessToken() {
//   const now = Date.now();
//   if (redditTokenCache.token && now < redditTokenCache.expires)
//     return redditTokenCache.token;

//   const auth = Buffer.from(
//     `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
//   ).toString("base64");

//   try {
//     const res = await fetch("https://www.reddit.com/api/v1/access_token", {
//       method: "POST",
//       headers: {
//         Authorization: `Basic ${auth}`,
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: "grant_type=client_credentials",
//     });

//     const data = await res.json();
//     if (!data.access_token) return null;

//     redditTokenCache = {
//       token: data.access_token,
//       expires: now + (data.expires_in - 60) * 1000,
//     };

//     console.log("🔑 New Reddit OAuth token fetched.");
//     return redditTokenCache.token;
//   } catch (err) {
//     console.error("❌ Reddit token request failed:", err.message);
//     return null;
//   }
// }

// // ================================================================
// // ♻️ Erstatt subreddit
// // ================================================================
// export async function replaceSubreddit(sub, category, reason = "default") {
//   try {
//     const cooldownHours = reason === "duplicate" ? 150 : 72;
//     const cooldownUntil = new Date(
//       Date.now() + cooldownHours * 60 * 60 * 1000
//     ).toISOString();

//     // 🧊 Sett eksisterende på pause
//     await supabase
//       .from("subreddits")
//       .update({
//         active: false,
//         cooldown_until: cooldownUntil,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("category", category)
//       .eq("name", sub);

//     // 📈 Øk fail count
//     const { data: existing } = await supabase
//       .from("subreddits")
//       .select("fail_count")
//       .eq("category", category)
//       .eq("name", sub)
//       .single();

//     const failCount = (existing?.fail_count || 0) + 1;

//     await supabase
//       .from("subreddits")
//       .update({ fail_count })
//       .eq("category", category)
//       .eq("name", sub);

//     // 💀 Marker som død etter 2 duplikater
//     if (reason === "duplicate" && failCount >= 2) {
//       console.warn(`💀 r/${sub} marked as DEAD after repeated duplicates`);
//       await supabase
//         .from("subreddits")
//         .update({ active: false, dead: true })
//         .eq("category", category)
//         .eq("name", sub);
//     }

//     // === GPT foreslår ny subreddit ===
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "user",
//           content: `Suggest one safe, active, high-quality subreddit for category "${category}". Avoid r/${sub} and avoid any that are dead or deactivated.`,
//         },
//       ],
//       max_tokens: 15,
//       temperature: 0.4,
//     });

//     const newSub = completion.choices[0]?.message?.content
//       ?.replace(/^r\//, "")
//       .trim();

//     if (!newSub) {
//       console.warn("⚠️ GPT gave no replacement.");
//       return;
//     }

//     // 🚫 Ikke bruk døde subreddits
//     const { data: existingDead } = await supabase
//       .from("subreddits")
//       .select("dead")
//       .eq("category", category)
//       .eq("name", newSub)
//       .single();

//     if (existingDead?.dead) {
//       console.warn(`💀 GPT suggested dead subreddit (${newSub}) — skipping.`);
//       return;
//     }

//     console.log(`✅ Replaced r/${sub} → r/${newSub}`);

//     await supabase.from("subreddits").upsert(
//       {
//         category,
//         name: newSub,
//         active: true,
//         dead: false,
//         last_topic: null,
//         last_used: null,
//         fail_count: 0,
//         updated_at: new Date().toISOString(),
//       },
//       { onConflict: "category,name" }
//     );

//     // Oppdater runtime
//     redditSubs[category] = redditSubs[category]?.filter((s) => s !== sub) || [];
//     redditSubs[category].push(newSub);
//   } catch (err) {
//     console.warn("⚠️ Replacement failed:", err.message);
//   }
// }

// // ================================================================
// // 🔎 Hent Reddit-trender for kategori
// // Nå med semantic duplicate detection (før generate.js)
// // ================================================================
// export async function fetchRedditTrends(category, subs) {
//   const topics = [];
//   const baseUrl = "https://oauth.reddit.com";
//   const token = await getRedditAccessToken();

//   if (!token) {
//     console.warn(`⚠️ Missing Reddit token — skipping ${category}`);
//     return topics;
//   }

//   const randomSubs = subs.sort(() => 0.5 - Math.random()).slice(0, 5);

//   for (const sub of randomSubs) {
//     try {
//       const res = await fetch(`${baseUrl}/r/${sub}/hot.json?limit=10`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "User-Agent": "CurioWireBot/1.0 (+https://curiowire.com)",
//         },
//       });

//       // 💀 Død subreddit
//       if (res.status === 403 || res.status === 404) {
//         console.warn(`⚠️ r/${sub} is dead — replacing...`);
//         await replaceSubreddit(sub, category, "dead");
//         continue;
//       }

//       if (!res.ok) continue;
//       const data = await res.json();

//       const posts = data?.data?.children || [];

//       // ——— PARSE TITLES ———
//       const titles = posts
//         .map((p) => {
//           const title = p.data?.title?.trim();
//           return (
//             title && {
//               title,
//               subreddit: sub,
//               semantic_signature: normalize(title),
//             }
//           );
//         })
//         .filter(Boolean)
//         .slice(0, 5);

//       if (titles.length === 0) continue;

//       const firstTitle = titles[0];
//       const signature = firstTitle.semantic_signature;

//       // ==================================================
//       // NEW: Sjekk semantic_signature mot articles FØR AI
//       // Spar tid, penger, duplikater
//       // ==================================================
//       const { data: dup } = await supabase
//         .from("articles")
//         .select("id")
//         .ilike("semantic_signature", `%${signature}%`)
//         .limit(1);

//       if (dup?.length > 0) {
//         console.warn(
//           `♻️ Reddit topic "${firstTitle.title}" already exists — replacing subreddit ${sub}`
//         );
//         await replaceSubreddit(sub, category, "duplicate");
//         continue;
//       }

//       // ——— Metadata-hash for last_topic ———
//       const topicHash = firstTitle.title.toLowerCase().slice(0, 40);

//       const { data: prev } = await supabase
//         .from("subreddits")
//         .select("last_topic, last_used, semantic_signature")
//         .eq("category", category)
//         .eq("name", sub)
//         .single();

//       // Duplikat: samme hash + flagged as used
//       if (prev?.last_topic === topicHash && prev?.last_used) {
//         console.warn(
//           `♻️ r/${sub} repeats last USED topic — duplicate detected`
//         );
//         await replaceSubreddit(sub, category, "duplicate");
//         continue;
//       }

//       // ——— Lagre metadata + semantic_signature ———
//       await supabase.from("subreddits").upsert(
//         {
//           category,
//           name: sub,
//           active: true,
//           dead: false,
//           last_topic: topicHash,
//           last_used: false,
//           semantic_signature: signature,
//           updated_at: new Date().toISOString(),
//         },
//         { onConflict: "category,name" }
//       );

//       topics.push(...titles);
//     } catch (err) {
//       console.warn(`⚠️ Reddit fetch error for r/${sub}:`, err.message);
//     }
//   }

//   return topics.slice(0, 5);
// }
// === REDDIT UTILS (CurioWire v5.0) ===
// Strømlinjeformet Reddit-håndtering:
// • Dynamiske subreddits fra DB
// • OAuth caching
// • Automatisk erstatning av døde/dupe subreddits
// • last_topic / last_used for variasjon
// • Ingen semantic duplicate detection (nå i generate.js)

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let redditSubs = {};

// ================================================================
// 🔹 Load dynamic subreddits
// ================================================================
export async function loadDynamicSubs(baseSubs) {
  redditSubs = baseSubs;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subreddits")
    .select("category, name, cooldown_until")
    .eq("active", true)
    .eq("dead", false)
    .or(`cooldown_until.is.null,cooldown_until.lt.${now}`);

  if (error) {
    console.warn("⚠️ Failed to load subreddits:", error.message);
    return redditSubs;
  }

  if (data?.length > 0) {
    const dynamic = {};

    for (const row of data) {
      if (!dynamic[row.category]) dynamic[row.category] = [];
      dynamic[row.category].push(row.name);
    }

    for (const key of Object.keys(redditSubs)) {
      const fromDB = dynamic[key] || [];
      const base = redditSubs[key] || [];
      redditSubs[key] = Array.from(new Set([...fromDB, ...base]));
    }
  } else {
    console.log("⚠️ All subreddits may be cooling down.");
  }

  return redditSubs;
}

// ================================================================
// 🔑 Reddit OAuth caching
// ================================================================
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
    console.error("❌ Failed to fetch Reddit token:", err.message);
    return null;
  }
}

// ================================================================
// ♻️ Replace subreddit
// ================================================================
export async function replaceSubreddit(sub, category, reason = "default") {
  try {
    const cooldownHours = reason === "duplicate" ? 150 : 72;
    const cooldownUntil = new Date(
      Date.now() + cooldownHours * 60 * 60 * 1000
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

    const { data: current } = await supabase
      .from("subreddits")
      .select("fail_count")
      .eq("category", category)
      .eq("name", sub)
      .single();

    const newFail = (current?.fail_count || 0) + 1;

    await supabase
      .from("subreddits")
      .update({ fail_count: newFail })
      .eq("category", category)
      .eq("name", sub);

    if (reason === "dead" || newFail >= 2) {
      // Permanently kill
      await supabase
        .from("subreddits")
        .update({ dead: true })
        .eq("category", category)
        .eq("name", sub);
    }

    // Let GPT suggest a new one
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Suggest one active, safe subreddit for category "${category}". Avoid r/${sub}.`,
        },
      ],
      max_tokens: 20,
      temperature: 0.4,
    });

    const suggestion = completion.choices[0]?.message?.content
      ?.replace(/^r\//i, "")
      ?.trim();

    if (!suggestion) return;

    console.log(`🔄 Replacing r/${sub} → r/${suggestion}`);

    await supabase.from("subreddits").upsert(
      {
        category,
        name: suggestion,
        active: true,
        dead: false,
        last_topic: null,
        last_used: null,
        fail_count: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "category,name" }
    );

    redditSubs[category] = [
      ...(redditSubs[category]?.filter((s) => s !== sub) || []),
      suggestion,
    ];
  } catch (err) {
    console.warn("⚠️ Failed to replace subreddit:", err.message);
  }
}

// ================================================================
// 🔎 Fetch Reddit trends (NO duplicate filtering — generate handles it)
// ================================================================
export async function fetchRedditTrends(category, subs) {
  const topics = [];
  const baseUrl = "https://oauth.reddit.com";

  const token = await getRedditAccessToken();
  if (!token) return topics;

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
        console.warn(`💀 r/${sub} appears dead — replacing`);
        await replaceSubreddit(sub, category, "dead");
        continue;
      }

      if (!res.ok) continue;

      const payload = await res.json();
      const posts = payload?.data?.children || [];

      // Extract titles (up to 5)
      const titles = posts
        .map((p) => {
          const t = p.data?.title?.trim();
          return t && { title: t, subreddit: sub };
        })
        .filter(Boolean)
        .slice(0, 5);

      if (!titles.length) continue;

      const firstTitle = titles[0];
      const topicHash = firstTitle.title.toLowerCase().slice(0, 40);

      const { data: prev } = await supabase
        .from("subreddits")
        .select("last_topic, last_used")
        .eq("category", category)
        .eq("name", sub)
        .single();

      // Avoid giving same topic repeatedly for this subreddit
      if (prev?.last_topic === topicHash && prev?.last_used) {
        console.warn(`♻️ r/${sub} repeated last topic — replacing`);
        await replaceSubreddit(sub, category, "duplicate");
        continue;
      }

      // Update DB metadata
      await supabase.from("subreddits").upsert(
        {
          category,
          name: sub,
          active: true,
          dead: false,
          last_topic: topicHash,
          last_used: false,
          fail_count: 0,
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
