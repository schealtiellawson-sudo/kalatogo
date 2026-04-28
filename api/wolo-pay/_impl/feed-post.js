// ================================================================
// Mur des Reines — Poster une photo (v2 2026-04-28)
// POST /api/wolo-pay/feed-post
// Body: {
//   user_id, photo_url, photos_url?, description?,
//   categorie, quartier?, ville?, pays?, theme_mois?,
//   is_awards_candidate?, tag_pro_user_id?, tag_pro_libre?
// }
//
// Règles :
//  - Tag obligatoire si is_awards_candidate (tag_pro_user_id OU tag_pro_libre)
//  - photos_url = jusqu'à 3 photos (Tinder-like) — 1ère = principale
//  - Plus de gating Pro pour candidater (Mur des Reines ouvert à toutes)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const {
    user_id,
    photo_url,
    photos_url,                   // tableau jusqu'à 3 photos
    description = '',
    categorie,                    // 'coiffure' | 'couture' | 'libre'
    quartier,
    ville,
    pays,
    theme_mois,
    is_awards_candidate = false,
    tag_pro_user_id,              // user_id de la coiffeuse / couturière taguée
    tag_pro_libre,                // nom libre si la pro n'est pas sur WOLO
  } = req.body || {};

  if (!user_id || !photo_url || !categorie) {
    return res.status(400).json({ error: 'user_id, photo_url, categorie requis' });
  }
  if (!['coiffure','couture','libre'].includes(categorie)) {
    return res.status(400).json({ error: 'categorie invalide' });
  }

  // Tag obligatoire pour candidater aux Reines
  const wantsAwards = is_awards_candidate === true || is_awards_candidate === 'true';
  if (wantsAwards && !tag_pro_user_id && !tag_pro_libre) {
    return res.status(400).json({
      error: 'Tag de la coiffeuse / couturière obligatoire pour candidater au Mur des Reines (sinon ta photo n\'est pas éligible).'
    });
  }

  // Normaliser photos_url
  let photosArr = [];
  if (Array.isArray(photos_url)) photosArr = photos_url.slice(0, 3);
  else if (typeof photos_url === 'string' && photos_url.trim()) {
    try { const p = JSON.parse(photos_url); if (Array.isArray(p)) photosArr = p.slice(0, 3); } catch(_){}
  }
  if (photosArr.length === 0) photosArr = [photo_url];

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

    // Mur des Reines = OUVERT à toutes les femmes B/T (pas de gating Pro)
    // Seule règle : 1 candidature/mois/catégorie pour éviter le spam
    if (wantsAwards) {
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
        photo_url,                                     // photo principale (compat)
        photos_url: photosArr,                         // jusqu'à 3 photos (jsonb)
        description: (description || '').slice(0, 500),
        categorie,
        quartier: quartier || null,
        ville: ville || null,
        pays: pays || null,
        theme_mois: themeFinal || null,
        is_awards_candidate: wantsAwards,
        tag_pro_user_id: tag_pro_user_id || null,
        tag_pro_libre: (tag_pro_libre || '').slice(0, 100) || null,
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
