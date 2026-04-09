// POST /api/wolo-pay/create-payment-link { merchant_id, montant, description }
import { supabase } from '../../_lib/supabase.js';
import crypto from 'node:crypto';
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // List last 10 for merchant
    const { merchant_id } = req.query;
    if (!merchant_id) return res.status(400).json({ error: 'merchant_id requis' });
    const { data } = await supabase.from('wolo_payment_links')
      .select('*').eq('merchant_id', merchant_id)
      .order('created_at', { ascending: false }).limit(10);
    // auto-expire
    const now = new Date();
    const updated = (data||[]).map(l => {
      if (l.statut==='PENDING' && new Date(l.expires_at)<now) return {...l, statut:'EXPIRED'};
      return l;
    });
    return res.status(200).json({ ok: true, links: updated });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { merchant_id, montant, description } = body;
    if (!merchant_id || !montant || montant < 100)
      return res.status(400).json({ error: 'merchant_id, montant >= 100 requis' });
    const token = crypto.randomBytes(8).toString('hex');
    const { data, error } = await supabase.from('wolo_payment_links').insert({
      merchant_id, token, montant, description: description || null
    }).select().single();
    if (error) throw error;
    const url = `https://wolomarket.vercel.app/pay/${merchant_id}?t=${token}`;
    return res.status(200).json({ ok: true, link: data, url });
  } catch (err) {
    console.error('[create-payment-link]', err);
    return res.status(500).json({ error: err.message });
  }
}
