// ================================================================
// rdv-create — Création d'un RDV dans Supabase (service role)
// Public : aucun compte requis pour booker un RDV
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { verifyAuth } from '../../_lib/auth.js';

export default async function rdvCreate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch { return res.status(400).json({ error: 'Body JSON invalide' }); }

  const { prestataire_id, date_rdv, heure_rdv, nom_client, tel_client, message } = body;

  if (!prestataire_id) return res.status(400).json({ error: 'prestataire_id requis' });
  if (!date_rdv)       return res.status(400).json({ error: 'date_rdv requis' });
  if (!nom_client)     return res.status(400).json({ error: 'nom_client requis' });

  // Récupérer le prestataire_user_id pour la notification
  const { data: prest } = await supabase
    .from('wolo_prestataires')
    .select('id, user_id')
    .eq('id', prestataire_id)
    .maybeSingle();

  if (!prest) return res.status(404).json({ error: 'Prestataire introuvable' });

  // Client connecté ? (optionnel)
  const user = await verifyAuth(req).catch(() => null);

  const row = {
    prestataire_id,
    prestataire_user_id: prest.user_id || null,
    client_user_id:      user?.user_id || null,
    client_nom:          nom_client,
    client_telephone:    tel_client || null,
    date_rdv,
    heure_rdv:           heure_rdv || null,
    message:             message || null,
    statut:              'En attente',
  };

  const { data, error } = await supabase
    .from('wolo_rdv')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.error('[rdv-create]', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ ok: true, rdv: data });
}
