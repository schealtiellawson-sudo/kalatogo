// ================================================================
// rdv-delete — Suppression d'un RDV par le prestataire propriétaire
// ================================================================
import { requireAuth } from '../../_lib/auth.js';
import { supabase } from '../../_lib/supabase.js';

export default async function rdvDelete(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const user = await requireAuth(req, res);
  if (!user) return;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch { return res.status(400).json({ error: 'Body JSON invalide' }); }

  const { rdv_id } = body;
  if (!rdv_id) return res.status(400).json({ error: 'rdv_id requis' });

  const { data: prest } = await supabase
    .from('wolo_prestataires')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  if (!prest) return res.status(403).json({ error: 'Non autorisé' });

  const { error } = await supabase
    .from('wolo_rdv')
    .delete()
    .eq('id', rdv_id)
    .eq('prestataire_id', prest.id); // ownership check

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
