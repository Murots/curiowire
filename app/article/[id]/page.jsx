import { supabaseServer } from "@/lib/supabaseServer";
import ArticlePageClient from "@/components/ArticlePage/ArticlePageClient";
import Script from "next/script";
import { notFound } from "next/navigation";

export const revalidate = 900;

async function getId(params) {
  const p = await Promise.resolve(params); // ✅ tåler object, promise-ish, undefined
  return p?.id;
}

async function fetchCard(id) {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("curiosity_cards")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) return null;
  return data || null;
}

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
  if (!card)
    return {
      title: { absolute: "Not found — CurioWire" },
      robots: "noindex,nofollow",
    };

  const title = cleanInlineText(card.seo_title || card.title) || "CurioWire";
  const description =
    cleanInlineText(card.seo_description || card.summary_normalized) ||
    "CurioWire curiosity";

  const url = `${baseUrl}/article/${card.id}`;
  const image = card.image_url || `${baseUrl}/icon.png`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "CurioWire",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    other: { robots: "index,follow", "theme-color": "#95010e" },
  };
}

export default async function ArticlePage({ params }) {
  const id = await getId(params);
  if (!id) notFound();

  const card = await fetchCard(id);
  if (!card) notFound();

  const baseUrl = "https://curiowire.com";
  const url = `${baseUrl}/article/${card.id}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cleanInlineText(card.seo_title || card.title),
    description: cleanInlineText(
      card.seo_description || card.summary_normalized
    ),
    mainEntityOfPage: url,
    url,
    datePublished: card.created_at,
    image: [card.image_url || `${baseUrl}/icon.png`],
    author: { "@type": "Organization", name: "CurioWire" },
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
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
