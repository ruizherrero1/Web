import { NextResponse } from "next/server";
import { getMatchLive } from "@/lib/madrid-data";
import type { CompId } from "@/app/apps/madrid/types";

export const dynamic = "force-dynamic";

const COMPS: CompId[] = ["laliga", "champions", "copa", "supercopa", "mundialito"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const compParam = new URL(request.url).searchParams.get("comp");
  const comp = COMPS.includes(compParam as CompId) ? (compParam as CompId) : "laliga";
  const live = await getMatchLive(id, comp);
  if (!live) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(
    { live },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
