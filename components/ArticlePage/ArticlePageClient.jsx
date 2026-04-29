// // components/ArticlePage/ArticlePageClient.jsx
// "use client";

// import React, { useEffect, useState, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
// import ArticleView from "@/components/ArticleView/ArticleView";
// import styled from "styled-components";
// import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
// import { getCategoryColor } from "@/lib/categoryColors";

// export const MainWrapper = styled.div`
//   padding: 3rem 15% 6rem 15%;
//   max-width: 1600px;
//   margin: 0 auto;

//   @media (max-width: 770px) {
//     padding: 3rem 5% 4rem 5%;
//   }
// `;

// const PageWrap = styled.div`
//   max-width: 1080px;
//   margin: 0 auto;
//   // padding: 18px 18px 40px;
// `;

// export const BreadcrumbSlot = styled.div`
//   width: 100%;
//   padding: 3px 20px;
//   background-color: ${({ $bg, theme }) => $bg || theme.colors.muted};
// `;

// const TopBack = styled.a`
//   border: 0;
//   background: transparent;
//   cursor: pointer;
//   opacity: 0.7;
//   margin: 10px 0 6px;
//   display: inline-block;

//   &:hover {
//     opacity: 1;
//   }
// `;

// // ✅ Accept video prop
// export default function ArticlePageClient({ card, video }) {
//   const router = useRouter();

//   // ✅ Nav state (stable on SSR, filled client-side)
//   const [nav, setNav] = useState(() => ({
//     prevId: null,
//     nextId: null,
//     positionText: "",
//     returnHref: "/",
//   }));

//   const [relatedArticles, setRelatedArticles] = useState([]);
//   const [relatedLoading, setRelatedLoading] = useState(false);

//   // ✅ Read feed context AFTER mount (avoids hydration mismatch)
//   useEffect(() => {
//     try {
//       const raw = sessionStorage.getItem("cw_feed_ctx");
//       if (!raw) {
//         setNav({
//           prevId: null,
//           nextId: null,
//           positionText: "",
//           returnHref: "/",
//         });
//         return;
//       }

//       const ctx = JSON.parse(raw);

//       const ids = Array.isArray(ctx?.ids)
//         ? ctx.ids.map(Number).filter(Boolean)
//         : [];

//       const idx = ids.indexOf(Number(card.id));

//       const prev = idx > 0 ? ids[idx - 1] : null;
//       const next = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;

//       const pos = idx >= 0 && ids.length ? `${idx + 1} / ${ids.length}` : "";

//       const cat = String(ctx?.category || "");
//       const sort = String(ctx?.sort || "");
//       const q = String(ctx?.q || ""); // optional if you later store q in ctx

//       // ✅ Clean path-based return URL (matches your new SEO URL structure)
//       const basePath = cat && cat !== "all" ? `/${cat}` : `/`;

//       const params = new URLSearchParams();
//       if (sort && sort !== "newest") params.set("sort", sort);
//       if (q) params.set("q", q);

//       const qs = params.toString();
//       const ret = qs ? `${basePath}?${qs}` : basePath;

//       setNav({
//         prevId: prev,
//         nextId: next,
//         positionText: pos,
//         returnHref: ret,
//       });
//     } catch {
//       setNav({
//         prevId: null,
//         nextId: null,
//         positionText: "",
//         returnHref: "/",
//       });
//     }
//   }, [card.id]);

//   const onPrev = useCallback(() => {
//     if (!nav.prevId) return;
//     router.push(`/article/${nav.prevId}`, { scroll: false });
//   }, [router, nav.prevId]);

//   const onNext = useCallback(() => {
//     if (!nav.nextId) return;
//     router.push(`/article/${nav.nextId}`, { scroll: false });
//   }, [router, nav.nextId]);

//   const onOpenRelated = useCallback(
//     (id) => {
//       if (!id) return;
//       router.push(`/article/${id}`, { scroll: false });
//     },
//     [router],
//   );

//   // log view
//   useEffect(() => {
//     try {
//       fetch("/api/logView", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ cardId: Number(card.id) }),
//       });
//     } catch {}
//   }, [card.id]);

//   // related
//   useEffect(() => {
//     const cat = String(card.category || "")
//       .toLowerCase()
//       .trim();
//     const id = Number(card.id);
//     if (!cat || !id) return;

//     let alive = true;

//     async function loadRelated() {
//       setRelatedLoading(true);
//       try {
//         const { data, error } = await supabase
//           .from("curiosity_cards")
//           .select("id, title, image_url, category, created_at")
//           .eq("status", "published")
//           .eq("is_listed", true)
//           .eq("category", cat)
//           .neq("id", id)
//           .order("created_at", { ascending: false })
//           .limit(12);

//         if (!alive) return;
//         if (error || !Array.isArray(data) || data.length === 0) {
//           setRelatedArticles([]);
//           return;
//         }

//         // Stabil variasjon basert på artikkel-id
//         const pool = data;
//         const start = id % pool.length;

//         const picked = [
//           pool[start % pool.length],
//           pool[(start + 4) % pool.length],
//           pool[(start + 8) % pool.length],
//         ].filter(Boolean);

//         // Fjern evt duplikater
//         const unique = Array.from(
//           new Map(picked.map((a) => [a.id, a])).values(),
//         );

//         setRelatedArticles(unique);
//       } catch {
//         if (!alive) return;
//         setRelatedArticles([]);
//       } finally {
//         if (alive) setRelatedLoading(false);
//       }
//     }

//     loadRelated();

//     return () => {
//       alive = false;
//     };
//   }, [card.id, card.category]);

//   const categoryHref = `/${String(card.category || "").toLowerCase()}`;

//   const categoryLabel =
//     String(card.category || "")
//       .charAt(0)
//       .toUpperCase() +
//     String(card.category || "")
//       .slice(1)
//       .toLowerCase();

//   const breadcrumbItems = [
//     { label: "Home", href: "/" },
//     ...(card.category ? [{ label: categoryLabel, href: categoryHref }] : []),
//     { label: card.title || "Article" },
//   ];

//   const breadcrumbColor = getCategoryColor(card.category);

//   return (
//     <>
//       <BreadcrumbSlot $bg={breadcrumbColor}>
//         <Breadcrumbs items={breadcrumbItems} />
//       </BreadcrumbSlot>
//       <MainWrapper>
//         <PageWrap>
//           {/* <TopBack
//         href={nav.returnHref || "/"}
//         onClick={(e) => {
//           e.preventDefault();
//           router.push(nav.returnHref || "/", { scroll: false });
//         }}
//       >
//         ← Back to feed
//       </TopBack> */}

//           <ArticleView
//             variant="page"
//             card={card}
//             video={video}
//             prevId={nav.prevId}
//             nextId={nav.nextId}
//             positionText={nav.positionText}
//             onPrev={onPrev}
//             onNext={onNext}
//             relatedArticles={relatedArticles}
//             relatedLoading={relatedLoading}
//             onOpenRelated={onOpenRelated}
//           />
//         </PageWrap>
//       </MainWrapper>
//     </>
//   );
// }

// components/ArticlePage/ArticlePageClient.jsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ArticleView from "@/components/ArticleView/ArticleView";
import styled from "styled-components";
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
import { getCategoryColor } from "@/lib/categoryColors";

export const MainWrapper = styled.div`
  padding: 3rem 15% 6rem 15%;
  max-width: 1600px;
  margin: 0 auto;

  @media (max-width: 770px) {
    padding: 3rem 5% 4rem 5%;
  }
`;

const PageWrap = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  // padding: 18px 18px 40px;
`;

export const BreadcrumbSlot = styled.div`
  width: 100%;
  padding: 3px 0px;
  background-color: ${({ $bg, theme }) => $bg || theme.colors.muted};
`;

const TopBack = styled.a`
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0.7;
  margin: 10px 0 6px;
  display: inline-block;

  &:hover {
    opacity: 1;
  }
`;

// ✅ Accept video + questions prop
export default function ArticlePageClient({ card, video, questions = [] }) {
  const router = useRouter();

  // ✅ Nav state (stable on SSR, filled client-side)
  const [nav, setNav] = useState(() => ({
    prevId: null,
    nextId: null,
    positionText: "",
    returnHref: "/",
  }));

  const [relatedArticles, setRelatedArticles] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // ✅ Read feed context AFTER mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cw_feed_ctx");
      if (!raw) {
        setNav({
          prevId: null,
          nextId: null,
          positionText: "",
          returnHref: "/",
        });
        return;
      }

      const ctx = JSON.parse(raw);

      const ids = Array.isArray(ctx?.ids)
        ? ctx.ids.map(Number).filter(Boolean)
        : [];

      const idx = ids.indexOf(Number(card.id));

      const prev = idx > 0 ? ids[idx - 1] : null;
      const next = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;

      const pos = idx >= 0 && ids.length ? `${idx + 1} / ${ids.length}` : "";

      const cat = String(ctx?.category || "");
      const sort = String(ctx?.sort || "");
      const q = String(ctx?.q || ""); // optional if you later store q in ctx

      // ✅ Clean path-based return URL (matches your new SEO URL structure)
      const basePath = cat && cat !== "all" ? `/${cat}` : `/`;

      const params = new URLSearchParams();
      if (sort && sort !== "newest") params.set("sort", sort);
      if (q) params.set("q", q);

      const qs = params.toString();
      const ret = qs ? `${basePath}?${qs}` : basePath;

      setNav({
        prevId: prev,
        nextId: next,
        positionText: pos,
        returnHref: ret,
      });
    } catch {
      setNav({
        prevId: null,
        nextId: null,
        positionText: "",
        returnHref: "/",
      });
    }
  }, [card.id]);

  const onPrev = useCallback(() => {
    if (!nav.prevId) return;
    router.push(`/article/${nav.prevId}`, { scroll: false });
  }, [router, nav.prevId]);

  const onNext = useCallback(() => {
    if (!nav.nextId) return;
    router.push(`/article/${nav.nextId}`, { scroll: false });
  }, [router, nav.nextId]);

  const onOpenRelated = useCallback(
    (id) => {
      if (!id) return;
      router.push(`/article/${id}`, { scroll: false });
    },
    [router],
  );

  // log view
  useEffect(() => {
    try {
      fetch("/api/logView", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: Number(card.id) }),
      });
    } catch {}
  }, [card.id]);

  // related
  useEffect(() => {
    const cat = String(card.category || "")
      .toLowerCase()
      .trim();
    const id = Number(card.id);
    if (!cat || !id) return;

    let alive = true;

    async function loadRelated() {
      setRelatedLoading(true);
      try {
        const { data, error } = await supabase
          .from("curiosity_cards")
          .select("id, title, image_url, category, created_at")
          .eq("status", "published")
          .eq("is_listed", true)
          .eq("category", cat)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(12);

        if (!alive) return;
        if (error || !Array.isArray(data) || data.length === 0) {
          setRelatedArticles([]);
          return;
        }

        // Stabil variasjon basert på artikkel-id
        const pool = data;
        const start = id % pool.length;

        const picked = [
          pool[start % pool.length],
          pool[(start + 4) % pool.length],
          pool[(start + 8) % pool.length],
        ].filter(Boolean);

        // Fjern evt duplikater
        const unique = Array.from(
          new Map(picked.map((a) => [a.id, a])).values(),
        );

        setRelatedArticles(unique);
      } catch {
        if (!alive) return;
        setRelatedArticles([]);
      } finally {
        if (alive) setRelatedLoading(false);
      }
    }

    loadRelated();

    return () => {
      alive = false;
    };
  }, [card.id, card.category]);

  const categoryHref = `/${String(card.category || "").toLowerCase()}`;

  const categoryLabel =
    String(card.category || "")
      .charAt(0)
      .toUpperCase() +
    String(card.category || "")
      .slice(1)
      .toLowerCase();

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(card.category ? [{ label: categoryLabel, href: categoryHref }] : []),
    { label: card.title || "Article" },
  ];

  const breadcrumbColor = getCategoryColor(card.category);

  return (
    <>
      <BreadcrumbSlot $bg={breadcrumbColor}>
        <Breadcrumbs items={breadcrumbItems} />
      </BreadcrumbSlot>
      <MainWrapper>
        <PageWrap>
          {/* <TopBack
        href={nav.returnHref || "/"}
        onClick={(e) => {
          e.preventDefault();
          router.push(nav.returnHref || "/", { scroll: false });
        }}
      >
        ← Back to feed
      </TopBack> */}

          <ArticleView
            variant="page"
            card={card}
            video={video}
            questions={questions}
            prevId={nav.prevId}
            nextId={nav.nextId}
            positionText={nav.positionText}
            onPrev={onPrev}
            onNext={onNext}
            relatedArticles={relatedArticles}
            relatedLoading={relatedLoading}
            onOpenRelated={onOpenRelated}
          />
        </PageWrap>
      </MainWrapper>
    </>
  );
}
