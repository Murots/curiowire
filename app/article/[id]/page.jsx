// app/article/[id]/page.jsx
import { supabaseServer } from "@/lib/supabaseServer";
import ArticlePageClient from "@/components/ArticlePage/ArticlePageClient";
import Script from "next/script";
import { notFound } from "next/navigation";

export const revalidate = 900;

// ✅ Next.js 16: themeColor must be in `viewport` (not metadata)
export const viewport = {
  themeColor: "#95010e",
};

// ✅ Robust params handling (object, promise-ish, undefined)
async function getId(params) {
  const p = await Promise.resolve(params);
  return p?.id;
}

async function fetchCard(id) {
  const sb = supabaseServer();

  // Normalize id (your IDs are numeric elsewhere)
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;

  const { data, error } = await sb
    .from("curiosity_cards")
    .select("*")
    .eq("id", numericId)
    .eq("status", "published")
    .maybeSingle();

  if (error) return null;
  return data || null;
}

// Minimal HTML strip + safety clean for JSON-LD / metadata
function cleanInlineText(s) {
  return String(s || "")
    .replace(/&lt;\/?[^&]+&gt;/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({ params }) {
  const baseUrl = "https://curiowire.com";
  const id = await getId(params);
  if (!id) return {};

  const card = await fetchCard(id);

  if (!card) {
    return {
      title: { absolute: "Not found — CurioWire" },
      robots: { index: false, follow: false },
    };
  }

  const title = cleanInlineText(card.seo_title || card.title) || "CurioWire";
  const description =
    cleanInlineText(card.seo_description || card.summary_normalized) ||
    "CurioWire curiosity";

  const url = `${baseUrl}/article/${card.id}`;

  const imageUrl = `${baseUrl}/OGImage.png`;

  // Always declare standard share size
  const ogWidth = 1200;
  const ogHeight = 630;

  const ogAlt = title;

  return {
    title: { absolute: title },
    description,

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
      type: "article",
      title,
      description,
      url,
      siteName: "CurioWire",
      images: [
        {
          url: imageUrl,
          width: ogWidth,
          height: ogHeight,
          alt: ogAlt,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: ogAlt,
        },
      ],
    },
  };
}

export default async function ArticlePage({ params }) {
  const id = await getId(params);
  if (!id) notFound();

  const card = await fetchCard(id);
  if (!card) notFound();

  const baseUrl = "https://curiowire.com";
  const url = `${baseUrl}/article/${card.id}`;

  const published = card.created_at;
  const modified = card.updated_at || card.created_at;

  const headline = cleanInlineText(card.seo_title || card.title);
  const desc = cleanInlineText(card.seo_description || card.summary_normalized);

  const imageUrl = `${baseUrl}/OGImage.png`;

  // Declare standard share size
  const imgWidth = 1200;
  const imgHeight = 630;

  // ✅ Structured data: NewsArticle + dateModified + WebPage/@id
  // Added ImageObject width/height for consistency.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description: desc,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    datePublished: published,
    dateModified: modified,
    image: [
      {
        "@type": "ImageObject",
        url: imageUrl,
        width: imgWidth,
        height: imgHeight,
      },
    ],
    author: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
    },
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
    inLanguage: "en",
    articleSection: card.category || "curiosities",
  };

  return (
    <>
      <Script
        id={`structured-data-article-${card.id}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <ArticlePageClient card={card} />
    </>
  );
}
