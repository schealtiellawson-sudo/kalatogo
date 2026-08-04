-- ════════════════════════════════════════════════════════════
-- WOZALI — Cluster BTP « Mon chantier » (créateur de devis + pipeline).
-- SQL Editor → Run. Idempotent. Réutilise wozali_depenses/objectifs.
-- ════════════════════════════════════════════════════════════

-- Le devis existant (demande client) devient un vrai document éditable côté artisan
alter table wozali_devis add column if not exists numero        text;
alter table wozali_devis add column if not exists ent_nom       text;   -- entreprise
alter table wozali_devis add column if not exists ent_infos     text;   -- activité / adresse / contact / RCCM
alter table wozali_devis add column if not exists client_nom    text;
alter table wozali_devis add column if not exists client_infos  text;
alter table wozali_devis add column if not exists objet         text;
alter table wozali_devis add column if not exists lignes        jsonb;  -- [{designation,qte,unite,pu}]
alter table wozali_devis add column if not exists remise        integer default 0;
alter table wozali_devis add column if not exists total         integer default 0;   -- montant du devis (nourrit les finances)
alter table wozali_devis add column if not exists acompte_pct   integer default 0;
alter table wozali_devis add column if not exists delai         text;
alter table wozali_devis add column if not exists validite      text;
alter table wozali_devis add column if not exists date_termine  date;

-- client_user_id peut être NULL (l'artisan crée un devis pour un client pas encore sur WOZALI)
alter table wozali_devis alter column client_user_id drop not null;

-- statuts : demande (client) · a_chiffrer · envoye · accepte · refuse · en_cours · termine · annule
alter table wozali_devis drop constraint if exists wozali_devis_statut_check;
alter table wozali_devis drop constraint if exists wolo_devis_statut_check;

alter table wozali_devis enable row level security;
drop policy if exists "devis_select_party" on wozali_devis;
drop policy if exists "devis_insert_pro"   on wozali_devis;
drop policy if exists "devis_insert_client" on wozali_devis;
drop policy if exists "devis_update_pro"   on wozali_devis;
-- Le client peut créer une demande ; le pro peut créer/éditer ses devis
create policy "devis_insert_client" on wozali_devis for insert with check (auth.uid() = client_user_id);
create policy "devis_insert_pro"    on wozali_devis for insert with check (auth.uid() = prestataire_user_id);
create policy "devis_select_party"  on wozali_devis for select using (auth.uid() = prestataire_user_id or auth.uid() = client_user_id);
create policy "devis_update_pro"    on wozali_devis for update using (auth.uid() = prestataire_user_id);
create index if not exists idx_devis_pro on wozali_devis(prestataire_user_id, created_at);

-- ✅ Fini.
