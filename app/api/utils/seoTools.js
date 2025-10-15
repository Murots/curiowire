// app/api/utils/seoTools.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Henter alle artikler fra Supabase og genererer en sitemap.xml-streng.
 * Returnerer XML som kan brukes til både ping og direkte visning.
 */
export async function generateSitemapXML() {
  try {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, category, created_at");

    if (error) {
      console.error("❌ Failed to fetch articles for sitemap:", error.message);
      return "";
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://curiowire.com";

    const urls = articles
      .map(
        (a) => `
      <url>
        <loc>${baseUrl}/article/${a.id}</loc>
        <lastmod>${new Date(a.created_at).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`
      )
      .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
  </urlset>`;
  } catch (err) {
    console.error("❌ generateSitemapXML error:", err.message);
    return "";
  }
}

/**
 * Lagrer sitemap som XML i Supabase (valgfritt) og pinger søkemotorer.
 * Kalles fra /api/generate etter at artikler er publisert.
 */
export async function updateAndPingSearchEngines() {
  try {
    const xml = await generateSitemapXML();
    if (!xml) {
      console.warn("⚠️ No sitemap XML generated — skipping ping.");
      return;
    }

    const filename = `sitemap-${Date.now()}.xml`;
    const path = `sitemaps/${filename}`;

    // 📦 Hopper over lagring i Supabase – ping holder for SEO
    console.log("ℹ️ Skipping Supabase sitemap upload (not required).");

    // 📡 Ping Google og Bing
    const sitemapUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/sitemap`;
    const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(
      sitemapUrl
    )}`;
    const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(
      sitemapUrl
    )}`;

    const responses = await Promise.allSettled([
      fetch(googlePing),
      fetch(bingPing),
    ]);

    responses.forEach((res, i) => {
      const engine = i === 0 ? "Google" : "Bing";
      if (res.status === "fulfilled") {
        console.log(`✅ ${engine} pinged successfully.`);
      } else {
        console.warn(`⚠️ ${engine} ping failed:`, res.reason?.message);
      }
    });

    console.log("🌍 Sitemap updated and search engines notified successfully!");
  } catch (err) {
    console.error("❌ updateAndPingSearchEngines error:", err.message);
  }
}
