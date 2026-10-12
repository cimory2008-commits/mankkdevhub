import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getActor } from "@/lib/guard";
import { canAccessVip } from "@/lib/roles";

/** Unduhan dijaga di server: VIP asset hanya untuk VIP Supporter & Owner. File privat diberi signed URL 60 detik. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { data: a } = await db().from("assets").select("kind, file_path, download_url").eq("id", params.id).single();
  if (!a || !["free", "vip"].includes(a.kind)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  if (a.kind === "vip") {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "Login dulu" }, { status: 401 });
    if (!canAccessVip(actor.roles)) return NextResponse.json({ error: "Khusus VIP Supporter & Owner" }, { status: 403 });
  }
  if (a.download_url) return NextResponse.redirect(a.download_url);
  const { data, error } = await db().storage.from("files").createSignedUrl(a.file_path!, 60, { download: true });
  if (error || !data) return NextResponse.json({ error: "File tidak tersedia" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
