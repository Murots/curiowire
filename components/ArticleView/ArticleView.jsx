// components/ArticleView/ArticleView.jsx
"use client";

import React, { useMemo } from "react";
import {
  ModalHeader,
  ModalTitle,
  MetaRow,
  Body,
  Image,
  HeroImageWrap,
  Credit,
  CategoryBadge,
  Divider,
  Headline,
  SubIntro,
  NavBar,
  NavButton,
  NavHint,
  Swap,
  RelatedSection,
  RelatedTitle,
  RelatedGrid,
  RelatedCard,
  RelatedImage,
  RelatedImageOverlay,
  RelatedText,
} from "@/components/ArticleModal/ArticleModal.styles"; // gjenbruker EXACT samme styles

import { cleanText } from "@/app/api/utils/cleanText";

// --- helpers (kopier fra modal) ---
function getCategoryIntro(category) {
  const intros = {
    science: "🧪 Echoes from the lab",
    technology: "⚙️ Traces from the dawn of innovation",
    space: "🚀 Whispers from the silent cosmos",
    nature: "🌿 Stories carved by wind and water",
    health: "🫀 Secrets of the human vessel",
    history: "🏺 Recovered from the dusty archives",
    culture: "🎭 Fragments from the heart of civilization",
    sports: "🏆 Legends born in the arena",
    products: "🛍️ Artifacts of human ingenuity",
    world: "🌍 Records from the halls of power",
    crime: "🕯️ Notes from the casefile",
    mystery: "🧩 Fragments from the unknown",
  };
  return intros[String(category || "").toLowerCase()] || "— Hot off the wire";
}

function formatImageCredit(raw) {
  let s = String(raw || "").trim();
  if (!s) return null;

  // 1) "Image source: Pexels" / "Image source: Unsplash" → "Pexels"
  const mSimple = s.match(/^Image\s*source:\s*(.+)$/i);
  if (mSimple?.[1]) return mSimple[1].trim();

  // 2) Remove hidden spans completely (common Wikimedia pattern)
  // Example: Unknown author<span style="display: none;">Unknown author</span>
  s = s.replace(
    /<span[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    "",
  );

  // 3) Convert links to plain text (keep inner label, drop href)
  // Example: <a ...>hairyeggg</a> -> hairyeggg
  s = s.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // 4) Strip remaining tags (safety)
  s = s.replace(/<[^>]*>/g, " ");

  // 5) Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();

  // 6) If the string contains "Image: ..." and "License: ..." parse those parts
  // Handles:
  // - "Image: Godfried Croenen, License: CC0 (http://...)"
  // - "Image: Unknown author, License: Public domain"
  // - "Image: Leslie..., License: CC BY-SA 4.0 (https://...)"
  const imgPart =
    s.match(/(?:^|[\s,])Image:\s*([\s\S]*?)(?=,\s*License:|$)/i)?.[1]?.trim() ||
    null;

  const licPart =
    s.match(/License:\s*([^()]+)(?:\([^)]*\))?/i)?.[1]?.trim() || null;

  if (imgPart || licPart) {
    const who = (imgPart || "").replace(/^Image:\s*/i, "").trim();

    // remove trailing commas / stray punctuation
    const cleanWho = who.replace(/^[,\s]+|[,\s]+$/g, "").trim();
    const cleanLic = (licPart || "").replace(/^[,\s]+|[,\s]+$/g, "").trim();

    // If author unknown, keep it (your example wants Unknown author)
    const parts = [cleanWho, cleanLic].filter(Boolean);

    const out = parts.join(", ");

    // Extra safety: avoid "Image: Image:" duplication if upstream already weird
    return out.replace(/^Image:\s*/i, "").trim();
  }

  // 7) Fallback: if it still contains a CC license url, remove it
  // Example: "... CC BY-SA 2.0 (https://creativecommons.org/...)" -> "... CC BY-SA 2.0"
  s = s
    .replace(/\((https?:\/\/[^\s)]+)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // 8) If the whole string still starts with "Image:", drop that label
  s = s.replace(/^Image:\s*/i, "").trim();

  return s || null;
}

function ensureSummaryBox(html) {
  const s = String(html || "").trim();
  if (!s) return "";
  if (s.includes('class="article-summary-box"')) return s;
  if (/<ul[\s>]/i.test(s)) {
    return `<div class="article-summary-box"><strong>Quick Summary</strong>${s}</div>`;
  }
  return `<div class="article-summary-box"><strong>Quick Summary</strong><div>${s}</div></div>`;
}

function normalizeSourceUrl(url) {
  const s = String(url || "").trim();
  if (!s) return null;
  if (!/^https?:\/\/\S+$/i.test(s)) return null;
  return s.replace(/[)\].,;:]+$/, "");
}

export default function ArticleView({
  card,
  // nav
  prevId,
  nextId,
  positionText,
  onPrev,
  onNext,
  // related
  relatedArticles = [],
  onOpenRelated,
  relatedLoading = false,
  // “variant”
  variant = "modal", // "modal" | "page"
}) {
  const formattedDate = new Date(card.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const categoryIntro = useMemo(
    () => getCategoryIntro(card.category),
    [card.category],
  );

  const creditText = useMemo(
    () => formatImageCredit(card.image_credit),
    [card.image_credit],
  );

  const summaryHtml = useMemo(
    () => ensureSummaryBox(card.summary_normalized),
    [card.summary_normalized],
  );

  const sourceUrl = useMemo(
    () => normalizeSourceUrl(card.source_url),
    [card.source_url],
  );

  const showRelated = (relatedArticles || []).length > 0;

  // ✅ Important: don't let the modal "pollute" the feed page's head/perf.
  // Page variant can keep eager/high; modal should be normal/lazy.
  const isPage = variant === "page";
  const heroLoading = isPage ? "eager" : "lazy";
  const heroFetchPriority = isPage ? "high" : "auto";

  const categoryHref = `/${String(card.category || "").toLowerCase()}`;

  const prevHref = prevId ? `/article/${prevId}` : null;
  const nextHref = nextId ? `/article/${nextId}` : null;

  const disabledLinkStyle = {
    opacity: 0.45,
    cursor: "default",
    pointerEvents: "none",
  };

  return (
    <Swap $soft={false} data-variant={variant} key={card.id}>
      <ModalHeader>
        <Headline>EXTRA! EXTRA!</Headline>
        <SubIntro>{categoryIntro}</SubIntro>
        <Divider />

        <ModalTitle>{cleanText(card.title)}</ModalTitle>

        <MetaRow>
          <CategoryBadge
            as="a"
            href={categoryHref}
            $category={card.category}
            onClick={(e) => {
              // keep SPA behavior (modal/page can override via router higher up if needed)
              // but always keep a real href for crawlers
            }}
          >
            {card.category}
          </CategoryBadge>
          <span className="date">Published {formattedDate}</span>
        </MetaRow>
      </ModalHeader>

      {card.image_url ? (
        <>
          <HeroImageWrap>
            <Image
              src={`${card.image_url}?width=1200&quality=78&format=webp`}
              srcSet={[
                `${card.image_url}?width=800&quality=78&format=webp 800w`,
                `${card.image_url}?width=1200&quality=78&format=webp 1200w`,
                `${card.image_url}?width=1600&quality=78&format=webp 1600w`,
              ].join(", ")}
              sizes="(max-width: 980px) 100vw, 980px"
              alt={cleanText(card.title)}
              loading={heroLoading}
              fetchPriority={heroFetchPriority}
              decoding="async"
            />
          </HeroImageWrap>

          {creditText ? <Credit>Image by {creditText}</Credit> : null}
        </>
      ) : null}

      <Body>
        {summaryHtml ? (
          <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
        ) : null}

        <div dangerouslySetInnerHTML={{ __html: card.card_text || "" }} />

        {card.fun_fact ? (
          <div style={{ marginTop: 18 }}>
            <h2 className="did-you-know">Did You Know?</h2>
            <Divider />
            <div dangerouslySetInnerHTML={{ __html: card.fun_fact }} />
          </div>
        ) : null}

        {sourceUrl ? (
          <div style={{ marginTop: 18 }}>
            <h2 className="source">Source</h2>
            <Divider />
            <p style={{ marginTop: 10 }}>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline", wordBreak: "break-word" }}
              >
                {sourceUrl}
              </a>
            </p>
          </div>
        ) : null}

        {!relatedLoading && showRelated ? (
          <RelatedSection>
            <RelatedTitle>
              {card.fun_fact
                ? "Want to explore further?"
                : "Related curiosities"}
            </RelatedTitle>
            <Divider />
            <RelatedGrid>
              {relatedArticles.slice(0, 3).map((a) => (
                <RelatedCard
                  key={a.id}
                  href={`/article/${a.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenRelated?.(a.id);
                  }}
                >
                  {a.image_url ? (
                    <>
                      <RelatedImage
                        src={`${a.image_url}?width=400&quality=70&format=webp`}
                        width={400}
                        height={225} // 16/9
                        alt={cleanText(a.title)}
                        loading="lazy"
                        decoding="async"
                      />

                      <RelatedImageOverlay />
                    </>
                  ) : null}
                  <RelatedText>
                    {cleanText(a.title)}
                    <span className="arrow"> →</span>
                  </RelatedText>
                </RelatedCard>
              ))}
            </RelatedGrid>
          </RelatedSection>
        ) : null}
      </Body>

      <NavBar>
        <NavButton
          as="a"
          href={prevHref || undefined}
          aria-label="Previous"
          aria-disabled={!prevId}
          tabIndex={!prevId ? -1 : 0}
          style={!prevId ? disabledLinkStyle : undefined}
          onClick={(e) => {
            if (!prevId) {
              e.preventDefault();
              return;
            }
            // keep real href, but preserve modal/page behavior
            e.preventDefault();
            onPrev?.();
          }}
        >
          ← Previous
        </NavButton>

        {positionText ? <NavHint>{positionText}</NavHint> : <span />}

        <NavButton
          as="a"
          href={nextHref || undefined}
          aria-label="Next"
          aria-disabled={!nextId}
          tabIndex={!nextId ? -1 : 0}
          style={!nextId ? disabledLinkStyle : undefined}
          onClick={(e) => {
            if (!nextId) {
              e.preventDefault();
              return;
            }
            // keep real href, but preserve modal/page behavior
            e.preventDefault();
            onNext?.();
          }}
        >
          Next →
        </NavButton>
      </NavBar>
    </Swap>
  );
}
