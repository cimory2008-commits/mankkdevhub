"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import RoleBadges from "./RoleBadges";
import { isStaff } from "@/lib/roles";

const LINKS: [string, string][] = [
  ["/assets/free", "Free asset"],
  ["/assets/vip", "VIP asset"],
  ["/marketplace", "Marketplace"],
  ["/tools/luau", "Luau tools"],
  ["/tools/ui-converter", "UI ke Luau"],
  ["/partnership", "Partnership"],
  ["/leaderboard", "Donatur"],
  ["/contact", "Kontak"],
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const user = session?.user;
  const logo = (
    <Image src="/brand/logo.png" alt="4MankkDev" width={44} height={36} priority
      style={{ height: 38, width: "auto", filter: "drop-shadow(0 0 10px rgba(212,175,55,.45))" }} />
  );
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      <div className="glass mx-auto flex max-w-6xl items-center gap-4 rounded-2xl px-4 py-2.5">
        {user ? (
          <Link href="/" aria-label="Beranda 4MankkDev Assets" className="shrink-0">{logo}</Link>
        ) : (
          // Logo = tombol "Connect to Discord" saat belum login
          <button onClick={() => signIn("discord")} disabled={status === "loading"} aria-label="Connect to Discord" title="Connect to Discord" className="flex shrink-0 items-center gap-3">
            {logo}
            <span className="btn-gold hidden rounded-full px-4 py-1.5 text-sm font-semibold sm:inline">Connect to Discord</span>
          </button>
        )}

        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm [scrollbar-width:none]" aria-label="Utama">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${active(href) ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(212,175,55,.45)]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
              {label}
            </Link>
          ))}
          {isStaff(user?.roles) && (
            <Link href="/admin" aria-current={active("/admin") ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 font-semibold ${active("/admin") ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(212,175,55,.45)]" : "text-gold hover:bg-gold/10"}`}>
              Admin
            </Link>
          )}
        </nav>

        {user && (
          <details className="relative shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-gold/30 bg-white/5 py-1 pl-1 pr-3 hover:border-gold/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={user.image ?? ""} alt="" className="h-8 w-8 rounded-full bg-white/10 ring-1 ring-gold/60" />
              <span className="hidden max-w-[9rem] truncate text-sm sm:inline">{user.name}</span>
              <RoleBadges roles={user.roles} size={20} />
            </summary>
            <div className="glass-menu absolute right-0 mt-3 w-48 rounded-xl p-1.5 text-sm">
              <Link href={`/profile/${user.discordId}`} className="block rounded-lg px-3 py-2 hover:bg-gold/15 hover:text-gold-light">Profil saya</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-gold/15 hover:text-gold-light">Keluar</button>
            </div>
          </details>
        )}
      </div>
    </header>
  );
}
