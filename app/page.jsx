// app/page.jsx
import HomeContent from "./HomeContent";
import { supabase } from "@/lib/supabaseClient";
import Script from "next/script";

const PAGE_SIZE = 30;

export const revalidate = 900; // 15 min

// ✅ Next.js 16+: themeColor should live in viewport
export const viewport = {
  themeColor: "#95010e",
  colorScheme: "light",
};

// --------------------
// Utils
// --------------------

// Minimal HTML strip + safety clean for titles used in JSON-LD / metadata
function cleanInlineText(s) {
  return String(s || "")
    .replace(/&lt;\/?[^&]+&gt;/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

// Escape single quotes for PostgREST "or(...)" filter strings
function escapePostgrestOrLike(s) {
  return String(s || "").replace(/'/g, "''");
}

// --------------------
// ✅ SEO metadata (Home)
// - Uses LOCAL PNG OM image (per your requirement)
// - No twitter account needed; no twitter:site
// - Canonical is absolute and stable
// --------------------
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const url = `${baseUrl}/`;

  const title = "CurioWire — All about curiosities";
  const description =
    "Fresh, short curiosities in science, history, nature, technology and more — published daily";

  // ✅ Use local PNG for shares on ALL pages
  const omImageUrl = `${baseUrl}/OMImage.png`;

  return {
    title: { absolute: title },
    description,

    // ✅ small extra polish (adds meta name="application-name")
    applicationName: "CurioWire",

    alternates: { canonical: url },

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
      title,
      description,
      url,
      siteName: "CurioWire",
      images: [
        {
          url: omImageUrl,
          width: 1200,
          height: 630,
          alt: "CurioWire",
        },
      ],
    },

    // ✅ Harmless even without a Twitter account; helps link previews on X
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: omImageUrl,
          alt: "CurioWire",
        },
      ],
    },
  };
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
  // "trending" and "random" are client modes, but we still SSR a reasonable feed.
  const ssrSort = sortQ === "wow" ? "wow" : "newest";

  let qy = supabase
    .from("curiosity_cards")
    .select(
      "id, category, title, summary_normalized, image_url, created_at, wow_score, seo_title, seo_description",
    )
    .eq("status", "published");

  // Optional SSR search (keeps SEO coherent for /?q=... URLs too)
  if (q) {
    const safeQ = escapePostgrestOrLike(q);
    qy = qy.or(`title.ilike.%${safeQ}%,summary_normalized.ilike.%${safeQ}%`);
  }

  if (ssrSort === "newest") qy = qy.order("created_at", { ascending: false });

  if (ssrSort === "wow")
    qy = qy
      .order("wow_score", { ascending: false })
      .order("created_at", { ascending: false });

  const { data: cards } = await qy.limit(PAGE_SIZE);

  const list = Array.isArray(cards) ? cards : [];

  // --------------------
  // ✅ Structured data (Home)
  // - Keep WebSite + ItemList
  // - Add @id for stability
  // - Ensure ItemList images are absolute URLs
  // --------------------
  const webSiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: "CurioWire",
    url: baseUrl,
    inLanguage: "en",
    description:
      "Fresh, short curiosities in science, history, nature, technology and more — published daily",
    publisher: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
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
    "@id": `${baseUrl}/#feed`,
    inLanguage: "en",
    name: "CurioWire Feed",
    description: "Latest curiosities on CurioWire.",
    numberOfItems: list.length,
    itemListElement: list.map((a, index) => {
      const safeName = cleanInlineText(a?.seo_title || a?.title);
      const img = String(a?.image_url || "").trim();

      // ✅ Make image absolute; fallback to site icon
      const image =
        img && /^https?:\/\//i.test(img) ? img : `${baseUrl}/icon.png`;

      return {
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/article/${a.id}`,
        name: safeName || "CurioWire curiosity",
        image,
        datePublished: a?.created_at,
      };
    }),
  };

  const allStructuredData = [webSiteData, itemListData];

  return (
    <>
      {/* ✅ Less head pressure: afterInteractive (no practical SEO downside) */}
      <Script
        id="structured-data-home"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(allStructuredData),
        }}
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
