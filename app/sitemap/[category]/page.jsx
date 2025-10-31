// app/sitemap/[category]/page.jsx
import { supabase } from "@/lib/supabaseClient";
import SitemapCategoryContent from "./SitemapCategoryContent";

/* === 🧠 SERVER-SIDE METADATA FOR EACH CATEGORY === */
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

  // Tell antall artikler
  const { data: articles, count } = await supabase
    .from("articles")
    .select("id, title, created_at", { count: "exact" })
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(20);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${formattedCategory} Articles — CurioWire Sitemap`,
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
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  };
}

export default function SitemapCategoryPage() {
  return <SitemapCategoryContent />;
}
