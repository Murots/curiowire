// app/@modal/(.)article/[id]/page.jsx
import { supabaseServer } from "@/lib/supabaseServer";
import ArticleModalClient from "@/components/ArticleModal/ArticleModalClient";

export const revalidate = 900;

export default async function ArticleModalPage({ params }) {
  const resolved = await Promise.resolve(params);
  const id = resolved?.id;

  if (!id) return null;

  const sb = supabaseServer();

  const { data: card } = await sb
    .from("curiosity_cards")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!card) return null;

  return <ArticleModalClient card={card} />;
}
