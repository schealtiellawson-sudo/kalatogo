-- ════════════════════════════════════════════════════════════
-- WOZALI — MA BOUTIQUE · Écran 1 (stock pro + commandes + analytics)
-- Supabase → SQL Editor → Run. Idempotent (relançable sans risque).
-- ════════════════════════════════════════════════════════════

-- 1) Fiche article enrichie
alter table wozali_items add column if not exists tailles      text;             -- "S, M, L, XL" (saisie libre)
alter table wozali_items add column if not exists stock_qty    integer;          -- quantité en stock (INTERNE, jamais public)
alter table wozali_items add column if not exists seuil_stock  integer default 3;-- seuil d'alerte "stock faible"
alter table wozali_items add column if not exists cout_achat   integer;          -- coût d'achat unitaire (marge / bénéfice écran 2)

-- 2) Commandes : taille / quantité / message
alter table wozali_commandes add column if not exists taille    text;
alter table wozali_commandes add column if not exists quantite  integer default 1;
alter table wozali_commandes add column if not exists message   text;
alter table wozali_commandes add column if not exists client_nom text;
-- statut utilisé : 'recue' → 'confirmee' → 'livree' | 'annulee'

-- Le pro doit pouvoir LIRE + METTRE À JOUR les commandes qu'il reçoit
alter table wozali_commandes enable row level security;
drop policy if exists "commandes_select_pro"  on wozali_commandes;
drop policy if exists "commandes_update_pro"  on wozali_commandes;
drop policy if exists "commandes_select_client" on wozali_commandes;
drop policy if exists "commandes_insert_client" on wozali_commandes;
create policy "commandes_insert_client" on wozali_commandes
  for insert with check (auth.uid() = client_user_id);
create policy "commandes_select_client" on wozali_commandes
  for select using (auth.uid() = client_user_id);
create policy "commandes_select_pro" on wozali_commandes
  for select using (auth.uid() = prestataire_user_id);
create policy "commandes_update_pro" on wozali_commandes
  for update using (auth.uid() = prestataire_user_id);
create index if not exists idx_commandes_pro on wozali_commandes(prestataire_user_id);

-- 3) Mouvements de stock (réappro + sorties) — historique interne
create table if not exists wozali_stock_mouvements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null references wozali_items(id) on delete cascade,
  delta      integer not null,        -- +réappro / -vente
  motif      text,                    -- 'reappro' | 'vente' | 'ajustement'
  cout_achat integer,                 -- coût unitaire si réappro
  created_at timestamptz default now()
);
alter table wozali_stock_mouvements enable row level security;
drop policy if exists "stockmvt_select_self" on wozali_stock_mouvements;
drop policy if exists "stockmvt_insert_self" on wozali_stock_mouvements;
create policy "stockmvt_select_self" on wozali_stock_mouvements
  for select using (auth.uid() = user_id);
create policy "stockmvt_insert_self" on wozali_stock_mouvements
  for insert with check (auth.uid() = user_id);
create index if not exists idx_stockmvt_user on wozali_stock_mouvements(user_id, item_id);

-- ✅ Fini. Relançable à volonté.
