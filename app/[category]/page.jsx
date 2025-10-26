"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import { Wrapper, Title, Grid, Loader, SubIntro } from "./page.styles";

export default function CategoryPage() {
  const { category } = useParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;

    const fetchCategoryArticles = async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) setArticles(data);
      setLoading(false);
    };

    fetchCategoryArticles();
  }, [category]);

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
    </Wrapper>
  );
}

/* === Hjelpefunksjoner === */

function getCategoryIntro(category) {
  const intros = {
    science: "🧪 Echoes from the lab",
    technology: "⚙️ Traces from the down of innovation",
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
