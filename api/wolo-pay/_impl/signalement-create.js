// POST /api/wolo-pay/signalement-create
// Body: { motif, target_user_id?, target_offre_airtable_id?, target_candidature_airtable_id?, description? }
// Sprint Polish — anti-arnaque + médiation
import { supabase } from '../../_lib/supabase.js';

const VALID_MOTIFS = ['arnaque', 'ghosting', 'fake_offre', 'harcelement', 'autre'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const { motif, target_user_id, target_offre_airtable_id, target_candidature_airtable_id, description } = req.body || {};

  if (!motif || !VALID_MOTIFS.includes(motif)) {
    return res.status(400).json({ error: 'motif invalide', valid: VALID_MOTIFS });
  }
  if (!target_user_id && !target_offre_airtable_id && !target_candidature_airtable_id) {
    return res.status(400).json({ error: 'au moins une cible requise' });
  }

  const { data, error } = await supabase
    .from('wolo_signalements')
    .insert({
      reporter_user_id: userId,
      target_user_id: target_user_id || null,
      target_offre_airtable_id: target_offre_airtable_id || null,
      target_candidature_airtable_id: target_candidature_airtable_id || null,
      motif,
      description: (description || '').slice(0, 2000),
    })
    .select('id, statut, created_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, signalement: data });
}
