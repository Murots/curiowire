// app/layout.js
import { Suspense } from "react";
import Script from "next/script";
import ThemeRegistry from "./ThemeRegistry";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import AnalyticsTracker from "../components/Analytics/AnalyticsTracker";
import EzoicScripts from "../components/EzoicScripts";

export const runtime = "nodejs";

export const metadata = {
  metadataBase: new URL("https://curiowire.com"),
  title: {
    default: "CurioWire",
    template: "%s — CurioWire",
  },
  description:
    "A living feed of AI-generated curiosities across science, history, nature, technology and more — updated daily.",
  alternates: {
    canonical: "https://curiowire.com",
    types: {
      "application/rss+xml": "https://curiowire.com/api/rss",
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const isProd = process.env.NODE_ENV === "production";

export default function RootLayout({ children, modal }) {
  return (
    <html lang="en">
      <body>
        {/* Ezoic/CMP: only in production (avoid localhost console noise) */}
        {isProd ? <EzoicScripts /> : null}

        {/* GA: ok in layout body */}
        {GA_ID ? (
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
                gtag('config', '${GA_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        ) : null}

        <ThemeRegistry>
          <Header />
          <main>{children}</main>

          {/* Modal-slot */}
          {modal}

          <Footer />
        </ThemeRegistry>

        <Suspense fallback={null}>
          <AnalyticsTracker GA_ID={GA_ID} />
        </Suspense>
      </body>
    </html>
  );
}
