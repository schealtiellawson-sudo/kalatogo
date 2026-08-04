-- ════════════════════════════════════════════════════════════
-- WOZALI — Messagerie 2 sens (client ↔ pro), interne. SQL Editor → Run.
-- ════════════════════════════════════════════════════════════
create table if not exists wozali_messages (
  id             uuid primary key default gen_random_uuid(),
  expediteur_id  uuid not null references auth.users(id) on delete cascade,
  destinataire_id uuid not null references auth.users(id) on delete cascade,
  contenu        text not null,
  type           text default 'texte',   -- 'texte' | 'systeme'
  meta           jsonb,                   -- carte système (commande, rdv, devis…)
  lu             boolean default false,
  created_at     timestamptz default now()
);
alter table wozali_messages enable row level security;

-- Je vois les messages que j'ai envoyés OU reçus
drop policy if exists "messages_select_party" on wozali_messages;
create policy "messages_select_party" on wozali_messages
  for select using (auth.uid() = expediteur_id or auth.uid() = destinataire_id);
-- Je n'envoie qu'en mon nom
drop policy if exists "messages_insert_self" on wozali_messages;
create policy "messages_insert_self" on wozali_messages
  for insert with check (auth.uid() = expediteur_id);
-- Le destinataire peut marquer lu
drop policy if exists "messages_update_dest" on wozali_messages;
create policy "messages_update_dest" on wozali_messages
  for update using (auth.uid() = destinataire_id);

create index if not exists idx_messages_pair on wozali_messages(expediteur_id, destinataire_id, created_at);
create index if not exists idx_messages_dest on wozali_messages(destinataire_id, lu);

-- ✅ Fini.
