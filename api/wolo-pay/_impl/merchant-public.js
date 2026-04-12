// GET /api/wolo-pay/merchant-public?id=<merchant_id>
import { supabase } from '../../_lib/supabase.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { id, token } = req.query;
    if (!id) return res.status(400).json({ error: 'id requis' });
    const { data: p } = await supabase
      .from('profiles')
      .select('id,email,metier,quartier,ville,photo_url')
      .eq('id', id).single();
    if (!p) return res.status(404).json({ error: 'Commerçant introuvable' });
    const { data: abo } = await supabase
      .from('abonnements').select('plan').eq('user_id', id).single();
    let link = null;
    if (token) {
      const { data: l } = await supabase
        .from('wolo_payment_links')
        .select('*').eq('token', token).single();
      if (l) {
        if (l.statut === 'PAID') link = { ...l, error: 'Ce lien a déjà été payé' };
        else if (new Date(l.expires_at) < new Date()) link = { ...l, error: 'Ce lien a expiré' };
        else link = l;
      }
    }
    return res.status(200).json({ ok: true, merchant: { ...p, plan: abo?.plan || 'gratuit' }, link });
  } catch (err) {
    console.error('[merchant-public]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
