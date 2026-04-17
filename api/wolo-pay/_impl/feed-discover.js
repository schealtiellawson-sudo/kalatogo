// ================================================================
// Mur des Reines — Mode Découvrir (swipe / duel infini / roulette)
// GET  /api/wolo-pay/feed-discover?mode=swipe|duel|roulette&categorie=&viewer_id=&batch=10
// POST /api/wolo-pay/feed-discover  Body: { winner_id, loser_id, voter_id }
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {

  // POST = enregistrer le résultat d'un duel
  if (req.method === 'POST') {
    const { winner_id, loser_id, voter_id } = req.body || {};
    if (!winner_id || !loser_id) return res.status(400).json({ error: 'winner_id et loser_id requis' });

    try {
      // Incrémenter wins du gagnant et losses du perdant en parallèle
      const [winRes, loseRes] = await Promise.all([
        supabase.rpc('increment_field', { row_id: winner_id, table_name: 'feed_photos', field_name: 'duel_wins' }).catch(() => null),
        supabase.rpc('increment_field', { row_id: loser_id, table_name: 'feed_photos', field_name: 'duel_losses' }).catch(() => null),
      ]);

      // Fallback si la RPC n'existe pas : update direct
      if (!winRes?.data && winRes !== null) {
        const { data: w } = await supabase.from('feed_photos').select('duel_wins').eq('id', winner_id).single();
        await supabase.from('feed_photos').update({ duel_wins: (w?.duel_wins || 0) + 1 }).eq('id', winner_id);
      }
      if (!loseRes?.data && loseRes !== null) {
        const { data: l } = await supabase.from('feed_photos').select('duel_losses').eq('id', loser_id).single();
        await supabase.from('feed_photos').update({ duel_losses: (l?.duel_losses || 0) + 1 }).eq('id', loser_id);
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[feed-discover POST]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'GET/POST only' });

  const { mode = 'swipe', categorie, viewer_id, limit = 20, batch = 10 } = req.query;

  try {
    let query = supabase
      .from('feed_photos')
      .select('id, user_id, mois, photo_url, description, categorie, quartier, ville, pays, theme_mois, is_awards_candidate, nb_likes, nb_commentaires, nb_shares, duel_wins, duel_losses, created_at')
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

    // Shuffle Fisher-Yates
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Enrichir avec profiles
    const userIds = [...new Set(shuffled.map(p => p.user_id))];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom_complet, avatar_url, metier, pays')
        .in('id', userIds);
      for (const p of (profiles || [])) profilesMap[p.id] = p;
    }

    const enrich = (p) => ({
      ...p,
      user_nom: profilesMap[p.user_id]?.nom_complet || '—',
      user_avatar: profilesMap[p.user_id]?.avatar_url || '',
      user_metier: profilesMap[p.user_id]?.metier || '',
      user_pays: profilesMap[p.user_id]?.pays || p.pays || '',
      win_rate: (p.duel_wins || 0) + (p.duel_losses || 0) > 0
        ? Math.round(((p.duel_wins || 0) / ((p.duel_wins || 0) + (p.duel_losses || 0))) * 100)
        : null,
    });

    if (mode === 'duel') {
      // Générer N paires pour le duel infini
      const nbPairs = Math.min(Number(batch) || 10, 50);
      const pairs = [];
      const used = new Set();
      let attempts = 0;
      while (pairs.length < nbPairs && attempts < nbPairs * 5) {
        attempts++;
        const a = shuffled[Math.floor(Math.random() * shuffled.length)];
        const b = shuffled[Math.floor(Math.random() * shuffled.length)];
        if (a.id === b.id) continue;
        if (a.user_id === b.user_id) continue;
        const key = [a.id, b.id].sort().join('-');
        if (used.has(key)) continue;
        used.add(key);
        pairs.push([enrich(a), enrich(b)]);
      }
      return res.status(200).json({ ok: true, mode: 'duel', pairs, pool_size: pool.length });
    }

    // Modes swipe et roulette
    let selection = [];
    if (mode === 'roulette') {
      selection = shuffled.slice(0, 1);
    } else {
      selection = shuffled.slice(0, Number(limit));
    }

    return res.status(200).json({
      ok: true, mode,
      photos: selection.map(enrich),
    });
  } catch (err) {
    console.error('[feed-discover]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
