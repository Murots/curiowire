// components/ArticleModal/ArticleModalClient.jsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Overlay, Modal, CloseWrap, CloseLink } from "./ArticleModal.styles";

import ArticleView from "@/components/ArticleView/ArticleView";

export default function ArticleModalClient({ card, video }) {
  const router = useRouter();
  const pathname = usePathname();

  const isArticleRoute = String(pathname || "").startsWith("/article/");

  const bodyOverflowRef = useRef(null);

  const [softTransition, setSoftTransition] = useState(false);

  const [nav, setNav] = useState(() => ({
    prevId: null,
    nextId: null,
    positionText: "",
    returnHref: "/",
  }));

  const [relatedArticles, setRelatedArticles] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Body scroll lock
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (bodyOverflowRef.current === null) {
      bodyOverflowRef.current = document.body.style.overflow || "";
    }

    if (isArticleRoute) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = bodyOverflowRef.current || "";
    }

    return () => {
      document.body.style.overflow = bodyOverflowRef.current || "";
    };
  }, [isArticleRoute]);

  // ---------------------------------------------------------------------------
  // Nav state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isArticleRoute) return;

    try {
      const flag = sessionStorage.getItem("cw_modal_nav") === "1";
      setSoftTransition(flag);
      if (flag) sessionStorage.removeItem("cw_modal_nav");
    } catch {
      setSoftTransition(false);
    }

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
      const pos =
        idx >= 0 && ids.length > 0 ? `${idx + 1} / ${ids.length}` : "";

      const cat = String(ctx?.category || "");
      const sort = String(ctx?.sort || "");
      const q = String(ctx?.q || "");

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
  }, [card.id, isArticleRoute]);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------
  const close = useCallback(() => {
    router.replace(nav.returnHref || "/", { scroll: false });

    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("cw:restore-scroll"));
      });
    }
  }, [router, nav.returnHref]);

  const goPrev = useCallback(() => {
    if (!nav.prevId) return;
    try {
      sessionStorage.setItem("cw_modal_nav", "1");
    } catch {}
    setSoftTransition(true);
    router.replace(`/article/${nav.prevId}`, { scroll: false });
  }, [router, nav.prevId]);

  const goNext = useCallback(() => {
    if (!nav.nextId) return;
    try {
      sessionStorage.setItem("cw_modal_nav", "1");
    } catch {}
    setSoftTransition(true);
    router.replace(`/article/${nav.nextId}`, { scroll: false });
  }, [router, nav.nextId]);

  const openRelated = useCallback(
    (id) => {
      if (!id) return;
      try {
        sessionStorage.setItem("cw_modal_nav", "1");
      } catch {}
      setSoftTransition(true);
      router.replace(`/article/${id}`, { scroll: false });
    },
    [router],
  );

  // ---------------------------------------------------------------------------
  // Log view
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isArticleRoute) return;
    try {
      fetch("/api/logView", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: Number(card.id) }),
      });
    } catch {}
  }, [card.id, isArticleRoute]);

  // ---------------------------------------------------------------------------
  // Keyboard nav
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isArticleRoute) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goPrev, goNext, isArticleRoute]);

  // ---------------------------------------------------------------------------
  // Related articles
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isArticleRoute) return;

    const cat = String(card.category || "")
      .toLowerCase()
      .trim();
    const id = Number(card.id);

    if (!cat || !id) {
      setRelatedArticles([]);
      return;
    }

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

        const pool = data;
        const start = id % pool.length;

        const picked = [
          pool[start % pool.length],
          pool[(start + 4) % pool.length],
          pool[(start + 8) % pool.length],
        ].filter(Boolean);

        const unique = Array.from(
          new Map(picked.map((a) => [a.id, a])).values(),
        );

        setRelatedArticles(unique);
      } catch {
        if (!alive) return;
        setRelatedArticles([]);
      } finally {
        if (!alive) return;
        setRelatedLoading(false);
      }
    }

    loadRelated();

    return () => {
      alive = false;
    };
  }, [card.id, card.category, isArticleRoute]);

  if (!isArticleRoute) return null;

  return (
    <Overlay $soft={softTransition} onClick={close}>
      <Modal
        $soft={softTransition}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <CloseWrap>
          <CloseLink
            href={nav.returnHref || "/"}
            onClick={(e) => {
              e.preventDefault();
              close();
            }}
            aria-label="Close"
          >
            ✕
          </CloseLink>
        </CloseWrap>

        <ArticleView
          variant="modal"
          card={card}
          video={video}
          prevId={nav.prevId}
          nextId={nav.nextId}
          positionText={nav.positionText}
          onPrev={goPrev}
          onNext={goNext}
          relatedArticles={relatedArticles}
          relatedLoading={relatedLoading}
          onOpenRelated={openRelated}
        />
      </Modal>
    </Overlay>
  );
}
