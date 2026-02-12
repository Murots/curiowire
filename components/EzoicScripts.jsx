// components/EzoicScripts.jsx
import Script from "next/script";

const isProd = process.env.NODE_ENV === "production";

/**
 * Ezoic + Gatekeeper CMP
 * - Only load in production (avoid dev noise + avoid double-inject surprises)
 * - CMP should load early (beforeInteractive)
 * - Define globals early to prevent "_ezaq is not defined"
 */
export default function EzoicScripts() {
  if (!isProd) return null;

  return (
    <>
      {/* 0) Define globals EARLY to avoid "_ezaq is not defined" */}
      <Script
        id="ez-preinit"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window._ezaq = window._ezaq || [];
            window.ezstandalone = window.ezstandalone || {};
            window.ezstandalone.cmd = window.ezstandalone.cmd || [];

            // Try to force CMP language to English (avoid "Specified Language Not Found:no")
            window.__tcfapiLocale = "en";
            window.gatekeeperLocale = "en";
          `,
        }}
      />

      {/* 1) CMP scripts (load early) */}
      <Script
        src="https://cmp.gatekeeperconsent.com/min.js"
        data-cfasync="false"
        strategy="beforeInteractive"
      />
      <Script
        src="https://the.gatekeeperconsent.com/cmp.min.js"
        data-cfasync="false"
        strategy="beforeInteractive"
      />

      {/* 2) Ezoic core (load early; Ezoic expects to run soon) */}
      <Script
        src="https://www.ezojs.com/ezoic/sa.min.js"
        strategy="beforeInteractive"
      />
    </>
  );
}
