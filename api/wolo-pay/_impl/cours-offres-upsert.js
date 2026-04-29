import { pick, insertSelf } from '../../_lib/widgets-helpers.js';
import { supabase } from '../../_lib/supabase.js';
const FIELDS = ['matiere','niveau','tarif_horaire_fcfa','duree_seance_min','modalite','description','actif','ordre'];
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });
  const body = req.body || {};
  const payload = pick(body, FIELDS);
  if (!payload.matiere || payload.tarif_horaire_fcfa == null) return res.status(400).json({ error: 'matiere et tarif_horaire_fcfa requis' });
  if (body.id) {
    const { data: ex } = await supabase.from('wolo_cours_offres').select('pro_user_id').eq('id', body.id).maybeSingle();
    if (!ex) return res.status(404).json({ error: 'Introuvable' });
    if (ex.pro_user_id !== userId) return res.status(403).json({ error: 'Pas autorisé' });
    const { data, error } = await supabase.from('wolo_cours_offres').update(payload).eq('id', body.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ offre: data });
  }
  const data = await insertSelf('wolo_cours_offres', 'pro_user_id', userId, payload, res);
  if (!data) return;
  return res.status(200).json({ offre: data });
}
