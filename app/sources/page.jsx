// === app/sources/page.jsx ===
// 🧭 Sources & Methodology — CurioWire
export const dynamic = "force-static";

import Script from "next/script";
import {
  Wrapper,
  Headline,
  Paragraph,
  SectionTitle,
  List,
  ListItem,
} from "./sources.styles";

/* === 🧠 SERVER-SIDE METADATA (SEO) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/sources`;
  const image = `${baseUrl}/icon.png`;

  const title = "Sources & Methodology — CurioWire";
  const description =
    "Learn how CurioWire gathers, writes and illustrates stories using AI, open data and historical archives — full transparency on editorial process, imagery and affiliate model.";

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: "website",
      siteName: "CurioWire",
      title,
      description,
      url: pageUrl,
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
      site: "@curiowire",
      title,
      description,
      images: [image],
    },
    other: {
      robots: "index,follow",
      "theme-color": "#95010e",
    },
  };
}

/* === 🧩 PAGE COMPONENT === */
export default function SourcesPage() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/sources`;
  const image = `${baseUrl}/icon.png`;

  // ✅ Strukturerte data (nå synlige i HTML for Google)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Sources & Methodology — CurioWire",
    description:
      "Learn how CurioWire gathers, writes and illustrates stories using AI, open data and historical archives — full transparency on editorial process, imagery and affiliate model.",
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
    <Wrapper>
      {/* ✅ Structured data visible for Google */}
      <Script
        id="structured-data-sources"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <Headline>Sources & Methodology</Headline>

      <Paragraph>
        <strong>CurioWire</strong> combines artificial intelligence, open
        archives, and automated editorial tools to curate stories from around
        the world. Transparency is essential — below you’ll find how we gather,
        write, and illustrate each story published on this platform.
      </Paragraph>

      <SectionTitle>1. Data & Information Sources</SectionTitle>
      <Paragraph>
        The foundation of each article comes from a combination of open data,
        research archives and reputable publications. Our automated systems use
        trusted feeds such as:
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
        complex data into readable language, and recreate the tone of a classic
        newsroom report. All AI outputs are reviewed for factual alignment and
        clarity before publication.
      </Paragraph>

      <SectionTitle>2. Image Sources</SectionTitle>
      <Paragraph>
        Visual material on CurioWire is produced through a blend of automated
        generation and curated selection:
      </Paragraph>

      <List>
        <ListItem>
          • <strong>Unsplash API</strong> — for editorial-safe stock photography
          and Creative Commons imagery
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
        Articles in the <strong>Products</strong> category may contain links to
        online marketplaces such as{" "}
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
        </a>
        ,{" "}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
          Vercel
        </a>
        , and{" "}
        <a
          href="https://cloudflare.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare
        </a>
        . Automated pipelines ensure new stories are generated daily with
        minimal manual intervention.
      </Paragraph>
    </Wrapper>
  );
}
