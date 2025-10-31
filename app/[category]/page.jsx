// "use client";

// import React, { Suspense } from "react";
// import CategoryContent from "./CategoryContent";

// export default function CategoryPageWrapper() {
//   return (
//     <Suspense fallback={<div>Loading category...</div>}>
//       <CategoryContent />
//     </Suspense>
//   );
// }

// app/[category]/page.jsx
import { supabase } from "@/lib/supabaseClient";
import CategoryContent from "./CategoryContent";

/* === 🧠 SERVER-SIDE METADATA (SEO + JSON-LD for Discover & Top Stories) === */
export async function generateMetadata({ params, searchParams }) {
  const { category } = params;
  const page = parseInt(searchParams?.page || "1", 10);
  const baseUrl = "https://curiowire.com";

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);
  const canonicalUrl =
    page > 1 ? `${baseUrl}/${category}?page=${page}` : `${baseUrl}/${category}`;
  const description = `Discover ${formattedCategory.toLowerCase()} news, hidden histories, and AI-curated stories on CurioWire — updated daily.`;

  // === 1️⃣ Hent artikler fra Supabase ===
  const { data: articles, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(10);

  /* === 🧩 JSON-LD BLOKKER === */

  // 🌍 A. Kolleksjonssiden
  const collectionData = {
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
  };

  // 📜 B. ItemList for artiklene
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${formattedCategory} Articles`,
    description: `AI-curated ${formattedCategory.toLowerCase()} curiosities and insights — latest stories from CurioWire.`,
    numberOfItems: count || articles?.length || 0,
    itemListOrder: "Descending",
    itemListElement: (articles || []).map((a, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/article/${a.id}`,
      name: a.title,
      image: a.image_url,
      datePublished: a.created_at,
      dateModified: a.updated_at || a.created_at,
    })),
  };

  // 📰 C. Første 3 artikler som egne NewsArticle-objekter (for Discover)
  const newsArticlesData = (articles || []).slice(0, 3).map((a) => ({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description:
      a.excerpt?.slice(0, 180) ||
      `Explore ${formattedCategory.toLowerCase()} stories and curiosities on CurioWire.`,
    image: [a.image_url || `${baseUrl}/icon.png`],
    articleSection: formattedCategory,
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

  // Kombiner alt i ett array
  const allStructuredData = JSON.stringify([
    collectionData,
    itemListData,
    ...newsArticlesData,
  ]);

  /* === 🧭 Metadata for head === */
  return {
    title: `${formattedCategory} — CurioWire`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title: `${formattedCategory} — CurioWire`,
      description,
      url: canonicalUrl,
      siteName: "CurioWire",
      images: [`${baseUrl}/icon.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${formattedCategory} — CurioWire`,
      description,
      images: [`${baseUrl}/icon.png`],
    },
    other: {
      robots: page > 1 ? "noindex,follow" : "index,follow",
      "article:section": formattedCategory,
      "theme-color": "#95010e",
    },
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: allStructuredData,
      },
    ],
  };
}

/* === 📰 SERVER COMPONENT === */
export default function CategoryPageWrapper() {
  return <CategoryContent />;
}
