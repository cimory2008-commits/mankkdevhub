import Link from "next/link";
export default function MarketTabs({ active }: { active: "public" | "admin" }) {
  const cls = (on: boolean) => `px-4 py-2 font-medium ${on ? "btn-gold" : "border border-white/30 hover:border-white"}`;
  return (
    <div className="flex gap-2">
      <Link href="/marketplace" className={cls(active === "public")}>Marketplace member</Link>
      <Link href="/marketplace/admin" className={cls(active === "admin")}>Toko admin</Link>
    </div>
  );
}
