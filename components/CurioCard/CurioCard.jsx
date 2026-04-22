"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CardLink,
  Card,
  ImageWrapper,
  Image,
  PortraitBackdrop,
  Content,
  MetaRow,
  CategoryBadge,
  Title,
  Ingress,
  ReadMore,
  FireBadge,
  ListBadge,
  VideoBadge,
  QuoteBadge,
  QuoteCardHero,
  QuoteCardInner,
  QuoteCardKicker,
  QuoteCardText,
  QuoteCardWho,
} from "./CurioCard.styles";
import { cleanText } from "@/app/api/utils/cleanText";
import { getCategoryColor } from "@/lib/categoryColors";

// ✅ SSR-safe: extract the text inside <span data-summary-what>...</span>
// No DOMParser, no window dependency
function extractSummaryWhatSSR(html) {
  const s = String(html || "");

  const m = s.match(/<span[^>]*data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return "";

  const raw = m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ✅ SSR-safe: extract the text inside <span data-summary-why>...</span>
function extractSummaryWhySSR(html) {
  const s = String(html || "");

  const m = s.match(/<span[^>]*data-summary-why[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return "";

  const raw = m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ✅ SSR-safe: extract the text inside <span data-summary-who>...</span>
function extractSummaryWhoSSR(html) {
  const s = String(html || "");

  const m = s.match(/<span[^>]*data-summary-who[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return "";

  const raw = m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\.$/, "");
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

// --------------------
// ✅ NEW: publishAt check
// --------------------
function getPublishAtMs(video) {
  const raw = video?.posted_results?.youtube?.detail?.publishAt;
  const ms = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(ms) ? ms : NaN;
}

function isLiveYoutubeVideo(v) {
  const publishAtMs = getPublishAtMs(v);

  return (
    v &&
    v.status === "posted" &&
    String(v.youtube_url || "").trim() &&
    Number.isFinite(publishAtMs) &&
    publishAtMs <= Date.now()
  );
}

function getQuoteTone(quoteText, isWide) {
  const text = String(quoteText || "").trim();
  const len = text.length;
  const words = text ? text.split(/\s+/).length : 0;

  if (isWide) {
    if (len <= 32 && words <= 7) return "hero";
    if (len <= 60 && words <= 12) return "xl";
    if (len <= 95 && words <= 18) return "lg";
    return "md";
  }

  if (len <= 26 && words <= 6) return "lg";
  if (len <= 50 && words <= 10) return "md";
  if (len <= 80 && words <= 16) return "sm";
  return "xs";
}

function hasPostedYoutubeVideo(card) {
  const videos = Array.isArray(card?.videos) ? card.videos : [];

  return videos.some((v) => isLiveYoutubeVideo(v));
}

export default function CurioCard({
  card,
  isTrending = false,
  hasVideo = false,
  onOpen,
}) {
  const {
    id,
    category,
    title,
    summary_normalized,
    image_url,
    created_at,
    wow_score,
    article_type,
    quote_text,
  } = card;

  const [isPortraitImage, setIsPortraitImage] = useState(false);
  const [imageOrientationReady, setImageOrientationReady] = useState(false);

  const isWide = Number(wow_score) >= 90;

  // ✅ detect article types
  const isListArticle = String(article_type || "").toLowerCase() === "list";
  const isQuoteArticle = String(article_type || "").toLowerCase() === "quote";

  useEffect(() => {
    if (!image_url || isQuoteArticle) {
      setIsPortraitImage(false);
      setImageOrientationReady(true);
      return;
    }

    let cancelled = false;

    setImageOrientationReady(false);

    const img = new window.Image();
    img.src = image_url;

    img.onload = () => {
      if (cancelled) return;

      const portrait = img.naturalHeight > img.naturalWidth;
      setIsPortraitImage(portrait);
      setImageOrientationReady(true);
    };

    img.onerror = () => {
      if (cancelled) return;

      setIsPortraitImage(false);
      setImageOrientationReady(true);
    };

    return () => {
      cancelled = true;
    };
  }, [image_url, isQuoteArticle]);

  const hasVideoFromCard = useMemo(() => hasPostedYoutubeVideo(card), [card]);
  const isVideoArticle = hasVideo || hasVideoFromCard;

  const href = `/article/${id}`;

  const formattedDate = useMemo(() => formatDateUTC(created_at), [created_at]);

  const usePortraitImageMode =
    Boolean(image_url) &&
    !isQuoteArticle &&
    imageOrientationReady &&
    isPortraitImage;

  const ingressText = useMemo(() => {
    if (isQuoteArticle) {
      return extractSummaryWhySSR(summary_normalized);
    }
    return extractSummaryWhatSSR(summary_normalized);
  }, [summary_normalized, isQuoteArticle]);

  const quoteText = useMemo(() => cleanText(quote_text || ""), [quote_text]);

  const quoteWho = useMemo(
    () => extractSummaryWhoSSR(summary_normalized),
    [summary_normalized],
  );

  const quoteTone = useMemo(
    () => getQuoteTone(quoteText, isWide),
    [quoteText, isWide],
  );

  const quoteBg = useMemo(
    () => getCategoryColor(category) || "#222",
    [category],
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

  let nextBadgeOffset = 12;

  const trendingOffset = nextBadgeOffset;
  if (isTrending) nextBadgeOffset += 38;

  const listOffset = nextBadgeOffset;
  if (isListArticle) nextBadgeOffset += 38;

  const quoteOffset = nextBadgeOffset;
  if (isQuoteArticle) nextBadgeOffset += 38;

  const videoOffset = nextBadgeOffset;

  return (
    <CardLink
      href={href}
      $wide={isWide}
      aria-label={`Open: ${cleanText(title)}`}
      onClick={handleOpen}
      prefetch
    >
      <Card>
        <ImageWrapper $portrait={usePortraitImageMode}>
          {isQuoteArticle ? (
            <QuoteCardHero $bg={quoteBg} $wide={isWide}>
              <QuoteCardInner $wide={isWide}>
                <QuoteCardKicker>Quote Explained</QuoteCardKicker>
                <QuoteCardText $tone={quoteTone} $wide={isWide}>
                  {quoteText}
                </QuoteCardText>
                {quoteWho ? (
                  <QuoteCardWho $tone={quoteTone} $wide={isWide}>
                    — {quoteWho}
                  </QuoteCardWho>
                ) : null}
              </QuoteCardInner>
            </QuoteCardHero>
          ) : image_url ? (
            <>
              {usePortraitImageMode ? (
                <PortraitBackdrop aria-hidden="true" $src={image_url} />
              ) : null}

              <Image
                src={image_url}
                width={650}
                height={406}
                alt={cleanText(title)}
                loading="lazy"
                decoding="async"
                $portrait={usePortraitImageMode}
              />
            </>
          ) : null}

          {/* 🔥 trending icon (top-right) */}
          {isTrending ? (
            <FireBadge $offset={trendingOffset} aria-label="Trending">
              🔥
            </FireBadge>
          ) : null}

          {/* 🗒️ list article icon */}
          {isListArticle ? (
            <ListBadge $offset={listOffset} aria-label="List article">
              🗒️
            </ListBadge>
          ) : null}

          {/* 💬 quote article icon */}
          {isQuoteArticle ? (
            <QuoteBadge $offset={quoteOffset} aria-label="Quote article">
              💬
            </QuoteBadge>
          ) : null}

          {/* ▶️ video article icon */}
          {isVideoArticle ? (
            <VideoBadge $offset={videoOffset} aria-label="Video article">
              ▶️
            </VideoBadge>
          ) : null}

          {/* ✅ MetaRow over bildet, i bunn */}
          <MetaRow>
            <CategoryBadge $category={category}>{category}</CategoryBadge>
            <span className="date">{formattedDate}</span>
          </MetaRow>
        </ImageWrapper>

        <Content>
          <Title>{cleanText(title)}</Title>

          {/* ✅ What for normal articles, Why for quote articles */}
          {ingressText ? <Ingress>{ingressText}</Ingress> : null}

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </CardLink>
  );
}
