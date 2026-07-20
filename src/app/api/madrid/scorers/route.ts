import { NextResponse } from "next/server";
import { getMadridScorers } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const scorers = await getMadridScorers();
  return NextResponse.json(
    { scorers },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
