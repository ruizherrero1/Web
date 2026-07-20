import { NextResponse } from "next/server";
import { getChampionsStandings } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const champions = await getChampionsStandings();
  return NextResponse.json(champions, {
    headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=3600" },
  });
}
