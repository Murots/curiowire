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
  SummaryWhat,
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
  excerpt,
}) {
  const formattedDate = new Date(created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const isEven = index % 2 === 0;

  // Extract WHAT summary from excerpt
  let summaryWhat = null;

  if (excerpt) {
    const match = excerpt.match(
      /<span\s+data-summary-what[^>]*>(.*?)<\/span>/s
    );
    if (match) summaryWhat = cleanText(match[1].trim());
  }

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
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "low"}
              width={600}
              height={338}
              style={{
                backgroundColor: "#eaeaea",
                display: "block",
                aspectRatio: "16 / 9",
                objectFit: "cover",
                objectPosition: "50% 30%",
                borderRadius: "6px",
              }}
            />
          )}
        </ImageWrapper>

        <Content>
          <Meta>
            <span>{category.toUpperCase()}</span> — {formattedDate}
          </Meta>

          <Title>{cleanText(title)}</Title>

          {summaryWhat && <SummaryWhat>{summaryWhat}</SummaryWhat>}

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </Link>
  );
}
