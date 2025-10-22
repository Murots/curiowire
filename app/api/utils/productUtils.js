// === PRODUCT & AFFILIATE UTILS ===
// Håndterer produktkategorisering og affiliate-lenker

import OpenAI from "openai";
import { makeAffiliateSearchLink } from "./affiliateTools.js";
import { buildProductPrompt } from "./prompts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function resolveProductCategory(topic, topicSummary, linkedStory) {
  const categoryPrompt = `
Interpret the following product name as a *general object category* or concept.
Example: "Apple Watch" → "watch"
Product name: "${topic}"
Return only the category in 1–2 words.
`;

  let productCategory = "object";
  try {
    const catResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: categoryPrompt }],
      max_tokens: 10,
      temperature: 0,
    });

    productCategory =
      catResp.choices[0]?.message?.content?.trim().toLowerCase() || "object";

    if (
      productCategory === "object" ||
      productCategory.includes("campaign") ||
      productCategory.includes("ad") ||
      productCategory.includes("marketing") ||
      productCategory.length < 2
    ) {
      const summaryHint = topicSummary
        .toLowerCase()
        .match(
          /\b(craftsmanship|design|tool|device|material|product|invention|item|object)\b/
        );
      if (summaryHint) {
        productCategory = summaryHint[1];
        console.log(
          `🧩 Fallback category derived from summary: "${productCategory}"`
        );
      } else if (
        linkedStory &&
        linkedStory.match(/\b(hat|pen|watch|car|machine|toy|tool)\b/i)
      ) {
        productCategory = linkedStory.match(
          /\b(hat|pen|watch|car|machine|toy|tool)\b/i
        )[1];
        console.log(
          `🧩 Fallback category derived from linkedStory: "${productCategory}"`
        );
      } else {
        productCategory = "product";
        console.log(`🧩 Defaulting to generic category: "product"`);
      }
    } else {
      console.log(`🧩 Product interpreted as: "${productCategory}"`);
    }
  } catch (err) {
    console.warn("⚠️ Category extraction failed:", err.message);
  }
  return productCategory;
}

export async function findAffiliateProduct(
  title,
  topic,
  article,
  existingName
) {
  let productName = existingName || null;
  let source_url = null;

  if (!productName) {
    console.log(`🧠 No product name found — asking GPT for match`);
    const productPrompt = buildProductPrompt(title, topic, article);
    try {
      const productSearch = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: productPrompt }],
        max_tokens: 50,
        temperature: 0.3,
      });
      productName = productSearch.choices[0]?.message?.content?.trim();
      if (productName) {
        source_url = makeAffiliateSearchLink(productName);
        console.log(`✅ Created affiliate search link for "${productName}"`);
      } else {
        console.warn(`⚠️ GPT returned no valid product name for "${topic}"`);
      }
    } catch (err) {
      console.error("❌ Error fetching product name:", err.message);
    }
  } else {
    source_url = makeAffiliateSearchLink(productName);
    console.log(`🛍️ Found product name: "${productName}"`);
  }

  return { productName, source_url };
}
