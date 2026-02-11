// components/ArticleModal/ArticleModalClient.jsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Overlay,
  Modal,
  Close,
  CloseWrap,
  ModalHeader,
  ModalTitle,
  MetaRow,
  Body,
  Image,
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
} from "./ArticleModal.styles";

import ArticleView from "@/components/ArticleView/ArticleView";
import { cleanText } from "@/app/api/utils/cleanText";

// -------------------------------------------------------------
// Category intro (old vibe)
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Credit formatting
// - Pexels/Unsplash: keep "Image source: X" (or normalize slightly)
// - Wikimedia: "Hu Nhu, CC BY-SA 4.0"
// -------------------------------------------------------------
function formatImageCredit(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;

  // "Image source: Pexels" -> "Pexels"
  const mSimple = s.match(/^Image\s*source:\s*(.+)$/i);
  if (mSimple?.[1]) return mSimple[1].trim();

  // Wikimedia pattern (your stored format)
  // Image: <a ... title="User:Hu_Nhu">Hu Nhu</a>, License: CC BY-SA 4.0 (https://...)
  const user =
    s.match(/title="User:[^"]+">([^<]+)<\/a>/i)?.[1]?.trim() ||
    s.match(/Image:\s*([^,]+),\s*License:/i)?.[1]?.trim();

  const license =
    s.match(/License:\s*([^()]+)\s*\(/i)?.[1]?.trim() ||
    s.match(/License:\s*([^()]+)$/i)?.[1]?.trim();

  if (user && license) return `${user}, ${license}`;

  // fallback: strip tags, keep readable
  return s.replace(/<[^>]*>/g, "").trim();
}

// -------------------------------------------------------------
// Ensure summary gets the class that matches your CSS:
// .article-summary-box
// If summary is only a <ul>…</ul>, we wrap it.
// -------------------------------------------------------------
function ensureSummaryBox(html) {
  const s = String(html || "").trim();
  if (!s) return "";

  if (s.includes('class="article-summary-box"')) return s;

  // If it's a list (common case), wrap it in the summary box
  if (/<ul[\s>]/i.test(s)) {
    return `<div class="article-summary-box"><strong>Quick Summary</strong>${s}</div>`;
  }

  // If it’s plain text or other markup, still wrap
  return `<div class="article-summary-box"><strong>Quick Summary</strong><div>${s}</div></div>`;
}

export default function ArticleModalClient({ card }) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Determine if we're on an article route
  const isArticleRoute = String(pathname || "").startsWith("/article/");

  // soft transition for modal->modal
  const [softTransition, setSoftTransition] = useState(false);

  // keep original body overflow so we can restore reliably
  const bodyOverflowRef = useRef(null);

  // ✅ Related articles (same category)
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // ✅ Body scroll lock that also unlocks when route changes away (not only unmount)
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
      // safety: restore on cleanup too
      document.body.style.overflow = bodyOverflowRef.current || "";
    };
  }, [isArticleRoute]);

  // soft flag read (per-article)
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem("cw_modal_nav") === "1";
      setSoftTransition(flag);
      if (flag) sessionStorage.removeItem("cw_modal_nav");
    } catch {
      setSoftTransition(false);
    }
  }, [card.id]);

  const { prevId, nextId, positionText, returnHref } = useMemo(() => {
    try {
      if (typeof window === "undefined") {
        return {
          prevId: null,
          nextId: null,
          positionText: "",
          returnHref: "/",
        };
      }

      const raw = sessionStorage.getItem("cw_feed_ctx");
      if (!raw) {
        return {
          prevId: null,
          nextId: null,
          positionText: "",
          returnHref: "/",
        };
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

      const params = new URLSearchParams();
      if (cat && cat !== "all") params.set("category", cat);
      if (sort && sort !== "newest") params.set("sort", sort);

      const qs = params.toString();
      const ret = qs ? `/?${qs}` : "/";

      return { prevId: prev, nextId: next, positionText: pos, returnHref: ret };
    } catch {
      return {
        prevId: null,
        nextId: null,
        positionText: "",
        returnHref: "/",
      };
    }
  }, [card.id]);

  const close = useCallback(() => {
    // ✅ Always return to list view (not back through modal stack)
    router.replace(returnHref || "/", { scroll: false });
  }, [router, returnHref]);

  const goPrev = useCallback(() => {
    if (!prevId) return;
    try {
      sessionStorage.setItem("cw_modal_nav", "1");
    } catch {}
    setSoftTransition(true);
    router.replace(`/article/${prevId}`, { scroll: false });
  }, [router, prevId]);

  const goNext = useCallback(() => {
    if (!nextId) return;
    try {
      sessionStorage.setItem("cw_modal_nav", "1");
    } catch {}
    setSoftTransition(true);
    router.replace(`/article/${nextId}`, { scroll: false });
  }, [router, nextId]);

  const openRelated = useCallback(
    (id) => {
      if (!id) return;
      try {
        sessionStorage.setItem("cw_modal_nav", "1");
      } catch {}
      setSoftTransition(true);
      router.replace(`/article/${id}`, { scroll: false });
    },
    [router]
  );

  // log view 1 gang når modal åpner
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

  // ESC + arrows
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

  // ✅ Fetch related (same category)
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
          .eq("category", cat)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(6);

        if (!alive) return;
        if (!error) setRelatedArticles(Array.isArray(data) ? data : []);
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

  const formattedDate = new Date(card.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const categoryIntro = useMemo(
    () => getCategoryIntro(card.category),
    [card.category]
  );

  const creditText = useMemo(
    () => formatImageCredit(card.image_credit),
    [card.image_credit]
  );

  const summaryHtml = useMemo(
    () => ensureSummaryBox(card.summary_normalized),
    [card.summary_normalized]
  );

  // ✅ Safe to bail out (after hooks)
  if (!isArticleRoute) return null;

  const showRelated = (relatedArticles || []).length > 0;

  return (
    <Overlay $soft={softTransition} onClick={close}>
      <Modal
        $soft={softTransition}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <CloseWrap>
          <Close onClick={close} aria-label="Close">
            ✕
          </Close>
        </CloseWrap>

        <ArticleView
          variant="modal"
          card={card}
          prevId={prevId}
          nextId={nextId}
          positionText={positionText}
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
