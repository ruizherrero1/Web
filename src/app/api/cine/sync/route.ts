import { NextResponse } from "next/server";
import { requireCineProfile } from "../_lib";
import { runCatalogSync } from "../_sync";

export const dynamic = "force-dynamic";
// TMDB import + OMDb enrichment can take a while; give the function room on Vercel.
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  try {
    const result = await runCatalogSync(auth.supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync Cine catalog." },
      { status: 500 }
    );
  }
}
