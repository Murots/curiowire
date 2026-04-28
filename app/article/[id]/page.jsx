// // app/article/[id]/page.jsx
// import { supabaseServer } from "@/lib/supabaseServer";
// import ArticlePageClient from "@/components/ArticlePage/ArticlePageClient";
// import Script from "next/script";
// import { notFound } from "next/navigation";

// export const revalidate = 900;

// // ✅ Next.js 16: themeColor must be in `viewport` (not metadata)
// export const viewport = {
//   themeColor: "#95010e",
// };

// // ✅ Robust params handling (object, promise-ish, undefined)
// async function getId(params) {
//   const p = await Promise.resolve(params);
//   return p?.id;
// }

// async function fetchCard(id) {
//   const sb = supabaseServer();

//   const numericId = Number(id);
//   if (!Number.isFinite(numericId) || numericId <= 0) return null;

//   const { data, error } = await sb
//     .from("curiosity_cards")
//     .select("*")
//     .eq("id", numericId)
//     .eq("status", "published")
//     .maybeSingle();

//   if (error) return null;
//   return data || null;
// }

// // ✅ NEW: fetch latest video for article
// async function fetchVideo(articleId) {
//   const sb = supabaseServer();

//   const { data } = await sb
//     .from("videos")
//     .select("youtube_video_id, youtube_url, posted_at")
//     .eq("article_id", Number(articleId))
//     .eq("status", "posted")
//     .not("youtube_video_id", "is", null)
//     .order("posted_at", { ascending: false })
//     .limit(1)
//     .maybeSingle();

//   return data || null;
// }

// // Minimal HTML strip + safety clean for JSON-LD / metadata
// function cleanInlineText(s) {
//   return String(s || "")
//     .replace(/&lt;\/?[^&]+&gt;/gi, "")
//     .replace(/<[^>]*>/g, "")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// export async function generateMetadata({ params }) {
//   const baseUrl = "https://curiowire.com";
//   const id = await getId(params);
//   if (!id) return {};

//   const card = await fetchCard(id);
//   if (!card) {
//     return {
//       title: { absolute: "Not found — CurioWire" },
//       robots: { index: false, follow: false },
//     };
//   }

//   const video = await fetchVideo(card.id);

//   const title = cleanInlineText(card.seo_title || card.title) || "CurioWire";
//   const description =
//     cleanInlineText(card.seo_description || card.summary_normalized) ||
//     "CurioWire curiosity";

//   const url = `${baseUrl}/article/${card.id}`;
//   const shareImageUrl =
//     card.image_url && /^https?:\/\//i.test(card.image_url)
//       ? card.image_url
//       : `${baseUrl}/OMImage.png`;

//   // const ogWidth = 1200;
//   // const ogHeight = 630;
//   const ogAlt = title;

//   const metadata = {
//     title: { absolute: title },
//     description,

//     applicationName: "CurioWire",

//     alternates: { canonical: url },

//     robots: {
//       index: true,
//       follow: true,
//       googleBot: {
//         index: true,
//         follow: true,
//         "max-image-preview": "large",
//         "max-snippet": -1,
//         "max-video-preview": -1,
//       },
//     },

//     openGraph: {
//       type: "article",
//       title,
//       description,
//       url,
//       siteName: "CurioWire",
//       images: [
//         {
//           url: shareImageUrl,
//           alt: ogAlt,
//         },
//       ],
//     },

//     twitter: {
//       card: "summary_large_image",
//       title,
//       description,
//       images: [
//         {
//           url: shareImageUrl,
//           alt: ogAlt,
//         },
//       ],
//     },
//   };

//   // ✅ Inject video into metadata ONLY if exists
//   if (video?.youtube_video_id) {
//     metadata.openGraph.videos = [
//       {
//         url: `https://www.youtube.com/embed/${video.youtube_video_id}`,
//         type: "text/html",
//       },
//     ];
//   }

//   return metadata;
// }

// export default async function ArticlePage({ params }) {
//   const id = await getId(params);
//   if (!id) notFound();

//   const card = await fetchCard(id);
//   if (!card) notFound();

//   const video = await fetchVideo(card.id);

//   const baseUrl = "https://curiowire.com";
//   const url = `${baseUrl}/article/${card.id}`;

//   const published = card.created_at;
//   const modified = card.updated_at || card.created_at;

//   const headline = cleanInlineText(card.seo_title || card.title);
//   const desc = cleanInlineText(card.seo_description || card.summary_normalized);

//   const categorySlug = String(card.category || "").toLowerCase();
//   const categoryLabel =
//     categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

//   const breadcrumbData = {
//     "@context": "https://schema.org",
//     "@type": "BreadcrumbList",
//     itemListElement: [
//       {
//         "@type": "ListItem",
//         position: 1,
//         name: "Home",
//         item: `${baseUrl}/`,
//       },
//       ...(categorySlug
//         ? [
//             {
//               "@type": "ListItem",
//               position: 2,
//               name: categoryLabel,
//               item: `${baseUrl}/${categorySlug}`,
//             },
//           ]
//         : []),
//       {
//         "@type": "ListItem",
//         position: categorySlug ? 3 : 2,
//         name: headline || "CurioWire curiosity",
//         item: url,
//       },
//     ],
//   };

//   const imageUrl =
//     card.image_url && /^https?:\/\//i.test(card.image_url)
//       ? card.image_url
//       : `${baseUrl}/OMImage.png`;

//   // const imgWidth = 1200;
//   // const imgHeight = 630;

//   const articleJsonLd = {
//     "@context": "https://schema.org",
//     "@type": "Article",
//     headline,
//     description: desc,
//     mainEntityOfPage: {
//       "@type": "WebPage",
//       "@id": url,
//     },
//     url,
//     datePublished: published,
//     dateModified: modified,
//     image: [
//       {
//         "@type": "ImageObject",
//         url: imageUrl,
//       },
//     ],
//     author: {
//       "@type": "Organization",
//       name: "CurioWire",
//       url: baseUrl,
//     },
//     publisher: {
//       "@type": "Organization",
//       name: "CurioWire",
//       url: baseUrl,
//       logo: {
//         "@type": "ImageObject",
//         url: `${baseUrl}/icon.png`,
//         width: 512,
//         height: 512,
//       },
//     },
//     inLanguage: "en",
//     articleSection: String(card.category || "curiosities"),
//   };

//   // ✅ FULLY OPTIMIZED VideoObject (with duration)
//   const videoJsonLd = video?.youtube_video_id
//     ? {
//         "@context": "https://schema.org",
//         "@type": "VideoObject",
//         name: headline,
//         description: desc,
//         thumbnailUrl: [
//           `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`,
//         ],
//         uploadDate: video.posted_at,
//         duration: "PT32S", // ✅ FIXED (all videos are 32 seconds)
//         contentUrl: video.youtube_url,
//         embedUrl: `https://www.youtube.com/embed/${video.youtube_video_id}`,
//         publisher: {
//           "@type": "Organization",
//           name: "CurioWire",
//           logo: {
//             "@type": "ImageObject",
//             url: `${baseUrl}/icon.png`,
//             width: 512,
//             height: 512,
//           },
//         },
//       }
//     : null;

//   return (
//     <>
//       <Script
//         id={`structured-data-article-${card.id}`}
//         type="application/ld+json"
//         strategy="beforeInteractive"
//         dangerouslySetInnerHTML={{
//           __html: JSON.stringify(
//             videoJsonLd
//               ? [articleJsonLd, breadcrumbData, videoJsonLd]
//               : [articleJsonLd, breadcrumbData],
//           ),
//         }}
//       />

//       <ArticlePageClient card={card} video={video} />
//     </>
//   );
// }

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

// ✅ NEW: fetch latest video for article
async function fetchVideo(articleId) {
  const sb = supabaseServer();

  const { data } = await sb
    .from("videos")
    .select("youtube_video_id, youtube_url, posted_at")
    .eq("article_id", Number(articleId))
    .eq("status", "posted")
    .not("youtube_video_id", "is", null)
    .order("posted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

async function fetchQuestions(articleId) {
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("article_questions")
    .select("id, question, slug, category, position")
    .eq("card_id", Number(articleId))
    .eq("status", "published")
    .eq("is_indexed", true)
    .order("position", { ascending: true });

  if (error) return [];
  return Array.isArray(data) ? data : [];
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

  const video = await fetchVideo(card.id);

  const title = cleanInlineText(card.seo_title || card.title) || "CurioWire";
  const description =
    cleanInlineText(card.seo_description || card.summary_normalized) ||
    "CurioWire curiosity";

  const url = `${baseUrl}/article/${card.id}`;
  const shareImageUrl =
    card.image_url && /^https?:\/\//i.test(card.image_url)
      ? card.image_url
      : `${baseUrl}/OMImage.png`;

  // const ogWidth = 1200;
  // const ogHeight = 630;
  const ogAlt = title;

  const metadata = {
    title: { absolute: title },
    description,

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
      type: "article",
      title,
      description,
      url,
      siteName: "CurioWire",
      images: [
        {
          url: shareImageUrl,
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
          url: shareImageUrl,
          alt: ogAlt,
        },
      ],
    },
  };

  // ✅ Inject video into metadata ONLY if exists
  if (video?.youtube_video_id) {
    metadata.openGraph.videos = [
      {
        url: `https://www.youtube.com/embed/${video.youtube_video_id}`,
        type: "text/html",
      },
    ];
  }

  return metadata;
}

export default async function ArticlePage({ params }) {
  const id = await getId(params);
  if (!id) notFound();

  const card = await fetchCard(id);
  if (!card) notFound();

  const video = await fetchVideo(card.id);
  const questions = await fetchQuestions(card.id);

  const baseUrl = "https://curiowire.com";
  const url = `${baseUrl}/article/${card.id}`;

  const published = card.created_at;
  const modified = card.updated_at || card.created_at;

  const headline = cleanInlineText(card.seo_title || card.title);
  const desc = cleanInlineText(card.seo_description || card.summary_normalized);

  const categorySlug = String(card.category || "").toLowerCase();
  const categoryLabel =
    categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

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
      ...(categorySlug
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: categoryLabel,
              item: `${baseUrl}/${categorySlug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: categorySlug ? 3 : 2,
        name: headline || "CurioWire curiosity",
        item: url,
      },
    ],
  };

  const imageUrl =
    card.image_url && /^https?:\/\//i.test(card.image_url)
      ? card.image_url
      : `${baseUrl}/OMImage.png`;

  // const imgWidth = 1200;
  // const imgHeight = 630;

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
    articleSection: String(card.category || "curiosities"),
  };

  // ✅ FULLY OPTIMIZED VideoObject (with duration)
  const videoJsonLd = video?.youtube_video_id
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: headline,
        description: desc,
        thumbnailUrl: [
          `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`,
        ],
        uploadDate: video.posted_at,
        duration: "PT32S", // ✅ FIXED (all videos are 32 seconds)
        contentUrl: video.youtube_url,
        embedUrl: `https://www.youtube.com/embed/${video.youtube_video_id}`,
        publisher: {
          "@type": "Organization",
          name: "CurioWire",
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/icon.png`,
            width: 512,
            height: 512,
          },
        },
      }
    : null;

  return (
    <>
      <Script
        id={`structured-data-article-${card.id}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            videoJsonLd
              ? [articleJsonLd, breadcrumbData, videoJsonLd]
              : [articleJsonLd, breadcrumbData],
          ),
        }}
      />

      <ArticlePageClient card={card} video={video} questions={questions} />
    </>
  );
}
