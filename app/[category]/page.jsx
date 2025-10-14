"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import { Wrapper, Title, Grid, Loader } from "./page.styles";

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
      <Title>
        {category.charAt(0).toUpperCase() + category.slice(1)} — From the
        CurioWire archives
      </Title>

      <Grid>
        {articles.map((a) => (
          <ArticleCard
            key={a.id}
            id={a.id}
            category={a.category}
            title={a.title}
            excerpt={a.excerpt}
            image_url={a.image_url}
          />
        ))}
      </Grid>
    </Wrapper>
  );
}
