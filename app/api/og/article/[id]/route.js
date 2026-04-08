// app/api/og/article/[id]/route.js
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

export async function GET(_req, { params }) {
  const id = await getId(params);
  const card = await fetchCard(id);

  if (!card) {
    return new Response("Not found", { status: 404 });
  }

  const title = cleanText(card.seo_title || card.title || "CurioWire");
  const category = cleanText(card.category || "curiosity");
  const imageUrl = String(card.image_url || "").trim();
  const hasImage = /^https?:\/\//i.test(imageUrl);

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
      {hasImage ? (
        <img
          src={imageUrl}
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
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(135deg, #0f172a 0%, #111827 45%, #1f2937 100%)",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.58))",
        }}
      />

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
            marginBottom: "14px",
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
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.08,
            textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            maxWidth: "1000px",
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
}
