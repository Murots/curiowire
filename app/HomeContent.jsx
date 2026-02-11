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
  return String(s || "").replace(/[%_]/g, "\\$&");
}

function HomeContentInner({ initialCards }) {
  const router = useRouter();
  const sp = useSearchParams();

  const categoryQ = sp.get("category") || "all";
  const sortQ = sp.get("sort") || "newest"; // newest | trending
  const qRaw = sp.get("q") || "";
  const q = String(qRaw || "").trim();

  const [cards, setCards] = useState(initialCards || []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // hydration guard (prevents SSR/CSR mismatch for 🔥, etc.)
  const [hydrated, setHydrated] = useState(false);

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
    []
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

  // reset paging when filters change
  useEffect(() => {
    setPage(1);
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

  const queryKey = `${categoryQ}:${sortQ}:${q}:${page}`;

  useEffect(() => {
    const isDefault =
      categoryQ === "all" && sortQ === "newest" && page === 1 && !q;

    if (isDefault) {
      setCards(initialCards || []);
      setHasMore((initialCards || []).length === PAGE_SIZE);
      return;
    }

    // ✅ TRENDING sort: use API list (top 10 this week)
    if (sortQ === "trending") {
      const qLower = q.toLowerCase();

      const filteredByCat =
        categoryQ === "all"
          ? trendingList
          : trendingList.filter(
              (x) =>
                String(x?.category || "").toLowerCase() ===
                String(categoryQ || "").toLowerCase()
            );

      const filteredBySearch = qLower
        ? filteredByCat.filter((x) =>
            String(x?.title || "")
              .toLowerCase()
              .includes(qLower)
          )
        : filteredByCat;

      setCards(filteredBySearch);
      setHasMore(false);
      return;
    }

    const fetchCards = async () => {
      setLoading(true);

      let qy = supabase
        .from("curiosity_cards")
        .select(
          "id, category, title, summary_normalized, image_url, created_at, wow_score"
        )
        .eq("status", "published");

      if (categoryQ !== "all") qy = qy.eq("category", categoryQ);

      // ✅ Search
      if (q) {
        const safe = escapeLike(q);
        // match title OR summary_normalized
        qy = qy.or(`title.ilike.%${safe}%,summary_normalized.ilike.%${safe}%`);
      }

      if (sortQ === "newest") qy = qy.order("created_at", { ascending: false });

      if (sortQ === "wow")
        qy = qy
          .order("wow_score", { ascending: false })
          .order("created_at", { ascending: false });

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await qy.range(from, to);

      if (!error) {
        setCards(
          page === 1 ? data || [] : (prev) => [...prev, ...(data || [])]
        );
        setHasMore((data || []).length === PAGE_SIZE);
      }

      setLoading(false);
    };

    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, trendingList, initialCards]);

  // show a stable loader if initial is empty
  if (!cards || cards.length === 0) {
    if (sortQ === "trending" && trendingLoading) {
      return <Loader>Loading trending curiosities…</Loader>;
    }
    return <Loader>Loading curiosities…</Loader>;
  }

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

      {hasMore && (
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
