// app/page.jsx
import HomeContent from "./HomeContent";
import { supabase } from "@/lib/supabaseClient";
import Script from "next/script";

const PAGE_SIZE = 30;

export const revalidate = 900; // 15 min

// ✅ Next.js 16: themeColor must be in `viewport` (not metadata)
export const viewport = {
  themeColor: "#95010e",
};

// Minimal HTML strip + safety clean for titles used in JSON-LD / metadata
function cleanInlineText(s) {
  return String(s || "")
    .replace(/&lt;\/?[^&]+&gt;/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";

  const absoluteTitle = "CurioWire — All about curiosities";

  const description =
    "Fresh, short curiosities in science, history, nature, technology and more — published daily";

  const image = `${baseUrl}/icon.png`;

  return {
    title: { absolute: absoluteTitle },
    description,

    alternates: {
      canonical: baseUrl,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },

    openGraph: {
      type: "website",
      locale: "en_US",
      title: absoluteTitle,
      description,
      url: baseUrl,
      siteName: "CurioWire",
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: "CurioWire Logo",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: absoluteTitle,
      description,
      images: [image],
    },
  };
}

function normalizeSort(input) {
  const v = String(input || "newest").toLowerCase();
  if (v === "trending") return "trending";
  if (v === "wow") return "wow";
  return "newest";
}

function normalizeCategory(input) {
  const v = String(input || "all").toLowerCase();
  const allowed = new Set([
    "all",
    "science",
    "technology",
    "space",
    "nature",
    "health",
    "history",
    "culture",
    "sports",
    "products",
    "world",
    "crime",
    "mystery",
  ]);
  return allowed.has(v) ? v : "all";
}

function normalizeQ(input) {
  return String(input || "")
    .trim()
    .slice(0, 120);
}

export default async function HomePage({ searchParams }) {
  const baseUrl = "https://curiowire.com";

  const categoryQ = normalizeCategory(searchParams?.category);
  const sortQ = normalizeSort(searchParams?.sort);
  const q = normalizeQ(searchParams?.q);

  // We SSR "newest" and "wow" with DB ordering.
  // "trending" is computed client-side (via /api/trending), but we still SSR a
  // reasonable feed (newest), and the client will replace it when trending loads.
  const ssrSort = sortQ === "wow" ? "wow" : "newest";

  let qy = supabase
    .from("curiosity_cards")
    .select(
      "id, category, title, summary_normalized, image_url, created_at, wow_score, seo_title, seo_description",
    )
    .eq("status", "published");

  if (categoryQ !== "all") qy = qy.eq("category", categoryQ);

  // Optional SSR search (keeps SEO coherent for search result URLs too)
  if (q) {
    // Keep it simple server-side (no LIKE escaping needed beyond trimming/limit)
    // Note: PostgREST "or" filter string. Keep it tight (no spaces).
    qy = qy.or(`title.ilike.%${q}%,summary_normalized.ilike.%${q}%`);
  }

  if (ssrSort === "newest") qy = qy.order("created_at", { ascending: false });

  if (ssrSort === "wow")
    qy = qy
      .order("wow_score", { ascending: false })
      .order("created_at", { ascending: false });

  const { data: cards } = await qy.limit(PAGE_SIZE);

  const list = Array.isArray(cards) ? cards : [];

  const webSiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CurioWire",
    url: baseUrl,
    inLanguage: "en",
    description:
      "Fresh, short curiosities in science, history, nature, technology and more — published daily",
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
        width: 512,
        height: 512,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: "en",
    name: "CurioWire Feed",
    description: "Latest curiosities on CurioWire.",
    numberOfItems: list.length,
    itemListElement: list.map((a, index) => {
      const safeName = cleanInlineText(a?.seo_title || a?.title);
      return {
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/article/${a.id}`,
        name: safeName || "CurioWire curiosity",
        image: a?.image_url || `${baseUrl}/icon.png`,
        datePublished: a?.created_at,
      };
    }),
  };

  const allStructuredData = [webSiteData, itemListData];

  return (
    <>
      <Script
        id="structured-data-home"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(allStructuredData),
        }}
      />

      {/* ✅ Single feed: SSR first, then client continues (no hidden duplicate feed) */}
      <HomeContent
        initialCards={list}
        initialQuery={{
          category: categoryQ,
          sort: sortQ,
          q,
        }}
      />
    </>
  );
}
