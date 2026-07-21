-- ============================================================================
-- VAGUE 1a - Réparer la chaîne de candidature (côté serveur/données)
-- Date : 2026-07-21
-- À appliquer dans Supabase → SQL Editor, dans l'ordre ci-dessous.
-- ============================================================================


-- ############################################################################
-- 1) Colonne candidat_score_wolo → candidat_score_wozali
-- ----------------------------------------------------------------------------
-- La migration de renommage 20260519_b_rename_wolo_tables.sql ne renomme
-- score_wolo → score_wozali QUE sur wozali_prestataires. La colonne
-- candidat_score_wolo de wozali_candidatures n'a jamais été touchée, alors
-- que le mapping frontend (components/supa-candidatures.js) écrit dans
-- 'candidat_score_wozali'. Si la colonne n'existe pas sous ce nom, toute
-- insertion de candidature qui renseigne ce champ échoue.
-- Postgres met à jour automatiquement les vues dépendantes (ex:
-- wolo_candidatures_airtable_compat) lors d'un RENAME COLUMN : rien d'autre
-- à recréer.
-- ############################################################################
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wozali_candidatures' AND column_name = 'candidat_score_wolo'
  ) THEN
    ALTER TABLE wozali_candidatures RENAME COLUMN candidat_score_wolo TO candidat_score_wozali;
    RAISE NOTICE 'Colonne renommée : wozali_candidatures.candidat_score_wolo → candidat_score_wozali';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wozali_candidatures' AND column_name = 'candidat_score_wozali'
  ) THEN
    RAISE NOTICE 'Colonne déjà nommée candidat_score_wozali, rien à faire.';
  ELSE
    RAISE WARNING 'Ni candidat_score_wolo ni candidat_score_wozali trouvée sur wozali_candidatures - vérifier le schéma.';
  END IF;
END $$;


-- ############################################################################
-- 2) Fonction increment_vues_offre(offre_id) - SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- incrementVues() existait côté JS (components/supa-offres.js) mais n'était
-- jamais appelable par un non-propriétaire : la policy RLS "offres_update_own"
-- restreint l'UPDATE de wozali_offres_emploi au recruteur propriétaire. Un
-- visiteur/candidat qui ouvre une offre ne peut donc pas en incrémenter les
-- vues. Cette fonction tourne avec les droits du propriétaire de la fonction
-- (service), contourne la RLS de façon contrôlée (une seule colonne, +1
-- uniquement) et est appelable par n'importe quel rôle authentifié ou anonyme.
-- ############################################################################
CREATE OR REPLACE FUNCTION increment_vues_offre(p_offre_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new INT;
BEGIN
  UPDATE wozali_offres_emploi
    SET nb_vues = COALESCE(nb_vues, 0) + 1
    WHERE id = p_offre_id
    RETURNING nb_vues INTO v_new;
  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_vues_offre(UUID) TO anon, authenticated;


-- ############################################################################
-- 3) Statut "Embauché" refusé par la contrainte CHECK
-- ----------------------------------------------------------------------------
-- Le bouton Embaucher crée la fiche employé (wozali_employes) PUIS tente de
-- mettre à jour wozali_candidatures.statut = 'Embauché', ce que la contrainte
-- CHECK d'origine (En attente / Vue / Retenue / Refusée) refuse. Le nom exact
-- de la contrainte auto-générée peut avoir survécu au renommage de table
-- wolo_candidatures → wozali_candidatures (Postgres ne renomme pas les
-- contraintes lors d'un ALTER TABLE ... RENAME TO), donc on la retrouve
-- dynamiquement plutôt que de deviner son nom.
-- ############################################################################
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'wozali_candidatures'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%statut%En attente%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE wozali_candidatures DROP CONSTRAINT %I', con_name);
    RAISE NOTICE 'Contrainte CHECK statut supprimée : %', con_name;
  END IF;
END $$;

ALTER TABLE wozali_candidatures
  ADD CONSTRAINT wozali_candidatures_statut_check
  CHECK (statut IN ('En attente','Vue','Retenue','Refusée','Embauché'));


-- ############################################################################
-- 4) Dédoublonnage des candidatures - index unique (offre, candidat)
-- ----------------------------------------------------------------------------
-- Rien n'empêchait un candidat de postuler deux fois à la même offre ; la
-- vérification frontend était plafonnée aux 50 dernières candidatures
-- (window.supaCandidatures.list({ limit: 50 })). Index partiel : ne
-- contraint que les lignes où offre_id ET candidat_user_id sont renseignés
-- (les anciennes lignes pré-migration, sans offre_id, ne sont pas concernées).
-- ⚠️ Si des doublons existent déjà en prod sur (offre_id, candidat_user_id),
-- cette création échouera - dédupliquer d'abord avec une requête du type :
--   SELECT offre_id, candidat_user_id, COUNT(*) FROM wozali_candidatures
--   WHERE offre_id IS NOT NULL AND candidat_user_id IS NOT NULL
--   GROUP BY 1,2 HAVING COUNT(*) > 1;
-- ############################################################################
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidatures_offre_candidat
  ON wozali_candidatures (offre_id, candidat_user_id)
  WHERE offre_id IS NOT NULL AND candidat_user_id IS NOT NULL;


-- ############################################################################
-- 5) Table wozali_notifications - fondation notifications serveur
-- ----------------------------------------------------------------------------
-- Aujourd'hui, toute notification (like, commentaire, avis, abonnement,
-- favori, RDV, statut de candidature) est écrite par la fonction JS qui agit,
-- DEPUIS LE NAVIGATEUR DE CELUI QUI AGIT, dans le champ Notifications JSON du
-- DESTINATAIRE. RLS bloque ça (un utilisateur ne peut modifier que sa propre
-- ligne wozali_prestataires) donc le destinataire ne reçoit jamais rien.
-- Cette table centralise les notifications serveur, avec RLS self-only en
-- lecture/écriture-lu, et une voie d'insertion pour un utilisateur qui veut
-- notifier un autre (function SECURITY DEFINER) sans jamais pouvoir lire les
-- notifications de la victime potentielle.
-- ############################################################################
CREATE TABLE IF NOT EXISTS wozali_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  lu          BOOLEAN NOT NULL DEFAULT FALSE,
  push_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wozali_notifications_user_lu_created
  ON wozali_notifications (user_id, lu, created_at DESC);

ALTER TABLE wozali_notifications ENABLE ROW LEVEL SECURITY;

-- Chacun lit uniquement les siennes.
DROP POLICY IF EXISTS "wozali_notif_select_self" ON wozali_notifications;
CREATE POLICY "wozali_notif_select_self" ON wozali_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Chacun met à jour (marquer lu) uniquement les siennes.
DROP POLICY IF EXISTS "wozali_notif_update_self" ON wozali_notifications;
CREATE POLICY "wozali_notif_update_self" ON wozali_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Aucune policy INSERT/DELETE pour les rôles client : l'écriture passe soit
-- par le service_role (pushNotification côté serveur, api/_lib/notifications.js),
-- soit par la fonction SECURITY DEFINER ci-dessous pour un usage direct
-- depuis le navigateur (ex: un like) sans jamais pouvoir lire les
-- notifications d'autrui.
CREATE OR REPLACE FUNCTION notifier_utilisateur(p_user_id UUID, p_type TEXT, p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO wozali_notifications (user_id, type, payload)
  VALUES (p_user_id, p_type, p_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION notifier_utilisateur(UUID, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
