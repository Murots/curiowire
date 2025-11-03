// app/article/[id]/page.jsx
import { supabase } from "@/lib/supabaseClient";
import ArticlePage from "@/components/ArticlePage/ArticlePage";

/* === 🧠 SERVER-SIDE METADATA (full Discover + schema-optimalisering) === */
export async function generateMetadata({ params }) {
  const { id } = params;

  // 📰 Hent artikkel fra Supabase
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (!article) {
    return {
      title: "Article not found — CurioWire",
      description: "The requested curiosity could not be found.",
      robots: "noindex,follow",
    };
  }

  const baseUrl = "https://curiowire.com";
  const url = `${baseUrl}/article/${id}`;
  const cleanTitle = (article.title || "Untitled — CurioWire")
    .replace(/\*/g, "")
    .trim();
  const category = article.category || "General";
  const image = article.image_url || `${baseUrl}/icon.png`;

  // ✍️ Metabeskrivelse
  const rawExcerpt =
    article.excerpt?.replace(/\s+/g, " ").trim() ||
    "Explore unique, AI-generated curiosities on CurioWire.";
  const trimmedExcerpt =
    rawExcerpt.length > 155
      ? rawExcerpt.slice(0, 155).replace(/\s+\S*$/, "") + "…"
      : rawExcerpt;
  const description = `${trimmedExcerpt} Discover more →`;

  /* === 🧩 STRUKTURERT DATA === */

  // 📰 A. NewsArticle
  const newsArticleData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: cleanTitle,
    description,
    image: [image],
    keywords: [category, "AI journalism", "CurioWire", "hidden histories"],
    articleSection: category,
    url,
    inLanguage: "en",
    author: {
      "@type": "Organization",
      name: "CurioWire Editorial",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    potentialAction: {
      "@type": "ReadAction",
      target: url,
    },
  };

  // 🧭 B. BreadcrumbList
  const breadcrumbList = {
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
        name: category,
        item: `${baseUrl}/${category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cleanTitle,
        item: url,
      },
    ],
  };

  // 🌐 C. WebSite (for kontekst og konsistens)
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CurioWire",
    url: baseUrl,
    description:
      "AI-generated stories and curiosities exploring science, history, nature, culture, and technology — updated daily.",
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
  };

  // Kombiner alt i ett JSON-LD-array
  const allStructuredData = JSON.stringify([
    newsArticleData,
    breadcrumbList,
    websiteData,
  ]);

  /* === 🧭 FULL METADATA === */
  return {
    title: cleanTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: cleanTitle,
      description,
      url,
      type: "article",
      siteName: "CurioWire",
      locale: "en_US",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: cleanTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: cleanTitle,
      description,
      images: [image],
    },
    other: {
      robots: "max-image-preview:large",
      "article:section": category,
      "og:image:alt": cleanTitle,
      "theme-color": "#95010e",
      "og:locale": "en_US",
    },
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: allStructuredData,
      },
    ],
  };
}

/* === 📰 SERVER COMPONENT === */
export default async function Page({ params }) {
  const { id } = params;

  // 📰 Hent artikkel
  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !article) {
    console.error("❌ Error fetching article:", error?.message);
    return <p style={{ padding: "40px" }}>Article not found.</p>;
  }

  // ➡️ Finn neste artikkel (sirkulær logikk)
  const { data: nextData } = await supabase
    .from("articles")
    .select("id, title")
    .eq("category", article.category)
    .gt("created_at", article.created_at)
    .order("created_at", { ascending: true })
    .limit(1);

  let nextArticle = nextData?.[0] || null;

  if (!nextArticle) {
    const { data: first } = await supabase
      .from("articles")
      .select("id, title")
      .eq("category", article.category)
      .order("created_at", { ascending: true })
      .limit(1);
    nextArticle = first?.[0] || null;
  }

  // 🧩 Returner artikkelen
  return <ArticlePage article={article} nextArticle={nextArticle} />;
}
