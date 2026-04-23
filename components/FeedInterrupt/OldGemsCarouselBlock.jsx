// components/FeedInterrupt/OldGemsCarouselBlock.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cleanText } from "@/app/api/utils/cleanText";
import { getCategoryColor } from "@/lib/categoryColors";

import {
  CarouselShell,
  CarouselViewport,
  CarouselTrack,
  Slide,
  NavButton,
  GemCard,
  GemImageWrap,
  GemBackdrop,
  GemImage,
  GemOverlay,
  GemMeta,
  CategoryPill,
  AgeText,
  GemText,
  GemTitle,
  Dots,
  DotButton,
} from "./OldGemsCarouselBlock.styles";

function getWrappedIndex(index, length) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function getDaysOld(dateInput) {
  const d = new Date(dateInput);
  if (!Number.isFinite(d.getTime())) return "";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function OldGemsCarouselBlock({ items = [] }) {
  const safeItems = useMemo(
    () => (Array.isArray(items) ? items.filter(Boolean) : []),
    [items],
  );

  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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
          slot: "left",
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
    setActiveIndex((prev) => getWrappedIndex(prev - 1, safeItems.length));
  }

  function goNext() {
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
        aria-label="Previous old gem"
        $side="left"
      />

      <CarouselViewport
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CarouselTrack>
          {visibleItems.map(({ item, slot, realIndex }) => {
            const id = Number(item?.id);
            const title = cleanText(item?.title || "Old Gem");
            const href = id > 0 ? `/article/${id}` : "/";
            const category = String(item?.category || "").toLowerCase();
            const age = getDaysOld(item?.created_at);

            const thumb = String(item?.image_url || "").trim() || "/icon.png";

            return (
              <Slide
                key={`${slot}-${id}-${realIndex}-${activeIndex}`}
                $slot={slot}
                $isMobile={isMobile}
              >
                <GemCard href={href} prefetch>
                  <GemImageWrap>
                    <GemBackdrop $src={thumb} />
                    <GemImage
                      src={thumb}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                    />
                    <GemOverlay />

                    <GemMeta>
                      <CategoryPill
                        style={{
                          backgroundColor:
                            getCategoryColor(category) || undefined,
                        }}
                      >
                        {category}
                      </CategoryPill>

                      {age ? <AgeText>{age}</AgeText> : null}
                    </GemMeta>

                    <GemText>
                      <GemTitle>{title}</GemTitle>
                    </GemText>
                  </GemImageWrap>
                </GemCard>
              </Slide>
            );
          })}
        </CarouselTrack>
      </CarouselViewport>

      <NavButton
        type="button"
        onClick={goNext}
        aria-label="Next old gem"
        $side="right"
      />

      <Dots>
        {safeItems.map((item, index) => (
          <DotButton
            key={`dot-${item?.id || index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to old gem ${index + 1}`}
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
