// import { createClient } from "@supabase/supabase-js";
// import { xPostWithOAuth1, truncate, isTrue } from "./x-shared.js";

// const {
//   SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY,
//   X_REPLY_EXECUTION_ENABLED,
//   X_API_KEY,
//   X_API_KEY_SECRET,
//   X_ACCESS_TOKEN,
//   X_ACCESS_TOKEN_SECRET,
// } = process.env;

// if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
// if (!SUPABASE_SERVICE_ROLE_KEY)
//   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// async function getApprovedReplies(limit = 5) {
//   const { data, error } = await supabase
//     .from("x_engagement_posts")
//     .select("*")
//     .eq("action_status", "approved")
//     .is("replied_at", null)
//     .not("approved_reply", "is", null)
//     .order("score", { ascending: false })
//     .limit(limit);

//   if (error) throw error;
//   return data || [];
// }

// async function markReplied(rowId, replyPostId) {
//   const { error } = await supabase
//     .from("x_engagement_posts")
//     .update({
//       action_status: "replied",
//       replied_post_id: String(replyPostId),
//       replied_at: new Date().toISOString(),
//       error_message: null,
//     })
//     .eq("id", rowId);

//   if (error) throw error;
// }

// async function markFailed(rowId, message) {
//   const { error } = await supabase
//     .from("x_engagement_posts")
//     .update({
//       action_status: "failed",
//       error_message: truncate(String(message || ""), 800),
//     })
//     .eq("id", rowId);

//   if (error) throw error;
// }

// async function createReply(replyToId, text) {
//   const data = await xPostWithOAuth1({
//     path: "/2/tweets",
//     body: {
//       text,
//       reply: {
//         in_reply_to_tweet_id: String(replyToId),
//       },
//     },
//     apiKey: X_API_KEY,
//     apiKeySecret: X_API_KEY_SECRET,
//     accessToken: X_ACCESS_TOKEN,
//     accessTokenSecret: X_ACCESS_TOKEN_SECRET,
//   });

//   const replyId = data?.data?.id;
//   if (!replyId) {
//     throw new Error(
//       `Missing reply id in response: ${JSON.stringify(data).slice(0, 800)}`,
//     );
//   }

//   return String(replyId);
// }

// async function run() {
//   if (!isTrue(X_REPLY_EXECUTION_ENABLED)) {
//     console.log("X_REPLY_EXECUTION_ENABLED is false. Skipping.");
//     return;
//   }

//   const rows = await getApprovedReplies(5);

//   if (!rows.length) {
//     console.log("No approved replies found.");
//     return;
//   }

//   for (const row of rows) {
//     try {
//       const replyText = truncate(row.approved_reply || "", 180);
//       if (!replyText) {
//         await markFailed(row.id, "approved_reply was empty");
//         continue;
//       }

//       const replyPostId = await createReply(row.x_post_id, replyText);
//       await markReplied(row.id, replyPostId);

//       console.log(`Replied to ${row.x_post_id} with ${replyPostId}`);
//     } catch (err) {
//       await markFailed(row.id, err?.message || String(err));
//       console.warn(`Reply failed for row ${row.id}:`, err?.message || err);
//     }
//   }
// }

// run().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
