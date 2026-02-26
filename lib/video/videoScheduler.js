// ============================================================================
// videoScheduler.js — SINGLE VIDEO PER RUN (v5.0)
// CurioWire — Picks BEST of LAST 3 published curiosity_cards and queues FULL-AI video
// ============================================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Run 2x/day → pick best from the last N cards
const LAST_N = 3;

// If true, scheduler may retry cards that only have FAILED video jobs
const ALLOW_RETRY_FAILED = false;

async function videoJobBlocksScheduling(cardId) {
  let q = supabase
    .from("videos")
    .select("id,status")
    .eq("article_id", cardId) // ✅ reuse article_id to point to curiosity_cards.id
    .eq("is_full_ai", true);

  if (ALLOW_RETRY_FAILED) {
    q = q.not("status", "eq", "failed");
  }

  const { data, error } = await q.limit(1).maybeSingle();
  if (error) {
    console.warn("⚠️ videoJobBlocksScheduling query failed:", error.message);
    return true; // fail-safe
  }

  return !!data;
}

async function pickBestEligibleCard() {
  const { data: lastCards, error } = await supabase
    .from("curiosity_cards")
    .select("*")
    .eq("status", "published")
    .neq("category", "products")
    .order("created_at", { ascending: false })
    .limit(LAST_N);

  if (error || !lastCards || lastCards.length === 0) {
    console.log("⚠️ No eligible curiosity_cards found for video.");
    return null;
  }

  console.log(
    "🧪 Last cards:",
    lastCards.map((c) => `${c.id}:${c.category}:${c.wow_score}`).join(" | "),
  );

  // Pick highest WOW among last N
  const sorted = [...lastCards].sort(
    (a, b) => (b.wow_score || 0) - (a.wow_score || 0),
  );

  for (const card of sorted) {
    const blocked = await videoJobBlocksScheduling(card.id);
    if (!blocked) return card;
  }

  console.log("ℹ️ All last cards already have FULL-AI video jobs.");
  return null;
}

export async function scheduleSingleVideo() {
  console.log("🎯 Running single-video scheduler (best of last 6)…");

  const card = await pickBestEligibleCard();
  if (!card) return null;

  const payload = {
    article_id: card.id, // ✅ points to curiosity_cards.id
    category: card.category,
    wow_score: card.wow_score || 0,
    is_full_ai: true,
    platforms: ["youtube"], // testfase
    status: "queued",
    // (valgfritt, men nyttig hvis videos-tabellen har dette feltet)
    // article: card,
  };

  const { data, error } = await supabase
    .from("videos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("❌ Failed to queue video:", error.message);
    return null;
  }

  console.log(
    `🎬 Queued FULL-AI video for card ${card.id} (WOW ${card.wow_score})`,
  );
  return data;
}
