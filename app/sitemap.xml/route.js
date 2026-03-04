// app/sitemap.xml/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BASE_URL = "https://curiowire.com";
const PAGE_SIZE = 1000;

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

  // 1) Tell antall publiserte artikler (for paginering)
  const { count, error: countError } = await supabase
    .from("curiosity_cards")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  if (countError) {
    return new NextResponse("Failed to count curiosity_cards", { status: 500 });
  }

  // 2) Finn siste oppdaterte publiserte artikkel (for bedre <lastmod>)
  //    NB: fall back til created_at hvis updated_at mangler.
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

  const total = Number(count) || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const lastmod = new Date(
    latest?.updated_at || latest?.created_at || Date.now(),
  ).toISOString();

  const sitemaps = Array.from({ length: pages }, (_, i) => {
    const n = i + 1;
    return `
  <sitemap>
    <loc>${xmlEscape(`${BASE_URL}/sitemaps/${n}.xml`)}</loc>
    <lastmod>${lastmod}</lastmod>
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
