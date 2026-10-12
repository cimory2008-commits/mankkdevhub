import Image from "next/image";
import { ROLE_META, ROLE_ORDER, type Role } from "@/lib/roles";

/** Ikon role dinamis di samping nama (leaderboard, profil, postingan aset). */
export default function RoleBadges({ roles = [], size = 26 }: { roles?: string[]; size?: number }) {
  const list = ROLE_ORDER.filter((r) => roles.includes(r));
  if (!list.length) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {list.map((r: Role) => (
        <Image key={r} src={ROLE_META[r].icon} alt={ROLE_META[r].label} title={ROLE_META[r].label} width={size} height={size} style={{ height: size, width: "auto" }} />
      ))}
    </span>
  );
}
