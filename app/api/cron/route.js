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

  // ✅ Send umiddelbar respons til cron-tjenesten
  const accepted = NextResponse.json(
    {
      ok: true,
      status: "accepted",
      message: "Generation started in background",
      timestamp: new Date().toISOString(),
    },
    { status: 202 }
  );

  // 🧠 Kjør resten i bakgrunnen uten å blokkere respons
  (async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000");

      log.push(`🌐 Background fetch to ${baseUrl}/api/generate`);

      const res = await fetch(`${baseUrl}/api/generate`);
      if (!res.ok) throw new Error(`Fetch failed with ${res.status}`);

      const data = await res.json();

      log.push("✅ Background generation completed");

      const duration = ((Date.now() - start) / 1000).toFixed(1);

      await supabase.from("cron_logs").insert({
        duration_seconds: duration,
        status: "success",
        message: "Background generation completed successfully",
        details: data,
      });
    } catch (err) {
      console.error("❌ CRON BACKGROUND ERROR:", err);
      log.push(`❌ ${err.message}`);

      const duration = ((Date.now() - start) / 1000).toFixed(1);

      await supabase.from("cron_logs").insert({
        duration_seconds: duration,
        status: "error",
        message: err.message,
        details: { log },
      });
    }
  })();

  // 🚀 Returner svaret direkte (ikke vent)
  return accepted;
}
