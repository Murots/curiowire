// app/layout.js
import "./globals.css";

import { Suspense } from "react";
import Script from "next/script";

import StyledComponentsRegistry from "./StyledComponentsRegistry";
import ThemeRegistry from "./ThemeRegistry";

import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import AnalyticsTracker from "../components/Analytics/AnalyticsTracker";
// import EzoicScripts from "../components/EzoicScripts";

import { Inter, Playfair_Display } from "next/font/google";

export const runtime = "nodejs";

export const viewport = {
  themeColor: "#95010e",
  colorScheme: "light",
};

export const metadata = {
  /* ... uendret ... */
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
// const isProd = process.env.NODE_ENV === "production";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

export default function RootLayout({ children, modal }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        {/* {isProd ? <EzoicScripts /> : null} */}

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

        <StyledComponentsRegistry>
          <ThemeRegistry>
            <Header />
            <main>{children}</main>
            {modal}
            <Footer />
          </ThemeRegistry>
        </StyledComponentsRegistry>

        <Suspense fallback={null}>
          <AnalyticsTracker GA_ID={GA_ID} />
        </Suspense>
      </body>
    </html>
  );
}
