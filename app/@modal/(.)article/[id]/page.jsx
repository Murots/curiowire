// app/@modal/(.)article/[id]/page.jsx
import { supabaseServer } from "@/lib/supabaseServer";
import ArticleModalClient from "@/components/ArticleModal/ArticleModalClient";

export const revalidate = 900;

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

  return <ArticleModalClient card={card} />;
}
