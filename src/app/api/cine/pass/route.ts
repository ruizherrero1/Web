import { NextResponse } from "next/server";
import { cineAccessMaxAgeSeconds, getCineAccessCookie, hasCineAccess, makeCineAccessToken } from "../_lib";

export async function GET(request: Request) {
  return NextResponse.json({ ok: hasCineAccess(request) });
}

export async function POST(request: Request) {
  const configuredPassword = process.env.CINE_SHARED_PASSWORD;
  if (!configuredPassword) {
    return NextResponse.json({ error: "Cine password is not configured." }, { status: 500 });
  }

  const payload = (await request.json()) as { password?: string };
  if (payload.password !== configuredPassword) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const token = makeCineAccessToken();
  const response = NextResponse.json({ ok: true });
  for (const path of ["/apps/cine", "/api/cine"]) {
    response.cookies.set(getCineAccessCookie(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path,
      maxAge: cineAccessMaxAgeSeconds,
    });
  }

  return response;
}
