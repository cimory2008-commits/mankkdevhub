import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/adminCookie";

/**
 * GERBANG KASAR (edge). Melindungi:
 *  - /admin/**                -> Admin Panel
 *  - /api/admin/**            -> API Admin
 *  - /api/partnerships (POST/DELETE) -> upload Partnership (GET tetap publik)
 *
 * Lolos jika salah satu:
 *   1. JWT Discord memuat role admin/owner (tanpa password), atau
 *   2. Cookie bypass dari ADMIN_PANEL_PASSWORD valid.
 * Role di JWT bisa usang <= 5 menit, jadi setiap route handler & halaman admin
 * tetap memverifikasi ulang ke database lewat getActor()/requireStaff().
 */
const OPEN = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (OPEN.has(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/partnerships") && req.method === "GET") return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const roles = (token?.roles as string[] | undefined) ?? [];
  const staff = roles.includes("admin") || roles.includes("owner");
  const bypass = await verifyAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value);
  if (staff || bypass) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: token ? "Akses ditolak" : "Belum login" }, { status: token ? 403 : 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/partnerships/:path*"],
};
