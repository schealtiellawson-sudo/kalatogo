-- ════════════════════════════════════════════════════════════
-- WOZALI — Cluster Couture « Mon atelier ». SQL Editor → Run. Idempotent.
-- Réutilise wozali_commandes (type 'modele') + wozali_depenses/objectifs.
-- ════════════════════════════════════════════════════════════

-- Date de livraison + nom client sur les commandes (pour le suivi de production)
alter table wozali_commandes add column if not exists date_livraison date;
alter table wozali_commandes add column if not exists client_nom     text;

-- Fiches clientes (carnet de mesures) — propre à chaque pro
create table if not exists wozali_clientes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,  -- le pro
  nom        text not null,
  telephone  text,
  mesures    jsonb,        -- { poitrine, taille, hanches, longueur, epaule, manche, ... }
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table wozali_clientes enable row level security;
drop policy if exists "clientes_select_self" on wozali_clientes;
drop policy if exists "clientes_insert_self" on wozali_clientes;
drop policy if exists "clientes_update_self" on wozali_clientes;
drop policy if exists "clientes_delete_self" on wozali_clientes;
create policy "clientes_select_self" on wozali_clientes for select using (auth.uid() = user_id);
create policy "clientes_insert_self" on wozali_clientes for insert with check (auth.uid() = user_id);
create policy "clientes_update_self" on wozali_clientes for update using (auth.uid() = user_id);
create policy "clientes_delete_self" on wozali_clientes for delete using (auth.uid() = user_id);
create index if not exists idx_clientes_user on wozali_clientes(user_id);

-- ✅ Fini.
