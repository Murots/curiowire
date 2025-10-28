// "use client";

// import React, { useEffect, useState } from "react";
// import { useParams } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
// import ArticleCard from "@/components/ArticleCard/ArticleCard";
// import {
//   Wrapper,
//   Title,
//   Grid,
//   Loader,
//   SubIntro,
//   LoadMore,
// } from "./page.styles";

// export default function CategoryPage() {
//   const { category } = useParams();
//   const [articles, setArticles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(0);
//   const [hasMore, setHasMore] = useState(true);
//   const PAGE_SIZE = 15;

//   // === Hent artikler med paginering ===
//   const fetchCategoryArticles = async (pageIndex = 0) => {
//     const from = pageIndex * PAGE_SIZE;
//     const to = from + PAGE_SIZE - 1;

//     const { data, error } = await supabase
//       .from("articles")
//       .select("*")
//       .eq("category", category)
//       .order("created_at", { ascending: false })
//       .range(from, to);

//     if (error) {
//       console.error("❌ Error fetching articles:", error.message);
//       return [];
//     }

//     return data || [];
//   };

//   // === Første lasting ===
//   useEffect(() => {
//     if (!category) return;

//     const loadInitial = async () => {
//       setLoading(true);
//       const initial = await fetchCategoryArticles(0);
//       setArticles(initial);
//       setHasMore(initial.length === PAGE_SIZE);
//       setPage(0);
//       setLoading(false);
//     };

//     loadInitial();
//   }, [category]);

//   // === Hent flere artikler ===
//   const loadMore = async () => {
//     const nextPage = page + 1;
//     const newArticles = await fetchCategoryArticles(nextPage);

//     if (newArticles.length < PAGE_SIZE) setHasMore(false);
//     setArticles((prev) => [...prev, ...newArticles]);
//     setPage(nextPage);
//   };

//   if (loading) return <Loader>Fetching stories from {category}...</Loader>;

//   return (
//     <Wrapper>
//       <Title>{category.charAt(0).toUpperCase() + category.slice(1)}</Title>
//       <SubIntro>{getCategoryIntro(category)}</SubIntro>

//       <Grid>
//         {articles.map((a, i) => (
//           <ArticleCard
//             key={a.id}
//             id={a.id}
//             category={a.category}
//             title={a.title}
//             image_url={a.image_url}
//             created_at={a.created_at}
//             index={i}
//           />
//         ))}
//       </Grid>

//       {hasMore && <LoadMore onClick={loadMore}>More ↓</LoadMore>}
//     </Wrapper>
//   );
// }

// /* === Hjelpefunksjon for intro === */
// function getCategoryIntro(category) {
//   const intros = {
//     science: "🧪 Echoes from the lab",
//     technology: "⚙️ Traces from the dawn of innovation",
//     space: "🚀 Whispers from the silent cosmos",
//     nature: "🌿 Stories carved by wind and water",
//     health: "🫀 Secrets of the human vessel",
//     history: "🏺 Recovered from the dusty archives",
//     culture: "🎭 Fragments from the heart of civilization",
//     sports: "🏆 Legends born in the arena",
//     products: "🛍️ Artifacts of human ingenuity",
//     world: "🌍 Records from the halls of power",
//   };
//   return intros[category?.toLowerCase()] || "- Hot off the wire";
// }

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
        {/* 🧭 SEO Metadata */}
        <title>{`${formattedCategory} — CurioWire`}</title>
        <meta
          name="description"
          content={`Explore the latest ${formattedCategory.toLowerCase()} stories on CurioWire — ${description}`}
        />
        <meta
          name="keywords"
          content={`${formattedCategory}, CurioWire, AI journalism, curiosities`}
        />
        <link rel="canonical" href={canonicalUrl} />
        {prevUrl && <link rel="prev" href={prevUrl} />}
        {nextUrl && <link rel="next" href={nextUrl} />}

        {/* 🚫 Hindre duplikatindeksering for side 2+ */}
        {page > 1 && <meta name="robots" content="noindex,follow" />}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`${formattedCategory} — CurioWire`}
        />
        <meta
          property="og:description"
          content={`Discover ${formattedCategory.toLowerCase()} insights and curiosities on CurioWire.`}
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${baseUrl}/icon.png`} />

        {/* Strukturert data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
