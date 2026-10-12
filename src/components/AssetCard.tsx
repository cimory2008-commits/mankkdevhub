import Link from "next/link";
import UserTag, { type TagUser } from "./UserTag";
import { CONTACT_URL } from "@/lib/roles";

export interface AssetRow {
  id: string; kind: string; title: string; description: string; preview_url: string | null; preview_type: string;
  price_amount: number | null; price_currency: string | null; contact: string | null; seller?: TagUser | null;
}

const price = (a: AssetRow) =>
  a.price_amount == null ? null : a.price_currency === "ROBUX" ? `${Number(a.price_amount).toLocaleString("id-ID")} R$` : `Rp ${Number(a.price_amount).toLocaleString("id-ID")}`;

export default function AssetCard({ asset: a }: { asset: AssetRow }) {
  return (
    <article className="flex flex-col border border-gold/25 bg-white/[0.03] transition-colors hover:border-gold/60">
      <div className="aspect-video bg-white/5">
        {a.preview_url && (a.preview_type === "video"
          ? <video src={a.preview_url} controls preload="metadata" className="h-full w-full object-cover" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={a.preview_url} alt={`Preview ${a.title}`} loading="lazy" className="h-full w-full object-cover" />)}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-lg font-semibold">{a.title}</h3>
        {a.seller !== undefined && <UserTag user={a.seller ?? null} size={24} />}
        <p className="line-clamp-3 text-sm text-white/70">{a.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          {price(a) && <span className="text-lg font-bold">{price(a)}</span>}
          {(a.kind === "free" || a.kind === "vip") && (
            <a href={`/api/assets/${a.id}/download`} className="ml-auto btn-gold px-4 py-2 text-sm font-semibold text-black">Unduh</a>
          )}
          {a.kind === "admin_market" && (
            <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className="ml-auto btn-gold px-4 py-2 text-sm font-semibold text-black">Beli lewat admin</a>
          )}
          {a.kind === "marketplace" && a.contact && <span className="ml-auto text-sm text-white/70">Kontak: {a.contact}</span>}
        </div>
      </div>
    </article>
  );
}
