// app/page.jsx
import HomeContent from "./HomeContent";
import { supabase } from "@/lib/supabaseClient";
import Script from "next/script";

export const revalidate = 900; // 15 minutes

/* === 🧠 SERVER-SIDE METADATA (standard meta) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const title = "CurioWire — AI-Generated Stories & Hidden Histories";
  const description =
    "Explore remarkable, AI-generated stories about science, technology, nature, space, history, and culture. CurioWire uncovers hidden histories and curiosities from the human record — updated daily.";

  return {
    title,
    description,
    alternates: { canonical: baseUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: baseUrl,
      siteName: "CurioWire",
      images: [`${baseUrl}/icon.png`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/icon.png`],
    },
    other: { robots: "index,follow", "theme-color": "#95010e" },
  };
}

/* === 📰 SERVER COMPONENT === */
export default async function HomePage() {
  const baseUrl = "https://curiowire.com";

  let { data: articles, error } = await supabase
    .from("weekly_top_articles")
    .select("*")
    .order("view_count", { ascending: false })
    .limit(10);

  if (error || !articles?.length) {
    const { data: fallback } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    articles = fallback || [];
  }

  console.log(
    `✅ Toplist fetched at ${new Date().toISOString()} — ${
      articles.length
    } items`
  );

  // === 💡 Bygg structured data manuelt ===
  const webSiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CurioWire",
    url: baseUrl,
    description:
      "Explore remarkable, AI-generated stories about science, technology, nature, space, history, culture and more.",
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Trending Curiosities — CurioWire",
    description:
      "The top AI-generated stories trending this week across science, history, nature, technology and more.",
    numberOfItems: articles.length,
    itemListElement: articles.map((a, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/article/${a.id}`,
      name: a.title,
      image: a.image_url,
      datePublished: a.created_at,
    })),
  };

  const newsArticlesData = articles.slice(0, 3).map((a) => ({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.seo_title || a.title,
    description:
      a.seo_description ||
      `Trending curiosity from the category ${a.category}.`,
    image: [a.image_url || `${baseUrl}/icon.png`],
    articleSection: a.category || "General",
    url: `${baseUrl}/article/${a.id}`,
    author: { "@type": "Organization", name: "CurioWire", url: baseUrl },
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
    },
    datePublished: a.created_at,
    dateModified: a.updated_at || a.created_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/article/${a.id}`,
    },
  }));

  const allStructuredData = [webSiteData, itemListData, ...newsArticlesData];

  return (
    <>
      {/* ✅ Google Rich Results JSON-LD */}
      <Script
        id="structured-data-home"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(allStructuredData),
        }}
      />
      <HomeContent articles={articles} />
    </>
  );
}
