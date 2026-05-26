-- Sprint 5 — Paiement commerçant
alter table profiles add column if not exists qr_code_url text;
alter table profiles add column if not exists metier text;
alter table profiles add column if not exists quartier text;
alter table profiles add column if not exists ville text;
alter table profiles add column if not exists photo_url text;

-- Table des liens de paiement (tokens uniques, expire 24h)
create table if not exists wolo_payment_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references profiles(id) on delete cascade,
  token text unique not null,
  montant integer not null,
  description text,
  statut text not null default 'PENDING', -- PENDING | PAID | EXPIRED
  expires_at timestamptz not null default (now() + interval '24 hours'),
  paid_at timestamptz,
  transaction_id uuid,
  created_at timestamptz default now()
);
create index if not exists idx_wpl_merchant on wolo_payment_links(merchant_id);
create index if not exists idx_wpl_token on wolo_payment_links(token);

alter table wolo_payment_links enable row level security;
create policy if not exists "merchant_own_links" on wolo_payment_links
  for all using (auth.uid() = merchant_id);
create policy if not exists "public_read_by_token" on wolo_payment_links
  for select using (true);
