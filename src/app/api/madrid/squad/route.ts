import { NextResponse } from "next/server";
import { getSquad } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const squad = await getSquad();
  return NextResponse.json(
    { squad },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
