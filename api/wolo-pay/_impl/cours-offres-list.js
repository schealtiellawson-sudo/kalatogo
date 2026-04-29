// GET /api/wolo-pay/cours-offres-list?pro_user_id=...
// Public — affiche les offres de cours sur le profil public.
import { supabase } from '../../_lib/supabase.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const proUserId = req.query?.pro_user_id;
  if (!proUserId) return res.status(400).json({ error: 'pro_user_id requis' });
  const { data, error } = await supabase
    .from('wolo_cours_offres').select('*').eq('pro_user_id', proUserId).eq('actif', true)
    .order('ordre', { ascending: true }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ offres: data || [] });
}
