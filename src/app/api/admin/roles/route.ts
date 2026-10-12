import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireStaff } from "@/lib/guard";

const ALL = ["owner", "admin", "vip", "plugin_premium"];
const PRIVILEGED = ["owner", "admin"];

/** Beri / cabut role. Satu user boleh punya banyak role. */
export async function POST(req: Request) {
  const { actor, error } = await requireStaff();
  if (error) return error;
  const { userId, role, grant } = await req.json().catch(() => ({}));
  if (!userId || !ALL.includes(role) || typeof grant !== "boolean") return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });

  // Hanya Owner (atau bypass password darurat) yang boleh mengubah role admin/owner.
  const mayElevate = actor.kind === "bypass" || actor.roles.includes("owner");
  if (PRIVILEGED.includes(role) && !mayElevate) return NextResponse.json({ error: "Hanya Owner yang boleh mengubah role Admin/Owner" }, { status: 403 });

  const s = db();
  const { error: e } = grant
    ? await s.from("user_roles").upsert({ user_id: userId, role, granted_by: actor.userId }, { onConflict: "user_id,role" })
    : await s.from("user_roles").delete().eq("user_id", userId).eq("role", role);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
