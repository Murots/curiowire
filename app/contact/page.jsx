// app/contact/page.jsx
import ContactContent from "./ContactContent";

export const dynamic = "force-static";

/* === 🧠 SERVER-SIDE METADATA === */
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
      logo: { "@type": "ImageObject", url: image },
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
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      site: "@curiowire",
      title,
      description,
      images: [image],
    },
    other: { robots: "index,follow", "theme-color": "#95010e" },
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  };
}

export default function ContactPage() {
  return <ContactContent />;
}
