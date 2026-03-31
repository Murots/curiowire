// // components/CurioCard/CurioCard.jsx
// "use client";

// import React, { useMemo } from "react";
// import {
//   CardLink,
//   Card,
//   ImageWrapper,
//   Image,
//   Content,
//   MetaRow,
//   CategoryBadge,
//   Title,
//   Ingress,
//   ReadMore,
//   FireBadge,
//   ListBadge,
// } from "./CurioCard.styles";
// import { cleanText } from "@/app/api/utils/cleanText";

// // ✅ SSR-safe: extract the text inside <span data-summary-what>...</span>
// // No DOMParser, no window dependency
// function extractSummaryWhatSSR(html) {
//   const s = String(html || "");

//   const m = s.match(/<span[^>]*data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
//   if (!m) return "";

//   const raw = m[1]
//     .replace(/<[^>]+>/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();

//   return raw
//     .replace(/&amp;/g, "&")
//     .replace(/&quot;/g, '"')
//     .replace(/&#39;/g, "'")
//     .replace(/&lt;/g, "<")
//     .replace(/&gt;/g, ">");
// }

// // ✅ Deterministic UTC date formatting (avoids locale/ICU mismatch)
// function formatDateUTC(dateInput) {
//   const d = new Date(dateInput);
//   if (!Number.isFinite(d.getTime())) return "";

//   const day = String(d.getUTCDate()).padStart(2, "0");
//   const monthIdx = d.getUTCMonth();
//   const year = d.getUTCFullYear();

//   const months = [
//     "Jan",
//     "Feb",
//     "Mar",
//     "Apr",
//     "May",
//     "Jun",
//     "Jul",
//     "Aug",
//     "Sep",
//     "Oct",
//     "Nov",
//     "Dec",
//   ];

//   const mon = months[monthIdx] || "";

//   return `${day} ${mon} ${year}`;
// }

// export default function CurioCard({ card, isTrending = false, onOpen }) {
//   const {
//     id,
//     category,
//     title,
//     summary_normalized,
//     image_url,
//     created_at,
//     wow_score,
//     article_type,
//   } = card;

//   const isWide = Number(wow_score) >= 90;

//   // ✅ detect list articles
//   const isListArticle = String(article_type || "").toLowerCase() === "list";

//   const href = `/article/${id}`;

//   const formattedDate = useMemo(() => formatDateUTC(created_at), [created_at]);

//   const ingressText = useMemo(
//     () => extractSummaryWhatSSR(summary_normalized),
//     [summary_normalized],
//   );

//   const handleOpen = () => {
//     try {
//       // ✅ Save feed scroll before opening modal/article route
//       sessionStorage.setItem("cw_scroll_y", String(window.scrollY || 0));
//     } catch {}

//     try {
//       onOpen?.(Number(id));
//     } catch {}
//   };

//   return (
//     <CardLink
//       href={href}
//       $wide={isWide}
//       aria-label={`Open: ${cleanText(title)}`}
//       onClick={handleOpen}
//       prefetch
//     >
//       <Card>
//         <ImageWrapper>
//           {image_url ? (
//             <Image
//               src={`${image_url}?width=650&quality=70&format=webp`}
//               srcSet={[
//                 `${image_url}?width=420&quality=70&format=webp 420w`,
//                 `${image_url}?width=650&quality=70&format=webp 650w`,
//                 `${image_url}?width=900&quality=70&format=webp 900w`,
//                 `${image_url}?width=1200&quality=70&format=webp 1200w`,
//               ].join(", ")}
//               sizes={
//                 isWide
//                   ? "(max-width: 780px) 100vw, 100vw"
//                   : "(max-width: 780px) 100vw, 50vw"
//               }
//               width={650}
//               height={406} // 16/10 ratio
//               alt={cleanText(title)}
//               loading="lazy"
//               decoding="async"
//             />
//           ) : null}

//           {/* 🔥 trending icon (top-right) */}
//           {isTrending ? <FireBadge aria-label="Trending">🔥</FireBadge> : null}

//           {/* 🗒️ list article icon (under trending if both exist) */}
//           {isListArticle ? (
//             <ListBadge $hasTrending={isTrending} aria-label="List article">
//               🗒️
//             </ListBadge>
//           ) : null}

//           {/* ✅ MetaRow over bildet, i bunn */}
//           <MetaRow>
//             <CategoryBadge $category={category}>{category}</CategoryBadge>
//             <span className="date">{formattedDate}</span>
//           </MetaRow>
//         </ImageWrapper>

//         <Content>
//           <Title>{cleanText(title)}</Title>

//           {/* ✅ Bare "What"-delen som ingress */}
//           {ingressText ? <Ingress>{ingressText}</Ingress> : null}

//           <ReadMore>Read more →</ReadMore>
//         </Content>
//       </Card>
//     </CardLink>
//   );
// }

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
  ListBadge,
  VideoBadge,
} from "./CurioCard.styles";
import { cleanText } from "@/app/api/utils/cleanText";

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
  } = card;

  const isWide = Number(wow_score) >= 90;

  // ✅ detect list articles
  const isListArticle = String(article_type || "").toLowerCase() === "list";

  const hasVideoFromCard = useMemo(() => hasPostedYoutubeVideo(card), [card]);
  const isVideoArticle = hasVideo || hasVideoFromCard;

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

  let nextBadgeOffset = 12;

  const trendingOffset = nextBadgeOffset;
  if (isTrending) nextBadgeOffset += 38;

  const listOffset = nextBadgeOffset;
  if (isListArticle) nextBadgeOffset += 38;

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

          {/* ✅ Bare "What"-delen som ingress */}
          {ingressText ? <Ingress>{ingressText}</Ingress> : null}

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </CardLink>
  );
}
