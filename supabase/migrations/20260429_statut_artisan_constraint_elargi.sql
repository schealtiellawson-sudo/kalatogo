-- ================================================================
-- Élargissement de la contrainte CHECK sur wolo_prestataires.statut_artisan
-- Date : 2026-04-29
-- Avant : CHECK IN ('apprentie', 'patronne', 'independante')
-- Après : CHECK IN ('ambulant','ambulant_solo','apprenti','apprentie',...) — 49 valeurs
-- (Source : components/metier-statuts-config.js — agent recherche métiers AOC)
-- ================================================================

ALTER TABLE wolo_prestataires
  DROP CONSTRAINT IF EXISTS wolo_prestataires_statut_artisan_check;

ALTER TABLE wolo_prestataires
  ADD CONSTRAINT wolo_prestataires_statut_artisan_check
  CHECK (
    statut_artisan IS NULL OR statut_artisan IN (
      'ambulant', 'ambulant_solo', 'apprenti', 'apprentie',
      'autodidacte', 'autodidacte_freelance',
      'commission', 'compagnon', 'confirme', 'debut',
      'employe', 'employe_agence', 'employe_cabinet', 'employe_structure',
      'employee', 'employee_fixe',
      'etudiant_freelance', 'fixe', 'forme_freelance',
      'freelance', 'freelance_confirme', 'freelance_debutant',
      'freelance_extra', 'freelance_forme', 'freelance_multi',
      'heritier', 'independant', 'independante',
      'mama_cantine', 'marche',
      'patron', 'patron_agence', 'patron_boutique', 'patron_cabinet',
      'patron_centre', 'patron_centre_tradi', 'patron_equipe',
      'patron_flotte', 'patron_spa', 'patron_studio',
      'patronne', 'ponctuelle', 'proprietaire',
      'resident_studio', 'salarie', 'salarie_plateforme',
      'sans_diplome', 'traiteur', 'traiteur_solo'
    )
  );
