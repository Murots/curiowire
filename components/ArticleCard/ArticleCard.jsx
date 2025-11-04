"use client";

import React from "react";
import Link from "next/link";
import {
  Card,
  ImageWrapper,
  Image,
  Content,
  Meta,
  Title,
  ReadMore,
} from "./ArticleCard.styles";

import { cleanText } from "@/app/api/utils/cleanText";

export default function ArticleCard({
  id,
  category,
  title,
  image_url,
  created_at,
  index,
  view_count,
}) {
  const formattedDate = new Date(created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const isEven = index % 2 === 0;

  return (
    <Link href={`/article/${id}`}>
      <Card $reverse={isEven}>
        <ImageWrapper>
          {image_url && (
            <Image
              src={image_url}
              alt={cleanText(title)}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          )}
        </ImageWrapper>

        <Content>
          <Meta>
            <span>{category.toUpperCase()}</span> — {formattedDate}
          </Meta>

          <Title>{cleanText(title)}</Title>

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </Link>
  );
}
