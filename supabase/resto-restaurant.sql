-- ════════════════════════════════════════════════════════════
-- WOZALI — Cluster Resto « Mon resto ». SQL Editor → Run. Idempotent.
-- Réutilise wozali_menu + wozali_menu_reactions + wozali_depenses/objectifs.
-- ════════════════════════════════════════════════════════════
create table if not exists wozali_recettes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  jour       date not null,
  montant    integer not null,
  created_at timestamptz default now(),
  unique (user_id, jour)
);
alter table wozali_recettes enable row level security;
drop policy if exists "recettes_select_self" on wozali_recettes;
drop policy if exists "recettes_upsert_self" on wozali_recettes;
drop policy if exists "recettes_update_self" on wozali_recettes;
drop policy if exists "recettes_delete_self" on wozali_recettes;
create policy "recettes_select_self" on wozali_recettes for select using (auth.uid() = user_id);
create policy "recettes_upsert_self" on wozali_recettes for insert with check (auth.uid() = user_id);
create policy "recettes_update_self" on wozali_recettes for update using (auth.uid() = user_id);
create policy "recettes_delete_self" on wozali_recettes for delete using (auth.uid() = user_id);
create index if not exists idx_recettes_user on wozali_recettes(user_id, jour);

-- ✅ Fini.
