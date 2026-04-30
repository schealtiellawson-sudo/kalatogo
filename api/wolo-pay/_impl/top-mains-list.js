// ================================================================
// Top Mains les Plus Demandées — Classement public mensuel
// GET /api/wolo-pay/top-mains-list
// Query params:
//   ?categorie=coiffure|couture (default: 'coiffure')
//   ?pays=BJ|TG                 (optional — filtre)
//   ?mois=YYYY-MM               (optional — défaut mois courant)
//   ?limit=10                   (default: 10, max 50)
//
// Retourne :
//   {
//     ok, mois, categorie, pays,
//     pros: [
//       { user_id, nom, photo_profil, metier, ville, pays, count, rang, emoji }
//     ]
//   }
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const RANG_EMOJI = {
  1: '👑',
  2: '🥈',
  3: '🥉',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const categorie = (req.query.categorie || 'coiffure').toLowerCase();
  if (!['coiffure', 'couture'].includes(categorie)) {
    return res.status(400).json({ error: 'categorie doit etre coiffure ou couture' });
  }
  const pays = (req.query.pays || '').toUpperCase();
  if (pays && !['BJ', 'TG'].includes(pays)) {
    return res.status(400).json({ error: 'pays doit etre BJ ou TG' });
  }
  const mois = req.query.mois || new Date().toISOString().slice(0, 7);
  let limit = parseInt(req.query.limit, 10) || 10;
  if (limit < 1) limit = 1;
  if (limit > 50) limit = 50;

  try {
    // 1) Toutes les photos validees du mois pour la categorie demandee
    //    avec un tag_pro_user_id non null.
    let q = supabase
      .from('feed_photos')
      .select('tag_pro_user_id, ville, pays')
      .eq('mois', mois)
      .eq('categorie', categorie)
      .eq('video_validee', true)
      .not('tag_pro_user_id', 'is', null);

    if (pays) q = q.eq('pays', pays);

    const { data: photos, error } = await q;
    if (error) throw error;

    // 2) Compter par tag_pro_user_id
    const counts = {};
    for (const p of (photos || [])) {
      const uid = p.tag_pro_user_id;
      if (!uid) continue;
      counts[uid] = (counts[uid] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (sorted.length === 0) {
      return res.status(200).json({ ok: true, mois, categorie, pays: pays || null, pros: [] });
    }

    // 3) Enrichir avec wolo_prestataires
    const userIds = sorted.map(([uid]) => uid);
    const { data: prests } = await supabase
      .from('wolo_prestataires')
      .select('user_id, nom_complet, photo_profil, metier_principal, ville, abonnement')
      .in('user_id', userIds);

    const presMap = {};
    for (const p of (prests || [])) presMap[p.user_id] = p;

    const pros = sorted.map(([uid, count], idx) => {
      const pres = presMap[uid] || {};
      const ville = pres.ville || '';
      const proPays = ville && /cotonou|porto|abomey|parakou|bohicon/i.test(ville)
        ? 'BJ'
        : (ville ? 'TG' : null);
      const rang = idx + 1;
      return {
        user_id: uid,
        nom: pres.nom_complet || 'Pro WOLO',
        photo_profil: pres.photo_profil || '',
        metier: pres.metier_principal || (categorie === 'coiffure' ? 'Coiffeuse' : 'Couturière'),
        ville,
        pays: proPays,
        abonnement: pres.abonnement || 'Base',
        count,
        rang,
        emoji: RANG_EMOJI[rang] || '⭐',
      };
    });

    return res.status(200).json({
      ok: true,
      mois,
      categorie,
      pays: pays || null,
      pros,
    });
  } catch (err) {
    console.error('[top-mains-list]', err);
    return res.status(500).json({ error: 'Erreur interne', detail: err.message });
  }
}
