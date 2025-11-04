"use client";

import { Suspense } from "react";
import Script from "next/script";
import ThemeRegistry from "./ThemeRegistry";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import AnalyticsTracker from "../components/Analytics/AnalyticsTracker";
import EzoicScripts from "../components/EzoicScripts"; // 🧩 Ezoic client component

export const runtime = "nodejs";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* 📰 RSS Feed for crawlers and readers */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="CurioWire RSS Feed"
          href="https://curiowire.com/api/rss"
        />

        {/* 🧩 EZOIC PRIVACY + HEADER SCRIPTS */}
        <EzoicScripts />

        {/* 💨 Font Optimalisering */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="true"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@700&display=swap"
          rel="stylesheet"
        />

        {/* ✅ Google Analytics */}
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
      </head>

      <body>
        <ThemeRegistry>
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeRegistry>

        {/* 📈 Analytics Tracker */}
        <Suspense fallback={null}>
          <AnalyticsTracker GA_ID={GA_ID} />
        </Suspense>
      </body>
    </html>
  );
}
