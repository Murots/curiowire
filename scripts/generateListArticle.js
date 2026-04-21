// // ============================================================================
// // scripts/generateListArticle.js — CurioWire vNext LISTS
// // One run = one list article.
// // Flow:
// //   premise gate on list suggestion package
// //   attempt 1: generate -> summary -> refine -> factcheck
// //   if FAIL_PREMISE -> salvage decider -> attempt 2 (full rerun)
// //   if attempt 2 FAIL_PREMISE -> stop + flag
// //   if pass -> choose hero item -> image -> scene prompt -> save
// // ============================================================================

// import dotenv from "dotenv";
// dotenv.config({ path: ".env.local" });

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// import { buildListPremiseGatePrompt } from "../app/api/utils/listPremiseGatePrompt.js";
// import { buildListArticlePrompt } from "../app/api/utils/listArticlePrompt.js";
// import { buildListSummaryPrompt } from "../app/api/utils/listSummaryPrompt.js";
// import { buildListRefinePackagePrompt } from "../app/api/utils/listRefinePackage.js";
// import { buildListFactCheckPackagePrompt } from "../app/api/utils/listFactCheckPackage.js";
// import { buildListPremiseSalvagePrompt } from "../app/api/utils/listPremiseSalvage.js";
// import { generateScenePrompt } from "../app/api/utils/scenePrompt.js";
// import { buildListSourceResolverPrompt } from "../app/api/utils/listSourceResolverPrompt.js";

// import { selectBestImage } from "../lib/imageSelector.js";
// import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";

// // ----------------------------------------------------------------------------
// // ENV
// // ----------------------------------------------------------------------------
// const {
//   OPENAI_API_KEY,
//   OPENAI_ORG_ID,
//   SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY,
//   ARTICLE_MODEL,
// } = process.env;

// if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
// if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
// if (!SUPABASE_SERVICE_ROLE_KEY) {
//   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
// }

// const openai = new OpenAI({
//   apiKey: OPENAI_API_KEY,
//   organization: OPENAI_ORG_ID,
// });

// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// // ----------------------------------------------------------------------------
// // Config
// // ----------------------------------------------------------------------------
// const MAX_PREMISE_ATTEMPTS = 2;

// // ----------------------------------------------------------------------------
// // Helpers
// // ----------------------------------------------------------------------------
// function nowIso() {
//   return new Date().toISOString();
// }

// function safeStr(v, fallback = "") {
//   return typeof v === "string" && v.trim() ? v.trim() : fallback;
// }

// function clamp(n, a, b) {
//   return Math.max(a, Math.min(b, n));
// }

// function stripH1(html) {
//   const m = String(html || "").match(/<h1>\s*([\s\S]*?)\s*<\/h1>/i);
//   return (m?.[1] || "").trim();
// }

// function normalizeCategoryKey(key) {
//   const k = safeStr(key, "science").toLowerCase();
//   const allowed = new Set([
//     "space",
//     "science",
//     "history",
//     "world",
//     "nature",
//     "technology",
//     "culture",
//     "sports",
//     "products",
//     "health",
//     "mystery",
//     "crime",
//   ]);
//   return allowed.has(k) ? k : "science";
// }

// function changed(a, b) {
//   return safeStr(a) !== safeStr(b);
// }

// function preview(s, n = 120) {
//   const t = safeStr(s, "");
//   return t.length > n ? t.slice(0, n) + "…" : t;
// }

// function tryParseJsonArray(text) {
//   try {
//     const parsed = JSON.parse(String(text || "").trim());
//     return Array.isArray(parsed) ? parsed : [];
//   } catch {
//     return [];
//   }
// }

// function uniqueStrings(arr) {
//   return [
//     ...new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)),
//   ];
// }

// function buildListSeedPackage(row) {
//   return {
//     title: safeStr(row?.title),
//     theme: safeStr(row?.theme),
//     angle: safeStr(row?.angle),
//     items: Array.isArray(row?.items)
//       ? row.items
//       : tryParseJsonArray(row?.items),
//   };
// }

// // ----------------------------------------------------------------------------
// // Premise gate parsing
// // ----------------------------------------------------------------------------
// function splitListPremiseGateOutput(text) {
//   const s = String(text || "");

//   const verdict = (s.match(/Verdict:\s*([^\n\r]+)/i)?.[1] || "")
//     .toUpperCase()
//     .replace(/[^A-Z| ]/g, "")
//     .split(/\s|\|/)[0]
//     .trim();

//   const correctedTitle = (
//     s.match(/CorrectedTitle:\s*([\s\S]*?)\nCorrectedTheme:\s*/i)?.[1] || ""
//   ).trim();
//   const correctedTheme = (
//     s.match(/CorrectedTheme:\s*([\s\S]*?)\nCorrectedAngle:\s*/i)?.[1] || ""
//   ).trim();
//   const correctedAngle = (
//     s.match(/CorrectedAngle:\s*([\s\S]*?)\nCorrectedItems:\s*/i)?.[1] || ""
//   ).trim();
//   const correctedItemsRaw = (
//     s.match(/CorrectedItems:\s*([\s\S]*?)\nReason:\s*/i)?.[1] || ""
//   ).trim();
//   const reason = (s.match(/Reason:\s*([\s\S]*)$/i)?.[1] || "").trim();

//   return {
//     verdict,
//     correctedTitle,
//     correctedTheme,
//     correctedAngle,
//     correctedItems: tryParseJsonArray(correctedItemsRaw),
//     reason,
//   };
// }

// async function listPremiseGateCheck({ suggestionPackage, categoryKey }) {
//   const prompt = buildListPremiseGatePrompt({
//     title: suggestionPackage.title,
//     theme: suggestionPackage.theme,
//     angle: suggestionPackage.angle,
//     items: suggestionPackage.items,
//     category: categoryKey,
//   });

//   const resp = await openai.responses.create({
//     model:
//       process.env.PREMISE_GATE_MODEL || process.env.FACTCHECK_MODEL || "gpt-5",
//     tools: [{ type: "web_search" }],
//     tool_choice: "auto",
//     input: prompt,
//   });

//   const out = (resp.output_text || "").trim();
//   if (!out) {
//     return {
//       verdict: "FAIL",
//       correctedTitle: "",
//       correctedTheme: "",
//       correctedAngle: "",
//       correctedItems: [],
//       reason: "Empty output",
//     };
//   }

//   return splitListPremiseGateOutput(out);
// }

// // ----------------------------------------------------------------------------
// // Pick suggestion
// // ----------------------------------------------------------------------------
// async function fetchOneListSuggestion() {
//   // 1) Prefer verified
//   let { data, error } = await supabase
//     .from("curiosity_list_suggestions")
//     .select("*")
//     .eq("status", "verified")
//     .eq("times_used", 0)
//     .order("wow_score", { ascending: false })
//     .order("last_used_at", { ascending: true, nullsFirst: true })
//     .order("created_at", { ascending: true })
//     .limit(1)
//     .maybeSingle();

//   if (error) throw error;
//   if (data) {
//     return { table: "curiosity_list_suggestions", row: data };
//   }

//   // 2) Fallback to null-status suggestions
//   ({ data, error } = await supabase
//     .from("curiosity_list_suggestions")
//     .select("*")
//     .is("status", null)
//     .eq("times_used", 0)
//     .order("wow_score", { ascending: false })
//     .order("last_used_at", { ascending: true, nullsFirst: true })
//     .order("created_at", { ascending: true })
//     .limit(1)
//     .maybeSingle());

//   if (error) throw error;
//   if (!data) return null;

//   return { table: "curiosity_list_suggestions", row: data };
// }

// async function markListSuggestionFailed(sourceTable, id, reason) {
//   try {
//     await supabase
//       .from(sourceTable)
//       .update({
//         review_note: `GEN_FAIL: ${String(reason || "").slice(0, 400)}`,
//         updated_at: nowIso(),
//       })
//       .eq("id", id);
//   } catch (err) {
//     console.warn("⚠️ markListSuggestionFailed failed:", err.message);
//   }
// }

// async function flagListSuggestionAndMaybeFailCard({
//   suggestionId,
//   categoryKey,
//   seedTitle,
//   wowScore,
//   reason = "",
//   makeFailedCard = false,
// }) {
//   const note = String(reason || "").slice(0, 400);

//   await supabase
//     .from("curiosity_list_suggestions")
//     .update({
//       status: "flagged",
//       review_note: `FACTCHECK_FAIL: ${note}`,
//       updated_at: nowIso(),
//     })
//     .eq("id", suggestionId);

//   if (makeFailedCard) {
//     await supabase.from(process.env.CARDS_TABLE || "curiosity_cards").insert({
//       suggestion_id: null,
//       source_suggestion_id: suggestionId,
//       article_type: "list",
//       category: categoryKey,
//       title: safeStr(seedTitle),
//       card_text: "",
//       video_script: null,
//       summary_normalized: null,
//       fun_fact: null,
//       scene_prompt: null,
//       seo_title: null,
//       seo_description: null,
//       seo_keywords: null,
//       hashtags: null,
//       wow_score: wowScore,
//       status: "failed",
//       created_at: nowIso(),
//       updated_at: nowIso(),
//     });
//   }
// }

// // ----------------------------------------------------------------------------
// // Generate article (raw)
// // ----------------------------------------------------------------------------
// async function generateListArticleHtml({
//   suggestionPackage,
//   categoryKey,
//   tone,
//   factualFrame,
// }) {
//   const prompt = buildListArticlePrompt(
//     suggestionPackage,
//     categoryKey,
//     tone,
//     factualFrame,
//   );

//   const resp = await openai.chat.completions.create({
//     model: ARTICLE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   const text = resp.choices[0]?.message?.content?.trim();
//   if (!text || text.length < 500) {
//     throw new Error("List article generation returned too little text.");
//   }
//   return text;
// }

// // ----------------------------------------------------------------------------
// // Summary + FunFact
// // ----------------------------------------------------------------------------
// function splitSummaryOutput(text) {
//   const out = { summary_normalized: null, fun_fact: null };
//   const s = String(text || "");

//   const sum = s.match(/Summary:\s*([\s\S]*?)\s*FunFact:\s*/i);
//   if (sum) out.summary_normalized = sum[1].trim();

//   const ff = s.match(/FunFact:\s*([\s\S]*)$/i);
//   if (ff) out.fun_fact = ff[1].trim();

//   if (out.summary_normalized && out.summary_normalized.length < 10) {
//     out.summary_normalized = null;
//   }

//   if (out.fun_fact) {
//     let cleaned = out.fun_fact.trim();
//     cleaned = cleaned.replace(/^<p>\s*<\/p>\s*$/i, "").trim();
//     cleaned = cleaned.replace(/^<p>\s*([\s\S]*?)\s*<\/p>$/i, "$1").trim();
//     cleaned = cleaned.replace(/^\s*(none|null|n\/a)\s*$/i, "").trim();
//     out.fun_fact = cleaned ? `<p>${cleaned}</p>` : null;
//   }

//   return out;
// }

// async function generateSummaryAndFunFact({ cardText }) {
//   const prompt = buildListSummaryPrompt(cardText);

//   const resp = await openai.chat.completions.create({
//     model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   const text = resp.choices[0]?.message?.content?.trim();
//   if (!text) return { summary_normalized: null, fun_fact: null };

//   return splitSummaryOutput(text);
// }

// // ----------------------------------------------------------------------------
// // REFINE
// // ----------------------------------------------------------------------------
// function splitRefinePackageOutput(text) {
//   const s = String(text || "");

//   const get = (label, nextLabel) => {
//     const re = nextLabel
//       ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
//       : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
//     return (s.match(re)?.[1] || "").trim();
//   };

//   return {
//     title: get("Title", "Card"),
//     card_text: get("Card", "VideoScript"),
//     video_script: get("VideoScript", "Summary"),
//     summary_normalized: get("Summary", "FunFact"),
//     fun_fact: get("FunFact", null),
//   };
// }

// async function refineListPackage({
//   title,
//   card_text,
//   video_script,
//   summary_normalized,
//   fun_fact,
// }) {
//   const prompt = buildListRefinePackagePrompt({
//     title,
//     card_text,
//     video_script,
//     summary_normalized,
//     fun_fact,
//   });

//   const resp = await openai.chat.completions.create({
//     model: process.env.REFINE_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   const out = resp.choices[0]?.message?.content?.trim();
//   if (!out) return null;

//   const parsed = splitRefinePackageOutput(out);

//   return {
//     title: parsed.title || title,
//     card_text: parsed.card_text || card_text,
//     video_script: parsed.video_script || video_script,
//     summary_normalized: parsed.summary_normalized || summary_normalized,
//     fun_fact: parsed.fun_fact || fun_fact,
//   };
// }

// // ----------------------------------------------------------------------------
// // FACTCHECK
// // ----------------------------------------------------------------------------
// function splitFactCheckPackageOutput(text) {
//   const s = String(text || "");

//   const get = (label, nextLabel) => {
//     const re = nextLabel
//       ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
//       : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
//     return (s.match(re)?.[1] || "").trim();
//   };

//   return {
//     verdict: get("Verdict", "Reason"),
//     reason: get("Reason", "Title"),
//     title: get("Title", "Card"),
//     card_text: get("Card", "VideoScript"),
//     video_script: get("VideoScript", "Summary"),
//     summary_normalized: get("Summary", "FunFact"),
//     fun_fact: get("FunFact", null),
//   };
// }

// async function factCheckListPackage({
//   title,
//   card_text,
//   video_script,
//   summary_normalized,
//   fun_fact,
// }) {
//   const prompt = buildListFactCheckPackagePrompt({
//     title,
//     card_text,
//     video_script,
//     summary_normalized,
//     fun_fact,
//   });

//   const resp = await openai.responses.create({
//     model: process.env.FACTCHECK_MODEL || "gpt-5",
//     tools: [{ type: "web_search" }],
//     tool_choice: "auto",
//     input: prompt,
//   });

//   const out = (resp.output_text || "").trim();
//   if (!out) throw new Error("List FactCheck returned empty output.");

//   const parsed = splitFactCheckPackageOutput(out);
//   const verdict = (parsed.verdict || "").trim().toUpperCase();
//   const isFailPremise = verdict.includes("FAIL_PREMISE");

//   return {
//     isFailPremise,
//     reason: parsed.reason || "",
//     verdict,
//     title: parsed.title || title,
//     card_text: parsed.card_text || card_text,
//     video_script: parsed.video_script || video_script,
//     summary_normalized: parsed.summary_normalized || summary_normalized,
//     fun_fact: parsed.fun_fact || fun_fact,
//   };
// }

// // ----------------------------------------------------------------------------
// // SOURCE RESOLVER
// // ----------------------------------------------------------------------------
// function splitListSourceResolverOutput(text) {
//   return uniqueStrings(tryParseJsonArray(text)).filter((url) =>
//     /^https?:\/\/\S+$/i.test(url),
//   );
// }

// async function resolveListSourceUrls({ title, summary_normalized, category }) {
//   const prompt = buildListSourceResolverPrompt({
//     title,
//     summary_normalized,
//     category,
//   });

//   const resp = await openai.responses.create({
//     model:
//       process.env.SOURCE_RESOLVER_MODEL ||
//       process.env.FACTCHECK_MODEL ||
//       "gpt-5",
//     tools: [{ type: "web_search" }],
//     tool_choice: "auto",
//     input: prompt,
//   });

//   const out = (resp.output_text || "").trim();
//   const urls = splitListSourceResolverOutput(out);

//   console.log(`🔗 List SourceResolver: ${urls.length ? "FOUND" : "NONE"}`);
//   if (urls.length) console.log(`   source_urls=${urls.join(" | ")}`);

//   return urls;
// }

// // ----------------------------------------------------------------------------
// // PREMISE SALVAGE
// // ----------------------------------------------------------------------------
// function splitListPremiseSalvageOutput(text) {
//   const s = String(text || "");

//   const salvage = (s.match(/Salvage:\s*([^\n\r]+)/i)?.[1] || "").trim();
//   const replacementTitle = (
//     s.match(/ReplacementTitle:\s*([\s\S]*?)\nReplacementTheme:\s*/i)?.[1] || ""
//   ).trim();
//   const replacementTheme = (
//     s.match(/ReplacementTheme:\s*([\s\S]*?)\nReplacementAngle:\s*/i)?.[1] || ""
//   ).trim();
//   const replacementAngle = (
//     s.match(/ReplacementAngle:\s*([\s\S]*?)\nReplacementItems:\s*/i)?.[1] || ""
//   ).trim();
//   const replacementItemsRaw = (
//     s.match(/ReplacementItems:\s*([\s\S]*)$/i)?.[1] || ""
//   ).trim();

//   return {
//     salvageYes: salvage.toUpperCase().includes("YES"),
//     replacementTitle,
//     replacementTheme,
//     replacementAngle,
//     replacementItems: tryParseJsonArray(replacementItemsRaw),
//   };
// }

// async function listPremiseSalvageDecider({
//   title,
//   card_text,
//   reason,
//   originalSuggestionPackage,
// }) {
//   const prompt = buildListPremiseSalvagePrompt({
//     title,
//     card_text,
//     reason,
//     original_list_title: originalSuggestionPackage.title,
//     original_theme: originalSuggestionPackage.theme,
//     original_angle: originalSuggestionPackage.angle,
//     original_items: originalSuggestionPackage.items,
//   });

//   const resp = await openai.responses.create({
//     model: process.env.SALVAGE_MODEL || process.env.FACTCHECK_MODEL || "gpt-5",
//     tools: [{ type: "web_search" }],
//     tool_choice: "auto",
//     input: prompt,
//   });

//   const out = (resp.output_text || "").trim();
//   if (!out) {
//     return {
//       salvageYes: false,
//       replacementTitle: "",
//       replacementTheme: "",
//       replacementAngle: "",
//       replacementItems: [],
//     };
//   }

//   return splitListPremiseSalvageOutput(out);
// }

// // ----------------------------------------------------------------------------
// // Parse generated output into { headline, cardText, videoScript, seoBlock, hashtags }
// // ----------------------------------------------------------------------------
// function splitGenerated(text) {
//   const out = {
//     headline: "",
//     cardText: "",
//     videoScript: "",
//     seoBlock: "",
//     hashtags: "",
//   };

//   const head = text.match(/Headline:\s*([\s\S]*?)\n(?:Card|Article):\s*/i);
//   if (head) out.headline = head[1].trim();

//   const card = text.match(/(?:Card|Article):\s*([\s\S]*?)\nVideoScript:\s*/i);
//   if (card) out.cardText = card[1].trim();

//   const vid = text.match(/VideoScript:\s*([\s\S]*?)\nSEO:\s*/i);
//   if (vid) out.videoScript = vid[1].trim();

//   const seo = text.match(/SEO:\s*([\s\S]*?)\nHashtags:\s*/i);
//   if (seo) out.seoBlock = seo[1].trim();

//   const hash = text.match(/Hashtags:\s*([\s\S]*)$/i);
//   if (hash) out.hashtags = hash[1].trim();

//   if (!out.cardText) out.cardText = text.trim();

//   return out;
// }

// // ----------------------------------------------------------------------------
// // Extract <title>, <description>, <keywords> from SEO block
// // ----------------------------------------------------------------------------
// function cleanTagValue(s) {
//   return String(s || "")
//     .replace(/<\/?\s*title\s*>/gi, "")
//     .replace(/<\/?\s*description\s*>/gi, "")
//     .replace(/<\/?\s*keywords\s*>/gi, "")
//     .replace(/<[^>]*>/g, "")
//     .trim();
// }

// function grab(block, tag) {
//   const between = block.match(
//     new RegExp(`<${tag}>\\s*—?\\s*([\\s\\S]*?)\\s*<\\/${tag}>`, "i"),
//   )?.[1];
//   if (between) return cleanTagValue(between);

//   const line = block.match(
//     new RegExp(`<${tag}>\\s*—?\\s*([^\\n\\r]*)`, "i"),
//   )?.[1];
//   return cleanTagValue(line || "");
// }

// function parseSeo(seoBlock) {
//   const block = String(seoBlock || "");
//   return {
//     title: grab(block, "title"),
//     description: grab(block, "description"),
//     keywords: grab(block, "keywords"),
//   };
// }

// // ----------------------------------------------------------------------------
// // Hero item selection
// // ----------------------------------------------------------------------------
// function normalizeItemForHero(item) {
//   if (!item || typeof item !== "object") return null;

//   return {
//     title: safeStr(item.title),
//     curiosity: safeStr(item.curiosity),
//     anchor_entity: safeStr(item.anchor_entity).replace(/_/g, " "),
//     topic_tag: safeStr(item.topic_tag).replace(/_/g, " "),
//     wow_score: clamp(parseInt(item.wow_score ?? 50, 10) || 50, 0, 100),
//   };
// }

// function chooseHeroItem(items = []) {
//   const genericRx =
//     /\b(effect|circulation|controversy|market|boost|music|songs?|records?|audiences?|censorship|pressings?|ban)\b/i;

//   const normalized = items.map(normalizeItemForHero).filter(Boolean);
//   if (!normalized.length) return null;

//   let best = normalized[0];
//   let bestScore = -Infinity;

//   for (const item of normalized) {
//     let score = item.wow_score;

//     if (item.anchor_entity && !genericRx.test(item.anchor_entity)) score += 10;
//     if (item.anchor_entity.split(/\s+/).length >= 2) score += 5;
//     if (/[A-Z]/.test(item.title)) score += 3;
//     if (genericRx.test(item.title)) score -= 5;
//     if (genericRx.test(item.anchor_entity)) score -= 7;

//     if (score > bestScore) {
//       best = item;
//       bestScore = score;
//     }
//   }

//   return best;
// }

// // ----------------------------------------------------------------------------
// // One attempt: generate -> summary -> refine -> factcheck
// // ----------------------------------------------------------------------------
// async function generateRefineAndFactcheckList({
//   suggestionPackage,
//   categoryKey,
//   tone,
//   factualFrame,
// }) {
//   const raw = await generateListArticleHtml({
//     suggestionPackage,
//     categoryKey,
//     tone,
//     factualFrame,
//   });

//   const parts = splitGenerated(raw);

//   console.log(
//     `🧱 Generated raw list: headline?=${Boolean(parts.headline)} cardLen=${(parts.cardText || "").length} videoLen=${(parts.videoScript || "").length}`,
//   );

//   const headlineRaw = parts.headline || "";
//   const headline =
//     stripH1(headlineRaw) || safeStr(suggestionPackage.title, "Untitled List");

//   const seo = parseSeo(parts.seoBlock);
//   const meta = await generateSummaryAndFunFact({ cardText: parts.cardText });

//   console.log(
//     `🧾 Summary: ${meta.summary_normalized ? "yes" : "no"} | FunFact: ${meta.fun_fact ? "yes" : "no"}`,
//   );

//   const refined = await refineListPackage({
//     title: headline,
//     card_text: parts.cardText,
//     video_script: parts.videoScript || "<p></p>",
//     summary_normalized: meta.summary_normalized || "",
//     fun_fact: meta.fun_fact || "<p></p>",
//   });

//   if (refined) {
//     const titleChanged = changed(headline, refined.title);
//     const cardChanged = changed(parts.cardText, refined.card_text);
//     const videoChanged = changed(
//       parts.videoScript || "",
//       refined.video_script || "",
//     );
//     const sumChanged = changed(
//       meta.summary_normalized || "",
//       refined.summary_normalized || "",
//     );
//     const funChanged = changed(meta.fun_fact || "", refined.fun_fact || "");

//     console.log(
//       `🧼 Refine: title=${titleChanged ? "changed" : "same"} card=${cardChanged ? "changed" : "same"} video=${videoChanged ? "changed" : "same"} summary=${sumChanged ? "changed" : "same"} funFact=${funChanged ? "changed" : "same"}`,
//     );
//   } else {
//     console.log("🧼 Refine: skipped (no output)");
//   }

//   const finalTitle = refined?.title || headline;
//   const finalCardText = refined?.card_text || parts.cardText;
//   const finalVideoScript = refined?.video_script || parts.videoScript || null;
//   const finalSummary = refined?.summary_normalized || meta.summary_normalized;
//   const finalFunFact = refined?.fun_fact || meta.fun_fact;

//   const checked = await factCheckListPackage({
//     title: finalTitle,
//     card_text: finalCardText,
//     video_script: finalVideoScript || "<p></p>",
//     summary_normalized: finalSummary || "",
//     fun_fact: finalFunFact || "<p></p>",
//   });

//   console.log(
//     `🧪 List FactCheck: verdict=${checked.verdict} premiseFail=${checked.isFailPremise ? "YES" : "NO"} reason="${preview(checked.reason, 160)}"`,
//   );

//   return { parts, seo, checked };
// }

// // ----------------------------------------------------------------------------
// // MAIN
// // ----------------------------------------------------------------------------
// async function run() {
//   console.log("🧠 CurioWire generateListArticle.js — starting");

//   const found = await fetchOneListSuggestion();
//   if (!found) {
//     console.log("😴 No eligible list suggestion found.");
//     return;
//   }

//   const { table: sourceTable, row } = found;

//   const suggestionId = row.id;
//   const categoryKey = normalizeCategoryKey(row.category);
//   const wowScoreFromSuggestion = Number.isFinite(Number(row.wow_score))
//     ? Number(row.wow_score)
//     : 50;

//   const originalSuggestionPackage = buildListSeedPackage(row);
//   let initialPackage = { ...originalSuggestionPackage };

//   const tone = "neutral";
//   const factualFrame = "";

//   console.log(
//     `🧩 Picked list suggestion from "${sourceTable}" id=${suggestionId}`,
//   );
//   console.log(
//     `   title="${initialPackage.title}" category="${categoryKey}" status="${row.status ?? "null"}"`,
//   );

//   // ✅ Premise gate — before spending tokens on full generation
//   console.log("🧪 List premise gate — checking suggestion realism...");

//   let gate = await listPremiseGateCheck({
//     suggestionPackage: initialPackage,
//     categoryKey,
//   });

//   const okVerdicts = new Set(["PASS", "FIX", "FAIL"]);
//   if (!okVerdicts.has(gate.verdict)) {
//     console.log(
//       "⚠️ List premise gate returned unknown verdict — treating as FAIL:",
//       gate.verdict,
//     );
//     gate.verdict = "FAIL";
//   }

//   if (gate.verdict === "FIX") {
//     const fixedItems =
//       Array.isArray(gate.correctedItems) && gate.correctedItems.length
//         ? gate.correctedItems
//         : initialPackage.items;

//     initialPackage = {
//       title: safeStr(gate.correctedTitle, initialPackage.title),
//       theme: safeStr(gate.correctedTheme, initialPackage.theme),
//       angle: safeStr(gate.correctedAngle, initialPackage.angle),
//       items: fixedItems,
//     };
//   }

//   console.log(
//     `🧪 List premise gate verdict=${gate.verdict}${gate.verdict === "FIX" ? " (using corrected package)" : ""}`,
//   );

//   if (gate.verdict === "FAIL") {
//     console.log(
//       "🧯 List premise gate FAIL — flagging and stopping:",
//       gate.reason,
//     );

//     await flagListSuggestionAndMaybeFailCard({
//       suggestionId,
//       categoryKey,
//       seedTitle: originalSuggestionPackage.title,
//       wowScore: wowScoreFromSuggestion,
//       reason: `PREMISE_GATE_FAIL: ${gate.reason} | seed="${originalSuggestionPackage.title}"`,
//       makeFailedCard: true,
//     });

//     return;
//   }

//   let image_url = null;
//   let image_credit = null;
//   let image_source = null;
//   let image_prompt = null;
//   let scene_prompt = null;

//   try {
//     let currentPackage = { ...initialPackage };
//     let finalPack = null;
//     let finalSeedPackage = { ...initialPackage };
//     let lastFailReason = "";

//     for (let attempt = 1; attempt <= MAX_PREMISE_ATTEMPTS; attempt++) {
//       console.log(
//         `🧪 List attempt ${attempt}/${MAX_PREMISE_ATTEMPTS}: "${currentPackage.title}"`,
//       );

//       const pack = await generateRefineAndFactcheckList({
//         suggestionPackage: currentPackage,
//         categoryKey,
//         tone,
//         factualFrame,
//       });

//       if (!pack.checked.isFailPremise) {
//         finalPack = pack;
//         finalSeedPackage = { ...currentPackage };
//         break;
//       }

//       lastFailReason = pack.checked.reason || "List premise demonstrably false";
//       console.log("🧯 LIST FAIL_PREMISE —", lastFailReason);

//       if (attempt === MAX_PREMISE_ATTEMPTS) break;

//       const salvage = await listPremiseSalvageDecider({
//         title: pack.checked.title,
//         card_text: pack.checked.card_text,
//         reason: lastFailReason,
//         originalSuggestionPackage,
//       });

//       if (
//         !salvage.salvageYes ||
//         !salvage.replacementTitle ||
//         !Array.isArray(salvage.replacementItems) ||
//         !salvage.replacementItems.length
//       ) {
//         console.log("🚫 List salvage NO — stopping.");
//         break;
//       }

//       console.log(
//         "🛟 List salvage YES — rebuilding on:",
//         salvage.replacementTitle,
//       );

//       currentPackage = {
//         title: safeStr(salvage.replacementTitle),
//         theme: safeStr(salvage.replacementTheme),
//         angle: safeStr(salvage.replacementAngle),
//         items: salvage.replacementItems,
//       };
//     }

//     if (!finalPack) {
//       console.log(
//         "🧯 List premise could not be salvaged — flagging and stopping.",
//       );

//       await flagListSuggestionAndMaybeFailCard({
//         suggestionId,
//         categoryKey,
//         seedTitle: originalSuggestionPackage.title,
//         wowScore: wowScoreFromSuggestion,
//         reason: lastFailReason || "List premise false; no salvage",
//         makeFailedCard: true,
//       });

//       return;
//     }

//     const { parts, seo, checked } = finalPack;

//     const fcTitle = checked.title;
//     const fcCardText = checked.card_text;
//     const fcVideoScript = checked.video_script || null;
//     const fcSummary = checked.summary_normalized;
//     const fcFunFact = checked.fun_fact;

//     // Source URL(s)
//     let source_url = null;
//     let sources = uniqueStrings(row.source_urls || []);

//     if (sources.length) {
//       source_url = sources[0];
//       sources = sources.slice(0, 3);
//     } else {
//       try {
//         sources = await resolveListSourceUrls({
//           title: fcTitle,
//           summary_normalized: fcSummary || "",
//           category: categoryKey,
//         });
//         source_url = sources[0] || null;
//       } catch (e) {
//         console.warn("⚠️ SourceResolver failed:", e.message);
//         source_url = null;
//         sources = [];
//       }
//     }

//     // Scene prompt
//     try {
//       scene_prompt = await generateScenePrompt({
//         openai,
//         title: fcTitle,
//         category: categoryKey,
//         video_script: fcVideoScript || "",
//         card_text: fcCardText || "",
//       });
//       scene_prompt = (scene_prompt || "").trim() || null;
//     } catch (e) {
//       console.warn("⚠️ Scene prompt generation failed:", e.message);
//       scene_prompt = null;
//     }

//     // Choose one hero item for image retrieval
//     const heroItem = chooseHeroItem(finalSeedPackage.items);
//     const imageTitle = heroItem?.title || fcTitle;
//     const imageText = heroItem?.curiosity || fcCardText || "";
//     const imageSummary = heroItem?.curiosity || fcSummary || "";

//     // Image selection
//     try {
//       const img = await selectBestImage(
//         imageTitle,
//         imageText,
//         categoryKey,
//         null,
//         imageSummary,
//       );

//       if (img?.imageUrl) {
//         image_url = img.imageUrl;
//         image_source = img.source || img.provider || null;

//         image_credit =
//           img.attribution ||
//           (img.provider
//             ? `Image source: ${img.provider}${img.license ? ` (${img.license})` : ""}`
//             : null);

//         const src = String(img.source || img.provider || "").toUpperCase();
//         if (
//           !image_credit &&
//           (src === "DALL·E" || src === "DALLE" || src === "DALL-E")
//         ) {
//           image_credit = "Image source: DALL·E (AI-generated)";
//           image_source = "DALL·E";
//         }

//         if (src === "DALL·E" || src === "DALLE" || src === "DALL-E") {
//           image_prompt = img.prompt || null;
//         }
//       }

//       console.log("🖼️ List image:", image_url ? "selected" : "none");
//       if (heroItem?.title) console.log(`   hero_item="${heroItem.title}"`);
//     } catch (e) {
//       console.warn("⚠️ List image selection failed:", e.message);
//     }

//     const seoTitle = seo.title || fcTitle || null;
//     const description = seo.description || null;
//     const keywords = seo.keywords || null;

//     const cardsTable = process.env.CARDS_TABLE || "curiosity_cards";

//     const insertPayload = {
//       suggestion_id: null,
//       source_suggestion_id: suggestionId,
//       article_type: "list",
//       category: categoryKey,

//       title: fcTitle,
//       card_text: fcCardText,
//       video_script: fcVideoScript,

//       source_url: source_url || null,
//       sources: sources || [],

//       summary_normalized: fcSummary,
//       fun_fact: fcFunFact,

//       seo_title: seoTitle,
//       seo_description: description,
//       seo_keywords: keywords,
//       hashtags: parts.hashtags || null,

//       wow_score: wowScoreFromSuggestion,

//       image_url,
//       image_credit,
//       image_source,
//       image_prompt,
//       scene_prompt,

//       status: "published",
//       is_listed: true,

//       created_at: nowIso(),
//       updated_at: nowIso(),
//     };

//     const { data: inserted, error: insertErr } = await supabase
//       .from(cardsTable)
//       .insert(insertPayload)
//       .select("id")
//       .single();

//     if (insertErr) throw insertErr;

//     console.log(`📝 List card saved to "${cardsTable}" id=${inserted?.id}`);

//     // mark suggestion used
//     const { error: updateErr } = await supabase
//       .from("curiosity_list_suggestions")
//       .update({
//         times_used: (row.times_used || 0) + 1,
//         last_used_at: nowIso(),
//         updated_at: nowIso(),
//         review_note: null,
//       })
//       .eq("id", suggestionId);

//     if (updateErr) throw updateErr;

//     await updateAndPingSearchEngines();

//     console.log("✅ List article done");
//   } catch (err) {
//     console.error("❌ generateListArticle.js failed:", err.message);
//     await markListSuggestionFailed(sourceTable, suggestionId, err.message);
//     process.exitCode = 1;
//   }
// }

// run();

// ============================================================================
// scripts/generateListArticle.js — CurioWire vNext LISTS
// One run = one list article.
// Flow:
//   premise gate on list suggestion package
//   attempt 1: generate -> summary -> refine -> factcheck
//   if FAIL_PREMISE -> salvage decider -> attempt 2 (full rerun)
//   if attempt 2 FAIL_PREMISE -> stop + flag
//   if pass -> choose hero item -> image -> scene prompt -> save
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import { buildListPremiseGatePrompt } from "../app/api/utils/listPremiseGatePrompt.js";
import { buildListArticlePrompt } from "../app/api/utils/listArticlePrompt.js";
import { buildListSummaryPrompt } from "../app/api/utils/listSummaryPrompt.js";
import { buildListRefinePackagePrompt } from "../app/api/utils/listRefinePackage.js";
import { buildListFactCheckPackagePrompt } from "../app/api/utils/listFactCheckPackage.js";
import { buildListPremiseSalvagePrompt } from "../app/api/utils/listPremiseSalvage.js";
import { generateScenePrompt } from "../app/api/utils/scenePrompt.js";
import { buildListSourceResolverPrompt } from "../app/api/utils/listSourceResolverPrompt.js";

import { selectBestImage } from "../lib/imageSelector.js";
import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";

// ----------------------------------------------------------------------------
// ENV
// ----------------------------------------------------------------------------
const {
  OPENAI_API_KEY,
  OPENAI_ORG_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ARTICLE_MODEL,
} = process.env;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: OPENAI_ORG_ID,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const MAX_PREMISE_ATTEMPTS = 2;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function nowIso() {
  return new Date().toISOString();
}

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function stripH1(html) {
  const m = String(html || "").match(/<h1>\s*([\s\S]*?)\s*<\/h1>/i);
  return (m?.[1] || "").trim();
}

function normalizeCategoryKey(key) {
  const k = safeStr(key, "science").toLowerCase();
  const allowed = new Set([
    "space",
    "science",
    "history",
    "world",
    "nature",
    "technology",
    "culture",
    "sports",
    "products",
    "health",
    "mystery",
    "crime",
  ]);
  return allowed.has(k) ? k : "science";
}

function changed(a, b) {
  return safeStr(a) !== safeStr(b);
}

function preview(s, n = 120) {
  const t = safeStr(s, "");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function tryParseJsonArray(text) {
  try {
    const parsed = JSON.parse(String(text || "").trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uniqueStrings(arr) {
  return [
    ...new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)),
  ];
}

function buildListSeedPackage(row) {
  return {
    title: safeStr(row?.title),
    theme: safeStr(row?.theme),
    angle: safeStr(row?.angle),
    items: Array.isArray(row?.items)
      ? row.items
      : tryParseJsonArray(row?.items),
  };
}

// ----------------------------------------------------------------------------
// Premise gate parsing
// ----------------------------------------------------------------------------
function splitListPremiseGateOutput(text) {
  const s = String(text || "");

  const verdict = (s.match(/Verdict:\s*([^\n\r]+)/i)?.[1] || "")
    .toUpperCase()
    .replace(/[^A-Z| ]/g, "")
    .split(/\s|\|/)[0]
    .trim();

  const correctedTitle = (
    s.match(/CorrectedTitle:\s*([\s\S]*?)\nCorrectedTheme:\s*/i)?.[1] || ""
  ).trim();
  const correctedTheme = (
    s.match(/CorrectedTheme:\s*([\s\S]*?)\nCorrectedAngle:\s*/i)?.[1] || ""
  ).trim();
  const correctedAngle = (
    s.match(/CorrectedAngle:\s*([\s\S]*?)\nCorrectedItems:\s*/i)?.[1] || ""
  ).trim();
  const correctedItemsRaw = (
    s.match(/CorrectedItems:\s*([\s\S]*?)\nReason:\s*/i)?.[1] || ""
  ).trim();
  const reason = (s.match(/Reason:\s*([\s\S]*)$/i)?.[1] || "").trim();

  return {
    verdict,
    correctedTitle,
    correctedTheme,
    correctedAngle,
    correctedItems: tryParseJsonArray(correctedItemsRaw),
    reason,
  };
}

async function listPremiseGateCheck({ suggestionPackage, categoryKey }) {
  const prompt = buildListPremiseGatePrompt({
    title: suggestionPackage.title,
    theme: suggestionPackage.theme,
    angle: suggestionPackage.angle,
    items: suggestionPackage.items,
    category: categoryKey,
  });

  const resp = await openai.responses.create({
    model:
      process.env.PREMISE_GATE_MODEL || process.env.FACTCHECK_MODEL || "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  if (!out) {
    return {
      verdict: "FAIL",
      correctedTitle: "",
      correctedTheme: "",
      correctedAngle: "",
      correctedItems: [],
      reason: "Empty output",
    };
  }

  return splitListPremiseGateOutput(out);
}

// ----------------------------------------------------------------------------
// Pick suggestion
// ----------------------------------------------------------------------------
async function fetchOneListSuggestion() {
  // 1) Prefer verified
  let { data, error } = await supabase
    .from("curiosity_list_suggestions")
    .select("*")
    .eq("status", "verified")
    .eq("times_used", 0)
    .order("wow_score", { ascending: false })
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    return { table: "curiosity_list_suggestions", row: data };
  }

  // 2) Fallback to null-status suggestions
  ({ data, error } = await supabase
    .from("curiosity_list_suggestions")
    .select("*")
    .is("status", null)
    .eq("times_used", 0)
    .order("wow_score", { ascending: false })
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle());

  if (error) throw error;
  if (!data) return null;

  return { table: "curiosity_list_suggestions", row: data };
}

async function markListSuggestionFailed(sourceTable, id, reason) {
  try {
    await supabase
      .from(sourceTable)
      .update({
        review_note: `GEN_FAIL: ${String(reason || "").slice(0, 400)}`,
        updated_at: nowIso(),
      })
      .eq("id", id);
  } catch (err) {
    console.warn("⚠️ markListSuggestionFailed failed:", err.message);
  }
}

async function flagListSuggestionAndMaybeFailCard({
  suggestionId,
  categoryKey,
  seedTitle,
  wowScore,
  reason = "",
  makeFailedCard = false,
}) {
  const note = String(reason || "").slice(0, 400);

  await supabase
    .from("curiosity_list_suggestions")
    .update({
      status: "flagged",
      review_note: `FACTCHECK_FAIL: ${note}`,
      updated_at: nowIso(),
    })
    .eq("id", suggestionId);

  if (makeFailedCard) {
    await supabase.from(process.env.CARDS_TABLE || "curiosity_cards").insert({
      suggestion_id: null,
      source_suggestion_id: suggestionId,
      article_type: "list",
      category: categoryKey,
      title: safeStr(seedTitle),
      card_text: "",
      video_script: null,
      summary_normalized: null,
      fun_fact: null,
      scene_prompt: null,
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      hashtags: null,
      wow_score: wowScore,
      status: "failed",
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
}

// ----------------------------------------------------------------------------
// Generate article (raw)
// ----------------------------------------------------------------------------
async function generateListArticleHtml({
  suggestionPackage,
  categoryKey,
  tone,
  factualFrame,
}) {
  const prompt = buildListArticlePrompt(
    suggestionPackage,
    categoryKey,
    tone,
    factualFrame,
  );

  const resp = await openai.chat.completions.create({
    model: ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text || text.length < 500) {
    throw new Error("List article generation returned too little text.");
  }
  return text;
}

// ----------------------------------------------------------------------------
// Summary + FunFact
// ----------------------------------------------------------------------------
function splitSummaryOutput(text) {
  const out = { summary_normalized: null, fun_fact: null };
  const s = String(text || "");

  const sum = s.match(/Summary:\s*([\s\S]*?)\s*FunFact:\s*/i);
  if (sum) out.summary_normalized = sum[1].trim();

  const ff = s.match(/FunFact:\s*([\s\S]*)$/i);
  if (ff) out.fun_fact = ff[1].trim();

  if (out.summary_normalized && out.summary_normalized.length < 10) {
    out.summary_normalized = null;
  }

  if (out.fun_fact) {
    let cleaned = out.fun_fact.trim();
    cleaned = cleaned.replace(/^<p>\s*<\/p>\s*$/i, "").trim();
    cleaned = cleaned.replace(/^<p>\s*([\s\S]*?)\s*<\/p>$/i, "$1").trim();
    cleaned = cleaned.replace(/^\s*(none|null|n\/a)\s*$/i, "").trim();
    out.fun_fact = cleaned ? `<p>${cleaned}</p>` : null;
  }

  return out;
}

async function generateSummaryAndFunFact({ cardText }) {
  const prompt = buildListSummaryPrompt(cardText);

  const resp = await openai.chat.completions.create({
    model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text) return { summary_normalized: null, fun_fact: null };

  return splitSummaryOutput(text);
}

// ----------------------------------------------------------------------------
// REFINE
// ----------------------------------------------------------------------------
function splitRefinePackageOutput(text) {
  const s = String(text || "");

  const get = (label, nextLabel) => {
    const re = nextLabel
      ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
      : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
    return (s.match(re)?.[1] || "").trim();
  };

  return {
    title: get("Title", "Card"),
    card_text: get("Card", "VideoScript"),
    video_script: get("VideoScript", "Summary"),
    summary_normalized: get("Summary", "FunFact"),
    fun_fact: get("FunFact", null),
  };
}

async function refineListPackage({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const prompt = buildListRefinePackagePrompt({
    title,
    card_text,
    video_script,
    summary_normalized,
    fun_fact,
  });

  const resp = await openai.chat.completions.create({
    model: process.env.REFINE_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const out = resp.choices[0]?.message?.content?.trim();
  if (!out) return null;

  const parsed = splitRefinePackageOutput(out);

  return {
    title: parsed.title || title,
    card_text: parsed.card_text || card_text,
    video_script: parsed.video_script || video_script,
    summary_normalized: parsed.summary_normalized || summary_normalized,
    fun_fact: parsed.fun_fact || fun_fact,
  };
}

// ----------------------------------------------------------------------------
// FACTCHECK
// ----------------------------------------------------------------------------
function splitFactCheckPackageOutput(text) {
  const s = String(text || "");

  const get = (label, nextLabel) => {
    const re = nextLabel
      ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
      : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
    return (s.match(re)?.[1] || "").trim();
  };

  return {
    verdict: get("Verdict", "Reason"),
    reason: get("Reason", "Title"),
    title: get("Title", "Card"),
    card_text: get("Card", "VideoScript"),
    video_script: get("VideoScript", "Summary"),
    summary_normalized: get("Summary", "FunFact"),
    fun_fact: get("FunFact", null),
  };
}

async function factCheckListPackage({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const prompt = buildListFactCheckPackagePrompt({
    title,
    card_text,
    video_script,
    summary_normalized,
    fun_fact,
  });

  const resp = await openai.responses.create({
    model: process.env.FACTCHECK_MODEL || "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  if (!out) throw new Error("List FactCheck returned empty output.");

  const parsed = splitFactCheckPackageOutput(out);
  const verdict = (parsed.verdict || "").trim().toUpperCase();
  const isFailPremise = verdict.includes("FAIL_PREMISE");

  return {
    isFailPremise,
    reason: parsed.reason || "",
    verdict,
    title: parsed.title || title,
    card_text: parsed.card_text || card_text,
    video_script: parsed.video_script || video_script,
    summary_normalized: parsed.summary_normalized || summary_normalized,
    fun_fact: parsed.fun_fact || fun_fact,
  };
}

// ----------------------------------------------------------------------------
// SOURCE RESOLVER
// ----------------------------------------------------------------------------
function splitListSourceResolverOutput(text) {
  return uniqueStrings(tryParseJsonArray(text)).filter((url) =>
    /^https?:\/\/\S+$/i.test(url),
  );
}

async function resolveListSourceUrls({ title, summary_normalized, category }) {
  const prompt = buildListSourceResolverPrompt({
    title,
    summary_normalized,
    category,
  });

  const resp = await openai.responses.create({
    model:
      process.env.SOURCE_RESOLVER_MODEL ||
      process.env.FACTCHECK_MODEL ||
      "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  const urls = splitListSourceResolverOutput(out);

  console.log(`🔗 List SourceResolver: ${urls.length ? "FOUND" : "NONE"}`);
  if (urls.length) console.log(`   source_urls=${urls.join(" | ")}`);

  return urls;
}

// ----------------------------------------------------------------------------
// PREMISE SALVAGE
// ----------------------------------------------------------------------------
function splitListPremiseSalvageOutput(text) {
  const s = String(text || "");

  const salvage = (s.match(/Salvage:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const replacementTitle = (
    s.match(/ReplacementTitle:\s*([\s\S]*?)\nReplacementTheme:\s*/i)?.[1] || ""
  ).trim();
  const replacementTheme = (
    s.match(/ReplacementTheme:\s*([\s\S]*?)\nReplacementAngle:\s*/i)?.[1] || ""
  ).trim();
  const replacementAngle = (
    s.match(/ReplacementAngle:\s*([\s\S]*?)\nReplacementItems:\s*/i)?.[1] || ""
  ).trim();
  const replacementItemsRaw = (
    s.match(/ReplacementItems:\s*([\s\S]*)$/i)?.[1] || ""
  ).trim();

  return {
    salvageYes: salvage.toUpperCase().includes("YES"),
    replacementTitle,
    replacementTheme,
    replacementAngle,
    replacementItems: tryParseJsonArray(replacementItemsRaw),
  };
}

async function listPremiseSalvageDecider({
  title,
  card_text,
  reason,
  originalSuggestionPackage,
}) {
  const prompt = buildListPremiseSalvagePrompt({
    title,
    card_text,
    reason,
    original_list_title: originalSuggestionPackage.title,
    original_theme: originalSuggestionPackage.theme,
    original_angle: originalSuggestionPackage.angle,
    original_items: originalSuggestionPackage.items,
  });

  const resp = await openai.responses.create({
    model: process.env.SALVAGE_MODEL || process.env.FACTCHECK_MODEL || "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();
  if (!out) {
    return {
      salvageYes: false,
      replacementTitle: "",
      replacementTheme: "",
      replacementAngle: "",
      replacementItems: [],
    };
  }

  return splitListPremiseSalvageOutput(out);
}

// ----------------------------------------------------------------------------
// Parse generated output into { headline, cardText, videoScript, seoBlock, hashtags }
// ----------------------------------------------------------------------------
function splitGenerated(text) {
  const out = {
    headline: "",
    cardText: "",
    videoScript: "",
    seoBlock: "",
    hashtags: "",
  };

  const head = text.match(/Headline:\s*([\s\S]*?)\n(?:Card|Article):\s*/i);
  if (head) out.headline = head[1].trim();

  const card = text.match(/(?:Card|Article):\s*([\s\S]*?)\nVideoScript:\s*/i);
  if (card) out.cardText = card[1].trim();

  const vid = text.match(/VideoScript:\s*([\s\S]*?)\nSEO:\s*/i);
  if (vid) out.videoScript = vid[1].trim();

  const seo = text.match(/SEO:\s*([\s\S]*?)\nHashtags:\s*/i);
  if (seo) out.seoBlock = seo[1].trim();

  const hash = text.match(/Hashtags:\s*([\s\S]*)$/i);
  if (hash) out.hashtags = hash[1].trim();

  if (!out.cardText) out.cardText = text.trim();

  return out;
}

// ----------------------------------------------------------------------------
// Extract <title>, <description>, <keywords> from SEO block
// ----------------------------------------------------------------------------
function cleanTagValue(s) {
  return String(s || "")
    .replace(/<\/?\s*title\s*>/gi, "")
    .replace(/<\/?\s*description\s*>/gi, "")
    .replace(/<\/?\s*keywords\s*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function grab(block, tag) {
  const between = block.match(
    new RegExp(`<${tag}>\\s*—?\\s*([\\s\\S]*?)\\s*<\\/${tag}>`, "i"),
  )?.[1];
  if (between) return cleanTagValue(between);

  const line = block.match(
    new RegExp(`<${tag}>\\s*—?\\s*([^\\n\\r]*)`, "i"),
  )?.[1];
  return cleanTagValue(line || "");
}

function parseSeo(seoBlock) {
  const block = String(seoBlock || "");
  return {
    title: grab(block, "title"),
    description: grab(block, "description"),
    keywords: grab(block, "keywords"),
  };
}

// ----------------------------------------------------------------------------
// Hero item selection
// ----------------------------------------------------------------------------
function normalizeItemForHero(item) {
  if (!item || typeof item !== "object") return null;

  return {
    title: safeStr(item.title),
    curiosity: safeStr(item.curiosity),
    anchor_entity: safeStr(item.anchor_entity).replace(/_/g, " "),
    topic_tag: safeStr(item.topic_tag).replace(/_/g, " "),
    wow_score: clamp(parseInt(item.wow_score ?? 50, 10) || 50, 0, 100),
  };
}

function chooseHeroItem(items = []) {
  const genericRx =
    /\b(effect|circulation|controversy|market|boost|music|songs?|records?|audiences?|censorship|pressings?|ban)\b/i;

  const normalized = items.map(normalizeItemForHero).filter(Boolean);
  if (!normalized.length) return null;

  let best = normalized[0];
  let bestScore = -Infinity;

  for (const item of normalized) {
    let score = item.wow_score;

    if (item.anchor_entity && !genericRx.test(item.anchor_entity)) score += 10;
    if (item.anchor_entity.split(/\s+/).length >= 2) score += 5;
    if (/[A-Z]/.test(item.title)) score += 3;
    if (genericRx.test(item.title)) score -= 5;
    if (genericRx.test(item.anchor_entity)) score -= 7;

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return best;
}

// ----------------------------------------------------------------------------
// One attempt: generate -> summary -> refine -> factcheck
// ----------------------------------------------------------------------------
async function generateRefineAndFactcheckList({
  suggestionPackage,
  categoryKey,
  tone,
  factualFrame,
}) {
  const raw = await generateListArticleHtml({
    suggestionPackage,
    categoryKey,
    tone,
    factualFrame,
  });

  const parts = splitGenerated(raw);

  console.log(
    `🧱 Generated raw list: headline?=${Boolean(parts.headline)} cardLen=${(parts.cardText || "").length} videoLen=${(parts.videoScript || "").length}`,
  );

  const headlineRaw = parts.headline || "";
  const headline =
    stripH1(headlineRaw) || safeStr(suggestionPackage.title, "Untitled List");

  const seo = parseSeo(parts.seoBlock);
  const meta = await generateSummaryAndFunFact({ cardText: parts.cardText });

  console.log(
    `🧾 Summary: ${meta.summary_normalized ? "yes" : "no"} | FunFact: ${meta.fun_fact ? "yes" : "no"}`,
  );

  const refined = await refineListPackage({
    title: headline,
    card_text: parts.cardText,
    video_script: parts.videoScript || "<p></p>",
    summary_normalized: meta.summary_normalized || "",
    fun_fact: meta.fun_fact || "<p></p>",
  });

  if (refined) {
    const titleChanged = changed(headline, refined.title);
    const cardChanged = changed(parts.cardText, refined.card_text);
    const videoChanged = changed(
      parts.videoScript || "",
      refined.video_script || "",
    );
    const sumChanged = changed(
      meta.summary_normalized || "",
      refined.summary_normalized || "",
    );
    const funChanged = changed(meta.fun_fact || "", refined.fun_fact || "");

    console.log(
      `🧼 Refine: title=${titleChanged ? "changed" : "same"} card=${cardChanged ? "changed" : "same"} video=${videoChanged ? "changed" : "same"} summary=${sumChanged ? "changed" : "same"} funFact=${funChanged ? "changed" : "same"}`,
    );
  } else {
    console.log("🧼 Refine: skipped (no output)");
  }

  const finalTitle = refined?.title || headline;
  const finalCardText = refined?.card_text || parts.cardText;
  const finalVideoScript = refined?.video_script || parts.videoScript || null;
  const finalSummary = refined?.summary_normalized || meta.summary_normalized;
  const finalFunFact = refined?.fun_fact || meta.fun_fact;

  const checked = await factCheckListPackage({
    title: finalTitle,
    card_text: finalCardText,
    video_script: finalVideoScript || "<p></p>",
    summary_normalized: finalSummary || "",
    fun_fact: finalFunFact || "<p></p>",
  });

  console.log(
    `🧪 List FactCheck: verdict=${checked.verdict} premiseFail=${checked.isFailPremise ? "YES" : "NO"} reason="${preview(checked.reason, 160)}"`,
  );

  return { parts, seo, checked };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function run() {
  console.log("🧠 CurioWire generateListArticle.js — starting");

  const found = await fetchOneListSuggestion();
  if (!found) {
    console.log("😴 No eligible list suggestion found.");
    return;
  }

  const { table: sourceTable, row } = found;

  const suggestionId = row.id;
  const categoryKey = normalizeCategoryKey(row.category);
  const wowScoreFromSuggestion = Number.isFinite(Number(row.wow_score))
    ? Number(row.wow_score)
    : 50;

  const originalSuggestionPackage = buildListSeedPackage(row);
  let initialPackage = { ...originalSuggestionPackage };

  const tone = "neutral";
  const factualFrame = "";

  console.log(
    `🧩 Picked list suggestion from "${sourceTable}" id=${suggestionId}`,
  );
  console.log(
    `   title="${initialPackage.title}" category="${categoryKey}" status="${row.status ?? "null"}"`,
  );

  // ✅ Premise gate — before spending tokens on full generation
  console.log("🧪 List premise gate — checking suggestion realism...");

  let gate = await listPremiseGateCheck({
    suggestionPackage: initialPackage,
    categoryKey,
  });

  const okVerdicts = new Set(["PASS", "FIX", "FAIL"]);
  if (!okVerdicts.has(gate.verdict)) {
    console.log(
      "⚠️ List premise gate returned unknown verdict — treating as FAIL:",
      gate.verdict,
    );
    gate.verdict = "FAIL";
  }

  if (gate.verdict === "FIX") {
    const fixedItems =
      Array.isArray(gate.correctedItems) && gate.correctedItems.length
        ? gate.correctedItems
        : initialPackage.items;

    initialPackage = {
      title: safeStr(gate.correctedTitle, initialPackage.title),
      theme: safeStr(gate.correctedTheme, initialPackage.theme),
      angle: safeStr(gate.correctedAngle, initialPackage.angle),
      items: fixedItems,
    };
  }

  console.log(
    `🧪 List premise gate verdict=${gate.verdict}${gate.verdict === "FIX" ? " (using corrected package)" : ""}`,
  );

  if (gate.verdict === "FAIL") {
    console.log(
      "🧯 List premise gate FAIL — flagging and stopping:",
      gate.reason,
    );

    await flagListSuggestionAndMaybeFailCard({
      suggestionId,
      categoryKey,
      seedTitle: originalSuggestionPackage.title,
      wowScore: wowScoreFromSuggestion,
      reason: `PREMISE_GATE_FAIL: ${gate.reason} | seed="${originalSuggestionPackage.title}"`,
      makeFailedCard: true,
    });

    return;
  }

  let image_url = null;
  let image_credit = null;
  let image_source = null;
  let image_prompt = null;
  let image_caption = null;
  let scene_prompt = null;

  try {
    let currentPackage = { ...initialPackage };
    let finalPack = null;
    let finalSeedPackage = { ...initialPackage };
    let lastFailReason = "";

    for (let attempt = 1; attempt <= MAX_PREMISE_ATTEMPTS; attempt++) {
      console.log(
        `🧪 List attempt ${attempt}/${MAX_PREMISE_ATTEMPTS}: "${currentPackage.title}"`,
      );

      const pack = await generateRefineAndFactcheckList({
        suggestionPackage: currentPackage,
        categoryKey,
        tone,
        factualFrame,
      });

      if (!pack.checked.isFailPremise) {
        finalPack = pack;
        finalSeedPackage = { ...currentPackage };
        break;
      }

      lastFailReason = pack.checked.reason || "List premise demonstrably false";
      console.log("🧯 LIST FAIL_PREMISE —", lastFailReason);

      if (attempt === MAX_PREMISE_ATTEMPTS) break;

      const salvage = await listPremiseSalvageDecider({
        title: pack.checked.title,
        card_text: pack.checked.card_text,
        reason: lastFailReason,
        originalSuggestionPackage,
      });

      if (
        !salvage.salvageYes ||
        !salvage.replacementTitle ||
        !Array.isArray(salvage.replacementItems) ||
        !salvage.replacementItems.length
      ) {
        console.log("🚫 List salvage NO — stopping.");
        break;
      }

      console.log(
        "🛟 List salvage YES — rebuilding on:",
        salvage.replacementTitle,
      );

      currentPackage = {
        title: safeStr(salvage.replacementTitle),
        theme: safeStr(salvage.replacementTheme),
        angle: safeStr(salvage.replacementAngle),
        items: salvage.replacementItems,
      };
    }

    if (!finalPack) {
      console.log(
        "🧯 List premise could not be salvaged — flagging and stopping.",
      );

      await flagListSuggestionAndMaybeFailCard({
        suggestionId,
        categoryKey,
        seedTitle: originalSuggestionPackage.title,
        wowScore: wowScoreFromSuggestion,
        reason: lastFailReason || "List premise false; no salvage",
        makeFailedCard: true,
      });

      return;
    }

    const { parts, seo, checked } = finalPack;

    const fcTitle = checked.title;
    const fcCardText = checked.card_text;
    const fcVideoScript = checked.video_script || null;
    const fcSummary = checked.summary_normalized;
    const fcFunFact = checked.fun_fact;

    // Source URL(s)
    let source_url = null;
    let sources = uniqueStrings(row.source_urls || []);

    if (sources.length) {
      source_url = sources[0];
      sources = sources.slice(0, 3);
    } else {
      try {
        sources = await resolveListSourceUrls({
          title: fcTitle,
          summary_normalized: fcSummary || "",
          category: categoryKey,
        });
        source_url = sources[0] || null;
      } catch (e) {
        console.warn("⚠️ SourceResolver failed:", e.message);
        source_url = null;
        sources = [];
      }
    }

    // Scene prompt
    try {
      scene_prompt = await generateScenePrompt({
        openai,
        title: fcTitle,
        category: categoryKey,
        video_script: fcVideoScript || "",
        card_text: fcCardText || "",
      });
      scene_prompt = (scene_prompt || "").trim() || null;
    } catch (e) {
      console.warn("⚠️ Scene prompt generation failed:", e.message);
      scene_prompt = null;
    }

    // Choose one hero item for image retrieval
    const heroItem = chooseHeroItem(finalSeedPackage.items);
    const imageTitle = heroItem?.title || fcTitle;
    const imageText = heroItem?.curiosity || fcCardText || "";
    const imageSummary = heroItem?.curiosity || fcSummary || "";

    // Image selection
    try {
      const img = await selectBestImage(
        imageTitle,
        imageText,
        categoryKey,
        null,
        imageSummary,
      );

      if (img?.imageUrl) {
        image_url = img.imageUrl;
        image_source = img.source || img.provider || null;
        image_caption = img.caption || null;

        image_credit =
          img.attribution ||
          (img.provider
            ? `Image source: ${img.provider}${img.license ? ` (${img.license})` : ""}`
            : null);

        const src = String(img.source || img.provider || "").toUpperCase();
        if (
          !image_credit &&
          (src === "DALL·E" || src === "DALLE" || src === "DALL-E")
        ) {
          image_credit = "Image source: DALL·E (AI-generated)";
          image_source = "DALL·E";
        }

        if (src === "DALL·E" || src === "DALLE" || src === "DALL-E") {
          image_prompt = img.prompt || null;
          image_caption = null;
        }
      }

      console.log("🖼️ List image:", image_url ? "selected" : "none");
      if (heroItem?.title) console.log(`   hero_item="${heroItem.title}"`);
    } catch (e) {
      console.warn("⚠️ List image selection failed:", e.message);
    }

    const seoTitle = seo.title || fcTitle || null;
    const description = seo.description || null;
    const keywords = seo.keywords || null;

    const cardsTable = process.env.CARDS_TABLE || "curiosity_cards";

    const insertPayload = {
      suggestion_id: null,
      source_suggestion_id: suggestionId,
      article_type: "list",
      category: categoryKey,

      title: fcTitle,
      card_text: fcCardText,
      video_script: fcVideoScript,

      source_url: source_url || null,
      sources: sources || [],

      summary_normalized: fcSummary,
      fun_fact: fcFunFact,

      seo_title: seoTitle,
      seo_description: description,
      seo_keywords: keywords,
      hashtags: parts.hashtags || null,

      wow_score: wowScoreFromSuggestion,

      image_url,
      image_credit,
      image_caption,
      image_source,
      image_prompt,
      scene_prompt,

      status: "published",
      is_listed: true,

      created_at: nowIso(),
      updated_at: nowIso(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from(cardsTable)
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    console.log(`📝 List card saved to "${cardsTable}" id=${inserted?.id}`);

    // mark suggestion used
    const { error: updateErr } = await supabase
      .from("curiosity_list_suggestions")
      .update({
        times_used: (row.times_used || 0) + 1,
        last_used_at: nowIso(),
        updated_at: nowIso(),
        review_note: null,
      })
      .eq("id", suggestionId);

    if (updateErr) throw updateErr;

    await updateAndPingSearchEngines();

    console.log("✅ List article done");
  } catch (err) {
    console.error("❌ generateListArticle.js failed:", err.message);
    await markListSuggestionFailed(sourceTable, suggestionId, err.message);
    process.exitCode = 1;
  }
}

run();
