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

    const hasImage = /^https?:\/\//i.test(imageUrl);

    let imageDataUrl = null;
    let debug = "ok";

    if (hasImage) {
      try {
        const res = await fetch(imageUrl);

        if (!res.ok) {
          debug = `fetch failed: ${res.status}`;
        } else {
          const contentType = res.headers.get("content-type") || "image/webp";
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");

          imageDataUrl = `data:${contentType};base64,${base64}`;
        }
      } catch (e) {
        debug = "fetch error: " + String(e.message || e);
      }
    } else {
      debug = "no image url";
    }

    return new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "630px",
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background: "#0f172a",
        }}
      >
        {imageDataUrl ? (
          <img
            src={imageDataUrl}
            alt=""
            width="1200"
            height="630"
            style={{
              position: "absolute",
              inset: 0,
              width: "1200px",
              height: "630px",
              objectFit: "contain",
              objectPosition: "center center",
            }}
          />
        ) : null}

        {/* overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.58))",
          }}
        />

        {/* TEXT */}
        <div
          style={{
            position: "absolute",
            left: "56px",
            right: "56px",
            bottom: "44px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ color: "#facc15", fontSize: 28 }}>CurioWire</div>
          <div style={{ color: "#ccc", fontSize: 22 }}>{category}</div>
          <div style={{ color: "white", fontSize: 48 }}>{title}</div>

          {/* 🔥 DEBUG TEXT */}
          <div
            style={{
              marginTop: "20px",
              color: "red",
              fontSize: 18,
            }}
          >
            DEBUG: {debug}
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (err) {
    return new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "black",
          color: "red",
          fontSize: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ERROR: {String(err.message || err)}
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  }
}
