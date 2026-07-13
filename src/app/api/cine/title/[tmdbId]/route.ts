import { NextResponse } from "next/server";
import type { MediaKind } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../../_lib";
import { loadTmdbTitleDetail } from "../../_tmdb_detail";

export async function GET(request: Request, context: { params: Promise<{ tmdbId: string }> }) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const { tmdbId: rawId } = await context.params;
  const tmdbId = Number(rawId);
  const type = new URL(request.url).searchParams.get("type");
  const kind: MediaKind = type === "series" ? "series" : "movie";

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Invalid title id" }, { status: 400 });
  }

  try {
    const detail = await loadTmdbTitleDetail(tmdbId, kind);
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load title detail." },
      { status: 500 }
    );
  }
}
