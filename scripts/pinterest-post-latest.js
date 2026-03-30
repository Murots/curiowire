// import { createClient } from "@supabase/supabase-js";
// import OpenAI from "openai";
// import sharp from "sharp";
// import fs from "fs";

// const {
//   SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY,
//   PINTEREST_ACCESS_TOKEN,
//   SITE_URL,
//   PINTEREST_POSTING_ENABLED,
//   OPENAI_API_KEY,
// } = process.env;

// if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
// if (!SUPABASE_SERVICE_ROLE_KEY) {
//   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
// }
// if (!SITE_URL) throw new Error("Missing SITE_URL");
// if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// const PINTEREST_API_BASE_PROD = "https://api.pinterest.com";

// const BOARD_MAP = {
//   science: process.env.PINTEREST_BOARD_ID_SCIENCE,
//   technology: process.env.PINTEREST_BOARD_ID_TECHNOLOGY,
//   space: process.env.PINTEREST_BOARD_ID_SPACE,
//   nature: process.env.PINTEREST_BOARD_ID_NATURE,
//   health: process.env.PINTEREST_BOARD_ID_HEALTH,
//   history: process.env.PINTEREST_BOARD_ID_HISTORY,
//   culture: process.env.PINTEREST_BOARD_ID_CULTURE,
//   sports: process.env.PINTEREST_BOARD_ID_SPORTS,
//   products: process.env.PINTEREST_BOARD_ID_PRODUCTS,
//   world: process.env.PINTEREST_BOARD_ID_WORLD,
//   crime: process.env.PINTEREST_BOARD_ID_CRIME,
//   mystery: process.env.PINTEREST_BOARD_ID_MYSTERY,
//   general: process.env.PINTEREST_BOARD_ID_GENERAL,
// };

// function safeStr(v, fallback = "") {
//   return typeof v === "string" && v.trim() ? v.trim() : fallback;
// }

// function stripHtml(html) {
//   return String(html || "")
//     .replace(/<[^>]+>/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function normalizeImageSource(source) {
//   return safeStr(source).toLowerCase();
// }

// function isWikimedia(card) {
//   return normalizeImageSource(card.image_source).includes("wikimedia");
// }

// function isPostingEnabled() {
//   return String(PINTEREST_POSTING_ENABLED || "").toLowerCase() === "true";
// }

// function titleCase(s) {
//   return safeStr(s)
//     .toLowerCase()
//     .replace(/\b\w/g, (m) => m.toUpperCase());
// }

// function normalizeWhitespace(str) {
//   return safeStr(str).replace(/\s+/g, " ").trim();
// }

// function stripTrailingPunctuation(str) {
//   return safeStr(str)
//     .replace(/[.!?,:;…\-\s]+$/g, "")
//     .trim();
// }

// function stripParenthetical(str) {
//   return safeStr(str)
//     .replace(/\([^)]*\)/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function sentenceCase(str) {
//   const s = normalizeWhitespace(str);
//   if (!s) return "";
//   return s.charAt(0).toUpperCase() + s.slice(1);
// }

// function splitTitleParts(title) {
//   const raw = normalizeWhitespace(title);
//   if (!raw) return { left: "", right: "" };

//   const separators = [":", "—", "–", "-", "|"];
//   for (const sep of separators) {
//     const idx = raw.indexOf(sep);
//     if (idx > 0) {
//       const left = raw.slice(0, idx).trim();
//       const right = raw.slice(idx + 1).trim();
//       if (left && right) return { left, right };
//     }
//   }

//   return { left: raw, right: "" };
// }

// function extractPrimaryTopic(title) {
//   const { left } = splitTitleParts(title);
//   return stripTrailingPunctuation(stripParenthetical(left || title));
// }

// function extractSecondaryTopic(title) {
//   const { right } = splitTitleParts(title);
//   return stripTrailingPunctuation(stripParenthetical(right));
// }

// function extractInterestingAngle(card) {
//   const candidates = [
//     safeStr(card.seo_description),
//     stripHtml(card.summary_normalized),
//     stripHtml(card.fun_fact),
//     stripHtml(card.card_text),
//   ]
//     .map(normalizeWhitespace)
//     .filter(Boolean);

//   for (const text of candidates) {
//     const patterns = [
//       /(?:reveals?|show(?:s|ed)?|explains?|uncovers?|suggests?)\s+(.*?)(?:[.?!]|$)/i,
//       /(?:understanding of|evidence of|insight into)\s+(.*?)(?:[.?!]|$)/i,
//       /(?:about)\s+(.*?)(?:[.?!]|$)/i,
//     ];

//     for (const pattern of patterns) {
//       const match = text.match(pattern);
//       if (match?.[1]) {
//         const cleaned = stripTrailingPunctuation(
//           normalizeWhitespace(
//             match[1]
//               .replace(/^(that|how)\s+/i, "")
//               .replace(/\bfrom over .*$/i, "")
//               .replace(/\bover \d[\d,.\s-]* years? ago.*$/i, "")
//               .replace(/\bmore than \d[\d,.\s-]* years? ago.*$/i, ""),
//           ),
//         );

//         if (cleaned.length >= 8) return cleaned;
//       }
//     }
//   }

//   return "";
// }

// function categoryAngleLabel(category) {
//   switch (safeStr(category).toLowerCase()) {
//     case "science":
//       return "science";
//     case "technology":
//       return "technology";
//     case "space":
//       return "space";
//     case "nature":
//       return "nature";
//     case "health":
//       return "health";
//     case "history":
//       return "history";
//     case "culture":
//       return "culture";
//     case "sports":
//       return "sports";
//     case "products":
//       return "design";
//     case "world":
//       return "history";
//     case "crime":
//       return "mystery";
//     case "mystery":
//       return "mystery";
//     default:
//       return "story";
//   }
// }

// function words(str) {
//   return normalizeWhitespace(str).split(" ").filter(Boolean);
// }

// function limitWords(str, maxWords = 6) {
//   const w = words(stripTrailingPunctuation(str));
//   if (w.length <= maxWords) return w.join(" ");
//   return w.slice(0, maxWords).join(" ");
// }

// function shortenNaturalByWords(str, maxWords = 6, maxChars = 48) {
//   let s = stripTrailingPunctuation(normalizeWhitespace(str));
//   if (!s) return "";

//   let w = words(s);
//   if (w.length > maxWords) {
//     s = w.slice(0, maxWords).join(" ");
//   }

//   if (s.length <= maxChars) return s;

//   const trimmed = s.slice(0, maxChars + 1);
//   const lastSpace = trimmed.lastIndexOf(" ");
//   if (lastSpace > 0) {
//     s = trimmed.slice(0, lastSpace);
//   } else {
//     s = s.slice(0, maxChars);
//   }

//   return stripTrailingPunctuation(s) + "…";
// }

// function buildPinterestTitle(title) {
//   return shortenNaturalByWords(title, 7, 56);
// }

// function buildOverlayTitle(title) {
//   return shortenNaturalByWords(title, 8, 62);
// }

// function normalizeTitleForCompare(title) {
//   return normalizeWhitespace(title)
//     .toLowerCase()
//     .replace(/[^\w\s]/g, "")
//     .trim();
// }

// function isValidPinterestTitle(
//   title,
//   minWords = 3,
//   maxWords = 7,
//   maxChars = 60,
// ) {
//   const cleaned = normalizeWhitespace(title);
//   if (!cleaned) return false;

//   const count = words(cleaned).length;
//   if (count < minWords || count > maxWords) return false;
//   if (cleaned.length > maxChars) return false;

//   return true;
// }

// function buildRuleBasedTitleVariants(
//   card,
//   existingNormalizedTitles = new Set(),
// ) {
//   const topic = extractPrimaryTopic(card.title);
//   const secondary = extractSecondaryTopic(card.title);
//   const angle = extractInterestingAngle(card);
//   const categoryLabel = categoryAngleLabel(card.category);

//   const baseTopic = stripTrailingPunctuation(topic) || "This Story";
//   const shortSecondary = secondary ? limitWords(secondary, 4) : "";
//   const shortAngle = angle ? limitWords(sentenceCase(angle), 4) : "";

//   const rawCandidates = [
//     { key: "secret", title: `The secret of ${baseTopic}` },
//     { key: "inside", title: `Inside ${baseTopic}` },
//     { key: "story", title: `The story of ${baseTopic}` },
//     { key: "explained", title: `${baseTopic} explained` },
//     { key: "truth", title: `The truth about ${baseTopic}` },
//     { key: "mystery", title: `The mystery of ${baseTopic}` },
//     { key: "why", title: `Why ${baseTopic} mattered` },
//     {
//       key: "surprising",
//       title: `The surprising ${categoryLabel} of ${baseTopic}`,
//     },
//     {
//       key: "secondary",
//       title: shortSecondary
//         ? `${shortSecondary} in ${baseTopic}`
//         : `What made ${baseTopic} essential`,
//     },
//     {
//       key: "angle",
//       title: shortAngle
//         ? `${baseTopic} and ${shortAngle}`
//         : `What ${baseTopic} reveals`,
//     },
//   ];

//   const results = [];
//   const usedTitles = new Set(existingNormalizedTitles);
//   const usedKeys = new Set();

//   function tryAddVariant(key, sourceTitle) {
//     if (!sourceTitle || usedKeys.has(key)) return false;

//     const pinTitle = buildPinterestTitle(sourceTitle);
//     const overlayTitle = buildOverlayTitle(sourceTitle);

//     if (!isValidPinterestTitle(pinTitle, 3, 7, 60)) return false;
//     if (!overlayTitle) return false;

//     const normalizedPin = normalizeTitleForCompare(pinTitle);
//     if (!normalizedPin || usedTitles.has(normalizedPin)) return false;

//     results.push({
//       key,
//       pinTitle,
//       overlayTitle,
//     });

//     usedTitles.add(normalizedPin);
//     usedKeys.add(key);
//     return true;
//   }

//   for (const candidate of rawCandidates) {
//     tryAddVariant(candidate.key, candidate.title);
//     if (results.length === 3) break;
//   }

//   if (results.length < 3) {
//     const fallbackTopic = limitWords(baseTopic, 3) || "This Story";

//     const fallbackPool = [
//       { key: "fallback_a", title: `${fallbackTopic} explained` },
//       { key: "fallback_b", title: `Inside ${fallbackTopic}` },
//       { key: "fallback_c", title: `Why ${fallbackTopic} mattered` },
//       { key: "fallback_d", title: `The story of ${fallbackTopic}` },
//       { key: "fallback_e", title: `The secret of ${fallbackTopic}` },
//       { key: "fallback_f", title: `What ${fallbackTopic} reveals` },
//     ];

//     for (const fallback of fallbackPool) {
//       tryAddVariant(fallback.key, fallback.title);
//       if (results.length === 3) break;
//     }
//   }

//   if (results.length < 3) {
//     throw new Error(
//       `Could not build 3 unique Pinterest title variants for card "${card.title}". Generated: ${results.length}`,
//     );
//   }

//   return results;
// }

// async function generatePinterestTitlesWithGPT(card) {
//   const prompt = `
// Create 3 Pinterest-friendly titles for this article.

// Rules:
// - Return ONLY valid JSON.
// - Write in English.
// - Each title must be maximum 7 words.
// - Prefer 5 to 7 words.
// - Make them curiosity-driven and clickable.
// - Keep them accurate to the article.
// - Do not use emojis.
// - Do not use quotation marks inside titles.
// - Do not use colons.
// - Do not repeat the article title structure.
// - Avoid generic phrases like "This story" or "Learn about".
// - Make all 3 titles meaningfully different.
// - Avoid weak filler like "interesting", "amazing", "incredible".
// - Avoid full-sentence headlines. These should feel like short Pinterest hooks.

// Return this exact JSON format:
// {
//   "titles": [
//     "title one",
//     "title two",
//     "title three"
//   ]
// }

// Article title: ${safeStr(card.title)}
// Category: ${safeStr(card.category)}
// SEO description: ${safeStr(card.seo_description)}
// Summary: ${stripHtml(card.summary_normalized).slice(0, 500)}
// Fun fact: ${stripHtml(card.fun_fact).slice(0, 300)}
// Card text: ${stripHtml(card.card_text).slice(0, 500)}
// `;

//   try {
//     const r = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 120,
//       temperature: 0.7,
//       response_format: { type: "json_object" },
//     });

//     const content = r.choices?.[0]?.message?.content || "{}";
//     const parsed = JSON.parse(content);
//     return Array.isArray(parsed.titles) ? parsed.titles : [];
//   } catch (err) {
//     console.warn("GPT title generation failed:", err.message);
//     return [];
//   }
// }

// async function buildTitleVariants(card) {
//   const gptTitles = await generatePinterestTitlesWithGPT(card);

//   const results = [];
//   const usedTitles = new Set();

//   for (const [index, rawTitle] of gptTitles.entries()) {
//     const cleanedSource = stripTrailingPunctuation(
//       normalizeWhitespace(rawTitle),
//     );
//     const pinTitle = buildPinterestTitle(cleanedSource);
//     const overlayTitle = buildOverlayTitle(cleanedSource);

//     if (!isValidPinterestTitle(pinTitle, 3, 7, 60)) continue;
//     if (!overlayTitle) continue;

//     const normalized = normalizeTitleForCompare(pinTitle);
//     if (!normalized || usedTitles.has(normalized)) continue;

//     results.push({
//       key: `gpt_${index + 1}`,
//       pinTitle,
//       overlayTitle,
//     });

//     usedTitles.add(normalized);

//     if (results.length === 3) break;
//   }

//   if (results.length === 3) {
//     return results;
//   }

//   const fallback = buildRuleBasedTitleVariants(card, usedTitles);
//   const merged = [...results];

//   for (const variant of fallback) {
//     const normalized = normalizeTitleForCompare(variant.pinTitle);
//     if (!normalized || usedTitles.has(normalized)) continue;

//     merged.push(variant);
//     usedTitles.add(normalized);

//     if (merged.length === 3) break;
//   }

//   if (merged.length < 3) {
//     throw new Error(
//       `Could not build 3 unique Pinterest title variants for card "${card.title}". Generated: ${merged.length}`,
//     );
//   }

//   return merged.slice(0, 3);
// }

// function buildDescription(card) {
//   const base =
//     safeStr(card.seo_description) ||
//     stripHtml(card.summary_normalized) ||
//     stripHtml(card.fun_fact) ||
//     stripHtml(card.card_text) ||
//     safeStr(card.title);

//   const articleUrl = `${SITE_URL}/article/${card.id}`;

//   let desc = `${base}\n\nRead more: ${articleUrl}`;

//   if (isWikimedia(card) && safeStr(card.image_credit)) {
//     desc += `\n\nImage credit: ${stripHtml(card.image_credit)}`;
//   }

//   return desc.slice(0, 800);
// }

// function escapeXml(str) {
//   return String(str || "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;");
// }

// function wrapTitle(title, maxLineLength = 18, maxLines = 4) {
//   const titleWords = safeStr(title).split(/\s+/).filter(Boolean);
//   const lines = [];
//   let current = "";

//   for (const word of titleWords) {
//     const candidate = current ? `${current} ${word}` : word;

//     if (candidate.length <= maxLineLength) {
//       current = candidate;
//       continue;
//     }

//     if (current) {
//       lines.push(current);
//       current = word;
//     } else {
//       lines.push(word);
//       current = "";
//     }

//     if (lines.length >= maxLines - 1) break;
//   }

//   if (current && lines.length < maxLines) {
//     lines.push(current);
//   }

//   const original = titleWords.join(" ");
//   const rendered = lines.join(" ");
//   if (lines.length === maxLines && original.length > rendered.length) {
//     lines[maxLines - 1] = stripTrailingPunctuation(lines[maxLines - 1]) + "…";
//   }

//   return lines.slice(0, maxLines);
// }

// function buildOverlaySVG(title, category) {
//   const lines = wrapTitle(title, 18, 4);
//   const lineHeight = 78;
//   const blockHeight = lines.length * lineHeight;

//   const startY = 1500 - 135 - blockHeight;
//   const kickerGap = 62;

//   const titleSvg = lines
//     .map((line, i) => {
//       const y = startY + i * lineHeight;
//       const text = escapeXml(line);

//       return `
//       <text
//         x="70"
//         y="${y + 3}"
//         fill="rgba(0,0,0,0.45)"
//         font-size="66"
//         font-weight="700"
//         font-family="Georgia, Times New Roman, serif"
//       >${text}</text>
//       <text
//         x="68"
//         y="${y}"
//         fill="white"
//         font-size="66"
//         font-weight="700"
//         font-family="Georgia, Times New Roman, serif"
//       >${text}</text>`;
//     })
//     .join("");

//   const kicker = escapeXml(titleCase(category || "CurioWire"));

//   return `
//   <svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">
//     <defs>
//       <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
//         <stop offset="0%" stop-color="rgba(0,0,0,0)" />
//         <stop offset="18%" stop-color="rgba(0,0,0,0.02)" />
//         <stop offset="34%" stop-color="rgba(0,0,0,0.08)" />
//         <stop offset="50%" stop-color="rgba(0,0,0,0.18)" />
//         <stop offset="66%" stop-color="rgba(0,0,0,0.38)" />
//         <stop offset="82%" stop-color="rgba(0,0,0,0.68)" />
//         <stop offset="100%" stop-color="rgba(0,0,0,0.96)" />
//       </linearGradient>
//     </defs>

//     <rect x="0" y="0" width="1000" height="1500" fill="url(#bottomFade)" />

//     <text
//       x="70"
//       y="${startY - kickerGap}"
//       fill="rgba(255,255,255,0.94)"
//       font-size="28"
//       font-weight="700"
//       font-family="Arial, Helvetica, sans-serif"
//       letter-spacing="2"
//     >${kicker.toUpperCase()}</text>

//     ${titleSvg}

//     <text
//       x="68"
//       y="1434"
//       fill="rgba(255,255,255,0.95)"
//       font-size="30"
//       font-weight="600"
//       font-family="Arial, Helvetica, sans-serif"
//     >CurioWire.com</text>
//   </svg>
//   `;
// }

// async function createPinterestImage(card, overlayTitle, variantKey) {
//   try {
//     const res = await fetch(card.image_url);
//     if (!res.ok) {
//       throw new Error(`Image download failed: ${res.status}`);
//     }

//     const buffer = Buffer.from(await res.arrayBuffer());
//     const overlaySVG = buildOverlaySVG(overlayTitle, card.category);
//     const overlayBuffer = Buffer.from(overlaySVG);

//     const filePath = `/tmp/pinterest-${card.id}-${variantKey}.jpg`;

//     await sharp(buffer)
//       .resize(1000, 1500, { fit: "cover", position: "centre" })
//       .composite([{ input: overlayBuffer }])
//       .jpeg({ quality: 92 })
//       .toFile(filePath);

//     return filePath;
//   } catch (err) {
//     console.warn("Pinterest image generation failed:", err.message);
//     return null;
//   }
// }

// async function uploadPinterestImage(filePath, cardId, variantKey) {
//   try {
//     const storagePath = `pinterest/${cardId}-${variantKey}-${Date.now()}.jpg`;

//     const { error: uploadError } = await supabase.storage
//       .from("curiowire")
//       .upload(storagePath, fs.readFileSync(filePath), {
//         contentType: "image/jpeg",
//         upsert: false,
//       });

//     if (uploadError) throw uploadError;

//     const { data } = supabase.storage
//       .from("curiowire")
//       .getPublicUrl(storagePath);

//     return data.publicUrl;
//   } catch (err) {
//     console.warn("Supabase upload failed:", err.message);
//     return null;
//   }
// }

// async function existingPostsForCard(cardId) {
//   const { data, error } = await supabase
//     .from("pinterest_posts")
//     .select("id, status, pin_title, variant_key")
//     .eq("card_id", cardId);

//   if (error) throw error;
//   return Array.isArray(data) ? data : [];
// }

// async function postPin({ boardId, title, description, articleUrl, imageUrl }) {
//   if (!PINTEREST_ACCESS_TOKEN) {
//     throw new Error("Missing PINTEREST_ACCESS_TOKEN");
//   }

//   const res = await fetch(`${PINTEREST_API_BASE_PROD}/v5/pins`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       board_id: boardId,
//       title,
//       description,
//       link: articleUrl,
//       media_source: {
//         source_type: "image_url",
//         url: imageUrl,
//       },
//     }),
//   });

//   const data = await res.json().catch(() => ({}));
//   return { res, data };
// }

// async function insertPinterestRow(payload) {
//   const { error } = await supabase.from("pinterest_posts").insert(payload);
//   if (error) throw error;
// }

// async function run() {
//   console.log("Fetching latest article...");

//   const { data: card, error: cardError } = await supabase
//     .from("curiosity_cards")
//     .select("*")
//     .eq("status", "published")
//     .order("created_at", { ascending: false })
//     .limit(1)
//     .single();

//   if (cardError) throw cardError;

//   if (!card) {
//     console.log("No article found");
//     return;
//   }

//   if (!card.image_url) {
//     console.log(`Latest article ${card.id} has no image_url. Skipping.`);
//     return;
//   }

//   console.log("Latest article:", card.id, card.title);

//   const boardId = BOARD_MAP[card.category] || BOARD_MAP.general;

//   if (!boardId) {
//     throw new Error(
//       `Missing production Pinterest board ID for category: ${card.category}`,
//     );
//   }

//   const articleUrl = `${SITE_URL}/article/${card.id}`;
//   const description = buildDescription(card);
//   const variants = await buildTitleVariants(card);
//   const existing = await existingPostsForCard(card.id);

//   const existingVariants = new Set(
//     existing
//       .map((row) => safeStr(row.variant_key).toLowerCase())
//       .filter(Boolean),
//   );

//   console.log("Variant count:", variants.length);
//   console.log(
//     "Prepared Pinterest variants:",
//     variants
//       .map((v) => `[${v.key}] pin="${v.pinTitle}" overlay="${v.overlayTitle}"`)
//       .join(" | "),
//   );

//   for (const variant of variants) {
//     if (existingVariants.has(variant.key.toLowerCase())) {
//       console.log(
//         `Variant already handled for card ${card.id}: "${variant.key}". Skipping.`,
//       );
//       continue;
//     }

//     let pinterestImageUrl = card.image_url;

//     const pinterestFile = await createPinterestImage(
//       card,
//       variant.overlayTitle,
//       variant.key,
//     );

//     if (pinterestFile) {
//       const uploadedUrl = await uploadPinterestImage(
//         pinterestFile,
//         card.id,
//         variant.key,
//       );
//       if (uploadedUrl) {
//         pinterestImageUrl = uploadedUrl;
//       }
//     }

//     if (!isPostingEnabled()) {
//       console.log(
//         `PINTEREST_POSTING_ENABLED is false. Saving test row only for variant "${variant.key}".`,
//       );

//       await insertPinterestRow({
//         card_id: card.id,
//         variant_key: variant.key,
//         pinterest_pin_id: null,
//         board_key: card.category,
//         destination_url: articleUrl,
//         image_url: pinterestImageUrl,
//         pin_title: variant.pinTitle,
//         pin_description: description,
//         status: "skipped",
//       });

//       console.log(`Pinterest test row stored for variant "${variant.key}".`);
//       continue;
//     }

//     console.log(`Posting to Pinterest: [${variant.key}] ${variant.pinTitle}`);
//     console.log(`Overlay title: ${variant.overlayTitle}`);

//     const { res, data } = await postPin({
//       boardId,
//       title: variant.pinTitle,
//       description,
//       articleUrl,
//       imageUrl: pinterestImageUrl,
//     });

//     console.log("Pinterest result:", data);

//     if (!res.ok || !data?.id) {
//       throw new Error(
//         `Pinterest post failed: ${res.status} ${JSON.stringify(data).slice(0, 500)}`,
//       );
//     }

//     await insertPinterestRow({
//       card_id: card.id,
//       variant_key: variant.key,
//       pinterest_pin_id: data.id,
//       board_key: card.category,
//       destination_url: articleUrl,
//       image_url: pinterestImageUrl,
//       pin_title: variant.pinTitle,
//       pin_description: description,
//       status: "posted",
//     });

//     console.log(`Pinterest post stored for variant "${variant.key}".`);
//   }

//   console.log("Done.");
// }

// run().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import sharp from "sharp";
import fs from "fs";
import { getCategoryColor } from "../lib/categoryColors.js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PINTEREST_ACCESS_TOKEN,
  SITE_URL,
  PINTEREST_POSTING_ENABLED,
  OPENAI_API_KEY,
} = process.env;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}
if (!SITE_URL) throw new Error("Missing SITE_URL");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const PINTEREST_API_BASE_PROD = "https://api.pinterest.com";

const BOARD_MAP = {
  science: process.env.PINTEREST_BOARD_ID_SCIENCE,
  technology: process.env.PINTEREST_BOARD_ID_TECHNOLOGY,
  space: process.env.PINTEREST_BOARD_ID_SPACE,
  nature: process.env.PINTEREST_BOARD_ID_NATURE,
  health: process.env.PINTEREST_BOARD_ID_HEALTH,
  history: process.env.PINTEREST_BOARD_ID_HISTORY,
  culture: process.env.PINTEREST_BOARD_ID_CULTURE,
  sports: process.env.PINTEREST_BOARD_ID_SPORTS,
  products: process.env.PINTEREST_BOARD_ID_PRODUCTS,
  world: process.env.PINTEREST_BOARD_ID_WORLD,
  crime: process.env.PINTEREST_BOARD_ID_CRIME,
  mystery: process.env.PINTEREST_BOARD_ID_MYSTERY,
  general: process.env.PINTEREST_BOARD_ID_GENERAL,
};

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageSource(source) {
  return safeStr(source).toLowerCase();
}

function isWikimedia(card) {
  return normalizeImageSource(card.image_source).includes("wikimedia");
}

function isPostingEnabled() {
  return String(PINTEREST_POSTING_ENABLED || "").toLowerCase() === "true";
}

function titleCase(s) {
  return safeStr(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeWhitespace(str) {
  return safeStr(str).replace(/\s+/g, " ").trim();
}

function stripTrailingPunctuation(str) {
  return safeStr(str)
    .replace(/[.!?,:;…\-\s]+$/g, "")
    .trim();
}

function stripParenthetical(str) {
  return safeStr(str)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(str) {
  const s = normalizeWhitespace(str);
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function splitTitleParts(title) {
  const raw = normalizeWhitespace(title);
  if (!raw) return { left: "", right: "" };

  const separators = [":", "—", "–", "-", "|"];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      const left = raw.slice(0, idx).trim();
      const right = raw.slice(idx + 1).trim();
      if (left && right) return { left, right };
    }
  }

  return { left: raw, right: "" };
}

function extractPrimaryTopic(title) {
  const { left } = splitTitleParts(title);
  return stripTrailingPunctuation(stripParenthetical(left || title));
}

function extractSecondaryTopic(title) {
  const { right } = splitTitleParts(title);
  return stripTrailingPunctuation(stripParenthetical(right));
}

function extractInterestingAngle(card) {
  const candidates = [
    safeStr(card.seo_description),
    stripHtml(card.summary_normalized),
    stripHtml(card.fun_fact),
    stripHtml(card.card_text),
  ]
    .map(normalizeWhitespace)
    .filter(Boolean);

  for (const text of candidates) {
    const patterns = [
      /(?:reveals?|show(?:s|ed)?|explains?|uncovers?|suggests?)\s+(.*?)(?:[.?!]|$)/i,
      /(?:understanding of|evidence of|insight into)\s+(.*?)(?:[.?!]|$)/i,
      /(?:about)\s+(.*?)(?:[.?!]|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const cleaned = stripTrailingPunctuation(
          normalizeWhitespace(
            match[1]
              .replace(/^(that|how)\s+/i, "")
              .replace(/\bfrom over .*$/i, "")
              .replace(/\bover \d[\d,.\s-]* years? ago.*$/i, "")
              .replace(/\bmore than \d[\d,.\s-]* years? ago.*$/i, ""),
          ),
        );

        if (cleaned.length >= 8) return cleaned;
      }
    }
  }

  return "";
}

function categoryAngleLabel(category) {
  switch (safeStr(category).toLowerCase()) {
    case "science":
      return "science";
    case "technology":
      return "technology";
    case "space":
      return "space";
    case "nature":
      return "nature";
    case "health":
      return "health";
    case "history":
      return "history";
    case "culture":
      return "culture";
    case "sports":
      return "sports";
    case "products":
      return "design";
    case "world":
      return "history";
    case "crime":
      return "mystery";
    case "mystery":
      return "mystery";
    default:
      return "story";
  }
}

function words(str) {
  return normalizeWhitespace(str).split(" ").filter(Boolean);
}

function limitWords(str, maxWords = 6) {
  const w = words(stripTrailingPunctuation(str));
  if (w.length <= maxWords) return w.join(" ");
  return w.slice(0, maxWords).join(" ");
}

function shortenNaturalByWords(str, maxWords = 6, maxChars = 48) {
  let s = stripTrailingPunctuation(normalizeWhitespace(str));
  if (!s) return "";

  let w = words(s);
  if (w.length > maxWords) {
    s = w.slice(0, maxWords).join(" ");
  }

  if (s.length <= maxChars) return s;

  const trimmed = s.slice(0, maxChars + 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 0) {
    s = trimmed.slice(0, lastSpace);
  } else {
    s = s.slice(0, maxChars);
  }

  return stripTrailingPunctuation(s) + "…";
}

function buildPinterestTitle(title) {
  return shortenNaturalByWords(title, 7, 56);
}

function buildOverlayTitle(title) {
  return shortenNaturalByWords(title, 8, 62);
}

function normalizeTitleForCompare(title) {
  return normalizeWhitespace(title)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

function isValidPinterestTitle(
  title,
  minWords = 3,
  maxWords = 7,
  maxChars = 60,
) {
  const cleaned = normalizeWhitespace(title);
  if (!cleaned) return false;

  const count = words(cleaned).length;
  if (count < minWords || count > maxWords) return false;
  if (cleaned.length > maxChars) return false;

  return true;
}

function buildRuleBasedTitleVariants(
  card,
  existingNormalizedTitles = new Set(),
) {
  const topic = extractPrimaryTopic(card.title);
  const secondary = extractSecondaryTopic(card.title);
  const angle = extractInterestingAngle(card);
  const categoryLabel = categoryAngleLabel(card.category);

  const baseTopic = stripTrailingPunctuation(topic) || "This Story";
  const shortSecondary = secondary ? limitWords(secondary, 4) : "";
  const shortAngle = angle ? limitWords(sentenceCase(angle), 4) : "";

  const rawCandidates = [
    { key: "secret", title: `The secret of ${baseTopic}` },
    { key: "inside", title: `Inside ${baseTopic}` },
    { key: "story", title: `The story of ${baseTopic}` },
    { key: "explained", title: `${baseTopic} explained` },
    { key: "truth", title: `The truth about ${baseTopic}` },
    { key: "mystery", title: `The mystery of ${baseTopic}` },
    { key: "why", title: `Why ${baseTopic} mattered` },
    {
      key: "surprising",
      title: `The surprising ${categoryLabel} of ${baseTopic}`,
    },
    {
      key: "secondary",
      title: shortSecondary
        ? `${shortSecondary} in ${baseTopic}`
        : `What made ${baseTopic} essential`,
    },
    {
      key: "angle",
      title: shortAngle
        ? `${baseTopic} and ${shortAngle}`
        : `What ${baseTopic} reveals`,
    },
  ];

  const results = [];
  const usedTitles = new Set(existingNormalizedTitles);
  const usedKeys = new Set();

  function tryAddVariant(key, sourceTitle) {
    if (!sourceTitle || usedKeys.has(key)) return false;

    const pinTitle = buildPinterestTitle(sourceTitle);
    const overlayTitle = buildOverlayTitle(sourceTitle);

    if (!isValidPinterestTitle(pinTitle, 3, 7, 60)) return false;
    if (!overlayTitle) return false;

    const normalizedPin = normalizeTitleForCompare(pinTitle);
    if (!normalizedPin || usedTitles.has(normalizedPin)) return false;

    results.push({
      key,
      pinTitle,
      overlayTitle,
    });

    usedTitles.add(normalizedPin);
    usedKeys.add(key);
    return true;
  }

  for (const candidate of rawCandidates) {
    tryAddVariant(candidate.key, candidate.title);
    if (results.length === 3) break;
  }

  if (results.length < 3) {
    const fallbackTopic = limitWords(baseTopic, 3) || "This Story";

    const fallbackPool = [
      { key: "fallback_a", title: `${fallbackTopic} explained` },
      { key: "fallback_b", title: `Inside ${fallbackTopic}` },
      { key: "fallback_c", title: `Why ${fallbackTopic} mattered` },
      { key: "fallback_d", title: `The story of ${fallbackTopic}` },
      { key: "fallback_e", title: `The secret of ${fallbackTopic}` },
      { key: "fallback_f", title: `What ${fallbackTopic} reveals` },
    ];

    for (const fallback of fallbackPool) {
      tryAddVariant(fallback.key, fallback.title);
      if (results.length === 3) break;
    }
  }

  if (results.length < 3) {
    throw new Error(
      `Could not build 3 unique Pinterest title variants for card "${card.title}". Generated: ${results.length}`,
    );
  }

  return results;
}

async function generatePinterestTitlesWithGPT(card) {
  const prompt = `
Create 3 Pinterest-friendly titles for this article.

Rules:
- Return ONLY valid JSON.
- Write in English.
- Each title must be maximum 7 words.
- Prefer 5 to 7 words.
- Make them curiosity-driven and clickable.
- Keep them accurate to the article.
- Do not use emojis.
- Do not use quotation marks inside titles.
- Do not use colons.
- Do not repeat the article title structure.
- Avoid generic phrases like "This story" or "Learn about".
- Make all 3 titles meaningfully different.
- Avoid weak filler like "interesting", "amazing", "incredible".
- Avoid full-sentence headlines. These should feel like short Pinterest hooks.

Return this exact JSON format:
{
  "titles": [
    "title one",
    "title two",
    "title three"
  ]
}

Article title: ${safeStr(card.title)}
Category: ${safeStr(card.category)}
SEO description: ${safeStr(card.seo_description)}
Summary: ${stripHtml(card.summary_normalized).slice(0, 500)}
Fun fact: ${stripHtml(card.fun_fact).slice(0, 300)}
Card text: ${stripHtml(card.card_text).slice(0, 500)}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = r.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.titles) ? parsed.titles : [];
  } catch (err) {
    console.warn("GPT title generation failed:", err.message);
    return [];
  }
}

async function buildTitleVariants(card) {
  const gptTitles = await generatePinterestTitlesWithGPT(card);

  const results = [];
  const usedTitles = new Set();

  for (const [index, rawTitle] of gptTitles.entries()) {
    const cleanedSource = stripTrailingPunctuation(
      normalizeWhitespace(rawTitle),
    );
    const pinTitle = buildPinterestTitle(cleanedSource);
    const overlayTitle = buildOverlayTitle(cleanedSource);

    if (!isValidPinterestTitle(pinTitle, 3, 7, 60)) continue;
    if (!overlayTitle) continue;

    const normalized = normalizeTitleForCompare(pinTitle);
    if (!normalized || usedTitles.has(normalized)) continue;

    results.push({
      key: `gpt_${index + 1}`,
      pinTitle,
      overlayTitle,
    });

    usedTitles.add(normalized);

    if (results.length === 3) break;
  }

  if (results.length === 3) {
    return results;
  }

  const fallback = buildRuleBasedTitleVariants(card, usedTitles);
  const merged = [...results];

  for (const variant of fallback) {
    const normalized = normalizeTitleForCompare(variant.pinTitle);
    if (!normalized || usedTitles.has(normalized)) continue;

    merged.push(variant);
    usedTitles.add(normalized);

    if (merged.length === 3) break;
  }

  if (merged.length < 3) {
    throw new Error(
      `Could not build 3 unique Pinterest title variants for card "${card.title}". Generated: ${merged.length}`,
    );
  }

  return merged.slice(0, 3);
}

function buildDescription(card) {
  const base =
    safeStr(card.seo_description) ||
    stripHtml(card.summary_normalized) ||
    stripHtml(card.fun_fact) ||
    stripHtml(card.card_text) ||
    safeStr(card.title);

  const articleUrl = `${SITE_URL}/article/${card.id}`;

  let desc = `${base}\n\nRead more: ${articleUrl}`;

  if (isWikimedia(card) && safeStr(card.image_credit)) {
    desc += `\n\nImage credit: ${stripHtml(card.image_credit)}`;
  }

  return desc.slice(0, 800);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryColor(category) {
  return getCategoryColor(category) || "#1f2937";
}

function buildCategoryBadgeSVG(category, x, y) {
  const label = escapeXml(safeStr(category || "CurioWire").toUpperCase());
  const fill = categoryColor(category);

  const approxTextWidth = Math.max(108, label.length * 13.2);
  const width = approxTextWidth + 68;

  const height = 48;
  const radius = 24;

  return `
    <rect
      x="${x}"
      y="${y}"
      width="${width}"
      height="${height}"
      rx="${radius}"
      ry="${radius}"
      fill="${fill}"
      opacity="0.98"
    />
    <text
      x="${x + width / 2}"
      y="${y + height / 2}"
      text-anchor="middle"
      dominant-baseline="central"
      fill="white"
      font-size="28"
      font-weight="700"
      font-family="Arial, Helvetica, sans-serif"
      letter-spacing="1.6"
    >${label}</text>
  `;
}

function wrapTitle(title, maxLineLength = 18, maxLines = 4) {
  const titleWords = safeStr(title).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of titleWords) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = "";
    }

    if (lines.length >= maxLines - 1) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const original = titleWords.join(" ");
  const rendered = lines.join(" ");
  if (lines.length === maxLines && original.length > rendered.length) {
    lines[maxLines - 1] = stripTrailingPunctuation(lines[maxLines - 1]) + "…";
  }

  return lines.slice(0, maxLines);
}

function buildOverlaySVG(title, category) {
  const lines = wrapTitle(title, 18, 4);
  const lineHeight = 78;
  const blockHeight = lines.length * lineHeight;

  const startY = 1500 - 135 - blockHeight;

  const badgeX = 70;
  const badgeHeight = 48;
  const badgeToTitleGap = 62;
  const badgeY = startY - badgeToTitleGap - badgeHeight;

  const titleSvg = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      const text = escapeXml(line);

      return `
      <text
        x="70"
        y="${y + 3}"
        fill="rgba(0,0,0,0.45)"
        font-size="66"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>
      <text
        x="68"
        y="${y}"
        fill="white"
        font-size="66"
        font-weight="700"
        font-family="Georgia, Times New Roman, serif"
      >${text}</text>`;
    })
    .join("");

  return `
  <svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)" />
        <stop offset="18%" stop-color="rgba(0,0,0,0.02)" />
        <stop offset="34%" stop-color="rgba(0,0,0,0.08)" />
        <stop offset="50%" stop-color="rgba(0,0,0,0.18)" />
        <stop offset="66%" stop-color="rgba(0,0,0,0.38)" />
        <stop offset="82%" stop-color="rgba(0,0,0,0.68)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.96)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="1000" height="1500" fill="url(#bottomFade)" />

    ${buildCategoryBadgeSVG(category, badgeX, badgeY)}

    ${titleSvg}

    <text
      x="68"
      y="1434"
      fill="rgba(255,255,255,0.95)"
      font-size="30"
      font-weight="600"
      font-family="Arial, Helvetica, sans-serif"
    >CurioWire.com</text>
  </svg>
  `;
}

async function createPinterestImage(card, overlayTitle, variantKey) {
  try {
    const res = await fetch(card.image_url);
    if (!res.ok) {
      throw new Error(`Image download failed: ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const overlaySVG = buildOverlaySVG(overlayTitle, card.category);
    const overlayBuffer = Buffer.from(overlaySVG);

    const filePath = `/tmp/pinterest-${card.id}-${variantKey}.jpg`;

    await sharp(buffer)
      .resize(1000, 1500, { fit: "cover", position: "centre" })
      .composite([{ input: overlayBuffer }])
      .jpeg({ quality: 92 })
      .toFile(filePath);

    return filePath;
  } catch (err) {
    console.warn("Pinterest image generation failed:", err.message);
    return null;
  }
}

async function uploadPinterestImage(filePath, cardId, variantKey) {
  try {
    const storagePath = `pinterest/${cardId}-${variantKey}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("curiowire")
      .upload(storagePath, fs.readFileSync(filePath), {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("curiowire")
      .getPublicUrl(storagePath);

    return data.publicUrl;
  } catch (err) {
    console.warn("Supabase upload failed:", err.message);
    return null;
  }
}

async function existingPostsForCard(cardId) {
  const { data, error } = await supabase
    .from("pinterest_posts")
    .select("id, status, pin_title, variant_key")
    .eq("card_id", cardId);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function postPin({ boardId, title, description, articleUrl, imageUrl }) {
  if (!PINTEREST_ACCESS_TOKEN) {
    throw new Error("Missing PINTEREST_ACCESS_TOKEN");
  }

  const res = await fetch(`${PINTEREST_API_BASE_PROD}/v5/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title,
      description,
      link: articleUrl,
      media_source: {
        source_type: "image_url",
        url: imageUrl,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function insertPinterestRow(payload) {
  const { error } = await supabase.from("pinterest_posts").insert(payload);
  if (error) throw error;
}

async function run() {
  console.log("Fetching latest article...");

  const { data: card, error: cardError } = await supabase
    .from("curiosity_cards")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (cardError) throw cardError;

  if (!card) {
    console.log("No article found");
    return;
  }

  if (!card.image_url) {
    console.log(`Latest article ${card.id} has no image_url. Skipping.`);
    return;
  }

  console.log("Latest article:", card.id, card.title);

  const boardId = BOARD_MAP[card.category] || BOARD_MAP.general;

  if (!boardId) {
    throw new Error(
      `Missing production Pinterest board ID for category: ${card.category}`,
    );
  }

  const articleUrl = `${SITE_URL}/article/${card.id}`;
  const description = buildDescription(card);
  const variants = await buildTitleVariants(card);
  const existing = await existingPostsForCard(card.id);

  const existingVariants = new Set(
    existing
      .map((row) => safeStr(row.variant_key).toLowerCase())
      .filter(Boolean),
  );

  console.log("Variant count:", variants.length);
  console.log(
    "Prepared Pinterest variants:",
    variants
      .map((v) => `[${v.key}] pin="${v.pinTitle}" overlay="${v.overlayTitle}"`)
      .join(" | "),
  );

  for (const variant of variants) {
    if (existingVariants.has(variant.key.toLowerCase())) {
      console.log(
        `Variant already handled for card ${card.id}: "${variant.key}". Skipping.`,
      );
      continue;
    }

    let pinterestImageUrl = card.image_url;

    const pinterestFile = await createPinterestImage(
      card,
      variant.overlayTitle,
      variant.key,
    );

    if (pinterestFile) {
      const uploadedUrl = await uploadPinterestImage(
        pinterestFile,
        card.id,
        variant.key,
      );
      if (uploadedUrl) {
        pinterestImageUrl = uploadedUrl;
      }
    }

    if (!isPostingEnabled()) {
      console.log(
        `PINTEREST_POSTING_ENABLED is false. Saving test row only for variant "${variant.key}".`,
      );

      await insertPinterestRow({
        card_id: card.id,
        variant_key: variant.key,
        pinterest_pin_id: null,
        board_key: card.category,
        destination_url: articleUrl,
        image_url: pinterestImageUrl,
        pin_title: variant.pinTitle,
        pin_description: description,
        status: "skipped",
      });

      console.log(`Pinterest test row stored for variant "${variant.key}".`);
      continue;
    }

    console.log(`Posting to Pinterest: [${variant.key}] ${variant.pinTitle}`);
    console.log(`Overlay title: ${variant.overlayTitle}`);

    const { res, data } = await postPin({
      boardId,
      title: variant.pinTitle,
      description,
      articleUrl,
      imageUrl: pinterestImageUrl,
    });

    console.log("Pinterest result:", data);

    if (!res.ok || !data?.id) {
      throw new Error(
        `Pinterest post failed: ${res.status} ${JSON.stringify(data).slice(0, 500)}`,
      );
    }

    await insertPinterestRow({
      card_id: card.id,
      variant_key: variant.key,
      pinterest_pin_id: data.id,
      board_key: card.category,
      destination_url: articleUrl,
      image_url: pinterestImageUrl,
      pin_title: variant.pinTitle,
      pin_description: description,
      status: "posted",
    });

    console.log(`Pinterest post stored for variant "${variant.key}".`);
  }

  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
