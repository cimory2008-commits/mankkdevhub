export type Role = "owner" | "admin" | "vip" | "plugin_premium";
export type AssetKind = "free" | "vip" | "marketplace" | "admin_market";

/** Urutan tampil badge di samping nama. */
export const ROLE_ORDER: Role[] = ["owner", "admin", "vip", "plugin_premium"];

/** Gambar 5 = owner, Gambar 4 = admin, Gambar 2 = VIP, Gambar 3 = plugin premium. */
export const ROLE_META: Record<Role, { label: string; icon: string }> = {
  owner: { label: "Owner", icon: "/brand/role-owner.png" },
  admin: { label: "Admin", icon: "/brand/role-admin.png" },
  vip: { label: "VIP Supporter", icon: "/brand/role-vip-supporter.png" },
  plugin_premium: { label: "Plugin Premium", icon: "/brand/role-plugin-premium.png" },
};

export const isStaff = (roles: string[] = []) => roles.includes("owner") || roles.includes("admin");
/** Sesuai spesifikasi: VIP asset hanya untuk VIP Supporter & Owner. */
export const canAccessVip = (roles: string[] = []) => roles.includes("owner") || roles.includes("vip");

export const CONTACT_URL = "https://discord.com/users/1419111255926640731";
