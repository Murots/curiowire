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
