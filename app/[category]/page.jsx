"use client";

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import {
  Wrapper,
  Title,
  Grid,
  Loader,
  SubIntro,
  LoadMore,
} from "./page.styles";

export default function CategoryPage() {
  const { category } = useParams();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (!category) return;
    const fetchArticles = async () => {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("articles")
        .select("*", { count: "exact" })
        .eq("category", category)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("❌ Error fetching articles:", error.message);
        setLoading(false);
        return;
      }

      setArticles(data || []);
      setHasMore(count && to + 1 < count);
      setLoading(false);
    };

    fetchArticles();
  }, [category, page]);

  if (loading) return <Loader>Fetching stories from {category}...</Loader>;

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);
  const description = getCategoryIntro(category).replace(/^[^A-Za-z]+/, "");
  const baseUrl = "https://curiowire.com";
  const canonicalUrl =
    page > 1 ? `${baseUrl}/${category}?page=${page}` : `${baseUrl}/${category}`;
  const prevUrl = page > 1 ? `${baseUrl}/${category}?page=${page - 1}` : null;
  const nextUrl = hasMore ? `${baseUrl}/${category}?page=${page + 1}` : null;

  // Strukturert data (schema.org)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${formattedCategory} — CurioWire`,
    description,
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    mainEntity: articles.map((a) => ({
      "@type": "NewsArticle",
      headline: a.title,
      url: `${baseUrl}/article/${a.id}`,
      datePublished: a.created_at,
      image: a.image_url,
    })),
  };

  return (
    <>
      <Head>
        {/* 🧭 Primary SEO Metadata */}
        <title>{`${formattedCategory} — CurioWire`}</title>
        <meta
          name="description"
          content={`Discover ${formattedCategory.toLowerCase()} news, hidden histories, and AI-curated stories on CurioWire — updated daily.`}
        />
        <meta
          name="keywords"
          content={`${formattedCategory}, CurioWire, AI journalism, history, curiosities, ${formattedCategory.toLowerCase()} news`}
        />
        <meta name="Murots" content="CurioWire" />
        <meta property="article:section" content={formattedCategory} />
        <link rel="canonical" href={canonicalUrl} />
        {prevUrl && <link rel="prev" href={prevUrl} />}
        {nextUrl && <link rel="next" href={nextUrl} />}

        {/* 🕵️ Robots handling for pagination */}
        {page > 1 && <meta name="robots" content="noindex,follow" />}

        {/* 🌍 Open Graph (Facebook, LinkedIn) */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`${formattedCategory} — CurioWire`}
        />
        <meta
          property="og:description"
          content={`Explore the latest ${formattedCategory.toLowerCase()} insights, curiosities, and AI-driven stories on CurioWire.`}
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="CurioWire" />
        <meta property="og:image" content={`${baseUrl}/icon.png`} />

        {/* 🐦 Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${formattedCategory} — CurioWire`}
        />
        <meta
          name="twitter:description"
          content={`AI-curated ${formattedCategory.toLowerCase()} stories and curiosities — only on CurioWire.`}
        />
        <meta name="twitter:image" content={`${baseUrl}/icon.png`} />

        {/* 📱 Favicon & Manifest */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />

        {/* 🧠 Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: `${formattedCategory} — CurioWire`,
              description: `AI-curated ${formattedCategory.toLowerCase()} news and hidden histories on CurioWire.`,
              url: canonicalUrl,
              mainEntity: {
                "@type": "ItemList",
                itemListElement: articles.map((a, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  url: `${baseUrl}/article/${a.id}`,
                  name: a.title,
                  image: a.image_url,
                  datePublished: a.created_at,
                  dateModified: a.updated_at || a.created_at,
                })),
              },
              publisher: {
                "@type": "Organization",
                name: "CurioWire",
                url: baseUrl,
                logo: {
                  "@type": "ImageObject",
                  url: `${baseUrl}/icon.png`,
                },
              },
            }),
          }}
        />
      </Head>

      <Wrapper>
        <Title>{formattedCategory}</Title>
        <SubIntro>{getCategoryIntro(category)}</SubIntro>

        <Grid>
          {articles.map((a, i) => (
            <ArticleCard
              key={a.id}
              id={a.id}
              category={a.category}
              title={a.title}
              image_url={a.image_url}
              created_at={a.created_at}
              index={i}
            />
          ))}
        </Grid>

        {hasMore && (
          <LoadMore
            onClick={() =>
              (window.location.href = `/${category}?page=${page + 1}`)
            }
          >
            More ↓
          </LoadMore>
        )}
      </Wrapper>
    </>
  );
}

/* === Kategori-intro === */
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
  };
  return intros[category?.toLowerCase()] || "- Hot off the wire";
}
