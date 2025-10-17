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
    <Link
      href={`/article/${id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <Card $reverse={isEven}>
        <ImageWrapper>
          {image_url && <Image src={image_url} alt={cleanText(title)} />}
        </ImageWrapper>

        <Content>
          <Meta>
            <span>{category.toUpperCase()}</span> — {formattedDate}
          </Meta>

          <Title>{cleanText(title)}</Title>

          {/* {view_count !== undefined && (
            <p
              style={{
                color: "var(--color-muted)",
                fontSize: "0.9rem",
                marginTop: "6px",
              }}
            >
              🔥 {view_count} views this week
            </p>
          )} */}

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </Link>
  );
}
