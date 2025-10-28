// === app/api/sitemap/route.js ===
// 📄 Dynamisk sitemap generator for CurioWire

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://curiowire.com";

export async function GET() {
  try {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, category, created_at, title")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Failed to fetch articles for sitemap:", error.message);
      return NextResponse.json(
        { error: "Failed to generate sitemap" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const urls = articles
      .map(
        (a) => `
        <url>
          <loc>${BASE_URL}/article/${a.id}</loc>
          <lastmod>${new Date(a.created_at).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>`
      )
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
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("❌ Sitemap generation error:", err.message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
