// ================================================================
// POST /api/wolo-pay/push-subscribe
// Body : { subscription: { endpoint, keys: { p256dh, auth } }, userAgent? }
// Enregistre (ou met à jour) une souscription Web Push pour le user authentifié.
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const { subscription, userAgent } = req.body || {};
  if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return res.status(400).json({
      error: 'subscription invalide',
      hint: 'Attendu : { subscription: { endpoint, keys: { p256dh, auth } } }',
    });
  }

  const endpoint = String(subscription.endpoint).slice(0, 2000);
  const p256dh = String(subscription.keys.p256dh).slice(0, 500);
  const authKey = String(subscription.keys.auth).slice(0, 500);
  const ua = String(userAgent || req.headers['user-agent'] || '').slice(0, 500);

  // Upsert sur endpoint (UNIQUE) — si la souscription existe déjà on rafraichit user_id + keys
  const { data, error } = await supabase
    .from('wolo_push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh_key: p256dh,
        auth_key: authKey,
        user_agent: ua,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )
    .select('id, created_at, updated_at')
    .single();

  if (error) {
    console.error('[push-subscribe]', error);
    return res.status(500).json({ error: 'Enregistrement échoué', detail: error.message });
  }

  return res.status(200).json({ ok: true, subscription: data });
}
