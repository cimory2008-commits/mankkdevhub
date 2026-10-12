import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { ADMIN_COOKIE, makeAdminCookie } from "@/lib/adminCookie";

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Login darurat dengan ADMIN_PANEL_PASSWORD (Environment Variable Vercel). */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_PANEL_PASSWORD;
  if (!expected) return NextResponse.json({ error: "ADMIN_PANEL_PASSWORD belum diatur di environment." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const ok = timingSafeEqual(sha(String(body.password ?? "")), sha(expected));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // perlambat brute force
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await makeAdminCookie(), {
    httpOnly: true, sameSite: "strict", path: "/", maxAge: 4 * 3600, secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
