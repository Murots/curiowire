// app/page.jsx
import HomeContent from "./HomeContent";
import { supabase } from "@/lib/supabaseClient";

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

  const image = `${baseUrl}/OGImage.png`;

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
          width: 1200,
          height: 630,
          alt: "CurioWire",
        },
      ],
    },

    // ✅ ufarlig å ha selv om du ikke “bruker twitter”
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
  if (v === "random") return "random";
  if (v === "wow") return "wow";
  return "newest";
}

function normalizeQ(input) {
  return String(input || "")
    .trim()
    .slice(0, 120);
}

// ✅ Robust getter for Next searchParams (object, promise-ish, URLSearchParams-ish)
function getSP(sp, key) {
  if (!sp) return undefined;

  // URLSearchParams-ish (has get())
  try {
    if (typeof sp.get === "function") return sp.get(key) ?? undefined;
  } catch {}

  // Plain object
  try {
    return sp[key];
  } catch {
    return undefined;
  }
}

export default async function HomePage({ searchParams }) {
  const baseUrl = "https://curiowire.com";

  // ✅ Next can hand searchParams as a thenable/proxy — always resolve first
  let spResolved = null;
  try {
    spResolved = await Promise.resolve(searchParams);
  } catch {
    spResolved = null;
  }

  // ✅ IMPORTANT:
  // Home route "/" should NOT be a category page.
  // Category is represented by clean paths like "/science".
  // Therefore we ignore searchParams.category here on purpose.
  const categoryQ = "all";

  const sortQ = normalizeSort(getSP(spResolved, "sort"));
  const q = normalizeQ(getSP(spResolved, "q"));

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

  // Optional SSR search (keeps SEO coherent for search result URLs too)
  if (q) {
    // Note: PostgREST "or" filter string. Keep it tight (no spaces).
    // Escape single quotes to avoid breaking the filter string.
    const safeQ = q.replace(/'/g, "''");
    qy = qy.or(`title.ilike.%${safeQ}%,summary_normalized.ilike.%${safeQ}%`);
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
      {/* ✅ Plain script tag => reliably removed on navigation (no sticky head JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(allStructuredData) }}
      />

      {/* ✅ SSR feed first, then client continues */}
      <HomeContent
        initialCards={list}
        initialQuery={{
          category: categoryQ, // always "all" on "/"
          sort: sortQ,
          q,
        }}
      />
    </>
  );
}
