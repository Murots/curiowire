// === TEXT HELPERS (identisk logikk) ===
export function trimHeadline(title) {
  const words = title.split(" ");
  return words.length > 12 ? words.slice(0, 12).join(" ") + "…" : title;
}
