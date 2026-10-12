import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireStaff } from "@/lib/guard";

export async function GET() {
  const { error } = await requireStaff();
  if (error) return error;
  const { data } = await db().from("leaderboard_entries").select("rank, user:users(id, username, avatar)").order("rank");
  return NextResponse.json({ entries: data ?? [] });
}

/** Pilih user + tentukan rank 1-10 (atomik lewat fungsi SQL set_leaderboard_rank). */
export async function POST(req: Request) {
  const { error } = await requireStaff();
  if (error) return error;
  const { userId, rank } = await req.json().catch(() => ({}));
  if (!userId || !Number.isInteger(rank) || rank < 1 || rank > 10) return NextResponse.json({ error: "Rank harus 1–10" }, { status: 400 });
  const { error: e } = await db().rpc("set_leaderboard_rank", { p_user: userId, p_rank: rank });
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { error } = await requireStaff();
  if (error) return error;
  const rank = Number(new URL(req.url).searchParams.get("rank"));
  const { error: e } = await db().from("leaderboard_entries").delete().eq("rank", rank);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
