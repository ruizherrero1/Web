import { NextResponse } from "next/server";
import { getMadridData } from "@/lib/madrid-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getMadridData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
