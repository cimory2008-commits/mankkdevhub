"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/clientUpload";

const field = "w-full border border-white/30 bg-black px-3 py-2 outline-none focus:border-gold";

/** Form khusus Admin/Owner: Banner, Logo Partner, Nama Partner, Link DC. */
export default function PartnershipForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [banner, setBanner] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!banner || !logo) return setMsg({ ok: false, text: "Banner dan logo wajib diunggah." });
    setBusy(true); setMsg(null);
    try {
      const [banner_path, logo_path] = await Promise.all([uploadFile(banner, "partnership"), uploadFile(logo, "partnership")]);
      const r = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, discord_link: link, banner_path, logo_path }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal menyimpan");
      setMsg({ ok: true, text: "Partner ditambahkan." });
      setName(""); setLink(""); setBanner(null); setLogo(null); (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 border border-gold/25 p-5 md:grid-cols-2">
      <label className="grid gap-1 text-sm">Nama partner
        <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="grid gap-1 text-sm">Link Discord server
        <input required type="url" placeholder="https://discord.gg/xxxx" value={link} onChange={(e) => setLink(e.target.value)} className={field} />
      </label>
      <label className="grid gap-1 text-sm">Banner (rasio lebar, mis. 1200×400)
        <input required type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setBanner(e.target.files?.[0] ?? null)} className={field} />
      </label>
      <label className="grid gap-1 text-sm">Logo partner
        <input required type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className={field} />
      </label>
      <div className="flex items-center gap-4 md:col-span-2">
        <button disabled={busy} className="btn-gold px-5 py-2 font-medium text-black disabled:opacity-50">{busy ? "Mengunggah…" : "Tambah partner"}</button>
        {msg && <p role="status" className={msg.ok ? "text-white" : "text-white/70 underline"}>{msg.text}</p>}
      </div>
    </form>
  );
}
