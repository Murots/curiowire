// === app/contact/page.jsx ===
// ✉️ Contact — CurioWire
export const dynamic = "force-static";

import { Wrapper, Headline, Paragraph, MailLink } from "./contact.styles";

/* === 🧠 SERVER-SIDE METADATA (SEO + JSON-LD) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/contact`;

  const title = "Contact — CurioWire";
  const description =
    "Reach out to the CurioWire editorial team. Send story tips, feedback or partnership inquiries — we welcome collaboration and curiosity.";
  const image = `${baseUrl}/icon.png`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: title,
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
export default function ContactPage() {
  return (
    <Wrapper>
      <Headline>Contact the Editorial Desk</Headline>

      <Paragraph>
        <strong>CurioWire</strong> is an independent, AI-assisted editorial
        experiment — blending automation, design and curiosity. While much of
        our content is generated autonomously, we still welcome human contact,
        ideas, and perspectives.
      </Paragraph>

      <Paragraph>
        For story suggestions, factual corrections, or general inquiries, please
        contact us directly at:
      </Paragraph>

      <MailLink href="mailto:editor@curiowire.com">
        editor@curiowire.com
      </MailLink>

      <Paragraph>
        We aim to respond to relevant inquiries within a few business days.
        Automated or promotional submissions will be filtered.
      </Paragraph>
    </Wrapper>
  );
}
