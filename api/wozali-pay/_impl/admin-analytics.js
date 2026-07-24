// ================================================================
// Admin Analytics — pilotage WOZALI (service_role, admin uniquement)
// POST /api/wozali-pay/admin-analytics
//   { token, mode?, days?, filters?, sort?, dir?, page?, pageSize? }
//   mode 'dashboard' (défaut) : agrégats KPI ; mode 'profiles' : explorateur
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { PROVIDERS, availableProviders } from '../../_lib/ai-providers.js';

const SANDY_ANALYSTE = `Tu es Sandy, en mode analyste de pilotage pour Schealtiel, le fondateur de WOZALI, la plateforme qui rend visibles les travailleurs de l'informel au Togo et au Bénin. On te donne les chiffres réels de la plateforme. Ton rôle : lire ces chiffres et dire au fondateur, sans détour, où ça marche, où ça fuit, et quoi améliorer en priorité.
CADRE D'ANALYSE, logique marketplace : la vraie santé n'est pas le nombre d'inscrits mais la LIQUIDITÉ, des membres qui reçoivent des contacts, et l'ACTIVATION, inscrit puis profil complet puis visible. Regarde en priorité le funnel d'inscription, où les gens abandonnent, le taux de connexion, actifs contre jamais connectés, la conversion Gratuit vers Pro, la densité par métier et par ville, densité avant expansion, et les abandons par métier.
RÈGLES : appuie-toi UNIQUEMENT sur les chiffres fournis, n'invente jamais un chiffre. Si une donnée manque ou est à zéro, début de collecte, dis-le au lieu de conclure. Priorise, 3 à 5 constats maximum, du plus important au moins important, chacun avec une action concrète et faisable. Sois direct et concret, pas de flatterie, pas de jargon anglais inutile. Français, zéro tiret cadratin, jamais la structure c'est pas X c'est Y. Termine par LA priorité numéro un de la semaine.
FORMAT : de courts intitulés en gras suivis d'une phrase ou deux. Pas de baratin d'introduction. Maximum 260 mots.`;

const SANDY_STRATEGE = `Tu es Sandy, en mode conseillère stratégique de croissance pour Schealtiel, le fondateur de WOZALI. Tu es la meilleure au monde en stratégie et gestion de la croissance d'une entreprise SaaS et marketplace, spécialisée sur le modèle exact de WOZALI : une plateforme à deux faces, prestataires de l'informel côté offre, clients et recruteurs côté demande, au Togo et au Bénin, qui rend visibles les travailleurs de l'économie informelle. Tu lis la donnée produit et tu la traduis en décisions.
CADRE : tu raisonnes avec les frameworks qui comptent pour ce modèle : le démarrage à froid et le réseau atomique, un couple quartier fois métier, la liquidité, la probabilité qu'une recherche trouve un match, avant le nombre d'inscrits, l'activation, inscrit puis profil complet puis visible puis premier contact, la rétention en deux courbes, a reçu un contact ou non, le funnel d'inscription, la densité avant l'expansion géographique, les effets de réseau qui composent avec le temps, et les canaux d'acquisition, terrain, affiliation, créateurs, recherche Google, Sandy. Tu gardes toujours en tête les objectifs mensuels et annuels du fondateur.
DONNÉES : on te fournit les chiffres réels de la plateforme à chaque échange. Appuie-toi dessus, ne les invente jamais, et si une donnée te manque pour trancher, demande-la.
STYLE : tu parles à un fondateur, pas à un artisan. Direct, stratégique, concret, orienté décision et priorisation. Pas de flatterie, pas de baratin. Tu peux challenger une idée quand la donnée va contre. Français, zéro tiret cadratin, jamais la structure c'est pas X c'est Y. Réponses denses mais sans roman, tu vas à l'essentiel, tu proposes des actions et tu chiffres l'impact attendu quand c'est raisonnable, sans inventer. Une question de clarification si le fondateur est vague. Tu es une IA et tu ne le caches pas si on te le demande.`;

// Résumé compact des KPI réels, réutilisé par l'analyse et le chat stratège.
async function buildKpiResume(days) {
  const rpc = (fn, args) => supabase.rpc(fn, args).then(r => r.error ? null : r.data);
  const [t, fun, aban, act, dGenre, dPays, dVille, dMetier, dAbo, dAge] = await Promise.all([
    rpc('wz_traffic_summary', { p_days: days }),
    rpc('wz_funnel_summary', { p_days: Math.max(days, 90) }),
    rpc('wz_funnel_abandons', { p_days: Math.max(days, 90), p_limit: 10 }),
    rpc('wz_activite_summary', {}),
    rpc('wz_demographics', { p_dim: 'genre' }),
    rpc('wz_demographics', { p_dim: 'pays' }),
    rpc('wz_demographics', { p_dim: 'ville' }),
    rpc('wz_demographics', { p_dim: 'metier' }),
    rpc('wz_demographics', { p_dim: 'abonnement' }),
    rpc('wz_age_bins', {})
  ]);
  const T = t || {}, F = fun || {}, A = act || {};
  const list = (rows) => (rows || []).slice(0, 8).map(r => `${r.cle || r.tranche || r.metier}: ${r.total != null ? r.total : r.abandons}`).join(', ') || 'aucune donnée';
  const pct = (a, b) => b ? Math.round((a / b) * 100) + '%' : 'n/a';
  return [
    `Fenêtre : ${days} jours.`,
    `TRAFIC : ${T.total_views || 0} vues de pages, ${T.unique_sessions || 0} visiteurs uniques, ${T.total_clicks || 0} clics, ${T.total_logins || 0} connexions.`,
    `FUNNEL inscription (90j) : arrivées ${F.arrivee || 0}, étape 1 franchie ${F.etape2 || 0}, étape 2 ${F.etape3 || 0}, étape 3 ${F.etape4 || 0}, comptes créés ${F.complete || 0}. Taux arrivée vers créé ${pct(F.complete || 0, F.arrivee || 0)}.`,
    `ABANDONS inscription par métier : ${list(aban)}.`,
    `MEMBRES/ACTIVITÉ : total ${A.membres_total || 0}, Pro ${A.pro_total || 0} (${pct(A.pro_total || 0, A.membres_total || 0)}), actifs 7j ${A.actifs_7j || 0}, actifs 30j ${A.actifs_30j || 0}, jamais connectés ${A.jamais_connecte || 0}, nouveaux 30j ${A.nouveaux_30j || 0}.`,
    `DÉMOGRAPHIE genre : ${list(dGenre)}. Pays : ${list(dPays)}. Ville : ${list(dVille)}. Métier : ${list(dMetier)}. Abonnement : ${list(dAbo)}. Âge : ${list(dAge)}.`,
  ].join('\n');
}

// Router IA (mêmes providers gratuits que le coach), renvoie le texte ou null.
async function askAI(system, user, maxTokens) {
  const available = availableProviders();
  if (!available.length) return null;
  const order = ['groq', 'gemini', 'cerebras', 'mistral'].filter(n => available.includes(n));
  for (const name of order) {
    try {
      const out = await PROVIDERS[name].fn({ system, user, jsonMode: false, maxTokens });
      if (out && out.text) return out.text;
    } catch (e) { /* provider suivant */ }
  }
  return null;
}

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
    // ── Mode analyse Sandy : lit les KPI et sort les axes / fuites ──
    if (body.mode === 'sandy') {
      const resume = await buildKpiResume(days);
      const analyse = await askAI(SANDY_ANALYSTE, resume, 700);
      if (!analyse) return res.status(503).json({ ok: false, error: 'Analyse indisponible pour le moment' });
      return res.status(200).json({ ok: true, analyse: analyse.trim(), donnees: resume });
    }

    // ── Mode chat stratège : conversation temps réel avec le fondateur ──
    if (body.mode === 'sandy-chat') {
      const message = String(body.message || '').trim().slice(0, 1500);
      if (!message) return res.status(400).json({ ok: false, error: 'message requis' });
      const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
      const resume = await buildKpiResume(days);
      const convo = history
        .map(m => `[${m.role === 'assistant' ? 'Sandy' : 'Fondateur'}] ${String(m.content || '').slice(0, 1200)}`)
        .join('\n');
      const user = `CHIFFRES ACTUELS DE LA PLATEFORME :\n${resume}\n\n`
        + (convo ? `CONVERSATION EN COURS :\n${convo}\n\n` : '')
        + `NOUVEAU MESSAGE DU FONDATEUR :\n${message}`;
      const reply = await askAI(SANDY_STRATEGE, user, 750);
      if (!reply) return res.status(503).json({ ok: false, error: 'Sandy est indisponible pour le moment' });
      return res.status(200).json({ ok: true, reply: reply.trim() });
    }

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
