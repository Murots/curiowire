// components/FeedInterrupt/VideoCarouselBlock.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCategoryColor } from "@/lib/categoryColors";
import { cleanText } from "@/app/api/utils/cleanText";

import {
  CarouselShell,
  CarouselViewport,
  CarouselStage,
  Slide,
  NavButton,
  VideoCard,
  ThumbWrap,
  ThumbImage,
  ThumbOverlay,
  PlayBadge,
  MetaRow,
  CategoryPill,
  PostedText,
  TitlePanel,
  VideoTitle,
  Dots,
  DotButton,
} from "./VideoCarouselBlock.styles";

function formatPostedDate(dateInput) {
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

  return `${day} ${months[monthIdx] || ""} ${year}`;
}

function getWrappedIndex(index, length) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export default function VideoCarouselBlock({ items = [] }) {
  const safeItems = useMemo(
    () => (Array.isArray(items) ? items.filter(Boolean) : []),
    [items],
  );

  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState("next");

  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);

  useEffect(() => {
    function updateViewportMode() {
      setIsMobile(window.innerWidth <= 780);
    }

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    if (!safeItems.length) return;
    setActiveIndex((prev) => getWrappedIndex(prev, safeItems.length));
  }, [safeItems.length]);

  const visibleItems = useMemo(() => {
    const length = safeItems.length;
    if (!length) return [];

    if (isMobile || length === 1) {
      return [
        {
          item: safeItems[getWrappedIndex(activeIndex, length)],
          slot: "center",
          realIndex: getWrappedIndex(activeIndex, length),
        },
      ];
    }

    if (length === 2) {
      return [
        {
          item: safeItems[getWrappedIndex(activeIndex, length)],
          slot: "center",
          realIndex: getWrappedIndex(activeIndex, length),
        },
        {
          item: safeItems[getWrappedIndex(activeIndex + 1, length)],
          slot: "right",
          realIndex: getWrappedIndex(activeIndex + 1, length),
        },
      ];
    }

    return [
      {
        item: safeItems[getWrappedIndex(activeIndex - 1, length)],
        slot: "left",
        realIndex: getWrappedIndex(activeIndex - 1, length),
      },
      {
        item: safeItems[getWrappedIndex(activeIndex, length)],
        slot: "center",
        realIndex: getWrappedIndex(activeIndex, length),
      },
      {
        item: safeItems[getWrappedIndex(activeIndex + 1, length)],
        slot: "right",
        realIndex: getWrappedIndex(activeIndex + 1, length),
      },
    ];
  }, [safeItems, activeIndex, isMobile]);

  if (!safeItems.length) return null;

  function goPrev() {
    setDirection("prev");
    setActiveIndex((prev) => getWrappedIndex(prev - 1, safeItems.length));
  }

  function goNext() {
    setDirection("next");
    setActiveIndex((prev) => getWrappedIndex(prev + 1, safeItems.length));
  }

  function handleTouchStart(e) {
    const x = e.touches?.[0]?.clientX;
    if (!Number.isFinite(x)) return;
    touchStartXRef.current = x;
    touchDeltaXRef.current = 0;
  }

  function handleTouchMove(e) {
    if (!Number.isFinite(touchStartXRef.current)) return;
    const x = e.touches?.[0]?.clientX;
    if (!Number.isFinite(x)) return;
    touchDeltaXRef.current = x - touchStartXRef.current;
  }

  function handleTouchEnd() {
    const delta = Number(touchDeltaXRef.current || 0);

    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;

    if (Math.abs(delta) < 36) return;

    if (delta < 0) goNext();
    if (delta > 0) goPrev();
  }

  return (
    <CarouselShell>
      <NavButton
        type="button"
        onClick={goPrev}
        aria-label="Previous video"
        $side="left"
      />

      <CarouselViewport
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CarouselStage $isMobile={isMobile}>
          {visibleItems.map(({ item, slot, realIndex }) => {
            const article = item?.article || {};
            const articleId = Number(article?.id);
            const title = cleanText(article?.title || "CurioWire video");
            const category = String(article?.category || "").toLowerCase();
            const href = articleId > 0 ? `/article/${articleId}` : "/";
            const posted = formatPostedDate(item?.posted_at);
            const thumb =
              String(item?.thumbnail_url || "").trim() ||
              String(article?.image_url || "").trim() ||
              "/icon.png";

            return (
              <Slide
                key={`${slot}-${item?.id || "video"}-${realIndex}-${activeIndex}`}
                $slot={slot}
                $isMobile={isMobile}
                $direction={direction}
              >
                <VideoCard
                  href={href}
                  prefetch
                  aria-label={`Open video article: ${title}`}
                  $slot={slot}
                >
                  <ThumbWrap>
                    <ThumbImage
                      src={thumb}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                    />
                    <ThumbOverlay />

                    <PlayBadge aria-hidden="true">▶</PlayBadge>

                    <MetaRow>
                      <CategoryPill
                        style={{
                          backgroundColor:
                            getCategoryColor(category) || undefined,
                        }}
                      >
                        {category || "video"}
                      </CategoryPill>

                      {posted ? <PostedText>{posted}</PostedText> : null}
                    </MetaRow>

                    <TitlePanel>
                      <VideoTitle>{title}</VideoTitle>
                    </TitlePanel>
                  </ThumbWrap>
                </VideoCard>
              </Slide>
            );
          })}
        </CarouselStage>
      </CarouselViewport>

      <NavButton
        type="button"
        onClick={goNext}
        aria-label="Next video"
        $side="right"
      />

      <Dots>
        {safeItems.map((item, index) => (
          <DotButton
            key={`dot-${item?.id || index}`}
            type="button"
            onClick={() => {
              setDirection(index < activeIndex ? "prev" : "next");
              setActiveIndex(index);
            }}
            aria-label={`Go to video ${index + 1}`}
            aria-pressed={
              index === getWrappedIndex(activeIndex, safeItems.length)
            }
            $active={index === getWrappedIndex(activeIndex, safeItems.length)}
          />
        ))}
      </Dots>
    </CarouselShell>
  );
}
