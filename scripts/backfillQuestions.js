// scripts/backfillQuestions.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { backfillQuestions } from "../app/api/utils/questions/backfillQuestions.js";

const {
  OPENAI_API_KEY,
  OPENAI_ORG_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: OPENAI_ORG_ID,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("❓ Backfilling CurioWire questions...");

  const results = await backfillQuestions({
    openai,
    supabase,
    limit: Number(process.env.QUESTION_BACKFILL_LIMIT || 3),
  });

  console.table(results);
  console.log("✅ Done");
}

run().catch((err) => {
  console.error("❌ Backfill failed:", err.message);
  process.exitCode = 1;
});
