// ================================================================
// WOLO Pay — Créer / réinitialiser le PIN
// POST /api/wolo-pay/pin-set  { user_id, pin }
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { hashPin } from '../../_lib/pin.js';
import { ensureUserProvisioned } from '../../_lib/provisioning.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, pin, email } = body;
    if (!user_id || !pin || !/^\d{4,6}$/.test(String(pin))) {
      return res.status(400).json({ error: 'user_id + PIN 4 à 6 chiffres requis' });
    }
    await ensureUserProvisioned({ user_id, email });

    const { hash, salt } = hashPin(pin);
    const { error } = await supabase
      .from('wolo_pin')
      .upsert({
        user_id, pin_hash: hash, salt,
        attempts: 0, locked_until: null, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[pin-set]', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}
