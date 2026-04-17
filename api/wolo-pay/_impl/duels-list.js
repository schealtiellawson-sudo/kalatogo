// ================================================================
// Mur des Reines — Duels hebdo (quartier/ville/catégorie)
// GET /api/wolo-pay/duels-list?semaine=&viewer_id=
// POST /api/wolo-pay/duels-list  Body: { user_id, duel_id, choix: 'a'|'b' }
// ================================================================
import { supabase } from '../../_lib/supabase.js';

function semaineCourante() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = (now - start) / 86400000;
  const week = Math.ceil((diff + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, '0')}`;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { semaine = semaineCourante(), viewer_id } = req.query;

    try {
      const { data: duels } = await supabase
        .from('duels_quartiers')
        .select('*')
        .eq('semaine', semaine)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false });

      // Votes du viewer
      let mesVotes = {};
      if (viewer_id && duels?.length) {
        const { data: votes } = await supabase
          .from('duels_votes')
          .select('duel_id, choix')
          .eq('user_id', viewer_id)
          .in('duel_id', duels.map(d => d.id));
        for (const v of (votes || [])) mesVotes[v.duel_id] = v.choix;
      }

      const enriched = (duels || []).map(d => ({
        ...d,
        mon_vote: mesVotes[d.id] || null,
        total_votes: (d.votes_a || 0) + (d.votes_b || 0),
        pct_a: ((d.votes_a || 0) / Math.max(1, (d.votes_a || 0) + (d.votes_b || 0))) * 100,
        pct_b: ((d.votes_b || 0) / Math.max(1, (d.votes_a || 0) + (d.votes_b || 0))) * 100,
      }));

      return res.status(200).json({ ok: true, semaine, duels: enriched });
    } catch (err) {
      console.error('[duels-list GET]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  if (req.method === 'POST') {
    const { user_id, duel_id, choix } = req.body || {};
    if (!user_id || !duel_id || !choix) return res.status(400).json({ error: 'user_id, duel_id, choix requis' });
    if (!['a','b'].includes(choix)) return res.status(400).json({ error: 'choix doit être a ou b' });

    try {
      const { error: voteErr } = await supabase
        .from('duels_votes')
        .insert({ user_id, duel_id, choix });

      if (voteErr) {
        if (voteErr.code === '23505') {
          return res.status(409).json({ error: 'Tu as déjà voté pour ce duel' });
        }
        throw voteErr;
      }

      // Incrémenter compteur du duel
      const col = choix === 'a' ? 'votes_a' : 'votes_b';
      const { data: duel } = await supabase
        .from('duels_quartiers')
        .select(col)
        .eq('id', duel_id)
        .single();

      await supabase
        .from('duels_quartiers')
        .update({ [col]: (duel?.[col] || 0) + 1 })
        .eq('id', duel_id);

      return res.status(200).json({ ok: true, choix });
    } catch (err) {
      console.error('[duels-list POST]', err);
      return res.status(500).json({ error: 'Erreur interne' });
    }
  }

  return res.status(405).json({ error: 'GET/POST only' });
}
