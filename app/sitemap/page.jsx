"use client";

import Head from "next/head";
import Link from "next/link";
import {
  Wrapper,
  Title,
  Info,
  CategoryList,
  CategoryItem,
} from "./sitemap.styles";
import { categories } from "@/app/api/utils/categories";

export default function SitemapPage() {
  const baseUrl = "https://curiowire.com";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "CurioWire Sitemap",
    description:
      "A structured overview of all CurioWire categories and articles — updated automatically with every new publication.",
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

  return (
    <>
      <Head>
        {/* 🧭 Primary SEO Metadata */}
        <title>Sitemap — CurioWire</title>
        <meta
          name="description"
          content="Explore every CurioWire category — science, history, nature, culture and more. Automatically updated sitemap for readers and search engines."
        />
        <meta
          name="keywords"
          content="CurioWire sitemap, AI news archive, AI journalism, automated newspaper, article index, category listing"
        />
        <meta name="author" content="CurioWire" />
        <meta httpEquiv="Content-Language" content="en" />
        <link rel="canonical" href={`${baseUrl}/sitemap`} />
        <meta name="robots" content="index,follow" />

        {/* 🌍 Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CurioWire" />
        <meta property="og:title" content="Sitemap — CurioWire" />
        <meta
          property="og:description"
          content="A structured, automatically updated sitemap of all CurioWire articles and categories."
        />
        <meta property="og:url" content={`${baseUrl}/sitemap`} />
        <meta property="og:image" content={`${baseUrl}/icon.png`} />

        {/* 🐦 Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@curiowire" />
        <meta name="twitter:title" content="CurioWire Sitemap" />
        <meta
          name="twitter:description"
          content="Explore all CurioWire categories — automatically updated sitemap for readers and search engines."
        />
        <meta name="twitter:image" content={`${baseUrl}/icon.png`} />

        {/* 📱 Favicon & Manifest */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />

        {/* 🧠 Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </Head>

      <Wrapper>
        <Title>CurioWire Sitemap</Title>

        <Info>
          Explore the world of CurioWire — stories organized by category,
          updated automatically as new articles are generated.
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
    </>
  );
}
