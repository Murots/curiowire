"use client";
import Script from "next/script";

export default function EzoicScripts() {
  return (
    <>
      {/* 🧩 Ezoic Privacy Scripts – må lastes først */}
      <Script
        src="https://cmp.gatekeeperconsent.com/min.js"
        data-cfasync="false"
        strategy="beforeInteractive"
        suppressHydrationWarning
      />
      <Script
        src="https://the.gatekeeperconsent.com/cmp.min.js"
        data-cfasync="false"
        strategy="beforeInteractive"
        suppressHydrationWarning
      />

      {/* 🧩 Hoved Header Script */}
      <Script
        async
        src="//www.ezojs.com/ezoic/sa.min.js"
        strategy="beforeInteractive"
        suppressHydrationWarning
      />

      {/* 🧩 Init Script */}
      <Script
        id="ez-init"
        strategy="beforeInteractive"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            window.ezstandalone = window.ezstandalone || {};
            window.ezstandalone.cmd = window.ezstandalone.cmd || [];
          `,
        }}
      />
    </>
  );
}
