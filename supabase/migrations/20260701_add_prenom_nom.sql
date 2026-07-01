-- ================================================================
-- WOZALI — Ajout Prénom + Nom réels sur les prestataires
-- 'nom_complet' reste le nom d'affichage public.
-- 'prenom' / 'nom' = identité réelle (privée), sert à personnaliser
-- les messages (séquences WhatsApp + messages fondateur) avec le prénom.
-- Table : wozali_prestataires (renommée depuis wolo_prestataires en 05/2026).
-- Idempotent : peut être relancé sans risque.
-- ================================================================

ALTER TABLE wozali_prestataires ADD COLUMN IF NOT EXISTS prenom TEXT;
ALTER TABLE wozali_prestataires ADD COLUMN IF NOT EXISTS nom    TEXT;

-- Backfill : pour les prestataires existants sans prénom, dériver depuis nom_complet
UPDATE wozali_prestataires
   SET prenom = split_part(nom_complet, ' ', 1)
 WHERE (prenom IS NULL OR prenom = '')
   AND nom_complet IS NOT NULL
   AND nom_complet <> '';
