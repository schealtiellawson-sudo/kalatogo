// ================================================================
// WOLO Pay — Rechercher un utilisateur par email
// GET /api/wolo-pay/search-user?q=xxx
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { q } = req.query;
    if (!q || q.length < 3) return res.status(200).json({ ok: true, users: [] });

    const { data } = await supabase
      .from('profiles')
      .select('id, email, pays, plan')
      .ilike('email', `%${q}%`)
      .limit(10);

    return res.status(200).json({ ok: true, users: data || [] });
  } catch (err) {
    console.error('[search-user]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
