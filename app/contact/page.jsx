"use client";

import Head from "next/head";
import { Wrapper, Headline, Paragraph, MailLink } from "./contact.styles";

export default function ContactPage() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/contact`;

  const title = "Contact — CurioWire";
  const description =
    "Reach out to the CurioWire editorial team. Send story tips, feedback or partnership inquiries — we welcome collaboration and curiosity.";
  const image = `${baseUrl}/icon.png`;

  // 🧠 Strukturert data (schema.org)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact — CurioWire",
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
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "editorial inquiries",
        email: "editor@curiowire.com",
        availableLanguage: ["English"],
      },
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
          content="CurioWire contact, editorial inquiries, AI journalism, press contact, story tips, feedback"
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
        <Headline>Contact the Editorial Desk</Headline>

        <Paragraph>
          <strong>CurioWire</strong> is an independent, AI-assisted editorial
          experiment — blending automation, design and curiosity. While much of
          our content is generated autonomously, we still welcome human contact,
          ideas, and perspectives.
        </Paragraph>

        <Paragraph>
          For story suggestions, factual corrections, or general inquiries,
          please contact us directly at:
        </Paragraph>

        <MailLink href="mailto:editor@curiowire.com">
          editor@curiowire.com
        </MailLink>

        <Paragraph>
          We aim to respond to relevant inquiries within a few business days.
          Automated or promotional submissions will be filtered.
        </Paragraph>
      </Wrapper>
    </>
  );
}
