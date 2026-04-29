import { supabase } from '../../_lib/supabase.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });
  const { data, error } = await supabase
    .from('wolo_commande_patisserie').select('*').eq('pro_user_id', userId)
    .order('date_evenement', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ commandes: data || [] });
}
