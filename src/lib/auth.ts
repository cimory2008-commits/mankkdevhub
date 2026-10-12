import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { db } from "./supabase";

type DiscordProfile = { id: string; username: string; global_name?: string | null; avatar?: string | null; email?: string | null };

function avatarUrl(p: DiscordProfile) {
  if (p.avatar) return `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.${p.avatar.startsWith("a_") ? "gif" : "png"}?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(p.id) >> BigInt(22)) % BigInt(6))}.png`;
}

const ROLE_REFRESH_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  callbacks: {
    // 1) Simpan / perbarui user di database setiap login Discord.
    async signIn({ account, profile }) {
      if (account?.provider !== "discord" || !profile) return false;
      const p = profile as unknown as DiscordProfile;
      const supabase = db();
      const { data: user, error } = await supabase
        .from("users")
        .upsert(
          { discord_id: p.id, username: p.global_name || p.username, avatar: avatarUrl(p), email: p.email ?? null, last_login_at: new Date().toISOString() },
          { onConflict: "discord_id" }
        )
        .select("id")
        .single();
      if (error || !user) return false;

      // Bootstrap Owner pertama lewat env.
      if (process.env.OWNER_DISCORD_ID && p.id === process.env.OWNER_DISCORD_ID) {
        await supabase.from("user_roles").upsert({ user_id: user.id, role: "owner" }, { onConflict: "user_id,role" });
      }
      return true;
    },

    // 2) Muat role dari DB ke JWT (disegarkan tiap 5 menit).
    async jwt({ token, profile, trigger }) {
      if (profile) token.discordId = (profile as unknown as DiscordProfile).id;
      const stale = !token.rolesAt || Date.now() - token.rolesAt > ROLE_REFRESH_MS || trigger === "update";
      if (token.discordId && stale) {
        const { data } = await db()
          .from("users")
          .select("id, username, avatar, user_roles(role)")
          .eq("discord_id", token.discordId)
          .single();
        if (data) {
          token.uid = data.id;
          token.name = data.username;
          token.picture = data.avatar;
          token.roles = (data.user_roles as { role: string }[]).map((r) => r.role);
        }
        token.rolesAt = Date.now();
      }
      return token;
    },

    async session({ session, token }) {
      session.user = { ...session.user, id: token.uid, discordId: token.discordId, roles: token.roles ?? [] };
      return session;
    },
  },
};
