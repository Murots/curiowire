import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import {
  safeStr,
  stripHtml,
  truncate,
  normalizeWhitespace,
  xGetWithBearer,
  isTrue,
  sleep,
} from "./x-shared.js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY,
  X_OPENAI_MODEL,
  X_BEARER_TOKEN,
  X_DISCOVERY_ENABLED,
} = process.env;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!X_BEARER_TOKEN) throw new Error("Missing X_BEARER_TOKEN");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const MODEL = X_OPENAI_MODEL || "gpt-4o-mini";

async function getLatestCardAndXPost() {
  const { data: card, error: cardError } = await supabase
    .from("curiosity_cards")
    .select("*")
    .eq("status", "published")
    .eq("is_listed", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (cardError) throw cardError;
  if (!card) throw new Error("No published card found");

  const { data: xPost, error: xPostError } = await supabase
    .from("x_posts")
    .select("*")
    .eq("card_id", card.id)
    .maybeSingle();

  if (xPostError) throw xPostError;

  return { card, xPost };
}

async function createOrGetRun(cardId, xPostRowId, topicPayload, searchQueries) {
  const { data: existing, error: existingError } = await supabase
    .from("x_engagement_runs")
    .select("id")
    .eq("card_id", cardId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("x_engagement_runs")
    .insert({
      card_id: cardId,
      x_post_row_id: xPostRowId || null,
      topic_payload: topicPayload,
      search_queries: searchQueries,
      status: "queued",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function finishRun(runId, status, errorMessage = null) {
  const { error } = await supabase
    .from("x_engagement_runs")
    .update({
      status,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw error;
}

async function analyzeTopics(card) {
  const prompt = `
Return ONLY valid JSON.

Goal:
Create discovery inputs for X engagement research around this article.

Rules:
- Write in English
- Be concrete and niche-aware
- Avoid generic words unless useful
- 4 to 8 keywords
- 3 to 5 post search queries
- 4 to 6 reply angles

Return:
{
  "keywords": ["..."],
  "communities": ["..."],
  "post_queries": ["..."],
  "reply_angles": ["..."]
}

Article title: ${safeStr(card.title)}
Category: ${safeStr(card.category)}
SEO description: ${safeStr(card.seo_description)}
Summary: ${stripHtml(card.summary_normalized).slice(0, 900)}
Fun fact: ${stripHtml(card.fun_fact).slice(0, 300)}
Card text: ${stripHtml(card.card_text).slice(0, 1200)}
`;

  const r = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const content = r.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

function buildRecentSearchQuery(q) {
  const base = normalizeWhitespace(q);
  return `${base} lang:en -is:retweet -is:reply`;
}

async function searchPosts(postQueries) {
  const posts = [];
  const usersById = new Map();

  for (const q of (postQueries || []).slice(0, 5)) {
    const data = await xGetWithBearer(
      "/2/tweets/search/recent",
      {
        query: buildRecentSearchQuery(q),
        max_results: 20,
        sort_order: "recency",
        expansions: "author_id",
        "tweet.fields":
          "author_id,conversation_id,created_at,lang,public_metrics,text",
        "user.fields":
          "username,name,description,public_metrics,profile_image_url,verified",
      },
      X_BEARER_TOKEN,
    );

    for (const user of data.includes?.users || []) {
      usersById.set(user.id, user);
    }

    for (const post of data.data || []) {
      posts.push(post);
    }

    await sleep(500);
  }

  const byId = new Map();
  for (const post of posts) {
    if (post?.id && !byId.has(post.id)) byId.set(post.id, post);
  }

  return {
    posts: [...byId.values()],
    usersById,
  };
}

function scoreUser(user, topicPayload) {
  const metrics = user.public_metrics || {};
  const followers = metrics.followers_count || 0;
  const following = metrics.following_count || 1;

  const haystack = [
    safeStr(user.name),
    safeStr(user.username),
    safeStr(user.description),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const reasons = [];

  for (const kw of topicPayload.keywords || []) {
    if (haystack.includes(String(kw).toLowerCase())) {
      score += 10;
      reasons.push(`keyword:${kw}`);
    }
  }

  if (followers >= 1000 && followers <= 200000) {
    score += 18;
    reasons.push("good audience size");
  }

  if (followers / Math.max(following, 1) > 1.5) {
    score += 6;
    reasons.push("healthy ratio");
  }

  if (user.verified) {
    score += 3;
    reasons.push("verified");
  }

  return {
    score,
    reason: reasons.slice(0, 4).join(", "),
  };
}

function scorePost(post, author, topicPayload) {
  const text = safeStr(post.text).toLowerCase();
  const metrics = post.public_metrics || {};

  let score = 0;
  const reasons = [];

  for (const kw of topicPayload.keywords || []) {
    if (text.includes(String(kw).toLowerCase())) {
      score += 14;
      reasons.push(`keyword:${kw}`);
    }
  }

  const engagement =
    (metrics.like_count || 0) +
    (metrics.reply_count || 0) * 2 +
    (metrics.retweet_count || 0) * 2 +
    (metrics.quote_count || 0) * 2;

  score += Math.min(engagement, 50);

  if ((metrics.reply_count || 0) > 0) {
    score += 10;
    reasons.push("active discussion");
  }

  if (text.includes("?")) {
    score += 6;
    reasons.push("question");
  }

  if ((author?.public_metrics?.followers_count || 0) >= 500) {
    score += 6;
    reasons.push("relevant author reach");
  }

  return {
    score,
    reason: reasons.slice(0, 4).join(", "),
  };
}

async function generateReplySuggestions(
  card,
  topicPayload,
  targetPost,
  author,
) {
  const prompt = `
Return ONLY valid JSON.

Write 3 different X reply suggestions.

Rules:
- English
- Max 180 chars each
- No URL
- No hashtags
- No promo tone
- One insight
- One contextual reply
- One thoughtful question

Return:
{
  "replies": [
    "reply 1",
    "reply 2",
    "reply 3"
  ]
}

Article:
${safeStr(card.title)}
${safeStr(card.seo_description)}

Target author:
@${safeStr(author?.username)}

Target post:
${safeStr(targetPost.text)}
`;

  const r = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 280,
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = r.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  return (parsed.replies || [])
    .map((x) => truncate(x, 180))
    .filter(Boolean)
    .slice(0, 3);
}

async function storeUsers(runId, rankedUsers) {
  const rows = rankedUsers.slice(0, 10).map((item) => ({
    run_id: runId,
    x_user_id: item.user.id,
    username: item.user.username,
    display_name: item.user.name || null,
    description: item.user.description || null,
    followers_count: item.user.public_metrics?.followers_count ?? null,
    following_count: item.user.public_metrics?.following_count ?? null,
    tweet_count: item.user.public_metrics?.tweet_count ?? null,
    verified: item.user.verified ?? null,
    profile_image_url: item.user.profile_image_url || null,
    score: item.score,
    reason: item.reason || null,
  }));

  if (!rows.length) return;

  const { error } = await supabase.from("x_engagement_accounts").upsert(rows, {
    onConflict: "run_id,x_user_id",
  });

  if (error) throw error;
}

async function storePosts(runId, rankedPosts) {
  const rows = rankedPosts.slice(0, 10).map((item) => ({
    run_id: runId,
    x_post_id: item.post.id,
    x_author_id: item.post.author_id,
    author_username: item.author.username,
    author_name: item.author.name || null,
    post_text: item.post.text,
    post_url: `https://x.com/${item.author.username}/status/${item.post.id}`,
    posted_at: item.post.created_at || null,
    like_count: item.post.public_metrics?.like_count ?? null,
    reply_count: item.post.public_metrics?.reply_count ?? null,
    repost_count: item.post.public_metrics?.retweet_count ?? null,
    quote_count: item.post.public_metrics?.quote_count ?? null,
    bookmark_count: item.post.public_metrics?.bookmark_count ?? null,
    impression_count: item.post.public_metrics?.impression_count ?? null,
    score: item.score,
    reason: item.reason || null,
    suggested_replies: item.suggestedReplies || [],
  }));

  if (!rows.length) return;

  const { error } = await supabase.from("x_engagement_posts").upsert(rows, {
    onConflict: "run_id,x_post_id",
  });

  if (error) throw error;
}

async function run() {
  if (!isTrue(X_DISCOVERY_ENABLED)) {
    console.log("X_DISCOVERY_ENABLED is false. Skipping.");
    return;
  }

  const { card, xPost } = await getLatestCardAndXPost();
  const topicPayload = await analyzeTopics(card);

  const searchQueries = {
    post_queries: topicPayload.post_queries || [],
  };

  const runId = await createOrGetRun(
    card.id,
    xPost?.id || null,
    topicPayload,
    searchQueries,
  );

  try {
    const { posts, usersById } = await searchPosts(
      topicPayload.post_queries || [],
    );

    const rankedPosts = posts
      .map((post) => {
        const author = usersById.get(post.author_id);
        if (!author) return null;

        const scored = scorePost(post, author, topicPayload);
        return { post, author, ...scored };
      })
      .filter(Boolean)
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const rankedUsers = [...usersById.values()]
      .map((user) => {
        const scored = scoreUser(user, topicPayload);
        return { user, ...scored };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const item of rankedPosts.slice(0, 10)) {
      item.suggestedReplies = await generateReplySuggestions(
        card,
        topicPayload,
        item.post,
        item.author,
      );
      await sleep(300);
    }

    await storeUsers(runId, rankedUsers);
    await storePosts(runId, rankedPosts);
    await finishRun(runId, "completed");

    console.log(`Built engagement queue for card ${card.id}`);
  } catch (err) {
    await finishRun(
      runId,
      "failed",
      String(err?.message || err || "").slice(0, 800),
    );
    throw err;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
