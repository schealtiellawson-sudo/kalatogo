// ================================================================
// employe-update — Modifie statut / notes / salaire d'un employé
// PATCH /api/wozali-pay/employe-update  (auth requise)
// Body : { id, statut?, salaire_fcfa?, notes?, date_fin? }
// ================================================================
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  const { id, statut, salaire_fcfa, notes, date_fin, type_contrat, date_embauche } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id requis' });

  const updates = {};
  if (statut !== undefined)       updates.statut       = statut;
  if (salaire_fcfa !== undefined) updates.salaire_fcfa = salaire_fcfa ? parseInt(salaire_fcfa) : null;
  if (notes !== undefined)        updates.notes        = notes;
  if (date_fin !== undefined)     updates.date_fin     = date_fin || null;
  if (type_contrat !== undefined) updates.type_contrat = type_contrat || null;
  if (date_embauche !== undefined) updates.date_embauche = date_embauche || null;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
  }

  const { data, error } = await supa
    .from('wozali_employes')
    .update(updates)
    .eq('id', id)
    .eq('recruteur_user_id', user.id) // sécurité RLS double vérification
    .select('*')
    .single();

  if (error) {
    console.error('[employe-update]', error);
    return res.status(500).json({ error: error.message });
  }

  // Notifier l'employé sur un changement de statut de son contrat
  if (statut !== undefined && data.employe_user_id) {
    try {
      const { pushNotification } = await import('../../_lib/notifications.js');
      const labels = {
        fin_contrat: { titre: 'Fin de contrat', message: 'Ton contrat a été marqué comme terminé.' },
        actif:       { titre: 'Contrat réactivé', message: 'Ton contrat est de nouveau actif.' },
        suspendu:    { titre: 'Contrat suspendu', message: 'Ton contrat a été suspendu. Contacte ton employeur.' },
      };
      const l = labels[statut];
      if (l) pushNotification(data.employe_user_id, 'equipe_statut', { ...l, employe_id: data.id }, { push: true, pushTitle: 'WOZALI', pushBody: l.titre });
    } catch (e) {}
  }

  return res.status(200).json({ ok: true, employe: data });
}
