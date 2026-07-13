import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../_lib";
import { runCatalogSync, runRatingsSync } from "../../_sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled by Vercel Cron (see vercel.json). Vercel adds `Authorization: Bearer <CRON_SECRET>`
// automatically when CRON_SECRET is set, so we require it here to keep the endpoint private.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServiceClient();
    const mode = new URL(request.url).searchParams.get("mode");
    // mode=ratings -> fast, frequent OMDb-only pass; default -> full TMDB import + enrichment.
    const result = mode === "ratings" ? await runRatingsSync(supabase) : await runCatalogSync(supabase);
    return NextResponse.json({ ok: true, mode: mode ?? "full", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not run Cine cron sync." },
      { status: 500 }
    );
  }
}
