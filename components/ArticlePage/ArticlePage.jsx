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

import { cleanText } from "../../app/api/utils/cleanText";

export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchArticleAndLogView = async () => {
      // === 1️⃣ Hent artikkelen ===
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setArticle(data);

        // === 2️⃣ Logg visning ===
        const { error: viewError } = await supabase
          .from("article_views")
          .insert([{ article_id: id }]);

        if (viewError) {
          console.error("❌ Error logging view:", viewError.message);
        } else {
          console.log("👁️ Logged view for article:", id);
        }
      } else {
        console.error("❌ Error fetching article:", error);
      }
    };

    fetchArticleAndLogView();
  }, [id]);

  if (!article) return <Wrapper>Loading curiosity...</Wrapper>;

  const { category, title, excerpt, image_url, source_url } = article;

  return (
    <Wrapper>
      <CategoryTag>{category.toUpperCase()}</CategoryTag>
      <Divider />

      <Headline>Extra! Extra!</Headline>
      <SubIntro>{getCategoryIntro(category)}</SubIntro>
      <Title>{cleanText(title)}</Title>

      {image_url && <Image src={image_url} alt={cleanText(title)} />}

      <Excerpt>{cleanText(excerpt)}</Excerpt>

      {/* 🛒 Affiliate-link kun for produktartikler */}
      {category === "products" && source_url && (
        <SourceLink href={source_url} target="_blank" rel="noopener noreferrer">
          See featured product→
        </SourceLink>
      )}

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
      {/* === Amazon affiliate disclaimer (kun for product-kategorien) === */}
      {category?.toLowerCase() === "products" && (
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--color-muted)",
            textAlign: "center",
            marginTop: "30px",
            fontStyle: "italic",
            lineHeight: "1.4",
          }}
        >
          As an Amazon Associate, CurioWire earns from qualifying purchases.
        </p>
      )}
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
