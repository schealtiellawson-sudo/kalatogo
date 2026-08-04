-- ════════════════════════════════════════════════════════════
-- WOZALI — Cluster Coiffure « Mon salon ». SQL Editor → Run. Idempotent.
-- wozali_depenses / wozali_objectifs sont déjà créées (écran 2 boutique) et réutilisées.
-- ════════════════════════════════════════════════════════════
alter table wozali_rdv add column if not exists prestation_id  uuid;
alter table wozali_rdv add column if not exists prestation_nom text;

-- Le workflow ajoute les statuts 'Honoré' et 'Absent' → on élargit la contrainte
alter table wozali_rdv drop constraint if exists wolo_rdv_statut_check;
alter table wozali_rdv add constraint wolo_rdv_statut_check
  check (statut in ('Demandé','En attente','Confirmé','Honoré','Absent','Annulé','Vue','Retenue','Refusée','Terminé'));

alter table wozali_rdv enable row level security;
drop policy if exists "rdv_select_party" on wozali_rdv;
drop policy if exists "rdv_insert_client" on wozali_rdv;
drop policy if exists "rdv_update_pro" on wozali_rdv;
create policy "rdv_select_party" on wozali_rdv
  for select using (auth.uid() = prestataire_user_id or auth.uid() = client_user_id);
create policy "rdv_insert_client" on wozali_rdv
  for insert with check (auth.uid() = client_user_id);
create policy "rdv_update_pro" on wozali_rdv
  for update using (auth.uid() = prestataire_user_id);
create index if not exists idx_rdv_pro on wozali_rdv(prestataire_user_id, date_rdv);

-- ✅ Fini. Statuts utilisés : 'Demandé' → 'Confirmé' → 'Honoré' | 'Absent' | 'Annulé'.
