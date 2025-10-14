"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import styled from "styled-components";

export default function HomePage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (!error && data) setArticles(data);
      setLoading(false);
    };

    fetchArticles();
  }, []);

  if (loading) return <Loader>Hot news coming in from the wire...</Loader>;

  return (
    <Wrapper>
      <Headline>Hot off the wire — Latest curiosities</Headline>
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

/* --- Styles --- */

const Wrapper = styled.div`
  max-width: 1300px;
  margin: 80px auto;
  padding: 0 40px 100px;
  background: var(--color-bg);
`;

const Headline = styled.h1`
  font-family: "Playfair Display", serif;
  font-size: 2.4rem;
  text-align: center;
  margin-bottom: 50px;
  color: var(--color-text);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
`;

const Loader = styled.p`
  font-family: "Inter", sans-serif;
  text-align: center;
  margin-top: 150px;
  color: var(--color-muted);
`;
