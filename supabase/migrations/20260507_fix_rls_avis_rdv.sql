-- ================================================================
-- S3 — Fix RLS trop permissive sur wolo_avis et wolo_rdv
-- Date : 2026-05-07
-- ================================================================
-- PROBLÈME :
--   La migration 20260428_airtable_jobs_avis_rdv.sql a créé deux
--   policies INSERT avec WITH CHECK (TRUE) :
--     - "avis_insert_any" sur wolo_avis
--     - "rdv_insert_any" sur wolo_rdv
--   Conséquence : n'importe quel client (y compris un anon avec la
--   clé publique anon) peut spammer 1000 avis 5★ ou créer des RDV
--   fantômes en masse au nom de n'importe qui.
--
-- FIX :
--   1) Drop des policies trop permissives.
--   2) Recrée des policies strictes :
--      - wolo_avis  INSERT : auth.uid() obligatoire ET = auteur_user_id
--                            (le user inscrit doit être l'auteur revendiqué)
--      - wolo_rdv   INSERT : auth.uid() obligatoire ET = client_user_id
--                            (le user inscrit doit être le client)
--   3) Ajoute un trigger BEFORE INSERT qui force auteur_user_id /
--      client_user_id à auth.uid() si la colonne arrive NULL,
--      ce qui garantit la cohérence même si le frontend l'oublie.
--
-- IMPACT FRONTEND :
--   - Les insertions anonymes (anon key, sans login) sont désormais
--     rejetées avec "new row violates row-level security policy".
--   - Les flows existants doivent passer par un user authentifié
--     (currentUser.id) ou par un endpoint serveur qui utilise
--     SUPABASE_SERVICE_KEY (qui contourne le RLS, donc à protéger
--     côté API par requireAuth + validation applicative).
--
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1) Drop policies trop permissives
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "avis_insert_any" ON wolo_avis;
DROP POLICY IF EXISTS "rdv_insert_any"  ON wolo_rdv;

-- (par précaution, on drop aussi des variantes éventuelles)
DROP POLICY IF EXISTS "avis_insert_open" ON wolo_avis;
DROP POLICY IF EXISTS "rdv_insert_open"  ON wolo_rdv;

-- ────────────────────────────────────────────────────────────────
-- 2) Triggers BEFORE INSERT — défaut auth.uid()
--    Garantit que auteur_user_id / client_user_id sont toujours peuplés
--    par l'identité réelle du user inscrit (auth.uid()), pas une valeur
--    arbitraire fournie par le client.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION wolo_avis_set_auteur()
RETURNS TRIGGER AS $$
BEGIN
  -- Toujours forcer auteur_user_id à l'identité authentifiée
  -- (empêche un user de poster un avis "au nom" d'un autre user)
  IF auth.uid() IS NOT NULL THEN
    NEW.auteur_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_avis_set_auteur ON wolo_avis;
CREATE TRIGGER trg_avis_set_auteur
  BEFORE INSERT ON wolo_avis
  FOR EACH ROW EXECUTE FUNCTION wolo_avis_set_auteur();

CREATE OR REPLACE FUNCTION wolo_rdv_set_client()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.client_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rdv_set_client ON wolo_rdv;
CREATE TRIGGER trg_rdv_set_client
  BEFORE INSERT ON wolo_rdv
  FOR EACH ROW EXECUTE FUNCTION wolo_rdv_set_client();

-- ────────────────────────────────────────────────────────────────
-- 3) Policies strictes
-- ────────────────────────────────────────────────────────────────

-- wolo_avis : seul un user authentifié peut INSERT, et auteur_user_id
-- doit correspondre à son auth.uid() (le trigger ci-dessus le force,
-- la policy garantit qu'aucun bypass n'est possible).
CREATE POLICY "avis_insert_authenticated"
  ON wolo_avis
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = auteur_user_id
  );

-- wolo_rdv : seul un user authentifié peut INSERT, et client_user_id
-- doit correspondre à son auth.uid().
CREATE POLICY "rdv_insert_authenticated"
  ON wolo_rdv
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = client_user_id
  );

-- ────────────────────────────────────────────────────────────────
-- 4) Vérification (commenté — à dérouler manuellement après apply)
-- ────────────────────────────────────────────────────────────────
-- SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--  WHERE tablename IN ('wolo_avis','wolo_rdv') AND cmd = 'INSERT';
--
-- Test attendu : un INSERT avec la clé anon publique (sans JWT)
-- doit retourner :
--   ERROR: new row violates row-level security policy for table "wolo_avis"
