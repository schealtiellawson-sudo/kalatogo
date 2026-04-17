// ================================================================
// Mur des Reines — Mode Découvrir (swipe / duel / roulette)
// GET /api/wolo-pay/feed-discover?mode=swipe|duel|roulette&categorie=&viewer_id=
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { mode = 'swipe', categorie, viewer_id, limit = 20 } = req.query;

  try {
    // Photos candidates : du mois en cours, validées
    let query = supabase
      .from('feed_photos')
      .select('id, user_id, mois, photo_url, description, categorie, quartier, ville, pays, theme_mois, is_awards_candidate, nb_likes, nb_commentaires, nb_shares, created_at')
      .eq('video_validee', true);

    if (categorie && categorie !== 'toutes') query = query.eq('categorie', categorie);

    // On pioche sur les 30 derniers jours pour avoir un pool assez large
    const since30 = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    query = query.gte('created_at', since30);

    // Exclure les photos du viewer (il ne se voit pas lui-même)
    if (viewer_id) query = query.neq('user_id', viewer_id);

    const { data: pool, error } = await query.limit(200);
    if (error) throw error;
    if (!pool || pool.length === 0) {
      return res.status(200).json({ ok: true, mode, photos: [] });
    }

    // Shuffle Fisher-Yates
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let selection = [];
    if (mode === 'duel') {
      selection = shuffled.slice(0, 2);
    } else if (mode === 'roulette') {
      selection = shuffled.slice(0, 1);
    } else {
      selection = shuffled.slice(0, Number(limit));
    }

    // Enrichir avec profiles
    const userIds = [...new Set(selection.map(p => p.user_id))];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom_complet, avatar_url, metier, pays')
        .in('id', userIds);
      for (const p of (profiles || [])) profilesMap[p.id] = p;
    }

    // Likes du viewer
    let likedSet = new Set();
    if (viewer_id && selection.length > 0) {
      const { data: myLikes } = await supabase
        .from('likes_photos')
        .select('photo_id')
        .eq('user_id', viewer_id)
        .in('photo_id', selection.map(p => p.id));
      likedSet = new Set((myLikes || []).map(l => l.photo_id));
    }

    const enrichies = selection.map(p => ({
      ...p,
      user_nom: profilesMap[p.user_id]?.nom_complet || '—',
      user_avatar: profilesMap[p.user_id]?.avatar_url || '',
      user_metier: profilesMap[p.user_id]?.metier || '',
      user_pays: profilesMap[p.user_id]?.pays || p.pays || '',
      liked_by_me: likedSet.has(p.id),
    }));

    return res.status(200).json({ ok: true, mode, photos: enrichies });
  } catch (err) {
    console.error('[feed-discover]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
