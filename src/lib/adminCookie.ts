/**
 * Cookie bypass untuk ADMIN_PANEL_PASSWORD.
 * Format: "<exp>.<hmac>" ditandatangani dengan NEXTAUTH_SECRET + ADMIN_PANEL_PASSWORD.
 * Memakai Web Crypto supaya bisa dijalankan di Edge Middleware maupun Node.
 */
export const ADMIN_COOKIE = "admin_bypass";
const enc = new TextEncoder();

async function hmac(message: string): Promise<string> {
  const secret = `${process.env.NEXTAUTH_SECRET ?? ""}|${process.env.ADMIN_PANEL_PASSWORD ?? ""}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function makeAdminCookie(ttlSeconds = 4 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyAdminCookie(value?: string | null) {
  if (!value || !process.env.ADMIN_PANEL_PASSWORD) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(exp));
}
