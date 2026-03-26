// lib/categoryColors.js
export const categoryColors = {
  science: "#005ae0",
  space: "#9d00db",
  history: "#b07a22",
  nature: "#008f45",
  world: "#c90500",
  technology: "#0099d9",
  culture: "#e84f1b",
  health: "#c8006a",
  sports: "#009f80",
  products: "#e6b800",
  crime: "#775232",
  mystery: "#00d6d6",
};

export function getCategoryColor(category) {
  return categoryColors[String(category || "").toLowerCase()] || null;
}
