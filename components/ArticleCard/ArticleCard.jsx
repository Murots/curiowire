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
              src={`${image_url}?width=600&quality=70&format=webp`}
              srcSet={`
        ${image_url}?width=300&quality=65&format=webp 300w,
        ${image_url}?width=600&quality=70&format=webp 600w,
        ${image_url}?width=900&quality=75&format=webp 900w
      `}
              sizes="(max-width: 600px) 300px,
             (max-width: 1200px) 600px,
             900px"
              alt={cleanText(title)}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              style={{ backgroundColor: "#eaeaea" }}
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
