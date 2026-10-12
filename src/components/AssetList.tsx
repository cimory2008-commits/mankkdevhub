import { db } from "@/lib/supabase";
import AssetCard, { type AssetRow } from "./AssetCard";
import type { AssetKind } from "@/lib/roles";

export default async function AssetList({ kind }: { kind: AssetKind }) {
  const { data } = await db()
    .from("assets")
    .select("*, seller:users(username, avatar, discord_id, user_roles(role))")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as unknown as AssetRow[];
  if (!rows.length) return <p className="border border-dashed border-white/25 p-10 text-center text-white/60">Belum ada aset di sini.</p>;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map((a) => <AssetCard key={a.id} asset={a} />)}</div>;
}
