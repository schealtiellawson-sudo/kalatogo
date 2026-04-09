// ================================================================
// WOLO Pay — Solde + mouvements récents
// ================================================================
// GET /api/wolo-pay/balance?user_id=xxx&limit=20
// ================================================================
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, limit = 20 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    const { data: credit } = await supabase
      .from('wolo_credit')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const { data: mouvements } = await supabase
      .from('wolo_credit_mouvements')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    return res.status(200).json({ ok: true, credit, mouvements: mouvements || [] });
  } catch (err) {
    console.error('[balance]', err);
    return res.status(500).json({ error: err.message });
  }
}
