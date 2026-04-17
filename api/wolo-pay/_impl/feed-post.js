// ================================================================
// Mur des Reines — Poster une photo
// POST /api/wolo-pay/feed-post
// Body: { user_id, photo_url, description?, categorie, quartier?, ville?, pays?, theme_mois?, is_awards_candidate? }
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const {
    user_id,
    photo_url,
    description = '',
    categorie,                    // 'coiffure' | 'couture' | 'libre'
    quartier,
    ville,
    pays,
    theme_mois,
    is_awards_candidate = false,
  } = req.body || {};

  if (!user_id || !photo_url || !categorie) {
    return res.status(400).json({ error: 'user_id, photo_url, categorie requis' });
  }
  if (!['coiffure','couture','libre'].includes(categorie)) {
    return res.status(400).json({ error: 'categorie invalide' });
  }

  try {
    const mois = new Date().toISOString().slice(0, 7);

    // Récupérer thème du mois (si non fourni)
    let themeFinal = theme_mois;
    if (!themeFinal) {
      const { data: theme } = await supabase
        .from('themes_mensuels')
        .select('theme_coiffure, theme_couture')
        .eq('mois', mois)
        .maybeSingle();
      if (theme) {
        themeFinal = categorie === 'coiffure' ? theme.theme_coiffure : theme.theme_couture;
      }
    }

    // Si candidature Awards officielle : vérifier Plan Pro
    if (is_awards_candidate === true || is_awards_candidate === 'true') {
      const { data: abo } = await supabase
        .from('abonnements')
        .select('id, created_at')
        .eq('user_id', user_id)
        .eq('plan', 'pro')
        .eq('statut', 'actif')
        .maybeSingle();

      if (!abo) {
        return res.status(403).json({ error: 'Plan Pro requis pour candidater aux Awards' });
      }

      // 1 candidature/mois/catégorie
      const { data: dejaCandidate } = await supabase
        .from('feed_photos')
        .select('id')
        .eq('user_id', user_id)
        .eq('mois', mois)
        .eq('categorie', categorie)
        .eq('is_awards_candidate', true)
        .maybeSingle();

      if (dejaCandidate) {
        return res.status(409).json({ error: `Tu as déjà une candidature ${categorie} ce mois` });
      }
    }

    // Limite : max 3 photos/jour/user
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from('feed_photos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', `${aujourdhui}T00:00:00`);

    if (count !== null && count >= 3) {
      return res.status(429).json({ error: 'Limite 3 photos/jour atteinte — reviens demain 🌅' });
    }

    // Créer la photo
    const { data: photo, error } = await supabase
      .from('feed_photos')
      .insert({
        user_id,
        mois,
        photo_url,
        description: (description || '').slice(0, 500),
        categorie,
        quartier: quartier || null,
        ville: ville || null,
        pays: pays || null,
        theme_mois: themeFinal || null,
        is_awards_candidate: !!is_awards_candidate,
      })
      .select()
      .single();

    if (error) throw error;

    // Maj streak + débloquer badge première photo si besoin
    let streakInfo = null;
    try {
      const { data: streak } = await supabase.rpc('maj_streak_user', { p_user_id: user_id });
      streakInfo = streak?.[0] || null;
    } catch (_) { /* silencieux */ }

    // Badge "premiere_photo" si c'est la 1ère
    const { count: totalPhotos } = await supabase
      .from('feed_photos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id);

    let badgeDebloque = null;
    if (totalPhotos === 1) {
      await supabase
        .from('badges_wolo')
        .insert({ user_id, badge_type: 'premiere_photo' })
        .select();
      badgeDebloque = 'premiere_photo';
    }

    return res.status(201).json({
      ok: true,
      photo,
      streak: streakInfo,
      badge_debloque: badgeDebloque || streakInfo?.badge_debloque,
      message: is_awards_candidate
        ? 'Candidature envoyée — les sœurs vont voter pour toi 👑'
        : 'Photo postée — que la ronde commence ✨',
    });
  } catch (err) {
    console.error('[feed-post]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
