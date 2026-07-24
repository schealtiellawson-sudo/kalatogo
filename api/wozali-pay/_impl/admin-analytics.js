// ================================================================
// Admin Analytics — pilotage WOZALI (service_role, admin uniquement)
// POST /api/wozali-pay/admin-analytics
//   { token, mode?, days?, filters?, sort?, dir?, page?, pageSize? }
//   mode 'dashboard' (défaut) : agrégats KPI ; mode 'profiles' : explorateur
// ================================================================
import { supabase } from '../../_lib/supabase.js';

async function requireAdmin(req, token) {
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (ADMIN_EMAILS.length === 0) return { ok: false, code: 500, error: 'ADMIN_EMAILS non configuré' };
  // Le routeur authentifie déjà les actions non-publiques (Bearer → req.authenticatedUser).
  let email = req && req.authenticatedUser && req.authenticatedUser.email;
  if (!email) {
    if (!token) return { ok: false, code: 401, error: 'Token requis' };
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { ok: false, code: 401, error: 'Token invalide' };
    email = user.email;
  }
  if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return { ok: false, code: 403, error: 'Accès refusé' };
  return { ok: true, email };
}

const PROFILE_COLS = 'id,user_id,slug,nom_complet,genre,age,date_naissance,pays,ville,quartier,metier_principal,abonnement,score_wozali,disponible_maintenant,derniere_connexion,created_at';
const SORT_WHITELIST = ['created_at', 'derniere_connexion', 'score_wozali', 'nom_complet', 'age'];

export default async function adminAnalytics(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch (e) { return res.status(400).json({ ok: false, error: 'Body invalide' }); }

  const auth = await requireAdmin(req, body.token);
  if (!auth.ok) return res.status(auth.code).json({ ok: false, error: auth.error });

  const days = Math.min(365, Math.max(1, parseInt(body.days, 10) || 30));

  try {
    // ── Mode explorateur de profils ──
    if (body.mode === 'profiles') {
      const f = body.filters || {};
      const pageSize = Math.min(200, Math.max(10, parseInt(body.pageSize, 10) || 50));
      const page = Math.max(0, parseInt(body.page, 10) || 0);
      let sort = SORT_WHITELIST.includes(body.sort) ? body.sort : 'created_at';
      const dir = (body.dir === 'asc');

      let q = supabase.from('wozali_prestataires').select(PROFILE_COLS, { count: 'exact' });
      if (f.genre)      q = q.eq('genre', f.genre);
      if (f.pays)       q = q.eq('pays', f.pays);
      if (f.ville)      q = q.eq('ville', f.ville);
      if (f.metier)     q = q.eq('metier_principal', f.metier);
      if (f.abonnement) q = q.eq('abonnement', f.abonnement);
      if (f.age_min)    q = q.gte('age', parseInt(f.age_min, 10));
      if (f.age_max)    q = q.lte('age', parseInt(f.age_max, 10));
      if (f.search)     q = q.or(`nom_complet.ilike.%${f.search}%,metier_principal.ilike.%${f.search}%,ville.ilike.%${f.search}%`);
      q = q.order(sort, { ascending: dir, nullsFirst: false }).range(page * pageSize, page * pageSize + pageSize - 1);

      const { data, count, error } = await q;
      if (error) throw error;
      return res.status(200).json({ ok: true, profiles: data || [], total: count || 0, page, pageSize });
    }

    // ── Mode dashboard : tous les agrégats en parallèle ──
    const rpc = (fn, args) => supabase.rpc(fn, args).then(r => r.error ? null : r.data);
    const [
      traffic, viewsPage, viewsDay, topClicks,
      funnel, abandons, activite,
      demoGenre, demoPays, demoVille, demoMetier, demoAbo, ageBins
    ] = await Promise.all([
      rpc('wz_traffic_summary', { p_days: days }),
      rpc('wz_views_by_page', { p_days: days, p_limit: 40 }),
      rpc('wz_views_by_day', { p_days: Math.min(days, 30) }),
      rpc('wz_top_clicks', { p_days: days, p_limit: 20 }),
      rpc('wz_funnel_summary', { p_days: Math.max(days, 90) }),
      rpc('wz_funnel_abandons', { p_days: Math.max(days, 90), p_limit: 15 }),
      rpc('wz_activite_summary', {}),
      rpc('wz_demographics', { p_dim: 'genre' }),
      rpc('wz_demographics', { p_dim: 'pays' }),
      rpc('wz_demographics', { p_dim: 'ville' }),
      rpc('wz_demographics', { p_dim: 'metier' }),
      rpc('wz_demographics', { p_dim: 'abonnement' }),
      rpc('wz_age_bins', {})
    ]);

    return res.status(200).json({
      ok: true,
      days,
      trafic: traffic || {},
      vues_par_page: viewsPage || [],
      vues_par_jour: viewsDay || [],
      top_clics: topClicks || [],
      funnel: funnel || {},
      abandons_par_metier: abandons || [],
      activite: activite || {},
      demographie: {
        genre: demoGenre || [],
        pays: demoPays || [],
        ville: demoVille || [],
        metier: demoMetier || [],
        abonnement: demoAbo || [],
        age: ageBins || []
      }
    });
  } catch (err) {
    console.error('[admin-analytics]', err.message || err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur analytics' });
  }
}
