import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function GET(req) {
  const start = Date.now();
  const log = [];

  log.push(`🕒 CRON RUN STARTED: ${new Date().toISOString()}`);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    log.push(`🌐 Fetching from ${baseUrl}/api/generate`);

    const res = await fetch(`${baseUrl}/api/generate`);
    const data = await res.json();

    log.push("✅ /api/generate executed successfully");

    const duration = ((Date.now() - start) / 1000).toFixed(1);

    // 🔹 Lagre resultatet i Supabase for innsikt
    await supabase.from("cron_logs").insert({
      duration_seconds: duration,
      status: "success",
      message: "Generation completed",
      details: data, // lagres som JSON
    });

    return NextResponse.json({
      ok: true,
      duration,
      log,
      summary: data,
    });
  } catch (err) {
    console.error("❌ CRON ERROR:", err);
    log.push(`❌ ${err.message}`);

    // 🔹 Logg feil også
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    await supabase.from("cron_logs").insert({
      duration_seconds: duration,
      status: "error",
      message: err.message,
      details: { log },
    });

    return NextResponse.json({ ok: false, error: err.message, log });
  }
}
