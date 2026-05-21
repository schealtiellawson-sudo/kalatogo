-- Migration : ajouter colonne salaire_affiche à wozali_offres_emploi
-- Permet d'afficher ou masquer le salaire sur les offres d'emploi WOZALI Jobs
-- Valeur par défaut TRUE si salaire_min_fcfa est renseigné (rétrocompat)

ALTER TABLE IF EXISTS wozali_offres_emploi
  ADD COLUMN IF NOT EXISTS salaire_affiche BOOLEAN DEFAULT TRUE;

-- Mettre à TRUE pour toutes les offres existantes qui ont déjà un salaire renseigné
UPDATE wozali_offres_emploi
SET salaire_affiche = TRUE
WHERE salaire_min_fcfa IS NOT NULL
  AND salaire_affiche IS NULL;
