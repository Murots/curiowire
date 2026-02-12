// app/HomeContent.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function buildUrlFromQuery(nextQuery) {
  const params = new URLSearchParams();

  const cat = normalizeCategory(nextQuery?.category);
  const sort = normalizeSort(nextQuery?.sort);
  const q = normalizeQ(nextQuery?.q);

  if (cat && cat !== "all") params.set("category", cat);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (q) params.set("q", q);

  const qs = params.toString();
  return qs ? `/?${qs}` : `/`;
}

function readQueryFromLocation(fallback) {
  try {
    if (typeof window === "undefined") return fallback;

    const sp = new URLSearchParams(window.location.search);

    return {
      category: normalizeCategory(sp.get("category") ?? fallback?.category),
      sort: normalizeSort(sp.get("sort") ?? fallback?.sort),
      q: normalizeQ(sp.get("q") ?? fallback?.q ?? ""),
    };
  } catch {
    return {
      category: normalizeCategory(fallback?.category),
      sort: normalizeSort(fallback?.sort),
      q: normalizeQ(fallback?.q ?? ""),
    };
  }
}

function sameQuery(a, b) {
  return (
    normalizeCategory(a?.category) === normalizeCategory(b?.category) &&
    normalizeSort(a?.sort) === normalizeSort(b?.sort) &&
    normalizeQ(a?.q) === normalizeQ(b?.q)
  );
}

export default function HomeContent({ initialCards, initialQuery }) {
  const router = useRouter();

  const normalizedInitialQuery = useMemo(
    () => ({
      category: normalizeCategory(initialQuery?.category),
      sort: normalizeSort(initialQuery?.sort),
      q: normalizeQ(initialQuery?.q),
    }),
    [initialQuery],
  );

  // ✅ No useSearchParams (prevents CSR bailout in View Source)
  const [query, setQueryState] = useState(normalizedInitialQuery);

  const categoryQ = query.category;
  const sortQ = query.sort;
  const q = query.q;

  const [cards, setCards] = useState(initialCards || []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    (initialCards || []).length === PAGE_SIZE,
  );

  // hydration guard (prevents SSR/CSR mismatch for 🔥, etc.)
  const [hydrated, setHydrated] = useState(false);

  // tracks whether we have evaluated the current query at least once
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

  function pushQuery(nextPartial) {
    const next = {
      ...query,
      ...nextPartial,
    };

    const normalizedNext = {
      category: normalizeCategory(next.category),
      sort: normalizeSort(next.sort),
      q: normalizeQ(next.q),
    };

    setQueryState(normalizedNext);
    setPage(1);
    setDidInit(false);

    const url = buildUrlFromQuery(normalizedNext);
    router.push(url, { scroll: false });
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

  // ✅ Sync query from URL on mount + back/forward (without useSearchParams)
  useEffect(() => {
    const fromUrl = readQueryFromLocation(normalizedInitialQuery);
    if (!sameQuery(fromUrl, query)) {
      setQueryState(fromUrl);
      setPage(1);
      setDidInit(false);
    } else {
      // If SSR already matches, mark init quickly
      setDidInit(true);
    }

    const onPop = () => {
      const q2 = readQueryFromLocation(normalizedInitialQuery);
      setQueryState(q2);
      setPage(1);
      setDidInit(false);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedInitialQuery]);

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
  // Data loading (Newest/Wow/Search/Category)
  // ----------------------------
  useEffect(() => {
    let alive = true;

    const isTrendingMode = sortQ === "trending";

    // ✅ If the current query equals the SSR query and we're on page 1,
    // use SSR data without refetch.
    const isSSRHydration =
      page === 1 && !isTrendingMode && sameQuery(query, normalizedInitialQuery);

    if (isSSRHydration) {
      setCards(initialCards || []);
      setHasMore((initialCards || []).length === PAGE_SIZE);
      setLoading(false);
      setDidInit(true);
      return () => {
        alive = false;
      };
    }

    // ✅ TRENDING handled in separate effect below
    if (isTrendingMode) {
      return () => {
        alive = false;
      };
    }

    async function fetchCards() {
      setLoading(true);

      try {
        let qy = supabase
          .from("curiosity_cards")
          .select(
            "id, category, title, summary_normalized, image_url, created_at, wow_score",
          )
          .eq("status", "published");

        if (categoryQ !== "all") qy = qy.eq("category", categoryQ);

        if (q) {
          const safe = escapeLike(q);
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
  }, [categoryQ, sortQ, q, page, query, normalizedInitialQuery, initialCards]);

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

    const qLower = (q || "").toLowerCase();

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

    if (!trendingLoading) setDidInit(true);
  }, [sortQ, categoryQ, q, trendingList, trendingLoading]);

  // ----------------------------
  // Empty / Loading states
  // ----------------------------
  const isTrendingMode = sortQ === "trending";
  const isCurrentlyLoading = isTrendingMode ? trendingLoading : loading;

  if (!didInit) {
    return <Loader>Loading curiosities…</Loader>;
  }

  if (isCurrentlyLoading) {
    return (
      <Loader>
        {isTrendingMode
          ? "Loading trending curiosities…"
          : "Loading curiosities…"}
      </Loader>
    );
  }

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
            onChange={(e) => pushQuery({ category: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </Select>

          <Select
            value={sortQ}
            onChange={(e) => pushQuery({ sort: e.target.value })}
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
