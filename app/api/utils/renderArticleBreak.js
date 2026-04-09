// ============================================================================
// app/api/utils/renderArticleBreak.js — CurioWire (RENDER ARTICLE BREAK)
// Goal: Render saved break metadata into HTML and optionally inject into card text.
// ============================================================================

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderArticleBreakHtml(articleBreak) {
  if (!articleBreak || !articleBreak.use_break) return "";
  const type = safeStr(articleBreak.break_type);

  if (!type || type === "none") return "";

  const payload = articleBreak.payload || {};

  if (type === "timeline") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length < 2) return "";

    const inner = items
      .map((item) =>
        `
<div class="cw-break__timeline-item">
  <div class="cw-break__timeline-label">${escapeHtml(item.label)}</div>
  <div class="cw-break__timeline-text">${escapeHtml(item.text)}</div>
</div>`.trim(),
      )
      .join("\n");

    return `
<aside class="cw-break cw-break--timeline" data-break-type="timeline" aria-label="Timeline">
  <div class="cw-break__inner">
    ${inner}
  </div>
</aside>
`.trim();
  }

  if (type === "quote") {
    const text = safeStr(payload.text);
    if (!text) return "";

    return `
<aside class="cw-break cw-break--quote" data-break-type="quote" aria-label="Highlighted quote">
  <blockquote class="cw-break__quote">${escapeHtml(text)}</blockquote>
</aside>
`.trim();
  }

  if (type === "hero_number") {
    const value = safeStr(payload.value);
    const label = safeStr(payload.label);
    const kicker = safeStr(payload.kicker);

    if (!value || !label) return "";

    return `
<aside class="cw-break cw-break--hero-number" data-break-type="hero_number" aria-label="Highlighted number">
  <div class="cw-break__hero-value">${escapeHtml(value)}</div>
  <div class="cw-break__hero-label">${escapeHtml(label)}</div>
  ${
    kicker
      ? `<div class="cw-break__hero-kicker">${escapeHtml(kicker)}</div>`
      : ""
  }
</aside>
`.trim();
  }

  if (type === "map_dot") {
    const place = safeStr(payload.place);
    const label = safeStr(payload.label);

    if (!place) return "";

    return `
<aside class="cw-break cw-break--map-dot" data-break-type="map_dot" aria-label="Location marker">
  <div class="cw-break__map-dot-marker" aria-hidden="true">●</div>
  <div class="cw-break__map-dot-place">${escapeHtml(place)}</div>
  ${
    label
      ? `<div class="cw-break__map-dot-label">${escapeHtml(label)}</div>`
      : ""
  }
</aside>
`.trim();
  }

  if (type === "factbox") {
    const title = safeStr(payload.title);
    const entityType = safeStr(payload.entity_type);
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!title || items.length < 2) return "";

    const inner = items
      .map((item) =>
        `
<div class="cw-break__fact-row">
  <div class="cw-break__fact-label">${escapeHtml(item.label)}</div>
  <div class="cw-break__fact-value">${escapeHtml(item.value)}</div>
</div>`.trim(),
      )
      .join("\n");

    return `
<aside class="cw-break cw-break--factbox" data-break-type="factbox" aria-label="Fact box">
  <div class="cw-break__factbox-head">
    <div class="cw-break__factbox-title">${escapeHtml(title)}</div>
    ${
      entityType
        ? `<div class="cw-break__factbox-type">${escapeHtml(entityType)}</div>`
        : ""
    }
  </div>
  <div class="cw-break__factbox-body">
    ${inner}
  </div>
</aside>
`.trim();
  }

  return "";
}

export function injectArticleBreakIntoCardText(cardText, articleBreak) {
  const html = String(cardText || "");
  const breakHtml = renderArticleBreakHtml(articleBreak);

  if (!html || !breakHtml) return html;

  const targetParagraph = Number(articleBreak?.insert_after_paragraph);
  if (!Number.isInteger(targetParagraph) || targetParagraph < 1) return html;

  let seen = 0;
  let inserted = false;

  const out = html.replace(/<p[\s\S]*?<\/p>/gi, (match) => {
    seen += 1;

    if (!inserted && seen === targetParagraph) {
      inserted = true;
      return `${match}\n${breakHtml}`;
    }

    return match;
  });

  return inserted ? out : `${html}\n${breakHtml}`;
}
