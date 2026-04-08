// app/api/og/article/[id]/route.js

/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 900;

async function getId(params) {
  const p = await Promise.resolve(params);
  return p?.id;
}

function cleanText(s) {
  return String(s || "")
    .replace(/&lt;\/?[^&]+&gt;/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchCard(id) {
  const sb = supabaseServer();

  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;

  const { data, error } = await sb
    .from("curiosity_cards")
    .select("id, title, seo_title, category, image_url")
    .eq("id", numericId)
    .eq("status", "published")
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function getImageDataUrl(url) {
  try {
    const res = await fetch(url, {
      cache: "force-cache",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/webp";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error("OG image fetch failed:", err);
    return null;
  }
}

export async function GET(_req, { params }) {
  try {
    const id = await getId(params);
    const card = await fetchCard(id);

    if (!card) {
      return new Response("Not found", { status: 404 });
    }

    const title = cleanText(card.seo_title || card.title || "CurioWire");
    const category = cleanText(card.category || "curiosity");
    const imageUrl = String(card.image_url || "").trim();

    const res = await fetch(imageUrl);
    const contentType = res.headers.get("content-type") || "unknown";

    if (!res.ok) {
      return new Response(
        `IMAGE FETCH FAILED
status=${res.status}
contentType=${contentType}
url=${imageUrl}`,
        { status: 500 },
      );
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const imageDataUrl = `data:${contentType};base64,${base64}`;

    return new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#111827",
          color: "white",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
        }}
      >
        {title} — {category} — {imageDataUrl ? "ok" : "no image"}
      </div>,
      { width: 1200, height: 630 },
    );
  } catch (err) {
    return new Response(
      `OG ROUTE ERROR
message=${err?.message || String(err)}
stack=${err?.stack || "no stack"}`,
      { status: 500 },
    );
  }
}
