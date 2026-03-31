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
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
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
  SeoNote,
  SeoNoteTitle,
  MainWrapper,
  BreadcrumbSlot,
} from "./page.styles";
import { getCategoryColor } from "@/lib/categoryColors";

const PAGE_SIZE = 30;
const TRENDING_LIMIT = 10;
const TRENDING_REFRESH_MS = 60 * 60 * 1000; // 1 hour
const RANDOM_LIMIT = 10;

const FEED_STATE_KEY = "cw_feed_state_v1";
const SCROLL_KEY = "cw_scroll_y";
const RESTORE_EVENT = "cw:restore-scroll";

// --------------------
// Category copy (used for category pages + SEO text)
// --------------------
const CATEGORY_INTROS = {
  science: "Echoes from the lab",
  technology: "Traces from the dawn of innovation",
  space: "Whispers from the silent cosmos",
  nature: "Stories carved by wind and water",
  health: "Secrets of the human vessel",
  history: "Recovered from the dusty archives",
  culture: "Fragments from the heart of civilization",
  sports: "Legends born in the arena",
  products: "Artifacts of human ingenuity",
  world: "Records from the halls of power",
  crime: "Notes from the casefile",
  mystery: "Fragments from the unknown",
};

const CATEGORY_DESCRIPTIONS = {
  science:
    "Explore echoes from the lab — from surprising discoveries and cutting-edge research to strange natural phenomena that shape our world.",
  technology:
    "Discover traces from the dawn of innovation — breakthrough inventions, digital revolutions and the ideas shaping the future.",
  space:
    "Follow whispers from the silent cosmos — distant galaxies, black holes and the mysteries of the universe.",
  nature:
    "Uncover stories carved by wind and water — extraordinary wildlife, extreme environments and the hidden forces of nature.",
  health:
    "Learn the secrets of the human vessel — medical discoveries, human biology and the science behind how our bodies function.",
  history:
    "Step into stories recovered from the dusty archives — forgotten events, remarkable figures and strange moments from the past.",
  culture:
    "Explore fragments from the heart of civilization — traditions, art, customs and the stories that define societies.",
  sports:
    "Discover legends born in the arena — extraordinary achievements, unbelievable records and iconic sporting moments.",
  products:
    "Examine artifacts of human ingenuity — inventions, design breakthroughs and the unexpected origins of everyday objects.",
  world:
    "Read records from the halls of power — global events, political shifts and remarkable stories shaping our world.",
  crime:
    "Explore notes from the casefile — unusual cases, historical crimes and the darker side of human behavior.",
  mystery:
    "Uncover fragments from the unknown — unexplained phenomena, strange disappearances and enduring enigmas.",
};

// --------------------
// Utils
// --------------------
function formatHeading(category) {
  if (!category || category === "all") return "All curiosities";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function escapeLike(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/[%_]/g, "\\$&");
}

function normalizeSort(input) {
  const v = String(input || "newest").toLowerCase();
  if (v === "trending") return "trending";
  if (v === "random") return "random";
  if (v === "lists") return "lists";
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

function readCategoryFromPathname() {
  try {
    const path = String(window.location.pathname || "/")
      .replace(/\/+$/, "")
      .toLowerCase();

    if (path === "" || path === "/") return null;

    const seg = path.split("/").filter(Boolean)[0] || null;
    const cat = normalizeCategory(seg);

    if (!cat || cat === "all") return null;

    return cat;
  } catch {
    return null;
  }
}

function readQueryFromLocation(fallback) {
  try {
    const sp = new URLSearchParams(window.location.search);

    const pathCat = readCategoryFromPathname();
    const qsCat = normalizeCategory(sp.get("category") || fallback?.category);

    const category = pathCat || qsCat;
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

    if (!sameQuery(parsed.query, expectedQuery)) return null;

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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
      });
    });
  } catch {}
}

export default function HomeContent({ initialCards, initialQuery }) {
  const router = useRouter();

  const navPendingRef = useRef(false);

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

  const [query, setQueryState] = useState(() => ({
    category: normalizeCategory(initialQuery?.category),
    sort: normalizeSort(initialQuery?.sort),
    q: normalizeQ(initialQuery?.q),
  }));

  const categoryQ = query.category;
  const sortQ = query.sort;
  const q = query.q;

  const [hydrated, setHydrated] = useState(false);

  const [didInit, setDidInit] = useState(() => {
    const hasSSR = Array.isArray(initialCards) && initialCards.length > 0;
    return hasSSR;
  });

  const [trendingIds, setTrendingIds] = useState(() => new Set());
  const [trendingList, setTrendingList] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const [randomLoading, setRandomLoading] = useState(false);

  const restoredRef = useRef(false);
  const [cards, setCards] = useState(() => initialCards || []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    (initialCards || []).length === PAGE_SIZE,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const next = {
      category: normalizeCategory(initialQuery?.category),
      sort: normalizeSort(initialQuery?.sort),
      q: normalizeQ(initialQuery?.q),
    };

    if (sameQuery(query, next)) {
      navPendingRef.current = false;
      return;
    }

    restoredRef.current = false;
    setPage(1);

    try {
      sessionStorage.removeItem(FEED_STATE_KEY);
      sessionStorage.removeItem(SCROLL_KEY);
    } catch {}

    const ssrControlsCards =
      next.sort === "newest" || next.sort === "wow" || next.sort === "lists";

    if (ssrControlsCards) {
      setCards(dedupeById(initialCards || []));
      setHasMore((initialCards || []).length === PAGE_SIZE);
      setDidInit(true);
    } else {
      setHasMore(false);
    }

    setQueryState(next);
    navPendingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialQuery?.category,
    initialQuery?.sort,
    initialQuery?.q,
    initialCards,
  ]);

  const setQuery = useCallback(
    (next) => {
      const merged = {
        category: normalizeCategory(next?.category ?? categoryQ),
        sort: normalizeSort(next?.sort ?? sortQ),
        q: normalizeQ(next?.q ?? q),
      };

      const isSimpleCategory =
        merged.category &&
        merged.category !== "all" &&
        merged.sort === "newest" &&
        !merged.q;

      const isDefaultHome =
        merged.category === "all" && merged.sort === "newest" && !merged.q;

      setDidInit(false);
      navPendingRef.current = true;

      if (isSimpleCategory) {
        router.push(`/${merged.category}`, { scroll: false });
      } else if (isDefaultHome) {
        router.push(`/`, { scroll: false });
      } else {
        const basePath =
          merged.category && merged.category !== "all"
            ? `/${merged.category}`
            : `/`;

        const params = new URLSearchParams();
        if (merged.sort && merged.sort !== "newest")
          params.set("sort", merged.sort);
        if (merged.q) params.set("q", merged.q);

        const qs = params.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
      }

      try {
        sessionStorage.removeItem(FEED_STATE_KEY);
        sessionStorage.removeItem(SCROLL_KEY);
      } catch {}

      restoredRef.current = false;
      setQueryState((prev) => (sameQuery(prev, merged) ? prev : merged));
    },
    [router, categoryQ, sortQ, q],
  );

  const rememberFeedContext = useCallback(
    (openedId) => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY || 0));
      } catch {}

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

  useEffect(() => {
    setHydrated(true);

    const nextQuery = readQueryFromLocation({
      category: initialQuery?.category,
      sort: initialQuery?.sort,
      q: initialQuery?.q,
    });
    setQueryState((prev) => (sameQuery(prev, nextQuery) ? prev : nextQuery));

    const saved = readSavedFeedState(nextQuery);
    if (saved) {
      restoredRef.current = true;
      setCards(saved.cards || []);
      setPage(saved.page || 1);
      setHasMore(Boolean(saved.hasMore));
      setDidInit(true);
      restoreFeedScroll();
    } else {
      restoreFeedScroll();
    }

    const onRestore = () => restoreFeedScroll();
    window.addEventListener(RESTORE_EVENT, onRestore);

    return () => {
      window.removeEventListener(RESTORE_EVENT, onRestore);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onPopState() {
      const nextQuery = readQueryFromLocation({
        category: initialQuery?.category,
        sort: initialQuery?.sort,
        q: initialQuery?.q,
      });
      setQueryState((prev) => (sameQuery(prev, nextQuery) ? prev : nextQuery));

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

  useEffect(() => {
    if (!restoredRef.current) {
      setPage((p) => (p === 1 ? p : 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryQ, sortQ, q]);

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

  useEffect(() => {
    let alive = true;

    const isNavPendingBaseState = navPendingRef.current && page === 1 && !q;

    if (
      isNavPendingBaseState &&
      (sortQ === "newest" || sortQ === "wow" || sortQ === "lists") &&
      !restoredRef.current
    ) {
      return () => {
        alive = false;
      };
    }

    const isDefault =
      categoryQ === "all" && sortQ === "newest" && page === 1 && !q;

    if (isDefault && !restoredRef.current) {
      setCards(dedupeById(initialCards || []));
      setHasMore((initialCards || []).length === PAGE_SIZE);
      setLoading(false);
      setDidInit(true);
      return () => {
        alive = false;
      };
    }

    if (sortQ === "trending" || sortQ === "random") {
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
            "id, category, title, summary_normalized, image_url, created_at, wow_score, article_type",
          )
          .eq("status", "published")
          .eq("is_listed", true);

        if (categoryQ !== "all") qy = qy.eq("category", categoryQ);

        if (q) {
          const safe = escapeLike(q);
          qy = qy.or(
            `title.ilike.%${safe}%,summary_normalized.ilike.%${safe}%`,
          );
        }

        if (sortQ === "lists") {
          qy = qy
            .eq("article_type", "list")
            .order("created_at", { ascending: false });
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
        restoredRef.current = false;
        navPendingRef.current = false;
      }
    }

    fetchCards();

    return () => {
      alive = false;
    };
  }, [categoryQ, sortQ, q, page, initialCards]);

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
    navPendingRef.current = false;
  }, [sortQ, categoryQ, q, trendingList, trendingLoading]);

  useEffect(() => {
    if (sortQ !== "random") return;

    let alive = true;

    async function loadRandom() {
      setRandomLoading(true);
      setDidInit(false);

      try {
        const catArg = categoryQ && categoryQ !== "all" ? categoryQ : null;

        const { data, error } = await supabase.rpc("get_random_curiosities", {
          cat: catArg,
          lim: RANDOM_LIMIT,
        });

        if (!alive) return;

        if (!error) {
          setCards(dedupeById(data || []));
          setHasMore(false);
        } else {
          setCards([]);
          setHasMore(false);
        }
      } catch {
        if (!alive) return;
        setCards([]);
        setHasMore(false);
      } finally {
        if (!alive) return;
        setRandomLoading(false);
        setDidInit(true);
        restoredRef.current = false;
        navPendingRef.current = false;
      }
    }

    loadRandom();

    return () => {
      alive = false;
    };
  }, [sortQ, categoryQ]);

  const isTrendingMode = sortQ === "trending";
  const isRandomMode = sortQ === "random";

  const isCurrentlyLoading = isTrendingMode
    ? trendingLoading
    : isRandomMode
      ? randomLoading
      : loading;

  if (!didInit) {
    return <Loader>Loading curiosities…</Loader>;
  }

  if (isCurrentlyLoading && page === 1 && !cards?.length) {
    return (
      <Loader>
        {isTrendingMode
          ? "Loading trending curiosities…"
          : isRandomMode
            ? "Loading random curiosities…"
            : "Loading curiosities…"}
      </Loader>
    );
  }

  const isEmpty = !cards || cards.length === 0;

  const hasSearch = !!q;
  const hasCategory = categoryQ !== "all";

  const breadcrumbItems = hasCategory
    ? [{ label: "Home", href: "/" }, { label: formatHeading(categoryQ) }]
    : null;

  const breadcrumbColor = hasCategory ? getCategoryColor(categoryQ) : null;

  const emptyMessage = hasSearch
    ? `No curiosities matched “${q}”.`
    : hasCategory
      ? `No curiosities found in “${categoryQ}” yet.`
      : isTrendingMode
        ? "No trending curiosities right now."
        : isRandomMode
          ? "No random curiosities right now."
          : sortQ === "lists"
            ? "No list curiosities found."
            : "No curiosities found.";

  const emptyHint =
    hasSearch || hasCategory
      ? "Try a different category, remove filters, or broaden your search."
      : "Check back soon — new stories are published daily.";

  return (
    <>
      {breadcrumbItems && (
        <BreadcrumbSlot $bg={breadcrumbColor}>
          <Breadcrumbs items={breadcrumbItems} />
        </BreadcrumbSlot>
      )}
      <MainWrapper>
        <Wrapper>
          <TopBar>
            <div>
              <Title>{formatHeading(categoryQ)}</Title>
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
                <option value="random">Random</option>
                <option value="lists">Lists only</option>
              </Select>
            </Controls>
          </TopBar>

          <SeoNote>
            <SeoNoteTitle>
              {categoryQ === "all"
                ? "Read all about it!"
                : `About ${formatHeading(categoryQ)}`}
            </SeoNoteTitle>

            <p>
              {categoryQ === "all"
                ? "CurioWire publishes fresh curiosities from science, history, nature, technology, space, culture and more. Each day we share short, fascinating stories, unusual discoveries and remarkable facts from around the world. Explore daily curiosities and discover something new."
                : CATEGORY_DESCRIPTIONS[categoryQ] ||
                  "Explore fascinating curiosities published daily on CurioWire."}
            </p>
          </SeoNote>

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

          {!isEmpty && hasMore && !isTrendingMode && !isRandomMode && (
            <LoadMore onClick={() => setPage((p) => p + 1)} disabled={loading}>
              {loading ? "Loading…" : "Load more"}
            </LoadMore>
          )}
          {/* <SeoNote>
        <SeoNoteTitle>
          {categoryQ === "all"
            ? "Read all about it!"
            : `About ${formatHeading(categoryQ)}`}
        </SeoNoteTitle>

        <p>
          {categoryQ === "all"
            ? "CurioWire publishes fresh curiosities from science, history, nature, technology, space, culture and more. Each day we share short, fascinating stories, unusual discoveries and remarkable facts from around the world. Explore daily curiosities and discover something new."
            : CATEGORY_DESCRIPTIONS[categoryQ] ||
              "Explore fascinating curiosities published daily on CurioWire."}
        </p>
      </SeoNote> */}
        </Wrapper>
      </MainWrapper>
    </>
  );
}
