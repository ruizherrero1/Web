import { NextResponse } from "next/server";
import { getTopScorers } from "@/lib/mundial-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const scorers = await getTopScorers();

  return NextResponse.json(
    { scorers },
    {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      },
    },
  );
}
