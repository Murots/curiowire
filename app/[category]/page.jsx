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

/* === 🧠 SERVER-SIDE METADATA (SEO) === */
export async function generateMetadata({ params, searchParams }) {
  const baseUrl = "https://curiowire.com";

  const rawCategory = await getCategory(params);
  const category = normalizeCategory(rawCategory);
  if (!category) return { robots: { index: false, follow: false } };

  // Resolve searchParams robust (Next can hand promise-ish)
  let spResolved = null;
  try {
    spResolved = await Promise.resolve(searchParams);
  } catch {
    spResolved = null;
  }

  const sortQ = normalizeSort(getSP(spResolved, "sort"));
  const q = normalizeQ(getSP(spResolved, "q"));

  const label = category.charAt(0).toUpperCase() + category.slice(1);

  // ✅ Index only the "clean" category feed page:
  //    /technology
  // NOT:
  //    /technology?sort=trending
  //    /technology?sort=random
  //    /technology?q=foo
  const isCleanCategory = !q && sortQ === "newest";

  // Title/description can still reflect user state, even if noindex for variants
  const title = `CurioWire — ${label} curiosities`;
  const description = q
    ? `Search results in ${label} on CurioWire for “${q}”.`
    : sortQ === "trending"
      ? `Trending ${label.toLowerCase()} curiosities on CurioWire.`
      : sortQ === "random"
        ? `Random ${label.toLowerCase()} curiosities on CurioWire.`
        : sortQ === "wow"
          ? `Top-rated ${label.toLowerCase()} curiosities on CurioWire.`
          : `Fresh, short ${category} curiosities — published daily.`;

  // ✅ Canonical: keep category canonical clean (no params)
  const canonical = `${baseUrl}/${category}`;
  const image = `${baseUrl}/OGImage.png`;

  return {
    title: { absolute: title },
    description,

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
      images: [image],
    },
  };
}

export default async function CategoryFeedPage({ params, searchParams }) {
  const baseUrl = "https://curiowire.com";

  const rawCategory = await getCategory(params);
  const category = normalizeCategory(rawCategory);
  if (!category) notFound();

  // ✅ resolve searchParams robust
  let spResolved = null;
  try {
    spResolved = await Promise.resolve(searchParams);
  } catch {
    spResolved = null;
  }

  const sortQ = normalizeSort(getSP(spResolved, "sort"));
  const q = normalizeQ(getSP(spResolved, "q"));

  // SSR: we serve "newest" or "wow". Trending/random is computed client-side,
  // but we still pass sortQ to the client so state doesn't "snap back".
  const ssrSort = sortQ === "wow" ? "wow" : "newest";

  const sb = supabaseServer();

  let qy = sb
    .from("curiosity_cards")
    .select(
      "id, category, title, summary_normalized, image_url, created_at, wow_score, seo_title, seo_description",
    )
    .eq("status", "published")
    .eq("category", category);

  if (q) {
    const safeQ = q.replace(/'/g, "''");
    qy = qy.or(`title.ilike.%${safeQ}%,summary_normalized.ilike.%${safeQ}%`);
  }

  if (ssrSort === "newest") qy = qy.order("created_at", { ascending: false });

  if (ssrSort === "wow")
    qy = qy
      .order("wow_score", { ascending: false })
      .order("created_at", { ascending: false });

  const { data: cards, error } = await qy.limit(PAGE_SIZE);
  if (error) notFound();

  const list = Array.isArray(cards) ? cards : [];

  const label = category.charAt(0).toUpperCase() + category.slice(1);

  // ✅ Category feed page schema (more correct than WebSite on category pages)
  // Keep it feed-like: CollectionPage + ItemList
  const collectionPageData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${label} curiosities | CurioWire`,
    url: `${baseUrl}/${category}`,
    inLanguage: "en",
    description: `Latest ${category} curiosities on CurioWire.`,
  };

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: "en",
    name: `CurioWire Feed — ${label}`,
    description: `Latest ${category} curiosities on CurioWire.`,
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

  return (
    <>
      <Script
        id={`structured-data-category-${category}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([collectionPageData, itemListData]),
        }}
      />

      <HomeContent
        initialCards={list}
        initialQuery={{
          category,
          sort: sortQ,
          q,
        }}
      />
    </>
  );
}
