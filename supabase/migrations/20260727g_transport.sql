-- ============================================================
-- WOZALI — Transport & Courses (Module "Mes courses")
-- (2026-07-27) Cluster métier transport : livreur, chauffeur/taxi,
--   zémidjan (moto-taxi), laveur auto…
--   Le pro affiche un bandeau « Disponible maintenant » (statut lu depuis
--   son profil) + une liste de courses types à tarif fixe
--   (ex : « Aéroport → centre : 2 500 F »), sur son profil public, avec un
--   bouton « Réserver » par course. La réservation se crée EN INTERNE
--   (wozali_commandes + notification wozali_notifications), JAMAIS via WhatsApp.
--   Le pro gère ses courses depuis son dashboard (section ds-courses).
--
-- Colonnes calées EXACTEMENT sur les inserts front :
--   wozali_courses   ← saveCourse
--   wozali_commandes ← reserverCourse (type 'course', table réutilisée, PAS recréée)
-- Style identique aux migrations 20260727_catalogue_items.sql /
-- 20260727b_prestations.sql / 20260727c_chantiers.sql /
-- 20260727d_atelier.sql / 20260727e_creatif.sql / 20260727f_resto.sql. Idempotent.
-- ============================================================

-- ── Courses types (items affichés sur le profil public) ──
CREATE TABLE IF NOT EXISTS public.wozali_courses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,               -- ex : 'Aéroport → centre-ville'
  prix_txt       TEXT,                        -- libellé libre du tarif, ex : '2 500 F'
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user_ordre ON public.wozali_courses(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_courses_actif      ON public.wozali_courses(actif);

-- ── RLS : lecture publique des courses actives, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_public_read" ON public.wozali_courses;
DROP POLICY IF EXISTS "courses_self_insert" ON public.wozali_courses;
DROP POLICY IF EXISTS "courses_self_update" ON public.wozali_courses;
DROP POLICY IF EXISTS "courses_self_delete" ON public.wozali_courses;

CREATE POLICY "courses_public_read" ON public.wozali_courses FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "courses_self_insert" ON public.wozali_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "courses_self_update" ON public.wozali_courses FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "courses_self_delete" ON public.wozali_courses FOR DELETE
  USING (auth.uid() = user_id);

-- ── Réservations : réutilise public.wozali_commandes (créée par 20260727d_atelier.sql).
-- reserverCourse insère avec type = 'course'. Aucune table réservation recréée ici.
-- Le CHECK sur statut accepte déjà 'recue' (valeur par défaut utilisée à l'insert).
