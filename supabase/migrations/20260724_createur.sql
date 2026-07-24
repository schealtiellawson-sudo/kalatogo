-- ============================================================
-- WOZALI — Programme Créateur : backend paliers + badges + kill switch (2026-07-24)
-- Paliers (Pro actifs = Pro abonné ET connecté < 60j, Togo/Bénin uniquement) :
--   >= 3  → 'outils'    (outils Créateur + Sandy Coach débloqués)
--   >= 25 → 'createur'  (badge Créateur WOZALI public)
--   >= 50 → 'or'        (badge Or + mise en avant accueil)
-- Aucun bonus cash par palier (visibilité/outils uniquement).
-- ============================================================

ALTER TABLE wozali_prestataires
  ADD COLUMN IF NOT EXISTS createur_niveau      text    DEFAULT 'none',   -- none | outils | createur | or
  ADD COLUMN IF NOT EXISTS createur_pro_actifs  integer DEFAULT 0,        -- Pro actifs 60j parrainés
  ADD COLUMN IF NOT EXISTS createur_pro_mois    integer DEFAULT 0,        -- Pro actifs signés ce mois
  ADD COLUMN IF NOT EXISTS createur_maj         timestamptz,              -- dernier recalcul
  ADD COLUMN IF NOT EXISTS createur_suspendu    boolean DEFAULT false,    -- kill switch par-Créateur
  ADD COLUMN IF NOT EXISTS createur_charte_ok   boolean DEFAULT false,    -- charte acceptée
  ADD COLUMN IF NOT EXISTS createur_charte_at   timestamptz;

-- Interrupteur global du programme (kill switch massif)
CREATE TABLE IF NOT EXISTS wozali_flags (
  nom   text PRIMARY KEY,
  actif boolean DEFAULT true,
  maj   timestamptz DEFAULT now()
);
INSERT INTO wozali_flags (nom, actif) VALUES ('createur_programme', true)
  ON CONFLICT (nom) DO NOTHING;

-- ── Recalcul global des paliers Créateur ──
CREATE OR REPLACE FUNCTION wz_createur_recompute() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Créateurs avec au moins un filleul : compter les Pro actifs 60j Togo/Bénin
  WITH counts AS (
    SELECT p.id AS createur_id,
      count(*) FILTER (
        WHERE f.abonnement IS DISTINCT FROM 'Base'
          AND f.derniere_connexion >= now() - interval '60 days'
          AND f.pays IN ('Togo','TG','Bénin','Benin','BJ')
      ) AS pro_actifs,
      count(*) FILTER (
        WHERE f.abonnement IS DISTINCT FROM 'Base'
          AND f.derniere_connexion >= now() - interval '60 days'
          AND f.pays IN ('Togo','TG','Bénin','Benin','BJ')
          AND f.created_at >= date_trunc('month', now())
      ) AS pro_mois
    FROM wozali_prestataires p
    JOIN wozali_prestataires f ON f.parrain_code = p.code_parrainage
    WHERE p.code_parrainage IS NOT NULL AND p.code_parrainage <> ''
    GROUP BY p.id
  )
  UPDATE wozali_prestataires p
  SET createur_pro_actifs = coalesce(c.pro_actifs, 0),
      createur_pro_mois   = coalesce(c.pro_mois, 0),
      createur_niveau = CASE
        WHEN p.createur_suspendu THEN 'none'
        WHEN coalesce(c.pro_actifs, 0) >= 50 THEN 'or'
        WHEN coalesce(c.pro_actifs, 0) >= 25 THEN 'createur'
        WHEN coalesce(c.pro_actifs, 0) >= 3  THEN 'outils'
        ELSE 'none' END,
      createur_maj = now()
  FROM counts c
  WHERE p.id = c.createur_id;

  -- Créateurs sans filleul (ou plus aucun) : remise à zéro
  UPDATE wozali_prestataires p
  SET createur_pro_actifs = 0, createur_pro_mois = 0,
      createur_niveau = 'none', createur_maj = now()
  WHERE coalesce(p.createur_niveau, 'none') <> 'none'
    AND NOT EXISTS (
      SELECT 1 FROM wozali_prestataires f
      WHERE f.parrain_code = p.code_parrainage
        AND p.code_parrainage IS NOT NULL AND p.code_parrainage <> ''
    );
END$$;

-- ── Classement du mois par ville (momentum : Pro signés ce mois) ──
CREATE OR REPLACE FUNCTION wz_createur_leaderboard(p_ville text)
RETURNS TABLE (
  id text, nom text, photo text, metier text, ville text,
  niveau text, pro_mois integer, pro_actifs integer
) LANGUAGE sql STABLE AS $$
  SELECT id::text, nom_complet, photo_profil, metier_principal, ville,
         createur_niveau, createur_pro_mois, createur_pro_actifs
  FROM wozali_prestataires
  WHERE ville = p_ville
    AND coalesce(createur_niveau, 'none') <> 'none'
    AND coalesce(createur_suspendu, false) = false
  ORDER BY createur_pro_mois DESC, createur_pro_actifs DESC, nom_complet ASC
  LIMIT 20;
$$;
