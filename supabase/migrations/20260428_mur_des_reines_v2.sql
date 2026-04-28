-- ================================================================
-- Sprint 14 v2 — Le Mur des Reines (corrigé 2026-04-28)
-- Adapté de 20260416_sprint14_mur_des_reines.sql
-- Différences :
--   - profiles → wolo_prestataires
--   - profiles.id → auth.users.id (FK directe, plus propre)
--   - p.avatar_url → p.photo_profil
--   - pays : non stocké dans wolo_prestataires, dérivé de ville dans les vues
--   - feed_photos.pays maintenu (reflète ce que l'utilisatrice a posté)
-- ================================================================

-- ════════════════════════════════════════
-- 1) FEED_PHOTOS — photos postées par les femmes
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feed_photos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mois                text NOT NULL,
  photo_url           text NOT NULL,
  photos_url          jsonb DEFAULT '[]'::jsonb,           -- jusqu'à 3 photos (Tinder-like)
  description         text DEFAULT '',
  categorie           text NOT NULL CHECK (categorie IN ('coiffure','couture','libre')),
  quartier            text,
  ville               text,
  pays                text CHECK (pays IN ('TG','BJ')),
  theme_mois          text,
  is_awards_candidate boolean DEFAULT false,
  tag_pro_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- coiffeuse/couturière taguée
  tag_pro_libre       text,                                                -- nom libre si pro pas sur WOLO
  nb_likes            integer DEFAULT 0,
  nb_commentaires     integer DEFAULT 0,
  nb_shares           integer DEFAULT 0,
  nb_vues             integer DEFAULT 0,
  duel_wins           integer DEFAULT 0,
  duel_losses         integer DEFAULT 0,
  duel_streak         integer DEFAULT 0,                   -- série actuelle de victoires
  duel_points         integer DEFAULT 0,                   -- score = wins*10 + losses*1 + bonus streak
  boost_until         timestamptz,
  video_validee       boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_mois ON feed_photos(mois, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_user ON feed_photos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_quartier ON feed_photos(quartier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_ville ON feed_photos(ville, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_categorie ON feed_photos(categorie, mois);
CREATE INDEX IF NOT EXISTS idx_feed_awards ON feed_photos(mois, categorie, pays, is_awards_candidate) WHERE is_awards_candidate = true;
CREATE INDEX IF NOT EXISTS idx_feed_boost ON feed_photos(boost_until) WHERE boost_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_tag_pro ON feed_photos(tag_pro_user_id) WHERE tag_pro_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_duel_points ON feed_photos(mois, categorie, pays, duel_points DESC);

-- ════════════════════════════════════════
-- 2) LIKES_PHOTOS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS likes_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_photo ON likes_photos(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes_photos(user_id);

CREATE OR REPLACE FUNCTION update_feed_nb_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_photos SET nb_likes = nb_likes + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_photos SET nb_likes = GREATEST(0, nb_likes - 1) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_likes_photo_count ON likes_photos;
CREATE TRIGGER trg_likes_photo_count
  AFTER INSERT OR DELETE ON likes_photos
  FOR EACH ROW EXECUTE FUNCTION update_feed_nb_likes();

-- ════════════════════════════════════════
-- 3) COMMENTAIRES_PHOTOS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS commentaires_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu       text NOT NULL CHECK (length(contenu) > 0 AND length(contenu) <= 500),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_photo ON commentaires_photos(photo_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_feed_nb_commentaires()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_photos SET nb_commentaires = nb_commentaires + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_photos SET nb_commentaires = GREATEST(0, nb_commentaires - 1) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comm_photo_count ON commentaires_photos;
CREATE TRIGGER trg_comm_photo_count
  AFTER INSERT OR DELETE ON commentaires_photos
  FOR EACH ROW EXECUTE FUNCTION update_feed_nb_commentaires();

-- ════════════════════════════════════════
-- 4) THEMES_MENSUELS — alternance Coiffure / Couture par mois
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS themes_mensuels (
  mois               text PRIMARY KEY,
  categorie_active   text CHECK (categorie_active IN ('coiffure','couture','finale')),
  theme_coiffure     text,
  theme_couture      text,
  description        text,
  hashtag            text,
  partenaire_marque  text,
  created_at         timestamptz DEFAULT now()
);

-- Seed calendrier 2026 (lancement juin) → décembre = finale annuelle
INSERT INTO themes_mensuels (mois, categorie_active, theme_coiffure, theme_couture, hashtag) VALUES
  ('2026-06', 'coiffure', 'Ma plus belle tresse', NULL,                          '#ReineDeJuin'),
  ('2026-07', 'couture',  NULL,                   'Mon plus beau pagne',         '#ReineDeJuillet'),
  ('2026-08', 'coiffure', 'Coupe d''été',         NULL,                          '#ReineDAout'),
  ('2026-09', 'couture',  NULL,                   'Tenue de rentrée chic',       '#ReineDeSeptembre'),
  ('2026-10', 'coiffure', 'Tresses créatives',    NULL,                          '#ReineDOctobre'),
  ('2026-11', 'couture',  NULL,                   'Robe de cérémonie',           '#ReineDeNovembre'),
  ('2026-12', 'finale',   'Reine de l''Année',    'Reine de l''Année',           '#FinaleReineWOLO'),
  ('2027-01', 'coiffure', 'Nouveau départ',       NULL,                          '#ReineDeJanvier'),
  ('2027-02', 'couture',  NULL,                   'Tenue Saint-Valentin',        '#ReineDeFevrier'),
  ('2027-03', 'coiffure', 'Tresses du 8 mars',    NULL,                          '#ReineDeMars')
ON CONFLICT (mois) DO NOTHING;

-- ════════════════════════════════════════
-- 5) STREAKS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS streaks_wolo (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak   integer DEFAULT 0,
  longest_streak   integer DEFAULT 0,
  last_post_date   date,
  multiplicateur   integer DEFAULT 1,
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_streaks_current ON streaks_wolo(current_streak DESC);

-- ════════════════════════════════════════
-- 6) BADGES_WOLO
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS badges_wolo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type    text NOT NULL CHECK (badge_type IN (
    'premiere_photo',
    'likes_100','likes_500','likes_1000',
    'top_10_mois','podium_mois','gagnante_mois','reine_annee',
    'serie_rouge_7','serie_rouge_30',
    'duel_streak_3','duel_streak_10','duel_invincible_30',
    'coup_coeur_jury',
    'virale_100','virale_500',
    'mentor_5','tag_master',
    'apprentie','ambassadrice','reine','legende'
  )),
  mois          text,
  unlocked_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type, mois)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON badges_wolo(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges_wolo(badge_type, unlocked_at DESC);

-- ════════════════════════════════════════
-- 7) DUELS_QUARTIERS (hebdo)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS duels_quartiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semaine         text NOT NULL,
  type            text NOT NULL CHECK (type IN ('quartier','ville','categorie')),
  nom_a           text NOT NULL,
  nom_b           text NOT NULL,
  pays            text CHECK (pays IN ('TG','BJ','BOTH')),
  votes_a         integer DEFAULT 0,
  votes_b         integer DEFAULT 0,
  statut          text DEFAULT 'actif' CHECK (statut IN ('actif','termine')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(semaine, type, nom_a, nom_b)
);

CREATE TABLE IF NOT EXISTS duels_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id       uuid NOT NULL REFERENCES duels_quartiers(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choix         text NOT NULL CHECK (choix IN ('a','b')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(duel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_duels_actifs ON duels_quartiers(statut, semaine);

-- ════════════════════════════════════════
-- 7bis) DUELS_PHOTOS — duels infinis photo vs photo (cœur viral)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS duels_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  voter_session text,                                       -- pour anon (cookie/ip)
  photo_a       uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  photo_b       uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  winner        uuid NOT NULL,                              -- = photo_a OU photo_b
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duels_photos_voter ON duels_photos(voter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duels_photos_session ON duels_photos(voter_session, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duels_photos_winner ON duels_photos(winner);

-- Trigger : update duel_wins / duel_losses / duel_streak / duel_points sur feed_photos
CREATE OR REPLACE FUNCTION update_feed_duel_stats()
RETURNS TRIGGER AS $$
DECLARE
  loser uuid;
  cur_streak integer;
BEGIN
  loser := CASE WHEN NEW.winner = NEW.photo_a THEN NEW.photo_b ELSE NEW.photo_a END;

  -- Gagnant : +10 pts, +1 win, +1 streak, +20 si streak atteint 3
  SELECT duel_streak + 1 INTO cur_streak FROM feed_photos WHERE id = NEW.winner;
  UPDATE feed_photos SET
    duel_wins = duel_wins + 1,
    duel_streak = cur_streak,
    duel_points = duel_points + 10 + CASE WHEN cur_streak = 3 OR cur_streak = 10 OR cur_streak = 30 THEN 20 ELSE 0 END
  WHERE id = NEW.winner;

  -- Perdant : +1 pt consolation, reset streak
  UPDATE feed_photos SET
    duel_losses = duel_losses + 1,
    duel_streak = 0,
    duel_points = duel_points + 1
  WHERE id = loser;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_feed_duel_stats ON duels_photos;
CREATE TRIGGER trg_update_feed_duel_stats
  AFTER INSERT ON duels_photos
  FOR EACH ROW EXECUTE FUNCTION update_feed_duel_stats();

-- ════════════════════════════════════════
-- 8) PARTAGES_WHATSAPP
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partages_whatsapp (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid REFERENCES feed_photos(id) ON DELETE CASCADE,
  candidature_id uuid REFERENCES wolo_awards(id) ON DELETE CASCADE,
  shared_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token         text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 10),
  clicks        integer DEFAULT 0,
  votes_generes integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partages_token ON partages_whatsapp(token);
CREATE INDEX IF NOT EXISTS idx_partages_photo ON partages_whatsapp(photo_id);

-- ════════════════════════════════════════
-- 9) BOOSTS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS boosts_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      uuid NOT NULL REFERENCES feed_photos(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duree_h       integer NOT NULL DEFAULT 24,
  prix_fcfa     integer NOT NULL DEFAULT 500,
  ends_at       timestamptz NOT NULL,
  statut        text DEFAULT 'actif' CHECK (statut IN ('actif','expire','rembourse')),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boosts_active ON boosts_photos(ends_at) WHERE statut = 'actif';

-- ════════════════════════════════════════
-- 10) HALL_OF_FAME — vue gagnantes historiques
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW hall_of_fame AS
SELECT
  w.user_id,
  p.nom_complet,
  CASE WHEN p.ville ILIKE '%cotonou%' OR p.ville ILIKE '%porto%' THEN 'BJ' ELSE 'TG' END AS pays,
  p.photo_profil AS avatar_url,
  w.categorie,
  COUNT(*) FILTER (WHERE w.gagnant = true) as nb_victoires,
  SUM(w.montant_gagne) FILTER (WHERE w.gagnant = true) as total_fcfa,
  MAX(w.mois) FILTER (WHERE w.gagnant = true) as derniere_victoire,
  array_agg(w.mois ORDER BY w.mois DESC) FILTER (WHERE w.gagnant = true) as mois_gagnes
FROM wolo_awards w
LEFT JOIN wolo_prestataires p ON p.user_id = w.user_id
WHERE w.gagnant = true
GROUP BY w.user_id, p.nom_complet, p.ville, p.photo_profil, w.categorie
ORDER BY nb_victoires DESC, total_fcfa DESC;

-- ════════════════════════════════════════
-- 11) LEADERBOARDS
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW leaderboard_quartier_7j AS
SELECT
  f.quartier,
  f.ville,
  f.pays,
  f.user_id,
  p.nom_complet,
  p.photo_profil AS avatar_url,
  SUM(f.nb_likes) as total_likes_7j,
  COUNT(*) as nb_photos_7j,
  RANK() OVER (PARTITION BY f.quartier ORDER BY SUM(f.nb_likes) DESC) as rang_quartier
FROM feed_photos f
LEFT JOIN wolo_prestataires p ON p.user_id = f.user_id
WHERE f.created_at >= now() - interval '7 days'
  AND f.video_validee = true
  AND f.quartier IS NOT NULL
GROUP BY f.quartier, f.ville, f.pays, f.user_id, p.nom_complet, p.photo_profil;

CREATE OR REPLACE VIEW leaderboard_ville_mois AS
SELECT
  f.ville,
  f.pays,
  f.user_id,
  p.nom_complet,
  p.photo_profil AS avatar_url,
  SUM(f.nb_likes) as total_likes_mois,
  COUNT(*) as nb_photos_mois,
  RANK() OVER (PARTITION BY f.ville ORDER BY SUM(f.nb_likes) DESC) as rang_ville
FROM feed_photos f
LEFT JOIN wolo_prestataires p ON p.user_id = f.user_id
WHERE f.mois = to_char(now(), 'YYYY-MM')
  AND f.video_validee = true
  AND f.ville IS NOT NULL
GROUP BY f.ville, f.pays, f.user_id, p.nom_complet, p.photo_profil;

-- Vue classement mensuel par catégorie + pays (pour couronnement Reines mois)
CREATE OR REPLACE VIEW classement_reines_mois AS
SELECT
  f.mois,
  f.categorie,
  f.pays,
  f.id AS photo_id,
  f.user_id,
  p.nom_complet,
  p.photo_profil,
  f.photo_url,
  f.duel_points,
  f.nb_likes,
  f.duel_wins,
  f.duel_losses,
  RANK() OVER (PARTITION BY f.mois, f.categorie, f.pays ORDER BY f.duel_points DESC, f.nb_likes DESC) AS rang
FROM feed_photos f
LEFT JOIN wolo_prestataires p ON p.user_id = f.user_id
WHERE f.video_validee = true
  AND f.is_awards_candidate = true;

-- ════════════════════════════════════════
-- 12) FONCTION maj_streak_user (post quotidien)
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION maj_streak_user(p_user_id uuid)
RETURNS TABLE(current_streak integer, multiplicateur integer, badge_debloque text) AS $$
DECLARE
  v_last_date date;
  v_current integer;
  v_longest integer;
  v_mult integer;
  v_today date := current_date;
  v_diff integer;
  v_badge text := null;
BEGIN
  SELECT s.last_post_date, s.current_streak, s.longest_streak, s.multiplicateur
    INTO v_last_date, v_current, v_longest, v_mult
  FROM streaks_wolo s WHERE s.user_id = p_user_id;

  IF v_last_date IS NULL THEN
    v_current := 1; v_longest := 1; v_mult := 1;
  ELSE
    v_diff := v_today - v_last_date;
    IF v_diff = 0 THEN NULL;
    ELSIF v_diff = 1 THEN v_current := v_current + 1; v_longest := GREATEST(v_longest, v_current);
    ELSE v_current := 1; v_mult := 1;
    END IF;
  END IF;

  IF v_current >= 7 THEN v_mult := 3;
  ELSIF v_current >= 3 THEN v_mult := 2;
  ELSE v_mult := 1;
  END IF;

  IF v_current = 7 THEN v_badge := 'serie_rouge_7'; END IF;
  IF v_current = 30 THEN v_badge := 'serie_rouge_30'; END IF;

  INSERT INTO streaks_wolo (user_id, current_streak, longest_streak, last_post_date, multiplicateur, updated_at)
  VALUES (p_user_id, v_current, v_longest, v_today, v_mult, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = v_current,
    longest_streak = v_longest,
    last_post_date = v_today,
    multiplicateur = v_mult,
    updated_at = now();

  IF v_badge IS NOT NULL THEN
    INSERT INTO badges_wolo (user_id, badge_type) VALUES (p_user_id, v_badge) ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_current, v_mult, v_badge;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calc_niveau_user(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_total_likes integer;
BEGIN
  SELECT COALESCE(SUM(nb_likes), 0) INTO v_total_likes FROM feed_photos WHERE user_id = p_user_id;
  IF v_total_likes >= 2001 THEN RETURN 'legende';
  ELSIF v_total_likes >= 501 THEN RETURN 'reine';
  ELSIF v_total_likes >= 51 THEN RETURN 'ambassadrice';
  ELSE RETURN 'apprentie';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════
-- 13) RLS
-- ════════════════════════════════════════
ALTER TABLE feed_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentaires_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks_wolo ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges_wolo ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels_quartiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partages_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosts_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes_mensuels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_read_all' AND tablename = 'feed_photos') THEN
    CREATE POLICY "feed_read_all" ON feed_photos FOR SELECT USING (video_validee = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_read_all' AND tablename = 'likes_photos') THEN
    CREATE POLICY "likes_read_all" ON likes_photos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comm_read_all' AND tablename = 'commentaires_photos') THEN
    CREATE POLICY "comm_read_all" ON commentaires_photos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badges_read_all' AND tablename = 'badges_wolo') THEN
    CREATE POLICY "badges_read_all" ON badges_wolo FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'streaks_read_all' AND tablename = 'streaks_wolo') THEN
    CREATE POLICY "streaks_read_all" ON streaks_wolo FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'themes_read_all' AND tablename = 'themes_mensuels') THEN
    CREATE POLICY "themes_read_all" ON themes_mensuels FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_read_all' AND tablename = 'duels_quartiers') THEN
    CREATE POLICY "duels_read_all" ON duels_quartiers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_votes_read_all' AND tablename = 'duels_votes') THEN
    CREATE POLICY "duels_votes_read_all" ON duels_votes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_photos_read_all' AND tablename = 'duels_photos') THEN
    CREATE POLICY "duels_photos_read_all" ON duels_photos FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_insert_own' AND tablename = 'feed_photos') THEN
    CREATE POLICY "feed_insert_own" ON feed_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_update_own' AND tablename = 'feed_photos') THEN
    CREATE POLICY "feed_update_own" ON feed_photos FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_insert_own' AND tablename = 'likes_photos') THEN
    CREATE POLICY "likes_insert_own" ON likes_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_delete_own' AND tablename = 'likes_photos') THEN
    CREATE POLICY "likes_delete_own" ON likes_photos FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comm_insert_own' AND tablename = 'commentaires_photos') THEN
    CREATE POLICY "comm_insert_own" ON commentaires_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_votes_insert_own' AND tablename = 'duels_votes') THEN
    CREATE POLICY "duels_votes_insert_own" ON duels_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'duels_photos_insert_any' AND tablename = 'duels_photos') THEN
    -- Anonymes autorisés (voter_session) — les votes anon sont permis
    CREATE POLICY "duels_photos_insert_any" ON duels_photos FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ════════════════════════════════════════
-- FIN migration v2 — Le Mur des Reines
-- ════════════════════════════════════════
