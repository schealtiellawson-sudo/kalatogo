-- ════════════════════════════════════════════════════════════
-- WOZALI — MA BOUTIQUE · Écran 2 (finances : dépenses + objectifs)
-- Supabase → SQL Editor → Run. Idempotent.
-- ════════════════════════════════════════════════════════════

-- Charges / dépenses (hors achat de stock, déjà couvert par cout_achat)
create table if not exists wozali_depenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  montant    integer not null,
  libelle    text,
  categorie  text,          -- 'loyer' | 'transport' | 'fournitures' | 'autre'
  created_at timestamptz default now()
);
alter table wozali_depenses enable row level security;
drop policy if exists "depenses_select_self" on wozali_depenses;
drop policy if exists "depenses_insert_self" on wozali_depenses;
drop policy if exists "depenses_delete_self" on wozali_depenses;
create policy "depenses_select_self" on wozali_depenses for select using (auth.uid() = user_id);
create policy "depenses_insert_self" on wozali_depenses for insert with check (auth.uid() = user_id);
create policy "depenses_delete_self" on wozali_depenses for delete using (auth.uid() = user_id);
create index if not exists idx_depenses_user on wozali_depenses(user_id, created_at);

-- Objectif mensuel (CA ou bénéfice)
create table if not exists wozali_objectifs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mois       text not null,           -- 'YYYY-MM'
  type       text default 'ca',       -- 'ca' | 'benefice'
  montant    integer not null,
  created_at timestamptz default now(),
  unique (user_id, mois)
);
alter table wozali_objectifs enable row level security;
drop policy if exists "objectifs_select_self" on wozali_objectifs;
drop policy if exists "objectifs_upsert_self" on wozali_objectifs;
drop policy if exists "objectifs_update_self" on wozali_objectifs;
create policy "objectifs_select_self" on wozali_objectifs for select using (auth.uid() = user_id);
create policy "objectifs_upsert_self" on wozali_objectifs for insert with check (auth.uid() = user_id);
create policy "objectifs_update_self" on wozali_objectifs for update using (auth.uid() = user_id);

-- ✅ Fini.
