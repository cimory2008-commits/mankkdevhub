"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/clientUpload";
import type { AssetKind } from "@/lib/roles";

const field = "w-full border border-white/30 bg-black px-3 py-2 outline-none focus:border-gold";

export default function AssetUploadForm({ kind }: { kind: AssetKind }) {
  const router = useRouter();
  const market = kind === "marketplace" || kind === "admin_market";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    setBusy(true); setMsg(null);
    try {
      const preview = f.get("preview") as File, file = f.get("file") as File;
      const body: Record<string, unknown> = { kind, title: f.get("title"), description: f.get("description") };
      if (preview?.size) {
        body.preview_path = await uploadFile(preview, "asset-media");
        body.preview_type = preview.type.startsWith("video") ? "video" : "image";
      }
      if (market) { body.price_amount = f.get("price"); body.price_currency = f.get("currency"); body.contact = f.get("contact"); }
      else if (file?.size) body.file_path = await uploadFile(file, kind === "vip" ? "vip-file" : "asset-file");
      else body.download_url = f.get("link");

      const r = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal menyimpan");
      form.reset(); setMsg("Aset dipublikasikan."); router.refresh();
    } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 border border-gold/25 p-5 md:grid-cols-2">
      <label className="grid gap-1 text-sm">Nama aset<input name="title" required minLength={2} maxLength={120} className={field} /></label>
      <label className="grid gap-1 text-sm">Preview gambar / video<input name="preview" type="file" accept="image/*,video/mp4,video/webm" className={field} /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Deskripsi<textarea name="description" rows={3} className={field} /></label>
      {market ? (
        <>
          <label className="grid gap-1 text-sm">Harga<input name="price" type="number" min={0} step="any" required className={field} /></label>
          <label className="grid gap-1 text-sm">Mata uang
            <select name="currency" className={field}><option value="IDR">Rupiah (IDR)</option><option value="ROBUX">Robux</option></select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">Kontak (nomor / username Discord)<input name="contact" required={kind === "marketplace"} className={field} /></label>
        </>
      ) : (
        <>
          <label className="grid gap-1 text-sm">File (.rbxm / .lua)<input name="file" type="file" accept=".rbxm,.rbxmx,.rbxl,.lua,.luau,.txt,.zip" className={field} /></label>
          <label className="grid gap-1 text-sm">…atau link unduhan<input name="link" type="url" placeholder="https://" className={field} /></label>
        </>
      )}
      <div className="flex items-center gap-4 md:col-span-2">
        <button disabled={busy} className="btn-gold px-5 py-2 font-medium text-black disabled:opacity-50">{busy ? "Mengunggah…" : "Publikasikan"}</button>
        {msg && <p role="status" className="text-sm">{msg}</p>}
      </div>
    </form>
  );
}
