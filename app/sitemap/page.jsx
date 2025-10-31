// === app/sitemap/page.jsx ===
// 🗺️ Global Sitemap Overview Page for CurioWire
export const dynamic = "force-static";

import Link from "next/link";
import { categories } from "@/app/api/utils/categories";
import {
  Wrapper,
  Title,
  Info,
  CategoryList,
  CategoryItem,
} from "./sitemap.styles";

/* === 🧠 SERVER-SIDE METADATA (SEO + JSON-LD) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";

  const description =
    "Explore every CurioWire category — science, history, nature, culture and more. Automatically updated sitemap for readers and search engines.";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "CurioWire Sitemap",
    description,
    url: `${baseUrl}/sitemap`,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    hasPart: Object.keys(categories).map((key) => ({
      "@type": "CollectionPage",
      name: key.charAt(0).toUpperCase() + key.slice(1),
      url: `${baseUrl}/sitemap/${key}`,
    })),
  };

  return {
    title: "Sitemap — CurioWire",
    description,
    alternates: { canonical: `${baseUrl}/sitemap` },
    openGraph: {
      type: "website",
      siteName: "CurioWire",
      title: "Sitemap — CurioWire",
      description,
      url: `${baseUrl}/sitemap`,
      images: [
        {
          url: `${baseUrl}/icon.png`,
          width: 512,
          height: 512,
          alt: "CurioWire Logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "CurioWire Sitemap",
      description,
      images: [`${baseUrl}/icon.png`],
    },
    other: {
      robots: "index,follow",
      "theme-color": "#95010e",
    },
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  };
}

/* === 🧩 PAGE COMPONENT === */
export default function SitemapPage() {
  return (
    <Wrapper>
      <Title>CurioWire Sitemap</Title>

      <Info>
        Explore the world of CurioWire — stories organized by category, updated
        automatically as new articles are generated.
      </Info>

      <CategoryList>
        {Object.keys(categories).map((key) => (
          <CategoryItem key={key}>
            <Link href={`/sitemap/${key}`}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Link>
          </CategoryItem>
        ))}
      </CategoryList>

      <Info>
        Looking for the XML version for search engines?{" "}
        <a href="/api/sitemap" target="_blank" rel="noopener noreferrer">
          View sitemap.xml
        </a>
      </Info>
    </Wrapper>
  );
}
