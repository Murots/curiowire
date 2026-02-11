// 🧭 Dynamic Sitemap per Category — CurioWire (PERFECT: no double-fetch on page 1)

import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";
import SitemapCategoryContent from "./SitemapCategoryContent";

const PAGE_SIZE = 20;

// =======================================
// 🚨 Next.js 14 NOTE:
// params/searchParams are Promises in RSC.
// Derfor må vi alltid bruke `await params`.
// =======================================

// Minimal HTML strip + safety clean for JSON-LD / metadata
function cleanInlineText(s) {
  return String(s || "")
    .replace(/&lt;\/?[^&]+&gt;/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* === 🧠 SERVER-SIDE METADATA (SEO) === */
export async function generateMetadata(props) {
  const { params, searchParams } = props;

  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const category = resolvedParams?.category;
  const page = parseInt(resolvedSearch?.page || "1", 10);

  if (!category) {
    return {
      title: "Invalid Sitemap Category — CurioWire",
      robots: "noindex",
    };
  }

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

/* === 🧩 PAGE COMPONENT (SERVER) === */
export default async function SitemapCategoryPage(props) {
  const { params, searchParams } = props;

  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const category = resolvedParams?.category;
  const page = parseInt(resolvedSearch?.page || "1", 10);

  const baseUrl = "https://curiowire.com";

  if (!category) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <h1>Invalid sitemap category.</h1>
      </div>
    );
  }

  // ✅ We only SSR-fetch the first page to avoid double-fetch.
  // If user lands directly on page>1, we skip SSR fetch (client will fetch).
  let initialCards = [];
  let initialCount = 0;

  if (page === 1) {
    const { data, count, error } = await supabase
      .from("curiosity_cards")
      .select("id, title, created_at", { count: "exact" })
      .eq("status", "published")
      .eq("category", category)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (error) {
      console.error("❌ Supabase error:", error);
    } else {
      initialCards = Array.isArray(data) ? data : [];
      initialCount = Number(count) || 0;
    }
  }

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);

  const canonicalUrl =
    page > 1
      ? `${baseUrl}/sitemap/${category}?page=${page}`
      : `${baseUrl}/sitemap/${category}`;

  // ✅ Structured Data should match what is visible.
  // - For page 1: use SSR-fetched initialCards
  // - For page > 1: emit a lightweight CollectionPage without itemListElement
  //   (client will render list; we avoid embedding mismatched items)
  const structuredData =
    page === 1
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${formattedCategory} Articles — CurioWire Sitemap`,
          description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire.`,
          url: canonicalUrl,
          publisher: {
            "@type": "Organization",
            name: "CurioWire",
            url: baseUrl,
            logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
          },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: initialCount || 0,
            itemListOrder: "Descending",
            itemListElement: (initialCards || []).map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${baseUrl}/article/${a.id}`,
              name: cleanInlineText(a.title),
              datePublished: a.created_at,
            })),
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${formattedCategory} Articles — CurioWire Sitemap`,
          description: `All ${formattedCategory.toLowerCase()} stories published on CurioWire.`,
          url: canonicalUrl,
          publisher: {
            "@type": "Organization",
            name: "CurioWire",
            url: baseUrl,
            logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
          },
        };

  return (
    <>
      <Script
        id={`structured-data-sitemap-${category}-${page}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <SitemapCategoryContent
        pageSize={PAGE_SIZE}
        initialCards={initialCards}
        initialCount={initialCount}
      />
    </>
  );
}
