// ================================================================
// WOLO Awards — Liste des candidats du mois
// GET /api/wolo-pay/awards-candidats?mois=YYYY-MM&pays=BJ|TG
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const mois = req.query.mois || new Date().toISOString().slice(0, 7);
  const pays = req.query.pays; // optionnel, filtre par pays

  try {
    let query = supabase
      .from('wolo_awards')
      .select('id, user_id, pays, video_url, video_validee, nb_votes, gagnant, vice_champion, created_at')
      .eq('mois', mois)
      .eq('video_validee', true)
      .order('nb_votes', { ascending: false });

    if (pays) query = query.eq('pays', pays);

    const { data: candidats, error } = await query;
    if (error) throw error;

    // Enrichir avec noms + photos depuis profiles
    const userIds = (candidats || []).map(c => c.user_id);
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom_complet, pays, avatar_url')
        .in('id', userIds);
      for (const p of (profiles || [])) profilesMap[p.id] = p;
    }

    // Enrichir avec Airtable (photo, métier)
    const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'applmj1RDrJkR8C4w';
    const AT_HEADERS = { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` };

    const enrichis = (candidats || []).map(c => {
      const p = profilesMap[c.user_id] || {};
      return {
        id: c.id,
        user_id: c.user_id,
        nom: p.nom_complet || '—',
        pays: c.pays || p.pays || '',
        photo: p.avatar_url || '',
        video_url: c.video_url,
        nb_votes: c.nb_votes || 0,
        gagnant: c.gagnant,
        vice_champion: c.vice_champion,
      };
    });

    return res.status(200).json({ ok: true, mois, candidats: enrichis });
  } catch (err) {
    console.error('[awards-candidats]', err);
    return res.status(500).json({ error: err.message });
  }
}
