// ================================================================
// rdv-update — Mise à jour statut d'un RDV (prestataire propriétaire)
// ================================================================
import { requireAuth } from '../../_lib/auth.js';
import { supabase } from '../../_lib/supabase.js';

export default async function rdvUpdate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const user = await requireAuth(req, res);
  if (!user) return;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch { return res.status(400).json({ error: 'Body JSON invalide' }); }

  const { rdv_id, statut } = body;
  if (!rdv_id || !statut) return res.status(400).json({ error: 'rdv_id et statut requis' });

  const STATUTS = ['En attente', 'Confirmé', 'Annulé', 'Refusé', 'Terminé', 'No-show'];
  if (!STATUTS.includes(statut)) return res.status(400).json({ error: 'Statut invalide' });

  const { data: prest } = await supabase
    .from('wolo_prestataires')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  if (!prest) return res.status(403).json({ error: 'Non autorisé' });

  const { data, error } = await supabase
    .from('wolo_rdv')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', rdv_id)
    .eq('prestataire_id', prest.id) // ownership check
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'RDV introuvable ou non autorisé' });

  return res.status(200).json({ ok: true, rdv: data });
}
