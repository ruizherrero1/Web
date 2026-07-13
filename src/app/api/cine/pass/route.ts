import { NextResponse } from "next/server";
import { getCineAccessCookie, hasCineAccess, makeCineAccessCookie } from "../_lib";

const oneYear = 60 * 60 * 24 * 365;

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

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getCineAccessCookie(), makeCineAccessCookie(configuredPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/apps/cine",
    maxAge: oneYear,
  });
  response.cookies.set(getCineAccessCookie(), makeCineAccessCookie(configuredPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/cine",
    maxAge: oneYear,
  });

  return response;
}
