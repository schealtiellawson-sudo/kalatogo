// GET /api/wolo-pay/reservation-table-list?pro_user_id=...
// Auth requise — on ne renvoie que les résas du pro courant.
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const proUserId = req.query.pro_user_id || userId;
  if (proUserId !== userId) return res.status(403).json({ error: 'Accès refusé' });

  const { data, error } = await supabase
    .from('wolo_reservations_table')
    .select('*')
    .eq('pro_user_id', userId)
    .order('date_reservation', { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ reservations: data || [] });
}
