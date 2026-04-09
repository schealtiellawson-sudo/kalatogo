// ================================================================
// WOLO Pay — Vérifier PIN (3 tentatives → blocage 30 min)
// POST /api/wolo-pay/pin-verify  { user_id, pin }
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { verifyPin } from '../../_lib/pin.js';

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 30;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, pin } = body;
    if (!user_id || !pin) return res.status(400).json({ error: 'user_id + pin requis' });

    const { data: row } = await supabase
      .from('wolo_pin').select('*').eq('user_id', user_id).single();
    if (!row) return res.status(404).json({ error: 'PIN non défini', code: 'NO_PIN' });

    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      return res.status(423).json({
        error: 'Compte bloqué',
        locked_until: row.locked_until,
        code: 'LOCKED'
      });
    }

    const ok = verifyPin(pin, row.pin_hash, row.salt);

    if (!ok) {
      const attempts = (row.attempts || 0) + 1;
      const patch = { attempts, updated_at: new Date().toISOString() };
      if (attempts >= MAX_ATTEMPTS) {
        patch.locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
        patch.attempts = 0;
      }
      await supabase.from('wolo_pin').update(patch).eq('user_id', user_id);
      return res.status(401).json({
        error: 'PIN incorrect',
        remaining: Math.max(0, MAX_ATTEMPTS - attempts),
        locked: attempts >= MAX_ATTEMPTS,
        code: attempts >= MAX_ATTEMPTS ? 'LOCKED' : 'BAD_PIN'
      });
    }

    await supabase
      .from('wolo_pin')
      .update({ attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
      .eq('user_id', user_id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[pin-verify]', err);
    return res.status(500).json({ error: err.message });
  }
}
