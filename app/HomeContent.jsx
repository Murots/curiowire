// app/HomeContent.jsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CurioCard from "@/components/CurioCard/CurioCard";
import {
  Wrapper,
  TopBar,
  Title,
  Controls,
  Select,
  Grid,
  LoadMore,
  Loader,
  Divider,
} from "./page.styles";

const PAGE_SIZE = 30;
const TRENDING_LIMIT = 10;
const TRENDING_REFRESH_MS = 60 * 60 * 1000; // 1 hour

function escapeLike(s) {
  // Escape backslash first, then wildcard chars for LIKE
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/[%_]/g, "\\$&");
}

function normalizeSort(input) {
  const v = String(input || "newest").toLowerCase();
  if (v === "trending") return "trending";
  if (v === "wow") return "wow";
  return "newest";
}

function normalizeCategory(input) {
  const v = String(input || "all").toLowerCase();
  const allowed = new Set([
    "all",
    "science",
    "technology",
    "space",
    "nature",
    "health",
    "history",
    "culture",
    "sports",
    "products",
    "world",
    "crime",
    "mystery",
  ]);
  return allowed.has(v) ? v : "all";
}

function normalizeQ(input) {
  return String(input || "")
    .trim()
    .slice(0, 120);
}

function HomeContentInner({ initialCards, initialQuery }) {
  const router = useRouter();
  const sp = useSearchParams();

  const categoryQ = normalizeCategory(
    sp.get("category") || initialQuery?.category,
  );
  const sortQ = normalizeSort(sp.get("sort") || initialQuery?.sort);
  const q = normalizeQ(sp.get("q") ?? initialQuery?.q ?? "");

  const [cards, setCards] = useState(initialCards || []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // hydration guard (prevents SSR/CSR mismatch for 🔥, etc.)
  const [hydrated, setHydrated] = useState(false);

  // tracks whether we have evaluated the current query at least once
  // (prevents "No matches" flashing on first paint and during transitions)
  const [didInit, setDidInit] = useState(false);

  // trending
  const [trendingIds, setTrendingIds] = useState(() => new Set());
  const [trendingList, setTrendingList] = useState([]); // for "trending" sort
  const [trendingLoading, setTrendingLoading] = useState(false);

  const categories = useMemo(
    () => [
      "all",
      "science",
      "technology",
      "space",
      "nature",
      "health",
      "history",
      "culture",
      "sports",
      "products",
      "world",
      "crime",
      "mystery",
    ],
    [],
  );

  function setQuery(next) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all") params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : `/`, { scroll: false });
  }

  function rememberFeedContext(openedId) {
    try {
      const payload = {
        ids: (cards || []).map((x) => Number(x.id)).filter(Boolean),
        category: categoryQ,
        sort: sortQ,
        openedId: Number(openedId),
        ts: Date.now(),
      };
      sessionStorage.setItem("cw_feed_ctx", JSON.stringify(payload));
    } catch {}
  }

  // mark hydrated after first client paint
  useEffect(() => {
    setHydrated(true);
  }, []);

  // reset paging + init flag when filters change (not when "page" changes via load more)
  useEffect(() => {
    setPage(1);
    setDidInit(false);
  }, [categoryQ, sortQ, q]);

  // --- Trending fetch (ids + list), refresh hourly ---
  useEffect(() => {
    let alive = true;

    async function loadTrending() {
      setTrendingLoading(true);
      try {
        const res = await fetch(`/api/trending?limit=${TRENDING_LIMIT}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const items = Array.isArray(json?.items) ? json.items : [];

        const ids = new Set(items.map((x) => Number(x?.id)).filter(Boolean));

        if (!alive) return;
        setTrendingIds(ids);
        setTrendingList(items);
      } catch {
        // ignore
      } finally {
        if (alive) setTrendingLoading(false);
      }
    }

    loadTrending();
    const t = setInterval(loadTrending, TRENDING_REFRESH_MS);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // ----------------------------
  // Data loading (Newest/Wow)
  // ----------------------------
  useEffect(() => {
    let alive = true;

    const isDefault =
      categoryQ === "all" && sortQ === "newest" && page === 1 && !q;

    // ✅ default SSR hydration (no fetch)
    // NOTE: This now relies on server rendering the correct default list.
    if (isDefault) {
      setCards(initialCards || []);
      setHasMore((initialCards || []).length === PAGE_SIZE);
      setLoading(false);
      setDidInit(true);
      return () => {
        alive = false;
      };
    }

    // ✅ TRENDING handled in separate effect below
    if (sortQ === "trending") {
      // do nothing here
      return () => {
        alive = false;
      };
    }

    async function fetchCards() {
      // show loading state for query/page transitions
      setLoading(true);

      try {
        let qy = supabase
          .from("curiosity_cards")
          .select(
            "id, category, title, summary_normalized, image_url, created_at, wow_score",
          )
          .eq("status", "published");

        if (categoryQ !== "all") qy = qy.eq("category", categoryQ);

        // ✅ Search
        if (q) {
          const safe = escapeLike(q);
          // Note: PostgREST "or" filter string. Keep it tight (no spaces).
          qy = qy.or(
            `title.ilike.%${safe}%,summary_normalized.ilike.%${safe}%`,
          );
        }

        if (sortQ === "newest")
          qy = qy.order("created_at", { ascending: false });

        if (sortQ === "wow")
          qy = qy
            .order("wow_score", { ascending: false })
            .order("created_at", { ascending: false });

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await qy.range(from, to);

        if (!alive) return;

        if (!error) {
          if (page === 1) setCards(data || []);
          else setCards((prev) => [...(prev || []), ...(data || [])]);

          setHasMore((data || []).length === PAGE_SIZE);
        } else {
          if (page === 1) setCards([]);
          setHasMore(false);
        }
      } catch {
        if (!alive) return;
        if (page === 1) setCards([]);
        setHasMore(false);
      } finally {
        if (!alive) return;
        setLoading(false);
        setDidInit(true);
      }
    }

    fetchCards();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryQ, sortQ, q, page, initialCards]);

  // ----------------------------
  // TRENDING mode (pure client filter of trendingList)
  // ----------------------------
  useEffect(() => {
    if (sortQ !== "trending") return;

    // While trending is loading AND we have no list yet, keep "not initialized"
    if (trendingLoading && (!trendingList || trendingList.length === 0)) {
      setDidInit(false);
      return;
    }

    const qLower = q.toLowerCase();

    const filteredByCat =
      categoryQ === "all"
        ? trendingList
        : trendingList.filter(
            (x) =>
              String(x?.category || "").toLowerCase() ===
              String(categoryQ || "").toLowerCase(),
          );

    const filteredBySearch = qLower
      ? filteredByCat.filter((x) =>
          String(x?.title || "")
            .toLowerCase()
            .includes(qLower),
        )
      : filteredByCat;

    setCards(filteredBySearch);
    setHasMore(false);

    // When trending list is ready (or finished trying), mark evaluated
    if (!trendingLoading) setDidInit(true);
  }, [sortQ, categoryQ, q, trendingList, trendingLoading]);

  // ----------------------------
  // Empty / Loading states
  // ----------------------------
  const isTrendingMode = sortQ === "trending";
  const isCurrentlyLoading = isTrendingMode ? trendingLoading : loading;

  // If we haven't evaluated the query yet, show loading (prevents "no matches" flash)
  if (!didInit) {
    return <Loader>Loading curiosities…</Loader>;
  }

  // When loading for subsequent query changes, show loading
  if (isCurrentlyLoading) {
    return (
      <Loader>
        {isTrendingMode
          ? "Loading trending curiosities…"
          : "Loading curiosities…"}
      </Loader>
    );
  }

  // After evaluation + not loading: show empty-result message if nothing to show
  if (!cards || cards.length === 0) {
    const hasSearch = !!q;
    const hasCategory = categoryQ !== "all";

    const message = hasSearch
      ? `No curiosities matched “${q}”.`
      : hasCategory
        ? `No curiosities found in “${categoryQ}” yet.`
        : isTrendingMode
          ? "No trending curiosities right now."
          : "No curiosities found.";

    const hint =
      hasSearch || hasCategory
        ? "Try a different category, remove filters, or broaden your search."
        : "Check back soon — new stories are published daily.";

    return (
      <Loader>
        {message} <span style={{ opacity: 0.7 }}>{hint}</span>
      </Loader>
    );
  }

  // ----------------------------
  // Normal render
  // ----------------------------
  return (
    <Wrapper>
      <TopBar>
        <div>
          <Title>All about it!</Title>
          <Divider />
        </div>

        {/* ✅ Desktop controls stay here; hidden on mobile via CSS */}
        <Controls>
          <Select
            value={categoryQ}
            onChange={(e) => setQuery({ category: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </Select>

          <Select
            value={sortQ}
            onChange={(e) => setQuery({ sort: e.target.value })}
          >
            <option value="newest">Newest</option>
            <option value="trending">Trending</option>
            {/* Optional: keep wow if you want it later:
                <option value="wow">Top WOW</option>
             */}
          </Select>
        </Controls>
      </TopBar>

      <Grid>
        {cards.map((c) => (
          <CurioCard
            key={c.id}
            card={c}
            isTrending={hydrated && trendingIds.has(Number(c.id))}
            onOpen={rememberFeedContext}
          />
        ))}
      </Grid>

      {hasMore && !isTrendingMode && (
        <LoadMore onClick={() => setPage((p) => p + 1)} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </LoadMore>
      )}
    </Wrapper>
  );
}

export default function HomeContent(props) {
  // ✅ Next requires useSearchParams to be inside a Suspense boundary
  return (
    <Suspense fallback={<Loader>Loading…</Loader>}>
      <HomeContentInner {...props} />
    </Suspense>
  );
}
