// ================================================================
// Mur des Reines — Toggle like sur une photo
// POST /api/wolo-pay/feed-like
// Body: { user_id, photo_id }
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { user_id, photo_id } = req.body || {};
  if (!user_id || !photo_id) {
    return res.status(400).json({ error: 'user_id et photo_id requis' });
  }

  try {
    // Like déjà existant ?
    const { data: existing } = await supabase
      .from('likes_photos')
      .select('id')
      .eq('user_id', user_id)
      .eq('photo_id', photo_id)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabase.from('likes_photos').delete().eq('id', existing.id);
      return res.status(200).json({ ok: true, liked: false });
    }

    // Like
    const { error } = await supabase
      .from('likes_photos')
      .insert({ user_id, photo_id });
    if (error) throw error;

    // Vérifier seuils de badges pour l'auteur de la photo
    const { data: photo } = await supabase
      .from('feed_photos')
      .select('user_id, nb_likes')
      .eq('id', photo_id)
      .single();

    if (photo) {
      // Total likes cumulés de l'auteur
      const { data: allPhotos } = await supabase
        .from('feed_photos')
        .select('nb_likes')
        .eq('user_id', photo.user_id);
      const totalLikes = (allPhotos || []).reduce((s, p) => s + (p.nb_likes || 0), 0) + 1;

      const seuils = [
        { seuil: 100, type: 'likes_100' },
        { seuil: 500, type: 'likes_500' },
        { seuil: 1000, type: 'likes_1000' },
      ];
      for (const { seuil, type } of seuils) {
        if (totalLikes >= seuil) {
          await supabase.from('badges_wolo').insert({ user_id: photo.user_id, badge_type: type }).select();
        }
      }

      // Niveaux
      let niveau = 'apprentie';
      if (totalLikes >= 2001) niveau = 'legende';
      else if (totalLikes >= 501) niveau = 'reine';
      else if (totalLikes >= 51) niveau = 'ambassadrice';
      await supabase.from('badges_wolo').insert({ user_id: photo.user_id, badge_type: niveau }).select();
    }

    return res.status(200).json({ ok: true, liked: true });
  } catch (err) {
    console.error('[feed-like]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
