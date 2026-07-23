import { NextResponse } from "next/server";
import { getLeagueCalendar } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const league = new URL(request.url).searchParams.get("league");
  const target = league === "esp.2" ? "esp.2" : "esp.1";
  const data = await getLeagueCalendar(target);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" },
  });
}
