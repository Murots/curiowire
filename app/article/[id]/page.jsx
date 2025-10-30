"use client";

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ArticlePage from "@/components/ArticlePage/ArticlePage";

export default function Page() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [nextArticle, setNextArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticleAndNext = async () => {
      // 📰 1️⃣ Hent artikkel
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("❌ Error fetching article:", error?.message);
        setLoading(false);
        return;
      }

      setArticle(data);

      // ➡️ 2️⃣ Finn neste artikkel i samme kategori (nyere)
      const { data: nextData } = await supabase
        .from("articles")
        .select("id, title")
        .eq("category", data.category)
        .gt("created_at", data.created_at)
        .order("created_at", { ascending: true })
        .limit(1);

      if (nextData && nextData.length > 0) {
        setNextArticle(nextData[0]);
      } else {
        // 🔁 3️⃣ Ingen nyere → hent første (eldste)
        const { data: first } = await supabase
          .from("articles")
          .select("id, title")
          .eq("category", data.category)
          .order("created_at", { ascending: true })
          .limit(1);
        if (first && first.length > 0) setNextArticle(first[0]);
      }

      setLoading(false);
    };

    fetchArticleAndNext();
  }, [id]);

  if (loading) return <p style={{ padding: "40px" }}>Loading article…</p>;
  if (!article) return <p style={{ padding: "40px" }}>Article not found.</p>;

  // === SEO Metadata ===
  const baseUrl = "https://curiowire.com";
  const url = `${baseUrl}/article/${id}`;
  const nextUrl = nextArticle ? `${baseUrl}/article/${nextArticle.id}` : null;
  const title = article.title || "Untitled — CurioWire";
  const description =
    article.excerpt?.slice(0, 160) ||
    "Explore unique stories and AI-generated curiosities on CurioWire.";
  const image = article.image_url || `${baseUrl}/icon.png`;
  const category = article.category || "General";

  const isIncomplete =
    !article.title ||
    !article.excerpt ||
    article.excerpt.length < 50 ||
    article.title.toLowerCase().includes("test");

  // === 🧩 STRUCTURED DATA ===
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    image: [image],
    articleSection: category,
    author: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  // === 🧭 BreadcrumbList (Home › Category › Article) ===
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category,
        item: `${baseUrl}/${category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: url,
      },
    ],
  };

  return (
    <>
      <Head>
        {/* 🎯 Dynamic SEO */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content={`${category}, CurioWire, AI journalism, curiosity`}
        />
        <link rel="canonical" href={url} />
        {nextUrl && <link rel="next" href={nextUrl} />}
        {isIncomplete && <meta name="robots" content="noindex,follow" />}

        {/* 📱 Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="CurioWire" />

        {/* 🐦 Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

        {/* 📰 Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([structuredData, breadcrumbList]),
          }}
        />
      </Head>

      <ArticlePage article={article} nextArticle={nextArticle} />
    </>
  );
}
