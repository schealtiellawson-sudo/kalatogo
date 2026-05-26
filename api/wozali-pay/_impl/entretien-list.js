// GET /api/wozali-pay/entretien-list
// Retourne les entretiens à venir + passés de l'utilisateur (candidat ou recruteur).
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const userId = req.authenticatedUser?.user_id;
    if (!userId) return res.status(401).json({ error: 'Auth requis' });

    const { scope } = req.query; // 'upcoming' | 'past' | 'all'
    const now = new Date().toISOString();

    let q = supabase
      .from('wozali_entretiens')
      .select('*')
      .or(`candidat_user_id.eq.${userId},recruteur_user_id.eq.${userId}`)
      .limit(200);

    // Filtres scope (on n'applique qu'un seul .order())
    if (scope === 'upcoming') {
      q = q.gte('date_heure', now).order('date_heure', { ascending: true });
    } else if (scope === 'past') {
      q = q.lt('date_heure', now).order('date_heure', { ascending: false });
    } else {
      q = q.order('date_heure', { ascending: false });
    }

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    const entretiens = (data || []).map(e => ({
      ...e,
      role: e.candidat_user_id === userId ? 'candidat' : 'recruteur',
    }));

    return res.status(200).json({ ok: true, entretiens });
  } catch (err) {
    console.error('[entretien-list] crash:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
}
