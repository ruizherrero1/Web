import { NextResponse } from "next/server";
import { cineAccessMaxAgeSeconds, getCineAccessCookie, hasCineAccess, makeCineAccessToken } from "../_lib";

export async function GET(request: Request) {
  const ok = hasCineAccess(request);
  const response = NextResponse.json({ ok });

  // Sliding renewal: every visit with a valid cookie re-issues it with a fresh
  // expiry, so regular users are never asked for the shared password again.
  if (ok) {
    const token = makeCineAccessToken();
    for (const path of ["/apps/cine", "/api/cine"]) {
      response.cookies.set(getCineAccessCookie(), token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path,
        maxAge: cineAccessMaxAgeSeconds,
      });
    }
  }

  return response;
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
