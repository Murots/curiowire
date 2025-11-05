// "use client";
// import { useEffect, useState } from "react";
// import Script from "next/script";

// export default function EzoicScripts() {
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     // Sørg for at scriptene kun lastes på klienten, etter mount
//     setMounted(true);
//   }, []);

//   if (!mounted) return null;

//   return (
//     <>
//       <Script
//         src="https://cmp.gatekeeperconsent.com/min.js"
//         strategy="beforeInteractive"
//         data-cfasync="false"
//       />
//       <Script
//         src="https://the.gatekeeperconsent.com/cmp.min.js"
//         strategy="beforeInteractive"
//         data-cfasync="false"
//       />
//       <Script
//         async
//         src="//www.ezojs.com/ezoic/sa.min.js"
//         strategy="beforeInteractive"
//       />
//       <Script id="ezoic-init" strategy="beforeInteractive">
//         {`
//           window.ezstandalone = window.ezstandalone || {};
//           ezstandalone.cmd = ezstandalone.cmd || [];
//           console.log("✅ Ezoic scripts loaded");
//         `}
//       </Script>
//     </>
//   );
// }
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
      />
      <Script
        src="https://the.gatekeeperconsent.com/cmp.min.js"
        data-cfasync="false"
        strategy="beforeInteractive"
      />

      {/* 🧩 Hoved Header Script */}
      <Script
        async
        src="//www.ezojs.com/ezoic/sa.min.js"
        strategy="beforeInteractive"
      />

      {/* 🧩 Init Script */}
      <Script id="ez-init" strategy="beforeInteractive">
        {`
          window.ezstandalone = window.ezstandalone || {};
          ezstandalone.cmd = ezstandalone.cmd || [];
        `}
      </Script>
    </>
  );
}
