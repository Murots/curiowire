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
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/webp";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return `data:${contentType};base64,${base64}`;
  } catch {
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

    const imageDataUrl = /^https?:\/\//i.test(imageUrl)
      ? await getImageDataUrl(imageUrl)
      : null;

    return new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "630px",
          position: "relative",
          display: "flex",
          flexDirection: "row",
          background:
            "linear-gradient(135deg, #081227 0%, #0c1b3a 45%, #13233f 100%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "56%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "34px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "26px",
              borderRadius: "28px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
            }}
          />

          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt=""
              width="560"
              height="420"
              style={{
                maxWidth: "560px",
                maxHeight: "420px",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center center",
                position: "relative",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.45)",
                fontSize: 28,
                position: "relative",
              }}
            >
              CurioWire
            </div>
          )}
        </div>

        <div
          style={{
            width: "44%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "54px 56px 54px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              marginBottom: "18px",
              color: "#facc15",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            CurioWire
          </div>

          <div
            style={{
              display: "flex",
              marginBottom: "16px",
              color: "rgba(255,255,255,0.78)",
              fontSize: 24,
              fontWeight: 500,
              textTransform: "capitalize",
            }}
          >
            {category}
          </div>

          <div
            style={{
              display: "flex",
              color: "white",
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.08,
              textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            }}
          >
            {title}
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify(
        {
          error: err?.message || String(err),
          stack: err?.stack || null,
        },
        null,
        2,
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  }
}
