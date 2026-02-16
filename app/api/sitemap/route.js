// === app/api/sitemap/route.js ===
// 📄 Dynamisk sitemap.xml generator for CurioWire (curiosity_cards)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Server-only Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// 🔒 Force canonical non-www base URL
const rawBase = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://curiowire.com";

// Remove www + trailing slash
const BASE_URL = rawBase.replace("://www.", "://").replace(/\/$/, "");

export async function GET() {
  try {
    const { data: cards, error } = await supabase
      .from("curiosity_cards")
      .select("id, created_at, updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "❌ Failed to fetch curiosity_cards for sitemap:",
        error.message,
      );
      return NextResponse.json(
        { error: "Failed to generate sitemap" },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();

    const urls = (cards || [])
      .map((c) => {
        const lastmod = new Date(c.updated_at || c.created_at).toISOString();
        return `
  <url>
    <loc>${BASE_URL}/article/${c.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        // Sitemap is XML; include charset for safety
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        // Optional but safe: prevents sitemap itself from being treated as a "search result page"
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("❌ Sitemap generation error:", err.message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
