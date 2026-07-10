-- Fix : agents_terrain avait RLS activé sans AUCUNE policy côté client
-- (voir 20260413_agents_terrain.sql, commentaire "accès uniquement via service_role").
-- Résultat : le dashboard (qui lit la table depuis le navigateur avec la clé
-- authentifiée de l'utilisateur, pas service_role) ne pouvait jamais voir le
-- rôle de personne, agent ou responsable. Ce n'était pas spécifique à un compte.
-- 2026-07-10

CREATE POLICY "agents_terrain_self_select" ON agents_terrain
  FOR SELECT
  USING (user_id = auth.uid());
