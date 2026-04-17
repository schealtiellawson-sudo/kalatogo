// ================================================================
// Mur des Reines — Liste des photos du feed
// GET /api/wolo-pay/feed-list?mois=&ville=&quartier=&categorie=&tri=&user_id=&limit=&offset=
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const {
    mois,
    ville,
    quartier,
    categorie,                    // 'coiffure' | 'couture' | 'libre' | null
    tri = 'recent',               // 'recent' | 'populaire' | 'trending' | 'boosted'
    user_id,                      // filtrer les photos d'un user
    viewer_id,                    // celui qui consulte (pour retourner liked_by_me)
    is_awards_candidate,          // 'true' ou null pour afficher uniquement les candidates
    limit = 20,
    offset = 0,
  } = req.query;

  try {
    let query = supabase
      .from('feed_photos')
      .select('id, user_id, mois, photo_url, description, categorie, quartier, ville, pays, theme_mois, is_awards_candidate, nb_likes, nb_commentaires, nb_shares, nb_vues, boost_until, created_at')
      .eq('video_validee', true);

    if (mois) query = query.eq('mois', mois);
    if (ville) query = query.eq('ville', ville);
    if (quartier) query = query.eq('quartier', quartier);
    if (categorie && categorie !== 'toutes') query = query.eq('categorie', categorie);
    if (user_id) query = query.eq('user_id', user_id);
    if (is_awards_candidate === 'true') query = query.eq('is_awards_candidate', true);

    // Tri
    if (tri === 'populaire') {
      query = query.order('nb_likes', { ascending: false });
    } else if (tri === 'trending') {
      // Récent + populaire (dernières 48h triées par likes)
      const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      query = query.gte('created_at', since).order('nb_likes', { ascending: false });
    } else if (tri === 'boosted') {
      query = query.gt('boost_until', new Date().toISOString()).order('boost_until', { ascending: false });
    } else {
      // 'recent' : les photos boostées remontent d'abord
      query = query
        .order('boost_until', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
    }

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: photos, error } = await query;
    if (error) throw error;

    // Enrichir avec profiles (nom + avatar)
    const userIds = [...new Set((photos || []).map(p => p.user_id))];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom_complet, avatar_url, pays, metier')
        .in('id', userIds);
      for (const p of (profiles || [])) profilesMap[p.id] = p;
    }

    // Si viewer_id fourni : savoir quelles photos il a liked
    let likedSet = new Set();
    if (viewer_id && photos?.length) {
      const { data: myLikes } = await supabase
        .from('likes_photos')
        .select('photo_id')
        .eq('user_id', viewer_id)
        .in('photo_id', photos.map(p => p.id));
      likedSet = new Set((myLikes || []).map(l => l.photo_id));
    }

    const enrichis = (photos || []).map(p => {
      const prof = profilesMap[p.user_id] || {};
      return {
        ...p,
        user_nom: prof.nom_complet || '—',
        user_avatar: prof.avatar_url || '',
        user_metier: prof.metier || '',
        user_pays: prof.pays || p.pays || '',
        liked_by_me: likedSet.has(p.id),
        is_boosted: p.boost_until && new Date(p.boost_until) > new Date(),
      };
    });

    return res.status(200).json({ ok: true, photos: enrichis, count: enrichis.length });
  } catch (err) {
    console.error('[feed-list]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
