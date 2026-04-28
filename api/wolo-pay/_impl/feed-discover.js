// ================================================================
// Mur des Reines — Mode Découvrir (swipe / duel infini / roulette)
// GET  /api/wolo-pay/feed-discover?mode=swipe|duel|roulette&categorie=&viewer_id=&voter_session=&batch=10
// POST /api/wolo-pay/feed-discover  Body: { winner_id, loser_id, voter_id?, voter_session? }
//
// v2 (2026-04-28) :
//  - Insert dans duels_photos (trigger SQL auto-update +10/+1/+20 streak)
//  - Shuffle bag : exclut les paires déjà votées dans la session courante
//  - Enrichit depuis wolo_prestataires (au lieu de profiles)
//  - Support photos_url (jsonb 3 photos Tinder)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {

  // POST = enregistrer le résultat d'un duel
  if (req.method === 'POST') {
    const { winner_id, loser_id, voter_id, voter_session } = req.body || {};
    if (!winner_id || !loser_id) return res.status(400).json({ error: 'winner_id et loser_id requis' });
    if (winner_id === loser_id) return res.status(400).json({ error: 'winner_id et loser_id doivent différer' });
    if (!voter_id && !voter_session) return res.status(400).json({ error: 'voter_id ou voter_session requis' });

    try {
      // Insert dans duels_photos — le trigger SQL update_feed_duel_stats
      // s'occupe d'incrémenter wins/losses/streak/points sur feed_photos.
      // Ordre photo_a/photo_b normalisé pour cohérence.
      const photo_a = winner_id < loser_id ? winner_id : loser_id;
      const photo_b = winner_id < loser_id ? loser_id : winner_id;
      const { error } = await supabase.from('duels_photos').insert({
        voter_user_id: voter_id || null,
        voter_session: voter_session || null,
        photo_a, photo_b,
        winner: winner_id,
      });
      if (error) {
        console.error('[duels_photos insert]', error);
        return res.status(500).json({ error: 'insert duel failed', detail: error.message });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[feed-discover POST]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'GET/POST only' });

  const { mode = 'swipe', categorie, viewer_id, voter_session, limit = 20, batch = 10 } = req.query;

  try {
    // Pool : photos validées récentes
    let query = supabase
      .from('feed_photos')
      .select('id, user_id, mois, photo_url, photos_url, description, categorie, quartier, ville, pays, theme_mois, is_awards_candidate, tag_pro_user_id, tag_pro_libre, nb_likes, nb_commentaires, nb_shares, duel_wins, duel_losses, duel_streak, duel_points, created_at')
      .eq('video_validee', true);

    if (categorie && categorie !== 'toutes') query = query.eq('categorie', categorie);

    const since30 = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    query = query.gte('created_at', since30);

    if (viewer_id) query = query.neq('user_id', viewer_id);

    const { data: pool, error } = await query.limit(500);
    if (error) throw error;
    if (!pool || pool.length === 0) {
      return res.status(200).json({ ok: true, mode, photos: [], pairs: [] });
    }

    // SHUFFLE BAG : récupère les photos déjà vues dans la session pour les exclure
    // Si toutes les photos ont été vues → on remet à zéro (nouveau cycle)
    let alreadySeen = new Set();
    const sessionKey = voter_id || voter_session;
    if (sessionKey) {
      const sinceCycle = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const filterCol = voter_id ? 'voter_user_id' : 'voter_session';
      const { data: recentDuels } = await supabase
        .from('duels_photos')
        .select('photo_a, photo_b')
        .eq(filterCol, sessionKey)
        .gte('created_at', sinceCycle)
        .limit(500);
      for (const d of (recentDuels || [])) {
        alreadySeen.add(d.photo_a);
        alreadySeen.add(d.photo_b);
      }
    }

    // Filtre pool : exclure photos déjà vues si on en a au moins 2 disponibles
    let active = pool.filter(p => !alreadySeen.has(p.id));
    if (active.length < 2) active = pool; // reset cycle si rien à montrer

    // Shuffle Fisher-Yates
    const shuffled = [...active];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Enrichir avec wolo_prestataires
    const userIds = [...new Set(shuffled.map(p => p.user_id))];
    let presMap = {};
    if (userIds.length > 0) {
      const { data: prestataires } = await supabase
        .from('wolo_prestataires')
        .select('user_id, nom_complet, photo_profil, metier_principal, ville, statut_artisan')
        .in('user_id', userIds);
      for (const p of (prestataires || [])) presMap[p.user_id] = p;
    }

    const enrich = (p) => {
      const pres = presMap[p.user_id] || {};
      const total = (p.duel_wins || 0) + (p.duel_losses || 0);
      return {
        ...p,
        photos_url: Array.isArray(p.photos_url) ? p.photos_url : (p.photos_url ? p.photos_url : []),
        user_nom: pres.nom_complet || '—',
        user_avatar: pres.photo_profil || '',
        user_metier: pres.metier_principal || '',
        user_pays: p.pays || (pres.ville && /cotonou|porto/i.test(pres.ville) ? 'BJ' : 'TG'),
        user_statut: pres.statut_artisan || null,
        win_rate: total > 0 ? Math.round(((p.duel_wins || 0) / total) * 100) : null,
      };
    };

    if (mode === 'duel') {
      const nbPairs = Math.min(Number(batch) || 10, 50);
      const pairs = [];
      const used = new Set();
      let i = 0;
      while (pairs.length < nbPairs && i < shuffled.length - 1) {
        const a = shuffled[i];
        const b = shuffled[i + 1];
        i += 2;
        if (!a || !b || a.id === b.id || a.user_id === b.user_id) continue;
        const key = [a.id, b.id].sort().join('-');
        if (used.has(key)) continue;
        used.add(key);
        pairs.push([enrich(a), enrich(b)]);
      }
      return res.status(200).json({ ok: true, mode: 'duel', pairs, pool_size: pool.length, fresh: active.length });
    }

    let selection = [];
    if (mode === 'roulette') selection = shuffled.slice(0, 1);
    else selection = shuffled.slice(0, Number(limit));

    return res.status(200).json({
      ok: true, mode,
      photos: selection.map(enrich),
      pool_size: pool.length,
      fresh: active.length,
    });
  } catch (err) {
    console.error('[feed-discover]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
