// // app/page.jsx
// import HomeContent from "./HomeContent";
// import { supabase } from "@/lib/supabaseClient";
// import Script from "next/script";

// const PAGE_SIZE = 30;

// export const revalidate = 900; // 15 min

// // Minimal HTML strip + safety clean for titles used in JSON-LD / metadata
// function cleanInlineText(s) {
//   return (
//     String(s || "")
//       // 1) strip escaped tags like &lt;/title&gt;
//       .replace(/&lt;\/?[^&]+&gt;/gi, "")
//       // 2) strip real tags like </title>
//       .replace(/<[^>]*>/g, "")
//       // 3) normalize whitespace
//       .replace(/\s+/g, " ")
//       .trim()
//   );
// }

// export async function generateMetadata() {
//   const baseUrl = "https://curiowire.com";

//   // ✅ Use absolute to avoid layout title template adding " — CurioWire"
//   const absoluteTitle = "CurioWire — All about curiosities";

//   const description =
//     "Fresh, short curiosities in science, history, nature, technology and more — published daily";

//   return {
//     title: { absolute: absoluteTitle },
//     description,
//     alternates: { canonical: baseUrl },

//     openGraph: {
//       type: "website",
//       locale: "en_US",
//       title: absoluteTitle,
//       description,
//       url: baseUrl,
//       siteName: "CurioWire",
//       images: [`${baseUrl}/icon.png`],
//     },

//     twitter: {
//       card: "summary_large_image",
//       title: absoluteTitle,
//       description,
//       images: [`${baseUrl}/icon.png`],
//     },

//     other: {
//       robots: "index,follow",
//       "theme-color": "#95010e",
//     },
//   };
// }

// export default async function HomePage() {
//   const baseUrl = "https://curiowire.com";

//   const { data: cards } = await supabase
//     .from("curiosity_cards")
//     .select(
//       "id, category, title, summary_normalized, image_url, created_at, wow_score, seo_title, seo_description"
//     )
//     .eq("status", "published")
//     .order("created_at", { ascending: false })
//     .limit(PAGE_SIZE);

//   const list = Array.isArray(cards) ? cards : [];

//   const webSiteData = {
//     "@context": "https://schema.org",
//     "@type": "WebSite",
//     name: "CurioWire",
//     url: baseUrl,
//     inLanguage: "en",
//     description:
//       "Fresh, short curiosities in science, history, nature, technology and more — published daily",
//     publisher: {
//       "@type": "Organization",
//       name: "CurioWire",
//       url: baseUrl,
//       logo: { "@type": "ImageObject", url: `${baseUrl}/icon.png` },
//     },
//     potentialAction: {
//       "@type": "SearchAction",
//       target: `${baseUrl}/?q={search_term_string}`,
//       "query-input": "required name=search_term_string",
//     },
//   };

//   const itemListData = {
//     "@context": "https://schema.org",
//     "@type": "ItemList",
//     inLanguage: "en",
//     name: "CurioWire Feed",
//     description: "Latest curiosities on CurioWire.",
//     numberOfItems: list.length,
//     itemListElement: list.map((a, index) => {
//       const safeName = cleanInlineText(a?.seo_title || a?.title);
//       return {
//         "@type": "ListItem",
//         position: index + 1,
//         url: `${baseUrl}/article/${a.id}`,
//         name: safeName || "CurioWire curiosity",
//         image: a?.image_url || `${baseUrl}/icon.png`,
//         datePublished: a?.created_at,
//       };
//     }),
//   };

//   const allStructuredData = [webSiteData, itemListData];

//   return (
//     <>
//       <Script
//         id="structured-data-home"
//         type="application/ld+json"
//         strategy="beforeInteractive"
//         dangerouslySetInnerHTML={{
//           __html: JSON.stringify(allStructuredData),
//         }}
//       />

//       <HomeContent initialCards={list} />
//     </>
//   );
// }

// app/page.jsx
import HomeContent from "./HomeContent";
import { supabase } from "@/lib/supabaseClient";
import Script from "next/script";
import ServerCurioCard from "@/components/CurioCard/ServerCurioCard";

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

export default async function HomePage() {
  const baseUrl = "https://curiowire.com";

  const { data: cards } = await supabase
    .from("curiosity_cards")
    .select(
      "id, category, title, summary_normalized, image_url, created_at, wow_score, seo_title, seo_description",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

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

      {/* ✅ SSR feed for SEO (hidden after hydration via JS in HomeContent) */}
      <ul
        className="cw-ssr-feed"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {list.map((card) => (
          <ServerCurioCard key={card.id} card={card} />
        ))}
      </ul>

      <HomeContent initialCards={list} />
    </>
  );
}
