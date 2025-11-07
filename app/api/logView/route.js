// import { NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// export async function POST(req) {
//   try {
//     const { articleId } = await req.json();
//     if (!articleId) {
//       return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
//     }

//     const supabase = createClient(
//       process.env.SUPABASE_URL,
//       process.env.SUPABASE_SERVICE_ROLE_KEY
//     );

//     const parsedId = Number(articleId);
//     if (isNaN(parsedId)) {
//       return NextResponse.json({ error: "Invalid articleId" }, { status: 400 });
//     }

//     // 🔹 1) Logg visningen
//     const { error: insertError } = await supabase
//       .from("article_views")
//       .insert([{ article_id: parsedId }]);

//     if (insertError) {
//       console.error("❌ Supabase insert error:", insertError.message);
//       return NextResponse.json(
//         { error: insertError.message || "Insert failed" },
//         { status: 500 }
//       );
//     }

//     // 🔹 2) Oppdater totalvisninger
//     const { error: updateError } = await supabase.rpc(
//       "increment_article_views",
//       {
//         article_id: parsedId,
//       }
//     );

//     if (updateError) {
//       console.warn(
//         "⚠️ Could not increment views via RPC:",
//         updateError.message
//       );
//     }

//     return NextResponse.json({ success: true });
//   } catch (err) {
//     console.error("❌ /api/logView fatal error:", err.message);
//     return NextResponse.json(
//       { error: err.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Env debug",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    },
  });
}
