// // === lib/imageSelector.js ===
// // CurioWire Smart Image Selector v6.0 (2026)
// // - Billig & presist, *uten* Vision
// // - Beholder eksisterende "core noun"-gren
// // - Legger til ny GPT-spesifikk gren (maksimalt konkret motiv hvis artikkelen støtter det)
// // - Felles finalerunde på tvers av begge grener
// // - 6 bilder per provider (18 totalt maks per query)
// // - Ren tekst/metadata-basert scoring (alt-text, title, tags, URL)
// // - Filtrerer vekk åpenbare feil (kart, flagg, logoer, ikoner, for små bilder)
// // - DALL·E-fallback + Supabase caching via imageTools.js

// import OpenAI from "openai";
// import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
// import { categories } from "../app/api/utils/categories.js";

// // ============================================================================
// // 🔧 Config
// // ============================================================================
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-5.4-mini";
// const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
// const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

// export const MIN_ACCEPTABLE_SCORE = 75;

// // ============================================================================
// // 📜 Attribution builder for Wikimedia images
// // ============================================================================
// function buildAttribution(cand) {
//   if (cand.provider !== "Wikimedia") return null;

//   const artist = cand.artist || "Unknown author";
//   const license = cand.license || "Unknown license";
//   const licenseUrl = cand.licenseUrl || "";

//   return `Image: ${artist}, License: ${license}${
//     licenseUrl ? ` (${licenseUrl})` : ""
//   }`;
// }

// // ============================================================================
// // 🔹 Generic JSON helper for Responses API
// // ============================================================================
// async function runImageJSON({ prompt, schema, schemaName = "image_task" }) {
//   const res = await openai.responses.create({
//     model: IMAGE_MODEL,
//     reasoning: { effort: "low" },
//     text: {
//       format: {
//         type: "json_schema",
//         name: schemaName,
//         strict: true,
//         schema,
//       },
//     },
//     input: prompt,
//   });

//   const txt = (res.output_text || "").trim();
//   if (!txt) throw new Error("Empty JSON response");

//   return JSON.parse(txt);
// }

// // ============================================================================
// // 🔹 Text helpers
// // ============================================================================
// function escapeRegExp(s) {
//   return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// function stripHtml(s = "") {
//   return String(s)
//     .replace(/<[^>]*>/g, " ")
//     .replace(/&nbsp;/gi, " ")
//     .replace(/&amp;/gi, "&")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function normalizeCompareText(text = "") {
//   return String(text)
//     .toLowerCase()
//     .normalize("NFKD")
//     .replace(/[^\w\s*-]/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function normalizeQueryForSearch(text = "") {
//   return String(text)
//     .replace(/["“”‘’]/g, "")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function normalizeImageKey(url = "") {
//   return String(url)
//     .replace(/\?.*$/, "")
//     .replace(/#.*$/, "")
//     .toLowerCase()
//     .trim();
// }

// function tokenize(text = "") {
//   return normalizeCompareText(text).split(/\s+/).filter(Boolean);
// }

// const STOPWORDS = new Set([
//   "the",
//   "a",
//   "an",
//   "and",
//   "or",
//   "of",
//   "in",
//   "on",
//   "for",
//   "to",
//   "from",
//   "by",
//   "with",
//   "at",
//   "is",
//   "are",
//   "was",
//   "were",
//   "this",
//   "that",
//   "these",
//   "those",
//   "it",
//   "its",
//   "as",
//   "be",
//   "about",
//   "into",
//   "over",
//   "under",
//   "up",
//   "down",
//   "out",
//   "off",
//   "through",
//   "across",
//   "their",
//   "his",
//   "her",
//   "they",
//   "them",
//   "you",
//   "your",
//   "we",
//   "our",
//   "but",
//   "not",
// ]);

// function extractKeywords(text, max = 12) {
//   const freq = new Map();
//   for (const t of tokenize(text)) {
//     if (STOPWORDS.has(t)) continue;
//     if (t.length < 3) continue;
//     freq.set(t, (freq.get(t) || 0) + 1);
//   }
//   return [...freq.entries()]
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, max)
//     .map(([w]) => w);
// }

// function buildMetadataText(candidate) {
//   const parts = [
//     stripHtml(candidate.title),
//     stripHtml(candidate.description),
//     stripHtml(candidate.alt),
//     candidate.tags?.join(" "),
//     candidate.url,
//   ];
//   return parts.filter(Boolean).join(" ").toLowerCase();
// }

// function extractSummaryWhat(summaryHtml = "") {
//   const s = String(summaryHtml || "");

//   const m = s.match(/data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
//   if (!m) return "";

//   return m[1]
//     .replace(/<[^>]*>/g, "")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function buildDalleTopic(summaryWhat = "", fallback = "symbol") {
//   const what = extractSummaryWhat(summaryWhat);
//   return (what || fallback || "symbol").replace(/\s+/g, " ").trim();
// }

// function uniqueNonEmptyStrings(values = []) {
//   const out = [];
//   const seen = new Set();

//   for (const v of values) {
//     const clean = normalizeQueryForSearch(v);
//     const key = normalizeCompareText(clean);
//     if (!clean || seen.has(key)) continue;
//     seen.add(key);
//     out.push(clean);
//   }

//   return out;
// }

// function dedupeCandidates(list = []) {
//   const seen = new Set();
//   const out = [];

//   for (const cand of list) {
//     const key = normalizeImageKey(cand.url);
//     if (!key || seen.has(key)) continue;
//     seen.add(key);
//     out.push(cand);
//   }

//   return out;
// }

// // ============================================================================
// // 👤 CENTRAL ENTITY DETECTION (person, brand, country, city, landmark)
// // ============================================================================

// // 1) Detect name via cheap structured GPT NER
// async function detectMainEntity(openaiClient, title, article, category = "") {
//   const schema = {
//     type: "object",
//     additionalProperties: false,
//     properties: {
//       type: {
//         type: "string",
//         enum:
//           category === "space"
//             ? [
//                 "person",
//                 "brand",
//                 "country",
//                 "city",
//                 "landmark",
//                 "polity",
//                 "phenomenon",
//                 "none",
//               ]
//             : [
//                 "person",
//                 "brand",
//                 "country",
//                 "city",
//                 "landmark",
//                 "polity",
//                 "none",
//               ],
//       },
//       name: { type: "string" },
//     },
//     required: ["type", "name"],
//   };

//   const prompt = `
// Identify the single MAIN SUBJECT of this article.

// It may be:
// - a PERSON,
// - a BRAND/COMPANY,
// - a COUNTRY,
// - a CITY,
// - a HISTORIC LANDMARK,
// - or a HISTORICAL/POLITICAL ENTITY such as an EMPIRE, DYNASTY, KINGDOM, TSARDOM, CALIPHATE, SULTANATE, COURT, or similar ruling polity.
// ${category === "space" ? `- or a NAMED SPACE PHENOMENON.` : ""}

// Rules:
// - Return the most central single named entity if one clearly exists.
// - If no single main subject exists, return type "none" and name "none".
// ${
//   category === "space"
//     ? `
// IMPORTANT (space only):
// - You may return type "phenomenon" ONLY if it is NAMED.
// - Do NOT return generic terms like "the universe", "space", "galaxies", "cosmic microwave background", "dark matter", "big bang".
// - The name must appear in the provided text/title.
// `
//     : ""
// }

// Text:
// ${title}
// ${article.slice(0, 700)}
// `;

//   try {
//     return await runImageJSON({
//       prompt,
//       schema,
//       schemaName: "detect_main_entity",
//     });
//   } catch {
//     return { type: "none", name: "none" };
//   }
// }

// // 2) Check if entity is really central (cheap heuristic gate)
// function isCentralEntity(name, title, article, type = "person") {
//   if (!name || name === "none") return false;

//   const n = name.toLowerCase();
//   const t = title.toLowerCase();
//   const a = article.toLowerCase();

//   const freq = (a.match(new RegExp(escapeRegExp(n), "g")) || []).length;

//   if (type === "country" || type === "polity") {
//     const inTitle = t.includes(n);
//     const inIntro = a.slice(0, 300).includes(n);
//     return freq >= 2 || inTitle || inIntro;
//   }

//   if (type === "city" || type === "landmark") {
//     const inTitle = t.includes(n);
//     const inIntro = a.slice(0, 300).includes(n);
//     return (inTitle || inIntro) && freq >= 2;
//   }

//   if (type === "phenomenon") {
//     const inTitle = t.includes(n);
//     const inIntro = a.slice(0, 300).includes(n);
//     return inTitle || inIntro;
//   }

//   const inTitle = t.includes(n);
//   const inIntro = a.slice(0, 300).includes(n);

//   if (!(inTitle || inIntro)) return false;
//   if (freq < 2) return false;

//   return true;
// }

// // 3) Determine if entity is PRIMARY SUBJECT or merely CONTEXTUAL
// async function isEntityPrimary(openaiClient, name, type, title, article) {
//   if (
//     !name ||
//     !title ||
//     !article ||
//     typeof article !== "string" ||
//     typeof title !== "string"
//   ) {
//     return false;
//   }

//   const schema = {
//     type: "object",
//     additionalProperties: false,
//     properties: {
//       role: {
//         type: "string",
//         enum: ["primary", "context"],
//       },
//     },
//     required: ["role"],
//   };

//   const prompt = `
// You are classifying the ROLE of a detected entity in an article.

// Entity: "${name}"
// Entity type: ${type}

// Choose exactly one label:

// - "primary" ONLY if the article's central claim, mechanism, discovery, explanation, or story is ABOUT this entity itself.
// - "context" if the entity mainly provides WHERE/WHEN/SETTING (location, backdrop, domain) for a different subject.

// IMPORTANT:
// - Do NOT decide based on mention frequency alone.
// - Do NOT decide based on being in the title alone.
// - Decide based on what is being analyzed, explained, measured, debated, discovered, excavated, escaped from, or described.

// Return JSON only.

// Text:
// ${title}
// ${article.slice(0, 700)}
// `;

//   try {
//     const out = await runImageJSON({
//       prompt,
//       schema,
//       schemaName: "entity_role",
//     });
//     return out.role === "primary";
//   } catch {
//     return false;
//   }
// }

// function isNamedSpacePhenomenon(name, title, article) {
//   if (!name || name === "none") return false;

//   const trimmed = String(name).trim().replace(/\s+/g, " ");
//   if (trimmed.length < 3) return false;

//   const hay = `${title}\n${article.slice(0, 600)}`
//     .toLowerCase()
//     .replace(/\s+/g, " ");
//   if (!hay.includes(trimmed.toLowerCase())) return false;

//   const looksNamed =
//     /[A-ZÆØÅ]/.test(trimmed) ||
//     /[\d*]/.test(trimmed) ||
//     trimmed.split(/\s+/).length >= 2;

//   if (!looksNamed) return false;

//   const generic = new Set([
//     "universe",
//     "the universe",
//     "space",
//     "cosmos",
//     "galaxy",
//     "galaxies",
//     "dark matter",
//     "big bang",
//     "cosmic microwave background",
//     "cmb",
//   ]);

//   if (generic.has(trimmed.toLowerCase())) return false;

//   return true;
// }

// // ============================================================================
// // 🔹 1. Finn visuelt kjerne-substantiv (ALLTID fotograferbart, 1–2 ord, med disambiguering)
// // ============================================================================
// export async function getCoreNoun(title, article, category = "") {
//   const entityData = await detectMainEntity(openai, title, article, category);
//   let entity = entityData.name;
//   let entityType = entityData.type;

//   if (category === "space" && entityType === "phenomenon") {
//     if (!isNamedSpacePhenomenon(entity, title, article)) {
//       entityType = "none";
//       entity = "none";
//     }
//   }

//   if (
//     entityType !== "none" &&
//     isCentralEntity(entity, title, article, entityType)
//   ) {
//     const primary = await isEntityPrimary(
//       openai,
//       entity,
//       entityType,
//       title,
//       article,
//     );

//     if (primary) {
//       const clean =
//         category === "space" && entityType === "phenomenon"
//           ? entity.toLowerCase().replace(/[^a-z0-9\s*\-]/g, "")
//           : entity.toLowerCase().replace(/[^a-z0-9\s]/g, "");

//       if (entityType === "country") {
//         console.log(`🌍 Country detected → "${clean} flag"`);
//         return { core: `${clean} flag`, usedPrimaryEntity: true };
//       }

//       if (entityType === "polity") {
//         console.log(`🏺 Polity detected → "${clean}"`);
//         return { core: clean, usedPrimaryEntity: true };
//       }

//       if (entityType === "city" || entityType === "landmark") {
//         console.log(`🏛 Place detected → "${clean}"`);
//         return { core: clean, usedPrimaryEntity: true };
//       }

//       console.log(`🎯 Entity detected (${entityType}) → "${clean}"`);
//       return { core: clean, usedPrimaryEntity: true };
//     }
//   }

//   const schema = {
//     type: "object",
//     additionalProperties: false,
//     properties: {
//       noun: { type: "string" },
//     },
//     required: ["noun"],
//   };

//   const prompt = `
// You are selecting the BEST visual search keyword for a news article image.

// Rules:
// - Choose ONLY a concrete, physical, photographable subject.
// - Prefer 1–2 words.
// - If ambiguous, add one clarifying subtype word.
// - Do NOT use abstract concepts.
// - If category is "space", prefer an astronomy term explicitly mentioned in the text/title.
// - Return a simple lowercase search phrase suitable for photo search.

// Category: "${category}"
// Title: "${title}"
// Article: "${article.slice(0, 900)}"
// `;

//   try {
//     const r = await runImageJSON({
//       prompt,
//       schema,
//       schemaName: "core_noun",
//     });

//     let noun = String(r.noun || "")
//       .trim()
//       .toLowerCase()
//       .replace(/["'.]/g, "");

//     const abstractBans = [
//       "intelligence",
//       "behavior",
//       "impact",
//       "trend",
//       "culture",
//       "ethics",
//       "growth",
//       "inflation",
//       "memory",
//       "performance",
//       "economy",
//       "technology",
//       "climate",
//       "evolution",
//       "privacy",
//       "politics",
//       "society",
//       "warfare",
//       "analysis",
//       "history",
//       "future",
//       "design",
//     ];

//     const forbiddenSecondary = new Set([
//       "scene",
//       "view",
//       "effect",
//       "pattern",
//       "concept",
//       "style",
//       "texture",
//       "environment",
//       "setting",
//       "image",
//       "vision",
//       "background",
//       "look",
//       "landscape",
//     ]);

//     let parts = noun.split(" ").filter(Boolean);

//     if (parts.length > 1) {
//       const first = parts[0];
//       const second = parts[1];

//       if (abstractBans.includes(second)) {
//         noun = first;
//         parts = [first];
//       }

//       if (abstractBans.includes(first) && !abstractBans.includes(second)) {
//         noun = second;
//         parts = [second];
//       }
//     }

//     parts = noun.split(" ").filter(Boolean);
//     if (parts.length === 2) {
//       const first = parts[0];
//       const second = parts[1];

//       if (forbiddenSecondary.has(second)) {
//         noun = first;
//         parts = [first];
//       }
//     }

//     if (abstractBans.includes(noun)) {
//       noun = "symbol";
//     }

//     const pluralFix = noun.replace(/s$/, "");
//     if (pluralFix.length >= 3) noun = pluralFix;

//     if (category === "space") {
//       const hay = `${title}\n${article.slice(0, 800)}`
//         .toLowerCase()
//         .replace(/[^a-z0-9\s*]/g, " ")
//         .replace(/\s+/g, " ")
//         .trim();

//       const n = String(noun || "")
//         .toLowerCase()
//         .replace(/[^a-z0-9\s*]/g, " ")
//         .replace(/\s+/g, " ")
//         .trim();

//       if (n && !hay.includes(n)) noun = "symbol";
//     }

//     if (!noun || noun.length < 2) noun = "symbol";

//     console.log(`🧩 Core noun detected → "${noun}"`);
//     return { core: noun, usedPrimaryEntity: false };
//   } catch (err) {
//     console.warn("⚠️ getCoreNoun failed:", err.message);
//     return { core: "symbol", usedPrimaryEntity: false };
//   }
// }

// // ============================================================================
// // 🔹 1B. Ny spesifikk GPT-gren: finn mest konkrete motiv teksten støtter
// // ============================================================================
// async function getSpecificImagePlan(
//   title,
//   article,
//   category = "",
//   summaryWhat = "",
// ) {
//   const schema = {
//     type: "object",
//     additionalProperties: false,
//     properties: {
//       primary_query: { type: "string" },
//       fallback_query: { type: "string" },
//       subject_type: {
//         type: "string",
//         enum: [
//           "person",
//           "place",
//           "object",
//           "artifact",
//           "animal",
//           "building",
//           "vehicle",
//           "document",
//           "fossil",
//           "coin",
//           "other",
//         ],
//       },
//       specificity: {
//         type: "string",
//         enum: ["exact", "specific", "broad"],
//       },
//     },
//     required: [
//       "primary_query",
//       "fallback_query",
//       "subject_type",
//       "specificity",
//     ],
//   };

//   const prompt = `
// You are extracting the most specific visual image-search subject from an article.

// Task:
// Return the most specific concrete, visually searchable subject that is central to the article.

// Decision rules:
// - Prefer exact proper names when they are central and visually searchable
// - Prefer exact named places, structures, vessels, artifacts, fossils, coins, documents, species, or objects
// - Prefer the specific named subject over a generic class
// - Use a broader but still concrete fallback only if the article does not clearly support a more specific search subject
// - The subject must be central, not merely mentioned in passing
// - Do not invent details
// - Do not use abstract terms
// - Do not optimize for symbolism or mood
// - The primary query may be longer if needed for an exact proper name
// - Keep queries concise and realistic for image search

// Return JSON only.

// Category: ${category}
// Title: ${title}
// Summary: ${extractSummaryWhat(summaryWhat) || summaryWhat || ""}
// Article:
// ${article.slice(0, 1800)}
// `;

//   try {
//     const out = await runImageJSON({
//       prompt,
//       schema,
//       schemaName: "specific_image_plan",
//     });

//     return {
//       primary_query: normalizeQueryForSearch(out.primary_query || ""),
//       fallback_query: normalizeQueryForSearch(out.fallback_query || ""),
//       subject_type: out.subject_type || "other",
//       specificity: out.specificity || "specific",
//     };
//   } catch (err) {
//     console.warn("⚠️ getSpecificImagePlan failed:", err.message);
//     return {
//       primary_query: "",
//       fallback_query: "",
//       subject_type: "other",
//       specificity: "broad",
//     };
//   }
// }

// // ============================================================================
// // 🔹 3. Bildesøk (6 per provider) → returnerer kandidater med metadata
// // ============================================================================
// /**
//  * Felles kandidat-format:
//  * {
//  *   url: string,
//  *   provider: "Wikimedia" | "Pexels" | "Unsplash",
//  *   width?: number,
//  *   height?: number,
//  *   title?: string,
//  *   description?: string,
//  *   alt?: string,
//  *   tags?: string[]
//  * }
//  */

// export async function searchWikimediaImages(query) {
//   const endpoint =
//     "https://commons.wikimedia.org/w/api.php" +
//     `?action=query&format=json&prop=imageinfo` +
//     `&generator=search&gsrnamespace=6` +
//     `&gsrsearch=${encodeURIComponent(query)}` +
//     `&gsrlimit=6` +
//     `&iiprop=url|size|mime|extmetadata&origin=*`;

//   try {
//     const res = await fetch(endpoint);
//     if (!res.ok) return [];

//     const data = await res.json();
//     const pages = data.query?.pages ? Object.values(data.query.pages) : [];

//     const candidates = [];

//     for (const p of pages) {
//       const info = p.imageinfo?.[0];
//       if (!info?.url || !info.width) continue;

//       const url = String(info.url || "").toLowerCase();
//       const mime = String(info.mime || "").toLowerCase();

//       // ✅ Bare ekte bilder
//       if (!mime.startsWith("image/")) continue;

//       // ✅ Filtrer bort formater/typer vi ikke vil bruke i <img>
//       if (url.endsWith(".svg")) continue;
//       if (url.endsWith(".pdf")) continue;
//       if (url.endsWith(".djvu")) continue;
//       if (url.endsWith(".tif")) continue;
//       if (url.endsWith(".tiff")) continue;

//       // ✅ Filtrer bort typiske irrelevante Wikimedia-filer
//       if (url.includes("icon")) continue;
//       if (url.includes("flag_of")) continue;
//       if (url.includes("coat_of_arms")) continue;
//       if (url.includes("locator_map")) continue;
//       if (url.includes("logo")) continue;
//       if (url.includes("map_")) continue;

//       if (info.width < 800) continue;

//       const ext = info.extmetadata || {};
//       const desc =
//         ext.ImageDescription?.value || ext.ObjectName?.value || p.title || "";

//       candidates.push({
//         url: info.url,
//         provider: "Wikimedia",
//         width: info.width,
//         height: info.height,
//         title: stripHtml(p.title || ""),
//         description: stripHtml(String(desc || "")),
//         alt: "",
//         tags: [],
//         license: ext.LicenseShortName?.value || "Unknown",
//         licenseUrl: ext.LicenseUrl?.value || "",
//         artist: stripHtml(ext.Artist?.value || ""),
//         credit: stripHtml(ext.Credit?.value || ""),
//         attributionRequired: ext.AttributionRequired?.value === "true",
//       });
//     }

//     return candidates;
//   } catch (err) {
//     console.warn("Wikimedia error:", err.message);
//     return [];
//   }
// }

// export async function searchPexelsImages(query) {
//   if (!PEXELS_KEY) return [];

//   try {
//     const res = await fetch(
//       `https://api.pexels.com/v1/search?query=${encodeURIComponent(
//         query,
//       )}&per_page=6`,
//       { headers: { Authorization: PEXELS_KEY } },
//     );
//     if (!res.ok) return [];

//     const data = await res.json();
//     const photos = data.photos || [];

//     return photos
//       .filter((p) => p.src?.large)
//       .map((p) => ({
//         url: p.src.large,
//         provider: "Pexels",
//         width: p.width,
//         height: p.height,
//         title: "",
//         description: "",
//         alt: stripHtml(p.alt || ""),
//         tags: [],
//       }));
//   } catch (err) {
//     console.warn("Pexels error:", err.message);
//     return [];
//   }
// }

// export async function searchUnsplashImages(query) {
//   if (!UNSPLASH_KEY) return [];

//   try {
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
//         query,
//       )}&per_page=6&orientation=landscape&client_id=${UNSPLASH_KEY}`,
//     );
//     if (!res.ok) return [];

//     const data = await res.json();
//     const results = data.results || [];

//     return results
//       .filter((r) => r.urls?.regular)
//       .map((r) => ({
//         url: r.urls.regular,
//         provider: "Unsplash",
//         width: r.width,
//         height: r.height,
//         title: stripHtml(r.description || ""),
//         description: stripHtml(r.description || ""),
//         alt: stripHtml(r.alt_description || ""),
//         tags: (r.tags || []).map((t) => t.title).filter(Boolean),
//       }));
//   } catch (err) {
//     console.warn("Unsplash error:", err.message);
//     return [];
//   }
// }

// // ============================================================================
// // 🔹 4. Streng, tekstbasert scoring (0–100) + disambiguering
// //     → ingen GPT-kall per bilde, kun lokal tekstanalyse
// // ============================================================================
// const softSecondary = new Set([
//   "animal",
//   "insect",
//   "bug",
//   "mammal",
//   "creature",
//   "species",
//   "wildlife",
//   "nature",
// ]);

// function countTokenMatches(tokens = [], meta = "", metaTokens = new Set()) {
//   let hits = 0;
//   for (const t of tokens) {
//     if (
//       meta.includes(t) ||
//       metaTokens.has(t) ||
//       metaTokens.has(t.replace(/s$/, "")) ||
//       metaTokens.has(`${t}s`)
//     ) {
//       hits++;
//     }
//   }
//   return hits;
// }

// function scoreCandidate(
//   core,
//   articleTitle,
//   articleText,
//   candidate,
//   lane = "code",
// ) {
//   const meta = buildMetadataText(candidate);
//   if (!meta) return 0;

//   const metaTokensRaw = tokenize(meta);
//   const metaTokens = new Set(
//     metaTokensRaw.flatMap((t) => [t, t.replace(/s$/, ""), `${t}s`]),
//   );

//   const parts = normalizeCompareText(core).split(/\s+/).filter(Boolean);
//   if (!parts.length) return 0;

//   const primary = parts[0];
//   const secondary = parts[1] || null;
//   const articleKeywords = extractKeywords(
//     `${articleTitle}\n${articleText}`,
//     12,
//   );

//   // ------------------------------------------------------------------------
//   // A) Existing 1–2 word logic preserved for "code" lane behavior
//   // ------------------------------------------------------------------------
//   if (parts.length <= 2) {
//     const ambiguous = !!secondary;
//     const hasPrimary = meta.includes(primary.toLowerCase());
//     const hasSecondary = secondary
//       ? meta.includes(secondary.toLowerCase())
//       : false;

//     if (ambiguous) {
//       if (!hasPrimary) return 0;

//       if (secondary && softSecondary.has(secondary)) {
//         // allow
//       } else if (secondary && !hasSecondary) {
//         return 0;
//       }
//     } else {
//       if (!hasPrimary) {
//         const strictHits = articleKeywords.filter((kw) =>
//           meta.includes(kw),
//         ).length;
//         const tokenHits = articleKeywords.filter(
//           (kw) =>
//             metaTokens.has(kw) ||
//             metaTokens.has(kw.replace(/s$/, "")) ||
//             metaTokens.has(`${kw}s`),
//         ).length;

//         const totalHits = strictHits + tokenHits;
//         if (totalHits < 3) return 0;
//       }
//     }

//     let score = 80;

//     if (metaTokens.has(primary.toLowerCase())) score += 5;
//     if (secondary && metaTokens.has(secondary.toLowerCase())) score += 5;

//     let keywordHits = 0;
//     for (const kw of articleKeywords) {
//       if (meta.includes(kw)) keywordHits++;
//     }
//     score += Math.min(keywordHits * 3, 15);

//     if (candidate.width && candidate.width >= 2000) {
//       score += 5;
//     }

//     const lenientSubjects = [
//       "octopus",
//       "seal",
//       "dog",
//       "cat",
//       "tree",
//       "fish",
//       "bird",
//       "coin",
//       "mammoth",
//       "robot",
//       "ship",
//     ];
//     if (lenientSubjects.includes(primary.toLowerCase()) && score >= 60) {
//       score += 10;
//     }

//     if (score < MIN_ACCEPTABLE_SCORE) return 0;
//     return Math.max(0, Math.min(score, 100));
//   }

//   // ------------------------------------------------------------------------
//   // B) New multi-word logic for the specific lane / exact-name searches
//   // ------------------------------------------------------------------------
//   const phrase = normalizeCompareText(core);
//   const significantParts = parts.filter(
//     (p) => p.length >= 2 && !STOPWORDS.has(p),
//   );
//   const tokenMatches = countTokenMatches(significantParts, meta, metaTokens);
//   const phraseMatch = meta.includes(phrase);

//   const requiredMatches =
//     significantParts.length <= 2
//       ? significantParts.length
//       : Math.max(2, significantParts.length - 1);

//   // Specific lane is allowed to be narrow, but still requires strong grounding.
//   if (!phraseMatch && tokenMatches < requiredMatches) {
//     return 0;
//   }

//   let score = 76;

//   if (phraseMatch) score += 12;
//   score += Math.min(tokenMatches * 4, 16);

//   let keywordHits = 0;
//   for (const kw of articleKeywords) {
//     if (meta.includes(kw)) keywordHits++;
//   }
//   score += Math.min(keywordHits * 2, 10);

//   if (candidate.width && candidate.width >= 2000) {
//     score += 4;
//   }

//   if (lane === "specific") {
//     score += 2;
//   }

//   if (score < MIN_ACCEPTABLE_SCORE) return 0;
//   return Math.max(0, Math.min(score, 100));
// }

// // ============================================================================
// // 🔹 4B. Candidate collection per query
// // ============================================================================
// async function collectCandidatesForQuery(query, title, article, lane = "code") {
//   const normalizedQuery = normalizeQueryForSearch(query);
//   if (!normalizedQuery) return [];

//   const sources = [
//     { name: "Wikimedia", fn: searchWikimediaImages },
//     { name: "Pexels", fn: searchPexelsImages },
//     { name: "Unsplash", fn: searchUnsplashImages },
//   ];

//   const candidates = [];

//   for (const src of sources) {
//     let found = [];
//     try {
//       found = await src.fn(normalizedQuery);
//     } catch (err) {
//       console.warn(
//         `${src.name} search failed for "${normalizedQuery}":`,
//         err.message,
//       );
//       continue;
//     }

//     if (!found?.length) continue;

//     for (const cand of found) {
//       try {
//         const score = scoreCandidate(
//           normalizedQuery,
//           title,
//           article,
//           cand,
//           lane,
//         );

//         if (score >= MIN_ACCEPTABLE_SCORE) {
//           candidates.push({
//             ...cand,
//             score,
//             lane,
//             queryUsed: normalizedQuery,
//           });

//           const shortMeta = buildMetadataText(cand).slice(0, 100);
//           console.log(
//             `✅ ${src.name} [${lane}] accepted (${score}) q="${normalizedQuery}" → ${shortMeta}...`,
//           );
//         } else {
//           const shortMeta = buildMetadataText(cand).slice(0, 100);
//           console.log(
//             `❌ ${src.name} [${lane}] rejected (${score}) q="${normalizedQuery}" → ${shortMeta}...`,
//           );
//         }
//       } catch (err) {
//         console.warn(
//           `Candidate from ${src.name} failed for "${normalizedQuery}":`,
//           err.message,
//         );
//       }
//     }
//   }

//   return dedupeCandidates(candidates).sort((a, b) => b.score - a.score);
// }

// // ============================================================================
// // 🔹 4C. Final GPT judge across merged lanes
// // ============================================================================
// async function gptSelectBestImage(title, article, finalists, summaryWhat = "") {
//   if (!finalists?.length) return null;

//   const schema = {
//     type: "object",
//     additionalProperties: false,
//     properties: {
//       index: {
//         type: "integer",
//         minimum: 1,
//         maximum: finalists.length,
//       },
//       reason: { type: "string" },
//     },
//     required: ["index", "reason"],
//   };

//   const prompt = `
// You are choosing the single BEST lead image for a news article.

// Your priorities:
// 1. Specific relevance to the article
// 2. Prefer an exact named or concrete subject when clearly supported
// 3. Prefer the most central subject, not a side-detail
// 4. Prefer literal match over symbolic match
// 5. Avoid generic place shots if the article is really about a specific object, artifact, vessel, coin, fossil, or event
// 6. Ignore aesthetics; relevance is everything

// Article title: "${title}"
// Article summary: "${extractSummaryWhat(summaryWhat) || summaryWhat || article.slice(0, 250)}"

// Candidates:
// ${finalists
//   .map(
//     (c, i) => `
// [Candidate ${i + 1}]
// Provider: ${c.provider}
// Lane: ${c.lane}
// Query used: ${c.queryUsed}
// Score: ${c.score}
// Title: ${c.title || ""}
// Alt: ${c.alt || ""}
// Metadata: "${buildMetadataText(c).slice(0, 260)}"
// URL: ${c.url}
// `,
//   )
//   .join("\n")}

// Return JSON only.
// `;

//   try {
//     const out = await runImageJSON({
//       prompt,
//       schema,
//       schemaName: "final_image_pick",
//     });

//     const chosen = finalists[(out.index || 1) - 1];
//     return chosen || null;
//   } catch (err) {
//     console.warn("GPT final image reviewer failed:", err.message);
//     return null;
//   }
// }

// // ============================================================================
// // 🔹 5. HOVEDFUNKSJON: Velg beste bilde
// // ============================================================================
// export async function selectBestImage(
//   title,
//   article,
//   category,
//   preferredMode = null,
//   summaryWhat = "",
// ) {
//   console.log(`🖼️ Selecting image for ${category}: "${title}"`);

//   const { core, usedPrimaryEntity } = await getCoreNoun(
//     title,
//     article,
//     category,
//   );

//   const categoryPref =
//     categories[category]?.image === "dalle" ? "dalle" : "photo";

//   const mode = preferredMode || categoryPref;

//   // Space + no primary entity + abstract core => DALL·E first
//   if (category === "space" && !usedPrimaryEntity && core === "symbol") {
//     const dalleTopic = buildDalleTopic(summaryWhat, "symbol");

//     const dalle = await generateDalleImage(
//       title,
//       dalleTopic,
//       "cinematic",
//       category,
//     );

//     if (dalle) {
//       const cached = await cacheImageToSupabase(
//         dalle,
//         `${category}-${Date.now()}`,
//         category,
//       );

//       if (cached) {
//         return { imageUrl: cached, source: "DALL·E", score: 100 };
//       }
//     }
//   }

//   // AI-FIRST for categories configured to use dalle
//   if (mode === "dalle") {
//     const dalleTopic = buildDalleTopic(summaryWhat, core);
//     const dalle = await generateDalleImage(
//       title,
//       dalleTopic,
//       "cinematic",
//       category,
//     );

//     if (dalle) {
//       const cached = await cacheImageToSupabase(
//         dalle,
//         `${category}-${Date.now()}`,
//         category,
//       );

//       if (cached) {
//         return { imageUrl: cached, source: "DALL·E", score: 100 };
//       }
//     }
//   }

//   // ------------------------------------------------------------------------
//   // A) Existing code lane
//   // ------------------------------------------------------------------------
//   console.log(`🧩 Code lane query → "${core}"`);

//   const codeCandidates = await collectCandidatesForQuery(
//     core,
//     title,
//     article,
//     "code",
//   );

//   const codeTop = dedupeCandidates(codeCandidates).slice(0, 3);

//   if (codeTop.length) {
//     console.log("📸 Code lane top candidates:");
//     codeTop.forEach((c, i) => {
//       console.log(
//         `   ${i + 1}. ${c.provider} (${c.score}) q="${c.queryUsed}" → ${buildMetadataText(c).slice(0, 90)}...`,
//       );
//     });
//   }

//   // ------------------------------------------------------------------------
//   // B) New specific GPT lane
//   // ------------------------------------------------------------------------
//   const specificPlan = await getSpecificImagePlan(
//     title,
//     article,
//     category,
//     summaryWhat,
//   );

//   const specificQueries = uniqueNonEmptyStrings([
//     specificPlan.primary_query,
//     specificPlan.fallback_query,
//   ]).filter((q) => normalizeCompareText(q) !== normalizeCompareText(core));

//   if (specificQueries.length) {
//     console.log(
//       `🎯 Specific lane queries → ${specificQueries.map((q) => `"${q}"`).join(" | ")}`,
//     );
//   } else {
//     console.log("🎯 Specific lane queries → none");
//   }

//   const specificCandidates = [];
//   for (const q of specificQueries) {
//     const found = await collectCandidatesForQuery(
//       q,
//       title,
//       article,
//       "specific",
//     );
//     for (const cand of found) {
//       specificCandidates.push(cand);
//     }
//     if (dedupeCandidates(specificCandidates).length >= 3) break;
//   }

//   const specificTop = dedupeCandidates(specificCandidates)
//     .filter(
//       (cand) =>
//         !codeTop.some(
//           (base) => normalizeImageKey(base.url) === normalizeImageKey(cand.url),
//         ),
//     )
//     .sort((a, b) => b.score - a.score)
//     .slice(0, 3);

//   if (specificTop.length) {
//     console.log("📸 Specific lane top candidates:");
//     specificTop.forEach((c, i) => {
//       console.log(
//         `   ${i + 1}. ${c.provider} (${c.score}) q="${c.queryUsed}" → ${buildMetadataText(c).slice(0, 90)}...`,
//       );
//     });
//   }

//   // ------------------------------------------------------------------------
//   // C) Merge finalists across both lanes
//   // ------------------------------------------------------------------------
//   const finalists = dedupeCandidates([...codeTop, ...specificTop]).sort(
//     (a, b) => b.score - a.score,
//   );

//   if (finalists.length) {
//     console.log("🏁 Final merged candidates:");
//     finalists.forEach((c, i) => {
//       console.log(
//         `   ${i + 1}. [${c.lane}] ${c.provider} (${c.score}) q="${c.queryUsed}" → ${buildMetadataText(c).slice(0, 90)}...`,
//       );
//     });
//   }

//   // ------------------------------------------------------------------------
//   // D) Shared final GPT selection across merged lanes
//   // ------------------------------------------------------------------------
//   if (finalists.length >= 2) {
//     console.log("🤖 Running final GPT image relevance reviewer...");

//     const gptWinner = await gptSelectBestImage(
//       title,
//       article,
//       finalists,
//       summaryWhat,
//     );

//     if (gptWinner) {
//       console.log(
//         `🤖 GPT selected: [${gptWinner.lane}] ${gptWinner.provider} (${gptWinner.score}) → ${gptWinner.url}`,
//       );

//       const cached = await cacheImageToSupabase(
//         gptWinner.url,
//         `${category}-${Date.now()}`,
//         category,
//       );

//       if (cached) {
//         return {
//           imageUrl: cached,
//           source: gptWinner.provider,
//           score: gptWinner.score,
//           width: gptWinner.width,
//           height: gptWinner.height,
//           originalUrl: gptWinner.url,
//           title: gptWinner.title,
//           alt: gptWinner.alt,
//           provider: gptWinner.provider,
//           license: gptWinner.license,
//           licenseUrl: gptWinner.licenseUrl,
//           artist: gptWinner.artist,
//           attribution: buildAttribution(gptWinner),
//           selectedBy: "gpt-final-merge",
//           selectedLane: gptWinner.lane,
//           selectedQuery: gptWinner.queryUsed,
//         };
//       }

//       console.warn(
//         `⚠️ GPT winner could not be cached, continuing to next fallback.`,
//       );
//     }

//     console.warn(
//       "⚠️ GPT final review failed, falling back to top-1 merged image.",
//     );
//   }

//   // ------------------------------------------------------------------------
//   // E) Fallback → prøv merged kandidater i rekkefølge
//   // ------------------------------------------------------------------------
//   if (finalists.length) {
//     for (const best of finalists) {
//       const cached = await cacheImageToSupabase(
//         best.url,
//         `${category}-${Date.now()}`,
//         category,
//       );

//       if (!cached) {
//         console.warn(
//           `⚠️ Skipping uncachable finalist [${best.lane}] ${best.provider} → ${best.url}`,
//         );
//         continue;
//       }

//       console.log(
//         `🏆 Fallback selected (top merged cachable) [${best.lane}] ${best.provider} (${best.score}) → ${best.url}`,
//       );

//       return {
//         imageUrl: cached,
//         source: best.provider,
//         score: best.score,
//         width: best.width,
//         height: best.height,
//         originalUrl: best.url,
//         title: best.title,
//         alt: best.alt,
//         provider: best.provider,
//         license: best.license,
//         licenseUrl: best.licenseUrl,
//         artist: best.artist,
//         attribution: buildAttribution(best),
//         selectedBy: "fallback-merged",
//         selectedLane: best.lane,
//         selectedQuery: best.queryUsed,
//       };
//     }
//   }

//   // ------------------------------------------------------------------------
//   // F) Fallback til DALL·E
//   // ------------------------------------------------------------------------
//   const dalleTopic = buildDalleTopic(
//     summaryWhat,
//     specificPlan.primary_query || core,
//   );

//   const dalle = await generateDalleImage(
//     title,
//     dalleTopic,
//     "cinematic",
//     category,
//   );

//   if (dalle) {
//     const cached = await cacheImageToSupabase(
//       dalle,
//       `${category}-${Date.now()}`,
//       category,
//     );

//     if (cached) {
//       console.log(`🎨 Falling back to DALL·E for ${category}`);
//       return { imageUrl: cached, source: "DALL·E", score: 100 };
//     }
//   }

//   // ------------------------------------------------------------------------
//   // G) Absolutt siste utvei → placeholder
//   // ------------------------------------------------------------------------
//   console.warn(
//     `⚠️ All image sources failed for ${category}, using placeholder.`,
//   );

//   return {
//     imageUrl: `https://picsum.photos/seed/${encodeURIComponent(category)}/800/400`,
//     source: "Fallback",
//     score: 0,
//   };
// }

// === lib/imageSelector.js ===
// CurioWire Smart Image Selector v6.0 (2026)
// - Billig & presist, *uten* Vision
// - Beholder eksisterende "core noun"-gren
// - Legger til ny GPT-spesifikk gren (maksimalt konkret motiv hvis artikkelen støtter det)
// - Felles finalerunde på tvers av begge grener
// - 6 bilder per provider (18 totalt maks per query)
// - Ren tekst/metadata-basert scoring (alt-text, title, tags, URL)
// - Filtrerer vekk åpenbare feil (kart, flagg, logoer, ikoner, for små bilder)
// - DALL·E-fallback + Supabase caching via imageTools.js

import OpenAI from "openai";
import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
import { categories } from "../app/api/utils/categories.js";

// ============================================================================
// 🔧 Config
// ============================================================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-5.4-mini";
const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export const MIN_ACCEPTABLE_SCORE = 75;

// ============================================================================
// 📜 Attribution builder for Wikimedia images
// ============================================================================
function buildAttribution(cand) {
  if (cand.provider !== "Wikimedia") return null;

  const artist = cand.artist || "Unknown author";
  const license = cand.license || "Unknown license";
  const licenseUrl = cand.licenseUrl || "";

  return `Image: ${artist}, License: ${license}${
    licenseUrl ? ` (${licenseUrl})` : ""
  }`;
}

// ============================================================================
//  Caption
// ============================================================================
function cleanCaptionText(value) {
  let s = stripHtml(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;

  // Fjern typiske ubrukelige filnavn / generiske rester
  if (/^file:/i.test(s)) return null;
  if (/^[\w\-]+\.(jpg|jpeg|png|webp|gif|tif|tiff|svg)$/i.test(s)) return null;

  // Fjern veldig støyete eller meningsløse captions
  if (s.length < 2) return null;
  if (/^(untitled|image|photo|picture)$/i.test(s)) return null;

  return s;
}

async function shortenImageCaptionWithGPT(cand, rawCaption) {
  const cleanRaw = cleanCaptionText(rawCaption);
  if (!cleanRaw) return null;

  // Kort nok allerede → bruk direkte
  const wordCount = cleanRaw.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 6 && cleanRaw.length <= 48 && !/[.?!:]$/.test(cleanRaw)) {
    return cleanRaw;
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      short_caption: { type: "string" },
    },
    required: ["short_caption"],
  };

  const prompt = `
You are shortening image metadata into a very short visual caption.

Task:
Return a short caption of what the image depicts.

Rules:
- Use ONLY the information provided below
- Do NOT invent details
- 1 to 6 words only
- Prefer a noun phrase, not a sentence
- No period at the end
- No quotes
- No "a photo of", "image of", "view of", or similar filler unless absolutely necessary
- Be concrete and visual
- If the metadata clearly names the subject, prefer that exact subject name

Provider: ${cand?.provider || ""}
Title: ${stripHtml(cand?.title || "")}
Description: ${stripHtml(cand?.description || "")}
Alt: ${stripHtml(cand?.alt || "")}
Raw caption: ${cleanRaw}

Return JSON only.
`;

  try {
    const out = await runImageJSON({
      prompt,
      schema,
      schemaName: "short_image_caption",
    });

    const shortCaption = cleanCaptionText(out.short_caption || "");
    if (!shortCaption) return cleanRaw;

    const shortWords = shortCaption.split(/\s+/).filter(Boolean).length;
    if (shortWords > 6) return cleanRaw;

    return shortCaption.replace(/[.?!:]+$/, "").trim();
  } catch (err) {
    console.warn("⚠️ shortenImageCaptionWithGPT failed:", err.message);
    return cleanRaw;
  }
}

async function pickImageCaption(cand) {
  if (!cand || cand.provider === "DALL·E") return null;

  let rawCaption = null;

  if (cand.provider === "Wikimedia") {
    rawCaption =
      cleanCaptionText(cand.description) ||
      cleanCaptionText(cand.title) ||
      null;
  } else if (cand.provider === "Pexels") {
    rawCaption = cleanCaptionText(cand.alt) || null;
  } else if (cand.provider === "Unsplash") {
    rawCaption =
      cleanCaptionText(cand.alt) ||
      cleanCaptionText(cand.description) ||
      cleanCaptionText(cand.title) ||
      null;
  } else {
    rawCaption =
      cleanCaptionText(cand.alt) ||
      cleanCaptionText(cand.description) ||
      cleanCaptionText(cand.title) ||
      null;
  }

  if (!rawCaption) return null;

  return await shortenImageCaptionWithGPT(cand, rawCaption);
}

// ============================================================================
// 🔹 Generic JSON helper for Responses API
// ============================================================================
async function runImageJSON({ prompt, schema, schemaName = "image_task" }) {
  const res = await openai.responses.create({
    model: IMAGE_MODEL,
    reasoning: { effort: "low" },
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
    input: prompt,
  });

  const txt = (res.output_text || "").trim();
  if (!txt) throw new Error("Empty JSON response");

  return JSON.parse(txt);
}

// ============================================================================
// 🔹 Text helpers
// ============================================================================
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripHtml(s = "") {
  return String(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompareText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s*-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQueryForSearch(text = "") {
  return String(text)
    .replace(/["“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageKey(url = "") {
  return String(url)
    .replace(/\?.*$/, "")
    .replace(/#.*$/, "")
    .toLowerCase()
    .trim();
}

function tokenize(text = "") {
  return normalizeCompareText(text).split(/\s+/).filter(Boolean);
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "for",
  "to",
  "from",
  "by",
  "with",
  "at",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "as",
  "be",
  "about",
  "into",
  "over",
  "under",
  "up",
  "down",
  "out",
  "off",
  "through",
  "across",
  "their",
  "his",
  "her",
  "they",
  "them",
  "you",
  "your",
  "we",
  "our",
  "but",
  "not",
]);

function extractKeywords(text, max = 12) {
  const freq = new Map();
  for (const t of tokenize(text)) {
    if (STOPWORDS.has(t)) continue;
    if (t.length < 3) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function buildMetadataText(candidate) {
  const parts = [
    stripHtml(candidate.title),
    stripHtml(candidate.description),
    stripHtml(candidate.alt),
    candidate.tags?.join(" "),
    candidate.url,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function extractSummaryWhat(summaryHtml = "") {
  const s = String(summaryHtml || "");

  const m = s.match(/data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return "";

  return m[1]
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDalleTopic(summaryWhat = "", fallback = "symbol") {
  const what = extractSummaryWhat(summaryWhat);
  return (what || fallback || "symbol").replace(/\s+/g, " ").trim();
}

function uniqueNonEmptyStrings(values = []) {
  const out = [];
  const seen = new Set();

  for (const v of values) {
    const clean = normalizeQueryForSearch(v);
    const key = normalizeCompareText(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  return out;
}

function dedupeCandidates(list = []) {
  const seen = new Set();
  const out = [];

  for (const cand of list) {
    const key = normalizeImageKey(cand.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(cand);
  }

  return out;
}

// ============================================================================
// 👤 CENTRAL ENTITY DETECTION (person, brand, country, city, landmark)
// ============================================================================

// 1) Detect name via cheap structured GPT NER
async function detectMainEntity(openaiClient, title, article, category = "") {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      type: {
        type: "string",
        enum:
          category === "space"
            ? [
                "person",
                "brand",
                "country",
                "city",
                "landmark",
                "polity",
                "phenomenon",
                "none",
              ]
            : [
                "person",
                "brand",
                "country",
                "city",
                "landmark",
                "polity",
                "none",
              ],
      },
      name: { type: "string" },
    },
    required: ["type", "name"],
  };

  const prompt = `
Identify the single MAIN SUBJECT of this article.

It may be:
- a PERSON,
- a BRAND/COMPANY,
- a COUNTRY,
- a CITY,
- a HISTORIC LANDMARK,
- or a HISTORICAL/POLITICAL ENTITY such as an EMPIRE, DYNASTY, KINGDOM, TSARDOM, CALIPHATE, SULTANATE, COURT, or similar ruling polity.
${category === "space" ? `- or a NAMED SPACE PHENOMENON.` : ""}

Rules:
- Return the most central single named entity if one clearly exists.
- If no single main subject exists, return type "none" and name "none".
${
  category === "space"
    ? `
IMPORTANT (space only):
- You may return type "phenomenon" ONLY if it is NAMED.
- Do NOT return generic terms like "the universe", "space", "galaxies", "cosmic microwave background", "dark matter", "big bang".
- The name must appear in the provided text/title.
`
    : ""
}

Text:
${title}
${article.slice(0, 700)}
`;

  try {
    return await runImageJSON({
      prompt,
      schema,
      schemaName: "detect_main_entity",
    });
  } catch {
    return { type: "none", name: "none" };
  }
}

// 2) Check if entity is really central (cheap heuristic gate)
function isCentralEntity(name, title, article, type = "person") {
  if (!name || name === "none") return false;

  const n = name.toLowerCase();
  const t = title.toLowerCase();
  const a = article.toLowerCase();

  const freq = (a.match(new RegExp(escapeRegExp(n), "g")) || []).length;

  if (type === "country" || type === "polity") {
    const inTitle = t.includes(n);
    const inIntro = a.slice(0, 300).includes(n);
    return freq >= 2 || inTitle || inIntro;
  }

  if (type === "city" || type === "landmark") {
    const inTitle = t.includes(n);
    const inIntro = a.slice(0, 300).includes(n);
    return (inTitle || inIntro) && freq >= 2;
  }

  if (type === "phenomenon") {
    const inTitle = t.includes(n);
    const inIntro = a.slice(0, 300).includes(n);
    return inTitle || inIntro;
  }

  const inTitle = t.includes(n);
  const inIntro = a.slice(0, 300).includes(n);

  if (!(inTitle || inIntro)) return false;
  if (freq < 2) return false;

  return true;
}

// 3) Determine if entity is PRIMARY SUBJECT or merely CONTEXTUAL
async function isEntityPrimary(openaiClient, name, type, title, article) {
  if (
    !name ||
    !title ||
    !article ||
    typeof article !== "string" ||
    typeof title !== "string"
  ) {
    return false;
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      role: {
        type: "string",
        enum: ["primary", "context"],
      },
    },
    required: ["role"],
  };

  const prompt = `
You are classifying the ROLE of a detected entity in an article.

Entity: "${name}"
Entity type: ${type}

Choose exactly one label:

- "primary" ONLY if the article's central claim, mechanism, discovery, explanation, or story is ABOUT this entity itself.
- "context" if the entity mainly provides WHERE/WHEN/SETTING (location, backdrop, domain) for a different subject.

IMPORTANT:
- Do NOT decide based on mention frequency alone.
- Do NOT decide based on being in the title alone.
- Decide based on what is being analyzed, explained, measured, debated, discovered, excavated, escaped from, or described.

Return JSON only.

Text:
${title}
${article.slice(0, 700)}
`;

  try {
    const out = await runImageJSON({
      prompt,
      schema,
      schemaName: "entity_role",
    });
    return out.role === "primary";
  } catch {
    return false;
  }
}

function isNamedSpacePhenomenon(name, title, article) {
  if (!name || name === "none") return false;

  const trimmed = String(name).trim().replace(/\s+/g, " ");
  if (trimmed.length < 3) return false;

  const hay = `${title}\n${article.slice(0, 600)}`
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!hay.includes(trimmed.toLowerCase())) return false;

  const looksNamed =
    /[A-ZÆØÅ]/.test(trimmed) ||
    /[\d*]/.test(trimmed) ||
    trimmed.split(/\s+/).length >= 2;

  if (!looksNamed) return false;

  const generic = new Set([
    "universe",
    "the universe",
    "space",
    "cosmos",
    "galaxy",
    "galaxies",
    "dark matter",
    "big bang",
    "cosmic microwave background",
    "cmb",
  ]);

  if (generic.has(trimmed.toLowerCase())) return false;

  return true;
}

// ============================================================================
// 🔹 1. Finn visuelt kjerne-substantiv (ALLTID fotograferbart, 1–2 ord, med disambiguering)
// ============================================================================
export async function getCoreNoun(title, article, category = "") {
  const entityData = await detectMainEntity(openai, title, article, category);
  let entity = entityData.name;
  let entityType = entityData.type;

  if (category === "space" && entityType === "phenomenon") {
    if (!isNamedSpacePhenomenon(entity, title, article)) {
      entityType = "none";
      entity = "none";
    }
  }

  if (
    entityType !== "none" &&
    isCentralEntity(entity, title, article, entityType)
  ) {
    const primary = await isEntityPrimary(
      openai,
      entity,
      entityType,
      title,
      article,
    );

    if (primary) {
      const clean =
        category === "space" && entityType === "phenomenon"
          ? entity.toLowerCase().replace(/[^a-z0-9\s*\-]/g, "")
          : entity.toLowerCase().replace(/[^a-z0-9\s]/g, "");

      if (entityType === "country") {
        console.log(`🌍 Country detected → "${clean} flag"`);
        return { core: `${clean} flag`, usedPrimaryEntity: true };
      }

      if (entityType === "polity") {
        console.log(`🏺 Polity detected → "${clean}"`);
        return { core: clean, usedPrimaryEntity: true };
      }

      if (entityType === "city" || entityType === "landmark") {
        console.log(`🏛 Place detected → "${clean}"`);
        return { core: clean, usedPrimaryEntity: true };
      }

      console.log(`🎯 Entity detected (${entityType}) → "${clean}"`);
      return { core: clean, usedPrimaryEntity: true };
    }
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      noun: { type: "string" },
    },
    required: ["noun"],
  };

  const prompt = `
You are selecting the BEST visual search keyword for a news article image.

Rules:
- Choose ONLY a concrete, physical, photographable subject.
- Prefer 1–2 words.
- If ambiguous, add one clarifying subtype word.
- Do NOT use abstract concepts.
- If category is "space", prefer an astronomy term explicitly mentioned in the text/title.
- Return a simple lowercase search phrase suitable for photo search.

Category: "${category}"
Title: "${title}"
Article: "${article.slice(0, 900)}"
`;

  try {
    const r = await runImageJSON({
      prompt,
      schema,
      schemaName: "core_noun",
    });

    let noun = String(r.noun || "")
      .trim()
      .toLowerCase()
      .replace(/["'.]/g, "");

    const abstractBans = [
      "intelligence",
      "behavior",
      "impact",
      "trend",
      "culture",
      "ethics",
      "growth",
      "inflation",
      "memory",
      "performance",
      "economy",
      "technology",
      "climate",
      "evolution",
      "privacy",
      "politics",
      "society",
      "warfare",
      "analysis",
      "history",
      "future",
      "design",
    ];

    const forbiddenSecondary = new Set([
      "scene",
      "view",
      "effect",
      "pattern",
      "concept",
      "style",
      "texture",
      "environment",
      "setting",
      "image",
      "vision",
      "background",
      "look",
      "landscape",
    ]);

    let parts = noun.split(" ").filter(Boolean);

    if (parts.length > 1) {
      const first = parts[0];
      const second = parts[1];

      if (abstractBans.includes(second)) {
        noun = first;
        parts = [first];
      }

      if (abstractBans.includes(first) && !abstractBans.includes(second)) {
        noun = second;
        parts = [second];
      }
    }

    parts = noun.split(" ").filter(Boolean);
    if (parts.length === 2) {
      const first = parts[0];
      const second = parts[1];

      if (forbiddenSecondary.has(second)) {
        noun = first;
        parts = [first];
      }
    }

    if (abstractBans.includes(noun)) {
      noun = "symbol";
    }

    const pluralFix = noun.replace(/s$/, "");
    if (pluralFix.length >= 3) noun = pluralFix;

    if (category === "space") {
      const hay = `${title}\n${article.slice(0, 800)}`
        .toLowerCase()
        .replace(/[^a-z0-9\s*]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const n = String(noun || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s*]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (n && !hay.includes(n)) noun = "symbol";
    }

    if (!noun || noun.length < 2) noun = "symbol";

    console.log(`🧩 Core noun detected → "${noun}"`);
    return { core: noun, usedPrimaryEntity: false };
  } catch (err) {
    console.warn("⚠️ getCoreNoun failed:", err.message);
    return { core: "symbol", usedPrimaryEntity: false };
  }
}

// ============================================================================
// 🔹 1B. Ny spesifikk GPT-gren: finn mest konkrete motiv teksten støtter
// ============================================================================
async function getSpecificImagePlan(
  title,
  article,
  category = "",
  summaryWhat = "",
) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      primary_query: { type: "string" },
      fallback_query: { type: "string" },
      subject_type: {
        type: "string",
        enum: [
          "person",
          "place",
          "object",
          "artifact",
          "animal",
          "building",
          "vehicle",
          "document",
          "fossil",
          "coin",
          "other",
        ],
      },
      specificity: {
        type: "string",
        enum: ["exact", "specific", "broad"],
      },
    },
    required: [
      "primary_query",
      "fallback_query",
      "subject_type",
      "specificity",
    ],
  };

  const prompt = `
You are extracting the most specific visual image-search subject from an article.

Task:
Return the most specific concrete, visually searchable subject that is central to the article.

Decision rules:
- Prefer exact proper names when they are central and visually searchable
- Prefer exact named places, structures, vessels, artifacts, fossils, coins, documents, species, or objects
- Prefer the specific named subject over a generic class
- Use a broader but still concrete fallback only if the article does not clearly support a more specific search subject
- The subject must be central, not merely mentioned in passing
- Do not invent details
- Do not use abstract terms
- Do not optimize for symbolism or mood
- The primary query may be longer if needed for an exact proper name
- Keep queries concise and realistic for image search

Return JSON only.

Category: ${category}
Title: ${title}
Summary: ${extractSummaryWhat(summaryWhat) || summaryWhat || ""}
Article:
${article.slice(0, 1800)}
`;

  try {
    const out = await runImageJSON({
      prompt,
      schema,
      schemaName: "specific_image_plan",
    });

    return {
      primary_query: normalizeQueryForSearch(out.primary_query || ""),
      fallback_query: normalizeQueryForSearch(out.fallback_query || ""),
      subject_type: out.subject_type || "other",
      specificity: out.specificity || "specific",
    };
  } catch (err) {
    console.warn("⚠️ getSpecificImagePlan failed:", err.message);
    return {
      primary_query: "",
      fallback_query: "",
      subject_type: "other",
      specificity: "broad",
    };
  }
}

// ============================================================================
// 🔹 3. Bildesøk (6 per provider) → returnerer kandidater med metadata
// ============================================================================
/**
 * Felles kandidat-format:
 * {
 *   url: string,
 *   provider: "Wikimedia" | "Pexels" | "Unsplash",
 *   width?: number,
 *   height?: number,
 *   title?: string,
 *   description?: string,
 *   alt?: string,
 *   tags?: string[]
 * }
 */

export async function searchWikimediaImages(query) {
  const endpoint =
    "https://commons.wikimedia.org/w/api.php" +
    `?action=query&format=json&prop=imageinfo` +
    `&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=6` +
    `&iiprop=url|size|mime|extmetadata&origin=*`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];

    const candidates = [];

    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info?.url || !info.width) continue;

      const url = String(info.url || "").toLowerCase();
      const mime = String(info.mime || "").toLowerCase();

      // ✅ Bare ekte bilder
      if (!mime.startsWith("image/")) continue;

      // ✅ Filtrer bort formater/typer vi ikke vil bruke i <img>
      if (url.endsWith(".svg")) continue;
      if (url.endsWith(".pdf")) continue;
      if (url.endsWith(".djvu")) continue;
      if (url.endsWith(".tif")) continue;
      if (url.endsWith(".tiff")) continue;

      // ✅ Filtrer bort typiske irrelevante Wikimedia-filer
      if (url.includes("icon")) continue;
      if (url.includes("flag_of")) continue;
      if (url.includes("coat_of_arms")) continue;
      if (url.includes("locator_map")) continue;
      if (url.includes("logo")) continue;
      if (url.includes("map_")) continue;

      if (info.width < 800) continue;

      const ext = info.extmetadata || {};
      const desc =
        ext.ImageDescription?.value || ext.ObjectName?.value || p.title || "";

      candidates.push({
        url: info.url,
        provider: "Wikimedia",
        width: info.width,
        height: info.height,
        title: stripHtml(p.title || ""),
        description: stripHtml(String(desc || "")),
        alt: "",
        tags: [],
        license: ext.LicenseShortName?.value || "Unknown",
        licenseUrl: ext.LicenseUrl?.value || "",
        artist: stripHtml(ext.Artist?.value || ""),
        credit: stripHtml(ext.Credit?.value || ""),
        attributionRequired: ext.AttributionRequired?.value === "true",
      });
    }

    return candidates;
  } catch (err) {
    console.warn("Wikimedia error:", err.message);
    return [];
  }
}

export async function searchPexelsImages(query) {
  if (!PEXELS_KEY) return [];

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query,
      )}&per_page=6`,
      { headers: { Authorization: PEXELS_KEY } },
    );
    if (!res.ok) return [];

    const data = await res.json();
    const photos = data.photos || [];

    return photos
      .filter((p) => p.src?.large)
      .map((p) => ({
        url: p.src.large,
        provider: "Pexels",
        width: p.width,
        height: p.height,
        title: "",
        description: "",
        alt: stripHtml(p.alt || ""),
        tags: [],
      }));
  } catch (err) {
    console.warn("Pexels error:", err.message);
    return [];
  }
}

export async function searchUnsplashImages(query) {
  if (!UNSPLASH_KEY) return [];

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query,
      )}&per_page=6&orientation=landscape&client_id=${UNSPLASH_KEY}`,
    );
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];

    return results
      .filter((r) => r.urls?.regular)
      .map((r) => ({
        url: r.urls.regular,
        provider: "Unsplash",
        width: r.width,
        height: r.height,
        title: stripHtml(r.description || ""),
        description: stripHtml(r.description || ""),
        alt: stripHtml(r.alt_description || ""),
        tags: (r.tags || []).map((t) => t.title).filter(Boolean),
      }));
  } catch (err) {
    console.warn("Unsplash error:", err.message);
    return [];
  }
}

// ============================================================================
// 🔹 4. Streng, tekstbasert scoring (0–100) + disambiguering
//     → ingen GPT-kall per bilde, kun lokal tekstanalyse
// ============================================================================
const softSecondary = new Set([
  "animal",
  "insect",
  "bug",
  "mammal",
  "creature",
  "species",
  "wildlife",
  "nature",
]);

function countTokenMatches(tokens = [], meta = "", metaTokens = new Set()) {
  let hits = 0;
  for (const t of tokens) {
    if (
      meta.includes(t) ||
      metaTokens.has(t) ||
      metaTokens.has(t.replace(/s$/, "")) ||
      metaTokens.has(`${t}s`)
    ) {
      hits++;
    }
  }
  return hits;
}

function scoreCandidate(
  core,
  articleTitle,
  articleText,
  candidate,
  lane = "code",
) {
  const meta = buildMetadataText(candidate);
  if (!meta) return 0;

  const metaTokensRaw = tokenize(meta);
  const metaTokens = new Set(
    metaTokensRaw.flatMap((t) => [t, t.replace(/s$/, ""), `${t}s`]),
  );

  const parts = normalizeCompareText(core).split(/\s+/).filter(Boolean);
  if (!parts.length) return 0;

  const primary = parts[0];
  const secondary = parts[1] || null;
  const articleKeywords = extractKeywords(
    `${articleTitle}\n${articleText}`,
    12,
  );

  // ------------------------------------------------------------------------
  // A) Existing 1–2 word logic preserved for "code" lane behavior
  // ------------------------------------------------------------------------
  if (parts.length <= 2) {
    const ambiguous = !!secondary;
    const hasPrimary = meta.includes(primary.toLowerCase());
    const hasSecondary = secondary
      ? meta.includes(secondary.toLowerCase())
      : false;

    if (ambiguous) {
      if (!hasPrimary) return 0;

      if (secondary && softSecondary.has(secondary)) {
        // allow
      } else if (secondary && !hasSecondary) {
        return 0;
      }
    } else {
      if (!hasPrimary) {
        const strictHits = articleKeywords.filter((kw) =>
          meta.includes(kw),
        ).length;
        const tokenHits = articleKeywords.filter(
          (kw) =>
            metaTokens.has(kw) ||
            metaTokens.has(kw.replace(/s$/, "")) ||
            metaTokens.has(`${kw}s`),
        ).length;

        const totalHits = strictHits + tokenHits;
        if (totalHits < 3) return 0;
      }
    }

    let score = 80;

    if (metaTokens.has(primary.toLowerCase())) score += 5;
    if (secondary && metaTokens.has(secondary.toLowerCase())) score += 5;

    let keywordHits = 0;
    for (const kw of articleKeywords) {
      if (meta.includes(kw)) keywordHits++;
    }
    score += Math.min(keywordHits * 3, 15);

    if (candidate.width && candidate.width >= 2000) {
      score += 5;
    }

    const lenientSubjects = [
      "octopus",
      "seal",
      "dog",
      "cat",
      "tree",
      "fish",
      "bird",
      "coin",
      "mammoth",
      "robot",
      "ship",
    ];
    if (lenientSubjects.includes(primary.toLowerCase()) && score >= 60) {
      score += 10;
    }

    if (score < MIN_ACCEPTABLE_SCORE) return 0;
    return Math.max(0, Math.min(score, 100));
  }

  // ------------------------------------------------------------------------
  // B) New multi-word logic for the specific lane / exact-name searches
  // ------------------------------------------------------------------------
  const phrase = normalizeCompareText(core);
  const significantParts = parts.filter(
    (p) => p.length >= 2 && !STOPWORDS.has(p),
  );
  const tokenMatches = countTokenMatches(significantParts, meta, metaTokens);
  const phraseMatch = meta.includes(phrase);

  const requiredMatches =
    significantParts.length <= 2
      ? significantParts.length
      : Math.max(2, significantParts.length - 1);

  // Specific lane is allowed to be narrow, but still requires strong grounding.
  if (!phraseMatch && tokenMatches < requiredMatches) {
    return 0;
  }

  let score = 76;

  if (phraseMatch) score += 12;
  score += Math.min(tokenMatches * 4, 16);

  let keywordHits = 0;
  for (const kw of articleKeywords) {
    if (meta.includes(kw)) keywordHits++;
  }
  score += Math.min(keywordHits * 2, 10);

  if (candidate.width && candidate.width >= 2000) {
    score += 4;
  }

  if (lane === "specific") {
    score += 2;
  }

  if (score < MIN_ACCEPTABLE_SCORE) return 0;
  return Math.max(0, Math.min(score, 100));
}

// ============================================================================
// 🔹 4B. Candidate collection per query
// ============================================================================
async function collectCandidatesForQuery(query, title, article, lane = "code") {
  const normalizedQuery = normalizeQueryForSearch(query);
  if (!normalizedQuery) return [];

  const sources = [
    { name: "Wikimedia", fn: searchWikimediaImages },
    { name: "Pexels", fn: searchPexelsImages },
    { name: "Unsplash", fn: searchUnsplashImages },
  ];

  const candidates = [];

  for (const src of sources) {
    let found = [];
    try {
      found = await src.fn(normalizedQuery);
    } catch (err) {
      console.warn(
        `${src.name} search failed for "${normalizedQuery}":`,
        err.message,
      );
      continue;
    }

    if (!found?.length) continue;

    for (const cand of found) {
      try {
        const score = scoreCandidate(
          normalizedQuery,
          title,
          article,
          cand,
          lane,
        );

        if (score >= MIN_ACCEPTABLE_SCORE) {
          candidates.push({
            ...cand,
            score,
            lane,
            queryUsed: normalizedQuery,
          });

          const shortMeta = buildMetadataText(cand).slice(0, 100);
          console.log(
            `✅ ${src.name} [${lane}] accepted (${score}) q="${normalizedQuery}" → ${shortMeta}...`,
          );
        } else {
          const shortMeta = buildMetadataText(cand).slice(0, 100);
          console.log(
            `❌ ${src.name} [${lane}] rejected (${score}) q="${normalizedQuery}" → ${shortMeta}...`,
          );
        }
      } catch (err) {
        console.warn(
          `Candidate from ${src.name} failed for "${normalizedQuery}":`,
          err.message,
        );
      }
    }
  }

  return dedupeCandidates(candidates).sort((a, b) => b.score - a.score);
}

// ============================================================================
// 🔹 4C. Final GPT judge across merged lanes
// ============================================================================
async function gptSelectBestImage(title, article, finalists, summaryWhat = "") {
  if (!finalists?.length) return null;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      index: {
        type: "integer",
        minimum: 1,
        maximum: finalists.length,
      },
      reason: { type: "string" },
    },
    required: ["index", "reason"],
  };

  const prompt = `
You are choosing the single BEST lead image for a news article.

Your priorities:
1. Specific relevance to the article
2. Prefer an exact named or concrete subject when clearly supported
3. Prefer the most central subject, not a side-detail
4. Prefer literal match over symbolic match
5. Avoid generic place shots if the article is really about a specific object, artifact, vessel, coin, fossil, or event
6. Ignore aesthetics; relevance is everything

Article title: "${title}"
Article summary: "${extractSummaryWhat(summaryWhat) || summaryWhat || article.slice(0, 250)}"

Candidates:
${finalists
  .map(
    (c, i) => `
[Candidate ${i + 1}]
Provider: ${c.provider}
Lane: ${c.lane}
Query used: ${c.queryUsed}
Score: ${c.score}
Title: ${c.title || ""}
Alt: ${c.alt || ""}
Metadata: "${buildMetadataText(c).slice(0, 260)}"
URL: ${c.url}
`,
  )
  .join("\n")}

Return JSON only.
`;

  try {
    const out = await runImageJSON({
      prompt,
      schema,
      schemaName: "final_image_pick",
    });

    const chosen = finalists[(out.index || 1) - 1];
    return chosen || null;
  } catch (err) {
    console.warn("GPT final image reviewer failed:", err.message);
    return null;
  }
}

// ============================================================================
// 🔹 5. HOVEDFUNKSJON: Velg beste bilde
// ============================================================================
export async function selectBestImage(
  title,
  article,
  category,
  preferredMode = null,
  summaryWhat = "",
) {
  console.log(`🖼️ Selecting image for ${category}: "${title}"`);

  const { core, usedPrimaryEntity } = await getCoreNoun(
    title,
    article,
    category,
  );

  const categoryPref =
    categories[category]?.image === "dalle" ? "dalle" : "photo";

  const mode = preferredMode || categoryPref;

  // Space + no primary entity + abstract core => DALL·E first
  if (category === "space" && !usedPrimaryEntity && core === "symbol") {
    const dalleTopic = buildDalleTopic(summaryWhat, "symbol");

    const dalle = await generateDalleImage(
      title,
      dalleTopic,
      "cinematic",
      category,
    );

    if (dalle) {
      const cached = await cacheImageToSupabase(
        dalle,
        `${category}-${Date.now()}`,
        category,
      );

      if (cached) {
        return {
          imageUrl: cached,
          source: "DALL·E",
          score: 100,
          caption: null,
        };
      }
    }
  }

  // AI-FIRST for categories configured to use dalle
  if (mode === "dalle") {
    const dalleTopic = buildDalleTopic(summaryWhat, core);
    const dalle = await generateDalleImage(
      title,
      dalleTopic,
      "cinematic",
      category,
    );

    if (dalle) {
      const cached = await cacheImageToSupabase(
        dalle,
        `${category}-${Date.now()}`,
        category,
      );

      if (cached) {
        return {
          imageUrl: cached,
          source: "DALL·E",
          score: 100,
          caption: null,
        };
      }
    }
  }

  // ------------------------------------------------------------------------
  // A) Existing code lane
  // ------------------------------------------------------------------------
  console.log(`🧩 Code lane query → "${core}"`);

  const codeCandidates = await collectCandidatesForQuery(
    core,
    title,
    article,
    "code",
  );

  const codeTop = dedupeCandidates(codeCandidates).slice(0, 3);

  if (codeTop.length) {
    console.log("📸 Code lane top candidates:");
    codeTop.forEach((c, i) => {
      console.log(
        `   ${i + 1}. ${c.provider} (${c.score}) q="${c.queryUsed}" → ${buildMetadataText(c).slice(0, 90)}...`,
      );
    });
  }

  // ------------------------------------------------------------------------
  // B) New specific GPT lane
  // ------------------------------------------------------------------------
  const specificPlan = await getSpecificImagePlan(
    title,
    article,
    category,
    summaryWhat,
  );

  const specificQueries = uniqueNonEmptyStrings([
    specificPlan.primary_query,
    specificPlan.fallback_query,
  ]).filter((q) => normalizeCompareText(q) !== normalizeCompareText(core));

  if (specificQueries.length) {
    console.log(
      `🎯 Specific lane queries → ${specificQueries.map((q) => `"${q}"`).join(" | ")}`,
    );
  } else {
    console.log("🎯 Specific lane queries → none");
  }

  const specificCandidates = [];
  for (const q of specificQueries) {
    const found = await collectCandidatesForQuery(
      q,
      title,
      article,
      "specific",
    );
    for (const cand of found) {
      specificCandidates.push(cand);
    }
    if (dedupeCandidates(specificCandidates).length >= 3) break;
  }

  const specificTop = dedupeCandidates(specificCandidates)
    .filter(
      (cand) =>
        !codeTop.some(
          (base) => normalizeImageKey(base.url) === normalizeImageKey(cand.url),
        ),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (specificTop.length) {
    console.log("📸 Specific lane top candidates:");
    specificTop.forEach((c, i) => {
      console.log(
        `   ${i + 1}. ${c.provider} (${c.score}) q="${c.queryUsed}" → ${buildMetadataText(c).slice(0, 90)}...`,
      );
    });
  }

  // ------------------------------------------------------------------------
  // C) Merge finalists across both lanes
  // ------------------------------------------------------------------------
  const finalists = dedupeCandidates([...codeTop, ...specificTop]).sort(
    (a, b) => b.score - a.score,
  );

  if (finalists.length) {
    console.log("🏁 Final merged candidates:");
    finalists.forEach((c, i) => {
      console.log(
        `   ${i + 1}. [${c.lane}] ${c.provider} (${c.score}) q="${c.queryUsed}" → ${buildMetadataText(c).slice(0, 90)}...`,
      );
    });
  }

  // ------------------------------------------------------------------------
  // D) Shared final GPT selection across merged lanes
  // ------------------------------------------------------------------------
  if (finalists.length >= 2) {
    console.log("🤖 Running final GPT image relevance reviewer...");

    const gptWinner = await gptSelectBestImage(
      title,
      article,
      finalists,
      summaryWhat,
    );

    if (gptWinner) {
      console.log(
        `🤖 GPT selected: [${gptWinner.lane}] ${gptWinner.provider} (${gptWinner.score}) → ${gptWinner.url}`,
      );

      const cached = await cacheImageToSupabase(
        gptWinner.url,
        `${category}-${Date.now()}`,
        category,
      );

      if (cached) {
        return {
          imageUrl: cached,
          source: gptWinner.provider,
          score: gptWinner.score,
          width: gptWinner.width,
          height: gptWinner.height,
          originalUrl: gptWinner.url,
          title: gptWinner.title,
          alt: gptWinner.alt,
          provider: gptWinner.provider,
          license: gptWinner.license,
          licenseUrl: gptWinner.licenseUrl,
          artist: gptWinner.artist,
          attribution: buildAttribution(gptWinner),
          caption: await pickImageCaption(gptWinner),
          selectedBy: "gpt-final-merge",
          selectedLane: gptWinner.lane,
          selectedQuery: gptWinner.queryUsed,
        };
      }

      console.warn(
        `⚠️ GPT winner could not be cached, continuing to next fallback.`,
      );
    }

    console.warn(
      "⚠️ GPT final review failed, falling back to top-1 merged image.",
    );
  }

  // ------------------------------------------------------------------------
  // E) Fallback → prøv merged kandidater i rekkefølge
  // ------------------------------------------------------------------------
  if (finalists.length) {
    for (const best of finalists) {
      const cached = await cacheImageToSupabase(
        best.url,
        `${category}-${Date.now()}`,
        category,
      );

      if (!cached) {
        console.warn(
          `⚠️ Skipping uncachable finalist [${best.lane}] ${best.provider} → ${best.url}`,
        );
        continue;
      }

      console.log(
        `🏆 Fallback selected (top merged cachable) [${best.lane}] ${best.provider} (${best.score}) → ${best.url}`,
      );

      return {
        imageUrl: cached,
        source: best.provider,
        score: best.score,
        width: best.width,
        height: best.height,
        originalUrl: best.url,
        title: best.title,
        alt: best.alt,
        provider: best.provider,
        license: best.license,
        licenseUrl: best.licenseUrl,
        artist: best.artist,
        attribution: buildAttribution(best),
        caption: await pickImageCaption(best),
        selectedBy: "fallback-merged",
        selectedLane: best.lane,
        selectedQuery: best.queryUsed,
      };
    }
  }

  // ------------------------------------------------------------------------
  // F) Fallback til DALL·E
  // ------------------------------------------------------------------------
  const dalleTopic = buildDalleTopic(
    summaryWhat,
    specificPlan.primary_query || core,
  );

  const dalle = await generateDalleImage(
    title,
    dalleTopic,
    "cinematic",
    category,
  );

  if (dalle) {
    const cached = await cacheImageToSupabase(
      dalle,
      `${category}-${Date.now()}`,
      category,
    );

    if (cached) {
      console.log(`🎨 Falling back to DALL·E for ${category}`);
      return { imageUrl: cached, source: "DALL·E", score: 100, caption: null };
    }
  }

  // ------------------------------------------------------------------------
  // G) Absolutt siste utvei → placeholder
  // ------------------------------------------------------------------------
  console.warn(
    `⚠️ All image sources failed for ${category}, using placeholder.`,
  );

  return {
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(category)}/800/400`,
    source: "Fallback",
    score: 0,
    caption: null,
  };
}
