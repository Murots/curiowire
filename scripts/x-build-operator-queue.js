import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function truncate(str, max = 500) {
  const s = safeStr(str);
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

async function getLatestRun() {
  const { data, error } = await supabase
    .from("x_engagement_runs")
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

async function getRunPosts(runId) {
  const { data, error } = await supabase
    .from("x_engagement_posts")
    .select("*")
    .eq("run_id", runId)
    .order("score", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

async function getRunAccounts(runId) {
  const { data, error } = await supabase
    .from("x_engagement_accounts")
    .select("*")
    .eq("run_id", runId)
    .order("score", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

async function clearQueue() {
  const { error } = await supabase
    .from("x_operator_queue")
    .delete()
    .gt("id", 0);

  if (error) throw error;
}

async function insertQueueRows(rows) {
  if (!rows.length) return;

  const { error } = await supabase.from("x_operator_queue").insert(rows);

  if (error) throw error;
}

async function run() {
  const latestRun = await getLatestRun();
  if (!latestRun) {
    console.log("No engagement run found.");
    return;
  }

  const posts = await getRunPosts(latestRun.id);
  const accounts = await getRunAccounts(latestRun.id);

  await clearQueue();

  const rows = [];

  posts.forEach((post, index) => {
    const replies = Array.isArray(post.suggested_replies)
      ? post.suggested_replies
      : [];

    rows.push({
      card_id: latestRun.card_id,
      run_id: latestRun.id,
      item_type: "reply",
      source_row_id: post.id,
      sort_order: index + 1,
      title: `@${safeStr(post.author_username)}`,
      subtitle: `Score ${post.score}${post.reason ? ` · ${post.reason}` : ""}`,
      source_text: truncate(post.post_text, 900),
      source_url: safeStr(post.post_url),
      option_1: safeStr(replies[0]),
      option_2: safeStr(replies[1]),
      option_3: safeStr(replies[2]),
      selected_option: null,
      custom_response: null,
      decision: "pending",
      note: null,
    });
  });

  accounts.forEach((account, index) => {
    rows.push({
      card_id: latestRun.card_id,
      run_id: latestRun.id,
      item_type: "account",
      source_row_id: account.id,
      sort_order: 100 + index + 1,
      title: `@${safeStr(account.username)}`,
      subtitle: `Score ${account.score}${account.followers_count ? ` · ${account.followers_count} followers` : ""}${account.reason ? ` · ${account.reason}` : ""}`,
      source_text: truncate(account.description, 900),
      source_url: `https://x.com/${safeStr(account.username)}`,
      option_1: null,
      option_2: null,
      option_3: null,
      selected_option: null,
      custom_response: null,
      decision: "pending",
      note: null,
    });
  });

  await insertQueueRows(rows);

  console.log(
    `Inserted ${rows.length} operator queue rows for card ${latestRun.card_id}`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
