// lib/enrichment/wikidataClient.js
const WD_SPARQL = "https://query.wikidata.org/sparql";

function uaHeaders() {
  return {
    "User-Agent": process.env.CURIOWIRE_UA || "CurioWireBot/1.0",
    Accept: "application/sparql-results+json",
  };
}

async function sparql(query) {
  const url = `${WD_SPARQL}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: uaHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function wikidataGetCoreFactsByQid(qid) {
  // P31 = instance of, P571 = inception, P577 = publication date, P585 = point in time
  // P17 = country, P276 = location, P625 = coordinates, P856 = official website
  const query = `
SELECT ?label ?instanceLabel ?inception ?pubDate ?pointInTime ?countryLabel ?locationLabel ?coord ?officialSite WHERE {
  wd:${qid} rdfs:label ?label FILTER (lang(?label) = "en") .

  OPTIONAL { wd:${qid} wdt:P31 ?instance . }
  OPTIONAL { wd:${qid} wdt:P571 ?inception . }
  OPTIONAL { wd:${qid} wdt:P577 ?pubDate . }
  OPTIONAL { wd:${qid} wdt:P585 ?pointInTime . }
  OPTIONAL { wd:${qid} wdt:P17 ?country . }
  OPTIONAL { wd:${qid} wdt:P276 ?location . }
  OPTIONAL { wd:${qid} wdt:P625 ?coord . }
  OPTIONAL { wd:${qid} wdt:P856 ?officialSite . }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1`;

  const json = await sparql(query);
  const row = json?.results?.bindings?.[0];
  if (!row) return null;

  const val = (k) => row?.[k]?.value || null;

  return {
    qid,
    label: val("label"),
    instanceLabel: val("instanceLabel"),
    inception: val("inception"),
    publicationDate: val("pubDate"),
    pointInTime: val("pointInTime"),
    countryLabel: val("countryLabel"),
    locationLabel: val("locationLabel"),
    coord: val("coord"),
    officialSite: val("officialSite"),
  };
}
