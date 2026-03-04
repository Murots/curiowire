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
    .replace(/>/g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parsePageParam(raw) {
  // Next kan gi string | string[]
  const v = Array.isArray(raw) ? raw[0] : raw;

  // Tillat "1" og "1.xml"
  const s = String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\.xml$/, "");

  // Kun positive heltall
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function GET(_req, { params }) {
  const pageNum = parsePageParam(params?.page);
  if (!pageNum) {
    // Litt mer nyttig feilmelding mens du tester
    return new NextResponse(
      `Invalid sitemap page (got: ${JSON.stringify(params?.page)})`,
      { status: 400 },
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl)
    return new NextResponse("Missing SUPABASE_URL", { status: 500 });
  if (!serviceKey)
    return new NextResponse("Missing SUPABASE_SERVICE_ROLE_KEY", {
      status: 500,
    });

  const supabase = createClient(supabaseUrl, serviceKey);

  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: cards, error } = await supabase
    .from("curiosity_cards")
    .select("id, created_at, updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return new NextResponse("Failed to fetch curiosity_cards", { status: 500 });
  }

  const now = new Date().toISOString();

  const extraOnFirstPage =
    pageNum === 1
      ? `
  <url>
    <loc>${xmlEscape(BASE_URL)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${CATEGORY_SLUGS.map(
  (slug) => `
  <url>
    <loc>${xmlEscape(`${BASE_URL}/${slug}`)}</loc>
    <lastmod>${now}</lastmod>
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
