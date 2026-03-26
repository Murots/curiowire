// === app/contact/page.jsx ===
// ✉️ Contact — CurioWire
export const dynamic = "force-static";

import Script from "next/script";
import ContactContent from "./ContactContent";

/* === 🧠 SERVER-SIDE METADATA (SEO) === */
export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/contact`;

  const title = "Contact — CurioWire";
  const description =
    "Reach out to the CurioWire editorial team. Send story tips, feedback or partnership inquiries — we welcome collaboration and curiosity.";
  const image = `${baseUrl}/icon.png`;

  return {
    title,
    description,

    alternates: { canonical: pageUrl },

    robots: {
      index: true,
      follow: true,
    },

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
  };
}

/* === 🧩 PAGE COMPONENT === */
export default function ContactPage() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/contact`;
  const image = `${baseUrl}/icon.png`;

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
      {
        "@type": "ListItem",
        position: 2,
        name: "Contact",
        item: pageUrl,
      },
    ],
  };

  // ✅ Structured data for ContactPage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact — CurioWire",
    description:
      "Reach out to the CurioWire editorial team. Send story tips, feedback or partnership inquiries — we welcome collaboration and curiosity.",
    url: pageUrl,
    publisher: {
      "@type": "Organization",
      name: "CurioWire",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: image,
        width: 512,
        height: 512,
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "editorial inquiries",
          email: "editor@curiowire.com",
          availableLanguage: ["English"],
        },
        {
          "@type": "ContactPoint",
          contactType: "media relations",
          email: "press@curiowire.com",
          availableLanguage: ["English"],
        },
      ],
    },
  };

  return (
    <>
      <Script
        id="structured-data-contact"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([structuredData, breadcrumbData]),
        }}
      />

      <ContactContent />
    </>
  );
}
