"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function Form() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/admin";
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) router.replace(next); else setErr((await r.json()).error ?? "Gagal masuk");
  }
  return (
    <div className="mx-auto max-w-md space-y-8 py-10">
      <h1 className="text-4xl font-extrabold">Admin panel</h1>
      <div className="space-y-3">
        <p className="text-white/70">Admin dan Owner masuk otomatis lewat Discord, tanpa password.</p>
        <button onClick={() => signIn("discord", { callbackUrl: next })} className="w-full btn-gold px-5 py-3 font-semibold text-black">Masuk dengan Discord</button>
      </div>
      <form onSubmit={submit} className="space-y-3 border-t border-gold/25 pt-6">
        <label className="grid gap-1 text-sm">Password cadangan
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className="border border-white/30 bg-black px-3 py-2 outline-none focus:border-gold" />
        </label>
        <button className="w-full border border-white px-5 py-2 hover:bg-gold hover:text-black">Masuk dengan password</button>
        {err && <p role="alert" className="text-sm underline">{err}</p>}
      </form>
    </div>
  );
}
export default function AdminLogin() { return <Suspense><Form /></Suspense>; }
