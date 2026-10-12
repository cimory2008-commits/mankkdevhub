import { createClient } from "@supabase/supabase-js";

export type UploadPurpose = "asset-media" | "asset-file" | "vip-file" | "partnership";
const MAX = 50 * 1024 * 1024;

/**
 * Upload langsung dari browser ke Supabase Storage lewat signed URL
 * (menghindari batas body 4,5 MB Vercel Serverless). Mengembalikan path file.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<string> {
  if (file.size > MAX) throw new Error("Ukuran file maksimal 50 MB");
  const r = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, filename: file.name }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Gagal meminta izin upload");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await sb.storage.from(j.bucket).uploadToSignedUrl(j.path, j.token, file);
  if (error) throw new Error(error.message);
  return j.path as string;
}
