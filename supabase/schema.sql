-- =====================================================================
-- 4MankkDev Assets — Skema Database (Supabase / PostgreSQL)
-- Jalankan seluruh file ini di Supabase > SQL Editor.
-- Semua akses data lewat server Next.js (service role), jadi RLS dihidupkan
-- TANPA policy = anon/public tidak bisa membaca/menulis langsung.
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------- ENUM ----------
do $$ begin create type app_role as enum ('owner','admin','vip','plugin_premium'); exception when duplicate_object then null; end $$;
do $$ begin create type asset_kind as enum ('free','vip','marketplace','admin_market'); exception when duplicate_object then null; end $$;
do $$ begin create type price_currency as enum ('IDR','ROBUX'); exception when duplicate_object then null; end $$;
do $$ begin create type media_kind as enum ('image','video'); exception when duplicate_object then null; end $$;

-- ---------- USERS (diisi otomatis saat login Discord) ----------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  discord_id    text not null unique,
  username      text not null,
  avatar        text,
  email         text,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);
create index if not exists users_username_idx on users (lower(username));

-- ---------- MULTI-ROLE: satu user bisa punya banyak baris ----------
create table if not exists user_roles (
  user_id    uuid not null references users(id) on delete cascade,
  role       app_role not null,
  granted_by uuid references users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------- ASSETS: free, vip, marketplace, admin_market ----------
create table if not exists assets (
  id             uuid primary key default gen_random_uuid(),
  kind           asset_kind not null,
  seller_id      uuid references users(id) on delete set null,
  title          text not null check (char_length(title) between 2 and 120),
  description    text not null default '',
  preview_url    text,
  preview_type   media_kind not null default 'image',
  file_path      text,            -- path di bucket privat "files"
  download_url   text,            -- alternatif: link eksternal
  price_amount   numeric(14,2),
  price_currency price_currency,
  contact        text,            -- no. WA / username Discord (marketplace publik)
  created_at     timestamptz not null default now(),
  constraint assets_has_file_or_link check (
    kind in ('marketplace','admin_market') or file_path is not null or download_url is not null
  ),
  constraint assets_price_for_market check (
    kind in ('free','vip') or (price_amount is not null and price_currency is not null)
  )
);
create index if not exists assets_kind_created_idx on assets (kind, created_at desc);
create index if not exists assets_seller_idx on assets (seller_id);

-- ---------- PARTNERSHIPS (admin only) ----------
create table if not exists partnerships (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 80),
  banner_url   text not null,
  logo_url     text not null,
  discord_link text not null check (discord_link ~ '^https://(discord\.gg|discord\.com/invite)/[A-Za-z0-9_-]+$'),
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------- LEADERBOARD DONATUR (Top 10) ----------
-- PK pada "rank" menjamin satu slot = satu user; UNIQUE user_id menjamin satu user = satu slot.
create table if not exists leaderboard_entries (
  rank       smallint primary key check (rank between 1 and 10),
  user_id    uuid not null unique references users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

-- Set / pindahkan user ke rank tertentu secara atomik (satu transaksi).
create or replace function set_leaderboard_rank(p_user uuid, p_rank int)
returns void language plpgsql as $$
begin
  if p_rank < 1 or p_rank > 10 then raise exception 'rank harus 1..10'; end if;
  delete from leaderboard_entries where user_id = p_user or rank = p_rank;
  insert into leaderboard_entries (rank, user_id) values (p_rank, p_user);
end $$;

-- ---------- RLS: aktif tanpa policy (hanya service role yang bisa akses) ----------
alter table users               enable row level security;
alter table user_roles          enable row level security;
alter table assets              enable row level security;
alter table partnerships        enable row level security;
alter table leaderboard_entries enable row level security;

-- ---------- STORAGE ----------
-- media = publik (preview, banner, logo). files = privat (unduhan; diberi signed URL 60 detik).
insert into storage.buckets (id, name, public, file_size_limit)
values ('media','media', true, 52428800), ('files','files', false, 52428800)
on conflict (id) do nothing;
