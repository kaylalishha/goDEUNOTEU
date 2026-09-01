-- GO Aikatsu — initial schema
-- Mirrors src/types.ts almost 1:1. Photos and bukti transfer files are
-- NOT stored in the database — only their Storage object paths are
-- (buckets: 'batch-photos', 'bukti-transfer'). See bottom of file.

create extension if not exists "pgcrypto";

-- ── Enums (mirror the *_OPTIONS consts in src/types.ts) ─────────────────

create type user_role as enum ('admin', 'customer');

create type tipe_barang as enum
  ('Kartu', 'Ganci', 'Binder', 'Boneka', 'Sleeve', 'Standee', 'Lainnya');

create type tipe_kartu as enum
  ('Tops', 'Skirt', 'Shoes', 'Set', 'Accessories', 'Dress');

create type order_status as enum (
  'Menunggu Pembayaran ke Seller', 'Dibeli dari Seller', 'Di WH Jepang',
  'Dikirim ke Indonesia', 'Di Bea Cukai', 'Di WH Indonesia', 'Selesai'
);

create type order_type as enum ('Persod', 'Group Order', 'Admin');

create type batch_bill_status as enum
  ('Belum Lunas', 'Menunggu Konfirmasi', 'Lunas');

create type tax_bill_status as enum
  ('Belum Bayar', 'Menunggu Konfirmasi', 'Lunas');

create type service_fee_type as enum ('flat', 'percentage');

create type notification_type as enum
  ('batch_bill_published', 'tax_bill_published', 'payment_confirmed', 'payment_rejected');

-- ── Profiles (extends Supabase auth.users; both Admin GO and customers) ─
--
-- Auth plan: LINE Login is the ONLY sign-in method — no email/password,
-- no other OAuth provider. LINE Login is OIDC-compliant (issues a signed
-- id_token), which Supabase Auth accepts via signInWithIdToken() once
-- LINE is registered as a custom OIDC provider on the project. See
-- README.md "Auth" section for the end-to-end flow and its consequences
-- (no self-serve admin signup; role is granted manually).

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  line_user_id text not null unique,   -- LINE's stable `sub` claim
  role user_role not null default 'customer',
  full_name text not null,             -- seeded from LINE displayName, editable after
  avatar_url text,                     -- seeded from LINE pictureUrl
  created_at timestamptz not null default now()
);

-- ── Feature A: Batches + Items ───────────────────────────────────────────
-- One row in `batches` = one submitted recap form = one invoice/order link.
-- `items` nest under a batch, one row per item per customer (FR-GO-A-001).

create table batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null,
  box_number text not null,
  order_type order_type not null default 'Group Order',
  photo_path text,                          -- Storage object path, batch-photos bucket
  upnotes_total numeric(12, 2) not null default 0,
  order_status order_status not null default 'Menunggu Pembayaran ke Seller',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  customer_id uuid not null references profiles (id),
  tipe_barang tipe_barang not null,
  tipe_kartu tipe_kartu,                    -- required only when tipe_barang = 'Kartu'
  price_jpy numeric(12, 2) not null check (price_jpy > 0),
  price_idr numeric(14, 2) not null,
  weight_grams numeric(10, 2),              -- filled later, during Feature C tax calc
  batch_bill_id uuid,                       -- set once this item is attached to a bill
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tipe_kartu_required_for_kartu check (
    (tipe_barang = 'Kartu' and tipe_kartu is not null) or
    (tipe_barang <> 'Kartu' and tipe_kartu is null)
  )
);

create index items_batch_id_idx on items (batch_id);
create index items_customer_id_idx on items (customer_id);

-- ── Feature B: Batch Bills ────────────────────────────────────────────────

create table batch_bills (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id),
  customer_id uuid not null references profiles (id),
  upnotes_total numeric(12, 2) not null default 0,   -- admin-entered per FR-GO-B-001, not summed
  bank_account text not null,
  total numeric(14, 2) not null,
  status batch_bill_status not null default 'Belum Lunas',
  bukti_transfer_path text,                          -- Storage object path, bukti-transfer bucket
  bukti_transfer_uploaded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table items
  add constraint items_batch_bill_id_fkey
  foreign key (batch_bill_id) references batch_bills (id) on delete set null;

create index batch_bills_customer_id_idx on batch_bills (customer_id);
create index batch_bills_status_idx on batch_bills (status);

-- ── Feature C: Tax Bills (Tagihan Pajak EMS) ────────────────────────────

create table tax_bills (
  id uuid primary key default gen_random_uuid(),
  box_number text not null,
  customer_id uuid not null references profiles (id),
  kartu_count integer not null default 0,
  kartu_tax numeric(12, 2) not null default 0,
  non_kartu_weight_grams numeric(10, 2) not null default 0,
  non_kartu_share numeric(12, 2) not null default 0,
  total numeric(14, 2) not null,
  status tax_bill_status not null default 'Belum Bayar',
  bukti_transfer_path text,
  bukti_transfer_uploaded_at timestamptz,
  published_at timestamptz not null default now(),
  deadline timestamptz not null default (now() + interval '7 days')  -- FR-GO-C-002
);

create index tax_bills_customer_id_idx on tax_bills (customer_id);
create index tax_bills_status_idx on tax_bills (status);

-- ── Feature D: Price Estimator Configuration ────────────────────────────
-- Single-row table (id fixed to 1) so every client reads the same config.

create table estimator_config (
  id integer primary key default 1 check (id = 1),
  exchange_rate numeric(10, 4) not null,
  service_fee_type service_fee_type not null,
  service_fee_value numeric(10, 2) not null,
  updated_by uuid references profiles (id),
  updated_at timestamptz not null default now()
);

insert into estimator_config (id, exchange_rate, service_fee_type, service_fee_value)
values (1, 105, 'percentage', 10);

-- ── In-dashboard notifications (FR-GO-C-002 / FR-GO-2-001) ──────────────

create table notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id),
  type notification_type not null,
  reference_id uuid not null,      -- batch_bills.id or tax_bills.id
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_customer_id_idx on notifications (customer_id, read_at);

-- ── updated_at triggers ──────────────────────────────────────────────────

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger batches_set_updated_at before update on batches
  for each row execute function set_updated_at();
create trigger items_set_updated_at before update on items
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────
-- Admin GO retains full authority (per PRD); customers only ever see and
-- act on their own rows.

alter table profiles enable row level security;
alter table batches enable row level security;
alter table items enable row level security;
alter table batch_bills enable row level security;
alter table tax_bills enable row level security;
alter table estimator_config enable row level security;
alter table notifications enable row level security;

create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- profiles
create policy "read own profile or admin reads all" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "users update own profile" on profiles
  for update using (id = auth.uid());

-- batches / items: admin-authored (Admin GO owns order recap end to end)
create policy "admin full access to batches" on batches
  for all using (is_admin()) with check (is_admin());
create policy "customers read batches they have items in" on batches
  for select using (
    exists (select 1 from items where items.batch_id = batches.id and items.customer_id = auth.uid())
  );

create policy "admin full access to items" on items
  for all using (is_admin()) with check (is_admin());
create policy "customers read own items" on items
  for select using (customer_id = auth.uid());

-- batch_bills: admin creates/confirms/rejects; customer reads own + uploads bukti transfer
create policy "admin full access to batch_bills" on batch_bills
  for all using (is_admin()) with check (is_admin());
create policy "customers read own batch_bills" on batch_bills
  for select using (customer_id = auth.uid());
create policy "customers upload bukti transfer on own batch_bills" on batch_bills
  for update using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- tax_bills: same shape as batch_bills
create policy "admin full access to tax_bills" on tax_bills
  for all using (is_admin()) with check (is_admin());
create policy "customers read own tax_bills" on tax_bills
  for select using (customer_id = auth.uid());
create policy "customers upload bukti transfer on own tax_bills" on tax_bills
  for update using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- estimator_config: everyone signed in can read; only admin writes
create policy "authenticated users read estimator_config" on estimator_config
  for select using (auth.uid() is not null);
create policy "admin writes estimator_config" on estimator_config
  for update using (is_admin()) with check (is_admin());

-- notifications: customers see + mark read only their own; admin can insert for anyone
create policy "customers read own notifications" on notifications
  for select using (customer_id = auth.uid());
create policy "customers mark own notifications read" on notifications
  for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "admin inserts notifications" on notifications
  for insert with check (is_admin());

-- ── Storage buckets ───────────────────────────────────────────────────────
-- Run once (also creatable via the Supabase dashboard):
--   insert into storage.buckets (id, name, public) values ('batch-photos', 'batch-photos', false);
--   insert into storage.buckets (id, name, public) values ('bukti-transfer', 'bukti-transfer', false);
-- Then add storage.objects policies mirroring the table policies above,
-- keyed off the uploader's auth.uid() folder prefix, e.g.:
--   bucket_id = 'bukti-transfer' and (storage.foldername(name))[1] = auth.uid()::text
