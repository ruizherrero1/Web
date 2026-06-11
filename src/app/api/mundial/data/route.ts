import { NextResponse } from "next/server";
import { getTournamentData } from "@/lib/mundial-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getTournamentData();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    },
  });
}
