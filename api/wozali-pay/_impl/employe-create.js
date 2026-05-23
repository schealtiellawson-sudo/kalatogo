// ================================================================
// employe-create — Crée une fiche employé à partir d'une candidature
// POST /api/wozali-pay/employe-create  (auth requise)
// Body : { candidature_id, employe_nom, employe_metier, employe_whatsapp,
//          employe_photo, employe_quartier, employe_ville, employe_user_id,
//          offre_id, offre_titre, type_contrat, salaire_fcfa, notes }
// ================================================================
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  const {
    candidature_id,
    employe_nom,
    employe_metier,
    employe_whatsapp,
    employe_photo,
    employe_quartier,
    employe_ville,
    employe_user_id,
    recruteur_prestataire_id,
    offre_id,
    offre_titre,
    type_contrat,
    salaire_fcfa,
    notes,
  } = req.body || {};

  if (!employe_nom?.trim()) {
    return res.status(400).json({ error: 'Le nom de l\'employé est requis' });
  }

  const row = {
    recruteur_user_id:        user.id,
    recruteur_prestataire_id: recruteur_prestataire_id || null,
    candidature_id:           candidature_id || null,
    employe_user_id:          employe_user_id || null,
    employe_nom:              employe_nom.trim(),
    employe_metier:           employe_metier || null,
    employe_whatsapp:         employe_whatsapp || null,
    employe_photo:            employe_photo || null,
    employe_quartier:         employe_quartier || null,
    employe_ville:            employe_ville || null,
    offre_id:                 offre_id || null,
    offre_titre:              offre_titre || null,
    type_contrat:             type_contrat || null,
    salaire_fcfa:             salaire_fcfa ? parseInt(salaire_fcfa) : null,
    notes:                    notes || null,
    statut:                   'actif',
    date_embauche:            new Date().toISOString().split('T')[0],
  };

  const { data, error } = await supa
    .from('wozali_employes')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.error('[employe-create]', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ ok: true, employe: data });
}
