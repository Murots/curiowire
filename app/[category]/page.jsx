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

/* === 🧠 SERVER-SIDE METADATA (SEO-optimalisert) === */
export async function generateMetadata({ params, searchParams }) {
  const { category } = params;
  const page = parseInt(searchParams?.page || "1", 10);
  const baseUrl = "https://curiowire.com";

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);
  const canonicalUrl =
    page > 1 ? `${baseUrl}/${category}?page=${page}` : `${baseUrl}/${category}`;
  const description = `Discover ${formattedCategory.toLowerCase()} news, hidden histories, and AI-curated stories on CurioWire — updated daily.`;

  // Hent antall artikler (for strukturert data)
  const { count } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("category", category);

  // === 🧩 STRUCTURED DATA ===
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
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: count || 0,
      itemListOrder: "Descending",
      itemListElement: [],
    },
  };

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
    // 🧠 JSON-LD direkte i <head>
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  };
}

/* === 📰 SERVER COMPONENT === */
export default function CategoryPageWrapper() {
  return <CategoryContent />;
}
