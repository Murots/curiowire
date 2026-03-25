import { createClient } from "@supabase/supabase-js";
import { xPostWithOAuth1 } from "./x-shared.js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  X_REPLY_EXECUTION_ENABLED,
  X_API_KEY,
  X_API_KEY_SECRET,
  X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET,
} = process.env;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function isTrue(v) {
  return String(v || "").toLowerCase() === "true";
}

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function truncate(str, max = 180) {
  const s = safeStr(str);
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function pickReply(row) {
  if (safeStr(row.custom_response)) {
    return truncate(row.custom_response, 180);
  }

  if (row.selected_option === "1") return truncate(row.option_1, 180);
  if (row.selected_option === "2") return truncate(row.option_2, 180);
  if (row.selected_option === "3") return truncate(row.option_3, 180);

  return "";
}

function formatErrorMessage(err) {
  return String(err?.message || err || "").slice(0, 800);
}

function isReplyRestrictionError(message) {
  const normalized = safeStr(message).toLowerCase();

  return (
    normalized.includes("reply to this conversation is not allowed") ||
    normalized.includes(
      "you have not been mentioned or otherwise engaged by the author",
    )
  );
}

async function getApprovedReplyQueue(limit = 5) {
  const { data, error } = await supabase
    .from("x_operator_queue")
    .select("*")
    .eq("item_type", "reply")
    .eq("decision", "approve")
    .is("executed_at", null)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function getOriginalPost(sourceRowId) {
  const { data, error } = await supabase
    .from("x_engagement_posts")
    .select("*")
    .eq("id", sourceRowId)
    .single();

  if (error) throw error;
  return data;
}

async function createReply(replyToId, text) {
  const data = await xPostWithOAuth1({
    path: "/2/tweets",
    body: {
      text,
      reply: {
        in_reply_to_tweet_id: String(replyToId),
      },
    },
    apiKey: X_API_KEY,
    apiKeySecret: X_API_KEY_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessTokenSecret: X_ACCESS_TOKEN_SECRET,
  });

  return data?.data?.id;
}

async function markDone(queueId) {
  const { error } = await supabase
    .from("x_operator_queue")
    .update({
      decision: "done",
      executed_at: new Date().toISOString(),
      note: null,
    })
    .eq("id", queueId);

  if (error) throw error;
}

async function markFailed(queueId, note) {
  const { error } = await supabase
    .from("x_operator_queue")
    .update({
      decision: "failed",
      note: String(note || "").slice(0, 800),
    })
    .eq("id", queueId);

  if (error) throw error;
}

async function syncEngagementPost(sourceRowId, replyText, replyPostId) {
  const { error } = await supabase
    .from("x_engagement_posts")
    .update({
      action_status: "replied",
      approved_reply: replyText,
      replied_post_id: String(replyPostId),
      replied_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", sourceRowId);

  if (error) throw error;
}

async function markEngagementPostFailed(sourceRowId, errorMessage) {
  const { error } = await supabase
    .from("x_engagement_posts")
    .update({
      action_status: "failed",
      error_message: String(errorMessage || "").slice(0, 800),
    })
    .eq("id", sourceRowId);

  if (error) throw error;
}

async function run() {
  if (!isTrue(X_REPLY_EXECUTION_ENABLED)) {
    console.log("X_REPLY_EXECUTION_ENABLED is false. Skipping.");
    return;
  }

  const rows = await getApprovedReplyQueue(5);

  if (!rows.length) {
    console.log("No approved reply rows found.");
    return;
  }

  let successCount = 0;
  let failedCount = 0;

  for (const row of rows) {
    try {
      const replyText = pickReply(row);

      if (!replyText) {
        const message = "No selected_option or custom_response";
        await markFailed(row.id, message);
        await markEngagementPostFailed(row.source_row_id, message);
        failedCount += 1;
        console.error(`Reply failed for queue row ${row.id}: ${message}`);
        continue;
      }

      const original = await getOriginalPost(row.source_row_id);

      if (!safeStr(original?.x_post_id)) {
        const message = "Missing original x_post_id on x_engagement_posts row";
        await markFailed(row.id, message);
        await markEngagementPostFailed(row.source_row_id, message);
        failedCount += 1;
        console.error(`Reply failed for queue row ${row.id}: ${message}`);
        continue;
      }

      const replyPostId = await createReply(original.x_post_id, replyText);

      if (!replyPostId) {
        throw new Error("X reply succeeded but no reply post id was returned");
      }

      await markDone(row.id);
      await syncEngagementPost(row.source_row_id, replyText, replyPostId);

      successCount += 1;
      console.log(`Reply sent for queue row ${row.id} -> ${replyPostId}`);
    } catch (err) {
      const rawMessage = formatErrorMessage(err);
      const message = isReplyRestrictionError(rawMessage)
        ? `Blocked by X reply settings: ${rawMessage}`
        : rawMessage;

      failedCount += 1;

      console.error(`Reply failed for queue row ${row.id}: ${message}`);

      await markFailed(row.id, message);
      await markEngagementPostFailed(row.source_row_id, message);
    }
  }

  console.log(
    `Reply worker finished. Success: ${successCount}, Failed: ${failedCount}`,
  );

  if (failedCount > 0) {
    throw new Error(`${failedCount} reply attempt(s) failed`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
