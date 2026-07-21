import { NextResponse } from "next/server";
import { getLeagueScorers, getMadridScorers } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const comp = new URL(request.url).searchParams.get("comp");
  const scorers =
    comp === "laliga" || comp === "champions"
      ? await getLeagueScorers(comp)
      : await getMadridScorers();
  return NextResponse.json(
    { scorers },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
