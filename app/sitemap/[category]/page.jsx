// === app/sitemap/[category]/page.jsx ===
// 🧭 Dynamic Sitemap per Category — CurioWire
import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";
import SitemapCategoryContent from "./SitemapCategoryContent";

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
  const description = `All ${formattedCategory.toLowerCase()} stories published on CurioWire — dynamically updated sitemap.`;

  return {
    title: `${formattedCategory} Sitemap — CurioWire`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title: `${formattedCategory} Sitemap — CurioWire`,
      description,
      url: canonicalUrl,
      siteName: "CurioWire",
      images: [`${baseUrl}/icon.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${formattedCategory} Sitemap — CurioWire`,
      description,
      images: [`${baseUrl}/icon.png`],
    },
    other: {
      robots: page > 1 ? "noindex,follow" : "index,follow",
      "theme-color": "#95010e",
    },
  };
}

/* === 🧩 PAGE COMPONENT === */
export default async function SitemapCategoryPage({ params, searchParams }) {
  const { category } = params;
  const page = parseInt(searchParams?.page || "1", 10);
  const baseUrl = "https://curiowire.com";

  // Hent artikler fra Supabase
  const { data: articles, count } = await supabase
    .from("articles")
    .select("id, title, created_at", { count: "exact" })
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(20);

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);
  const canonicalUrl =
    page > 1
      ? `${baseUrl}/sitemap/${category}?page=${page}`
      : `${baseUrl}/sitemap/${category}`;

  // ✅ Strukturerte data for ItemList
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${formattedCategory} Articles — CurioWire Sitemap`,
    description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire — dynamically updated sitemap.`,
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: count || 0,
      itemListOrder: "Descending",
      itemListElement: (articles || []).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${baseUrl}/article/${a.id}`,
        name: a.title,
        datePublished: a.created_at,
      })),
    },
  };

  return (
    <>
      {/* ✅ Structured data visible for Google */}
      <Script
        id={`structured-data-sitemap-${category}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <SitemapCategoryContent />
    </>
  );
}
