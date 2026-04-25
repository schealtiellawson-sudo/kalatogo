// GET /api/wolo-pay/entretien-list
// Retourne les entretiens à venir + passés de l'utilisateur (candidat ou recruteur).
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const { scope } = req.query; // 'upcoming' | 'past' | 'all'
  let q = supabase
    .from('wolo_entretiens')
    .select('*')
    .or(`candidat_user_id.eq.${userId},recruteur_user_id.eq.${userId}`)
    .order('date_heure', { ascending: false })
    .limit(200);

  const now = new Date().toISOString();
  if (scope === 'upcoming') q = q.gte('date_heure', now).order('date_heure', { ascending: true });
  else if (scope === 'past') q = q.lt('date_heure', now);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const entretiens = (data || []).map(e => ({
    ...e,
    role: e.candidat_user_id === userId ? 'candidat' : 'recruteur',
  }));

  return res.status(200).json({ ok: true, entretiens });
}
