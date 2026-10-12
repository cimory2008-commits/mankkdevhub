"use client";
import { useEffect, useState } from "react";
import RoleBadges from "./RoleBadges";

export interface PickedUser { id: string; username: string; avatar: string | null; discord_id: string; roles: string[] }

/** Pencarian user (dari tabel users = pernah login Discord). Dipakai di Role & Leaderboard admin. */
export default function UserPicker({ onPick }: { onPick: (u: PickedUser) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<PickedUser[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (r.ok) setList((await r.json()).users);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari username atau Discord ID" className="w-full border border-white/30 bg-black px-3 py-2 outline-none focus:border-gold" />
      <ul className="max-h-56 overflow-auto border border-gold/20">
        {list.map((u) => (
          <li key={u.id}>
            <button onClick={() => onPick(u)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gold hover:text-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.avatar ?? ""} alt="" className="h-7 w-7 rounded-full" />
              <span className="flex-1 truncate">{u.username}</span>
              <RoleBadges roles={u.roles} size={16} />
            </button>
          </li>
        ))}
        {!list.length && <li className="px-3 py-3 text-sm text-white/50">Tidak ada user. User baru muncul setelah login Discord.</li>}
      </ul>
    </div>
  );
}
