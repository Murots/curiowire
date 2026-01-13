// lib/enrichment/factPackFormat.js

function cleanSummary(extract, maxLen = 500) {
  if (!extract) return null;
  const s = extract.replace(/\s+/g, " ").trim();
  return s.length > maxLen ? s.slice(0, maxLen).trim() + "…" : s;
}

export function buildFactPack({ topic, anchor, wiki, wikidata }) {
  const lines = [];

  lines.push("=== FACTPACK (ENRICHMENT) — VERIFIED OPEN SOURCES ===");
  lines.push(`Topic: ${topic || ""}`);
  if (anchor) lines.push(`Anchor hint: ${anchor}`);

  if (wiki?.title) {
    lines.push("");
    lines.push("FACTPACK: WIKIPEDIA");
    lines.push(`Canonical page: ${wiki.title}`);
    const summary = cleanSummary(wiki.extract);
    if (summary) lines.push(`Summary: ${summary}`);
    if (wiki.pageid) lines.push(`Page ID: ${wiki.pageid}`);
  }

  if (wikidata?.qid) {
    lines.push("");
    lines.push("FACTPACK: WIKIDATA");
    lines.push(`Entity: ${wikidata.label || ""} (${wikidata.qid})`);
    if (wikidata.instanceLabel) lines.push(`Type: ${wikidata.instanceLabel}`);
    if (wikidata.inception) lines.push(`Inception: ${wikidata.inception}`);
    if (wikidata.publicationDate)
      lines.push(`Publication date: ${wikidata.publicationDate}`);
    if (wikidata.pointInTime)
      lines.push(`Point in time: ${wikidata.pointInTime}`);
    if (wikidata.locationLabel)
      lines.push(`Location: ${wikidata.locationLabel}`);
    if (wikidata.countryLabel) lines.push(`Country: ${wikidata.countryLabel}`);
    if (wikidata.coord) lines.push(`Coordinates: ${wikidata.coord}`);
    // NB: ingen URL i artikler, men her er det bare i frame/pack internt
    // (du kan droppe officialSite helt hvis du vil være streng).
  }

  lines.push("");
  lines.push("ENRICHMENT RULES:");
  lines.push(
    "- The article may use ONLY facts listed above as additional factual grounding."
  );
  lines.push(
    "- If a detail is not present in either the original frame or this factpack, it must be treated as uncertain."
  );

  return lines.join("\n");
}
