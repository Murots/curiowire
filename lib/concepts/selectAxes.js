// ============================================================================
// CurioWire — selectAxes.js
// Picks curiosity axes from Supabase with cooldown + rotation.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

// IMPORTANT: This helper is used server-side (scripts/generate.js).
// Use service role key if available; fall back to anon only if necessary.
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl)
  throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseKey) throw new Error("Missing Supabase key for axis selection");

const supabase = createClient(supabaseUrl, supabaseKey);

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function selectAxes({
  category,
  count = 5,
  cooldownHours = 24,
  poolMultiplier = 4,
} = {}) {
  if (!category) return [];

  const cutoffISO = new Date(
    Date.now() - cooldownHours * 60 * 60 * 1000
  ).toISOString();

  // We fetch a pool to allow randomness but still bias toward low usage.
  const poolSize = Math.max(count * poolMultiplier, count);

  const { data, error } = await supabase
    .from("curiosity_axes")
    .select(
      "id, category, axis, must_include, prefer, avoid, evidence_types, time_scope, last_used_at, usage_count"
    )
    .eq("category", category)
    .or(`last_used_at.is.null,last_used_at.lt.${cutoffISO}`)
    .order("usage_count", { ascending: true })
    .limit(poolSize);

  if (error) {
    console.error("❌ selectAxes Supabase error:", error.message);
    return [];
  }

  const rows = data || [];
  if (!rows.length) return [];

  return shuffle(rows).slice(0, count);
}

export async function markAxisUsed(axisId) {
  if (!axisId) return;

  // Increment usage_count and set last_used_at
  const { data: row, error: readErr } = await supabase
    .from("curiosity_axes")
    .select("usage_count")
    .eq("id", axisId)
    .single();

  if (readErr) {
    console.warn("⚠️ markAxisUsed read failed:", readErr.message);
    return;
  }

  const currentCount = row?.usage_count ?? 0;

  const { error: updErr } = await supabase
    .from("curiosity_axes")
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: currentCount + 1,
    })
    .eq("id", axisId);

  if (updErr) {
    console.warn("⚠️ markAxisUsed update failed:", updErr.message);
  }
}
