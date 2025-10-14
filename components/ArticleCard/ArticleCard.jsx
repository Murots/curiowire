"use client";

import React from "react";
import Link from "next/link";
import {
  Card,
  ImageWrapper,
  Image,
  Content,
  Category,
  Headline,
  SubIntro,
  Title,
  Excerpt,
  ReadMore,
} from "./ArticleCard.styles";

export default function ArticleCard({
  id,
  category,
  title,
  excerpt,
  image_url,
}) {
  return (
    <Link href={`/article/${id}`} style={{ textDecoration: "none" }}>
      <Card>
        <ImageWrapper>
          {image_url && <Image src={image_url} alt={title} />}
        </ImageWrapper>

        <Content>
          <Category>{category.toUpperCase()}</Category>
          <Headline>Extra! Extra!</Headline>
          <SubIntro>{getCategoryIntro(category)}</SubIntro>
          <Title>{title}</Title>

          <Excerpt>{excerpt}</Excerpt>

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </Link>
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
