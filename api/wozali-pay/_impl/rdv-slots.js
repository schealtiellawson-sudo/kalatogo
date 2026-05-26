// ================================================================
// rdv-slots — Créneaux déjà réservés pour un prestataire + date
// Public : aucun auth requis (le calendrier client vérifie les dispo)
// Retourne uniquement les heures (pas de données client)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

export default async function rdvSlots(req, res) {
  const { prestataire_id, date } = req.query || {};
  if (!prestataire_id || !date) {
    return res.status(400).json({ error: 'prestataire_id et date requis' });
  }

  const { data, error } = await supabase
    .from('wolo_rdv')
    .select('heure_rdv')
    .eq('prestataire_id', prestataire_id)
    .eq('date_rdv', date)
    .not('statut', 'in', '("Annulé","Refusé")');

  if (error) return res.status(500).json({ error: error.message });

  const heures = (data || []).map(r => r.heure_rdv).filter(Boolean);
  return res.status(200).json({ ok: true, heures });
}
