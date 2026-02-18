// // === lib/imageSelector.js ===
// // CurioWire Smart Image Selector v5.0 (2025)
// // - Billig & presist, *uten* Vision
// // - 6 bilder per provider (18 totalt maks)
// // - 1–2 nøkkelord (med disambiguering, f.eks. "kennedy president")
// // - Ren tekst/metadata-basert scoring (alt-text, title, tags, URL)
// // - Filtrerer vekk åpenbare feil (kart, flagg, logoer, ikoner, for små bilder)
// // - Streng disambiguering: 2-ords core må matche begge ord i metadata
// // - DALL·E-fallback + Supabase caching via imageTools.js

// import OpenAI from "openai";
// import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
// import { categories } from "../app/api/utils/categories.js";

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

// // ============================================================================================
// // 👤 CENTRAL ENTITY DETECTION (person, brand, country, city, landmark)
// // ============================================================================================

// // 1) Detect name via ultra-cheap GPT-mini NER
// async function detectMainEntity(openai, title, article, category = "") {
//   const prompt = `
// Identify the single MAIN SUBJECT of this article.
// It may be:
// - a PERSON,
// - a BRAND/COMPANY,
// - a COUNTRY,
// - a CITY,
// - or a HISTORIC LANDMARK.
// ${category === "space" ? `- or a NAMED SPACE PHENOMENON (e.g. "Cold Spot", "Great Red Spot", "Kuiper Belt", "Oort Cloud", "Sagittarius A*", "M87*").` : ""}

// Return your answer in the following exact JSON format:

// {
//   "type": "person" | "brand" | "country" | "city" | "landmark"${category === "space" ? ` | "phenomenon"` : ""} | "none",
//   "name": "exact name here"
// }

// If no single main subject exists, return:
// { "type": "none", "name": "none" }

// ${
//   category === "space"
//     ? `
// IMPORTANT (space only):
// - You may return type "phenomenon" ONLY if it is NAMED (a specific proper-name label used in the text/title).
// - Do NOT return generic terms like "the universe", "space", "galaxies", "cosmic microwave background", "dark matter", "big bang".
// - The name must appear verbatim in the provided text/title.
// `
//     : ""
// }

// Text:
// ${title}
// ${article.slice(0, 600)}
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 40,
//       temperature: 0,
//     });

//     return JSON.parse(r.choices[0].message.content);
//   } catch {
//     return { type: "none", name: "none" };
//   }
// }

// // 2) Check if entity is really central (cheap heuristic gate)
// function escapeRegExp(s) {
//   return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// function isCentralEntity(name, title, article, type = "person") {
//   if (!name || name === "none") return false;

//   const n = name.toLowerCase();
//   const t = title.toLowerCase();
//   const a = article.toLowerCase();

//   const freq = (a.match(new RegExp(escapeRegExp(n), "g")) || []).length;

//   // Country: tolerant (often appears structurally)
//   if (type === "country") {
//     const inTitle = t.includes(n);
//     const inIntro = a.slice(0, 300).includes(n);
//     return freq >= 2 || inTitle || inIntro;
//   }

//   // City/landmark: must be clearly emphasized
//   if (type === "city" || type === "landmark") {
//     const inTitle = t.includes(n);
//     const inIntro = a.slice(0, 300).includes(n);
//     return (inTitle || inIntro) && freq >= 2;
//   }

//   // Space phenomenon: allow once if in title or intro (often named once)
//   if (type === "phenomenon") {
//     const inTitle = t.includes(n);
//     const inIntro = a.slice(0, 300).includes(n);
//     return inTitle || inIntro;
//   }

//   // Person/brand: standard emphasis rule
//   const inTitle = t.includes(n);
//   const inIntro = a.slice(0, 300).includes(n);

//   if (!(inTitle || inIntro)) return false;
//   if (freq < 2) return false;

//   return true;
// }

// // 3) Determine if entity is PRIMARY SUBJECT or merely CONTEXTUAL
// // Universal rule: "primary" means the article's main CLAIM/MECHANISM is ABOUT the entity.
// // "context" means the entity mainly answers WHERE/WHEN/SETTING, while something else is studied/explained.
// async function isEntityPrimary(openai, name, type, title, article) {
//   if (
//     !name ||
//     !title ||
//     !article ||
//     typeof article !== "string" ||
//     typeof title !== "string"
//   ) {
//     return false;
//   }

//   const prompt = `
// You are classifying the ROLE of a detected entity in an article.

// Entity: "${name}"
// Entity type: ${type}

// Choose exactly one label:

// - "primary" ONLY if the article's central claim, mechanism, or explanation is ABOUT this entity itself.
//   The article would still make sense if you replaced other nouns, but not if you removed this entity.

// - "context" if the entity mainly provides WHERE/WHEN/SETTING (location, backdrop, domain) for a different subject.
//   If removing the entity leaves the core claim intact (but less specific), it is context.

// IMPORTANT:
// - Do NOT decide based on mention frequency alone.
// - Do NOT decide based on being in the title alone.
// - Decide based on what is being analyzed, explained, measured, debated, or discovered.

// Sanity check:
// If you can complete this sentence with the entity, it is likely PRIMARY:
// "This article is trying to explain/establish something about ____."

// If the more natural completion is something else, mark the entity as CONTEXT.

// Return ONLY one word: "primary" or "context".

// Text:
// ${title}
// ${article.slice(0, 600)}
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 5,
//       temperature: 0,
//     });

//     const ans = r.choices[0].message.content.toLowerCase().trim();
//     return ans === "primary";
//   } catch {
//     return false;
//   }
// }

// // ============================================================================================

// function isNamedSpacePhenomenon(name, title, article) {
//   if (!name || name === "none") return false;

//   const trimmed = String(name).trim().replace(/\s+/g, " ");
//   if (trimmed.length < 3) return false;

//   // Must appear in title or intro text (case-insensitive)
//   const hay = `${title}\n${article.slice(0, 600)}`
//     .toLowerCase()
//     .replace(/\s+/g, " ");
//   if (!hay.includes(trimmed.toLowerCase())) return false;

//   // Heuristic: looks like a proper name (capital letter, digit, asterisk, or 2+ words)
//   const looksNamed =
//     /[A-ZÆØÅ]/.test(trimmed) ||
//     /[\d*]/.test(trimmed) ||
//     trimmed.split(/\s+/).length >= 2;

//   if (!looksNamed) return false;

//   // Block super-generic "phenomena" even if capitalized in weird cases
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

// // ============================================================================================

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
// const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

// export const MIN_ACCEPTABLE_SCORE = 75;

// // ============================================================================================
// // 🔹 1. Finn visuelt kjerne-substantiv (ALLTID fotograferbart, 1–2 ord, med disambiguering)
// // ============================================================================================
// export async function getCoreNoun(title, article, category = "") {
//   // 👤 STEP 0: CHECK FOR MAIN PERSON OR BRAND BEFORE ANYTHING ELSE

//   // A) find possible entity
//   const entityData = await detectMainEntity(openai, title, article, category);
//   let entity = entityData.name;
//   let entityType = entityData.type;

//   // Space-only: allow phenomenon ONLY if it is named (failsafe gate)
//   if (category === "space" && entityType === "phenomenon") {
//     if (!isNamedSpacePhenomenon(entity, title, article)) {
//       entityType = "none";
//       entity = "none";
//     }
//   }

//   // B) check basic centrality (title/intro/frequency)

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

//       // === COUNTRY HANDLING: append "flag"
//       if (entityType === "country") {
//         console.log(`🌍 Country detected → "${clean} flag"`);
//         return { core: `${clean} flag`, usedPrimaryEntity: true };
//       }

//       // === CITY OR LANDMARK: return name directly
//       if (entityType === "city" || entityType === "landmark") {
//         console.log(`🏛 Place detected → "${clean}"`);
//         return { core: clean, usedPrimaryEntity: true };
//       }

//       // === PERSON or BRAND
//       console.log(`🎯 Entity detected (${entityType}) → "${clean}"`);
//       return { core: clean, usedPrimaryEntity: true };
//     }
//   }

//   const prompt = `
// You are selecting the BEST visual search keyword for a news article image.

// Your output MUST follow these rules:

// 🎯 VISUAL-ONLY RULES
// - Choose ONLY subjects that can clearly appear in a photograph.
// - Allowed: ANY concrete, physical, photographable noun (thing, place, device, animal, person-type, building, landmark, objects, vehicles, etc) that could realistically appear in a news or stock photo.
// - NOT allowed: abstract concepts (intelligence, behavior, culture, ethics, memory, inflation, politics, climate impact, privacy, evolution, consciousness, etc).
// - If category is "space", prefer an astronomy term that is explicitly mentioned in the Title/Article (e.g. nebula, black hole, Milky Way, Big Bang, cosmic microwave background, etc).

// 🎯 DISAMBIGUATION
// If the word is ambiguous, add one clarifying word:

// IMPORTANT:
// The clarifying word must be a *concrete, physical, photographable subtype*.
// Examples of valid subtypes:
// - "president", "airport"
// - "animal", "submarine"
// - "planet", "metal"
// - "racing", "firefighter", "sailing", "research", "soccer", "electric"

// Invalid clarifying words are NOT allowed. Do NOT use:
// "scene", "view", "effect", "pattern", "concept", "image", "style",
// "texture", "vision", "environment", "setting", "theme", "background".

// The clarifying word MUST always be a solid noun or subtype, never an abstract descriptor.

// 🎯 CONTEXTUAL SUBTYPE RULE
// If the article clearly implies a specific subtype of the object, include that subtype as the second word.

// Examples:
// - “helmet” → “racing helmet”, “firefighter helmet”, “construction helmet”
// - “ball” → “soccer ball”, “tennis ball”, “basketball”
// - “ship” → “warship”, “sailing ship”, “research vessel”
// - “mask” → “surgical mask”, “theater mask”, “respirator mask”
// - “car” → “racing car”, “electric car”, “police car”

// Use the subtype ONLY if it is clearly indicated in the article context.

// 🎯 ABSTRACT ARTICLE LOGIC
// If the article topic is abstract:
// - Output a symbolic but visual object that is *directly and concretely connected to the article’s specific subject matter*.
// - Always choose a real physical object that represents the core idea in the most literal way.
// - Avoid generic symbolic objects (e.g. “crowd”, “globe”, “abstract people”) unless the article is explicitly about them.
// - The chosen object must be something that would realistically appear in a stock photo related to the article’s topic.

// Examples:
// - high blood pressure → "blood pressure monitor"
// - democracy → "ballot paper"
// - time perception → "clock"
// - economic inflation → "bank notes"
// - internet privacy → "server rack"
// - climate change → "thermometer"

// 🎯 STRICT FORMAT
// - Return ONLY 1–2 words.
// - Must be lowercase.
// - No explanation, no punctuation.

// Category: "${category}"
// Title: "${title}"
// Article: "${article.slice(0, 800)}"
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 10,
//       temperature: 0.1,
//     });

//     let noun = (r.choices[0]?.message?.content || "")
//       .trim()
//       .toLowerCase()
//       .replace(/["'.]/g, "");

//     // ========================================================================================
//     // 🔹 Extra JavaScript-level sanitization (robust fixes for GPT slips)
//     // ========================================================================================

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

//     // NORMALISER + SPLIT
//     let parts = noun.split(" ").filter(Boolean);

//     // ========================================================================================
//     // 1) Fjern abstrakte ord i 2-ords kombinasjoner
//     // ========================================================================================
//     if (parts.length > 1) {
//       const first = parts[0];
//       const second = parts[1];

//       // Hvis sekundærordet er abstrakt → fjern det
//       if (abstractBans.includes(second)) {
//         noun = first;
//         parts = [first];
//       }

//       // Hvis primærordet er abstrakt → behold sekundærordet (hvis visuelt)
//       if (abstractBans.includes(first) && !abstractBans.includes(second)) {
//         noun = second;
//         parts = [second];
//       }
//     }

//     // ========================================================================================
//     // 2) Fjern ulovlige sekundærord ("scene", "view", "effect", etc.)
//     // ========================================================================================
//     parts = noun.split(" ").filter(Boolean);
//     if (parts.length === 2) {
//       const first = parts[0];
//       const second = parts[1];

//       if (forbiddenSecondary.has(second)) {
//         noun = first; // "ocean scene" → "ocean"
//         parts = [first];
//       }
//     }

//     // ========================================================================================
//     // 3) Hvis hele uttrykket fortsatt er abstrakt → fallback til symbol
//     // ========================================================================================
//     if (abstractBans.includes(noun)) {
//       noun = "symbol";
//     }

//     // ========================================================================================
//     // 4) Plural → singular normalisering
//     // ========================================================================================
//     const pluralFix = noun.replace(/s$/, "");
//     if (pluralFix.length >= 3) noun = pluralFix;

//     // ===============================
//     // ✅ SPACE: If GPT returns a proxy term not present in the text → force DALL·E
//     // ===============================
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

//       // If the chosen keyword is NOT literally present in title/article,
//       // it's a "proxy" (e.g. telescope) → go DALL·E via symbol.
//       if (n && !hay.includes(n)) noun = "symbol";
//     }

//     // ========================================================================================
//     // 5) Siste failsafe
//     // ========================================================================================
//     // Category-aware hard fallback
//     if (noun === "symbol") {
//       if (title.toLowerCase().includes("ziggurat"))
//         return { core: "ziggurat", usedPrimaryEntity: false };
//       if (title.toLowerCase().includes("temple"))
//         return { core: "temple", usedPrimaryEntity: false };
//       if (title.toLowerCase().includes("ruins"))
//         return { core: "ancient ruins", usedPrimaryEntity: false };
//       if (title.toLowerCase().includes("manuscript"))
//         return { core: "ancient manuscript", usedPrimaryEntity: false };
//     }

//     if (!noun || noun.length < 2) noun = "symbol";

//     console.log(`🧩 Core noun detected → "${noun}"`);
//     return { core: noun, usedPrimaryEntity: false };
//   } catch (err) {
//     console.warn("⚠️ getCoreNoun failed:", err.message);
//     return { core: "symbol", usedPrimaryEntity: false };
//   }
// }

// // ============================================================================================
// // 🔹 2. Hjelpere for tekst / keywords (lokalt, billig)
// // ============================================================================================

// function tokenize(text = "") {
//   return text
//     .toLowerCase()
//     .normalize("NFKD")
//     .replace(/[^\w\s-]/g, " ")
//     .split(/\s+/)
//     .filter(Boolean);
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
//     candidate.title,
//     candidate.description,
//     candidate.alt,
//     candidate.tags?.join(" "),
//     candidate.url,
//   ];
//   return parts.filter(Boolean).join(" ").toLowerCase();
// }

// function extractSummaryWhat(summaryHtml = "") {
//   const s = String(summaryHtml || "");

//   // Extract inner text of <span data-summary-what>...</span>
//   const m = s.match(/data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
//   if (!m) return "";

//   // Strip any nested tags + normalize whitespace
//   return m[1]
//     .replace(/<[^>]*>/g, "")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function buildDalleTopic(summaryWhat = "", fallback = "symbol") {
//   const what = extractSummaryWhat(summaryWhat);
//   return (what || fallback || "symbol").replace(/\s+/g, " ").trim();
// }

// // ============================================================================================
// // 🔹 3. Bildesøk (6 per provider) → returnerer *kandidater* med metadata
// // ============================================================================================

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

//       const url = info.url.toLowerCase();

//       // Grovfilter: dropp SVG, ikoner, flagg, kart, logoer etc.
//       if (url.endsWith(".svg")) continue;
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
//         title: p.title || "",
//         description: String(desc || ""),
//         alt: "",
//         tags: [],

//         // NEW — LICENSE FIELDS
//         license: ext.LicenseShortName?.value || "Unknown",
//         licenseUrl: ext.LicenseUrl?.value || "",
//         artist: ext.Artist?.value || "",
//         credit: ext.Credit?.value || "",
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
//         alt: p.alt || "",
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
//         title: r.description || "",
//         description: r.description || "",
//         alt: r.alt_description || "",
//         tags: (r.tags || []).map((t) => t.title).filter(Boolean),
//       }));
//   } catch (err) {
//     console.warn("Unsplash error:", err.message);
//     return [];
//   }
// }

// // ============================================================================================
// // 🔹 4. Streng, tekstbasert scoring (0–100) + disambiguering
// //     → ingen GPT-kall per bilde, kun lokal tekstanalyse
// // ============================================================================================

// // Soft-disambiguation: sekundærord som skal brukes i søk
// // men aldri kreves i metadata-trafikk
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

// function scoreCandidate(core, articleTitle, articleText, candidate) {
//   const meta = buildMetadataText(candidate);
//   if (!meta) return 0;

//   // Tokenize metadata (plural/singular aware) — must be defined early
//   const metaTokensRaw = tokenize(meta);
//   const metaTokens = new Set(
//     metaTokensRaw.flatMap((t) => [
//       t, // original
//       t.replace(/s$/, ""), // plural → singular
//       t + "s", // singular → plural
//     ]),
//   );

//   const parts = core.split(/\s+/).filter(Boolean);
//   if (!parts.length) return 0;

//   const primary = parts[0];
//   const secondary = parts[1] || null;
//   const ambiguous = !!secondary; // 2-ords core = bevisst disambiguering

//   const hasPrimary = meta.includes(primary.toLowerCase());
//   const hasSecondary = secondary
//     ? meta.includes(secondary.toLowerCase())
//     : false;

//   // === Streng disambiguering ===
//   if (ambiguous) {
//     // Primærord må ALLTID finnes
//     if (!hasPrimary) return 0;

//     // Hvis sekundærordet er et "soft" ord → ikke krav i metadata
//     if (secondary && softSecondary.has(secondary)) {
//       // soft-disambiguation → allow
//     }
//     // Hvis sekundærordet IKKE er soft → kreves match
//     else if (secondary && !hasSecondary) {
//       return 0;
//     }
//   } else {
//     // Enkelt core-ord:
//     if (!hasPrimary) {
//       const articleKeywords = extractKeywords(
//         `${articleTitle}\n${articleText}`,
//         10,
//       );

//       const strictHits = articleKeywords.filter((kw) =>
//         meta.includes(kw),
//       ).length;

//       const tokenHits = articleKeywords.filter(
//         (kw) =>
//           metaTokens.has(kw) ||
//           metaTokens.has(kw.replace(/s$/, "")) ||
//           metaTokens.has(kw + "s"),
//       ).length;

//       const totalHits = strictHits + tokenHits;
//       if (totalHits < 3) return 0;
//     }
//   }

//   // Basisscore hvis den kommer gjennom nåløyet
//   let score = 80;

//   if (metaTokens.has(primary.toLowerCase())) score += 5;
//   if (secondary && metaTokens.has(secondary.toLowerCase())) score += 5;

//   // Tematisk bonus: overlap med artikkel-keywords
//   const articleKeywords = extractKeywords(
//     `${articleTitle}\n${articleText}`,
//     12,
//   );
//   let keywordHits = 0;
//   for (const kw of articleKeywords) {
//     if (meta.includes(kw)) keywordHits++;
//   }
//   score += Math.min(keywordHits * 3, 15);

//   // Liten oppløsningsbonus
//   if (candidate.width && candidate.width >= 2000) {
//     score += 5;
//   }

//   // Hvis core er et dyr eller objekt, tillat litt svakere match
//   const lenientSubjects = [
//     "octopus",
//     "seal",
//     "dog",
//     "cat",
//     "tree",
//     "fish",
//     "bird",
//     "coin",
//     "mammoth",
//     "robot",
//     "ship",
//   ];
//   if (lenientSubjects.includes(primary.toLowerCase()) && score >= 60) {
//     score += 10; // mild boost for natur/objektmotiv
//   }

//   // Streng cutoff
//   if (score < MIN_ACCEPTABLE_SCORE) return 0;

//   return Math.max(0, Math.min(score, 100));
// }

// // ============================================================================================
// // 🔹 5. HOVEDFUNKSJON: Velg beste bilde
// // ============================================================================================
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

//   // Space + no primary entity + abstract core => DALL·E first (before photo search)
//   if (category === "space" && !usedPrimaryEntity && core === "symbol") {
//     const what = extractSummaryWhat(summaryWhat);

//     // Use ONLY "What" as topic. If missing, fallback to "symbol".
//     const dalleTopic = (what || "symbol").replace(/\s+/g, " ").trim();

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
//       return { imageUrl: cached, source: "DALL·E", score: 100 };
//     }
//     // If DALL·E fails, continue to normal flow (photo search etc.)
//   }

//   // =====================================================================
//   // === A: AI-FIRST (DALL·E) for enkelte kategorier (uendret logikk) ===
//   // =====================================================================
//   if (mode === "dalle") {
//     const dalle = await generateDalleImage(title, core, "cinematic", category);
//     if (dalle) {
//       const cached = await cacheImageToSupabase(
//         dalle,
//         `${category}-${Date.now()}`,
//         category,
//       );
//       return { imageUrl: cached, source: "DALL·E", score: 100 };
//     }
//   }

//   // =====================================================================
//   // === B: PHOTO-FIRST (Wikimedia → Pexels → Unsplash)               ===
//   //       → 6 bilder per provider, metadata-basert scoring            ===
//   // =====================================================================
//   const sources = [
//     { name: "Wikimedia", fn: searchWikimediaImages },
//     { name: "Pexels", fn: searchPexelsImages },
//     { name: "Unsplash", fn: searchUnsplashImages },
//   ];

//   const candidates = [];

//   for (const src of sources) {
//     let found = [];
//     try {
//       found = await src.fn(core);
//     } catch (err) {
//       console.warn(`${src.name} search failed:`, err.message);
//       continue;
//     }

//     if (!found?.length) continue;

//     for (const cand of found) {
//       try {
//         const score = scoreCandidate(core, title, article, cand);
//         if (score >= MIN_ACCEPTABLE_SCORE) {
//           candidates.push({ ...cand, score });
//           const shortMeta = buildMetadataText(cand).slice(0, 80);
//           console.log(
//             `✅ ${src.name} candidate accepted (${score}) → ${shortMeta}...`,
//           );
//         } else {
//           const shortMeta = buildMetadataText(cand).slice(0, 80);
//           console.log(
//             `❌ ${src.name} candidate rejected (${score}) → ${shortMeta}...`,
//           );
//         }
//       } catch (err) {
//         console.warn(`Candidate from ${src.name} failed:`, err.message);
//       }
//     }
//   }

//   // =====================================================================
//   // === C: Sorter kandidater (men returner ikke enda)                  ===
//   // =====================================================================
//   if (candidates.length) {
//     // Sortér etter score (desc)
//     candidates.sort((a, b) => b.score - a.score);

//     console.log("📸 Top candidates sorted by score:");
//     candidates.slice(0, 3).forEach((c, i) => {
//       console.log(
//         `   ${i + 1}. ${c.provider} (${c.score}) → ${buildMetadataText(c).slice(
//           0,
//           80,
//         )}...`,
//       );
//     });
//   }

//   // =====================================================================
//   // === D: GPT FINAL REVIEW (vurder 3 beste bilder)                    ===
//   // =====================================================================
//   async function gptSelectBestImage(title, article, core, candidates) {
//     const prompt = `
// You are choosing the single BEST image for a news article.

// CRITERIA:
// - The image must visually match the REAL subject of the article.
// - Prefer the image that contains the clearest, most literal depiction.
// - Avoid symbolic or loosely related images.
// - Match must be based on actual content of the article.
// - Ignore aesthetics or artistic look — relevance is everything.

// Article title: "${title}"
// Core subject keyword: "${core}"
// Article summary: "${summaryWhat || article.slice(0, 200)}"

// Here are the 3 candidate images (with metadata):

// ${candidates
//   .map(
//     (c, i) => `
// [Candidate ${i + 1}]
// Provider: ${c.provider}
// URL: ${c.url}
// Score: ${c.score}
// Title/Alt: ${c.title || c.alt}
// Metadata: "${buildMetadataText(c).slice(0, 200)}"
// `,
//   )
//   .join("\n")}

// Return ONLY one JSON object with this exact format:
// {
//   "index": 1,  // choose 1, 2 or 3
// }
// `;

//     try {
//       const res = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [{ role: "user", content: prompt }],
//         max_tokens: 20,
//         temperature: 0.1,
//       });

//       let json;
//       try {
//         json = JSON.parse(res.choices[0].message.content);
//       } catch {
//         return null;
//       }

//       const chosen = candidates[json.index - 1];
//       return chosen;
//     } catch (err) {
//       console.warn("GPT image reviewer failed:", err.message);
//       return null;
//     }
//   }

//   if (candidates.length >= 3) {
//     console.log("🤖 Running GPT image relevance reviewer...");

//     const top3 = candidates.slice(0, 3);
//     const gptWinner = await gptSelectBestImage(title, article, core, top3);

//     if (gptWinner) {
//       console.log(
//         `🤖 GPT selected: ${gptWinner.provider} (${gptWinner.score}) → ${gptWinner.url}`,
//       );

//       const cached = await cacheImageToSupabase(
//         gptWinner.url,
//         `${category}-${Date.now()}`,
//         category,
//       );

//       return {
//         imageUrl: cached,
//         source: gptWinner.provider,
//         score: gptWinner.score,
//         width: gptWinner.width,
//         height: gptWinner.height,
//         originalUrl: gptWinner.url,
//         title: gptWinner.title,
//         alt: gptWinner.alt,
//         provider: gptWinner.provider,

//         // NEW
//         license: gptWinner.license,
//         licenseUrl: gptWinner.licenseUrl,
//         artist: gptWinner.artist,
//         attribution: buildAttribution(gptWinner),

//         selectedBy: "gpt",
//       };
//     }

//     console.warn("⚠️ GPT review failed, falling back to top-1 scoring image.");
//   }

//   // =====================================================================
//   // === F: FALLBACK → bruk top-1 kandidat                              ===
//   // =====================================================================
//   if (candidates.length) {
//     const best = candidates[0];

//     const cached = await cacheImageToSupabase(
//       best.url,
//       `${category}-${Date.now()}`,
//       category,
//     );

//     console.log(
//       `🏆 Fallback selected (top-1) ${best.provider} (${best.score}) → ${best.url}`,
//     );

//     return {
//       imageUrl: cached,
//       source: best.provider,
//       score: best.score,
//       width: best.width,
//       height: best.height,
//       originalUrl: best.url,
//       title: best.title,
//       alt: best.alt,
//       provider: best.provider,

//       // NEW
//       license: best.license,
//       licenseUrl: best.licenseUrl,
//       artist: best.artist,
//       attribution: buildAttribution(best),

//       selectedBy: "fallback",
//     };
//   }

//   // =====================================================================
//   // === G: FALLBACK TIL DALL·E                                    ===
//   // =====================================================================
//   const dalle = await generateDalleImage(title, core, "cinematic", category);
//   if (dalle) {
//     const cached = await cacheImageToSupabase(
//       dalle,
//       `${category}-${Date.now()}`,
//       category,
//     );
//     console.log(`🎨 Falling back to DALL·E for ${category}`);
//     return { imageUrl: cached, source: "DALL·E", score: 100 };
//   }

//   // =====================================================================
//   // === H: Absolutt siste utvei → placeholder                      ===
//   // =====================================================================
//   console.warn(
//     `⚠️ All image sources failed for ${category}, using placeholder.`,
//   );
//   return {
//     imageUrl: `https://picsum.photos/seed/${encodeURIComponent(
//       category,
//     )}/800/400`,
//     source: "Fallback",
//     score: 0,
//   };
// }

// === lib/imageSelector.js ===
// CurioWire Smart Image Selector v5.0 (2025)
// - Billig & presist, *uten* Vision
// - 6 bilder per provider (18 totalt maks)
// - 1–2 nøkkelord (med disambiguering, f.eks. "kennedy president")
// - Ren tekst/metadata-basert scoring (alt-text, title, tags, URL)
// - Filtrerer vekk åpenbare feil (kart, flagg, logoer, ikoner, for små bilder)
// - Streng disambiguering: 2-ords core må matche begge ord i metadata
// - DALL·E-fallback + Supabase caching via imageTools.js

import OpenAI from "openai";
import { generateDalleImage, cacheImageToSupabase } from "./imageTools.js";
import { categories } from "../app/api/utils/categories.js";

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

// ============================================================================================
// 👤 CENTRAL ENTITY DETECTION (person, brand, country, city, landmark)
// ============================================================================================

// 1) Detect name via ultra-cheap GPT-mini NER
async function detectMainEntity(openai, title, article, category = "") {
  const prompt = `
Identify the single MAIN SUBJECT of this article.
It may be:
- a PERSON,
- a BRAND/COMPANY,
- a COUNTRY,
- a CITY,
- or a HISTORIC LANDMARK.
${category === "space" ? `- or a NAMED SPACE PHENOMENON (e.g. "Cold Spot", "Great Red Spot", "Kuiper Belt", "Oort Cloud", "Sagittarius A*", "M87*").` : ""}

Return your answer in the following exact JSON format:

{
  "type": "person" | "brand" | "country" | "city" | "landmark"${category === "space" ? ` | "phenomenon"` : ""} | "none",
  "name": "exact name here"
}

If no single main subject exists, return:
{ "type": "none", "name": "none" }

${
  category === "space"
    ? `
IMPORTANT (space only):
- You may return type "phenomenon" ONLY if it is NAMED (a specific proper-name label used in the text/title).
- Do NOT return generic terms like "the universe", "space", "galaxies", "cosmic microwave background", "dark matter", "big bang".
- The name must appear verbatim in the provided text/title.
`
    : ""
}

Text:
${title}
${article.slice(0, 600)}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 40,
      temperature: 0,
    });

    return JSON.parse(r.choices[0].message.content);
  } catch {
    return { type: "none", name: "none" };
  }
}

// 2) Check if entity is really central (cheap heuristic gate)
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCentralEntity(name, title, article, type = "person") {
  if (!name || name === "none") return false;

  const n = name.toLowerCase();
  const t = title.toLowerCase();
  const a = article.toLowerCase();

  const freq = (a.match(new RegExp(escapeRegExp(n), "g")) || []).length;

  // Country: tolerant (often appears structurally)
  if (type === "country") {
    const inTitle = t.includes(n);
    const inIntro = a.slice(0, 300).includes(n);
    return freq >= 2 || inTitle || inIntro;
  }

  // City/landmark: must be clearly emphasized
  if (type === "city" || type === "landmark") {
    const inTitle = t.includes(n);
    const inIntro = a.slice(0, 300).includes(n);
    return (inTitle || inIntro) && freq >= 2;
  }

  // Space phenomenon: allow once if in title or intro (often named once)
  if (type === "phenomenon") {
    const inTitle = t.includes(n);
    const inIntro = a.slice(0, 300).includes(n);
    return inTitle || inIntro;
  }

  // Person/brand: standard emphasis rule
  const inTitle = t.includes(n);
  const inIntro = a.slice(0, 300).includes(n);

  if (!(inTitle || inIntro)) return false;
  if (freq < 2) return false;

  return true;
}

// 3) Determine if entity is PRIMARY SUBJECT or merely CONTEXTUAL
// Universal rule: "primary" means the article's main CLAIM/MECHANISM is ABOUT the entity.
// "context" means the entity mainly answers WHERE/WHEN/SETTING (location, backdrop, domain) for a different subject.
async function isEntityPrimary(openai, name, type, title, article) {
  if (
    !name ||
    !title ||
    !article ||
    typeof article !== "string" ||
    typeof title !== "string"
  ) {
    return false;
  }

  const prompt = `
You are classifying the ROLE of a detected entity in an article.

Entity: "${name}"
Entity type: ${type}

Choose exactly one label:

- "primary" ONLY if the article's central claim, mechanism, or explanation is ABOUT this entity itself.
  The article would still make sense if you replaced other nouns, but not if you removed this entity.

- "context" if the entity mainly provides WHERE/WHEN/SETTING (location, backdrop, domain) for a different subject.
  If removing the entity leaves the core claim intact (but less specific), it is context.

IMPORTANT:
- Do NOT decide based on mention frequency alone.
- Do NOT decide based on being in the title alone.
- Decide based on what is being analyzed, explained, measured, debated, or discovered.

Sanity check:
If you can complete this sentence with the entity, it is likely PRIMARY:
"This article is trying to explain/establish something about ____."

If the more natural completion is something else, mark the entity as CONTEXT.

Return ONLY one word: "primary" or "context".

Text:
${title}
${article.slice(0, 600)}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5,
      temperature: 0,
    });

    const ans = r.choices[0].message.content.toLowerCase().trim();
    return ans === "primary";
  } catch {
    return false;
  }
}

// ============================================================================================

function isNamedSpacePhenomenon(name, title, article) {
  if (!name || name === "none") return false;

  const trimmed = String(name).trim().replace(/\s+/g, " ");
  if (trimmed.length < 3) return false;

  // Must appear in title or intro text (case-insensitive)
  const hay = `${title}\n${article.slice(0, 600)}`
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!hay.includes(trimmed.toLowerCase())) return false;

  // Heuristic: looks like a proper name (capital letter, digit, asterisk, or 2+ words)
  const looksNamed =
    /[A-ZÆØÅ]/.test(trimmed) ||
    /[\d*]/.test(trimmed) ||
    trimmed.split(/\s+/).length >= 2;

  if (!looksNamed) return false;

  // Block super-generic "phenomena" even if capitalized in weird cases
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

// ============================================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export const MIN_ACCEPTABLE_SCORE = 75;

// ============================================================================================
// 🔹 1. Finn visuelt kjerne-substantiv (ALLTID fotograferbart, 1–2 ord, med disambiguering)
// ============================================================================================
export async function getCoreNoun(title, article, category = "") {
  // 👤 STEP 0: CHECK FOR MAIN PERSON OR BRAND BEFORE ANYTHING ELSE

  // A) find possible entity
  const entityData = await detectMainEntity(openai, title, article, category);
  let entity = entityData.name;
  let entityType = entityData.type;

  // Space-only: allow phenomenon ONLY if it is named (failsafe gate)
  if (category === "space" && entityType === "phenomenon") {
    if (!isNamedSpacePhenomenon(entity, title, article)) {
      entityType = "none";
      entity = "none";
    }
  }

  // B) check basic centrality (title/intro/frequency)

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

      // === COUNTRY HANDLING: append "flag"
      if (entityType === "country") {
        console.log(`🌍 Country detected → "${clean} flag"`);
        return { core: `${clean} flag`, usedPrimaryEntity: true };
      }

      // === CITY OR LANDMARK: return name directly
      if (entityType === "city" || entityType === "landmark") {
        console.log(`🏛 Place detected → "${clean}"`);
        return { core: clean, usedPrimaryEntity: true };
      }

      // === PERSON or BRAND
      console.log(`🎯 Entity detected (${entityType}) → "${clean}"`);
      return { core: clean, usedPrimaryEntity: true };
    }
  }

  const prompt = `
You are selecting the BEST visual search keyword for a news article image.

Your output MUST follow these rules:

🎯 VISUAL-ONLY RULES
- Choose ONLY subjects that can clearly appear in a photograph.
- Allowed: ANY concrete, physical, photographable noun (thing, place, device, animal, person-type, building, landmark, objects, vehicles, etc) that could realistically appear in a news or stock photo.
- NOT allowed: abstract concepts (intelligence, behavior, culture, ethics, memory, inflation, politics, climate impact, privacy, evolution, consciousness, etc).
- If category is "space", prefer an astronomy term that is explicitly mentioned in the Title/Article (e.g. nebula, black hole, Milky Way, Big Bang, cosmic microwave background, etc).

🎯 DISAMBIGUATION
If the word is ambiguous, add one clarifying word:

IMPORTANT:
The clarifying word must be a *concrete, physical, photographable subtype*.
Examples of valid subtypes:
- "president", "airport"
- "animal", "submarine"
- "planet", "metal"
- "racing", "firefighter", "sailing", "research", "soccer", "electric"

Invalid clarifying words are NOT allowed. Do NOT use:
"scene", "view", "effect", "pattern", "concept", "image", "style", 
"texture", "vision", "environment", "setting", "theme", "background".

The clarifying word MUST always be a solid noun or subtype, never an abstract descriptor.


🎯 CONTEXTUAL SUBTYPE RULE
If the article clearly implies a specific subtype of the object, include that subtype as the second word.

Examples:
- “helmet” → “racing helmet”, “firefighter helmet”, “construction helmet”
- “ball” → “soccer ball”, “tennis ball”, “basketball”
- “ship” → “warship”, “sailing ship”, “research vessel”
- “mask” → “surgical mask”, “theater mask”, “respirator mask”
- “car” → “racing car”, “electric car”, “police car”

Use the subtype ONLY if it is clearly indicated in the article context.

🎯 ABSTRACT ARTICLE LOGIC
If the article topic is abstract:
- Output a symbolic but visual object that is *directly and concretely connected to the article’s specific subject matter*.
- Always choose a real physical object that represents the core idea in the most literal way.
- Avoid generic symbolic objects (e.g. “crowd”, “globe”, “abstract people”) unless the article is explicitly about them.
- The chosen object must be something that would realistically appear in a stock photo related to the article’s topic.

Examples:
- high blood pressure → "blood pressure monitor"
- democracy → "ballot paper"
- time perception → "clock"
- economic inflation → "bank notes"
- internet privacy → "server rack"
- climate change → "thermometer"


🎯 STRICT FORMAT
- Return ONLY 1–2 words.
- Must be lowercase.
- No explanation, no punctuation.

Category: "${category}"
Title: "${title}"
Article: "${article.slice(0, 800)}"
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0.1,
    });

    let noun = (r.choices[0]?.message?.content || "")
      .trim()
      .toLowerCase()
      .replace(/["'.]/g, "");

    // ========================================================================================
    // 🔹 Extra JavaScript-level sanitization (robust fixes for GPT slips)
    // ========================================================================================

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

    // NORMALISER + SPLIT
    let parts = noun.split(" ").filter(Boolean);

    // ========================================================================================
    // 1) Fjern abstrakte ord i 2-ords kombinasjoner
    // ========================================================================================
    if (parts.length > 1) {
      const first = parts[0];
      const second = parts[1];

      // Hvis sekundærordet er abstrakt → fjern det
      if (abstractBans.includes(second)) {
        noun = first;
        parts = [first];
      }

      // Hvis primærordet er abstrakt → behold sekundærordet (hvis visuelt)
      if (abstractBans.includes(first) && !abstractBans.includes(second)) {
        noun = second;
        parts = [second];
      }
    }

    // ========================================================================================
    // 2) Fjern ulovlige sekundærord ("scene", "view", "effect", etc.)
    // ========================================================================================
    parts = noun.split(" ").filter(Boolean);
    if (parts.length === 2) {
      const first = parts[0];
      const second = parts[1];

      if (forbiddenSecondary.has(second)) {
        noun = first; // "ocean scene" → "ocean"
        parts = [first];
      }
    }

    // ========================================================================================
    // 3) Hvis hele uttrykket fortsatt er abstrakt → fallback til symbol
    // ========================================================================================
    if (abstractBans.includes(noun)) {
      noun = "symbol";
    }

    // ========================================================================================
    // 4) Plural → singular normalisering
    // ========================================================================================
    const pluralFix = noun.replace(/s$/, "");
    if (pluralFix.length >= 3) noun = pluralFix;

    // ===============================
    // ✅ SPACE: If GPT returns a proxy term not present in the text → force DALL·E
    // ===============================
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

      // If the chosen keyword is NOT literally present in title/article,
      // it's a "proxy" (e.g. telescope) → go DALL·E via symbol.
      if (n && !hay.includes(n)) noun = "symbol";
    }

    // ========================================================================================
    // 5) Siste failsafe
    // ========================================================================================

    if (!noun || noun.length < 2) noun = "symbol";

    console.log(`🧩 Core noun detected → "${noun}"`);
    return { core: noun, usedPrimaryEntity: false };
  } catch (err) {
    console.warn("⚠️ getCoreNoun failed:", err.message);
    return { core: "symbol", usedPrimaryEntity: false };
  }
}

// ============================================================================================
// 🔹 2. Hjelpere for tekst / keywords (lokalt, billig)
// ============================================================================================

function tokenize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
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
    candidate.title,
    candidate.description,
    candidate.alt,
    candidate.tags?.join(" "),
    candidate.url,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function extractSummaryWhat(summaryHtml = "") {
  const s = String(summaryHtml || "");

  // Extract inner text of <span data-summary-what>...</span>
  const m = s.match(/data-summary-what[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return "";

  // Strip any nested tags + normalize whitespace
  return m[1]
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDalleTopic(summaryWhat = "", fallback = "symbol") {
  const what = extractSummaryWhat(summaryWhat);
  return (what || fallback || "symbol").replace(/\s+/g, " ").trim();
}

// ============================================================================================
// 🔹 3. Bildesøk (6 per provider) → returnerer *kandidater* med metadata
// ============================================================================================

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

      const url = info.url.toLowerCase();

      // Grovfilter: dropp SVG, ikoner, flagg, kart, logoer etc.
      if (url.endsWith(".svg")) continue;
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
        title: p.title || "",
        description: String(desc || ""),
        alt: "",
        tags: [],

        // NEW — LICENSE FIELDS
        license: ext.LicenseShortName?.value || "Unknown",
        licenseUrl: ext.LicenseUrl?.value || "",
        artist: ext.Artist?.value || "",
        credit: ext.Credit?.value || "",
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
        alt: p.alt || "",
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
        title: r.description || "",
        description: r.description || "",
        alt: r.alt_description || "",
        tags: (r.tags || []).map((t) => t.title).filter(Boolean),
      }));
  } catch (err) {
    console.warn("Unsplash error:", err.message);
    return [];
  }
}

// ============================================================================================
// 🔹 4. Streng, tekstbasert scoring (0–100) + disambiguering
//     → ingen GPT-kall per bilde, kun lokal tekstanalyse
// ============================================================================================

// Soft-disambiguation: sekundærord som skal brukes i søk
// men aldri kreves i metadata-trafikk
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

function scoreCandidate(core, articleTitle, articleText, candidate) {
  const meta = buildMetadataText(candidate);
  if (!meta) return 0;

  // Tokenize metadata (plural/singular aware) — must be defined early
  const metaTokensRaw = tokenize(meta);
  const metaTokens = new Set(
    metaTokensRaw.flatMap((t) => [
      t, // original
      t.replace(/s$/, ""), // plural → singular
      t + "s", // singular → plural
    ]),
  );

  const parts = core.split(/\s+/).filter(Boolean);
  if (!parts.length) return 0;

  const primary = parts[0];
  const secondary = parts[1] || null;
  const ambiguous = !!secondary; // 2-ords core = bevisst disambiguering

  const hasPrimary = meta.includes(primary.toLowerCase());
  const hasSecondary = secondary
    ? meta.includes(secondary.toLowerCase())
    : false;

  // === Streng disambiguering ===
  if (ambiguous) {
    // Primærord må ALLTID finnes
    if (!hasPrimary) return 0;

    // Hvis sekundærordet er et "soft" ord → ikke krav i metadata
    if (secondary && softSecondary.has(secondary)) {
      // soft-disambiguation → allow
    }
    // Hvis sekundærordet IKKE er soft → kreves match
    else if (secondary && !hasSecondary) {
      return 0;
    }
  } else {
    // Enkelt core-ord:
    if (!hasPrimary) {
      const articleKeywords = extractKeywords(
        `${articleTitle}\n${articleText}`,
        10,
      );

      const strictHits = articleKeywords.filter((kw) =>
        meta.includes(kw),
      ).length;

      const tokenHits = articleKeywords.filter(
        (kw) =>
          metaTokens.has(kw) ||
          metaTokens.has(kw.replace(/s$/, "")) ||
          metaTokens.has(kw + "s"),
      ).length;

      const totalHits = strictHits + tokenHits;
      if (totalHits < 3) return 0;
    }
  }

  // Basisscore hvis den kommer gjennom nåløyet
  let score = 80;

  if (metaTokens.has(primary.toLowerCase())) score += 5;
  if (secondary && metaTokens.has(secondary.toLowerCase())) score += 5;

  // Tematisk bonus: overlap med artikkel-keywords
  const articleKeywords = extractKeywords(
    `${articleTitle}\n${articleText}`,
    12,
  );
  let keywordHits = 0;
  for (const kw of articleKeywords) {
    if (meta.includes(kw)) keywordHits++;
  }
  score += Math.min(keywordHits * 3, 15);

  // Liten oppløsningsbonus
  if (candidate.width && candidate.width >= 2000) {
    score += 5;
  }

  // Hvis core er et dyr eller objekt, tillat litt svakere match
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
    score += 10; // mild boost for natur/objektmotiv
  }

  // Streng cutoff
  if (score < MIN_ACCEPTABLE_SCORE) return 0;

  return Math.max(0, Math.min(score, 100));
}

// ============================================================================================
// 🔹 5. HOVEDFUNKSJON: Velg beste bilde
// ============================================================================================
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

  // Space + no primary entity + abstract core => DALL·E first (before photo search)
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
      return { imageUrl: cached, source: "DALL·E", score: 100 };
    }
    // If DALL·E fails, continue to normal flow (photo search etc.)
  }

  // =====================================================================
  // === A: AI-FIRST (DALL·E) for enkelte kategorier (uendret logikk) ===
  // =====================================================================
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
      return { imageUrl: cached, source: "DALL·E", score: 100 };
    }
  }

  // =====================================================================
  // === B: PHOTO-FIRST (Wikimedia → Pexels → Unsplash)               ===
  //       → 6 bilder per provider, metadata-basert scoring            ===
  // =====================================================================
  const sources = [
    { name: "Wikimedia", fn: searchWikimediaImages },
    { name: "Pexels", fn: searchPexelsImages },
    { name: "Unsplash", fn: searchUnsplashImages },
  ];

  const candidates = [];

  for (const src of sources) {
    let found = [];
    try {
      found = await src.fn(core);
    } catch (err) {
      console.warn(`${src.name} search failed:`, err.message);
      continue;
    }

    if (!found?.length) continue;

    for (const cand of found) {
      try {
        const score = scoreCandidate(core, title, article, cand);
        if (score >= MIN_ACCEPTABLE_SCORE) {
          candidates.push({ ...cand, score });
          const shortMeta = buildMetadataText(cand).slice(0, 80);
          console.log(
            `✅ ${src.name} candidate accepted (${score}) → ${shortMeta}...`,
          );
        } else {
          const shortMeta = buildMetadataText(cand).slice(0, 80);
          console.log(
            `❌ ${src.name} candidate rejected (${score}) → ${shortMeta}...`,
          );
        }
      } catch (err) {
        console.warn(`Candidate from ${src.name} failed:`, err.message);
      }
    }
  }

  // =====================================================================
  // === C: Sorter kandidater (men returner ikke enda)                  ===
  // =====================================================================
  if (candidates.length) {
    // Sortér etter score (desc)
    candidates.sort((a, b) => b.score - a.score);

    console.log("📸 Top candidates sorted by score:");
    candidates.slice(0, 3).forEach((c, i) => {
      console.log(
        `   ${i + 1}. ${c.provider} (${c.score}) → ${buildMetadataText(c).slice(0, 80)}...`,
      );
    });
  }

  // =====================================================================
  // === D: GPT FINAL REVIEW (vurder 3 beste bilder)                    ===
  // =====================================================================
  async function gptSelectBestImage(title, article, core, candidates) {
    const prompt = `
You are choosing the single BEST image for a news article.

CRITERIA:
- The image must visually match the REAL subject of the article.
- Prefer the image that contains the clearest, most literal depiction.
- Avoid symbolic or loosely related images.
- Match must be based on actual content of the article.
- Ignore aesthetics or artistic look — relevance is everything.

Article title: "${title}"
Core subject keyword: "${core}"
Article summary: "${summaryWhat || article.slice(0, 200)}"

Here are the 3 candidate images (with metadata):

${candidates
  .map(
    (c, i) => `
[Candidate ${i + 1}]
Provider: ${c.provider}
URL: ${c.url}
Score: ${c.score}
Title/Alt: ${c.title || c.alt}
Metadata: "${buildMetadataText(c).slice(0, 200)}"
`,
  )
  .join("\n")}

Return ONLY one JSON object with this exact format:
{
  "index": 1,  // choose 1, 2 or 3
}
`;

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 20,
        temperature: 0.1,
      });

      let json;
      try {
        json = JSON.parse(res.choices[0].message.content);
      } catch {
        return null;
      }

      const chosen = candidates[json.index - 1];
      return chosen;
    } catch (err) {
      console.warn("GPT image reviewer failed:", err.message);
      return null;
    }
  }

  if (candidates.length >= 3) {
    console.log("🤖 Running GPT image relevance reviewer...");

    const top3 = candidates.slice(0, 3);
    const gptWinner = await gptSelectBestImage(title, article, core, top3);

    if (gptWinner) {
      console.log(
        `🤖 GPT selected: ${gptWinner.provider} (${gptWinner.score}) → ${gptWinner.url}`,
      );

      const cached = await cacheImageToSupabase(
        gptWinner.url,
        `${category}-${Date.now()}`,
        category,
      );

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

        // NEW
        license: gptWinner.license,
        licenseUrl: gptWinner.licenseUrl,
        artist: gptWinner.artist,
        attribution: buildAttribution(gptWinner),

        selectedBy: "gpt",
      };
    }

    console.warn("⚠️ GPT review failed, falling back to top-1 scoring image.");
  }

  // =====================================================================
  // === F: FALLBACK → bruk top-1 kandidat                              ===
  // =====================================================================
  if (candidates.length) {
    const best = candidates[0];

    const cached = await cacheImageToSupabase(
      best.url,
      `${category}-${Date.now()}`,
      category,
    );

    console.log(
      `🏆 Fallback selected (top-1) ${best.provider} (${best.score}) → ${best.url}`,
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

      // NEW
      license: best.license,
      licenseUrl: best.licenseUrl,
      artist: best.artist,
      attribution: buildAttribution(best),

      selectedBy: "fallback",
    };
  }

  // =====================================================================
  // === G: FALLBACK TIL DALL·E                                    ===
  // =====================================================================
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
    console.log(`🎨 Falling back to DALL·E for ${category}`);
    return { imageUrl: cached, source: "DALL·E", score: 100 };
  }

  // =====================================================================
  // === H: Absolutt siste utvei → placeholder                      ===
  // =====================================================================
  console.warn(
    `⚠️ All image sources failed for ${category}, using placeholder.`,
  );
  return {
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(category)}/800/400`,
    source: "Fallback",
    score: 0,
  };
}
