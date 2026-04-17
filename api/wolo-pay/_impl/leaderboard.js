// ================================================================
// Mur des Reines — Leaderboard par quartier/ville
// GET /api/wolo-pay/leaderboard?type=quartier|ville|pays&scope=7j|mois&filtre=&limit=10
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { type = 'ville', scope = 'mois', filtre, limit = 10 } = req.query;

  try {
    const mois = new Date().toISOString().slice(0, 7);
    let query = supabase.from('feed_photos')
      .select('user_id, quartier, ville, pays, nb_likes')
      .eq('video_validee', true);

    if (scope === '7j') {
      const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      query = query.gte('created_at', since);
    } else {
      query = query.eq('mois', mois);
    }

    if (type === 'quartier' && filtre) query = query.eq('quartier', filtre);
    if (type === 'ville' && filtre) query = query.eq('ville', filtre);
    if (type === 'pays' && filtre) query = query.eq('pays', filtre);

    const { data: photos, error } = await query;
    if (error) throw error;

    // Agrégation par user_id
    const agg = {};
    for (const p of (photos || [])) {
      if (!agg[p.user_id]) agg[p.user_id] = { total_likes: 0, nb_photos: 0, quartier: p.quartier, ville: p.ville, pays: p.pays };
      agg[p.user_id].total_likes += (p.nb_likes || 0);
      agg[p.user_id].nb_photos += 1;
    }

    const ranked = Object.entries(agg)
      .map(([user_id, stats]) => ({ user_id, ...stats }))
      .sort((a, b) => b.total_likes - a.total_likes)
      .slice(0, Number(limit));

    // Enrichir avec profiles
    const ids = ranked.map(r => r.user_id);
    let profilesMap = {};
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom_complet, avatar_url, metier')
        .in('id', ids);
      for (const p of (profiles || [])) profilesMap[p.id] = p;
    }

    const enriched = ranked.map((r, i) => ({
      rang: i + 1,
      ...r,
      nom: profilesMap[r.user_id]?.nom_complet || '—',
      avatar: profilesMap[r.user_id]?.avatar_url || '',
      metier: profilesMap[r.user_id]?.metier || '',
    }));

    return res.status(200).json({ ok: true, type, scope, filtre: filtre || null, leaderboard: enriched });
  } catch (err) {
    console.error('[leaderboard]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
