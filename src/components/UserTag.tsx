import Link from "next/link";
import RoleBadges from "./RoleBadges";

export interface TagUser { username: string; avatar?: string | null; discord_id?: string; user_roles?: { role: string }[] }

export default function UserTag({ user, size = 32 }: { user: TagUser | null; size?: number }) {
  if (!user) return <span className="text-white/60">Admin</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.avatar ?? ""} alt="" width={size} height={size} className="rounded-full bg-white/10" style={{ width: size, height: size }} />
      <Link href={`/profile/${user.discord_id}`} className="truncate font-medium hover:underline">{user.username}</Link>
      <RoleBadges roles={user.user_roles?.map((r) => r.role)} size={Math.round(size * 0.8)} />
    </span>
  );
}
