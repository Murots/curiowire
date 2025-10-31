// "use client";
// export const runtime = "nodejs";

// import React, { useEffect, useState } from "react";
// import { supabase } from "@/lib/supabaseClient";
// import Head from "next/head";
// import ArticleCard from "@/components/ArticleCard/ArticleCard";
// import { Wrapper, Headline, Grid, Loader } from "./page.styles";

// export default function HomePage() {
//   const [articles, setArticles] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchWeeklyTopArticles = async () => {
//       try {
//         // === 1️⃣ Hent ukens mest leste artikler fra viewet ===
//         const { data, error } = await supabase
//           .from("weekly_top_articles")
//           .select("*")
//           .order("view_count", { ascending: false })
//           .limit(10);

//         if (error) {
//           console.error(
//             "❌ Error fetching weekly top articles:",
//             error.message
//           );
//           setArticles([]);
//         } else if (data && data.length > 0) {
//           setArticles(data);
//         } else {
//           // === 2️⃣ Fallback: hent nyeste artikler hvis ingen visninger denne uken ===
//           const { data: fallback, error: fallbackError } = await supabase
//             .from("articles")
//             .select("*")
//             .order("created_at", { ascending: false })
//             .limit(10);

//           if (fallbackError) {
//             console.error(
//               "❌ Error fetching fallback articles:",
//               fallbackError.message
//             );
//             setArticles([]);
//           } else {
//             setArticles(fallback || []);
//           }
//         }
//       } catch (err) {
//         console.error("⚠️ Unexpected error:", err);
//         setArticles([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchWeeklyTopArticles();
//   }, []);

//   if (loading) return <Loader>Fetching this week’s top curiosities...</Loader>;

//   return (
//     <>
//       <Head>
//         {/* 🧭 Primary SEO Metadata */}
//         <title>CurioWire — AI-Generated Stories & Hidden Histories</title>
//         <meta
//           name="description"
//           content="Explore remarkable, AI-generated stories about science, technology, nature, space, history, and culture. CurioWire uncovers hidden histories and curiosities from the human record — updated daily."
//         />
//         <meta
//           name="keywords"
//           content="AI journalism, curiosities, science news, history stories, cultural insights, hidden histories, technology, innovation"
//         />
//         <meta name="author" content="CurioWire" />
//         <meta property="article:section" content="Home" />
//         <link rel="canonical" href="https://curiowire.com/" />

//         {/* 🌍 Open Graph (Facebook, LinkedIn) */}
//         <meta property="og:type" content="website" />
//         <meta property="og:site_name" content="CurioWire" />
//         <meta
//           property="og:title"
//           content="CurioWire — AI-Generated Stories & Hidden Histories"
//         />
//         <meta
//           property="og:description"
//           content="AI-curated curiosities, hidden histories, and digital storytelling. Explore a new kind of journalism where algorithms meet human wonder."
//         />
//         <meta property="og:url" content="https://curiowire.com/" />
//         <meta property="og:image" content="https://curiowire.com/icon.png" />

//         {/* 🐦 Twitter Card */}
//         <meta name="twitter:card" content="summary_large_image" />
//         <meta name="twitter:site" content="@curiowire" />
//         <meta
//           name="twitter:title"
//           content="CurioWire — AI-Generated Stories & Hidden Histories"
//         />
//         <meta
//           name="twitter:description"
//           content="Explore AI-generated stories and human curiosities — science, history, culture, and more."
//         />
//         <meta name="twitter:image" content="https://curiowire.com/icon.png" />

//         {/* 📱 Favicon & Manifest */}
//         <link rel="icon" href="/favicon.ico" />
//         <link rel="manifest" href="/manifest.json" />

//         {/* 🧠 Structured Data (JSON-LD) */}
//         <script
//           type="application/ld+json"
//           dangerouslySetInnerHTML={{
//             __html: JSON.stringify({
//               "@context": "https://schema.org",
//               "@type": "WebSite",
//               name: "CurioWire",
//               url: "https://curiowire.com/",
//               description:
//                 "AI-generated stories and curiosities exploring science, history, nature, culture, and technology — updated daily.",
//               publisher: {
//                 "@type": "Organization",
//                 name: "CurioWire",
//                 url: "https://curiowire.com/",
//                 logo: {
//                   "@type": "ImageObject",
//                   url: "https://curiowire.com/icon.png",
//                 },
//               },
//               potentialAction: {
//                 "@type": "SearchAction",
//                 target: "https://curiowire.com/search?q={search_term_string}",
//                 "query-input": "required name=search_term_string",
//               },
//               mainEntity: {
//                 "@type": "ItemList",
//                 itemListElement: articles.map((a, index) => ({
//                   "@type": "ListItem",
//                   position: index + 1,
//                   url: `https://curiowire.com/article/${a.id}`,
//                   name: a.title,
//                   image: a.image_url,
//                   datePublished: a.created_at,
//                 })),
//               },
//             }),
//           }}
//         />
//       </Head>

//       <Wrapper>
//         <Headline>🔥Trending curiosities</Headline>

//         <Grid>
//           {articles.map((a, i) => (
//             <ArticleCard
//               key={a.id}
//               id={a.id}
//               category={a.category}
//               title={a.title}
//               excerpt={a.excerpt}
//               image_url={a.image_url}
//               created_at={a.created_at}
//               index={i}
//             />
//           ))}
//         </Grid>
//       </Wrapper>
//     </>
//   );
// }

// app/page.jsx
import { supabase } from "@/lib/supabaseClient";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import { Wrapper, Headline, Grid, Loader } from "./page.styles";

/* === 🧠 SERVER-SIDE METADATA (maksimal SEO, Discover + Top Stories) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const title = "CurioWire — AI-Generated Stories & Hidden Histories";
  const description =
    "Explore remarkable, AI-generated stories about science, technology, nature, space, history, and culture. CurioWire uncovers hidden histories and curiosities from the human record — updated daily.";

  // === 1️⃣ Hent topp 10 artikler for JSON-LD ===
  let { data: articles, error } = await supabase
    .from("weekly_top_articles")
    .select("*")
    .order("view_count", { ascending: false })
    .limit(10);

  // === 2️⃣ Fallback hvis tomt ===
  if (error || !articles || articles.length === 0) {
    const { data: fallback } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    articles = fallback || [];
  }

  /* === 🧩 JSON-LD BLOKKER === */

  // 🌐 A. Grunnleggende nettsted
  const webSiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CurioWire",
    url: baseUrl,
    description,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  // 🧾 B. Liste over trendartikler
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Trending Curiosities — CurioWire",
    description:
      "The top AI-generated stories trending this week across science, history, nature, and technology.",
    numberOfItems: articles.length,
    itemListElement: articles.map((a, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/article/${a.id}`,
      name: a.title,
      image: a.image_url,
      datePublished: a.created_at,
      dateModified: a.updated_at || a.created_at,
    })),
  };

  // 📰 C. De 3 første artiklene som egne NewsArticle-blokker (for Discover)
  const newsArticlesData = articles.slice(0, 3).map((a) => ({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description:
      a.excerpt?.slice(0, 180) ||
      "Explore this week's trending AI-generated story on CurioWire.",
    image: [a.image_url || `${baseUrl}/icon.png`],
    articleSection: a.category || "General",
    url: `${baseUrl}/article/${a.id}`,
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
    datePublished: a.created_at,
    dateModified: a.updated_at || a.created_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/article/${a.id}`,
    },
  }));

  const allStructuredData = JSON.stringify([
    webSiteData,
    itemListData,
    ...newsArticlesData,
  ]);

  /* === 🔍 METADATA === */
  return {
    title,
    description,
    alternates: { canonical: baseUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: baseUrl,
      siteName: "CurioWire",
      images: [`${baseUrl}/icon.png`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/icon.png`],
    },
    other: {
      robots: "index,follow",
      "theme-color": "#95010e",
    },
    // 🧠 JSON-LD direkte i <head>
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: allStructuredData,
      },
    ],
  };
}

/* === 📰 SERVER COMPONENT === */
export default async function HomePage() {
  // Hent toppartikler (ukens mest leste)
  let { data: articles, error } = await supabase
    .from("weekly_top_articles")
    .select("*")
    .order("view_count", { ascending: false })
    .limit(10);

  if (error || !articles || articles.length === 0) {
    const { data: fallback } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    articles = fallback || [];
  }

  if (!articles || articles.length === 0)
    return <Loader>Fetching this week’s top curiosities...</Loader>;

  return (
    <Wrapper>
      <Headline>🔥 Trending curiosities</Headline>

      <Grid>
        {articles.map((a, i) => (
          <ArticleCard
            key={a.id}
            id={a.id}
            category={a.category}
            title={a.title}
            excerpt={a.excerpt}
            image_url={a.image_url}
            created_at={a.created_at}
            index={i}
          />
        ))}
      </Grid>
    </Wrapper>
  );
}
