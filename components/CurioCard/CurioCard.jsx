// components/CurioCard/CurioCard.jsx
"use client";

import React, { useMemo } from "react";
import {
  CardLink,
  Card,
  ImageWrapper,
  Image,
  Content,
  MetaRow,
  CategoryBadge,
  Title,
  Ingress,
  ReadMore,
  FireBadge,
} from "./CurioCard.styles";
import { cleanText } from "@/app/api/utils/cleanText";

// ✅ SSR-safe: extract the text inside <span data-summary-what>...</span>
// No DOMParser, no window dependency
function extractSummaryWhatSSR(html) {
  const s = String(html || "");
  // Match: <span data-summary-what> ... </span>
  // Allow attributes and whitespace/newlines
  const m = s.match(/<span[^>]*data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return "";

  // Strip any nested tags inside the span + decode common entities lightly
  const raw = m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Optional: very small entity decode (avoid heavy libs)
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ✅ Deterministic UTC date formatting (avoids locale/ICU mismatch)
function formatDateUTC(dateInput) {
  const d = new Date(dateInput);
  if (!Number.isFinite(d.getTime())) return "";

  const day = String(d.getUTCDate()).padStart(2, "0");
  const monthIdx = d.getUTCMonth();
  const year = d.getUTCFullYear();

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const mon = months[monthIdx] || "";

  return `${day} ${mon} ${year}`;
}

export default function CurioCard({ card, isTrending = false, onOpen }) {
  const {
    id,
    category,
    title,
    summary_normalized,
    image_url,
    created_at,
    wow_score,
  } = card;

  const isWide = Number(wow_score) >= 90;
  const href = `/article/${id}`;

  const formattedDate = useMemo(() => formatDateUTC(created_at), [created_at]);

  const ingressText = useMemo(
    () => extractSummaryWhatSSR(summary_normalized),
    [summary_normalized],
  );

  const handleOpen = () => {
    try {
      // ✅ Save feed scroll before opening modal/article route
      sessionStorage.setItem("cw_scroll_y", String(window.scrollY || 0));
    } catch {}

    try {
      onOpen?.(Number(id));
    } catch {}
  };

  return (
    <CardLink
      href={href}
      $wide={isWide}
      aria-label={`Open: ${cleanText(title)}`}
      onClick={handleOpen}
      prefetch
    >
      <Card>
        <ImageWrapper>
          {image_url ? (
            <Image
              src={`${image_url}?width=650&quality=70&format=webp`}
              srcSet={[
                `${image_url}?width=420&quality=70&format=webp 420w`,
                `${image_url}?width=650&quality=70&format=webp 650w`,
                `${image_url}?width=900&quality=70&format=webp 900w`,
                `${image_url}?width=1200&quality=70&format=webp 1200w`,
              ].join(", ")}
              sizes={
                isWide
                  ? "(max-width: 780px) 100vw, 100vw"
                  : "(max-width: 780px) 100vw, 50vw"
              }
              width={650}
              height={406} // 16/10 ratio
              alt={cleanText(title)}
              loading="lazy"
              decoding="async"
            />
          ) : null}

          {/* 🔥 trending icon (top-right) */}
          {isTrending ? <FireBadge aria-label="Trending">🔥</FireBadge> : null}

          {/* ✅ MetaRow over bildet, i bunn */}
          <MetaRow>
            <CategoryBadge $category={category}>{category}</CategoryBadge>
            <span className="date">{formattedDate}</span>
          </MetaRow>
        </ImageWrapper>

        <Content>
          <Title>{cleanText(title)}</Title>

          {/* ✅ Bare "What"-delen som ingress, uten "What:" */}
          {ingressText ? <Ingress>{ingressText}</Ingress> : null}

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </CardLink>
  );
}
