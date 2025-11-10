import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function GET(req) {
  const start = Date.now();
  const log = [];

  log.push(`🕒 CRON RUN STARTED: ${new Date().toISOString()}`);

  // 🔒 Sikkerhet – tillat enten Bearer-header eller ?key=...
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const queryKey = url.searchParams.get("key");
  const secret = process.env.CRON_SECRET_KEY;

  const isAuthorized = authHeader === `Bearer ${secret}` || queryKey === secret;

  if (!isAuthorized) {
    log.push("❌ Unauthorized access attempt");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // 🌍 Finn riktig base-URL (lokalt eller Vercel)
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    log.push(`🌐 Fetching from ${baseUrl}/api/generate`);

    // 🚀 Kjør artikkelgenerering
    const res = await fetch(`${baseUrl}/api/generate`);
    if (!res.ok) throw new Error(`Fetch failed with ${res.status}`);
    const data = await res.json();

    log.push("✅ /api/generate executed successfully");

    const duration = ((Date.now() - start) / 1000).toFixed(1);

    // 💾 Lagre logg i Supabase
    await supabase.from("cron_logs").insert({
      duration_seconds: duration,
      status: "success",
      message: "Generation completed successfully",
      details: data,
    });

    return NextResponse.json({ ok: true, duration, log, summary: data });
  } catch (err) {
    console.error("❌ CRON ERROR:", err);
    log.push(`❌ ${err.message}`);

    const duration = ((Date.now() - start) / 1000).toFixed(1);

    // 💾 Logg feil til Supabase
    await supabase.from("cron_logs").insert({
      duration_seconds: duration,
      status: "error",
      message: err.message,
      details: { log },
    });

    return NextResponse.json({ ok: false, error: err.message, log });
  }
}
