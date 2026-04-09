// ================================================================
// WOLO Pay — Historique transactions marchand
// ================================================================
// GET /api/wolo-pay/history?user_id=xxx&statut=PAYÉ&limit=50
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, statut, limit = 50 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    let q = supabase
      .from('wolo_transactions')
      .select('*')
      .eq('merchant_id', user_id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (statut) q = q.eq('statut', statut);

    const { data, error } = await q;
    if (error) throw error;

    return res.status(200).json({ ok: true, transactions: data || [] });
  } catch (err) {
    console.error('[history]', err);
    return res.status(500).json({ error: err.message });
  }
}
