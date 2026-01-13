// lib/enrichment/wikipediaClient.js
const WIKI_REST = "https://en.wikipedia.org/api/rest_v1";
const WIKI_API = "https://en.wikipedia.org/w/api.php";

function uaHeaders() {
  return {
    "User-Agent": process.env.CURIOWIRE_UA || "CurioWireBot/1.0",
    Accept: "application/json",
  };
}

export async function wikiSearchTopTitle(query) {
  const url = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&srlimit=1&utf8=1&origin=*`;

  const res = await fetch(url, { headers: uaHeaders() });
  if (!res.ok) return null;
  const json = await res.json();
  const hit = json?.query?.search?.[0];
  return hit?.title || null;
}

export async function wikiGetSummary(title) {
  const url = `${WIKI_REST}/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: uaHeaders() });
  if (!res.ok) return null;
  const json = await res.json();

  return {
    title: json?.title || title,
    extract: json?.extract || null,
    pageid: json?.pageid || null,
  };
}

export async function wikiGetWikidataQid(title) {
  const url = `${WIKI_API}?action=query&prop=pageprops&titles=${encodeURIComponent(
    title
  )}&format=json&origin=*`;

  const res = await fetch(url, { headers: uaHeaders() });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = json?.query?.pages || {};
  const firstPage = Object.values(pages)[0];
  return firstPage?.pageprops?.wikibase_item || null; // e.g. "Q42"
}
