// ================================================================
// Mur des Reines — Stats de tags pour une pro (coiffeuse / couturière)
// GET /api/wolo-pay/feed-tag-stats?user_id=<uuid>&mois=YYYY-MM
//
// Retourne :
//   - count_mois  : nombre de photos du mois où elle est taguée
//   - count_total : nombre total de photos toutes époques
//   - rang_pays   : son rang parmi les pros taguées de son pays/catégorie
//   - photos      : 6 photos récentes où elle apparaît
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id requis' });

  try {
    const moisActuel = new Date().toISOString().slice(0, 7);

    const [moisRes, totalRes, photosRes] = await Promise.all([
      supabase
        .from('feed_photos')
        .select('id', { count: 'exact', head: true })
        .eq('tag_pro_user_id', user_id)
        .eq('mois', moisActuel)
        .eq('video_validee', true),
      supabase
        .from('feed_photos')
        .select('id', { count: 'exact', head: true })
        .eq('tag_pro_user_id', user_id)
        .eq('video_validee', true),
      supabase
        .from('feed_photos')
        .select('id, photo_url, photos_url, categorie, mois, nb_likes, duel_points, created_at, user_id')
        .eq('tag_pro_user_id', user_id)
        .eq('video_validee', true)
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    return res.status(200).json({
      ok: true,
      user_id,
      mois: moisActuel,
      count_mois: moisRes.count || 0,
      count_total: totalRes.count || 0,
      photos: photosRes.data || [],
    });
  } catch (err) {
    console.error('[feed-tag-stats]', err);
    return res.status(500).json({ error: 'Erreur interne', detail: err.message });
  }
}
