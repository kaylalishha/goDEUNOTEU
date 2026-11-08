-- GO Aikatsu — Admin Dashboard schema (Supabase / Postgres)
--
-- Mirrors src/types.ts. Run this whole file once in the Supabase SQL
-- Editor (or `supabase db push`). See docs/SUPABASE_SETUP.md for the
-- step-by-step guide and docs/ERD.md for the diagram.
--
-- Design notes:
--   - IDs are uuids. The web app generates them client-side
--     (crypto.randomUUID) so it can upload photos into a batch's folder
--     before the batch row exists.
--   - Derived lists in src/types.ts are NOT stored as arrays:
--       Box.batchIds       -> batches.box_id
--       BatchBill.itemIds  -> items with same (batch_id, customer_id)
--       TaxBill.itemIds    -> items.tax_bill_id
--       Batch.photoDataUrls-> batch_photos rows (files live in Storage)
--   - Multi-step operations (save a batch, save a box, publish tax bills,
--     guarded deletes) are Postgres functions called via supabase.rpc(),
--     so each one runs in a single transaction and the business rules
--     from src/store/useStore.ts + src/lib/deleteGuards.ts are enforced
--     server-side too, not only in the UI.
--   - Photos and bukti transfer files live in Storage buckets
--     ('batch-photos' public, 'bukti-transfer' private); tables only keep
--     the object path.

-- ════════════════════════════════════════════════════════════════════════
-- 1. Enums (mirror the *_OPTIONS consts in src/types.ts)
-- ════════════════════════════════════════════════════════════════════════

create type tipe_barang as enum
  ('Kartu', 'Ganci', 'Binder', 'Boneka', 'Sleeve', 'Standee', 'Lainnya');

create type tipe_kartu as enum
  ('Tops', 'Skirt', 'Shoes', 'Set', 'Accessories', 'Dress');

create type order_status as enum (
  'Dibeli dari Seller', 'Di WH Jepang', 'Dikirim ke Indonesia',
  'Di Bea Cukai', 'Di WH Indonesia', 'Selesai'
);

create type box_status as enum (
  'Di WH Jepang', 'Dikirim ke Indonesia', 'Di Bea Cukai',
  'Di WH Indonesia', 'Selesai'
);

create type order_type as enum ('ReqShare', 'Admin', 'Persod');

-- BatchBillStatus and TaxBillStatus share the same wording.
create type bill_status as enum ('Belum Bayar', 'Menunggu Konfirmasi', 'Lunas');

create type payment_method as enum
  ('QRIS', 'Shopeepay', 'DANA', 'GoPay', 'BCA', 'SeaBank');

create type service_fee_type as enum ('flat', 'percentage');

create type notification_type as enum (
  'batch_bill_published', 'tax_bill_published',
  'payment_confirmed', 'payment_rejected'
);

-- ════════════════════════════════════════════════════════════════════════
-- 2. Tables
-- ════════════════════════════════════════════════════════════════════════

-- Admin GO website accounts (Supabase email/password auth). A row here is
-- what makes an auth user an admin — signing up alone grants nothing.
create table admins (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Admin GO',
  created_at timestamptz not null default now()
);

-- Customers. Created by Admin today (the admin dashboard only needs a
-- name); linked to a login later when the Customer Dashboard (LINE Login)
-- ships — auth_user_id / line_user_id stay null until then.
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  line_user_id text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feature B: a physical shipping box. Its status is the single source of
-- truth for every batch inside it.
create table boxes (
  id uuid primary key default gen_random_uuid(),
  box_number text not null unique,                 -- e.g. BOX-001
  status box_status not null default 'Di WH Jepang',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feature A: one submitted recap form = one batch = one order to a seller.
create table batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,               -- e.g. BATCH-01
  box_id uuid references boxes (id),               -- null until placed in a box
  order_id_wh text not null,
  order_type order_type not null default 'ReqShare',
  order_status order_status not null default 'Dibeli dari Seller',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Unboxed <=> "Dibeli dari Seller"; once boxed, status follows the box.
  constraint box_drives_status check (
    (box_id is null) = (order_status = 'Dibeli dari Seller')
  )
);

create index batches_box_id_idx on batches (box_id);

-- Batch.photoDataUrls — one row per photo, files in the 'batch-photos'
-- bucket at <batch_id>/<file>.
create table batch_photos (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  storage_path text not null,
  position integer not null,                       -- carousel order, 0-based
  created_at timestamptz not null default now(),
  unique (batch_id, position)
);

-- Feature C: one tax bill per customer per box.
create table tax_bills (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references boxes (id),
  customer_id uuid not null references customers (id),
  kartu_count integer not null default 0 check (kartu_count >= 0),
  kartu_tax numeric(14, 2) not null default 0,
  non_kartu_weight_grams numeric(12, 2) not null default 0,
  non_kartu_share numeric(14, 2) not null default 0,
  total numeric(14, 2) not null check (total >= 0),        -- product tax only
  late_fee_idr numeric(14, 2) not null default 0 check (late_fee_idr >= 0),
  status bill_status not null default 'Belum Bayar',
  payment_method payment_method,
  bukti_transfer_path text,                         -- 'bukti-transfer' bucket
  bukti_transfer_file_name text,
  bukti_transfer_uploaded_at timestamptz,
  published_at timestamptz not null default now(),
  deadline timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (box_id, customer_id)
);

create index tax_bills_customer_id_idx on tax_bills (customer_id);
create index tax_bills_status_idx on tax_bills (status);

-- One item = one product ordered by one customer inside one batch.
create table items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  customer_id uuid not null references customers (id),
  tipe_barang tipe_barang not null,
  tipe_kartu tipe_kartu,
  price_idr numeric(14, 2) not null check (price_idr > 0),
  weight_grams numeric(12, 2) check (weight_grams > 0),
  tax_bill_id uuid references tax_bills (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tipe_kartu_only_for_kartu check (
    (tipe_barang = 'Kartu' and tipe_kartu is not null) or
    (tipe_barang <> 'Kartu' and tipe_kartu is null)
  )
);

create index items_batch_id_idx on items (batch_id);
create index items_customer_id_idx on items (customer_id);
create index items_tax_bill_id_idx on items (tax_bill_id);

-- Feature A payments: one bill per customer per batch, created
-- automatically when the batch is saved.
create table batch_bills (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  customer_id uuid not null references customers (id),
  upnotes_total numeric(14, 2) not null default 0,
  bank_account text not null default 'BCA 1234567890 a.n. Admin GO Aikatsu',
  total numeric(14, 2) not null,                    -- sum(items.price_idr) + upnotes_total
  status bill_status not null default 'Belum Bayar',
  payment_method payment_method,
  bukti_transfer_path text,
  bukti_transfer_file_name text,
  bukti_transfer_uploaded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, customer_id)
);

create index batch_bills_customer_id_idx on batch_bills (customer_id);
create index batch_bills_status_idx on batch_bills (status);

-- Feature D: single-row config (id is always 1).
create table estimator_config (
  id integer primary key default 1 check (id = 1),
  exchange_rate numeric(10, 4) not null check (exchange_rate > 0),
  service_fee_type service_fee_type not null,
  service_fee_value numeric(14, 2) not null check (service_fee_value >= 0),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into estimator_config (id, exchange_rate, service_fee_type, service_fee_value)
values (1, 105, 'percentage', 10);

-- In-dashboard notifications for the (future) Customer Dashboard. Filled
-- automatically by triggers below — the admin app never writes these.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  type notification_type not null,
  reference_id uuid not null,                       -- batch_bills.id or tax_bills.id
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_customer_id_idx on notifications (customer_id, read_at);

-- ════════════════════════════════════════════════════════════════════════
-- 3. Triggers
-- ════════════════════════════════════════════════════════════════════════

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at before update on customers
  for each row execute function set_updated_at();
create trigger boxes_set_updated_at before update on boxes
  for each row execute function set_updated_at();
create trigger batches_set_updated_at before update on batches
  for each row execute function set_updated_at();
create trigger items_set_updated_at before update on items
  for each row execute function set_updated_at();
create trigger batch_bills_set_updated_at before update on batch_bills
  for each row execute function set_updated_at();
create trigger tax_bills_set_updated_at before update on tax_bills
  for each row execute function set_updated_at();

-- A Lunas / Menunggu Konfirmasi tax bill is a real financial record
-- (src/lib/deleteGuards.ts guardTaxBillDeletion).
create function guard_tax_bill_delete() returns trigger
language plpgsql as $$
begin
  if old.status <> 'Belum Bayar' then
    raise exception 'Tagihan pajak yang sudah lunas / menunggu konfirmasi tidak bisa dihapus.';
  end if;
  return old;
end;
$$;

create trigger tax_bills_guard_delete before delete on tax_bills
  for each row execute function guard_tax_bill_delete();

-- Notifications for customers (security definer: runs regardless of who
-- triggered it, since customers can't insert notifications themselves).
create function notify_bill_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_label text;
  v_kind text;
begin
  if tg_table_name = 'batch_bills' then
    select 'tagihan ' || batch_number into v_label from batches where id = new.batch_id;
    v_kind := 'batch_bill_published';
  else
    select 'tagihan pajak ' || box_number into v_label from boxes where id = new.box_id;
    v_kind := 'tax_bill_published';
  end if;

  if tg_op = 'INSERT' then
    insert into notifications (customer_id, type, reference_id, message)
    values (new.customer_id, v_kind::notification_type, new.id, 'Ada ' || v_label || ' baru untuk kamu.');
  elsif new.status is distinct from old.status then
    if new.status = 'Lunas' then
      insert into notifications (customer_id, type, reference_id, message)
      values (new.customer_id, 'payment_confirmed', new.id, 'Pembayaran ' || v_label || ' sudah dikonfirmasi. Terima kasih!');
    elsif old.status = 'Menunggu Konfirmasi' and new.status = 'Belum Bayar' then
      insert into notifications (customer_id, type, reference_id, message)
      values (new.customer_id, 'payment_rejected', new.id, 'Bukti transfer ' || v_label || ' ditolak. Silakan upload ulang.');
    end if;
  end if;
  return new;
end;
$$;

create trigger batch_bills_notify after insert or update of status on batch_bills
  for each row execute function notify_bill_change();
create trigger tax_bills_notify after insert or update of status on tax_bills
  for each row execute function notify_bill_change();

-- ════════════════════════════════════════════════════════════════════════
-- 4. Helper functions for RLS
-- ════════════════════════════════════════════════════════════════════════

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where id = auth.uid());
$$;

-- The customers.id of the signed-in customer (null for admins/anon).
create function current_customer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from customers where auth_user_id = auth.uid();
$$;

create function require_admin() returns void
language plpgsql stable as $$
begin
  if not is_admin() then
    raise exception 'Hanya Admin GO yang boleh melakukan aksi ini.' using errcode = '42501';
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 5. RPC functions (called from src/lib/remote.ts via supabase.rpc)
-- ════════════════════════════════════════════════════════════════════════

-- useStore.saveBatch: create/edit a batch, replace its photos and items,
-- and keep exactly one batch bill per customer in sync.
-- p_items: [{ id, customer_id, tipe_barang, tipe_kartu, price_idr, weight_grams }]
-- Returns the number of newly created bills.
create function save_batch(
  p_batch_id uuid,
  p_batch_number text,
  p_order_id_wh text,
  p_order_type order_type,
  p_photo_paths text[],
  p_items jsonb
) returns integer
language plpgsql as $$
declare
  v_new_bills integer;
begin
  perform require_admin();

  insert into batches (id, batch_number, order_id_wh, order_type)
  values (p_batch_id, p_batch_number, p_order_id_wh, p_order_type)
  on conflict (id) do update
    set batch_number = excluded.batch_number,
        order_id_wh = excluded.order_id_wh,
        order_type = excluded.order_type;

  delete from batch_photos where batch_id = p_batch_id;
  insert into batch_photos (batch_id, storage_path, position)
  select p_batch_id, path, ord - 1
  from unnest(coalesce(p_photo_paths, '{}')) with ordinality as t(path, ord);

  if exists (
    select 1 from items i
    join jsonb_to_recordset(p_items) as n(id uuid) on n.id = i.id
    where i.batch_id <> p_batch_id
  ) then
    raise exception 'Item milik batch lain tidak bisa dipindahkan ke batch ini.';
  end if;

  delete from items
  where batch_id = p_batch_id
    and id not in (select n.id from jsonb_to_recordset(p_items) as n(id uuid));

  insert into items (id, batch_id, customer_id, tipe_barang, tipe_kartu, price_idr, weight_grams)
  select id, p_batch_id, customer_id, tipe_barang, tipe_kartu, price_idr, weight_grams
  from jsonb_to_recordset(p_items) as n(
    id uuid, customer_id uuid, tipe_barang tipe_barang, tipe_kartu tipe_kartu,
    price_idr numeric, weight_grams numeric
  )
  on conflict (id) do update
    set customer_id = excluded.customer_id,
        tipe_barang = excluded.tipe_barang,
        tipe_kartu = excluded.tipe_kartu,
        price_idr = excluded.price_idr,
        weight_grams = coalesce(excluded.weight_grams, items.weight_grams);

  -- One bill per customer in the batch: total = their items + upnotes.
  with sums as (
    select customer_id, sum(price_idr) as item_total
    from items where batch_id = p_batch_id
    group by customer_id
  ), upserted as (
    insert into batch_bills (batch_id, customer_id, total)
    select p_batch_id, customer_id, item_total from sums
    on conflict (batch_id, customer_id) do update
      set total = excluded.total + batch_bills.upnotes_total
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted) into v_new_bills from upserted;

  -- Customers removed from the batch keep their bill, with no items.
  update batch_bills b
  set total = b.upnotes_total
  where b.batch_id = p_batch_id
    and not exists (
      select 1 from items i where i.batch_id = p_batch_id and i.customer_id = b.customer_id
    );

  return v_new_bills;
end;
$$;

-- useStore.saveBox: create/edit a box and cascade its status to its
-- batches. Batch membership locks once the box leaves 'Di WH Jepang'.
create function save_box(
  p_box_id uuid,
  p_box_number text,
  p_batch_ids uuid[],
  p_status box_status
) returns void
language plpgsql as $$
declare
  v_existing boxes%rowtype;
  v_batch_ids uuid[] := coalesce(p_batch_ids, '{}');
begin
  perform require_admin();

  select * into v_existing from boxes where id = p_box_id for update;

  if found and v_existing.status <> 'Di WH Jepang' then
    select coalesce(array_agg(id), '{}') into v_batch_ids from batches where box_id = p_box_id;
  elsif exists (
    select 1 from batches
    where id = any(v_batch_ids) and box_id is not null and box_id <> p_box_id
  ) then
    raise exception 'Ada batch yang sudah masuk ke box lain.';
  end if;

  insert into boxes (id, box_number, status)
  values (p_box_id, p_box_number, coalesce(p_status, 'Di WH Jepang'))
  on conflict (id) do update
    set box_number = excluded.box_number,
        status = excluded.status;

  update batches
  set box_id = null, order_status = 'Dibeli dari Seller'
  where box_id = p_box_id and not (id = any(v_batch_ids));

  update batches
  set box_id = p_box_id,
      order_status = coalesce(p_status, 'Di WH Jepang')::text::order_status
  where id = any(v_batch_ids);
end;
$$;

-- useStore.deleteBoxes + guardBoxDeletion: only boxes still at their
-- default status can be deleted; their batches go back to unboxed.
create function delete_boxes(p_box_ids uuid[])
returns jsonb
language plpgsql as $$
declare
  v_eligible uuid[];
begin
  perform require_admin();

  select coalesce(array_agg(id), '{}') into v_eligible
  from boxes where id = any(p_box_ids) and status = 'Di WH Jepang';

  update batches
  set box_id = null, order_status = 'Dibeli dari Seller'
  where box_id = any(v_eligible);

  delete from boxes where id = any(v_eligible);

  return jsonb_build_object(
    'deleted', cardinality(v_eligible),
    'blocked', (select count(*) from boxes where id = any(p_box_ids))
  );
end;
$$;

-- useStore.deleteBatches + guardBatchDeletion. Returns the deleted
-- batches' photo paths so the client can remove the files from Storage.
create function delete_batches(p_batch_ids uuid[])
returns jsonb
language plpgsql as $$
declare
  v_eligible uuid[];
  v_paths text[];
begin
  perform require_admin();

  select coalesce(array_agg(b.id), '{}') into v_eligible
  from batches b
  where b.id = any(p_batch_ids)
    and not exists (select 1 from items i where i.batch_id = b.id and i.tax_bill_id is not null)
    and not exists (
      select 1 from batch_bills bb
      where bb.batch_id = b.id and bb.status in ('Lunas', 'Menunggu Konfirmasi')
    );

  select coalesce(array_agg(storage_path), '{}') into v_paths
  from batch_photos where batch_id = any(v_eligible);

  delete from batches where id = any(v_eligible);   -- cascades items, bills, photos

  return jsonb_build_object(
    'deleted', cardinality(v_eligible),
    'blocked', (select count(*) from batches where id = any(p_batch_ids)),
    'photo_paths', to_jsonb(v_paths)
  );
end;
$$;

-- useStore.setItemWeights. p_weights: [{ item_id, weight_grams }]
create function set_item_weights(p_weights jsonb) returns void
language plpgsql as $$
begin
  perform require_admin();
  update items i
  set weight_grams = w.weight_grams
  from jsonb_to_recordset(p_weights) as w(item_id uuid, weight_grams numeric)
  where i.id = w.item_id;
end;
$$;

-- useStore.publishTaxBills: one-shot per box, only once the box is at
-- 'Di Bea Cukai' or later.
-- p_bills: [{ customer_id, item_ids, kartu_count, kartu_tax,
--             non_kartu_weight_grams, non_kartu_share, total }]
create function publish_tax_bills(
  p_box_id uuid,
  p_deadline timestamptz,
  p_bills jsonb
) returns integer
language plpgsql as $$
declare
  v_status box_status;
  v_bill record;
  v_bill_id uuid;
  v_count integer := 0;
begin
  perform require_admin();

  select status into v_status from boxes where id = p_box_id for update;
  if v_status is null then
    raise exception 'Box tidak ditemukan.';
  end if;
  if v_status not in ('Di Bea Cukai', 'Di WH Indonesia', 'Selesai') then
    raise exception 'Tagihan pajak baru bisa dipublikasikan setelah box sampai di Bea Cukai.';
  end if;
  if exists (select 1 from tax_bills where box_id = p_box_id) then
    raise exception 'Tagihan pajak box ini sudah pernah dipublikasikan.';
  end if;

  for v_bill in
    select * from jsonb_to_recordset(p_bills) as x(
      customer_id uuid, item_ids uuid[], kartu_count integer, kartu_tax numeric,
      non_kartu_weight_grams numeric, non_kartu_share numeric, total numeric
    )
  loop
    insert into tax_bills (
      box_id, customer_id, kartu_count, kartu_tax,
      non_kartu_weight_grams, non_kartu_share, total, deadline
    ) values (
      p_box_id, v_bill.customer_id, v_bill.kartu_count, v_bill.kartu_tax,
      v_bill.non_kartu_weight_grams, v_bill.non_kartu_share, v_bill.total, p_deadline
    ) returning id into v_bill_id;

    update items i
    set tax_bill_id = v_bill_id
    from batches b
    where i.batch_id = b.id
      and b.box_id = p_box_id
      and i.customer_id = v_bill.customer_id
      and i.id = any(v_bill.item_ids);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Customer uploads a bukti transfer (or Admin's "Simulate customer
-- upload" demo button). Security definer so customers don't need a
-- general UPDATE policy on bills — they can only ever do this one change.
-- p_kind: 'batch' | 'tax'
create function submit_payment_proof(
  p_kind text,
  p_bill_id uuid,
  p_path text,
  p_file_name text,
  p_method payment_method
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_status bill_status;
begin
  if p_kind = 'batch' then
    select customer_id, status into v_customer, v_status from batch_bills where id = p_bill_id for update;
  elsif p_kind = 'tax' then
    select customer_id, status into v_customer, v_status from tax_bills where id = p_bill_id for update;
  else
    raise exception 'p_kind harus ''batch'' atau ''tax''.';
  end if;

  if v_customer is null then
    raise exception 'Tagihan tidak ditemukan.';
  end if;
  if not (is_admin() or v_customer = current_customer_id()) then
    raise exception 'Bukan tagihan milik kamu.' using errcode = '42501';
  end if;
  if v_status <> 'Belum Bayar' then
    raise exception 'Tagihan ini sudah dibayar / menunggu konfirmasi.';
  end if;

  if p_kind = 'batch' then
    update batch_bills
    set status = 'Menunggu Konfirmasi', payment_method = p_method,
        bukti_transfer_path = p_path, bukti_transfer_file_name = p_file_name,
        bukti_transfer_uploaded_at = now()
    where id = p_bill_id;
  else
    update tax_bills
    set status = 'Menunggu Konfirmasi', payment_method = p_method,
        bukti_transfer_path = p_path, bukti_transfer_file_name = p_file_name,
        bukti_transfer_uploaded_at = now()
    where id = p_bill_id;
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 6. Row Level Security
-- Admin GO: full access. Customers (future LINE login): read-only access
-- to their own rows; paying goes through submit_payment_proof().
-- ════════════════════════════════════════════════════════════════════════

alter table admins enable row level security;
alter table customers enable row level security;
alter table boxes enable row level security;
alter table batches enable row level security;
alter table batch_photos enable row level security;
alter table items enable row level security;
alter table batch_bills enable row level security;
alter table tax_bills enable row level security;
alter table estimator_config enable row level security;
alter table notifications enable row level security;

-- admins: a signed-in user can see whether they themselves are an admin.
-- New admins are added from the SQL Editor (see docs), never from the app.
create policy "read own admin row" on admins
  for select to authenticated using (id = auth.uid());

create policy "admin all customers" on customers
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads self" on customers
  for select to authenticated using (auth_user_id = auth.uid());

create policy "admin all boxes" on boxes
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own boxes" on boxes
  for select to authenticated using (
    exists (
      select 1 from batches b join items i on i.batch_id = b.id
      where b.box_id = boxes.id and i.customer_id = current_customer_id()
    )
  );

create policy "admin all batches" on batches
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own batches" on batches
  for select to authenticated using (
    exists (select 1 from items i where i.batch_id = batches.id and i.customer_id = current_customer_id())
  );

create policy "admin all batch_photos" on batch_photos
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own batch_photos" on batch_photos
  for select to authenticated using (
    exists (select 1 from items i where i.batch_id = batch_photos.batch_id and i.customer_id = current_customer_id())
  );

create policy "admin all items" on items
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own items" on items
  for select to authenticated using (customer_id = current_customer_id());

create policy "admin all batch_bills" on batch_bills
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own batch_bills" on batch_bills
  for select to authenticated using (customer_id = current_customer_id());

create policy "admin all tax_bills" on tax_bills
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own tax_bills" on tax_bills
  for select to authenticated using (customer_id = current_customer_id());

-- The Price Estimator is meant for customers, so anyone may read it.
create policy "anyone reads estimator_config" on estimator_config
  for select using (true);
create policy "admin updates estimator_config" on estimator_config
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "admin all notifications" on notifications
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own notifications" on notifications
  for select to authenticated using (customer_id = current_customer_id());
create policy "customer marks own notifications read" on notifications
  for update to authenticated
  using (customer_id = current_customer_id())
  with check (customer_id = current_customer_id());

-- ════════════════════════════════════════════════════════════════════════
-- 7. Storage buckets + policies
-- batch-photos:   public read (product photos), admin writes.
-- bukti-transfer: private. Admin reads/writes everything; a customer may
--                 upload/read only inside a folder named after their
--                 customers.id: bukti-transfer/<customer_id>/<file>.
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('batch-photos', 'batch-photos', true),
       ('bukti-transfer', 'bukti-transfer', false)
on conflict (id) do nothing;

create policy "admin writes batch photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'batch-photos' and is_admin())
  with check (bucket_id = 'batch-photos' and is_admin());

create policy "admin manages bukti transfer" on storage.objects
  for all to authenticated
  using (bucket_id = 'bukti-transfer' and is_admin())
  with check (bucket_id = 'bukti-transfer' and is_admin());

create policy "customer reads own bukti transfer" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bukti-transfer'
    and (storage.foldername(name))[1] = current_customer_id()::text
  );

create policy "customer uploads own bukti transfer" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bukti-transfer'
    and (storage.foldername(name))[1] = current_customer_id()::text
  );
