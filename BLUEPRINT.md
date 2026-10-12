# 4MankkDev Assets — Blueprint & Panduan Pengerjaan

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind**, **NextAuth (Discord OAuth2)**, **Supabase (Postgres + Storage)**, deploy di **Vercel**.

## 1. Arsitektur singkat

```
Browser ──► Next.js di Vercel ──► Supabase
 (UI)        ├─ Edge Middleware  (gerbang kasar /admin, /api/admin, tulis /api/partnerships)
             ├─ Server Components (baca DB langsung dengan service role)
             └─ Route Handlers    (otorisasi AKURAT: baca role terbaru dari DB)
Upload file: Browser ──signed URL──► Supabase Storage (langsung, tidak lewat Vercel)
```

Prinsip keamanan:
- Browser **tidak pernah** menyentuh tabel database. RLS aktif tanpa policy; semua akses lewat server (service role key hanya di server).
- Otorisasi dua lapis: **Middleware** (cepat, membaca JWT yang bisa usang ≤ 5 menit) lalu **`getActor()`/`requireStaff()`** di tiap handler (membaca role terbaru dari DB).
- Upload memakai signed URL agar lolos batas body 4,5 MB Vercel; izin upload ditentukan oleh `purpose`.

## 2. Alur logika penting

**Login Discord** → NextAuth `signIn` meng-upsert `users` (discord_id, username, avatar, email) → `jwt` memuat role dari `user_roles` ke token (disegarkan tiap 5 menit) → `session` mengekspos `roles`. Logo di Navbar memanggil `signIn("discord")` bila belum login.
`OWNER_DISCORD_ID` otomatis diberi role owner saat login pertama (bootstrap).

**Akses admin tanpa password**: user dengan role `admin`/`owner` lolos Middleware lewat JWT dan lolos `getActor()` lewat DB. Tidak ada form password.
**Bypass darurat**: `/admin/login` → `POST /api/admin/login` membandingkan dengan `ADMIN_PANEL_PASSWORD` (timing-safe) → cookie httpOnly bertanda tangan HMAC, berlaku 4 jam. Cookie ini diperlakukan sebagai admin penuh (termasuk mengatur role admin/owner, supaya bisa memulihkan sistem).

**Matriks akses**

| Fitur | Publik | Member login | VIP | Admin | Owner |
|---|---|---|---|---|---|
| Lihat Free asset, Partnership, Leaderboard | ✔ | ✔ | ✔ | ✔ | ✔ |
| Unggah Free asset / jual di Marketplace | | ✔ | ✔ | ✔ | ✔ |
| Lihat & unduh VIP asset | | | ✔ | | ✔ |
| Unggah VIP asset, Toko admin, Partnership | | | | ✔ | ✔ |
| Admin dashboard (role, leaderboard) | | | | ✔ | ✔ |
| Ubah role Admin/Owner | | | | | ✔ |

> Sesuai spesifikasi, VIP asset hanya untuk **VIP & Owner**. Agar Admin juga bisa, ubah `canAccessVip` di `src/lib/roles.ts`.

**Leaderboard**: admin mencari user (dari tabel `users`) → pilih rank 1–10 → fungsi SQL `set_leaderboard_rank` memindahkan/menimpa secara atomik (satu user = satu rank, satu rank = satu user).

**Download VIP**: `GET /api/assets/[id]/download` mengecek role di server, lalu redirect ke signed URL 60 detik (file ada di bucket privat `files`).

## 3. Struktur folder

```
src/
  middleware.ts                      # gerbang Admin & upload Partnership
  lib/  auth.ts guard.ts adminCookie.ts roles.ts supabase.ts clientUpload.ts luau.ts uiToLuau.ts
  components/ Navbar RoleBadges UserTag UserPicker PartnershipForm AdminDashboard
              AssetCard AssetList AssetUploadForm LuauTool UiConverter CopyButton ...
  app/
    page.tsx  layout.tsx  globals.css
    partnership/  leaderboard/  vip-preview/  contact/
    profile/[discordId]/   assets/free/  assets/vip/
    marketplace/  marketplace/admin/
    tools/luau/  tools/ui-converter/
    admin/ (dashboard)  admin/login/
    api/ auth/[...nextauth]  admin/{login,users,roles,leaderboard}
         partnerships  upload/sign  assets  assets/[id]/download
public/brand/ logo.png role-owner.png role-admin.png role-vip-supporter.png role-plugin-premium.png
supabase/schema.sql
```

Pemetaan gambar → file: Gambar 1 `logo.png` (tombol login), Gambar 2 `role-vip-supporter.png`, Gambar 3 `role-plugin-premium.png`, Gambar 4 `role-admin.png`, Gambar 5 `role-owner.png`. Semua sudah dipangkas, diperkecil, dan transparan.

## 4. Langkah pengerjaan (step-by-step)

1. **Install & jalankan lokal**
   ```bash
   unzip 4mankkdev-assets.zip && cd 4mankkdev-assets
   npm install
   cp .env.example .env.local
   ```
2. **Supabase**: buat project → *SQL Editor* → tempel isi `supabase/schema.sql` → Run (membuat tabel, fungsi, RLS, dan bucket `media` publik + `files` privat). Salin `Project URL`, `anon key`, dan `service_role key` ke `.env.local`.
3. **Discord OAuth2**: <https://discord.com/developers/applications> → New Application → OAuth2 → tambahkan Redirect `http://localhost:3000/api/auth/callback/discord` (dan versi domain Vercel nanti). Salin Client ID & Secret.
4. **Isi `.env.local`**: `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `ADMIN_PANEL_PASSWORD` (panjang & acak), `OWNER_DISCORD_ID` (Discord ID kamu; aktifkan Developer Mode lalu *Copy User ID*).
5. `npm run dev` → buka <http://localhost:3000> → klik logo untuk login. Kamu otomatis menjadi Owner → buka `/admin`.
6. **Deploy Vercel**: push ke GitHub → *Import Project* di Vercel → isi **semua** variabel dari `.env.example` (ubah `NEXTAUTH_URL` ke domain produksi) → Deploy. Tambahkan Redirect `https://DOMAIN/api/auth/callback/discord` di Discord.
7. **Uji**: login dari akun kedua, beri role VIP lewat `/admin`, cek `/assets/vip`; coba tambah partner; atur leaderboard.

## 5. Yang sudah diuji dan yang belum

- ✔ Tokenizer/beautifier/minifier Luau diuji dengan skrip (`npm run test:luau`): string, long-string, komentar, if-expression Luau, anotasi tipe, idempotensi beautify.
- ✔ Generator UI→Luau diuji untuk Offset/Scale, nesting parent, escape string.
- ✘ **Belum dikompilasi/di-build** — lingkungan pembuatan tidak punya akses npm. Jalankan `npm install && npm run typecheck && npm run build` dulu; kalau ada galat tipe kecil, kirim ke saya.
- ✘ Alur Discord/Supabase butuh kredensial kamu, jadi belum bisa diuji end-to-end di sini.

## 6. Catatan & batasan

- Role di JWT bisa terlambat ≤ 5 menit di Middleware; tapi halaman & API admin selalu cek DB, jadi pencabutan role langsung berlaku di aksi sensitif.
- Rate limit login password admin belum ada (serverless tidak punya memori bersama). Untuk produksi, tambahkan Upstash Ratelimit atau Vercel WAF.
- Beautifier Luau berbasis tokenizer, bukan parser penuh: pada kode tak lazim (mis. if-expression bersarang di dalam fungsi) indentasi bisa kurang sempurna, tetapi kode tetap valid. Minifier tidak mengganti nama variabel.
- Pembeli Marketplace publik bertransaksi langsung dengan penjual (tidak ada pembayaran di dalam situs).
- Banner badge berbentuk lebar (~2,5:1), jadi `RoleBadges` mengatur ukuran dari tinggi (`size`), bukan kotak.
- Tema: hitam & putih dengan aksen emas (#D4AF37, token `gold` di tailwind.config.ts). Navbar memakai kelas `.glass` (backdrop-blur) di globals.css; tombol utama memakai `.btn-gold`.
