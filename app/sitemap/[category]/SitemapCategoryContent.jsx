// app/sitemap/[category]/SitemapCategoryContent.jsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Wrapper,
  Title,
  Info,
  List,
  Item,
  LinkStyled,
  Timestamp,
  Pagination,
  PageButton,
} from "../sitemap.styles";

function SitemapCategoryContentInner({
  pageSize = 20,
  initialCards,
  initialCount,
}) {
  const params = useParams();
  const searchParams = useSearchParams();

  const category = params?.category || null;
  const page = parseInt(searchParams?.get("page") || "1", 10);

  const [cards, setCards] = useState(() =>
    Array.isArray(initialCards) ? initialCards : []
  );
  const [totalCount, setTotalCount] = useState(() => Number(initialCount) || 0);
  const [loading, setLoading] = useState(() => page !== 1); // if landing directly on page>1, show loading

  // Reset local state when category changes
  useEffect(() => {
    if (!category) return;

    // If we are on page 1, hydrate from initial SSR data instantly (no fetch)
    if (page === 1) {
      setCards(Array.isArray(initialCards) ? initialCards : []);
      setTotalCount(Number(initialCount) || 0);
      setLoading(false);
      return;
    }

    // For page > 1, we'll fetch
    setCards([]);
    setLoading(true);
  }, [category, page, initialCards, initialCount]);

  // Fetch for page > 1 (or if user lands directly on page > 1)
  useEffect(() => {
    if (!category) return;
    if (page === 1) return; // ✅ no double-fetch

    let alive = true;

    async function fetchPage() {
      setLoading(true);

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, count, error } = await supabase
        .from("curiosity_cards")
        .select("id, title, created_at", { count: "exact" })
        .eq("status", "published")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .range(start, end);

      if (!alive) return;

      if (error) {
        console.error("❌ Error fetching sitemap cards:", error);
        setCards([]);
        setTotalCount(0);
      } else {
        setCards(Array.isArray(data) ? data : []);
        setTotalCount(Number(count) || 0);
      }

      setLoading(false);
    }

    fetchPage();

    return () => {
      alive = false;
    };
  }, [category, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / pageSize)),
    [totalCount, pageSize]
  );

  if (!category) {
    return (
      <Wrapper>
        <Info>Loading sitemap...</Info>
      </Wrapper>
    );
  }

  if (loading) {
    return (
      <Wrapper>
        <Info>Loading {category} sitemap...</Info>
      </Wrapper>
    );
  }

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <Wrapper>
      <Title>{formattedCategory}</Title>

      <Info>
        Showing {cards.length} of {totalCount} curiosities
      </Info>

      {cards.length === 0 ? (
        <Info>No curiosities found in this category yet.</Info>
      ) : (
        <List>
          {cards.map((c) => (
            <Item key={c.id}>
              <LinkStyled href={`/article/${c.id}`}>
                {c.title || "Untitled"}
              </LinkStyled>
              <Timestamp>
                {new Date(c.created_at).toLocaleDateString()}
              </Timestamp>
            </Item>
          ))}
        </List>
      )}

      {totalPages > 1 && (
        <Pagination>
          {page > 1 && (
            <PageButton href={`/sitemap/${category}?page=${page - 1}`}>
              ← Previous
            </PageButton>
          )}

          <span>
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <PageButton href={`/sitemap/${category}?page=${page + 1}`}>
              Next →
            </PageButton>
          )}
        </Pagination>
      )}
    </Wrapper>
  );
}

export default function SitemapCategoryContent(props) {
  // ✅ Next requires useSearchParams to be inside a Suspense boundary
  return (
    <Suspense
      fallback={
        <Wrapper>
          <Info>Loading sitemap…</Info>
        </Wrapper>
      }
    >
      <SitemapCategoryContentInner {...props} />
    </Suspense>
  );
}
