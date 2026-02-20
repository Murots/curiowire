// app/head.jsx
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function Head() {
  return (
    <>
      {/* ✅ Preconnect for raskere bilder på forsiden */}
      <link
        rel="preconnect"
        href="https://qshftfehnecovxxgldsc.supabase.co"
        crossOrigin=""
      />

      {/* ✅ Preconnect for GA (bedre enn preload av gtag) */}
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="preconnect" href="https://www.google-analytics.com" />

      {/* ✅ GA lastes etter interaktivitet (som før) */}
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
    </>
  );
}
