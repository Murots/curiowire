// app/page.jsx
import HomeContent from "./HomeContent";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-static";

/* === 🧠 SERVER-SIDE METADATA (maksimal SEO, Discover + Top Stories) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const title = "CurioWire — AI-Generated Stories & Hidden Histories";
  const description =
    "Explore remarkable, AI-generated stories about science, technology, nature, space, history, and culture. CurioWire uncovers hidden histories and curiosities from the human record — updated daily.";

  // === 1️⃣ Hent topp 10 artikler for JSON-LD ===
  let { data: articles, error } = await supabase
    .from("weekly_top_articles")
    .select("*")
    .order("view_count", { ascending: false })
    .limit(10);

  // === 2️⃣ Fallback hvis tomt ===
  if (error || !articles?.length) {
    const { data: fallback } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    articles = fallback || [];
  }

  // 🌐 Grunnleggende nettsted
  const webSiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CurioWire",
    url: baseUrl,
    description,
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

  // 🧾 Liste over trendartikler
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Trending Curiosities — CurioWire",
    description:
      "The top AI-generated stories trending this week across science, history, nature, and technology.",
    numberOfItems: articles.length,
    itemListElement: articles.map((a, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/article/${a.id}`,
      name: a.title,
      image: a.image_url,
      datePublished: a.created_at,
      dateModified: a.updated_at || a.created_at,
    })),
  };

  // 📰 De 3 første artiklene som egne NewsArticle-blokker (for Discover)
  const newsArticlesData = articles.slice(0, 3).map((a) => ({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description:
      a.excerpt?.slice(0, 180) ||
      "Explore this week's trending AI-generated story on CurioWire.",
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

  const allStructuredData = JSON.stringify([
    webSiteData,
    itemListData,
    ...newsArticlesData,
  ]);

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
    scripts: [{ type: "application/ld+json", innerHTML: allStructuredData }],
  };
}

/* === 📰 SERVER COMPONENT === */
export default async function HomePage() {
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

  return <HomeContent articles={articles} />;
}
