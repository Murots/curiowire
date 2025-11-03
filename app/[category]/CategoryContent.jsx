"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import {
  Wrapper,
  Title,
  Grid,
  Loader,
  SubIntro,
  LoadMore,
} from "./page.styles";

export default function CategoryContent() {
  const { category } = useParams();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (!category) return;

    const fetchArticles = async () => {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("articles")
        .select("*", { count: "exact" })
        .eq("category", category)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("❌ Error fetching articles:", error.message);
        setLoading(false);
        return;
      }

      setArticles(data || []);
      setHasMore(count && to + 1 < count);
      setLoading(false);
    };

    fetchArticles();
  }, [category, page]);

  if (loading) return <Loader>Fetching stories from {category}...</Loader>;

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <Wrapper>
      <Title>{formattedCategory}</Title>
      <SubIntro>{getCategoryIntro(category)}</SubIntro>

      <Grid>
        {articles.map((a, i) => (
          <ArticleCard
            key={a.id}
            id={a.id}
            category={a.category}
            title={a.title}
            image_url={a.image_url}
            created_at={a.created_at}
            index={i}
          />
        ))}
      </Grid>

      {hasMore && (
        <LoadMore
          onClick={() =>
            (window.location.href = `/${category}?page=${page + 1}`)
          }
        >
          More ↓
        </LoadMore>
      )}
    </Wrapper>
  );
}

/* === Kategori-intro === */
function getCategoryIntro(category) {
  const intros = {
    science: "🧪 Echoes from the lab",
    technology: "⚙️ Traces from the dawn of innovation",
    space: "🚀 Whispers from the silent cosmos",
    nature: "🌿 Stories carved by wind and water",
    health: "🫀 Secrets of the human vessel",
    history: "🏺 Recovered from the dusty archives",
    culture: "🎭 Fragments from the heart of civilization",
    sports: "🏆 Legends born in the arena",
    products: "🛍️ Artifacts of human ingenuity",
    world: "🌍 Records from the halls of power",
  };
  return intros[category?.toLowerCase()] || "- Hot off the wire";
}
