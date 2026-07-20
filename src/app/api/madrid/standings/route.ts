import { NextResponse } from "next/server";
import { getLaligaStandings } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const standings = await getLaligaStandings();
  return NextResponse.json(
    { standings },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" } },
  );
}
