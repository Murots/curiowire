"use client";

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 20;

/**
 * 📚 Viser artikler for en gitt kategori (med paginering + strukturert data)
 */
export default function SitemapCategoryPage() {
  const { category } = useParams();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [articles, setArticles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from("articles")
        .select("id, title, created_at", { count: "exact" })
        .eq("category", category)
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) {
        console.error("❌ Error fetching articles:", error.message);
        return;
      }

      setArticles(data || []);
      setTotalCount(count || 0);
      setLoading(false);
    };

    fetchArticles();
  }, [category, page]);

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 🧩 Strukturert data (schema.org JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${formattedCategory} — CurioWire`,
    description: `Explore all ${formattedCategory.toLowerCase()} stories published on CurioWire — automatically updated.`,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: "https://curiowire.com",
      logo: {
        "@type": "ImageObject",
        url: "https://curiowire.com/icon.png",
      },
    },
    hasPart: articles.map((a) => ({
      "@type": "NewsArticle",
      headline: a.title || "Untitled",
      url: `https://curiowire.com/article/${a.id}`,
      datePublished: a.created_at,
    })),
  };

  if (loading) {
    return (
      <Wrapper>
        <Info>Loading {formattedCategory} articles...</Info>
      </Wrapper>
    );
  }

  return (
    <>
      {/* 🧭 SEO + strukturert data */}
      <Head>
        <title>{`${formattedCategory} Articles — CurioWire Sitemap`}</title>
        <meta
          name="description"
          content={`Explore all ${formattedCategory.toLowerCase()} stories published on CurioWire — updated automatically as new articles are generated.`}
        />
        <meta
          name="keywords"
          content={`${formattedCategory}, CurioWire, AI journalism, sitemap, category archive`}
        />
        <meta
          property="og:title"
          content={`${formattedCategory} — CurioWire`}
        />
        <meta
          property="og:description"
          content={`Browse ${formattedCategory.toLowerCase()} stories from CurioWire’s AI-curated archives.`}
        />
        <meta
          property="og:url"
          content={`https://curiowire.com/sitemap/${category}`}
        />
        <meta property="og:type" content="website" />

        {/* 🧠 Strukturert data for søkemotorer */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <Wrapper>
        <Title>{formattedCategory}</Title>
        <Info>
          Showing {articles.length} of {totalCount} articles
        </Info>

        {articles.length === 0 ? (
          <Info>No articles found in this category yet.</Info>
        ) : (
          <List>
            {articles.map((a) => (
              <Item key={a.id}>
                <LinkStyled href={`/article/${a.id}`}>
                  {a.title || "Untitled"}
                </LinkStyled>
                <Timestamp>
                  {new Date(a.created_at).toLocaleDateString()}
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
    </>
  );
}
