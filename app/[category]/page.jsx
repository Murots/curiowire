"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function CategoryPage() {
  const { category } = useParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 15;

  // === Hent artikler med paginering ===
  const fetchCategoryArticles = async (pageIndex = 0) => {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("❌ Error fetching articles:", error.message);
      return [];
    }

    return data || [];
  };

  // === Første lasting ===
  useEffect(() => {
    if (!category) return;

    const loadInitial = async () => {
      setLoading(true);
      const initial = await fetchCategoryArticles(0);
      setArticles(initial);
      setHasMore(initial.length === PAGE_SIZE);
      setPage(0);
      setLoading(false);
    };

    loadInitial();
  }, [category]);

  // === Hent flere artikler ===
  const loadMore = async () => {
    const nextPage = page + 1;
    const newArticles = await fetchCategoryArticles(nextPage);

    if (newArticles.length < PAGE_SIZE) setHasMore(false);
    setArticles((prev) => [...prev, ...newArticles]);
    setPage(nextPage);
  };

  if (loading) return <Loader>Fetching stories from {category}...</Loader>;

  return (
    <Wrapper>
      <Title>{category.charAt(0).toUpperCase() + category.slice(1)}</Title>
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

      {hasMore && <LoadMore onClick={loadMore}>More ↓</LoadMore>}
    </Wrapper>
  );
}

/* === Hjelpefunksjon for intro === */
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
