-- ================================================================
-- WOLO Market — Fix trigger auth : "Database error saving new user"
-- Date : 2026-04-30
-- Cause : handle_new_auth_user() plante si profiles/wolo_credit/
--         abonnements n'existent pas ou ont une contrainte qui echoue.
-- Fix  : 1) S'assurer que profiles existe (table de base Supabase)
--        2) Rendre le trigger resilient avec EXCEPTION blocks
--        3) Ne pas bloquer l'inscription meme si tables manquantes
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1) Creer la table profiles si elle n'existe pas encore
--    (Supabase ne la cree pas automatiquement)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE,
  pays        text,
  plan        text DEFAULT 'gratuit',
  code_parrainage text UNIQUE,
  qr_code_url text,
  metier      text,
  quartier    text,
  ville       text,
  photo_url   text,
  vues_mois   integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────
-- 2) Trigger resilient : chaque INSERT est isole dans un bloc
--    EXCEPTION pour ne jamais bloquer la creation de compte.
--    La creation complete du profil reste dans submitInscription().
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profil de base (peut echouer si table absente ou email duplique)
  BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL; -- ne pas bloquer l'inscription
  END;

  -- Credit WOLO (depend de profiles)
  BEGIN
    INSERT INTO public.wolo_credit (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  -- Abonnement gratuit par defaut
  BEGIN
    INSERT INTO public.abonnements (user_id, plan, statut)
    VALUES (NEW.id, 'gratuit', 'actif')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrée le trigger (DROP + CREATE pour forcer le remplacement)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
