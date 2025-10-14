"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Wrapper,
  CategoryTag,
  Headline,
  SubIntro,
  Title,
  Image,
  Excerpt,
  SourceLink,
  BackButton,
  NextLink,
  Divider,
} from "./ArticlePage.styles";

export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchArticle = async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();
      if (!error) setArticle(data);
    };
    fetchArticle();
  }, [id]);

  if (!article) return <Wrapper>Loading curiosity...</Wrapper>;

  const { category, title, excerpt, image_url, source_url } = article;

  return (
    <Wrapper>
      <CategoryTag>{category.toUpperCase()}</CategoryTag>
      <Divider />

      <Headline>Extra! Extra!</Headline>
      <SubIntro>{getCategoryIntro(category)}</SubIntro>
      <Title>{title}</Title>

      {image_url && <Image src={image_url} alt={title} />}

      <Excerpt>{excerpt}</Excerpt>

      <SourceLink href={source_url} target="_blank" rel="noopener noreferrer">
        Read all about it here →
      </SourceLink>

      {article.image_credit && (
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--color-muted)",
            fontStyle: "italic",
            marginTop: "8px",
          }}
        >
          {article.image_credit}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <BackButton onClick={() => router.back()}>
          ← Back to {category}
        </BackButton>
        <NextLink href={`/${category}`}>Next curiosity →</NextLink>
      </div>
    </Wrapper>
  );
}

/* === Hjelpefunksjoner === */

function getCategoryIntro(category) {
  const intros = {
    science: "Breakthrough in the lab —",
    technology: "From the frontier of innovation —",
    space: "From beyond the stars —",
    nature: "From the wild corners of Earth —",
    health: "Vital news for body and mind —",
    history: "From the dusty archives —",
    culture: "From the heart of civilization —",
    sports: "Straight from the arena —",
    products: "Hot off the market —",
    world: "From the halls of power —",
  };
  return intros[category?.toLowerCase()] || "Hot off the wire —";
}
