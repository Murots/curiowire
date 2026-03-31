// app/[category]/page.jsx
import HomeContent from "../HomeContent";
import { supabaseServer } from "@/lib/supabaseServer";
import Script from "next/script";
import { notFound } from "next/navigation";

const PAGE_SIZE = 30;
export const revalidate = 900;

// ✅ Only allow these exact category paths to exist
export const dynamicParams = false;

// Same categories you use elsewhere (without "all")
const ALLOWED = new Set([
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

export async function generateStaticParams() {
  return Array.from(ALLOWED).map((category) => ({ category }));
}

function normalizeCategory(input) {
  const v = String(input || "").toLowerCase();
  return ALLOWED.has(v) ? v : null;
}

function normalizeSort(input) {
  const v = String(input || "newest").toLowerCase();
  if (v === "trending") return "trending";
  if (v === "random") return "random";
  if (v === "lists") return "lists";
  if (v === "video") return "video";
  if (v === "wow") return "wow";
  return "newest";
}

function normalizeQ(input) {
  return String(input || "")
    .trim()
    .slice(0, 120);
}

// ✅ Robust getter for Next searchParams
function getSP(sp, key) {
  if (!sp) return undefined;

  try {
    if (typeof sp.get === "function") return sp.get(key) ?? undefined;
  } catch {}

  try {
    return sp[key];
  } catch {
    return undefined;
  }
}

// ✅ Next 16 can hand params as promise-ish
async function getCategory(params) {
  const p = await Promise.resolve(params);
  return p?.category;
}

// Minimal HTML strip + safety clean for titles used in JSON-LD / metadata
function cleanInlineText(s) {
  return String(s || "")
    .replace(/&lt;\/?[^&]+&gt;/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePostgrestOrLike(s) {
  return String(s || "").replace(/'/g, "''");
}

function attachLiveVideoToCardRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (Array.isArray(row?.videos)) return row;

    const liveVideo =
      row?.youtube_video_id || row?.youtube_url
        ? {
            youtube_video_id: row.youtube_video_id || null,
            youtube_url: row.youtube_url || null,
            posted_at: row.posted_at || null,
            posted_results: row.posted_results || null,
            status: "posted",
          }
        : null;

    return {
      ...row,
      videos: liveVideo ? [liveVideo] : [],
    };
  });
}

/* === 🧠 SERVER-SIDE METADATA (SEO) === */
export async function generateMetadata({ params, searchParams }) {
  const baseUrl = "https://curiowire.com";

  const rawCategory = await getCategory(params);
  const category = normalizeCategory(rawCategory);
  if (!category) return { robots: { index: false, follow: false } };

  // Resolve searchParams robust
  let spResolved = null;
  try {
    spResolved = await Promise.resolve(searchParams);
  } catch {
    spResolved = null;
  }

  const sortQ = normalizeSort(getSP(spResolved, "sort"));
  const q = normalizeQ(getSP(spResolved, "q"));
  const effectiveQ = q.length >= 3 ? q : "";

  const label = category.charAt(0).toUpperCase() + category.slice(1);

  // ✅ Index only the "clean" category feed page:
  const isCleanCategory = !effectiveQ && sortQ === "newest";

  const title = `CurioWire — ${label} curiosities`;

  const description = effectiveQ
    ? `Search results in ${label} on CurioWire for “${effectiveQ}”.`
    : sortQ === "trending"
      ? `Trending ${label.toLowerCase()} curiosities on CurioWire.`
      : sortQ === "random"
        ? `Random ${label.toLowerCase()} curiosities on CurioWire.`
        : sortQ === "lists"
          ? `${label} list curiosities on CurioWire.`
          : sortQ === "video"
            ? `${label} curiosities with video on CurioWire.`
            : sortQ === "wow"
              ? `Top-rated ${label.toLowerCase()} curiosities on CurioWire.`
              : `Fresh, short ${category} curiosities — published daily.`;

  const canonical = `${baseUrl}/${category}`;

  const image = `${baseUrl}/OMImage.png`;

  return {
    title: { absolute: title },
    description,

    applicationName: "CurioWire",

    alternates: { canonical },

    robots: {
      index: isCleanCategory,
      follow: true,
      googleBot: {
        index: isCleanCategory,
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
      url: canonical,
      siteName: "CurioWire",
      images: [{ url: image, width: 1200, height: 630, alt: "CurioWire" }],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: image,
          alt: "CurioWire",
        },
      ],
    },
  };
}

export default async function CategoryFeedPage({ params, searchParams }) {
  const baseUrl = "https://curiowire.com";

  const rawCategory = await getCategory(params);
  const category = normalizeCategory(rawCategory);
  if (!category) notFound();

  let spResolved = null;
  try {
    spResolved = await Promise.resolve(searchParams);
  } catch {
    spResolved = null;
  }

  const sortQ = normalizeSort(getSP(spResolved, "sort"));
  const q = normalizeQ(getSP(spResolved, "q"));
  const effectiveQ = q.length >= 3 ? q : "";

  // SSR sort
  const ssrSort =
    sortQ === "wow"
      ? "wow"
      : sortQ === "lists"
        ? "lists"
        : sortQ === "video"
          ? "video"
          : "newest";

  const sb = supabaseServer();

  let list = [];

  if (ssrSort === "video") {
    const { data, error } = await sb.rpc("get_video_curiosities", {
      p_category: category,
      p_q: effectiveQ || null,
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });

    if (error) notFound();

    list = attachLiveVideoToCardRows(data || []);
  } else {
    let qy = sb
      .from("curiosity_cards")
      .select(
        "id, category, title, summary_normalized, image_url, created_at, wow_score, article_type, seo_title, seo_description, videos(youtube_video_id, youtube_url, posted_at, posted_results, status)",
      )
      .eq("status", "published")
      .eq("is_listed", true)
      .eq("category", category);

    if (effectiveQ) {
      const safeQ = escapePostgrestOrLike(effectiveQ);
      qy = qy.or(`title.ilike.%${safeQ}%,summary_normalized.ilike.%${safeQ}%`);
    }

    if (ssrSort === "lists") {
      qy = qy
        .eq("article_type", "list")
        .order("created_at", { ascending: false });
    }

    if (ssrSort === "newest") {
      qy = qy.order("created_at", { ascending: false });
    }

    if (ssrSort === "wow") {
      qy = qy
        .order("wow_score", { ascending: false })
        .order("created_at", { ascending: false });
    }

    const { data: cards, error } = await qy.limit(PAGE_SIZE);
    if (error) notFound();

    list = attachLiveVideoToCardRows(cards || []);
  }

  const label = category.charAt(0).toUpperCase() + category.slice(1);

  const collectionUrl = `${baseUrl}/${category}`;

  const webSiteId = `${baseUrl}/#website`;

  const collectionPageData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${collectionUrl}#collection`,
    name: `${label} curiosities | CurioWire`,
    url: collectionUrl,
    inLanguage: "en",
    description: `Latest ${category} curiosities on CurioWire.`,
    isPartOf: { "@id": webSiteId },
  };

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${collectionUrl}#itemlist`,
    inLanguage: "en",
    name: `CurioWire Feed — ${label}`,
    description: `Latest ${category} curiosities on CurioWire.`,
    numberOfItems: list.length,
    itemListElement: list.map((a, index) => {
      const safeName = cleanInlineText(a?.seo_title || a?.title);

      const img = String(a?.image_url || "").trim();

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

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: label,
        item: `${baseUrl}/${category}`,
      },
    ],
  };

  return (
    <>
      <Script
        id={`structured-data-category-${category}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageData,
            itemListData,
            breadcrumbData,
          ]),
        }}
      />

      <HomeContent
        initialCards={list}
        initialQuery={{
          category,
          sort: sortQ,
          q: effectiveQ,
        }}
      />
    </>
  );
}
