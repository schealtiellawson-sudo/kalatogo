// ================================================================
// Mur des Reines — Badges + niveau + streak d'un user
// GET /api/wolo-pay/badges-list?user_id=xxx
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const BADGE_META = {
  premiere_photo:  { emoji: '🌱', titre: 'Première photo',       hint: 'Tu viens de poser ta première pierre' },
  likes_100:       { emoji: '💯', titre: '100 likes',            hint: 'Tu commences à attirer les regards' },
  likes_500:       { emoji: '🔥', titre: '500 likes',            hint: 'Tu chauffes le mur' },
  likes_1000:      { emoji: '👑', titre: '1 000 likes',          hint: 'Ton nom court les quartiers' },
  top_10_mois:     { emoji: '🥉', titre: 'Top 10 du mois',       hint: 'Tu rentres dans le cercle' },
  podium_mois:     { emoji: '🥈', titre: 'Podium du mois',       hint: 'Une marche te sépare de la couronne' },
  gagnante_mois:   { emoji: '🏆', titre: 'Reine du mois',        hint: '50 000 F. Et la reconnaissance.' },
  serie_rouge_7:   { emoji: '🔥', titre: 'Série rouge · 7 jours', hint: 'Tu postes chaque jour depuis une semaine' },
  serie_rouge_30:  { emoji: '💎', titre: 'Série rouge · 30 jours', hint: 'Un mois complet. Respect.' },
  coup_coeur_jury: { emoji: '💛', titre: 'Coup de cœur du jury',  hint: 'L\'équipe WOLO t\'a remarquée' },
  virale_100:      { emoji: '🚀', titre: 'Virale',                hint: 'Tu as fait le tour de WhatsApp' },
  mentor_5:        { emoji: '🤝', titre: 'Mentor',                hint: '5 sœurs inscrites grâce à toi' },
  apprentie:       { emoji: '🌱', titre: 'Apprentie',             hint: '0-50 likes cumulés' },
  ambassadrice:    { emoji: '💃', titre: 'Ambassadrice',          hint: '51-500 likes cumulés' },
  reine:           { emoji: '👑', titre: 'Reine',                 hint: '501-2 000 likes cumulés' },
  legende:         { emoji: '🌟', titre: 'Légende',               hint: '2 000+ likes cumulés' },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id requis' });

  try {
    // Badges débloqués
    const { data: badges } = await supabase
      .from('badges_wolo')
      .select('badge_type, mois, unlocked_at')
      .eq('user_id', user_id)
      .order('unlocked_at', { ascending: false });

    // Streak
    const { data: streak } = await supabase
      .from('streaks_wolo')
      .select('current_streak, longest_streak, last_post_date, multiplicateur')
      .eq('user_id', user_id)
      .maybeSingle();

    // Total likes + photos
    const { data: photos } = await supabase
      .from('feed_photos')
      .select('nb_likes')
      .eq('user_id', user_id);

    const totalLikes = (photos || []).reduce((s, p) => s + (p.nb_likes || 0), 0);
    const nbPhotos = (photos || []).length;

    // Niveau actuel
    let niveau = 'apprentie';
    if (totalLikes >= 2001) niveau = 'legende';
    else if (totalLikes >= 501) niveau = 'reine';
    else if (totalLikes >= 51) niveau = 'ambassadrice';

    // Progression vers prochain niveau
    let next = null;
    if (niveau === 'apprentie')       next = { cible: 'ambassadrice', seuil: 51,   actuel: totalLikes };
    else if (niveau === 'ambassadrice') next = { cible: 'reine',        seuil: 501,  actuel: totalLikes };
    else if (niveau === 'reine')        next = { cible: 'legende',      seuil: 2001, actuel: totalLikes };

    // Badges uniques (on déduplique par type, on garde la plus récente)
    const badgesUniques = [];
    const seen = new Set();
    for (const b of (badges || [])) {
      if (seen.has(b.badge_type)) continue;
      seen.add(b.badge_type);
      const meta = BADGE_META[b.badge_type] || {};
      badgesUniques.push({ ...b, ...meta });
    }

    return res.status(200).json({
      ok: true,
      niveau,
      niveau_meta: { ...BADGE_META[niveau], niveau },
      next,
      total_likes: totalLikes,
      nb_photos: nbPhotos,
      streak: streak || { current_streak: 0, longest_streak: 0, multiplicateur: 1 },
      badges: badgesUniques,
      all_badges_meta: BADGE_META,
    });
  } catch (err) {
    console.error('[badges-list]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
