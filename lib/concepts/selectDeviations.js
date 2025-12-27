// ============================================================================
// CurioWire — selectDeviations.js
// Selects expectation-breaking deviations with cooldown + rotation.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------------------
// SUPABASE INIT
// ----------------------------------------------------------------------------
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl)
  throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseKey)
  throw new Error("Missing Supabase key for deviation selection");

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
export async function selectDeviations({
  category,
  count = 1,
  cooldownHours = 36,
  poolMultiplier = 5,
} = {}) {
  if (!category) return [];

  const cutoffISO = new Date(
    Date.now() - cooldownHours * 60 * 60 * 1000
  ).toISOString();

  const poolSize = Math.max(count * poolMultiplier, count);

  const { data, error } = await supabase
    .from("curiosity_deviations")
    .select(
      `
      id,
      category,
      deviation,
      deviation_type,
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
    console.error("❌ selectDeviations Supabase error:", error.message);
    return [];
  }

  const rows = data || [];
  if (!rows.length) return [];

  return shuffle(rows).slice(0, count);
}

// ----------------------------------------------------------------------------
// MARK AS USED
// ----------------------------------------------------------------------------
export async function markDeviationUsed(deviationId) {
  if (!deviationId) return;

  const { data: row, error: readErr } = await supabase
    .from("curiosity_deviations")
    .select("usage_count")
    .eq("id", deviationId)
    .single();

  if (readErr) {
    console.warn("⚠️ markDeviationUsed read failed:", readErr.message);
    return;
  }

  const currentCount = row?.usage_count ?? 0;

  const { error: updErr } = await supabase
    .from("curiosity_deviations")
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: currentCount + 1,
    })
    .eq("id", deviationId);

  if (updErr) {
    console.warn("⚠️ markDeviationUsed update failed:", updErr.message);
  }
}
