-- ============================================================
-- WOZALI — Filtre anti-sollicitation sur les bios prestataires
-- Bloque au niveau base de données (pas contournable côté client)
-- toute description contenant des formulations de sollicitation
-- de service sexuel tarifé, en complément des CGU (Article 8).
-- ============================================================

CREATE OR REPLACE FUNCTION wozali_check_description_sollicitation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  texte TEXT;
  motifs TEXT[] := ARRAY[
    'massage complet', 'massage integral', 'massage érotique', 'massage erotique',
    'accompagnement adulte', 'escort', 'call girl', 'callgirl',
    'rencontre coquine', 'service intime', 'tarif nuit', 'nuit complete',
    'nuit complète', 'relation tarifee', 'relation tarifée', 'passe complete',
    'passe complète', 'sans tabou', 'domicile discret'
  ];
  motif TEXT;
BEGIN
  texte := lower(coalesce(NEW.description_services, ''));
  FOREACH motif IN ARRAY motifs LOOP
    IF texte LIKE '%' || motif || '%' THEN
      RAISE EXCEPTION 'Description non autorisée : contenu correspondant à une sollicitation de service tarifé (Article 8 des CGU WOZALI). Signalement automatique.';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wozali_check_sollicitation ON wozali_prestataires;
CREATE TRIGGER trg_wozali_check_sollicitation
  BEFORE INSERT OR UPDATE OF description_services ON wozali_prestataires
  FOR EACH ROW EXECUTE FUNCTION wozali_check_description_sollicitation();
