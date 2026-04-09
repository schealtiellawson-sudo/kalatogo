-- ================================================================
-- WOLO Pay — Sprint 4 · PIN + backfill + contacts favoris
-- ================================================================

-- ---- Backfill Sprint 3 (auth.users -> profiles + wolo_credit + abonnements)
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.wolo_credit (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.abonnements (user_id, plan, statut)
SELECT id, 'gratuit', 'actif' FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ---- Trigger auto-provisioning on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wolo_credit (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.abonnements (user_id, plan, statut) VALUES (NEW.id, 'gratuit', 'actif')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---- Table wolo_pin
CREATE TABLE IF NOT EXISTS public.wolo_pin (
  user_id          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_hash         text NOT NULL,
  salt             text NOT NULL,
  attempts         integer DEFAULT 0,
  locked_until     timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.wolo_pin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_pin" ON public.wolo_pin;
CREATE POLICY "user_own_pin" ON public.wolo_pin FOR SELECT USING (auth.uid() = user_id);

-- ---- wolo_contacts_favoris : assurer présence (déjà Sprint 3) + index
CREATE INDEX IF NOT EXISTS idx_contacts_user_ordre
  ON public.wolo_contacts_favoris (user_id, ordre_affichage);

-- ---- Vue pour recherche utilisateurs par email/téléphone
CREATE OR REPLACE VIEW public.v_wolo_users_search AS
SELECT p.id, p.email, p.pays, p.plan
FROM public.profiles p;
