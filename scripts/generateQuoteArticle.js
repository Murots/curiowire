// // ============================================================================
// // scripts/generateQuoteArticle.js — CurioWire QUOTES v1
// // One run = one quote article.
// // Flow:
// //   premise gate on quote seed (using generic premise gate)
// //   plan -> generate -> insert SEO H2 -> summary -> refine -> factcheck
// //   if FAIL_PREMISE -> flag + stop
// //   if pass -> quote-safe article breaks (quote disallowed in post-filter)
// //   -> hero image searched on speaker only -> quote scene prompt -> save
// // ============================================================================

// import dotenv from "dotenv";
// dotenv.config({ path: ".env.local" });

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// import { buildPremiseGatePrompt } from "../app/api/utils/premiseGatePrompt.js";
// import { decideArticlePlan } from "../app/api/utils/articlePlanner.js";
// import { buildRefinePackagePrompt } from "../app/api/utils/refinePackage.js";
// import { buildQuoteArticlePrompt } from "../app/api/utils/quoteArticlePrompt.js";
// import { buildQuoteSummaryPrompt } from "../app/api/utils/quoteSummaryPrompt.js";
// import { buildQuoteFactCheckPackagePrompt } from "../app/api/utils/quoteFactCheckPackage.js";
// import { generateScenePrompt } from "../app/api/utils/scenePrompt.js";

// import { insertSeoHeadings } from "../app/api/utils/insertSeoHeadings.js";
// import { decideArticleBreak } from "../app/api/utils/articleBreakPlanner.js";
// import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";

// import { selectQuoteSupportImage } from "../lib/selectQuoteSupportImage.js";

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
// // Helpers
// // ----------------------------------------------------------------------------
// function nowIso() {
//   return new Date().toISOString();
// }

// function safeStr(v, fallback = "") {
//   return typeof v === "string" && v.trim() ? v.trim() : fallback;
// }

// function normalizeCategoryKey(key) {
//   const k = safeStr(key, "history").toLowerCase();
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
//   return allowed.has(k) ? k : "history";
// }

// function changed(a, b) {
//   return safeStr(a) !== safeStr(b);
// }

// function preview(s, n = 140) {
//   const t = safeStr(s, "");
//   return t.length > n ? t.slice(0, n) + "…" : t;
// }

// function stripH1(html) {
//   const m = String(html || "").match(/<h1>\s*([\s\S]*?)\s*<\/h1>/i);
//   return (m?.[1] || "").trim();
// }

// function uniqueStrings(arr) {
//   return [
//     ...new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)),
//   ];
// }

// function buildQuoteSeedPackage(row) {
//   return {
//     quote_text: safeStr(row?.quote_text),
//     speaker: safeStr(row?.speaker),
//     quote_context: safeStr(row?.quote_context),
//     category: normalizeCategoryKey(row?.category),
//     topic_tag: safeStr(row?.topic_tag),
//     verification_query: safeStr(row?.verification_query),
//     source_urls: Array.isArray(row?.source_urls) ? row.source_urls : [],
//   };
// }

// function buildPremiseSeedFromQuote(seedPackage) {
//   const quote = safeStr(seedPackage?.quote_text);
//   const speaker = safeStr(seedPackage?.speaker);
//   const context = safeStr(seedPackage?.quote_context);

//   const parts = [];
//   if (speaker && quote) {
//     parts.push(`${speaker} said: ${quote}`);
//   } else if (quote) {
//     parts.push(quote);
//   }

//   if (context) {
//     parts.push(context);
//   }

//   return parts.join(" ");
// }

// function splitPremiseGateOutput(text) {
//   const s = String(text || "");

//   const verdict = (s.match(/Verdict:\s*([^\n\r]+)/i)?.[1] || "")
//     .toUpperCase()
//     .replace(/[^A-Z| ]/g, "")
//     .split(/\s|\|/)[0]
//     .trim();

//   const correctedSeed = (
//     s.match(/CorrectedSeed:\s*([\s\S]*?)\nReason:\s*/i)?.[1] || ""
//   ).trim();

//   const reason = (s.match(/Reason:\s*([\s\S]*)$/i)?.[1] || "").trim();

//   return { verdict, correctedSeed, reason };
// }

// async function quotePremiseGateCheck({ seedPackage, categoryKey }) {
//   const curiosity = buildPremiseSeedFromQuote(seedPackage);

//   const prompt = buildPremiseGatePrompt({
//     curiosity,
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
//     return { verdict: "FAIL", correctedSeed: "", reason: "Empty output" };
//   }

//   return splitPremiseGateOutput(out);
// }

// // ----------------------------------------------------------------------------
// // Pick quote suggestion
// // ----------------------------------------------------------------------------
// async function fetchOneQuoteSuggestion() {
//   const { data, error } = await supabase.rpc(
//     "pick_random_unused_unflagged_quote",
//   );

//   if (error) throw error;

//   const row = Array.isArray(data) ? data[0] : data;

//   if (!row) return null;

//   return {
//     table: "quote_suggestions",
//     row,
//   };
// }
// // async function fetchOneQuoteSuggestion() {
// //   // 1) Prefer verified, unused, highest wow
// //   let { data, error } = await supabase
// //     .from("quote_suggestions")
// //     .select("*")
// //     .eq("status", "verified")
// //     .eq("times_used", 0)
// //     .order("wow_score", { ascending: false })
// //     .order("last_used_at", { ascending: true, nullsFirst: true })
// //     .order("created_at", { ascending: true })
// //     .limit(1)
// //     .maybeSingle();

// //   if (error) throw error;
// //   if (data) return { table: "quote_suggestions", row: data };

// //   // 2) Fallback to null-status suggestions
// //   ({ data, error } = await supabase
// //     .from("quote_suggestions")
// //     .select("*")
// //     .is("status", null)
// //     .eq("times_used", 0)
// //     .order("wow_score", { ascending: false })
// //     .order("last_used_at", { ascending: true, nullsFirst: true })
// //     .order("created_at", { ascending: true })
// //     .limit(1)
// //     .maybeSingle());

// //   if (error) throw error;
// //   if (!data) return null;

// //   return { table: "quote_suggestions", row: data };
// // }

// async function markQuoteSuggestionFailed(sourceTable, id, reason) {
//   try {
//     await supabase
//       .from(sourceTable)
//       .update({
//         review_note: `GEN_FAIL: ${String(reason || "").slice(0, 400)}`,
//         updated_at: nowIso(),
//       })
//       .eq("id", id);
//   } catch (err) {
//     console.warn("⚠️ markQuoteSuggestionFailed failed:", err.message);
//   }
// }

// async function flagQuoteSuggestionAndMaybeFailCard({
//   suggestionId,
//   categoryKey,
//   quoteText,
//   wowScore,
//   reason = "",
//   makeFailedCard = false,
// }) {
//   const note = String(reason || "").slice(0, 400);

//   await supabase
//     .from("quote_suggestions")
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
//       article_type: "quote",
//       category: categoryKey,
//       title: null,
//       quote_text: safeStr(quoteText),
//       card_text: "",
//       video_script: null,
//       summary_normalized: null,
//       fun_fact: null,
//       scene_prompt: null,
//       seo_title: null,
//       seo_description: null,
//       seo_keywords: null,
//       hashtags: null,
//       hero_asset_url: null,
//       image_url: null,
//       image_credit: null,
//       image_caption: null,
//       image_source: null,
//       image_prompt: null,
//       wow_score: wowScore,
//       status: "failed",
//       created_at: nowIso(),
//       updated_at: nowIso(),
//     });
//   }
// }

// // ----------------------------------------------------------------------------
// // Generate raw article
// // ----------------------------------------------------------------------------
// async function generateQuoteArticleHtml({
//   seedPackage,
//   categoryKey,
//   tone,
//   factualFrame,
//   plan,
// }) {
//   const prompt = buildQuoteArticlePrompt({
//     quote_text: seedPackage.quote_text,
//     speaker: seedPackage.speaker,
//     quote_context: seedPackage.quote_context,
//     category: categoryKey,
//     tone,
//     factualFrame,
//     plan,
//   });

//   const resp = await openai.chat.completions.create({
//     model: ARTICLE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   const text = resp.choices[0]?.message?.content?.trim();
//   if (!text || text.length < 450) {
//     throw new Error("Quote article generation returned too little text.");
//   }

//   return text;
// }

// // ----------------------------------------------------------------------------
// // Parse generated blocks
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
// // SEO parse
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
// // Summary
// // ----------------------------------------------------------------------------
// function splitQuoteSummaryOutput(text) {
//   const out = {
//     summary_normalized: null,
//     fun_fact: null,
//   };

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

// async function generateQuoteSummaryAndFunFact({
//   cardText,
//   quoteText,
//   speaker,
// }) {
//   const prompt = buildQuoteSummaryPrompt({
//     card_text: cardText,
//     quote_text: quoteText,
//     speaker,
//   });

//   const resp = await openai.chat.completions.create({
//     model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   const text = resp.choices[0]?.message?.content?.trim();
//   if (!text) return { summary_normalized: null, fun_fact: null };

//   return splitQuoteSummaryOutput(text);
// }

// // ----------------------------------------------------------------------------
// // Refine
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

// async function refineQuotePackage({
//   title,
//   card_text,
//   video_script,
//   summary_normalized,
//   fun_fact,
// }) {
//   const prompt = buildRefinePackagePrompt({
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
// // Factcheck
// // ----------------------------------------------------------------------------
// function splitQuoteFactCheckPackageOutput(text) {
//   const s = String(text || "");

//   const get = (label, nextLabel) => {
//     const re = nextLabel
//       ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
//       : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
//     return (s.match(re)?.[1] || "").trim();
//   };

//   return {
//     verdict: get("Verdict", "Reason"),
//     reason: get("Reason", "QuoteText"),
//     quote_text: get("QuoteText", "Title"),
//     title: get("Title", "Card"),
//     card_text: get("Card", "VideoScript"),
//     video_script: get("VideoScript", "Summary"),
//     summary_normalized: get("Summary", "FunFact"),
//     fun_fact: get("FunFact", null),
//   };
// }

// async function factCheckQuotePackage({
//   quote_text,
//   title,
//   card_text,
//   video_script,
//   summary_normalized,
//   fun_fact,
//   speaker,
//   quote_context,
// }) {
//   const prompt = buildQuoteFactCheckPackagePrompt({
//     quote_text,
//     speaker,
//     quote_context,
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
//   if (!out) throw new Error("Quote FactCheck returned empty output.");

//   const parsed = splitQuoteFactCheckPackageOutput(out);
//   const verdict = (parsed.verdict || "").trim().toUpperCase();
//   const isFailPremise = verdict.includes("FAIL_PREMISE");

//   return {
//     isFailPremise,
//     verdict,
//     reason: parsed.reason || "",
//     quote_text: parsed.quote_text || quote_text,
//     title: parsed.title || title,
//     card_text: parsed.card_text || card_text,
//     video_script: parsed.video_script || video_script,
//     summary_normalized: parsed.summary_normalized || summary_normalized,
//     fun_fact: parsed.fun_fact || fun_fact,
//   };
// }

// // ----------------------------------------------------------------------------
// // One pass: plan -> generate -> insert SEO H2 -> summary -> refine -> factcheck
// // ----------------------------------------------------------------------------
// async function generateRefineAndFactcheckQuote({
//   seedPackage,
//   categoryKey,
//   tone,
//   factualFrame,
// }) {
//   const plan = await decideArticlePlan({
//     openai,
//     topic: buildPremiseSeedFromQuote(seedPackage),
//     category: categoryKey,
//     factualFrame,
//   });

//   const raw = await generateQuoteArticleHtml({
//     seedPackage,
//     categoryKey,
//     tone,
//     factualFrame,
//     plan,
//   });

//   const parts = splitGenerated(raw);

//   console.log(
//     `🧱 Generated raw quote: headline?=${Boolean(parts.headline)} cardLen=${(parts.cardText || "").length} videoLen=${(parts.videoScript || "").length}`,
//   );

//   const headlineRaw = parts.headline || "";
//   const headline =
//     stripH1(headlineRaw) || `${seedPackage.speaker}: ${seedPackage.quote_text}`;

//   try {
//     const withSeoHeadings = await insertSeoHeadings({
//       openai,
//       title: headline,
//       category: categoryKey,
//       card_text: parts.cardText,
//     });

//     const headingsInserted = withSeoHeadings !== parts.cardText;
//     parts.cardText = withSeoHeadings;

//     console.log(`🧩 SEO H2 insert: ${headingsInserted ? "changed" : "same"}`);
//   } catch (e) {
//     console.warn("⚠️ SEO H2 insert failed:", e.message);
//   }

//   const seo = parseSeo(parts.seoBlock);

//   const meta = await generateQuoteSummaryAndFunFact({
//     cardText: parts.cardText,
//     quoteText: seedPackage.quote_text,
//     speaker: seedPackage.speaker,
//   });

//   console.log(
//     `🧾 Quote summary: ${meta.summary_normalized ? "yes" : "no"} | FunFact: ${meta.fun_fact ? "yes" : "no"}`,
//   );

//   const refined = await refineQuotePackage({
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
//       `🧼 Quote refine: title=${titleChanged ? "changed" : "same"} card=${cardChanged ? "changed" : "same"} video=${videoChanged ? "changed" : "same"} summary=${sumChanged ? "changed" : "same"} funFact=${funChanged ? "changed" : "same"}`,
//     );
//   } else {
//     console.log("🧼 Quote refine: skipped (no output)");
//   }

//   const finalQuoteText = seedPackage.quote_text;
//   const finalTitle = refined?.title || headline;
//   const finalCardText = refined?.card_text || parts.cardText;
//   const finalVideoScript = refined?.video_script || parts.videoScript || null;
//   const finalSummary = refined?.summary_normalized || meta.summary_normalized;
//   const finalFunFact = refined?.fun_fact || meta.fun_fact;

//   const checked = await factCheckQuotePackage({
//     quote_text: finalQuoteText,
//     title: finalTitle,
//     card_text: finalCardText,
//     video_script: finalVideoScript || "<p></p>",
//     summary_normalized: finalSummary || "",
//     fun_fact: finalFunFact || "<p></p>",
//     speaker: seedPackage.speaker,
//     quote_context: seedPackage.quote_context,
//   });

//   console.log(
//     `🧪 Quote FactCheck: verdict=${checked.verdict} premiseFail=${checked.isFailPremise ? "YES" : "NO"} reason="${preview(checked.reason, 160)}"`,
//   );

//   return { parts, seo, checked };
// }

// // ----------------------------------------------------------------------------
// // MAIN
// // ----------------------------------------------------------------------------
// async function run() {
//   console.log("🧠 CurioWire generateQuoteArticle.js — starting");

//   const found = await fetchOneQuoteSuggestion();
//   if (!found) {
//     console.log("😴 No eligible quote suggestion found.");
//     return;
//   }

//   const { table: sourceTable, row } = found;

//   const suggestionId = row.id;
//   const categoryKey = normalizeCategoryKey(row.category);
//   const wowScoreFromSuggestion = Number.isFinite(Number(row.wow_score))
//     ? Number(row.wow_score)
//     : 50;

//   const tone = "neutral";
//   const factualFrame = "";

//   let initialSeedPackage = buildQuoteSeedPackage(row);

//   console.log(
//     `🧩 Picked quote suggestion from "${sourceTable}" id=${suggestionId}`,
//   );
//   console.log(
//     `   speaker="${initialSeedPackage.speaker}" category="${categoryKey}" status="${row.status ?? "null"}"`,
//   );
//   console.log(`   quote="${preview(initialSeedPackage.quote_text, 120)}"`);

//   // Premise gate
//   console.log("🧪 Quote premise gate — checking quote realism...");

//   const gate = await quotePremiseGateCheck({
//     seedPackage: initialSeedPackage,
//     categoryKey,
//   });

//   const okVerdicts = new Set(["PASS", "FIX", "FAIL"]);
//   let gateVerdict = gate.verdict;

//   if (!okVerdicts.has(gateVerdict)) {
//     console.log(
//       "⚠️ Quote premise gate returned unknown verdict — treating as FAIL:",
//       gateVerdict,
//     );
//     gateVerdict = "FAIL";
//   }

//   // NOTE:
//   // We intentionally do NOT try to parse CorrectedSeed back into quote_text /
//   // speaker / quote_context, because the generic premise gate returns a single
//   // corrected sentence. We use FIX as "safe enough to continue", and let the
//   // quote-specific factcheck do the exact normalization later.
//   console.log(
//     `🧪 Quote premise gate verdict=${gateVerdict}${gateVerdict === "FIX" ? " (continuing with original structured seed; correctedSeed noted)" : ""}`,
//   );
//   if (gate.correctedSeed) {
//     console.log(`   correctedSeed="${preview(gate.correctedSeed, 160)}"`);
//   }

//   if (gateVerdict === "FAIL") {
//     console.log(
//       "🧯 Quote premise gate FAIL — flagging and stopping:",
//       gate.reason,
//     );

//     await flagQuoteSuggestionAndMaybeFailCard({
//       suggestionId,
//       categoryKey,
//       quoteText: row.quote_text,
//       wowScore: wowScoreFromSuggestion,
//       reason: `PREMISE_GATE_FAIL: ${gate.reason} | quote="${row.quote_text}"`,
//       makeFailedCard: true,
//     });

//     return;
//   }

//   let image_url = null;
//   let image_credit = null;
//   let image_source = null;
//   let image_prompt = null;
//   let image_caption = null;
//   let scene_prompt = null;

//   try {
//     const { parts, seo, checked } = await generateRefineAndFactcheckQuote({
//       seedPackage: initialSeedPackage,
//       categoryKey,
//       tone,
//       factualFrame,
//     });

//     if (checked.isFailPremise) {
//       console.log(
//         "🧯 Quote premise failed during factcheck — flagging and stopping.",
//       );

//       await flagQuoteSuggestionAndMaybeFailCard({
//         suggestionId,
//         categoryKey,
//         quoteText: row.quote_text,
//         wowScore: wowScoreFromSuggestion,
//         reason: checked.reason || "FAIL_PREMISE during quote factcheck",
//         makeFailedCard: true,
//       });

//       return;
//     }

//     const fcQuoteText = checked.quote_text || initialSeedPackage.quote_text;
//     const fcTitle = checked.title || null;
//     const fcCardText = checked.card_text;
//     const fcVideoScript = checked.video_script || null;
//     const fcSummary = checked.summary_normalized;
//     const fcFunFact = checked.fun_fact;

//     // Article break planning
//     let articleBreak = {
//       use_break: false,
//       break_type: "none",
//       insert_after_paragraph: null,
//       confidence: 0,
//       reason: "Not evaluated.",
//       payload: null,
//     };

//     try {
//       articleBreak = await decideArticleBreak({
//         openai,
//         title: fcTitle,
//         category: categoryKey,
//         card_text: fcCardText,
//         summary_normalized: fcSummary || "",
//       });

//       // Quote articles must never store a quote break.
//       if (articleBreak?.break_type === "quote") {
//         articleBreak = {
//           use_break: false,
//           break_type: "none",
//           insert_after_paragraph: null,
//           confidence: 0,
//           reason: "Rejected quote break for quote article type.",
//           payload: null,
//         };
//       }

//       console.log(
//         `🧩 Quote ArticleBreak: type=${articleBreak.break_type} use=${articleBreak.use_break ? "YES" : "NO"} afterP=${articleBreak.insert_after_paragraph ?? "null"} confidence=${articleBreak.confidence}`,
//       );
//     } catch (e) {
//       console.warn("⚠️ Quote article break planning failed:", e.message);
//       articleBreak = {
//         use_break: false,
//         break_type: "none",
//         insert_after_paragraph: null,
//         confidence: 0,
//         reason: `Planner failed: ${e.message}`,
//         payload: null,
//       };
//     }

//     // Sources come from verified quote suggestion
//     const sources = uniqueStrings(row.source_urls || []).slice(0, 3);
//     const source_url = sources[0] || null;

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

//     // Hero image: always search on speaker only
//     try {
//       const img = await selectQuoteSupportImage({
//         speaker: initialSeedPackage.speaker,
//         category: categoryKey,
//       });

//       if (img?.imageUrl) {
//         image_url = img.imageUrl;
//         image_source = img.source || img.provider || null;
//         image_caption = img.caption || null;

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
//           image_caption = null;
//         }
//       }

//       console.log("🖼️ Quote hero image:", image_url ? "selected" : "none");
//       console.log(`   image_query_speaker="${initialSeedPackage.speaker}"`);
//     } catch (e) {
//       console.warn("⚠️ Quote image selection failed:", e.message);
//     }

//     const seoTitle = seo.title || fcTitle || null;
//     const description = seo.description || null;
//     const keywords = seo.keywords || null;

//     const cardsTable = process.env.CARDS_TABLE || "curiosity_cards";

//     const insertPayload = {
//       suggestion_id: null,
//       source_suggestion_id: suggestionId,
//       article_type: "quote",
//       category: categoryKey,

//       title: fcTitle,
//       quote_text: fcQuoteText,
//       hero_asset_url: null,

//       card_text: fcCardText,
//       video_script: fcVideoScript,

//       source_url,
//       sources,

//       summary_normalized: fcSummary,
//       fun_fact: fcFunFact,

//       seo_title: seoTitle,
//       seo_description: description,
//       seo_keywords: keywords,
//       hashtags: parts.hashtags || null,

//       wow_score: wowScoreFromSuggestion,

//       image_url,
//       image_credit,
//       image_caption,
//       image_source,
//       image_prompt,
//       scene_prompt,

//       article_break_type: articleBreak.use_break
//         ? articleBreak.break_type
//         : null,
//       article_break_payload: articleBreak.use_break
//         ? articleBreak.payload
//         : null,
//       article_break_after_paragraph: articleBreak.use_break
//         ? articleBreak.insert_after_paragraph
//         : null,
//       article_break_confidence: articleBreak.use_break
//         ? articleBreak.confidence
//         : null,
//       article_break_reason: articleBreak.reason || null,

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

//     console.log(`📝 Quote card saved to "${cardsTable}" id=${inserted?.id}`);

//     // Mark suggestion used
//     const { error: updateErr } = await supabase
//       .from("quote_suggestions")
//       .update({
//         times_used: (row.times_used || 0) + 1,
//         last_used_at: nowIso(),
//         updated_at: nowIso(),
//         review_note: null,
//       })
//       .eq("id", suggestionId);

//     if (updateErr) throw updateErr;

//     await updateAndPingSearchEngines();

//     console.log("✅ Quote article done");
//   } catch (err) {
//     console.error("❌ generateQuoteArticle.js failed:", err.message);
//     await markQuoteSuggestionFailed(sourceTable, suggestionId, err.message);
//     process.exitCode = 1;
//   }
// }

// run();

// ============================================================================
// scripts/generateQuoteArticle.js — CurioWire QUOTES v1
// One run = one quote article.
// Flow:
//   premise gate on quote seed (using generic premise gate)
//   plan -> generate -> insert SEO H2 -> summary -> refine -> factcheck
//   if FAIL_PREMISE -> flag + stop
//   if pass -> quote-safe article breaks (quote disallowed in post-filter)
//   -> hero image searched on speaker only -> quote scene prompt -> save
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import { buildPremiseGatePrompt } from "../app/api/utils/premiseGatePrompt.js";
import { decideArticlePlan } from "../app/api/utils/articlePlanner.js";
import { buildRefinePackagePrompt } from "../app/api/utils/refinePackage.js";
import { buildQuoteArticlePrompt } from "../app/api/utils/quoteArticlePrompt.js";
import { buildQuoteSummaryPrompt } from "../app/api/utils/quoteSummaryPrompt.js";
import { buildQuoteFactCheckPackagePrompt } from "../app/api/utils/quoteFactCheckPackage.js";
import { generateScenePrompt } from "../app/api/utils/scenePrompt.js";

import { insertSeoHeadings } from "../app/api/utils/insertSeoHeadings.js";
import { decideArticleBreak } from "../app/api/utils/articleBreakPlanner.js";
import { updateAndPingSearchEngines } from "../app/api/utils/seoTools.js";

import { selectQuoteSupportImage } from "../lib/selectQuoteSupportImage.js";

import { buildSourceResolverPrompt } from "../app/api/utils/sourceResolverPrompt.js";
import {
  validateSourceUrl,
  cleanUrl,
} from "../app/api/utils/sourceUrlValidator.js";
import { buildSourceRelevancePrompt } from "../app/api/utils/sourceRelevancePrompt.js";

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
// Helpers
// ----------------------------------------------------------------------------
function nowIso() {
  return new Date().toISOString();
}

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function normalizeCategoryKey(key) {
  const k = safeStr(key, "history").toLowerCase();
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
  return allowed.has(k) ? k : "history";
}

function changed(a, b) {
  return safeStr(a) !== safeStr(b);
}

function preview(s, n = 140) {
  const t = safeStr(s, "");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function stripH1(html) {
  const m = String(html || "").match(/<h1>\s*([\s\S]*?)\s*<\/h1>/i);
  return (m?.[1] || "").trim();
}

function uniqueStrings(arr) {
  return [
    ...new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)),
  ];
}

function buildQuoteSeedPackage(row) {
  return {
    quote_text: safeStr(row?.quote_text),
    speaker: safeStr(row?.speaker),
    quote_context: safeStr(row?.quote_context),
    category: normalizeCategoryKey(row?.category),
    topic_tag: safeStr(row?.topic_tag),
    verification_query: safeStr(row?.verification_query),
    source_urls: Array.isArray(row?.source_urls) ? row.source_urls : [],
  };
}

function buildPremiseSeedFromQuote(seedPackage) {
  const quote = safeStr(seedPackage?.quote_text);
  const speaker = safeStr(seedPackage?.speaker);
  const context = safeStr(seedPackage?.quote_context);

  const parts = [];
  if (speaker && quote) {
    parts.push(`${speaker} said: ${quote}`);
  } else if (quote) {
    parts.push(quote);
  }

  if (context) {
    parts.push(context);
  }

  return parts.join(" ");
}

function splitPremiseGateOutput(text) {
  const s = String(text || "");

  const verdict = (s.match(/Verdict:\s*([^\n\r]+)/i)?.[1] || "")
    .toUpperCase()
    .replace(/[^A-Z| ]/g, "")
    .split(/\s|\|/)[0]
    .trim();

  const correctedSeed = (
    s.match(/CorrectedSeed:\s*([\s\S]*?)\nReason:\s*/i)?.[1] || ""
  ).trim();

  const reason = (s.match(/Reason:\s*([\s\S]*)$/i)?.[1] || "").trim();

  return { verdict, correctedSeed, reason };
}

async function quotePremiseGateCheck({ seedPackage, categoryKey }) {
  const curiosity = buildPremiseSeedFromQuote(seedPackage);

  const prompt = buildPremiseGatePrompt({
    curiosity,
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
    return { verdict: "FAIL", correctedSeed: "", reason: "Empty output" };
  }

  return splitPremiseGateOutput(out);
}

// ----------------------------------------------------------------------------
// Pick quote suggestion
// ----------------------------------------------------------------------------
async function fetchOneQuoteSuggestion() {
  const { data, error } = await supabase.rpc(
    "pick_random_unused_unflagged_quote",
  );

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) return null;

  return {
    table: "quote_suggestions",
    row,
  };
}

async function markQuoteSuggestionFailed(sourceTable, id, reason) {
  try {
    await supabase
      .from(sourceTable)
      .update({
        review_note: `GEN_FAIL: ${String(reason || "").slice(0, 400)}`,
        updated_at: nowIso(),
      })
      .eq("id", id);
  } catch (err) {
    console.warn("⚠️ markQuoteSuggestionFailed failed:", err.message);
  }
}

async function flagQuoteSuggestionAndMaybeFailCard({
  suggestionId,
  categoryKey,
  quoteText,
  wowScore,
  reason = "",
  makeFailedCard = false,
}) {
  const note = String(reason || "").slice(0, 400);

  await supabase
    .from("quote_suggestions")
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
      article_type: "quote",
      category: categoryKey,
      title: null,
      quote_text: safeStr(quoteText),
      card_text: "",
      video_script: null,
      summary_normalized: null,
      fun_fact: null,
      scene_prompt: null,
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      hashtags: null,
      hero_asset_url: null,
      image_url: null,
      image_credit: null,
      image_caption: null,
      image_source: null,
      image_prompt: null,
      wow_score: wowScore,
      status: "failed",
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
}

// ----------------------------------------------------------------------------
// Generate raw article
// ----------------------------------------------------------------------------
async function generateQuoteArticleHtml({
  seedPackage,
  categoryKey,
  tone,
  factualFrame,
  plan,
}) {
  const prompt = buildQuoteArticlePrompt({
    quote_text: seedPackage.quote_text,
    speaker: seedPackage.speaker,
    quote_context: seedPackage.quote_context,
    category: categoryKey,
    tone,
    factualFrame,
    plan,
  });

  const resp = await openai.chat.completions.create({
    model: ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text || text.length < 450) {
    throw new Error("Quote article generation returned too little text.");
  }

  return text;
}

// ----------------------------------------------------------------------------
// Parse generated blocks
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
// SEO parse
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
// Summary
// ----------------------------------------------------------------------------
function splitQuoteSummaryOutput(text) {
  const out = {
    summary_normalized: null,
    fun_fact: null,
  };

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

async function generateQuoteSummaryAndFunFact({
  cardText,
  quoteText,
  speaker,
}) {
  const prompt = buildQuoteSummaryPrompt({
    card_text: cardText,
    quote_text: quoteText,
    speaker,
  });

  const resp = await openai.chat.completions.create({
    model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text) return { summary_normalized: null, fun_fact: null };

  return splitQuoteSummaryOutput(text);
}

// ----------------------------------------------------------------------------
// Refine
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

async function refineQuotePackage({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const prompt = buildRefinePackagePrompt({
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
// Factcheck
// ----------------------------------------------------------------------------
function splitQuoteFactCheckPackageOutput(text) {
  const s = String(text || "");

  const get = (label, nextLabel) => {
    const re = nextLabel
      ? new RegExp(`${label}:\\s*([\\s\\S]*?)\\n${nextLabel}:\\s*`, "i")
      : new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i");
    return (s.match(re)?.[1] || "").trim();
  };

  return {
    verdict: get("Verdict", "Reason"),
    reason: get("Reason", "QuoteText"),
    quote_text: get("QuoteText", "Title"),
    title: get("Title", "Card"),
    card_text: get("Card", "VideoScript"),
    video_script: get("VideoScript", "Summary"),
    summary_normalized: get("Summary", "FunFact"),
    fun_fact: get("FunFact", null),
  };
}

async function factCheckQuotePackage({
  quote_text,
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
  speaker,
  quote_context,
}) {
  const prompt = buildQuoteFactCheckPackagePrompt({
    quote_text,
    speaker,
    quote_context,
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
  if (!out) throw new Error("Quote FactCheck returned empty output.");

  const parsed = splitQuoteFactCheckPackageOutput(out);
  const verdict = (parsed.verdict || "").trim().toUpperCase();
  const isFailPremise = verdict.includes("FAIL_PREMISE");

  return {
    isFailPremise,
    verdict,
    reason: parsed.reason || "",
    quote_text: parsed.quote_text || quote_text,
    title: parsed.title || title,
    card_text: parsed.card_text || card_text,
    video_script: parsed.video_script || video_script,
    summary_normalized: parsed.summary_normalized || summary_normalized,
    fun_fact: parsed.fun_fact || fun_fact,
  };
}

// ----------------------------------------------------------------------------
// SOURCE RESOLVER (ONE URL after PASS)
// ----------------------------------------------------------------------------
function splitSourceResolverOutput(text) {
  const s = String(text || "").trim();
  const firstLine = s.split(/\r?\n/)[0]?.trim() || "";
  const m = firstLine.match(/^URL:\s*(.+)\s*$/i);
  const raw = (m?.[1] || "").trim();

  if (!raw) return null;
  if (raw.toUpperCase() === "NONE") return null;

  if (!/^https?:\/\/\S+$/i.test(raw)) return null;

  return raw.replace(/[)\].,;:]+$/, "");
}

async function resolveOneSourceUrl({
  title,
  summary_normalized,
  category,
  avoidUrls = [],
}) {
  const prompt = buildSourceResolverPrompt({
    title,
    summary_normalized,
    category,
    avoidUrls,
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
  return splitSourceResolverOutput(out);
}

async function checkSourceRelevance({ title, summary_normalized, sourceUrl }) {
  const prompt = buildSourceRelevancePrompt({
    title,
    summary_normalized,
    sourceUrl,
  });

  const resp = await openai.responses.create({
    model:
      process.env.SOURCE_RELEVANCE_MODEL ||
      process.env.FACTCHECK_MODEL ||
      "gpt-5",
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: prompt,
  });

  const out = (resp.output_text || "").trim();

  const verdict = (
    out.match(/Verdict:\s*(PASS|FAIL)/i)?.[1] || ""
  ).toUpperCase();

  const reason = out.match(/Reason:\s*([\s\S]*)$/i)?.[1]?.trim() || "";

  return {
    pass: verdict === "PASS",
    reason,
  };
}

async function resolveAndValidateOneSourceUrl({
  title,
  summary_normalized,
  category,
  maxAttempts = 3,
}) {
  const triedUrls = new Set();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rawUrl = await resolveOneSourceUrl({
      title,
      summary_normalized,
      category,
      avoidUrls: Array.from(triedUrls),
    });

    const cleaned = cleanUrl(rawUrl);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (triedUrls.has(key)) continue;

    triedUrls.add(key);

    const verifiedUrl = await validateSourceUrl(cleaned);

    if (!verifiedUrl) {
      console.warn(`⚠️ Source validation failed: ${cleaned}`);
      continue;
    }

    triedUrls.add(verifiedUrl.toLowerCase());

    const relevance = await checkSourceRelevance({
      title,
      summary_normalized,
      sourceUrl: verifiedUrl,
    });

    if (relevance.pass) {
      console.log(`✅ Source validated and relevant: ${verifiedUrl}`);
      return verifiedUrl;
    }

    console.warn(
      `⚠️ Source relevance failed: ${verifiedUrl} — ${relevance.reason}`,
    );
  }

  console.warn("⚠️ No valid and relevant article source found after retries.");
  return null;
}

// ----------------------------------------------------------------------------
// One pass: plan -> generate -> insert SEO H2 -> summary -> refine -> factcheck
// ----------------------------------------------------------------------------
async function generateRefineAndFactcheckQuote({
  seedPackage,
  categoryKey,
  tone,
  factualFrame,
}) {
  const plan = await decideArticlePlan({
    openai,
    topic: buildPremiseSeedFromQuote(seedPackage),
    category: categoryKey,
    factualFrame,
  });

  const raw = await generateQuoteArticleHtml({
    seedPackage,
    categoryKey,
    tone,
    factualFrame,
    plan,
  });

  const parts = splitGenerated(raw);

  console.log(
    `🧱 Generated raw quote: headline?=${Boolean(parts.headline)} cardLen=${(parts.cardText || "").length} videoLen=${(parts.videoScript || "").length}`,
  );

  const headlineRaw = parts.headline || "";
  const headline =
    stripH1(headlineRaw) || `${seedPackage.speaker}: ${seedPackage.quote_text}`;

  try {
    const withSeoHeadings = await insertSeoHeadings({
      openai,
      title: headline,
      category: categoryKey,
      card_text: parts.cardText,
    });

    const headingsInserted = withSeoHeadings !== parts.cardText;
    parts.cardText = withSeoHeadings;

    console.log(`🧩 SEO H2 insert: ${headingsInserted ? "changed" : "same"}`);
  } catch (e) {
    console.warn("⚠️ SEO H2 insert failed:", e.message);
  }

  const seo = parseSeo(parts.seoBlock);

  const meta = await generateQuoteSummaryAndFunFact({
    cardText: parts.cardText,
    quoteText: seedPackage.quote_text,
    speaker: seedPackage.speaker,
  });

  console.log(
    `🧾 Quote summary: ${meta.summary_normalized ? "yes" : "no"} | FunFact: ${meta.fun_fact ? "yes" : "no"}`,
  );

  const refined = await refineQuotePackage({
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
      `🧼 Quote refine: title=${titleChanged ? "changed" : "same"} card=${cardChanged ? "changed" : "same"} video=${videoChanged ? "changed" : "same"} summary=${sumChanged ? "changed" : "same"} funFact=${funChanged ? "changed" : "same"}`,
    );
  } else {
    console.log("🧼 Quote refine: skipped (no output)");
  }

  const finalQuoteText = seedPackage.quote_text;
  const finalTitle = refined?.title || headline;
  const finalCardText = refined?.card_text || parts.cardText;
  const finalVideoScript = refined?.video_script || parts.videoScript || null;
  const finalSummary = refined?.summary_normalized || meta.summary_normalized;
  const finalFunFact = refined?.fun_fact || meta.fun_fact;

  const checked = await factCheckQuotePackage({
    quote_text: finalQuoteText,
    title: finalTitle,
    card_text: finalCardText,
    video_script: finalVideoScript || "<p></p>",
    summary_normalized: finalSummary || "",
    fun_fact: finalFunFact || "<p></p>",
    speaker: seedPackage.speaker,
    quote_context: seedPackage.quote_context,
  });

  console.log(
    `🧪 Quote FactCheck: verdict=${checked.verdict} premiseFail=${checked.isFailPremise ? "YES" : "NO"} reason="${preview(checked.reason, 160)}"`,
  );

  return { parts, seo, checked };
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function run() {
  console.log("🧠 CurioWire generateQuoteArticle.js — starting");

  const found = await fetchOneQuoteSuggestion();
  if (!found) {
    console.log("😴 No eligible quote suggestion found.");
    return;
  }

  const { table: sourceTable, row } = found;

  const suggestionId = row.id;
  const categoryKey = normalizeCategoryKey(row.category);
  const wowScoreFromSuggestion = Number.isFinite(Number(row.wow_score))
    ? Number(row.wow_score)
    : 50;

  const tone = "neutral";
  const factualFrame = "";

  let initialSeedPackage = buildQuoteSeedPackage(row);

  console.log(
    `🧩 Picked quote suggestion from "${sourceTable}" id=${suggestionId}`,
  );
  console.log(
    `   speaker="${initialSeedPackage.speaker}" category="${categoryKey}" status="${row.status ?? "null"}"`,
  );
  console.log(`   quote="${preview(initialSeedPackage.quote_text, 120)}"`);

  // Premise gate
  console.log("🧪 Quote premise gate — checking quote realism...");

  const gate = await quotePremiseGateCheck({
    seedPackage: initialSeedPackage,
    categoryKey,
  });

  const okVerdicts = new Set(["PASS", "FIX", "FAIL"]);
  let gateVerdict = gate.verdict;

  if (!okVerdicts.has(gateVerdict)) {
    console.log(
      "⚠️ Quote premise gate returned unknown verdict — treating as FAIL:",
      gateVerdict,
    );
    gateVerdict = "FAIL";
  }

  // NOTE:
  // We intentionally do NOT try to parse CorrectedSeed back into quote_text /
  // speaker / quote_context, because the generic premise gate returns a single
  // corrected sentence. We use FIX as "safe enough to continue", and let the
  // quote-specific factcheck do the exact normalization later.
  console.log(
    `🧪 Quote premise gate verdict=${gateVerdict}${gateVerdict === "FIX" ? " (continuing with original structured seed; correctedSeed noted)" : ""}`,
  );
  if (gate.correctedSeed) {
    console.log(`   correctedSeed="${preview(gate.correctedSeed, 160)}"`);
  }

  if (gateVerdict === "FAIL") {
    console.log(
      "🧯 Quote premise gate FAIL — flagging and stopping:",
      gate.reason,
    );

    await flagQuoteSuggestionAndMaybeFailCard({
      suggestionId,
      categoryKey,
      quoteText: row.quote_text,
      wowScore: wowScoreFromSuggestion,
      reason: `PREMISE_GATE_FAIL: ${gate.reason} | quote="${row.quote_text}"`,
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
    const { parts, seo, checked } = await generateRefineAndFactcheckQuote({
      seedPackage: initialSeedPackage,
      categoryKey,
      tone,
      factualFrame,
    });

    if (checked.isFailPremise) {
      console.log(
        "🧯 Quote premise failed during factcheck — flagging and stopping.",
      );

      await flagQuoteSuggestionAndMaybeFailCard({
        suggestionId,
        categoryKey,
        quoteText: row.quote_text,
        wowScore: wowScoreFromSuggestion,
        reason: checked.reason || "FAIL_PREMISE during quote factcheck",
        makeFailedCard: true,
      });

      return;
    }

    const fcQuoteText = checked.quote_text || initialSeedPackage.quote_text;
    const fcTitle = checked.title || null;
    const fcCardText = checked.card_text;
    const fcVideoScript = checked.video_script || null;
    const fcSummary = checked.summary_normalized;
    const fcFunFact = checked.fun_fact;

    // Article break planning
    let articleBreak = {
      use_break: false,
      break_type: "none",
      insert_after_paragraph: null,
      confidence: 0,
      reason: "Not evaluated.",
      payload: null,
    };

    try {
      articleBreak = await decideArticleBreak({
        openai,
        title: fcTitle,
        category: categoryKey,
        card_text: fcCardText,
        summary_normalized: fcSummary || "",
      });

      // Quote articles must never store a quote break.
      if (articleBreak?.break_type === "quote") {
        articleBreak = {
          use_break: false,
          break_type: "none",
          insert_after_paragraph: null,
          confidence: 0,
          reason: "Rejected quote break for quote article type.",
          payload: null,
        };
      }

      console.log(
        `🧩 Quote ArticleBreak: type=${articleBreak.break_type} use=${articleBreak.use_break ? "YES" : "NO"} afterP=${articleBreak.insert_after_paragraph ?? "null"} confidence=${articleBreak.confidence}`,
      );
    } catch (e) {
      console.warn("⚠️ Quote article break planning failed:", e.message);
      articleBreak = {
        use_break: false,
        break_type: "none",
        insert_after_paragraph: null,
        confidence: 0,
        reason: `Planner failed: ${e.message}`,
        payload: null,
      };
    }

    // Sources come from verified quote suggestion
    let source_url = null;
    let sources = [];

    const existing = uniqueStrings(row.source_urls || []);

    for (const raw of existing) {
      const verified = await validateSourceUrl(cleanUrl(raw));
      if (!verified) continue;

      const relevance = await checkSourceRelevance({
        title: fcTitle,
        summary_normalized: fcSummary || "",
        sourceUrl: verified,
      });

      if (relevance.pass) {
        sources.push(verified);
      } else {
        console.warn(
          `⚠️ Existing quote source relevance failed: ${verified} — ${relevance.reason}`,
        );
      }

      if (sources.length >= 3) break;
    }
    if (!sources.length) {
      source_url = await resolveAndValidateOneSourceUrl({
        title: fcTitle,
        summary_normalized: fcSummary || "",
        category: categoryKey,
        maxAttempts: 3,
      });

      if (source_url) sources = [source_url];
    } else {
      source_url = sources[0];
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

    // Hero image: always search on speaker only
    try {
      const img = await selectQuoteSupportImage({
        speaker: initialSeedPackage.speaker,
        category: categoryKey,
      });

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

      console.log("🖼️ Quote hero image:", image_url ? "selected" : "none");
      console.log(`   image_query_speaker="${initialSeedPackage.speaker}"`);
    } catch (e) {
      console.warn("⚠️ Quote image selection failed:", e.message);
    }

    const seoTitle = seo.title || fcTitle || null;
    const description = seo.description || null;
    const keywords = seo.keywords || null;

    const cardsTable = process.env.CARDS_TABLE || "curiosity_cards";

    const insertPayload = {
      suggestion_id: null,
      source_suggestion_id: suggestionId,
      article_type: "quote",
      category: categoryKey,

      title: fcTitle,
      quote_text: fcQuoteText,
      hero_asset_url: null,

      card_text: fcCardText,
      video_script: fcVideoScript,

      source_url,
      sources,

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

      article_break_type: articleBreak.use_break
        ? articleBreak.break_type
        : null,
      article_break_payload: articleBreak.use_break
        ? articleBreak.payload
        : null,
      article_break_after_paragraph: articleBreak.use_break
        ? articleBreak.insert_after_paragraph
        : null,
      article_break_confidence: articleBreak.use_break
        ? articleBreak.confidence
        : null,
      article_break_reason: articleBreak.reason || null,

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

    console.log(`📝 Quote card saved to "${cardsTable}" id=${inserted?.id}`);

    // Mark suggestion used
    const { error: updateErr } = await supabase
      .from("quote_suggestions")
      .update({
        times_used: (row.times_used || 0) + 1,
        last_used_at: nowIso(),
        updated_at: nowIso(),
        review_note: null,
      })
      .eq("id", suggestionId);

    if (updateErr) throw updateErr;

    await updateAndPingSearchEngines();

    console.log("✅ Quote article done");
  } catch (err) {
    console.error("❌ generateQuoteArticle.js failed:", err.message);
    await markQuoteSuggestionFailed(sourceTable, suggestionId, err.message);
    process.exitCode = 1;
  }
}

run();
