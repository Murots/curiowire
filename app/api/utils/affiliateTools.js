// === Affiliate verktøy for CurioWire ===
// Bygger en lovlig, gratis søkelenke til Amazon med affiliate-tag

export function makeAffiliateSearchLink(productName) {
  if (!productName) return null;
  const encoded = encodeURIComponent(productName.trim());
  const tag = process.env.AMAZON_AFFILIATE_TAG || "curiowire20-20";
  return `https://www.amazon.com/s?k=${encoded}&tag=${tag}`;
}
