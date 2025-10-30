import Script from "next/script";
import ThemeRegistry from "./ThemeRegistry";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import AnalyticsTracker from "../components/AnalyticsTracker"; // 👈 NYTT

// 🧠 GA ID fra .env
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata = {
  title: "CurioWire",
  description: "Extra! Extra! The world's curiosities — hot off the wire.",
  openGraph: {
    title: "CurioWire",
    description:
      "Explore remarkable, AI-generated stories and hidden histories — updated daily.",
    url: "https://curiowire.com",
    siteName: "CurioWire",
    images: [
      {
        url: "https://curiowire.com/icon.png",
        width: 512,
        height: 512,
        alt: "CurioWire logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@curiowire",
    title: "CurioWire",
    description:
      "Explore remarkable, AI-generated stories and hidden histories — updated daily.",
    images: ["https://curiowire.com/icon.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        <meta name="robots" content="index,follow" />
        <meta name="author" content="CurioWire" />
        <link rel="canonical" href="https://curiowire.com/" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
      </head>

      <body>
        <ThemeRegistry>
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeRegistry>

        {/* 📊 GA-sporing (klientkomponent) */}
        <AnalyticsTracker GA_ID={GA_ID} />
      </body>
    </html>
  );
}
