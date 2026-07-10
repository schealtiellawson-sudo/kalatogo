-- ============================================================================
-- AUDIT SÉCURITÉ 2026-07-10 — Correctifs RLS
-- À appliquer dans Supabase → SQL Editor.
-- Contexte : le frontend interroge Supabase DIRECTEMENT depuis le navigateur
-- avec la clé anon de l'utilisateur, donc chaque table doit avoir des policies
-- correctes. Plusieurs tables "admin" avaient USING(true) (monde entier r/w),
-- protégées seulement par un "check admin" côté frontend que RLS ignore.
-- Email fondateur/admin : schealtiellawson@gmail.com
-- ============================================================================


-- ############################################################################
-- BLOC A — SÛR À EXÉCUTER MAINTENANT (aucun risque de casser un dashboard)
-- ############################################################################

-- --- A1. wozali_prestataires : UPDATE sans WITH CHECK -----------------------
-- Sans WITH CHECK, un user peut réassigner user_id de sa ligne vers une victime.
-- (Ne bloque PAS encore l'auto-passage Pro sur sa propre ligne — voir BLOC B, B1.)
DROP POLICY IF EXISTS "prest_update_self" ON wozali_prestataires;
CREATE POLICY "prest_update_self" ON wozali_prestataires
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- A2. wozali_candidatures_pionniers : PII candidats agents ---------------
-- Le navigateur ne lit JAMAIS cette table directement (admin passe par l'API
-- service_role /api/wozali-pay/agents-terrain). On la verrouille : plus aucune
-- policy client → seul service_role (backend) y accède.
DROP POLICY IF EXISTS "candp_auth_read"   ON wozali_candidatures_pionniers;
DROP POLICY IF EXISTS "candp_auth_update" ON wozali_candidatures_pionniers;
-- (garder candp_service_all + candp_public_insert si le formulaire public insère ;
--  si l'insert public n'existe plus, le retirer aussi.)

-- --- A3. wozali_ambassadeurs : monde entier r/w + auto-Pro gratuit ----------
-- admin_all USING(true) WITH CHECK(true) = tout le monde lit + s'octroie pro_offert.
-- On garde le self_read (l'ambassadeur voit sa propre ligne) et on limite l'accès
-- total à l'admin.
DROP POLICY IF EXISTS "admin_all_ambassadeurs" ON wozali_ambassadeurs;
CREATE POLICY "admin_all_ambassadeurs" ON wozali_ambassadeurs
  FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = 'schealtiellawson@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'schealtiellawson@gmail.com');
-- (self_read + public_insert conservés tels quels)

-- --- A4. agent_contrats : lecture/écriture de tous les contrats + signatures -
-- SELECT/UPDATE étaient USING(true). On limite à SA propre ligne OU admin.
DROP POLICY IF EXISTS "agent_contrats_select" ON agent_contrats;
CREATE POLICY "agent_contrats_select" ON agent_contrats
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR (auth.jwt() ->> 'email') = 'schealtiellawson@gmail.com');
DROP POLICY IF EXISTS "agent_contrats_update" ON agent_contrats;
CREATE POLICY "agent_contrats_update" ON agent_contrats
  FOR UPDATE TO authenticated
  USING      (agent_id = auth.uid() OR (auth.jwt() ->> 'email') = 'schealtiellawson@gmail.com')
  WITH CHECK (agent_id = auth.uid() OR (auth.jwt() ->> 'email') = 'schealtiellawson@gmail.com');
-- (agent_contrats_insert self-scopé conservé)


-- ############################################################################
-- BLOC B — À RELIRE AVANT D'EXÉCUTER (touchent des lectures multi-rôles)
-- Ces tables sont lues depuis le navigateur par PLUSIEURS rôles (agent,
-- responsable, public…). Vérifie chaque dashboard après application.
-- ############################################################################

-- --- B1. Empêcher l'auto-passage Pro / badge / score sur sa propre ligne ----
-- ⚠️ IMPORTANT : ceci CASSE l'activation Pro côté client (onPaymentSuccess qui
-- fait un update Abonnement='Pro' dans le navigateur). L'activation Pro DOIT
-- alors passer côté serveur (le webhook FedaPay le fait déjà via service_role,
-- qui contourne ce trigger). N'exécute ce bloc QUE quand l'activation Pro est
-- 100% côté serveur, sinon les paiements ne débloqueront plus le Pro.
--
-- CREATE OR REPLACE FUNCTION protect_prest_privileged_cols()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF auth.role() <> 'service_role' THEN
--     NEW.abonnement       := OLD.abonnement;
--     NEW.badge_verifie     := OLD.badge_verifie;
--     NEW.recruteur_verifie := OLD.recruteur_verifie;
--     NEW.score_wozali      := OLD.score_wozali;
--     NEW.note_moyenne      := OLD.note_moyenne;
--     NEW.nb_avis_recus     := OLD.nb_avis_recus;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- DROP TRIGGER IF EXISTS trg_protect_prest_cols ON wozali_prestataires;
-- CREATE TRIGGER trg_protect_prest_cols BEFORE UPDATE ON wozali_prestataires
--   FOR EACH ROW EXECUTE FUNCTION protect_prest_privileged_cols();

-- --- B2. wozali_kpi_semaines (admin_all USING(true)) ------------------------
-- Le responsable (role='responsable', PAS l'email admin) lit la KPI de son
-- équipe depuis le navigateur. Une policy admin-email seule casserait ça.
-- Recommandé : garder service_role + admin-email, et ajouter une policy de
-- lecture pour le responsable via la table agents_terrain. À concevoir selon
-- la relation exacte responsable→équipe. NE PAS mettre admin-email seul.

-- --- B3. temoignages_abus (temo_abus_update_auth USING(true)) ---------------
-- Un update client "auto-alerte" (app.js ~15732) écrit note_moderateur.
-- Passer l'UPDATE en admin-only casserait cet auto-alerte. Recommandé :
-- déplacer cet auto-alerte côté serveur, puis :
--   DROP POLICY "temo_abus_update_auth" ON temoignages_abus;
--   CREATE POLICY "temo_abus_update_admin" ON temoignages_abus FOR UPDATE
--     TO authenticated USING ((auth.jwt()->>'email')='schealtiellawson@gmail.com')
--     WITH CHECK ((auth.jwt()->>'email')='schealtiellawson@gmail.com');
-- + exposer les témoignages publiés via une VUE sans les colonnes PII
--   (nom, prenom, email du signalant) plutôt que la table brute.

-- --- B4. wolo_temoignages (temoignages_update_own USING(true)) --------------
-- N'importe qui peut publier/éditer un témoignage public. Recommandé :
--   DROP POLICY "temoignages_update_own" ON wolo_temoignages;   -- admin/service_role only
--   DROP POLICY "temoignages_insert_own" ON wolo_temoignages;
--   CREATE POLICY "temoignages_insert_auth" ON wolo_temoignages FOR INSERT
--     TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- --- B5. responsable_plans_action ("Auth update note fondateur" USING(true)) -
-- La 2e policy UPDATE large annule la policy owner-scopée (policies OR-combinées).
-- Recommandé : DROP la policy large ; éditer note_fondateur via service_role ou
-- admin-email ; scoper SELECT à responsable_id = auth.uid() OR admin.

-- --- B6. wolo_posts_v2 (posts_v2_update_any) + wolo_match_demandes ----------
-- UPDATE ouvert à tout authentifié (prévu pour incrémenter compteurs), mais
-- permet d'éditer le contenu/actif d'autrui. Recommandé : compteurs via RPC
-- SECURITY DEFINER + UPDATE owner-scopé (auth.uid() = auteur_user_id).

-- ============================================================================
-- FIN. Applique le BLOC A immédiatement. Relis le BLOC B et applique table par
-- table en vérifiant les dashboards concernés (agent, responsable, admin).
-- ============================================================================
