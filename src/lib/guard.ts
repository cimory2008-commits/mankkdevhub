import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { db } from "./supabase";
import { ADMIN_COOKIE, verifyAdminCookie } from "./adminCookie";
import { isStaff, type Role } from "./roles";

export type Actor = {
  kind: "discord" | "bypass";
  userId: string | null;
  discordId: string | null;
  roles: Role[];
};

/**
 * Sumber kebenaran otorisasi di sisi server.
 * Middleware hanya gerbang kasar (membaca JWT yang bisa usang);
 * fungsi ini membaca role TERBARU dari database.
 */
export async function getActor(): Promise<Actor | null> {
  let actor: Actor | null = null;
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const { data } = await db().from("user_roles").select("role").eq("user_id", session.user.id);
    actor = {
      kind: "discord",
      userId: session.user.id,
      discordId: session.user.discordId ?? null,
      roles: (data ?? []).map((r) => r.role as Role),
    };
  }
  if (!isStaff(actor?.roles) && (await verifyAdminCookie(cookies().get(ADMIN_COOKIE)?.value))) {
    actor = { kind: "bypass", userId: actor?.userId ?? null, discordId: actor?.discordId ?? null, roles: [...(actor?.roles ?? []), "admin"] };
  }
  return actor;
}

type Check = (actor: Actor) => boolean;

export async function requireActor(check?: Check): Promise<{ actor: Actor; error?: undefined } | { actor?: undefined; error: NextResponse }> {
  const actor = await getActor();
  if (!actor) return { error: NextResponse.json({ error: "Belum login" }, { status: 401 }) };
  if (check && !check(actor)) return { error: NextResponse.json({ error: "Akses ditolak" }, { status: 403 }) };
  return { actor };
}

export const requireStaff = () => requireActor((a) => isStaff(a.roles));
