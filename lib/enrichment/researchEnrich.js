// lib/enrichment/researchEnrich.js
import {
  wikiSearchTopTitle,
  wikiGetSummary,
  wikiGetWikidataQid,
} from "./wikipediaClient.js";
import { wikidataGetCoreFactsByQid } from "./wikidataClient.js";
import { buildFactPack } from "./factPackFormat.js";

function buildQuery(topic, anchor) {
  // Anchor kan være navnet på dataset/arkiv/objekt. Vi prøver å søke på "anchor + topic" først.
  const parts = [anchor, topic].filter(Boolean);
  return parts.join(" ");
}

export async function researchEnrich(topic, anchor) {
  const query = buildQuery(topic, anchor);

  const title = await wikiSearchTopTitle(query);
  if (!title) {
    return ""; // ✅ viktig: ingen factpack hvis ingen treff
  }

  const wiki = await wikiGetSummary(title);
  const qid = await wikiGetWikidataQid(title);

  let wd = null;
  if (qid) {
    wd = await wikidataGetCoreFactsByQid(qid);
  }

  return buildFactPack({ topic, anchor, wiki, wikidata: wd });
}
