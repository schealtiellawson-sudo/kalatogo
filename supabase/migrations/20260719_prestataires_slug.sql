-- ================================================================
-- Slug indexé pour les profils prestataires (SEO + scale)
-- Objectif : retrouver un profil par son URL en lecture indexée
-- (instantané même avec des milliers de profils) au lieu de scanner
-- toute la table. La colonne slug devient la source de vérité,
-- générée automatiquement par trigger (même formule que le client :
-- nom + métier + ville, sans accents), unique (suffixe sur homonymes).
-- ================================================================

create extension if not exists unaccent;

alter table public.wozali_prestataires
  add column if not exists slug text;

-- Génère le slug avant chaque insert/update des champs concernés.
create or replace function public.wozali_gen_slug()
returns trigger as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := trim(both '-' from regexp_replace(
    lower(unaccent(
      coalesce(NEW.nom_complet, '') || ' ' ||
      coalesce(NEW.metier_principal, '') || ' ' ||
      coalesce(NEW.ville, '')
    )),
    '[^a-z0-9]+', '-', 'g'
  ));
  if base = '' then base := 'pro'; end if;
  candidate := base;
  -- Unicité : si le slug est déjà pris par un AUTRE profil, on suffixe
  -- avec un fragment de l'id, en l'allongeant jusqu'à être unique.
  while exists (
    select 1 from public.wozali_prestataires p
    where p.slug = candidate and p.id <> NEW.id
  ) loop
    n := n + 1;
    candidate := base || '-' || substr(replace(NEW.id::text, '-', ''), 1, 3 + n);
  end loop;
  NEW.slug := candidate;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_wozali_slug on public.wozali_prestataires;
create trigger trg_wozali_slug
  before insert or update of nom_complet, metier_principal, ville
  on public.wozali_prestataires
  for each row execute function public.wozali_gen_slug();

-- Backfill des profils existants : un update no-op déclenche le trigger.
update public.wozali_prestataires
  set nom_complet = nom_complet
  where slug is null;

-- Index unique : lecture instantanée par slug + garantit l'unicité.
create unique index if not exists idx_wozali_prestataires_slug
  on public.wozali_prestataires (slug);
