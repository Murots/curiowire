// ============================================================================
// CurioWire — selectAnchors.js
// Selects reusable curiosity anchors with cooldown + rotation.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------------------
// SUPABASE INIT (SERVICE ROLE REQUIRED)
// ----------------------------------------------------------------------------
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl)
  throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseKey) throw new Error("Missing Supabase key for anchor selection");

const supabase = createClient(supabaseUrl, supabaseKey);

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ----------------------------------------------------------------------------
// MAIN EXPORT
// ----------------------------------------------------------------------------
export async function selectAnchors({
  category,
  count = 1,
  cooldownHours = 48,
  poolMultiplier = 5,
} = {}) {
  if (!category) return [];

  const cutoffISO = new Date(
    Date.now() - cooldownHours * 60 * 60 * 1000
  ).toISOString();

  const poolSize = Math.max(count * poolMultiplier, count);

  const { data, error } = await supabase
    .from("curiosity_anchors")
    .select(
      `
      id,
      category,
      anchor,
      anchor_type,
      must_include,
      avoid,
      evidence_types,
      time_scope,
      last_used_at,
      usage_count
    `
    )
    .eq("category", category)
    .or(`last_used_at.is.null,last_used_at.lt.${cutoffISO}`)
    .order("usage_count", { ascending: true })
    .limit(poolSize);

  if (error) {
    console.error("❌ selectAnchors Supabase error:", error.message);
    return [];
  }

  const rows = data || [];
  if (!rows.length) return [];

  return shuffle(rows).slice(0, count);
}

// ----------------------------------------------------------------------------
// MARK AS USED
// ----------------------------------------------------------------------------
export async function markAnchorUsed(anchorId) {
  if (!anchorId) return;

  const { data: row, error: readErr } = await supabase
    .from("curiosity_anchors")
    .select("usage_count")
    .eq("id", anchorId)
    .single();

  if (readErr) {
    console.warn("⚠️ markAnchorUsed read failed:", readErr.message);
    return;
  }

  const currentCount = row?.usage_count ?? 0;

  const { error: updErr } = await supabase
    .from("curiosity_anchors")
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: currentCount + 1,
    })
    .eq("id", anchorId);

  if (updErr) {
    console.warn("⚠️ markAnchorUsed update failed:", updErr.message);
  }
}
