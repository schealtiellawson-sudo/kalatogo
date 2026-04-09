// ================================================================
// WOLO Pay — Solde + mouvements récents (avec auto-provisioning)
// ================================================================
// GET /api/wolo-pay/balance?user_id=xxx&email=yyy&limit=20
// ================================================================
import { supabase } from '../_lib/supabase.js';
import { ensureUserProvisioned } from '../_lib/provisioning.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, email, limit = 20 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    await ensureUserProvisioned({ user_id, email: email || null });

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

    const { data: abonnement } = await supabase
      .from('abonnements')
      .select('*')
      .eq('user_id', user_id)
      .single();

    return res.status(200).json({ ok: true, credit, mouvements: mouvements || [], abonnement });
  } catch (err) {
    console.error('[balance]', err);
    return res.status(500).json({ error: err.message });
  }
}
