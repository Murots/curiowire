"use client";

import Head from "next/head";
import {
  Wrapper,
  Headline,
  Paragraph,
  SectionTitle,
  List,
  ListItem,
} from "./sources.styles";

export default function SourcesPage() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/sources`;

  const title = "Sources & Methodology — CurioWire";
  const description =
    "Learn how CurioWire gathers, writes and illustrates stories using AI, open data and historical archives — full transparency on editorial process, imagery and affiliate model.";
  const image = `${baseUrl}/icon.png`;

  // 🧠 Strukturert data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Sources & Methodology",
    description,
    url: pageUrl,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: { "@type": "ImageObject", url: image },
    },
    mainEntity: [
      {
        "@type": "ItemList",
        name: "Data & Information Sources",
        itemListElement: [
          "Public domain archives and library datasets",
          "Scientific and academic repositories (arXiv, PLOS, etc.)",
          "International press releases and verified RSS sources",
          "Historical databases and museum digitizations",
        ].map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
        })),
      },
      {
        "@type": "ItemList",
        name: "Image Sources",
        itemListElement: [
          "Unsplash API (editorial-safe imagery)",
          "Pexels API (royalty-free photos)",
          "OpenAI DALL·E models (AI-generated visuals)",
          "Wikimedia Commons (historical and open-license archives)",
        ].map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
        })),
      },
      {
        "@type": "ItemList",
        name: "Affiliate & Product Content",
        itemListElement: [
          "Amazon Associates Program participation",
          "Dynamic product links generated from open data",
        ].map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
        })),
      },
    ],
  };

  return (
    <>
      <Head>
        {/* 🧭 Primary SEO Metadata */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content="CurioWire sources, AI journalism transparency, open data archives, editorial methodology, DALL·E, Unsplash, Amazon Associates"
        />
        <meta name="author" content="CurioWire" />
        <meta httpEquiv="Content-Language" content="en" />
        <link rel="canonical" href={pageUrl} />
        <meta name="robots" content="index,follow" />

        {/* 🌍 Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CurioWire" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={image} />

        {/* 🐦 Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@curiowire" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

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
        <Headline>Sources & Methodology</Headline>

        <Paragraph>
          <strong>CurioWire</strong> combines artificial intelligence, open
          archives, and automated editorial tools to curate stories from around
          the world. Transparency is essential — below you’ll find how we
          gather, write, and illustrate each story published on this platform.
        </Paragraph>

        <SectionTitle>1. Data & Information Sources</SectionTitle>
        <Paragraph>
          The foundation of each article comes from a combination of open data,
          research archives and reputable publications. Our automated systems
          use trusted feeds such as:
        </Paragraph>

        <List>
          <ListItem>• Public domain archives and library datasets</ListItem>
          <ListItem>
            • Scientific and academic repositories (e.g., arXiv, PLOS)
          </ListItem>
          <ListItem>
            • International press releases and verified RSS sources
          </ListItem>
          <ListItem>• Historical databases and museum digitizations</ListItem>
        </List>

        <Paragraph>
          Text generation and summarization are performed using{" "}
          <strong>OpenAI’s GPT models</strong> to identify patterns, translate
          complex data into readable language, and recreate the tone of a
          classic newsroom report. All AI outputs are reviewed for factual
          alignment and clarity before publication.
        </Paragraph>

        <SectionTitle>2. Image Sources</SectionTitle>
        <Paragraph>
          Visual material on CurioWire is produced through a blend of automated
          generation and curated selection:
        </Paragraph>

        <List>
          <ListItem>
            • <strong>Unsplash API</strong> — for editorial-safe stock
            photography and Creative Commons imagery
          </ListItem>
          <ListItem>
            • <strong>Pexels API</strong> — for additional royalty-free and
            attribution-safe visuals
          </ListItem>
          <ListItem>
            • <strong>DALL·E & OpenAI Image Models</strong> — for custom
            AI-generated visuals accompanying conceptual stories
          </ListItem>
          <ListItem>
            • <strong>Wikimedia Commons</strong> — for historical and
            public-domain imagery from museum and archival digitizations
          </ListItem>
        </List>

        <Paragraph>
          All images are reviewed for theme, tone, and license compliance before
          publication. Visual content may at times serve as an artistic
          interpretation rather than a literal depiction of events.
        </Paragraph>

        <SectionTitle>3. Product & Affiliate Content</SectionTitle>
        <Paragraph>
          Articles in the <strong>Products</strong> category may contain links
          to online marketplaces such as{" "}
          <a
            href="https://www.amazon.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Amazon
          </a>
          . These links are generated dynamically using open product data.{" "}
          <strong>CurioWire</strong> participates in the{" "}
          <strong>Amazon Associates Program</strong>, which means we may earn a
          small commission from qualifying purchases — at no additional cost to
          the reader.
        </Paragraph>

        <Paragraph>
          This model helps support hosting and continued platform development
          while maintaining a clean, ad-minimal reading experience.
        </Paragraph>

        <SectionTitle>4. Platform & Technology</SectionTitle>
        <Paragraph>
          CurioWire is built with <strong>Next.js</strong> and{" "}
          <strong>React</strong>, powered by{" "}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase
          </a>{" "}
          for data storage and analytics. The site is hosted via{" "}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel
          </a>
          , with Cloudflare managing DNS and email routing.
        </Paragraph>

        <Paragraph>
          Automated content pipelines run continuously in the background,
          ensuring new stories are published daily without manual intervention.
        </Paragraph>
      </Wrapper>
    </>
  );
}
