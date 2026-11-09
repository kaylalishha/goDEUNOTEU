-- Optional per-item description, written by Admin GO in the batch form
-- (e.g. which card a customer gets: "Odette Swan", "Multicolor Vest").
-- Shown in the admin's batch record and on the Customer Dashboard.
--
-- Run once in the Supabase SQL Editor after 0001_init.sql.

alter table items
  add column if not exists description text
  constraint items_description_length check (char_length(description) <= 200);

-- save_batch: same as in 0001_init.sql, plus `description` in p_items.
-- p_items: [{ id, customer_id, tipe_barang, tipe_kartu, description, price_idr, weight_grams }]
create or replace function save_batch(
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

  insert into items (id, batch_id, customer_id, tipe_barang, tipe_kartu, description, price_idr, weight_grams)
  select id, p_batch_id, customer_id, tipe_barang, tipe_kartu, nullif(btrim(description), ''), price_idr, weight_grams
  from jsonb_to_recordset(p_items) as n(
    id uuid, customer_id uuid, tipe_barang tipe_barang, tipe_kartu tipe_kartu,
    description text, price_idr numeric, weight_grams numeric
  )
  on conflict (id) do update
    set customer_id = excluded.customer_id,
        tipe_barang = excluded.tipe_barang,
        tipe_kartu = excluded.tipe_kartu,
        description = excluded.description,
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
