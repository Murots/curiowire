// // ============================================================================
// // scripts/upgradeArticle.js — CurioWire vNext (UPGRADE EXISTING ARTICLE)
// // Goal:
// // - Upgrade OLD article text into the new editorial style
// // - Preserve core topic and verified facts
// // - Allow targeting a specific article by Supabase card id
// //
// // Usage:
// //   node scripts/upgradeArticle.js <CARD_ID>
// //
// // Optional env:
// //   FORCE_CARD_ID=<CARD_ID>
// //   $env:UPGRADE_WRITE="true"; node scripts/upgradeArticle.js 399
// //   UPGRADE_RESOLVE_SOURCE=true // optionally refresh source_url
// //
// // Default behavior:
// //   - Dry run
// //   - Prints upgraded output to terminal
// //   - Does NOT write to DB unless UPGRADE_WRITE=true
// // ============================================================================

// import dotenv from "dotenv";
// dotenv.config({ path: ".env.local" });

// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";

// import { buildSummaryPrompt } from "../app/api/utils/summaryPrompt.js";
// import { buildRefinePackagePrompt } from "../app/api/utils/refinePackage.js";
// import { buildFactCheckPackagePrompt } from "../app/api/utils/factCheckPackage.js";
// import { buildSourceResolverPrompt } from "../app/api/utils/sourceResolverPrompt.js";
// import { decideArticlePlan } from "../app/api/utils/articlePlanner.js";
// import { decideArticleBreak } from "../app/api/utils/articleBreakPlanner.js";
// import { insertSeoHeadings } from "../app/api/utils/insertSeoHeadings.js";

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
// const CARDS_TABLE = process.env.CARDS_TABLE || "curiosity_cards";
// const WRITE_BACK =
//   String(process.env.UPGRADE_WRITE || "").toLowerCase() === "true";
// const RESOLVE_SOURCE =
//   String(process.env.UPGRADE_RESOLVE_SOURCE || "").toLowerCase() === "true";

// // ----------------------------------------------------------------------------
// // Helpers
// // ----------------------------------------------------------------------------
// function nowIso() {
//   return new Date().toISOString();
// }

// function safeStr(v, fallback = "") {
//   return typeof v === "string" && v.trim() ? v.trim() : fallback;
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

// function preview(s, n = 160) {
//   const t = safeStr(s, "");
//   return t.length > n ? `${t.slice(0, n)}…` : t;
// }

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

// function isEmptyFunFactText(text) {
//   const t = String(text || "")
//     .trim()
//     .toLowerCase();

//   return [
//     "",
//     "none",
//     "null",
//     "n/a",
//     "none available",
//     "not available",
//     "no fun fact",
//     "no fun fact available",
//     "no real fun fact exists",
//     "none available without adding information beyond the card text",
//   ].includes(t);
// }

// function splitSummaryOutput(text) {
//   const out = { summary_normalized: null, fun_fact: null };

//   const s = String(text || "");

//   const sum = s.match(/Summary:\s*([\s\S]*?)\s*FunFact:\s*/i);
//   if (sum) out.summary_normalized = sum[1].trim();

//   const ff = s.match(/FunFact:\s*([\s\S]*)$/i);
//   if (ff) out.fun_fact = ff[1].trim();

//   // Safety: discard too-short summaries
//   if (out.summary_normalized && out.summary_normalized.length < 10) {
//     out.summary_normalized = null;
//   }

//   if (out.fun_fact) {
//     let cleaned = out.fun_fact.trim();

//     // Remove empty <p></p>
//     cleaned = cleaned.replace(/^<p>\s*<\/p>\s*$/i, "").trim();

//     // Extract inner text if wrapped in <p>
//     cleaned = cleaned.replace(/^<p>\s*([\s\S]*?)\s*<\/p>$/i, "$1").trim();

//     // Normalize whitespace
//     cleaned = cleaned.replace(/\s+/g, " ").trim();

//     // Kill placeholder / junk outputs
//     if (isEmptyFunFactText(cleaned)) {
//       out.fun_fact = null;
//     } else {
//       out.fun_fact = `<p>${cleaned}</p>`;
//     }
//   }

//   return out;
// }

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

// function splitSourceResolverOutput(text) {
//   const s = String(text || "").trim();
//   const firstLine = s.split(/\r?\n/)[0]?.trim() || "";
//   const m = firstLine.match(/^URL:\s*(.+)\s*$/i);
//   const raw = (m?.[1] || "").trim();

//   if (!raw) return null;
//   if (raw.toUpperCase() === "NONE") return null;
//   if (!/^https?:\/\/\S+$/i.test(raw)) return null;

//   return raw.replace(/[)\].,;:]+$/, "");
// }

// function hasRequiredGeneratedParts(parts) {
//   return Boolean(
//     safeStr(parts.headline) &&
//     safeStr(parts.cardText) &&
//     safeStr(parts.videoScript) &&
//     safeStr(parts.seoBlock) &&
//     safeStr(parts.hashtags),
//   );
// }

// // ----------------------------------------------------------------------------
// // Prompt
// // ----------------------------------------------------------------------------
// function buildUpgradePrompt({
//   category,
//   oldTitle,
//   oldCardText,
//   oldSummary,
//   oldFunFact,
//   sourceUrl,
//   plan,
// }) {
//   const safe = (v) => String(v || "").trim();

//   const openingStyle = safe(plan?.opening_style || "direct");
//   const bodyStyle = safe(plan?.body_style || "explanation_first");
//   const explanationStyle = safe(plan?.explanation_style || "balanced");
//   const insightStyle = safe(plan?.insight_style || "context");
//   const endingStyle = safe(plan?.ending_style || "hard_fact");
//   const toneStyle = safe(plan?.tone_style || "restrained");
//   const pacingStyle = safe(plan?.pacing_style || "mixed");
//   const angle = safe(
//     plan?.angle || "State the core curiosity quickly and concretely.",
//   );

//   const avoid =
//     Array.isArray(plan?.avoid) && plan.avoid.length
//       ? plan.avoid
//           .map((x) => safe(x))
//           .filter(Boolean)
//           .map((x) => `- ${x}`)
//           .join("\n")
//       : "- avoid hype\n- avoid vague reflection\n- avoid padded intro";

//   return `
// You are upgrading an existing curiosity article into a better editorial version.

// GOAL
// Rewrite the article so it feels more precise, less generic, less AI-like, and closer to the current CurioWire quality standard.

// KEEP
// - the SAME core topic
// - the SAME factual scope unless safer wording is needed
// - the SAME general article length and format expectations
// - uncertainty markers where needed

// DO NOT
// - invent facts
// - widen the topic
// - add named details you cannot support from the existing article/source context
// - turn it into clickbait
// - moralize
// - write like a school explainer

// INPUT
// Category key: ${safe(category)}
// Existing title:
// ${safe(oldTitle)}

// Existing card text:
// ${safe(oldCardText)}

// Existing summary:
// ${safe(oldSummary)}

// Existing fun fact:
// ${safe(oldFunFact)}

// Existing source URL:
// ${safe(sourceUrl) || "(none)"}

// Editorial plan (follow naturally, not mechanically):
// - Opening style: ${openingStyle}
// - Body style: ${bodyStyle}
// - Explanation style: ${explanationStyle}
// - Insight style: ${insightStyle}
// - Ending style: ${endingStyle}
// - Tone style: ${toneStyle}
// - Pacing style: ${pacingStyle}
// - Angle: ${angle}

// Avoid:
// ${avoid}

// WRITE
// 1) A better title/headline
// 2) A rewritten article in the newer editorial style (350–500 words)
// 3) A short-video script
// 4) SEO block
// 5) Hashtags

// GLOBAL RULES
// - Preserve the article's real subject and core claims.
// - Prefer direct, concrete language over vague transitions and abstract filler.
// - Improve specificity and flow, but do not add unsupported details.
// - Avoid generic “this shows,” “powerful reminder,” “shockwaves,” and similar stock phrasing.
// - The final paragraph must not use “next time you” framing.
// - The article should feel like a short editorial curiosity piece, not a listicle or explainer handout.

// FORMAT RULES
// - Return ONLY the required sections.
// - No markdown.
// - Allowed HTML tags: h1, p
// - No emojis, no decorative symbols, no bold/italics.
// - No lists of any kind in the article.

// VIDEO SCRIPT RULES
// - 25–30 seconds spoken length (about 60–80 words).
// - The VideoScript must be present.
// - Open immediately.
// - Use short spoken sentences.
// - Prioritize tension, surprise, and reveal.

// SEO RULES
// Output exactly:
// SEO:
// <title> — SAME as headline text (without tags)
// <description> — 150–160 characters, factual, curiosity-driven, no quotes, no emojis
// <keywords> — 7–10 comma-separated long-tail keyword phrases (2–6 words each)

// HASHTAGS RULES
// Output exactly:
// Hashtags:
// (space-separated hashtags)
// - 7–10 total
// - Always include: #CurioWire and #${safe(category)}
// - Add specific theme-derived hashtags

// STRUCTURE LOCK
// Return output in EXACTLY this order with these exact labels:

// Headline:
// Card:
// VideoScript:
// SEO:
// Hashtags:

// Under each label:
// - Headline: <h1>[headline]</h1>
// - Card: HTML with <p> only
// - VideoScript: HTML with <p> only
// - SEO: plain text only
// - Hashtags: plain text only

// DO NOT add anything else before or after.
// `.trim();
// }

// // ----------------------------------------------------------------------------
// // DB fetch
// // ----------------------------------------------------------------------------
// async function fetchArticleById(id) {
//   const { data, error } = await supabase
//     .from(CARDS_TABLE)
//     .select("*")
//     .eq("id", id)
//     .single();

//   if (error) throw error;
//   return data || null;
// }

// async function fetchOnePublishedArticleFallback() {
//   const { data, error } = await supabase
//     .from(CARDS_TABLE)
//     .select("*")
//     .eq("status", "published")
//     .not("card_text", "is", null)
//     .order("updated_at", { ascending: true })
//     .limit(1)
//     .maybeSingle();

//   if (error) throw error;
//   return data || null;
// }

// // ----------------------------------------------------------------------------
// // Planner
// // ----------------------------------------------------------------------------
// async function planArticle({ topic, categoryKey, factualFrame }) {
//   return decideArticlePlan({
//     openai,
//     topic,
//     category: categoryKey,
//     factualFrame,
//   });
// }

// // ----------------------------------------------------------------------------
// // Rewrite
// // ----------------------------------------------------------------------------
// async function rewriteArticleHtml({
//   categoryKey,
//   oldTitle,
//   oldCardText,
//   oldSummary,
//   oldFunFact,
//   sourceUrl,
//   plan,
// }) {
//   const prompt = buildUpgradePrompt({
//     category: categoryKey,
//     oldTitle,
//     oldCardText,
//     oldSummary,
//     oldFunFact,
//     sourceUrl,
//     plan,
//   });

//   const resp = await openai.chat.completions.create({
//     model: ARTICLE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   const text = resp.choices[0]?.message?.content?.trim();
//   if (!text || text.length < 400) {
//     throw new Error("Rewrite returned too little text.");
//   }

//   return text;
// }

// // ----------------------------------------------------------------------------
// // Summary / Refine / Factcheck / Source
// // ----------------------------------------------------------------------------
// async function generateSummaryAndFunFact({ cardText }) {
//   const prompt = buildSummaryPrompt(cardText);

//   const resp = await openai.chat.completions.create({
//     model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   const text = resp.choices[0]?.message?.content?.trim();
//   if (!text) return { summary_normalized: null, fun_fact: null };

//   return splitSummaryOutput(text);
// }

// async function refinePackage({
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

// async function factCheckPackage({
//   title,
//   card_text,
//   video_script,
//   summary_normalized,
//   fun_fact,
// }) {
//   const prompt = buildFactCheckPackagePrompt({
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
//   if (!out) throw new Error("FactCheck returned empty output.");

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

// async function resolveOneSourceUrl({ title, summary_normalized, category }) {
//   const prompt = buildSourceResolverPrompt({
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
//   const url = splitSourceResolverOutput(out);

//   console.log(`🔗 SourceResolver: ${url ? "FOUND" : "NONE"}`);
//   if (url) console.log(`   source_url=${url}`);

//   return url;
// }

// // ----------------------------------------------------------------------------
// // Upgrade pipeline
// // ----------------------------------------------------------------------------
// async function upgradeArticle(article) {
//   const categoryKey = normalizeCategoryKey(article.category);
//   const oldTitle = safeStr(article.title, "Untitled Curiosity");
//   const oldCardText = safeStr(article.card_text);
//   const oldSummary = safeStr(article.summary_normalized);
//   const oldFunFact = safeStr(article.fun_fact);
//   const sourceUrl = safeStr(article.source_url);
//   const topic = oldTitle;

//   const factualFrame = sourceUrl
//     ? `Use the existing source URL as a grounding clue when possible: ${sourceUrl}`
//     : "";

//   const plan = await planArticle({
//     topic,
//     categoryKey,
//     factualFrame,
//   });

//   console.log("🧭 Plan selected");
//   console.log(`   opening=${plan.opening_style}`);
//   console.log(`   body=${plan.body_style}`);
//   console.log(`   explanation=${plan.explanation_style}`);
//   console.log(`   insight=${plan.insight_style}`);
//   console.log(`   ending=${plan.ending_style}`);
//   console.log(`   tone=${plan.tone_style}`);
//   console.log(`   pacing=${plan.pacing_style}`);
//   console.log(`   angle="${preview(plan.angle)}"`);

//   const raw = await rewriteArticleHtml({
//     categoryKey,
//     oldTitle,
//     oldCardText,
//     oldSummary,
//     oldFunFact,
//     sourceUrl,
//     plan,
//   });

//   const parts = splitGenerated(raw);

//   console.log(
//     `🧱 Rewrite raw: headline?=${Boolean(parts.headline)} cardLen=${(parts.cardText || "").length} videoLen=${(parts.videoScript || "").length}`,
//   );

//   if (!hasRequiredGeneratedParts(parts)) {
//     throw new Error("Rewrite output missing one or more required sections.");
//   }

//   const headlineRaw = parts.headline || "";
//   const headline = stripH1(headlineRaw) || oldTitle;

//   // Post-rewrite SEO H2 insertion
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

//   const meta = await generateSummaryAndFunFact({ cardText: parts.cardText });

//   console.log(
//     `🧾 Summary: ${meta.summary_normalized ? "yes" : "no"} | FunFact: ${meta.fun_fact ? "yes" : "no"}`,
//   );

//   const refined = await refinePackage({
//     title: headline,
//     card_text: parts.cardText,
//     video_script: parts.videoScript || "<p></p>",
//     summary_normalized: meta.summary_normalized || "",
//     fun_fact: meta.fun_fact || "",
//   });

//   if (refined) {
//     console.log(
//       `🧼 Refine: title=${changed(headline, refined.title) ? "changed" : "same"} card=${changed(parts.cardText, refined.card_text) ? "changed" : "same"} video=${changed(parts.videoScript, refined.video_script) ? "changed" : "same"}`,
//     );
//   } else {
//     console.log("🧼 Refine: skipped (no output)");
//   }

//   const finalTitle = refined?.title || headline;
//   const finalCardText = refined?.card_text || parts.cardText;
//   const finalVideoScript = refined?.video_script || parts.videoScript || null;
//   const finalSummary = refined?.summary_normalized || meta.summary_normalized;
//   const finalFunFact = refined?.fun_fact || meta.fun_fact;

//   const checked = await factCheckPackage({
//     title: finalTitle,
//     card_text: finalCardText,
//     video_script: finalVideoScript || "<p></p>",
//     summary_normalized: finalSummary || "",
//     fun_fact: finalFunFact || "<p></p>",
//   });

//   console.log(
//     `🧪 FactCheck: verdict=${checked.verdict} premiseFail=${checked.isFailPremise ? "YES" : "NO"} reason="${preview(checked.reason)}"`,
//   );

//   if (checked.isFailPremise) {
//     throw new Error(
//       `Upgrade failed premise check: ${checked.reason || "FAIL_PREMISE"}`,
//     );
//   }

//   // Article break (visual interruption metadata) — after PASS
//   let articleBreak = {
//     use_break: false,
//     break_type: "none",
//     insert_after_paragraph: null,
//     confidence: 0,
//     reason: "Not evaluated.",
//     payload: null,
//   };

//   try {
//     articleBreak = await decideArticleBreak({
//       openai,
//       title: checked.title,
//       category: categoryKey,
//       card_text: checked.card_text,
//       summary_normalized: checked.summary_normalized || "",
//     });

//     console.log(
//       `🧩 ArticleBreak: type=${articleBreak.break_type} use=${articleBreak.use_break ? "YES" : "NO"} afterP=${articleBreak.insert_after_paragraph ?? "null"} confidence=${articleBreak.confidence}`,
//     );
//   } catch (e) {
//     console.warn("⚠️ Article break planning failed:", e.message);
//     articleBreak = {
//       use_break: false,
//       break_type: "none",
//       insert_after_paragraph: null,
//       confidence: 0,
//       reason: `Planner failed: ${e.message}`,
//       payload: null,
//     };
//   }

//   let nextSourceUrl = sourceUrl || null;
//   if (RESOLVE_SOURCE || !nextSourceUrl) {
//     try {
//       nextSourceUrl = await resolveOneSourceUrl({
//         title: checked.title,
//         summary_normalized: checked.summary_normalized || "",
//         category: categoryKey,
//       });
//     } catch (e) {
//       console.warn("⚠️ SourceResolver failed:", e.message);
//       nextSourceUrl = sourceUrl || null;
//     }
//   }

//   return {
//     article_plan: plan,

//     title: checked.title,
//     card_text: checked.card_text,
//     video_script: checked.video_script || null,

//     source_url: nextSourceUrl || null,

//     summary_normalized: checked.summary_normalized,
//     fun_fact: checked.fun_fact,

//     seo_title: checked.title || null,
//     seo_description: seo.description || null,
//     seo_keywords: seo.keywords || null,
//     hashtags: parts.hashtags || null,

//     article_break_type: articleBreak.use_break ? articleBreak.break_type : null,
//     article_break_payload: articleBreak.use_break ? articleBreak.payload : null,
//     article_break_after_paragraph: articleBreak.use_break
//       ? articleBreak.insert_after_paragraph
//       : null,
//     article_break_confidence: articleBreak.use_break
//       ? articleBreak.confidence
//       : null,
//     article_break_reason: articleBreak.reason || null,
//   };
// }

// // ----------------------------------------------------------------------------
// // DB write
// // ----------------------------------------------------------------------------
// async function saveUpgrade(articleId, payload) {
//   const updatePayload = {
//     title: payload.title,
//     card_text: payload.card_text,
//     video_script: payload.video_script,
//     source_url: payload.source_url,
//     summary_normalized: payload.summary_normalized,
//     fun_fact: payload.fun_fact,
//     seo_title: payload.seo_title,
//     seo_description: payload.seo_description,
//     seo_keywords: payload.seo_keywords,
//     hashtags: payload.hashtags,
//     article_break_type: payload.article_break_type,
//     article_break_payload: payload.article_break_payload,
//     article_break_after_paragraph: payload.article_break_after_paragraph,
//     article_break_confidence: payload.article_break_confidence,
//     article_break_reason: payload.article_break_reason,
//     updated_at: nowIso(),
//   };

//   const { error } = await supabase
//     .from(CARDS_TABLE)
//     .update(updatePayload)
//     .eq("id", articleId);

//   if (error) throw error;
// }

// // ----------------------------------------------------------------------------
// // MAIN
// // ----------------------------------------------------------------------------
// async function run() {
//   const cliId = safeStr(process.argv[2]);
//   const forceId = safeStr(process.env.FORCE_CARD_ID);
//   const articleId = cliId || forceId;

//   console.log("🧠 CurioWire upgradeArticle.js — starting");
//   console.log(`📝 Mode: ${WRITE_BACK ? "WRITE" : "DRY RUN"}`);

//   let article = null;

//   if (articleId) {
//     article = await fetchArticleById(articleId);
//     if (!article) {
//       throw new Error(`Article not found for id=${articleId}`);
//     }
//     console.log(`🎯 Using explicit article id=${articleId}`);
//   } else {
//     article = await fetchOnePublishedArticleFallback();
//     if (!article) {
//       console.log("😴 No eligible published article found.");
//       return;
//     }
//     console.log(`🎯 Using fallback published article id=${article.id}`);
//   }

//   console.log(`   category="${article.category}"`);
//   console.log(`   title="${article.title}"`);

//   try {
//     const upgraded = await upgradeArticle(article);

//     console.log("\n================ UPGRADED ARTICLE ================\n");
//     console.log(`Title: ${upgraded.title}`);
//     console.log(`Source URL: ${upgraded.source_url || "None"}`);
//     console.log(`Article Break Type: ${upgraded.article_break_type || "None"}`);
//     console.log(
//       `Article Break After Paragraph: ${
//         upgraded.article_break_after_paragraph ?? "None"
//       }`,
//     );
//     console.log(
//       `Article Break Confidence: ${
//         upgraded.article_break_confidence ?? "None"
//       }`,
//     );
//     console.log(
//       `Article Break Reason: ${upgraded.article_break_reason || "None"}`,
//     );
//     console.log(
//       `Article Break Payload: ${
//         upgraded.article_break_payload
//           ? JSON.stringify(upgraded.article_break_payload, null, 2)
//           : "None"
//       }`,
//     );
//     console.log(`\n--- ARTICLE ---\n${upgraded.card_text || ""}`);
//     console.log(
//       `\n--- SUMMARY ---\n${upgraded.summary_normalized || "(none)"}`,
//     );
//     console.log(`\n--- FUN FACT ---\n${upgraded.fun_fact || "(none)"}`);
//     console.log(`\n--- VIDEO SCRIPT ---\n${upgraded.video_script || "(none)"}`);
//     console.log(
//       `\n--- SEO ---\nTitle: ${upgraded.seo_title || ""}\nDescription: ${upgraded.seo_description || ""}\nKeywords: ${upgraded.seo_keywords || ""}`,
//     );
//     console.log(`\n--- HASHTAGS ---\n${upgraded.hashtags || ""}`);
//     console.log("\n==================================================\n");

//     if (WRITE_BACK) {
//       await saveUpgrade(article.id, upgraded);
//       console.log(`✅ Article updated in "${CARDS_TABLE}" id=${article.id}`);
//     } else {
//       console.log("ℹ️ Dry run only. Set UPGRADE_WRITE=true to save changes.");
//     }
//   } catch (err) {
//     console.error("❌ upgradeArticle.js failed:", err.message);
//     process.exitCode = 1;
//   }
// }

// run();

// ============================================================================
// scripts/upgradeArticle.js — CurioWire vNext (UPGRADE EXISTING ARTICLE)
// Goal:
// - Upgrade OLD article text into the new editorial style
// - Preserve core topic and verified facts
// - Allow targeting a specific article by Supabase card id
//
// Usage:
//   node scripts/upgradeArticle.js <CARD_ID>
//
// Optional env:
//   FORCE_CARD_ID=<CARD_ID>
//   $env:UPGRADE_WRITE="true"; node scripts/upgradeArticle.js 399
//   UPGRADE_RESOLVE_SOURCE=true // optionally refresh source_url
//
// Run everything (ugrade all text + source + save):
//   $env:UPGRADE_WRITE="true"; $env:UPGRADE_RESOLVE_SOURCE="true"; node scripts/upgradeArticle.js 399
//
// Remove source resolve:
//   Remove-Item Env:UPGRADE_RESOLVE_SOURCE
//
// Default behavior:
//   - Dry run
//   - Prints upgraded output to terminal
//   - Does NOT write to DB unless UPGRADE_WRITE=true
// ============================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import { buildSummaryPrompt } from "../app/api/utils/summaryPrompt.js";
import { buildRefinePackagePrompt } from "../app/api/utils/refinePackage.js";
import { buildFactCheckPackagePrompt } from "../app/api/utils/factCheckPackage.js";
import { buildSourceResolverPrompt } from "../app/api/utils/sourceResolverPrompt.js";
import { decideArticlePlan } from "../app/api/utils/articlePlanner.js";
import { decideArticleBreak } from "../app/api/utils/articleBreakPlanner.js";
import { insertSeoHeadings } from "../app/api/utils/insertSeoHeadings.js";
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
// Config
// ----------------------------------------------------------------------------
const CARDS_TABLE = process.env.CARDS_TABLE || "curiosity_cards";
const WRITE_BACK =
  String(process.env.UPGRADE_WRITE || "").toLowerCase() === "true";
const RESOLVE_SOURCE =
  String(process.env.UPGRADE_RESOLVE_SOURCE || "").toLowerCase() === "true";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function nowIso() {
  return new Date().toISOString();
}

function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
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

function preview(s, n = 160) {
  const t = safeStr(s, "");
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

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

function isEmptyFunFactText(text) {
  const t = String(text || "")
    .trim()
    .toLowerCase();

  return [
    "",
    "none",
    "null",
    "n/a",
    "none available",
    "not available",
    "no fun fact",
    "no fun fact available",
    "no real fun fact exists",
    "none available without adding information beyond the card text",
  ].includes(t);
}

function splitSummaryOutput(text) {
  const out = { summary_normalized: null, fun_fact: null };

  const s = String(text || "");

  const sum = s.match(/Summary:\s*([\s\S]*?)\s*FunFact:\s*/i);
  if (sum) out.summary_normalized = sum[1].trim();

  const ff = s.match(/FunFact:\s*([\s\S]*)$/i);
  if (ff) out.fun_fact = ff[1].trim();

  // Safety: discard too-short summaries
  if (out.summary_normalized && out.summary_normalized.length < 10) {
    out.summary_normalized = null;
  }

  if (out.fun_fact) {
    let cleaned = out.fun_fact.trim();

    // Remove empty <p></p>
    cleaned = cleaned.replace(/^<p>\s*<\/p>\s*$/i, "").trim();

    // Extract inner text if wrapped in <p>
    cleaned = cleaned.replace(/^<p>\s*([\s\S]*?)\s*<\/p>$/i, "$1").trim();

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Kill placeholder / junk outputs
    if (isEmptyFunFactText(cleaned)) {
      out.fun_fact = null;
    } else {
      out.fun_fact = `<p>${cleaned}</p>`;
    }
  }

  return out;
}

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

function hasRequiredGeneratedParts(parts) {
  return Boolean(
    safeStr(parts.headline) &&
    safeStr(parts.cardText) &&
    safeStr(parts.videoScript) &&
    safeStr(parts.seoBlock) &&
    safeStr(parts.hashtags),
  );
}

// ----------------------------------------------------------------------------
// Prompt
// ----------------------------------------------------------------------------
function buildUpgradePrompt({
  category,
  oldTitle,
  oldCardText,
  oldSummary,
  oldFunFact,
  sourceUrl,
  plan,
}) {
  const safe = (v) => String(v || "").trim();

  const openingStyle = safe(plan?.opening_style || "direct");
  const bodyStyle = safe(plan?.body_style || "explanation_first");
  const explanationStyle = safe(plan?.explanation_style || "balanced");
  const insightStyle = safe(plan?.insight_style || "context");
  const endingStyle = safe(plan?.ending_style || "hard_fact");
  const toneStyle = safe(plan?.tone_style || "restrained");
  const pacingStyle = safe(plan?.pacing_style || "mixed");
  const angle = safe(
    plan?.angle || "State the core curiosity quickly and concretely.",
  );

  const avoid =
    Array.isArray(plan?.avoid) && plan.avoid.length
      ? plan.avoid
          .map((x) => safe(x))
          .filter(Boolean)
          .map((x) => `- ${x}`)
          .join("\n")
      : "- avoid hype\n- avoid vague reflection\n- avoid padded intro";

  return `
You are upgrading an existing curiosity article into a better editorial version.

GOAL
Rewrite the article so it feels more precise, less generic, less AI-like, and closer to the current CurioWire quality standard.

KEEP
- the SAME core topic
- the SAME factual scope unless safer wording is needed
- the SAME general article length and format expectations
- uncertainty markers where needed

DO NOT
- invent facts
- widen the topic
- add named details you cannot support from the existing article/source context
- turn it into clickbait
- moralize
- write like a school explainer

INPUT
Category key: ${safe(category)}
Existing title:
${safe(oldTitle)}

Existing card text:
${safe(oldCardText)}

Existing summary:
${safe(oldSummary)}

Existing fun fact:
${safe(oldFunFact)}

Existing source URL:
${safe(sourceUrl) || "(none)"}

Editorial plan (follow naturally, not mechanically):
- Opening style: ${openingStyle}
- Body style: ${bodyStyle}
- Explanation style: ${explanationStyle}
- Insight style: ${insightStyle}
- Ending style: ${endingStyle}
- Tone style: ${toneStyle}
- Pacing style: ${pacingStyle}
- Angle: ${angle}

Avoid:
${avoid}

WRITE
1) A better title/headline
2) A rewritten article in the newer editorial style (350–500 words)
3) A short-video script
4) SEO block
5) Hashtags

GLOBAL RULES
- Preserve the article's real subject and core claims.
- Prefer direct, concrete language over vague transitions and abstract filler.
- Improve specificity and flow, but do not add unsupported details.
- Avoid generic “this shows,” “powerful reminder,” “shockwaves,” and similar stock phrasing.
- The final paragraph must not use “next time you” framing.
- The article should feel like a short editorial curiosity piece, not a listicle or explainer handout.

FORMAT RULES
- Return ONLY the required sections.
- No markdown.
- Allowed HTML tags: h1, p
- No emojis, no decorative symbols, no bold/italics.
- No lists of any kind in the article.

VIDEO SCRIPT RULES
- 25–30 seconds spoken length (about 60–80 words).
- The VideoScript must be present.
- Open immediately.
- Use short spoken sentences.
- Prioritize tension, surprise, and reveal.

SEO RULES
Output exactly:
SEO:
<title> — SAME as headline text (without tags)
<description> — 150–160 characters, factual, curiosity-driven, no quotes, no emojis
<keywords> — 7–10 comma-separated long-tail keyword phrases (2–6 words each)

HASHTAGS RULES
Output exactly:
Hashtags:
(space-separated hashtags)
- 7–10 total
- Always include: #CurioWire and #${safe(category)}
- Add specific theme-derived hashtags

STRUCTURE LOCK
Return output in EXACTLY this order with these exact labels:

Headline:
Card:
VideoScript:
SEO:
Hashtags:

Under each label:
- Headline: <h1>[headline]</h1>
- Card: HTML with <p> only
- VideoScript: HTML with <p> only
- SEO: plain text only
- Hashtags: plain text only

DO NOT add anything else before or after.
`.trim();
}

// ----------------------------------------------------------------------------
// DB fetch
// ----------------------------------------------------------------------------
async function fetchArticleById(id) {
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data || null;
}

async function fetchOnePublishedArticleFallback() {
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .select("*")
    .eq("status", "published")
    .not("card_text", "is", null)
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// ----------------------------------------------------------------------------
// Planner
// ----------------------------------------------------------------------------
async function planArticle({ topic, categoryKey, factualFrame }) {
  return decideArticlePlan({
    openai,
    topic,
    category: categoryKey,
    factualFrame,
  });
}

// ----------------------------------------------------------------------------
// Rewrite
// ----------------------------------------------------------------------------
async function rewriteArticleHtml({
  categoryKey,
  oldTitle,
  oldCardText,
  oldSummary,
  oldFunFact,
  sourceUrl,
  plan,
}) {
  const prompt = buildUpgradePrompt({
    category: categoryKey,
    oldTitle,
    oldCardText,
    oldSummary,
    oldFunFact,
    sourceUrl,
    plan,
  });

  const resp = await openai.chat.completions.create({
    model: ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text || text.length < 400) {
    throw new Error("Rewrite returned too little text.");
  }

  return text;
}

// ----------------------------------------------------------------------------
// Summary / Refine / Factcheck / Source
// ----------------------------------------------------------------------------
async function generateSummaryAndFunFact({ cardText }) {
  const prompt = buildSummaryPrompt(cardText);

  const resp = await openai.chat.completions.create({
    model: process.env.SUMMARY_MODEL || ARTICLE_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0]?.message?.content?.trim();
  if (!text) return { summary_normalized: null, fun_fact: null };

  return splitSummaryOutput(text);
}

async function refinePackage({
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

async function factCheckPackage({
  title,
  card_text,
  video_script,
  summary_normalized,
  fun_fact,
}) {
  const prompt = buildFactCheckPackagePrompt({
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
  if (!out) throw new Error("FactCheck returned empty output.");

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
  const url = splitSourceResolverOutput(out);

  console.log(`🔗 SourceResolver: ${url ? "FOUND" : "NONE"}`);
  if (url) console.log(`   source_url=${url}`);

  return url;
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
// Upgrade pipeline
// ----------------------------------------------------------------------------
async function upgradeArticle(article) {
  const categoryKey = normalizeCategoryKey(article.category);
  const oldTitle = safeStr(article.title, "Untitled Curiosity");
  const oldCardText = safeStr(article.card_text);
  const oldSummary = safeStr(article.summary_normalized);
  const oldFunFact = safeStr(article.fun_fact);
  const sourceUrl = safeStr(article.source_url);
  const topic = oldTitle;

  const factualFrame = sourceUrl
    ? `Use the existing source URL as a grounding clue when possible: ${sourceUrl}`
    : "";

  const plan = await planArticle({
    topic,
    categoryKey,
    factualFrame,
  });

  console.log("🧭 Plan selected");
  console.log(`   opening=${plan.opening_style}`);
  console.log(`   body=${plan.body_style}`);
  console.log(`   explanation=${plan.explanation_style}`);
  console.log(`   insight=${plan.insight_style}`);
  console.log(`   ending=${plan.ending_style}`);
  console.log(`   tone=${plan.tone_style}`);
  console.log(`   pacing=${plan.pacing_style}`);
  console.log(`   angle="${preview(plan.angle)}"`);

  const raw = await rewriteArticleHtml({
    categoryKey,
    oldTitle,
    oldCardText,
    oldSummary,
    oldFunFact,
    sourceUrl,
    plan,
  });

  const parts = splitGenerated(raw);

  console.log(
    `🧱 Rewrite raw: headline?=${Boolean(parts.headline)} cardLen=${(parts.cardText || "").length} videoLen=${(parts.videoScript || "").length}`,
  );

  if (!hasRequiredGeneratedParts(parts)) {
    throw new Error("Rewrite output missing one or more required sections.");
  }

  const headlineRaw = parts.headline || "";
  const headline = stripH1(headlineRaw) || oldTitle;

  // Post-rewrite SEO H2 insertion
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

  const meta = await generateSummaryAndFunFact({ cardText: parts.cardText });

  console.log(
    `🧾 Summary: ${meta.summary_normalized ? "yes" : "no"} | FunFact: ${meta.fun_fact ? "yes" : "no"}`,
  );

  const refined = await refinePackage({
    title: headline,
    card_text: parts.cardText,
    video_script: parts.videoScript || "<p></p>",
    summary_normalized: meta.summary_normalized || "",
    fun_fact: meta.fun_fact || "",
  });

  if (refined) {
    console.log(
      `🧼 Refine: title=${changed(headline, refined.title) ? "changed" : "same"} card=${changed(parts.cardText, refined.card_text) ? "changed" : "same"} video=${changed(parts.videoScript, refined.video_script) ? "changed" : "same"}`,
    );
  } else {
    console.log("🧼 Refine: skipped (no output)");
  }

  const finalTitle = refined?.title || headline;
  const finalCardText = refined?.card_text || parts.cardText;
  const finalVideoScript = refined?.video_script || parts.videoScript || null;
  const finalSummary = refined?.summary_normalized || meta.summary_normalized;
  const finalFunFact = refined?.fun_fact || meta.fun_fact;

  const checked = await factCheckPackage({
    title: finalTitle,
    card_text: finalCardText,
    video_script: finalVideoScript || "<p></p>",
    summary_normalized: finalSummary || "",
    fun_fact: finalFunFact || "<p></p>",
  });

  console.log(
    `🧪 FactCheck: verdict=${checked.verdict} premiseFail=${checked.isFailPremise ? "YES" : "NO"} reason="${preview(checked.reason)}"`,
  );

  if (checked.isFailPremise) {
    throw new Error(
      `Upgrade failed premise check: ${checked.reason || "FAIL_PREMISE"}`,
    );
  }

  // Article break (visual interruption metadata) — after PASS
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
      title: checked.title,
      category: categoryKey,
      card_text: checked.card_text,
      summary_normalized: checked.summary_normalized || "",
    });

    console.log(
      `🧩 ArticleBreak: type=${articleBreak.break_type} use=${articleBreak.use_break ? "YES" : "NO"} afterP=${articleBreak.insert_after_paragraph ?? "null"} confidence=${articleBreak.confidence}`,
    );
  } catch (e) {
    console.warn("⚠️ Article break planning failed:", e.message);
    articleBreak = {
      use_break: false,
      break_type: "none",
      insert_after_paragraph: null,
      confidence: 0,
      reason: `Planner failed: ${e.message}`,
      payload: null,
    };
  }

  let nextSourceUrl = sourceUrl || null;

  if (RESOLVE_SOURCE || !nextSourceUrl) {
    try {
      const resolved = await resolveAndValidateOneSourceUrl({
        title: checked.title,
        summary_normalized: checked.summary_normalized || "",
        category: categoryKey,
        maxAttempts: 3,
      });

      nextSourceUrl = resolved || sourceUrl || null;
    } catch (e) {
      console.warn("⚠️ SourceResolver failed:", e.message);
      nextSourceUrl = sourceUrl || null;
    }
  }

  return {
    article_plan: plan,

    title: checked.title,
    card_text: checked.card_text,
    video_script: checked.video_script || null,

    source_url: nextSourceUrl || null,

    summary_normalized: checked.summary_normalized,
    fun_fact: checked.fun_fact,

    seo_title: checked.title || null,
    seo_description: seo.description || null,
    seo_keywords: seo.keywords || null,
    hashtags: parts.hashtags || null,

    article_break_type: articleBreak.use_break ? articleBreak.break_type : null,
    article_break_payload: articleBreak.use_break ? articleBreak.payload : null,
    article_break_after_paragraph: articleBreak.use_break
      ? articleBreak.insert_after_paragraph
      : null,
    article_break_confidence: articleBreak.use_break
      ? articleBreak.confidence
      : null,
    article_break_reason: articleBreak.reason || null,
  };
}

// ----------------------------------------------------------------------------
// DB write
// ----------------------------------------------------------------------------
async function saveUpgrade(articleId, payload) {
  const updatePayload = {
    title: payload.title,
    card_text: payload.card_text,
    video_script: payload.video_script,
    source_url: payload.source_url,
    summary_normalized: payload.summary_normalized,
    fun_fact: payload.fun_fact,
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
    seo_keywords: payload.seo_keywords,
    hashtags: payload.hashtags,
    article_break_type: payload.article_break_type,
    article_break_payload: payload.article_break_payload,
    article_break_after_paragraph: payload.article_break_after_paragraph,
    article_break_confidence: payload.article_break_confidence,
    article_break_reason: payload.article_break_reason,
    updated_at: nowIso(),
  };

  const { error } = await supabase
    .from(CARDS_TABLE)
    .update(updatePayload)
    .eq("id", articleId);

  if (error) throw error;
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function run() {
  const cliId = safeStr(process.argv[2]);
  const forceId = safeStr(process.env.FORCE_CARD_ID);
  const articleId = cliId || forceId;

  console.log("🧠 CurioWire upgradeArticle.js — starting");
  console.log(`📝 Mode: ${WRITE_BACK ? "WRITE" : "DRY RUN"}`);

  let article = null;

  if (articleId) {
    article = await fetchArticleById(articleId);
    if (!article) {
      throw new Error(`Article not found for id=${articleId}`);
    }
    console.log(`🎯 Using explicit article id=${articleId}`);
  } else {
    article = await fetchOnePublishedArticleFallback();
    if (!article) {
      console.log("😴 No eligible published article found.");
      return;
    }
    console.log(`🎯 Using fallback published article id=${article.id}`);
  }

  console.log(`   category="${article.category}"`);
  console.log(`   title="${article.title}"`);

  try {
    const upgraded = await upgradeArticle(article);

    console.log("\n================ UPGRADED ARTICLE ================\n");
    console.log(`Title: ${upgraded.title}`);
    console.log(`Source URL: ${upgraded.source_url || "None"}`);
    console.log(`Article Break Type: ${upgraded.article_break_type || "None"}`);
    console.log(
      `Article Break After Paragraph: ${
        upgraded.article_break_after_paragraph ?? "None"
      }`,
    );
    console.log(
      `Article Break Confidence: ${
        upgraded.article_break_confidence ?? "None"
      }`,
    );
    console.log(
      `Article Break Reason: ${upgraded.article_break_reason || "None"}`,
    );
    console.log(
      `Article Break Payload: ${
        upgraded.article_break_payload
          ? JSON.stringify(upgraded.article_break_payload, null, 2)
          : "None"
      }`,
    );
    console.log(`\n--- ARTICLE ---\n${upgraded.card_text || ""}`);
    console.log(
      `\n--- SUMMARY ---\n${upgraded.summary_normalized || "(none)"}`,
    );
    console.log(`\n--- FUN FACT ---\n${upgraded.fun_fact || "(none)"}`);
    console.log(`\n--- VIDEO SCRIPT ---\n${upgraded.video_script || "(none)"}`);
    console.log(
      `\n--- SEO ---\nTitle: ${upgraded.seo_title || ""}\nDescription: ${upgraded.seo_description || ""}\nKeywords: ${upgraded.seo_keywords || ""}`,
    );
    console.log(`\n--- HASHTAGS ---\n${upgraded.hashtags || ""}`);
    console.log("\n==================================================\n");

    if (WRITE_BACK) {
      await saveUpgrade(article.id, upgraded);
      console.log(`✅ Article updated in "${CARDS_TABLE}" id=${article.id}`);
    } else {
      console.log("ℹ️ Dry run only. Set UPGRADE_WRITE=true to save changes.");
    }
  } catch (err) {
    console.error("❌ upgradeArticle.js failed:", err.message);
    process.exitCode = 1;
  }
}

run();
