export function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeAss(text) {
  if (!text) return "";
  return text.replace(/[{}\\]/g, "");
}
