import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireActor } from "@/lib/guard";
import { isStaff, type AssetKind } from "@/lib/roles";

const KINDS: AssetKind[] = ["free", "vip", "marketplace", "admin_market"];
const STAFF_KINDS: AssetKind[] = ["vip", "admin_market"];   // Admin Only
const isHttp = (u: unknown) => typeof u === "string" && /^https?:\/\/[^\s]+$/i.test(u);

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const kind = b.kind as AssetKind;
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "kind tidak valid" }, { status: 400 });
  if (STAFF_KINDS.includes(kind) && !isStaff(actor.roles)) return NextResponse.json({ error: "Hanya Admin/Owner yang boleh memposting di halaman ini" }, { status: 403 });
  if (!actor.userId && !isStaff(actor.roles)) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const title = String(b.title ?? "").trim();
  if (title.length < 2 || title.length > 120) return NextResponse.json({ error: "Judul 2–120 karakter" }, { status: 400 });
  if (b.preview_path && (!String(b.preview_path).startsWith("asset-media/") || String(b.preview_path).includes(".."))) return NextResponse.json({ error: "Preview tidak valid" }, { status: 400 });

  const row: Record<string, unknown> = { kind, seller_id: actor.userId, title, description: String(b.description ?? "").slice(0, 4000), preview_type: b.preview_type === "video" ? "video" : "image" };
  if (b.preview_path) row.preview_url = db().storage.from("media").getPublicUrl(b.preview_path).data.publicUrl;

  if (kind === "free" || kind === "vip") {
    const expect = kind === "vip" ? "vip-file/" : "asset-file/";
    if (b.file_path) {
      if (!String(b.file_path).startsWith(expect) || String(b.file_path).includes("..")) return NextResponse.json({ error: "File tidak valid" }, { status: 400 });
      row.file_path = b.file_path;
    } else if (isHttp(b.download_url)) row.download_url = b.download_url;
    else return NextResponse.json({ error: "Unggah file atau isi link unduhan" }, { status: 400 });
  } else {
    const amount = Number(b.price_amount);
    if (!(amount >= 0) || !["IDR", "ROBUX"].includes(b.price_currency)) return NextResponse.json({ error: "Harga/mata uang tidak valid" }, { status: 400 });
    row.price_amount = amount; row.price_currency = b.price_currency; row.contact = String(b.contact ?? "").slice(0, 200);
  }
  const { error: e } = await db().from("assets").insert(row);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
