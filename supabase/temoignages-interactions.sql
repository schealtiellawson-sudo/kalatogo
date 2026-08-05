-- ════════════════════════════════════════════════════════════
-- WOZALI — Mur des témoignages : réactions de soutien + réponses (safe zone)
-- SQL Editor → Run. Idempotent.
-- Écriture uniquement via l'API (service role) ; RLS = lecture seule directe.
-- ════════════════════════════════════════════════════════════

-- 1. Réactions de soutien (jeu fermé, aucune option négative)
create table if not exists public.wozali_temoignage_reactions (
  id            uuid primary key default gen_random_uuid(),
  temoignage_id uuid not null,
  user_id       uuid not null,          -- pas de FK stricte (seed démo possible)
  type          text not null check (type in ('crois','courage','merci','moi_aussi')),
  created_at    timestamptz default now(),
  unique (temoignage_id, user_id, type)
);
create index if not exists idx_temo_react_temo on public.wozali_temoignage_reactions(temoignage_id);

-- 2. Réponses / commentaires (modérés à l'écriture par l'API)
create table if not exists public.wozali_temoignage_reponses (
  id             uuid primary key default gen_random_uuid(),
  temoignage_id  uuid not null,
  parent_id      uuid,
  user_id        uuid not null,
  texte          text not null,
  anonyme        boolean default true,
  auteur_affiche text,
  statut         text default 'approuve' check (statut in ('approuve','en_attente','rejete','masque')),
  signalements   int default 0,
  created_at     timestamptz default now()
);
create index if not exists idx_temo_rep_temo on public.wozali_temoignage_reponses(temoignage_id);

-- 3. RLS : lecture directe autorisée (réactions + réponses approuvées), écriture réservée à l'API
alter table public.wozali_temoignage_reactions enable row level security;
drop policy if exists react_read on public.wozali_temoignage_reactions;
create policy react_read on public.wozali_temoignage_reactions for select using (true);

alter table public.wozali_temoignage_reponses enable row level security;
drop policy if exists rep_read on public.wozali_temoignage_reponses;
create policy rep_read on public.wozali_temoignage_reponses for select using (statut = 'approuve');

-- 4. Seed démo (modèles vidéo tuto). Rejoue proprement.
delete from public.wozali_temoignage_reactions
  where temoignage_id in (select id from public.wozali_temoignages where ia_verdict = 'seed_demo');
delete from public.wozali_temoignage_reponses
  where temoignage_id in (select id from public.wozali_temoignages where ia_verdict = 'seed_demo');

-- Soutiens (comptes variés via random)
insert into public.wozali_temoignage_reactions (temoignage_id, user_id, type)
select t.id, gen_random_uuid(), r.type
from public.wozali_temoignages t
cross join (values ('crois',70),('courage',45),('merci',34),('moi_aussi',22)) as r(type, base)
cross join lateral generate_series(1, r.base + (random()*40)::int) g
where t.ia_verdict = 'seed_demo';

-- Réponses : 3 soutiens + 1 réponse de l'Autrice (calquée sur le mode du témoignage)
insert into public.wozali_temoignage_reponses (temoignage_id, user_id, texte, anonyme, auteur_affiche, statut, created_at)
select t.id, x.uid, x.texte,
  case when x.is_autrice then coalesce(t.anonyme, true) else x.anon end,
  case when x.is_autrice then t.auteur_affiche else x.aff end,
  'approuve',
  now() - (x.h || ' hours')::interval
from public.wozali_temoignages t
cross join (values
  (gen_random_uuid(), 'Je te crois. Tu n''as rien à te reprocher, jamais.', true, null::text, 6, false),
  (gen_random_uuid(), 'Moi aussi j''ai vécu ça et je n''en avais jamais parlé. Merci d''avoir osé.', false, 'Afiwa · Lomé', 4, false),
  ('76cdd061-67a5-4b4e-b45a-c36063078cb5'::uuid, 'Merci à vous. Lire vos messages me donne la force que je n''avais pas ce jour-là.', true, null::text, 2, true),
  (gen_random_uuid(), 'Courage. Tu as choisi ta dignité, c''est la seule bonne réponse.', true, null::text, 1, false)
) as x(uid, texte, anon, aff, h, is_autrice)
where t.ia_verdict = 'seed_demo';

-- ✅ Fini. Recharge le mur : soutiens cliquables + fil de réponses (dont « Autrice »).
