import { redirect } from "next/navigation";
import { getActor } from "@/lib/guard";
import { isStaff } from "@/lib/roles";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard" };

export default async function AdminPage() {
  const actor = await getActor();                       // cek ulang ke DB (defense in depth)
  if (!actor || !isStaff(actor.roles)) redirect("/admin/login");
  return <AdminDashboard canGrantAdmin={actor.kind === "bypass" || actor.roles.includes("owner")} />;
}
