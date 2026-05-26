// ================================================================
// rdv-list — Liste des RDV d'un prestataire (auth requise)
// ================================================================
import { requireAuth } from '../../_lib/auth.js';
import { supabase } from '../../_lib/supabase.js';

export default async function rdvList(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  // Trouver le prestataire par email (le user connecté = le prestataire)
  const { data: prest } = await supabase
    .from('wolo_prestataires')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  if (!prest) return res.status(404).json({ error: 'Prestataire introuvable' });

  const { data, error } = await supabase
    .from('wolo_rdv')
    .select('*')
    .eq('prestataire_id', prest.id)
    .order('date_rdv', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, rdvs: data || [] });
}
