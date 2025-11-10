import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function GET(req) {
  const start = Date.now();
  const log = [];

  // 🔒 Sikkerhetssjekk – sørg for at bare Vercel Cron eller du med riktig nøkkel får kjøre
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET_KEY;

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  log.push(`🕒 CRON RUN STARTED: ${new Date().toISOString()}`);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    log.push(`🌐 Fetching from ${baseUrl}/api/generate`);

    const res = await fetch(`${baseUrl}/api/generate`);
    const data = await res.json();

    log.push("✅ /api/generate executed successfully");

    const duration = ((Date.now() - start) / 1000).toFixed(1);

    // 🔹 Logg resultatet i Supabase
    await supabase.from("cron_logs").insert({
      duration_seconds: duration,
      status: "success",
      message: "Generation completed",
      details: data,
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
