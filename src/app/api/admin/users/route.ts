import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireStaff } from "@/lib/guard";

export async function GET(req: Request) {
  const { error } = await requireStaff();
  if (error) return error;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().replace(/[%,()]/g, "");
  let query = db().from("users").select("id, username, avatar, discord_id, user_roles(role)").order("last_login_at", { ascending: false }).limit(20);
  if (q) query = query.or(`username.ilike.%${q}%,discord_id.eq.${q}`);
  const { data, error: e } = await query;
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  const users = (data ?? []).map((u) => ({ id: u.id, username: u.username, avatar: u.avatar, discord_id: u.discord_id, roles: (u.user_roles as { role: string }[]).map((r) => r.role) }));
  return NextResponse.json({ users });
}
