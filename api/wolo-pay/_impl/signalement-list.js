// GET /api/wolo-pay/signalement-list
// Retourne les signalements émis par l'utilisateur connecté.
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const { data, error } = await supabase
    .from('wolo_signalements')
    .select('id, motif, description, statut, mediation_result, created_at, resolved_at, target_user_id, target_offre_airtable_id, target_candidature_airtable_id')
    .eq('reporter_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, signalements: data || [] });
}
