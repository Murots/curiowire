import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BASE_URL = "https://curiowire.com";
const PAGE_SIZE = 1000; // 1000 URL-er per sitemap-fil (trygt og raskt)

function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
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

  // Teller hvor mange publiserte artikler du har
  const { count, error } = await supabase
    .from("curiosity_cards")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  if (error) {
    return new NextResponse("Failed to count curiosity_cards", { status: 500 });
  }

  const total = Number(count) || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = new Date().toISOString();

  const sitemaps = Array.from({ length: pages }, (_, i) => {
    const n = i + 1;
    return `
  <sitemap>
    <loc>${xmlEscape(`${BASE_URL}/sitemap/${n}.xml`)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`;
  }).join("");

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new NextResponse(indexXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
