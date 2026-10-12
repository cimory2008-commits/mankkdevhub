"use client";
import { useRouter } from "next/navigation";

export default function DeletePartner({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        if (!confirm("Hapus partner ini?")) return;
        await fetch(`/api/partnerships?id=${id}`, { method: "DELETE" });
        router.refresh();
      }}
      className="border border-white/40 px-3 py-2 text-sm hover:bg-gold hover:text-black"
    >Hapus</button>
  );
}
