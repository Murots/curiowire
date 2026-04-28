// // app/@modal/(.)article/[id]/page.jsx
// import { supabaseServer } from "@/lib/supabaseServer";
// import ArticleModalClient from "@/components/ArticleModal/ArticleModalClient";

// export const revalidate = 900;

// async function fetchVideo(articleId) {
//   const sb = supabaseServer();

//   const { data } = await sb
//     .from("live_youtube_videos")
//     .select("youtube_video_id, youtube_url, posted_at, posted_results")
//     .eq("article_id", Number(articleId))
//     .order("posted_at", { ascending: false })
//     .limit(1)
//     .maybeSingle();

//   if (!data) return null;

//   return {
//     ...data,
//     status: "posted",
//   };
// }

// export default async function ArticleModalPage({ params }) {
//   // Next App Router can hand you params in slightly different shapes.
//   const resolved = await Promise.resolve(params);
//   const rawId = resolved?.id;

//   // Keep modal slot silent if the route is malformed
//   if (!rawId) return null;

//   // Supabase IDs are numeric in your usage elsewhere (Number(card.id))
//   const id = Number(rawId);
//   if (!Number.isFinite(id) || id <= 0) return null;

//   const sb = supabaseServer();

//   // Use maybeSingle to avoid throwing hard if nothing matches
//   const { data: card, error } = await sb
//     .from("curiosity_cards")
//     .select("*")
//     .eq("id", id)
//     .eq("status", "published")
//     .maybeSingle();

//   if (error) return null;
//   if (!card) return null;

//   const video = await fetchVideo(card.id);

//   return <ArticleModalClient card={card} video={video} />;
// }

// app/@modal/(.)article/[id]/page.jsx
import { supabaseServer } from "@/lib/supabaseServer";
import ArticleModalClient from "@/components/ArticleModal/ArticleModalClient";

export const revalidate = 900;

async function fetchVideo(articleId) {
  const sb = supabaseServer();

  const { data } = await sb
    .from("live_youtube_videos")
    .select("youtube_video_id, youtube_url, posted_at, posted_results")
    .eq("article_id", Number(articleId))
    .order("posted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    status: "posted",
  };
}

async function fetchQuestions(articleId) {
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("article_questions")
    .select("id, question, slug, category, position")
    .eq("card_id", Number(articleId))
    .eq("status", "published")
    .eq("is_indexed", true)
    .order("position", { ascending: true });

  if (error) return [];
  return Array.isArray(data) ? data : [];
}

export default async function ArticleModalPage({ params }) {
  // Next App Router can hand you params in slightly different shapes.
  const resolved = await Promise.resolve(params);
  const rawId = resolved?.id;

  // Keep modal slot silent if the route is malformed
  if (!rawId) return null;

  // Supabase IDs are numeric in your usage elsewhere (Number(card.id))
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const sb = supabaseServer();

  // Use maybeSingle to avoid throwing hard if nothing matches
  const { data: card, error } = await sb
    .from("curiosity_cards")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) return null;
  if (!card) return null;

  const video = await fetchVideo(card.id);
  const questions = await fetchQuestions(card.id);

  return <ArticleModalClient card={card} video={video} questions={questions} />;
}
