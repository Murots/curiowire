// components/Header/Header.jsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  HeaderWrapper,
  Inner,
  Logo,
  DesktopSearchWrap,
  SearchInput,
  ClearButton,
  FilterButton,
  MobileMenu,
  MobilePanel,
  MobileTitle,
  MobileRow,
  MobileLabel,
  MobileSelect,
  MobileSearchWrap,
  CloseMobile,
} from "./Header.styles";

// Keep category list in one place (same as elsewhere)
const CATEGORIES = [
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
];

function HeaderInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const isArticleRoute =
    typeof pathname === "string" && pathname.startsWith("/article/");

  const [menuOpen, setMenuOpen] = useState(false);

  // ------------------------------------------------------------
  // ✅ Read current state from URL:
  // - category comes from PATH (/science), not querystring
  // - sort/q come from querystring (?sort=trending&q=foo)
  // ------------------------------------------------------------
  const q = sp.get("q") || "";
  const sortQ = sp.get("sort") || "newest";

  const pathCategory = useMemo(() => {
    try {
      const path = String(pathname || "/")
        .replace(/\/+$/, "")
        .toLowerCase();

      if (path === "" || path === "/") return "all";
      const seg = path.split("/").filter(Boolean)[0] || "";
      return CATEGORIES.includes(seg) && seg !== "all" ? seg : "all";
    } catch {
      return "all";
    }
  }, [pathname]);

  const categoryQ = pathCategory;

  // local input state (so typing doesn't instantly thrash URL)
  const [searchVal, setSearchVal] = useState(q);

  // keep input in sync when URL changes (back/forward)
  useEffect(() => {
    setSearchVal(q);
  }, [q]);

  // ensure mobile drawer never stays open on article pages
  useEffect(() => {
    if (isArticleRoute) setMenuOpen(false);
  }, [isArticleRoute]);

  const categories = useMemo(() => CATEGORIES, []);

  function setQuery(next) {
    // Build from current querystring
    const params = new URLSearchParams(sp.toString());

    // Apply changes
    Object.entries(next || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") {
        params.delete(k);
      } else if (k === "category") {
        // category handled separately (path), not in querystring
        // ignore here
      } else {
        params.set(k, v);
      }
    });

    // Decide category (path) target
    const nextCatRaw =
      next && Object.prototype.hasOwnProperty.call(next, "category")
        ? String(next.category || "all")
        : categoryQ;

    const nextCat =
      nextCatRaw && categories.includes(nextCatRaw) ? nextCatRaw : "all";

    // Ensure category never leaks into querystring
    params.delete("category");

    // Build target URL
    const basePath = nextCat !== "all" ? `/${nextCat}` : `/`;
    const qs = params.toString();

    // ✅ Drop cached feed/scroll state når header endrer query (samme som HomeContent)
    try {
      sessionStorage.removeItem("cw_feed_state_v1");
      sessionStorage.removeItem("cw_scroll_y");
    } catch {}

    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  // debounce URL update for search
  useEffect(() => {
    // ✅ Don't auto-navigate away from article pages on mount/hydration
    if (isArticleRoute) return;

    const t = setTimeout(() => {
      const cleaned = String(searchVal || "").trim();
      // empty string => deletes q
      setQuery({ q: cleaned });
    }, 260);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchVal, isArticleRoute]);

  const clearSearch = () => {
    setSearchVal("");
    setQuery({ q: "" });
  };

  return (
    <HeaderWrapper>
      <Inner>
        <Logo>
          <Link href="/" aria-label="CurioWire home">
            <img src="/logo.svg" alt="CurioWire" width="140" height="32" />
          </Link>
        </Logo>

        {/* ✅ Hide search + filter controls on direct article pages */}
        {!isArticleRoute ? (
          <>
            {/* Desktop search (hidden on small screens via CSS) */}
            <DesktopSearchWrap>
              <SearchInput
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search curiosities…"
                aria-label="Search"
              />
              {searchVal ? (
                <ClearButton onClick={clearSearch} aria-label="Clear search">
                  ✕
                </ClearButton>
              ) : null}
            </DesktopSearchWrap>

            {/* Mobile: filter icon (opens drawer with search + controls) */}
            <FilterButton
              onClick={() => setMenuOpen(true)}
              aria-label="Open filters"
            >
              {/* simple “filter” icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </FilterButton>
          </>
        ) : (
          <div style={{ marginLeft: "auto" }} />
        )}
      </Inner>

      {/* Mobile drawer (disabled on article pages) */}
      {!isArticleRoute && menuOpen ? (
        <MobileMenu onClick={() => setMenuOpen(false)}>
          <MobilePanel onClick={(e) => e.stopPropagation()}>
            <CloseMobile onClick={() => setMenuOpen(false)} aria-label="Close">
              ✕
            </CloseMobile>

            <MobileTitle>Search & filters</MobileTitle>

            <MobileSearchWrap>
              <SearchInput
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search curiosities…"
                aria-label="Search"
              />
              {searchVal ? (
                <ClearButton onClick={clearSearch} aria-label="Clear search">
                  ✕
                </ClearButton>
              ) : null}
            </MobileSearchWrap>

            <MobileRow>
              <MobileLabel>Category</MobileLabel>
              <MobileSelect
                value={categoryQ}
                onChange={(e) => setQuery({ category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All categories" : c}
                  </option>
                ))}
              </MobileSelect>
            </MobileRow>

            <MobileRow>
              <MobileLabel>Sort</MobileLabel>
              <MobileSelect
                value={sortQ}
                onChange={(e) => setQuery({ sort: e.target.value })}
              >
                <option value="newest">Newest</option>
                <option value="trending">Trending</option>
                <option value="random">Random</option>
              </MobileSelect>
            </MobileRow>
          </MobilePanel>
        </MobileMenu>
      ) : null}
    </HeaderWrapper>
  );
}

export default function Header() {
  // ✅ Important: wrap any useSearchParams() usage in Suspense
  return (
    <Suspense
      fallback={
        <HeaderWrapper>
          <Inner>
            <Logo>
              <Link href="/" aria-label="CurioWire home">
                <img src="/logo.svg" alt="CurioWire" width="140" height="32" />
              </Link>
            </Logo>
          </Inner>
        </HeaderWrapper>
      }
    >
      <HeaderInner />
    </Suspense>
  );
}
