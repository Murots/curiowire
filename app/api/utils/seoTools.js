// // === app/api/utils/seoTools.js ===
// // 🔍 CurioWire SEO tools — ping Google & Bing after sitemap updates

// const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
//   ? process.env.NEXT_PUBLIC_BASE_URL
//   : "https://curiowire.com";

// /**
//  * 🌍 Ping search engines when sitemap updates.
//  * Should be called AFTER article publish.
//  */
// export async function updateAndPingSearchEngines() {
//   try {
//     // Always ping the sitemap INDEX (preferred by Google/Bing)
//     const sitemapUrl = `${BASE_URL}/sitemap.xml`;

//     const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(
//       sitemapUrl,
//     )}`;
//     const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(
//       sitemapUrl,
//     )}`;

//     console.log(`🌐 Pinging search engines with sitemap: ${sitemapUrl}`);

//     const results = await Promise.allSettled([
//       fetch(googlePing),
//       fetch(bingPing),
//     ]);

//     results.forEach((res, i) => {
//       const engine = i === 0 ? "Google" : "Bing";
//       if (res.status === "fulfilled") {
//         console.log(`✅ ${engine} pinged successfully.`);
//       } else {
//         console.warn(`⚠️ ${engine} ping failed:`, res.reason?.message);
//       }
//     });

//     console.log("🚀 Sitemap ping completed.");
//   } catch (err) {
//     console.error("❌ updateAndPingSearchEngines error:", err.message);
//   }
// }

// === app/api/utils/seoTools.js ===
// 🔍 CurioWire SEO tools — notify logs after publish

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://curiowire.com";

/**
 * 🌍 Called after article publish.
 * Google no longer supports sitemap ping,
 * so we simply log the sitemap URL.
 */
export async function updateAndPingSearchEngines() {
  try {
    const sitemapUrl = `${BASE_URL}/sitemap.xml`;

    console.log("🌐 Sitemap updated:", sitemapUrl);
    console.log(
      "ℹ️ Google discovers updates automatically via sitemap + robots.txt",
    );
  } catch (err) {
    console.error("❌ SEO notification error:", err.message);
  }
}
