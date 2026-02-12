// components/CurioCard/ServerCurioCard.jsx
import Link from "next/link";
import { cleanText } from "@/app/api/utils/cleanText";

// Reuse SSR-safe helpers (copy/paste)
function extractSummaryWhatSSR(html) {
  const s = String(html || "");
  const m = s.match(/<span[^>]*data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return "";
  const raw = m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function formatDateUTC(dateInput) {
  const d = new Date(dateInput);
  if (!Number.isFinite(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const monthIdx = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[monthIdx] || ""} ${year}`;
}

export default function ServerCurioCard({ card }) {
  const { id, category, title, summary_normalized, image_url, created_at } =
    card || {};

  const href = `/article/${id}`;
  const ingress = extractSummaryWhatSSR(summary_normalized);
  const date = formatDateUTC(created_at);

  return (
    <li style={{ marginBottom: 14 }}>
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ fontWeight: 800, lineHeight: 1.2 }}>
          {cleanText(title)}
        </div>

        <div style={{ opacity: 0.75, marginTop: 6 }}>
          <span style={{ textTransform: "lowercase" }}>{category}</span>
          {date ? <span> · {date}</span> : null}
        </div>

        {ingress ? (
          <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.35 }}>
            {ingress}
          </div>
        ) : null}

        {/* valgfritt: bilde (men ikke nødvendig for SEO) */}
        {image_url ? (
          <img
            src={`${image_url}?width=900&quality=70&format=webp`}
            alt={cleanText(title)}
            loading="lazy"
            decoding="async"
            style={{
              marginTop: 10,
              width: "100%",
              height: "auto",
              borderRadius: 12,
              display: "block",
            }}
          />
        ) : null}
      </Link>
    </li>
  );
}
