import { NextResponse } from "next/server";
import { appendQuery, getTmdbAuth, requireCineProfile } from "../_lib";

// Trending this week from TMDB, returned as `${kind}-${tmdbId}` keys so the
// frontend can cross-reference them with the imported catalog. Shared data,
// cached for 6h.
type TmdbTrendingItem = { id: number; media_type?: string };

export async function GET(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  try {
    const tmdb = getTmdbAuth();
    const url = appendQuery("https://api.themoviedb.org/3/trending/all/week?language=es-ES", tmdb.query);
    const response = await fetch(url, { headers: tmdb.headers, next: { revalidate: 60 * 60 * 6 } });
    if (!response.ok) throw new Error(`TMDB trending failed: ${response.status}`);
    const payload = (await response.json()) as { results?: TmdbTrendingItem[] };

    const keys = (payload.results ?? [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => `${item.media_type === "tv" ? "series" : "movie"}-${item.id}`);

    return NextResponse.json({ keys });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load trending." },
      { status: 500 }
    );
  }
}
