// ================================================================
// WhatsApp Sequences — Enqueue
// POST /api/wolo-pay/whatsapp-enqueue
// Body: { user_id, phone, sequence: 'A_onboarding'|'B_apprentie'|'C_concours', payload?: {} }
// Insère tous les templates de la séquence dans wolo_whatsapp_queue avec
// scheduled_at = now() + delay_hours.
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { user_id, phone, sequence, payload = {} } = req.body || {};
  if (!user_id || !phone || !sequence) {
    return res.status(400).json({ error: 'user_id, phone, sequence requis' });
  }
  if (!['A_onboarding','B_apprentie','C_concours'].includes(sequence)) {
    return res.status(400).json({ error: 'sequence inconnue' });
  }

  try {
    // 1. Charger les templates de la séquence
    const { data: templates, error: tErr } = await supabase
      .from('wolo_whatsapp_templates')
      .select('key, step, delay_hours')
      .eq('sequence', sequence)
      .eq('active', true)
      .order('step', { ascending: true });
    if (tErr) throw tErr;
    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'Aucun template actif pour cette séquence' });
    }

    // 2. Annuler une éventuelle séquence pending du même type pour ce user (resync)
    await supabase
      .from('wolo_whatsapp_queue')
      .update({ status: 'cancelled' })
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .like('template_key', sequence === 'A_onboarding' ? 'A%' : sequence === 'B_apprentie' ? 'B%' : 'C%');

    // 3. Insérer chaque template avec scheduled_at calculé
    const now = Date.now();
    const rows = templates.map(t => ({
      user_id,
      phone,
      template_key: t.key,
      payload,
      scheduled_at: new Date(now + t.delay_hours * 3600 * 1000).toISOString(),
      status: 'pending',
    }));

    const { data: inserted, error: iErr } = await supabase
      .from('wolo_whatsapp_queue')
      .insert(rows)
      .select('id, template_key, scheduled_at');
    if (iErr) throw iErr;

    return res.status(201).json({
      ok: true,
      sequence,
      enqueued: inserted?.length || 0,
      first_send: inserted?.[0]?.scheduled_at,
      messages: inserted,
    });
  } catch (err) {
    console.error('[whatsapp-enqueue]', err);
    return res.status(500).json({ error: 'Erreur interne', detail: err.message });
  }
}
