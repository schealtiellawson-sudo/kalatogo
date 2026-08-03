-- ════════════════════════════════════════════════════════════
-- WOZALI — Réactions par plat (👍 aimé / 👎 pas aimé)
-- Supabase → SQL Editor → Run. Une seule fois.
-- ════════════════════════════════════════════════════════════
create table if not exists wozali_menu_reactions (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references wozali_menu(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz default now(),
  unique (menu_item_id, user_id)   -- 1 avis max par personne par plat (like OU dislike)
);

alter table wozali_menu_reactions enable row level security;

-- Compteurs visibles par tout le monde
create policy "menu_reactions_select_public"
  on wozali_menu_reactions for select using (true);
-- Chacun ne gère que sa propre réaction
create policy "menu_reactions_insert_self"
  on wozali_menu_reactions for insert with check (auth.uid() = user_id);
create policy "menu_reactions_update_self"
  on wozali_menu_reactions for update using (auth.uid() = user_id);
create policy "menu_reactions_delete_self"
  on wozali_menu_reactions for delete using (auth.uid() = user_id);

create index if not exists idx_menu_reactions_item on wozali_menu_reactions(menu_item_id);
