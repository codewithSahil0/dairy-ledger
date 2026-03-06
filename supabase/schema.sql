-- ─────────────────────────────────────────────────────────────────────────────
-- DairyLedger — Supabase Schema
-- Run this entire file once in:
--   Supabase dashboard → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Users table ──────────────────────────────────────────────────────────────
create table if not exists dl_users (
  id          text primary key,
  name        text        not null,
  code        text        not null unique,
  role        text        not null default 'uploader'
                check (role in ('uploader', 'reviewer', 'admin')),
  created_at  timestamptz not null default now()
);

comment on table  dl_users        is 'DairyLedger registered accounts';
comment on column dl_users.code   is 'Unique login code chosen by the user (stored uppercase)';
comment on column dl_users.role   is 'uploader | reviewer | admin';


-- ── Receipts table ────────────────────────────────────────────────────────────
create table if not exists dl_receipts (
  -- identity
  id                    text        primary key,
  slip_number           text,

  -- farmer
  farmer_name           text,
  farmer_id             text,
  name                  text,        -- alias used by correction screen
  village               text,
  code                  text,        -- farmer code on slip

  -- collection data
  date                  text,
  time                  text,
  shift                 text check (shift in ('M', 'E', null)),
  quantity_liters       numeric,
  fat_percent           numeric,
  snf_percent           numeric,
  clr                   numeric,
  added_water_percent   numeric      default 0,

  -- financials
  rate_inr              numeric,
  amount_inr            numeric,
  amount_mismatch       boolean      default false,

  -- OCR metadata
  ocr_confidence        integer,
  raw_text              text,
  confidence            jsonb        default '{}',
  corrections           jsonb        default '[]',

  -- workflow
  status                text         not null default 'pending_review'
                          check (status in ('pending_review', 'reviewed', 'rejected')),
  uploaded_by           text         references dl_users(id) on delete set null,
  uploader_name         text,
  reviewed_by           text,

  -- timestamps
  created_at            timestamptz  not null default now()
);

comment on table  dl_receipts             is 'DairyLedger milk collection receipts';
comment on column dl_receipts.uploaded_by is 'FK → dl_users.id';
comment on column dl_receipts.status      is 'pending_review | reviewed | rejected';


-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists dl_receipts_uploaded_by_idx on dl_receipts (uploaded_by);
create index if not exists dl_receipts_status_idx      on dl_receipts (status);
create index if not exists dl_receipts_created_at_idx  on dl_receipts (created_at desc);
create index if not exists dl_users_code_idx           on dl_users (code);


-- ── Row Level Security ────────────────────────────────────────────────────────
-- RLS is DISABLED here for simplicity so the anon key can read/write freely.
-- Before making this app fully public, re-enable RLS and add policies like:
--
--   alter table dl_users    enable row level security;
--   alter table dl_receipts enable row level security;
--
--   -- Example: users can only update their own row
--   create policy "Users can update themselves"
--     on dl_users for update using (id = current_setting('app.user_id'));
--
-- For a simple internal tool used by a known set of people, leaving RLS off
-- and restricting access via Supabase dashboard is often fine.

alter table dl_users    disable row level security;
alter table dl_receipts disable row level security;


-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Your tables are ready.
-- The app will auto-seed the admin account on first load using VITE_ADMIN_CODE.
-- ─────────────────────────────────────────────────────────────────────────────
