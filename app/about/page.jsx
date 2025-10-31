// === app/about/page.jsx ===
// 📰 About CurioWire — AI Journalism Meets Vintage Design
export const dynamic = "force-static";

import { Wrapper, Headline, Paragraph, Highlight } from "./about.styles";

/* === 🧠 SERVER-SIDE METADATA (SEO + JSON-LD) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/about`;

  const title = "About CurioWire — AI Journalism Meets Vintage Design";
  const description =
    "CurioWire blends AI journalism with timeless editorial craftsmanship — rediscovering the world’s curiosities, one story at a time.";
  const image = `${baseUrl}/icon.png`;

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
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  };
}

/* === 🧩 PAGE COMPONENT === */
export default function AboutPage() {
  return (
    <Wrapper>
      <Headline>About CurioWire</Headline>

      <Paragraph>
        <Highlight>CurioWire</Highlight> is a digital newspaper built on
        automation, design and curiosity. Inspired by early twentieth-century
        editorial craft, it reimagines how stories are found, written and shared
        — blending algorithmic precision with the tone of classic print.
      </Paragraph>

      <Paragraph>
        Founded in <strong>2025</strong>, CurioWire began as an experiment in
        automated journalism. The idea was simple: could artificial intelligence
        rediscover the forgotten wonders of science, history and culture — and
        tell them as if reported from a bustling newsroom a century ago?
      </Paragraph>

      <Paragraph>
        Each story is collected from public data archives, re-written with
        editorial balance, and presented with a deliberate visual calm. The
        goal: to celebrate knowledge, invention and the timeless art of human
        curiosity.
      </Paragraph>

      <Paragraph>
        Every headline published by CurioWire seeks the same thing — that small
        spark of wonder that once made people stop, read, and say:
        <em> “Now that’s curious.”</em>
      </Paragraph>
    </Wrapper>
  );
}
