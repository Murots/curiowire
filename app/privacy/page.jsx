export const dynamic = "force-static";

import Head from "next/head";
import {
  Wrapper,
  Headline,
  Paragraph,
  SectionTitle,
  List,
  ListItem,
} from "./privacy.styles";

export default function PrivacyPage() {
  const baseUrl = "https://curiowire.com";
  const pageUrl = `${baseUrl}/privacy`;
  const image = `${baseUrl}/icon.png`;

  const title = "Privacy Policy — CurioWire";
  const description =
    "Learn how CurioWire collects, stores, and uses information across its AI-driven publishing platform. GDPR-compliant privacy and data policy for all visitors.";

  // 🧠 Strukturert data (schema.org PrivacyPolicy)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "PrivacyPolicy",
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
        contactType: "privacy inquiries",
        email: "editor@curiowire.com",
        availableLanguage: ["English"],
      },
    },
    mainEntity: [
      {
        "@type": "WebPageElement",
        name: "Information We Collect",
        text: "CurioWire collects limited technical data such as standard logs, cookies, and aggregated interaction metrics. No user registration or personal submission is required.",
      },
      {
        "@type": "WebPageElement",
        name: "Cookies & Analytics",
        text: "CurioWire uses minimal cookies for analytics and optimization. Third-party providers like Google AdSense or Ezoic may use cookies for ad performance and fraud prevention.",
      },
      {
        "@type": "WebPageElement",
        name: "Affiliate Disclosure",
        text: "As an Amazon Associate, CurioWire earns from qualifying purchases made through affiliate links in product-related articles.",
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
          content="CurioWire privacy policy, data protection, GDPR, cookies, analytics, AI publishing, Amazon affiliate disclosure"
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

        {/* 🧠 Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </Head>

      <Wrapper>
        <Headline>Privacy Policy</Headline>

        <Paragraph>
          This Privacy Policy explains how <strong>CurioWire</strong> collects,
          uses, and protects personal information when you visit our website or
          interact with our content. We are committed to transparency and to
          handling all data in accordance with the{" "}
          <strong>General Data Protection Regulation (GDPR)</strong> and other
          applicable privacy laws.
        </Paragraph>

        <SectionTitle>1. Information We Collect</SectionTitle>
        <Paragraph>
          CurioWire itself does not require user registration or direct data
          submission. However, certain technical and analytical data may be
          collected automatically:
        </Paragraph>
        <List>
          <ListItem>
            • Standard log data (IP address, browser type, device)
          </ListItem>
          <ListItem>
            • Cookie and analytics data (via Google Analytics or Ezoic)
          </ListItem>
          <ListItem>
            • Aggregated interaction metrics (page views, read time, etc.)
          </ListItem>
        </List>

        <Paragraph>
          When contacting us directly by email, the message and address you use
          are stored solely for the purpose of responding to your inquiry.
        </Paragraph>

        <SectionTitle>2. Cookies & Analytics</SectionTitle>
        <Paragraph>
          CurioWire uses limited cookies for analytics and advertising
          optimization. These cookies help us understand visitor trends and
          improve performance. Third-party networks (such as Google AdSense or
          Ezoic) may set their own cookies to measure ad performance and prevent
          fraud.
        </Paragraph>

        <Paragraph>
          You may control or delete cookies in your browser settings at any
          time. Disabling cookies will not affect access to the site.
        </Paragraph>

        <SectionTitle>3. Advertising & Affiliate Links</SectionTitle>
        <Paragraph>
          Articles in the <strong>Products</strong> category may include
          affiliate links to marketplaces such as{" "}
          <a
            href="https://www.amazon.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Amazon
          </a>
          . As an <strong>Amazon Associate</strong>, CurioWire earns a small
          commission from qualifying purchases, at no additional cost to users.
          These links may contain anonymized tracking codes solely used for
          attribution.
        </Paragraph>

        <SectionTitle>4. Data Storage & Security</SectionTitle>
        <Paragraph>
          CurioWire’s infrastructure runs on secure cloud platforms including{" "}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase
          </a>
          ,{" "}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel
          </a>
          , and <a href="https://cloudflare.com">Cloudflare</a>. We do not sell,
          trade, or rent personal information to any third party. Access to
          stored logs and analytics is restricted to essential administrators
          only.
        </Paragraph>

        <SectionTitle>5. Your Rights</SectionTitle>
        <Paragraph>
          Under the GDPR, visitors from the EU and EEA have the right to:
        </Paragraph>
        <List>
          <ListItem>• Request access to personal data held about you</ListItem>
          <ListItem>• Request correction or deletion of such data</ListItem>
          <ListItem>
            • Object to data processing for marketing purposes
          </ListItem>
        </List>
        <Paragraph>
          To exercise any of these rights, please contact us at{" "}
          <a href="mailto:editor@curiowire.com">editor@curiowire.com</a>.
        </Paragraph>

        <SectionTitle>6. External Links</SectionTitle>
        <Paragraph>
          Our articles may link to external websites. CurioWire is not
          responsible for the content or privacy practices of those sites. We
          encourage readers to review the privacy statements of any linked
          resources.
        </Paragraph>

        <SectionTitle>7. Updates to This Policy</SectionTitle>
        <Paragraph>
          This policy may be updated periodically to reflect changes in our
          operations or legal requirements. The date of the latest revision will
          always be displayed below.
        </Paragraph>

        <Paragraph>
          <em>Last updated: {new Date().getFullYear()}</em>
        </Paragraph>
      </Wrapper>
    </>
  );
}
