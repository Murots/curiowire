// components/ArticlePage/ArticlePageClient.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ArticleView from "@/components/ArticleView/ArticleView";
import styled from "styled-components";

const PageWrap = styled.div`
  max-width: 980px;
  margin: 0 auto;
  padding: 18px 18px 40px;
`;

const TopBack = styled.button`
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0.7;
  margin: 10px 0 6px;
  &:hover {
    opacity: 1;
  }
`;

export default function ArticlePageClient({ card }) {
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

      const params = new URLSearchParams();
      if (cat && cat !== "all") params.set("category", cat);
      if (sort && sort !== "newest") params.set("sort", sort);

      const qs = params.toString();
      const ret = qs ? `/?${qs}` : "/";

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
          .eq("category", cat)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(3); // ✅ max 3 cards

        if (!alive) return;
        if (!error) setRelatedArticles(Array.isArray(data) ? data : []);
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

  return (
    <PageWrap>
      <TopBack
        onClick={() => router.push(nav.returnHref || "/", { scroll: false })}
      >
        ← Back to feed
      </TopBack>

      <ArticleView
        variant="page"
        card={card}
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
  );
}
