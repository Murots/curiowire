"use client";

import Head from "next/head";
import { Wrapper, Headline, Paragraph, Highlight } from "./about.styles";

export default function AboutPage() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/about`;

  const title = "About CurioWire — AI Journalism Meets Vintage Design";
  const description =
    "CurioWire blends AI journalism with timeless editorial craftsmanship — rediscovering the world’s curiosities, one story at a time.";
  const image = `${baseUrl}/icon.png`;

  // 🧠 Strukturert data (schema.org)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About CurioWire",
    description,
    url: pageUrl,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: image,
      },
    },
    mainEntity: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      foundingDate: "2025",
      description:
        "CurioWire is a digital newspaper built on automation, design and curiosity — merging AI journalism with vintage editorial aesthetics.",
    },
  };

  return (
    <>
      <Head>
        {/* 🧭 Primary SEO Metadata */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content="About CurioWire, AI journalism, digital newspaper, automated news, vintage design, editorial craft"
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
        <Headline>About CurioWire</Headline>

        <Paragraph>
          <Highlight>CurioWire</Highlight> is a digital newspaper built on
          automation, design and curiosity. Inspired by early twentieth-century
          editorial craft, it reimagines how stories are found, written and
          shared — blending algorithmic precision with the tone of classic
          print.
        </Paragraph>

        <Paragraph>
          Founded in <strong>2025</strong>, CurioWire began as an experiment in
          automated journalism. The idea was simple: could artificial
          intelligence rediscover the forgotten wonders of science, history and
          culture — and tell them as if reported from a bustling newsroom a
          century ago?
        </Paragraph>

        <Paragraph>
          Each story is collected from public data archives, re-written with
          editorial balance, and presented with a deliberate visual calm. The
          goal: to celebrate knowledge, invention and the timeless art of human
          curiosity.
        </Paragraph>

        <Paragraph>
          Every headline published by CurioWire seeks the same thing — that
          small spark of wonder that once made people stop, read, and say:
          <em> “Now that’s curious.”</em>
        </Paragraph>
      </Wrapper>
    </>
  );
}
