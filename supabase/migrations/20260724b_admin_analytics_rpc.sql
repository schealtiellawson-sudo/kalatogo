-- ============================================================
-- WOZALI — Fonctions d'agrégation pilotage admin (2026-07-24)
-- Appelées via service_role uniquement (endpoint admin sécurisé).
-- Agrégation en base (pas de rows tirées côté serveur) = scalable.
-- ============================================================

-- Trafic : totaux sur une fenêtre
CREATE OR REPLACE FUNCTION wz_traffic_summary(p_days int DEFAULT 30)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'total_views',     count(*) FILTER (WHERE event_type='page_view'),
    'unique_sessions', count(DISTINCT session_id) FILTER (WHERE event_type='page_view'),
    'total_clicks',    count(*) FILTER (WHERE event_type='click'),
    'total_logins',    count(*) FILTER (WHERE event_type='login')
  )
  FROM wozali_events
  WHERE created_at >= now() - (p_days || ' days')::interval;
$$;

-- Vues par page
CREATE OR REPLACE FUNCTION wz_views_by_page(p_days int DEFAULT 30, p_limit int DEFAULT 40)
RETURNS TABLE(page text, views bigint, sessions bigint) LANGUAGE sql STABLE AS $$
  SELECT coalesce(page,'(inconnu)'), count(*), count(DISTINCT session_id)
  FROM wozali_events
  WHERE event_type='page_view' AND created_at >= now() - (p_days || ' days')::interval
  GROUP BY 1 ORDER BY 2 DESC LIMIT p_limit;
$$;

-- Vues et visiteurs par jour
CREATE OR REPLACE FUNCTION wz_views_by_day(p_days int DEFAULT 14)
RETURNS TABLE(jour date, views bigint, sessions bigint) LANGUAGE sql STABLE AS $$
  SELECT date_trunc('day', created_at)::date, count(*), count(DISTINCT session_id)
  FROM wozali_events
  WHERE event_type='page_view' AND created_at >= now() - (p_days || ' days')::interval
  GROUP BY 1 ORDER BY 1;
$$;

-- Clics les plus fréquents (par label)
CREATE OR REPLACE FUNCTION wz_top_clicks(p_days int DEFAULT 30, p_limit int DEFAULT 20)
RETURNS TABLE(label text, clics bigint) LANGUAGE sql STABLE AS $$
  SELECT coalesce(label,'(sans libellé)'), count(*)
  FROM wozali_events
  WHERE event_type='click' AND created_at >= now() - (p_days || ' days')::interval
  GROUP BY 1 ORDER BY 2 DESC LIMIT p_limit;
$$;

-- Funnel inscription : combien atteignent chaque étape
CREATE OR REPLACE FUNCTION wz_funnel_summary(p_days int DEFAULT 90)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'arrivee',  count(*) FILTER (WHERE etape_max>=1),
    'etape2',   count(*) FILTER (WHERE etape_max>=2),
    'etape3',   count(*) FILTER (WHERE etape_max>=3),
    'etape4',   count(*) FILTER (WHERE etape_max>=4),
    'complete', count(*) FILTER (WHERE complete)
  )
  FROM wozali_inscription_funnel
  WHERE created_at >= now() - (p_days || ' days')::interval;
$$;

-- Abandons d'inscription par métier (ceux qui n'ont pas fini)
CREATE OR REPLACE FUNCTION wz_funnel_abandons(p_days int DEFAULT 90, p_limit int DEFAULT 15)
RETURNS TABLE(metier text, abandons bigint) LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(trim(metier),''),'(non renseigné)'), count(*)
  FROM wozali_inscription_funnel
  WHERE NOT complete AND created_at >= now() - (p_days || ' days')::interval
  GROUP BY 1 ORDER BY 2 DESC LIMIT p_limit;
$$;

-- Activité / connexions (depuis les vraies dernières connexions)
CREATE OR REPLACE FUNCTION wz_activite_summary()
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'membres_total',   count(*),
    'pro_total',       count(*) FILTER (WHERE lower(coalesce(abonnement,''))='pro'),
    'actifs_7j',       count(*) FILTER (WHERE derniere_connexion >= now() - interval '7 days'),
    'actifs_30j',      count(*) FILTER (WHERE derniere_connexion >= now() - interval '30 days'),
    'jamais_connecte', count(*) FILTER (WHERE derniere_connexion IS NULL),
    'nouveaux_7j',     count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
    'nouveaux_30j',    count(*) FILTER (WHERE created_at >= now() - interval '30 days')
  )
  FROM wozali_prestataires;
$$;

-- Démographie des inscrits (dimension paramétrable)
CREATE OR REPLACE FUNCTION wz_demographics(p_dim text)
RETURNS TABLE(cle text, total bigint) LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(trim(
    CASE p_dim
      WHEN 'genre'      THEN genre
      WHEN 'pays'       THEN pays
      WHEN 'ville'      THEN ville
      WHEN 'quartier'   THEN quartier
      WHEN 'metier'     THEN metier_principal
      WHEN 'abonnement' THEN abonnement
      ELSE NULL END
  ),''),'(non renseigné)'), count(*)
  FROM wozali_prestataires
  GROUP BY 1 ORDER BY 2 DESC;
$$;

-- Tranches d'âge (age direct, sinon calculé depuis date_naissance)
CREATE OR REPLACE FUNCTION wz_age_bins()
RETURNS TABLE(tranche text, total bigint) LANGUAGE sql STABLE AS $$
  WITH ages AS (
    SELECT coalesce(age, extract(year FROM age(date_naissance))::int) AS a
    FROM wozali_prestataires
  )
  SELECT CASE
    WHEN a IS NULL THEN '(non renseigné)'
    WHEN a < 18 THEN '<18'
    WHEN a BETWEEN 18 AND 25 THEN '18-25'
    WHEN a BETWEEN 26 AND 35 THEN '26-35'
    WHEN a BETWEEN 36 AND 45 THEN '36-45'
    ELSE '45+' END AS tranche,
    count(*)
  FROM ages GROUP BY 1
  ORDER BY 1;
$$;

-- Sécurité : exécution réservée au service_role (endpoint admin). Jamais public.
REVOKE ALL ON FUNCTION wz_traffic_summary(int)          FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_views_by_page(int,int)        FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_views_by_day(int)             FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_top_clicks(int,int)           FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_funnel_summary(int)           FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_funnel_abandons(int,int)      FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_activite_summary()            FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_demographics(text)            FROM anon, authenticated;
REVOKE ALL ON FUNCTION wz_age_bins()                    FROM anon, authenticated;
