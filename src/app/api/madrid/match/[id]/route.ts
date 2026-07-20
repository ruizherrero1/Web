import { NextResponse } from "next/server";
import { getMatchDetail } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const detail = await getMatchDetail(numericId);
  if (!detail) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(
    { detail },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
