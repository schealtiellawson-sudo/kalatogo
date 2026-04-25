// POST /api/wolo-pay/entretien-upsert
// Crée ou met à jour un entretien (recruteur uniquement).
// Body: { id?, candidature_airtable_id, candidat_user_id, type, date_heure, lieu?, lien_visio?, telephone?, rencontre?, note_recruteur?, resultat? }
import { supabase } from '../../_lib/supabase.js';

const VALID_TYPES = ['presentiel', 'visio', 'telephone'];
const VALID_RESULTS = ['pending', 'concluant', 'non_concluant', 'annule'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const body = req.body || {};
  const {
    id,
    candidature_airtable_id,
    candidat_user_id,
    offre_titre,
    thread_id,
    type,
    date_heure,
    lieu,
    lien_visio,
    telephone,
    rencontre,
    note_recruteur,
    resultat,
  } = body;

  if (id) {
    // Update — vérifier propriété
    const { data: existing } = await supabase
      .from('wolo_entretiens')
      .select('recruteur_user_id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Entretien introuvable' });
    if (existing.recruteur_user_id !== userId) return res.status(403).json({ error: 'Seul le recruteur peut modifier' });

    const patch = { updated_at: new Date().toISOString() };
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'type invalide' });
      patch.type = type;
    }
    if (date_heure !== undefined) patch.date_heure = date_heure;
    if (lieu !== undefined) patch.lieu = lieu;
    if (lien_visio !== undefined) patch.lien_visio = lien_visio;
    if (telephone !== undefined) patch.telephone = telephone;
    if (rencontre !== undefined) patch.rencontre = !!rencontre;
    if (note_recruteur !== undefined) patch.note_recruteur = note_recruteur;
    if (resultat !== undefined) {
      if (!VALID_RESULTS.includes(resultat)) return res.status(400).json({ error: 'resultat invalide' });
      patch.resultat = resultat;
    }

    const { data, error } = await supabase
      .from('wolo_entretiens')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, entretien: data });
  }

  // Create
  if (!candidature_airtable_id || !candidat_user_id || !type || !date_heure) {
    return res.status(400).json({ error: 'candidature_airtable_id, candidat_user_id, type, date_heure requis' });
  }
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'type invalide' });

  const { data, error } = await supabase
    .from('wolo_entretiens')
    .insert({
      candidature_airtable_id,
      thread_id: thread_id || null,
      candidat_user_id,
      recruteur_user_id: userId,
      offre_titre,
      type,
      date_heure,
      lieu,
      lien_visio,
      telephone,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, entretien: data });
}
