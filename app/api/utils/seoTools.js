// === app/api/utils/seoTools.js ===
// 🔍 CurioWire SEO-verktøy – ping Google/Bing etter ny publisering

import { createClient } from "@supabase/supabase-js";

// Klargjør Supabase (beholdt for fremtidig logging, men ikke i bruk nå)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Bruk riktig base-URL (fra env, ellers produksjonsdomenet)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://curiowire.com";

/**
 * 🌍 Pinger Google og Bing når sitemap oppdateres.
 * Kalles fra /api/generate etter at artikler publiseres.
 */
export async function updateAndPingSearchEngines() {
  try {
    const sitemapUrl = `${BASE_URL}/api/sitemap`;

    const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(
      sitemapUrl
    )}`;
    const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(
      sitemapUrl
    )}`;

    console.log(`🌐 Pinging search engines with sitemap: ${sitemapUrl}`);

    // Utfør ping mot Google og Bing samtidig
    const responses = await Promise.allSettled([
      fetch(googlePing),
      fetch(bingPing),
    ]);

    // Resultathåndtering (uten Supabase-logging)
    for (let i = 0; i < responses.length; i++) {
      const engine = i === 0 ? "Google" : "Bing";
      const res = responses[i];

      if (res.status === "fulfilled") {
        console.log(`✅ ${engine} pinged successfully.`);
      } else {
        console.warn(`⚠️ ${engine} ping failed:`, res.reason?.message);
      }
    }

    console.log("🚀 Sitemap ping completed successfully!");
  } catch (err) {
    console.error("❌ updateAndPingSearchEngines error:", err.message);
  }
}
