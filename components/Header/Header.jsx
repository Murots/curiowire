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

function HeaderInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const isArticleRoute =
    typeof pathname === "string" && pathname.startsWith("/article/");

  const q = sp.get("q") || "";
  const categoryQ = sp.get("category") || "all";
  const sortQ = sp.get("sort") || "newest";

  const [menuOpen, setMenuOpen] = useState(false);

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
      if (
        v === null ||
        v === undefined ||
        v === "" ||
        (k === "category" && v === "all")
      ) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });

    const qs = params.toString();

    // ✅ Drop cached feed/scroll state når header endrer query (samme som HomeContent)
    try {
      sessionStorage.removeItem("cw_feed_state_v1");
      sessionStorage.removeItem("cw_scroll_y");
    } catch {}

    router.push(qs ? `/?${qs}` : `/`, { scroll: false });
  }

  // debounce URL update for search
  useEffect(() => {
    // ✅ Don't auto-navigate away from article pages on mount/hydration
    if (pathname !== "/") return;

    const t = setTimeout(() => {
      const cleaned = String(searchVal || "").trim();

      // If empty: remove q
      setQuery({ q: cleaned }); // empty string => setQuery deletes q
    }, 260);

    return () => clearTimeout(t);
  }, [searchVal, pathname]);

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
