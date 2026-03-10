import fetch from "node-fetch";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const SITE_ORIGIN = "https://curiowire.com";

function buildCurioWireUrl(row) {
  return `${SITE_ORIGIN}/article/${row.id}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isIndexed(url) {
  const query = encodeURIComponent(`site:${url}`);

  const res = await fetch(`https://www.google.com/search?q=${query}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });

  const html = await res.text();
  const lower = html.toLowerCase();

  if (lower.includes("did not match any documents")) {
    return false;
  }

  return lower.includes(url.toLowerCase());
}

async function run() {
  console.log("🔍 Checking index status...");

  const { data: pages, error } = await supabase
    .from("curiosity_cards")
    .select("id, title, status")
    .eq("status", "published")
    .order("id", { ascending: true });

  if (error) {
    console.error("❌ Failed to load pages from Supabase:");
    console.error(error);
    process.exit(1);
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    console.log("ℹ️ No published rows found in curiosity_cards.");
    return;
  }

  let checked = 0;
  let indexedCount = 0;
  let notIndexedCount = 0;

  for (const page of pages) {
    const url = buildCurioWireUrl(page);

    console.log(`Checking ${url}`);

    try {
      const indexed = await isIndexed(url);

      const { error: upsertError } = await supabase
        .from("page_index_status")
        .upsert({
          url,
          indexed,
          last_checked: new Date().toISOString(),
        });

      if (upsertError) {
        console.error(`❌ Failed to upsert ${url}:`, upsertError);
        continue;
      }

      checked++;

      if (indexed) {
        indexedCount++;
        console.log("✅ Indexed");
      } else {
        notIndexedCount++;
        console.log("⛔ Not indexed");
      }
    } catch (err) {
      console.error(`❌ Failed while checking ${url}:`, err.message || err);
    }

    await sleep(1500);
  }

  console.log("\n✅ Done");
  console.log(`Checked: ${checked}`);
  console.log(`Indexed: ${indexedCount}`);
  console.log(`Not indexed: ${notIndexedCount}`);
}

run().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
