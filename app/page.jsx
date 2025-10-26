"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import { Wrapper, Headline, Grid, Loader } from "./page.styles";

export default function HomePage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyTopArticles = async () => {
      try {
        // === 1️⃣ Hent ukens mest leste artikler fra viewet ===
        const { data, error } = await supabase
          .from("weekly_top_articles")
          .select("*")
          .order("view_count", { ascending: false })
          .limit(10);

        if (error) {
          console.error(
            "❌ Error fetching weekly top articles:",
            error.message
          );
          setArticles([]);
        } else if (data && data.length > 0) {
          setArticles(data);
        } else {
          // === 2️⃣ Fallback: hent nyeste artikler hvis ingen visninger denne uken ===
          const { data: fallback, error: fallbackError } = await supabase
            .from("articles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);

          if (fallbackError) {
            console.error(
              "❌ Error fetching fallback articles:",
              fallbackError.message
            );
            setArticles([]);
          } else {
            setArticles(fallback || []);
          }
        }
      } catch (err) {
        console.error("⚠️ Unexpected error:", err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyTopArticles();
  }, []);

  if (loading) return <Loader>Fetching this week’s top curiosities...</Loader>;

  return (
    <Wrapper>
      <Headline>🔥Trending curiosities</Headline>

      <Grid>
        {articles.map((a, i) => (
          <ArticleCard
            key={a.id}
            id={a.id}
            category={a.category}
            title={a.title}
            excerpt={a.excerpt}
            image_url={a.image_url}
            created_at={a.created_at}
            index={i}
          />
        ))}
      </Grid>
    </Wrapper>
  );
}
