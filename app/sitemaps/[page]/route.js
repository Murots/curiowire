// app/sitemaps/[page]/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BASE_URL = "https://curiowire.com";
const PAGE_SIZE = 1000;

const CATEGORY_SLUGS = [
  "science",
  "technology",
  "space",
  "nature",
  "health",
  "history",
  "culture",
  "sports",
  "products",
  "world",
  "crime",
  "mystery",
];

function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parsePageFromPathname(pathname) {
  // Godta:
  // /sitemaps/1
  // /sitemaps/1.xml
  const m = pathname.match(/^\/sitemaps\/(\d+)(?:\.xml)?$/);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function GET(req) {
  const { pathname } = new URL(req.url);

  // Canonical: alltid .xml
  // Redirect /sitemaps/1 -> /sitemaps/1.xml
  const canonicalMatch = pathname.match(/^\/sitemaps\/(\d+)$/);
  if (canonicalMatch) {
    return new Response(null, {
      status: 308,
      headers: {
        Location: `/sitemaps/${canonicalMatch[1]}.xml`,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const pageNum = parsePageFromPathname(pathname);
  if (!pageNum) {
    return new NextResponse("Invalid sitemap page", { status: 400 });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return new NextResponse("Missing SUPABASE_URL", { status: 500 });
  }
  if (!serviceKey) {
    return new NextResponse("Missing SUPABASE_SERVICE_ROLE_KEY", {
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Hent denne siden av artikler
  const { data: cards, error } = await supabase
    .from("curiosity_cards")
    .select("id, created_at, updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return new NextResponse("Failed to fetch curiosity_cards", { status: 500 });
  }

  // For forsiden/kategorier på første side: bruk sist endret artikkel som lastmod
  // (bedre enn "now" som får Google til å tro alt endrer seg konstant).
  const { data: latest, error: latestError } = await supabase
    .from("curiosity_cards")
    .select("updated_at, created_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return new NextResponse("Failed to fetch latest curiosity_card", {
      status: 500,
    });
  }

  const siteLastmod = new Date(
    latest?.updated_at || latest?.created_at || Date.now(),
  ).toISOString();

  // Kun på første sitemap-side: legg inn homepage + kategori-sider
  const extraOnFirstPage =
    pageNum === 1
      ? `
  <url>
    <loc>${xmlEscape(BASE_URL)}</loc>
    <lastmod>${siteLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${CATEGORY_SLUGS.map(
  (slug) => `
  <url>
    <loc>${xmlEscape(`${BASE_URL}/${slug}`)}</loc>
    <lastmod>${siteLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
).join("")}`
      : "";

  const articleUrls = (cards || [])
    .map((c) => {
      const lastmod = new Date(c.updated_at || c.created_at).toISOString();
      return `
  <url>
    <loc>${xmlEscape(`${BASE_URL}/article/${c.id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${extraOnFirstPage}
${articleUrls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
