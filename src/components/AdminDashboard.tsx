"use client";
import { useCallback, useEffect, useState } from "react";
import UserPicker, { type PickedUser } from "./UserPicker";
import PartnershipForm from "./PartnershipForm";
import RoleBadges from "./RoleBadges";

const ROLES = [["vip", "VIP Supporter"], ["plugin_premium", "Plugin Premium"], ["admin", "Admin"], ["owner", "Owner"]] as const;
type Tab = "roles" | "leaderboard" | "partnership";
interface Entry { rank: number; user: { id: string; username: string; avatar: string | null } }

export default function AdminDashboard({ canGrantAdmin }: { canGrantAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("roles");
  const [picked, setPicked] = useState<PickedUser | null>(null);
  const [rank, setRank] = useState(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [note, setNote] = useState("");

  const load = useCallback(async () => { const r = await fetch("/api/admin/leaderboard"); if (r.ok) setEntries((await r.json()).entries); }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(role: string, grant: boolean) {
    if (!picked) return;
    const r = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: picked.id, role, grant }) });
    const j = await r.json();
    if (!r.ok) return setNote(j.error);
    setNote("");
    setPicked({ ...picked, roles: grant ? [...picked.roles, role] : picked.roles.filter((x) => x !== role) });
  }
  async function saveRank() {
    if (!picked) return;
    const r = await fetch("/api/admin/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: picked.id, rank }) });
    setNote(r.ok ? `${picked.username} ditempatkan di rank ${rank}.` : (await r.json()).error);
    load();
  }
  async function removeRank(n: number) { await fetch(`/api/admin/leaderboard?rank=${n}`, { method: "DELETE" }); load(); }
  async function logoutBypass() { await fetch("/api/admin/login", { method: "DELETE" }); location.href = "/"; }

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => { setTab(t); setNote(""); }} className={`px-4 py-2 font-medium ${tab === t ? "btn-gold" : "border border-white/30 hover:border-white"}`}>{label}</button>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold">Admin dashboard</h1>
        <button onClick={logoutBypass} className="text-sm text-white/60 underline">Hapus sesi password</button>
      </header>
      <div className="flex flex-wrap gap-2">{tabBtn("roles", "Role user")}{tabBtn("leaderboard", "Leaderboard donatur")}{tabBtn("partnership", "Partnership")}</div>
      {note && <p role="status" className="border border-white/30 px-4 py-2 text-sm">{note}</p>}

      {tab === "partnership" ? <PartnershipForm /> : (
        <div className="grid gap-8 md:grid-cols-2">
          <section><h2 className="mb-3 text-xl font-semibold">1. Pilih user</h2><UserPicker onPick={(u) => { setPicked(u); setNote(""); }} /></section>
          <section>
            <h2 className="mb-3 text-xl font-semibold">2. {tab === "roles" ? "Atur role" : "Tentukan rank"}</h2>
            {!picked ? <p className="text-white/60">Belum ada user dipilih.</p> : (
              <div className="space-y-4 border border-gold/25 p-4">
                <p className="flex items-center gap-2 font-medium">{picked.username} <RoleBadges roles={picked.roles} size={22} /></p>
                {tab === "roles" ? ROLES.map(([key, label]) => {
                  const on = picked.roles.includes(key), locked = (key === "admin" || key === "owner") && !canGrantAdmin;
                  return (
                    <label key={key} className={`flex items-center gap-3 ${locked ? "opacity-40" : ""}`}>
                      <input type="checkbox" checked={on} disabled={locked} onChange={(e) => toggle(key, e.target.checked)} className="h-4 w-4 accent-white" />{label}
                    </label>
                  );
                }) : (
                  <div className="flex items-center gap-3">
                    <select value={rank} onChange={(e) => setRank(Number(e.target.value))} className="border border-white/30 bg-black px-3 py-2">{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>Rank {i + 1}</option>)}</select>
                    <button onClick={saveRank} className="btn-gold px-4 py-2 font-medium text-black">Simpan</button>
                  </div>
                )}
              </div>
            )}
          </section>
          {tab === "leaderboard" && (
            <section className="md:col-span-2">
              <h2 className="mb-3 text-xl font-semibold">Susunan saat ini</h2>
              <ol className="divide-y divide-gold/20 border-y border-gold/20">
                {entries.map((e) => (
                  <li key={e.rank} className="flex items-center gap-4 py-2"><span className="w-8 text-right font-bold">{e.rank}</span><span className="flex-1">{e.user.username}</span><button onClick={() => removeRank(e.rank)} className="text-sm underline">Hapus</button></li>
                ))}
                {!entries.length && <li className="py-3 text-white/60">Kosong.</li>}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
