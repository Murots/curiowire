// components/EzoicScripts.jsx
import Script from "next/script";

export default function EzoicScripts() {
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
            // Some CMP implementations look for one of these keys.
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

      {/* 2) Ezoic core */}
      <Script
        src="https://www.ezojs.com/ezoic/sa.min.js"
        strategy="beforeInteractive"
      />
    </>
  );
}
