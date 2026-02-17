// app/HomeContent.jsx
"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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

const FEED_STATE_KEY = "cw_feed_state_v1";
const SCROLL_KEY = "cw_scroll_y";
const RESTORE_EVENT = "cw:restore-scroll";

// --------------------
// Utils
// --------------------
function escapeLike(s) {
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

// Read query from URL on the client (no useSearchParams => avoids CSR bailout)
function readQueryFromLocation(fallback) {
  try {
    const sp = new URLSearchParams(window.location.search);
    const category = normalizeCategory(
      sp.get("category") || fallback?.category,
    );
    const sort = normalizeSort(sp.get("sort") || fallback?.sort);
    const q = normalizeQ(sp.get("q") ?? fallback?.q ?? "");
    return { category, sort, q };
  } catch {
    return {
      category: normalizeCategory(fallback?.category),
      sort: normalizeSort(fallback?.sort),
      q: normalizeQ(fallback?.q),
    };
  }
}

function sameQuery(a, b) {
  return (
    String(a?.category || "") === String(b?.category || "") &&
    String(a?.sort || "") === String(b?.sort || "") &&
    String(a?.q || "") === String(b?.q || "")
  );
}

// Dedupe by id (fixer "Encountered two children with the same key")
function dedupeById(list) {
  const m = new Map();
  (Array.isArray(list) ? list : []).forEach((x) => {
    const id = Number(x?.id);
    if (!Number.isFinite(id)) return;
    if (!m.has(id)) m.set(id, x);
  });
  return Array.from(m.values());
}

function readSavedFeedState(expectedQuery) {
  try {
    const raw = sessionStorage.getItem(FEED_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cards)) return null;

    // Kun restore hvis query matcher nåværende URL-query
    if (!sameQuery(parsed.query, expectedQuery)) return null;

    // Valgfritt: TTL (f.eks. 30 min). Kan fjernes om du vil.
    const ts = Number(parsed.ts || 0);
    if (Number.isFinite(ts) && ts > 0) {
      const ageMs = Date.now() - ts;
      if (ageMs > 30 * 60 * 1000) return null;
    }

    return {
      cards: dedupeById(parsed.cards),
      page: Number(parsed.page) || 1,
      hasMore: Boolean(parsed.hasMore),
      query: parsed.query,
    };
  } catch {
    return null;
  }
}

function writeSavedFeedState(payload) {
  try {
    sessionStorage.setItem(FEED_STATE_KEY, JSON.stringify(payload));
  } catch {}
}

function restoreFeedScroll() {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return;

    const y = Number(raw);
    if (!Number.isFinite(y) || y < 0) return;

    sessionStorage.removeItem(SCROLL_KEY);

    // Vent 1–2 frames slik at DOM/høyde rekker å bli riktig (spesielt etter restore cards/page)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
      });
    });
  } catch {}
}

export default function HomeContent({ initialCards, initialQuery }) {
  const router = useRouter();

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

  // ✅ Query state (SSR -> sync fra URL etter mount)
  const [query, setQueryState] = useState(() => ({
    category: normalizeCategory(initialQuery?.category),
    sort: normalizeSort(initialQuery?.sort),
    q: normalizeQ(initialQuery?.q),
  }));

  const categoryQ = query.category;
  const sortQ = query.sort;
  const q = query.q;

  // ✅ Hydration guard
  const [hydrated, setHydrated] = useState(false);

  // ✅ Init/flash guard
  const [didInit, setDidInit] = useState(() => {
    const hasSSR = Array.isArray(initialCards) && initialCards.length > 0;
    return hasSSR;
  });

  // ✅ Trending state
  const [trendingIds, setTrendingIds] = useState(() => new Set());
  const [trendingList, setTrendingList] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // ✅ Feed state
  // Start med SSR, men prøv å hente cached state hvis det matcher query i URL
  const restoredRef = useRef(false);
  const [cards, setCards] = useState(() => initialCards || []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    (initialCards || []).length === PAGE_SIZE,
  );
  const [loading, setLoading] = useState(false);

  // ----------------------------
  // ✅ NEW: Sync local query state when SSR props change (fixes mobile Header push)
  // ----------------------------
  useEffect(() => {
    const next = {
      category: normalizeCategory(initialQuery?.category),
      sort: normalizeSort(initialQuery?.sort),
      q: normalizeQ(initialQuery?.q),
    };

    if (sameQuery(query, next)) return;

    // Treat as a “real” query change coming from navigation (Header router.push)
    restoredRef.current = false;

    // Reset paging (same behavior as when changing via UI)
    setPage(1);

    // Clear cached feed state to avoid restoring wrong list after a header-driven nav
    try {
      sessionStorage.removeItem(FEED_STATE_KEY);
      sessionStorage.removeItem(SCROLL_KEY);
    } catch {}

    setQueryState(next);

    // Keep SSR cards in sync as well (category/search changes SSR list; trending SSR is newest)
    setCards(dedupeById(initialCards || []));
    setHasMore((initialCards || []).length === PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialQuery?.category,
    initialQuery?.sort,
    initialQuery?.q,
    initialCards,
  ]);

  // ----------------------------
  // Query setter
  // ----------------------------
  const setQuery = useCallback(
    (next) => {
      const merged = {
        category: normalizeCategory(next?.category ?? categoryQ),
        sort: normalizeSort(next?.sort ?? sortQ),
        q: normalizeQ(next?.q ?? q),
      };

      const params = new URLSearchParams();
      if (merged.category && merged.category !== "all")
        params.set("category", merged.category);
      if (merged.sort && merged.sort !== "newest")
        params.set("sort", merged.sort);
      if (merged.q) params.set("q", merged.q);

      const qs = params.toString();
      router.push(qs ? `/?${qs}` : `/`, { scroll: false });

      // Når query endrer seg, dropp cached feed-state for å unngå "feil restore"
      try {
        sessionStorage.removeItem(FEED_STATE_KEY);
        sessionStorage.removeItem(SCROLL_KEY);
      } catch {}

      restoredRef.current = false;

      setQueryState(merged);
    },
    [router, categoryQ, sortQ, q],
  );

  // ----------------------------
  // Feed context (kalles når du åpner et kort)
  // ----------------------------
  const rememberFeedContext = useCallback(
    (openedId) => {
      // 1) lagre scroll pos
      try {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY || 0));
      } catch {}

      // 2) lagre feed ctx til modal-nav (ids + query)
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

      // 3) lagre FULL feed-state slik at du får samme liste tilbake etter modal close
      writeSavedFeedState({
        ts: Date.now(),
        query: { category: categoryQ, sort: sortQ, q },
        page,
        hasMore,
        cards: cards || [],
      });
    },
    [cards, categoryQ, sortQ, q, page, hasMore],
  );

  // ----------------------------
  // Mount: hydrate + restore feed-state hvis vi kommer tilbake fra modal
  // ----------------------------
  useEffect(() => {
    setHydrated(true);

    // Når komponenten mounte’s, synk query fra URL
    const nextQuery = readQueryFromLocation({
      category: initialQuery?.category,
      sort: initialQuery?.sort,
      q: initialQuery?.q,
    });
    setQueryState(nextQuery);

    // Prøv å restore saved feed-state hvis den matcher query
    const saved = readSavedFeedState(nextQuery);
    if (saved) {
      restoredRef.current = true;
      setCards(saved.cards || []);
      setPage(saved.page || 1);
      setHasMore(Boolean(saved.hasMore));
      setDidInit(true);

      // Når kort + page er restore’t, kan vi restore scroll
      restoreFeedScroll();
    } else {
      // Ingen saved state -> bare restore scroll (kan være fra back/forward)
      restoreFeedScroll();
    }

    // Lytt på event fra modal-close (router.replace trigger ikke popstate)
    const onRestore = () => restoreFeedScroll();
    window.addEventListener(RESTORE_EVENT, onRestore);

    return () => {
      window.removeEventListener(RESTORE_EVENT, onRestore);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Back/forward: sync query + restore scroll (og ev. state)
  // ----------------------------
  useEffect(() => {
    function onPopState() {
      const nextQuery = readQueryFromLocation({
        category: initialQuery?.category,
        sort: initialQuery?.sort,
        q: initialQuery?.q,
      });
      setQueryState(nextQuery);

      const saved = readSavedFeedState(nextQuery);
      if (saved) {
        restoredRef.current = true;
        setCards(saved.cards || []);
        setPage(saved.page || 1);
        setHasMore(Boolean(saved.hasMore));
        setDidInit(true);
      }

      restoreFeedScroll();
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Reset paging when filters change
  // ----------------------------
  useEffect(() => {
    // Når filters endres via UI, vil vi starte på nytt
    // (ikke når vi restore fra session)
    if (!restoredRef.current) {
      setPage(1);
    }

    const isDefault =
      categoryQ === "all" && sortQ === "newest" && !q && page === 1;
    if (isDefault) setDidInit(true);
    else setDidInit(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryQ, sortQ, q]);

  // ----------------------------
  // Trending fetch
  // ----------------------------
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

    // ✅ SSR hydration (men IKKE overskriv hvis vi akkurat har restore’t fra session)
    if (isDefault && !restoredRef.current) {
      setCards(dedupeById(initialCards || []));
      setHasMore((initialCards || []).length === PAGE_SIZE);
      setLoading(false);
      setDidInit(true);
      return () => {
        alive = false;
      };
    }

    if (sortQ === "trending") {
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
          if (page === 1) {
            setCards(dedupeById(data || []));
          } else {
            setCards((prev) => dedupeById([...(prev || []), ...(data || [])]));
          }
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

        // Når vi først har kjørt en “real” fetch, kan vi slippe restored-flagget
        restoredRef.current = false;
      }
    }

    fetchCards();

    return () => {
      alive = false;
    };
  }, [categoryQ, sortQ, q, page, initialCards]);

  // ----------------------------
  // TRENDING mode (pure client filter)
  // ----------------------------
  useEffect(() => {
    if (sortQ !== "trending") return;

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

    setCards(dedupeById(filteredBySearch));
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

  // Viktig: ikke “erstatt” hele feed’en med Loader under append.
  // Vi viser fortsatt grid og bare deaktiverer knappen.
  // (Du kan evt ha en liten spinner i knappen)
  if (isCurrentlyLoading && page === 1 && !cards?.length) {
    return (
      <Loader>
        {isTrendingMode
          ? "Loading trending curiosities…"
          : "Loading curiosities…"}
      </Loader>
    );
  }

  // ✅ NEW: Empty message/hint computed but DO NOT early-return (keep TopBar visible)
  const isEmpty = !cards || cards.length === 0;

  const hasSearch = !!q;
  const hasCategory = categoryQ !== "all";

  const emptyMessage = hasSearch
    ? `No curiosities matched “${q}”.`
    : hasCategory
      ? `No curiosities found in “${categoryQ}” yet.`
      : isTrendingMode
        ? "No trending curiosities right now."
        : "No curiosities found.";

  const emptyHint =
    hasSearch || hasCategory
      ? "Try a different category, remove filters, or broaden your search."
      : "Check back soon — new stories are published daily.";

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <Wrapper>
      <TopBar>
        <div>
          <Title>All about it!</Title>
          <Divider />
        </div>

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

      {isEmpty ? (
        <Loader>
          {emptyMessage} <span style={{ opacity: 0.7 }}>{emptyHint}</span>
        </Loader>
      ) : (
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
      )}

      {!isEmpty && hasMore && !isTrendingMode && (
        <LoadMore onClick={() => setPage((p) => p + 1)} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </LoadMore>
      )}
    </Wrapper>
  );
}
