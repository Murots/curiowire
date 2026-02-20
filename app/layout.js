// app/layout.js
import "./globals.css";

import { Suspense } from "react";

import StyledComponentsRegistry from "./StyledComponentsRegistry";
import ThemeRegistry from "./ThemeRegistry";

import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import AnalyticsTracker from "../components/Analytics/AnalyticsTracker";
// import EzoicScripts from "../components/EzoicScripts";

import { Inter, Playfair_Display } from "next/font/google";

export const runtime = "nodejs";

// ✅ Next.js 16+: themeColor must be in `viewport` (not metadata)
export const viewport = {
  themeColor: "#95010e",
  colorScheme: "light",
};

// ✅ Keep your existing metadata object here (unchanged)
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
        {/* ✅ Analytics scripts (gtag/preconnect) are handled in app/head.jsx now */}
        {/* {isProd ? <EzoicScripts /> : null} */}

        <StyledComponentsRegistry>
          <ThemeRegistry>
            <Header />
            <main>{children}</main>
            {modal}
            <Footer />
          </ThemeRegistry>
        </StyledComponentsRegistry>

        {/* ✅ Keep tracker at the end of body */}
        <Suspense fallback={null}>
          <AnalyticsTracker GA_ID={GA_ID} />
        </Suspense>
      </body>
    </html>
  );
}
