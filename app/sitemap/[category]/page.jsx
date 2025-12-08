// // === app/sitemap/[category]/page.jsx ===
// // 🧭 Dynamic Sitemap per Category — CurioWire
// import Script from "next/script";
// import { supabase } from "@/lib/supabaseClient";
// import SitemapCategoryContent from "./SitemapCategoryContent";

// /* === 🧠 SERVER-SIDE METADATA (SEO) === */
// export async function generateMetadata({ params, searchParams }) {
//   const { category } = params;
//   const page = parseInt(searchParams?.page || "1", 10);
//   const baseUrl = "https://curiowire.com";

//   const formattedCategory =
//     category.charAt(0).toUpperCase() + category.slice(1);
//   const canonicalUrl =
//     page > 1
//       ? `${baseUrl}/sitemap/${category}?page=${page}`
//       : `${baseUrl}/sitemap/${category}`;
//   const description = `All ${formattedCategory.toLowerCase()} stories published on CurioWire — dynamically updated sitemap.`;

//   return {
//     title: `${formattedCategory} Sitemap — CurioWire`,
//     description,
//     alternates: { canonical: canonicalUrl },
//     openGraph: {
//       type: "website",
//       title: `${formattedCategory} Sitemap — CurioWire`,
//       description,
//       url: canonicalUrl,
//       siteName: "CurioWire",
//       images: [`${baseUrl}/icon.png`],
//     },
//     twitter: {
//       card: "summary_large_image",
//       title: `${formattedCategory} Sitemap — CurioWire`,
//       description,
//       images: [`${baseUrl}/icon.png`],
//     },
//     other: {
//       robots: page > 1 ? "noindex,follow" : "index,follow",
//       "theme-color": "#95010e",
//     },
//   };
// }

// /* === 🧩 PAGE COMPONENT === */
// export default async function SitemapCategoryPage({ params, searchParams }) {
//   const { category } = params;
//   const page = parseInt(searchParams?.page || "1", 10);
//   const baseUrl = "https://curiowire.com";

//   // Hent artikler fra Supabase
//   const { data: articles, count } = await supabase
//     .from("articles")
//     .select("id, title, created_at", { count: "exact" })
//     .eq("category", category)
//     .order("created_at", { ascending: false })
//     .limit(20);

//   const formattedCategory =
//     category.charAt(0).toUpperCase() + category.slice(1);
//   const canonicalUrl =
//     page > 1
//       ? `${baseUrl}/sitemap/${category}?page=${page}`
//       : `${baseUrl}/sitemap/${category}`;

//   // ✅ Strukturerte data for ItemList
//   const structuredData = {
//     "@context": "https://schema.org",
//     "@type": "CollectionPage",
//     name: `${formattedCategory} Articles — CurioWire Sitemap`,
//     description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire — dynamically updated sitemap.`,
//     url: canonicalUrl,
//     publisher: {
//       "@type": "Organization",
//       name: "CurioWire",
//       url: baseUrl,
//       logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
//     },
//     mainEntity: {
//       "@type": "ItemList",
//       numberOfItems: count || 0,
//       itemListOrder: "Descending",
//       itemListElement: (articles || []).map((a, i) => ({
//         "@type": "ListItem",
//         position: i + 1,
//         url: `${baseUrl}/article/${a.id}`,
//         name: a.title,
//         datePublished: a.created_at,
//       })),
//     },
//   };

//   return (
//     <>
//       {/* ✅ Structured data visible for Google */}
//       <Script
//         id={`structured-data-sitemap-${category}`}
//         type="application/ld+json"
//         strategy="beforeInteractive"
//         dangerouslySetInnerHTML={{
//           __html: JSON.stringify(structuredData),
//         }}
//       />

//       <SitemapCategoryContent />
//     </>
//   );
// }
// === app/sitemap/[category]/page.jsx ===
// 🧭 Dynamic Sitemap per Category — CurioWire

import Script from "next/script";
import { supabaseServer } from "@/lib/supabaseServer"; // ← viktig
import SitemapCategoryContent from "./SitemapCategoryContent";

const PAGE_SIZE = 20;

/* === 🧠 SERVER-SIDE METADATA (SEO) === */
export async function generateMetadata({ params, searchParams }) {
  const { category } = params;
  const page = parseInt(searchParams?.page || "1", 10);
  const baseUrl = "https://curiowire.com";

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);

  const canonicalUrl =
    page > 1
      ? `${baseUrl}/sitemap/${category}?page=${page}`
      : `${baseUrl}/sitemap/${category}`;

  return {
    title: `${formattedCategory} Sitemap — CurioWire`,
    description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire — dynamically updated sitemap.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title: `${formattedCategory} Sitemap — CurioWire`,
      description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire.`,
      siteName: "CurioWire",
      url: canonicalUrl,
      images: [`${baseUrl}/icon.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${formattedCategory} Sitemap — CurioWire`,
      description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire.`,
      images: [`${baseUrl}/icon.png`],
    },
    other: {
      robots: page > 1 ? "noindex,follow" : "index,follow",
      "theme-color": "#95010e",
    },
  };
}

/* === 🧩 SERVER COMPONENT === */
export default async function SitemapCategoryPage({ params, searchParams }) {
  const { category } = params;
  const page = parseInt(searchParams?.page || "1", 10);

  const baseUrl = "https://curiowire.com";

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  // Use server-safe supabase client
  const supabase = supabaseServer();

  // --- SAFE FETCH ---
  const result = await supabase
    .from("articles")
    .select("id, title, created_at", { count: "exact" })
    .eq("category", category)
    .order("created_at", { ascending: false })
    .range(start, end);

  // Prevent Supabase null crash
  const articles = Array.isArray(result.data) ? result.data : [];
  const totalCount = typeof result.count === "number" ? result.count : 0;

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);

  const canonicalUrl =
    page > 1
      ? `${baseUrl}/sitemap/${category}?page=${page}`
      : `${baseUrl}/sitemap/${category}`;

  // --- STRUCTURED DATA (JSON-LD CRASH SAFE) ---
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${formattedCategory} Articles — CurioWire Sitemap`,
    description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire.`,
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
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalCount,
      itemListOrder: "Descending",
      itemListElement: articles.map((a, i) => ({
        "@type": "ListItem",
        position: start + i + 1,
        url: `${baseUrl}/article/${a.id}`,
        name: a.title || "Untitled",
        datePublished: a.created_at || null,
      })),
    },
  };

  return (
    <>
      {/* Structured data */}
      <Script
        id={`structured-data-sitemap-${category}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Client-side paginator */}
      <SitemapCategoryContent />
    </>
  );
}
