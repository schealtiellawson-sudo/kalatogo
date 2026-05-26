// ================================================================
// WOZALI — Supprimer un avis (service role, vérification propriétaire)
// Action : avis-delete
// Auth requise : le prestataire évalué ou l'auteur de l'avis
// ================================================================
import { createClient } from '@supabase/supabase-js';

const supaAdmin = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });

  const { avis_id } = req.body || {};
  if (!avis_id) return res.status(400).json({ error: 'avis_id requis' });

  // req.authenticatedUser est déjà attaché par le router (requireAuth)
  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  const supa = supaAdmin();

  // Récupérer l'avis pour vérifier les droits
  const { data: avis, error: fetchErr } = await supa
    .from('wolo_avis')
    .select('id, prestataire_id, auteur_user_id')
    .eq('id', avis_id)
    .maybeSingle();

  if (fetchErr || !avis) return res.status(404).json({ error: 'Avis introuvable' });

  // Vérifier que l'utilisateur est le prestataire évalué OU l'auteur
  let authorized = false;

  if (avis.auteur_user_id === user.id) {
    authorized = true; // L'auteur peut supprimer son propre avis
  } else if (avis.prestataire_id) {
    // Vérifier que l'utilisateur courant est bien le prestataire évalué
    const { data: prest } = await supa
      .from('wolo_prestataires')
      .select('id')
      .eq('id', avis.prestataire_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (prest) authorized = true;
  }

  if (!authorized) return res.status(403).json({ error: 'Non autorisé' });

  const { error: delErr } = await supa
    .from('wolo_avis')
    .delete()
    .eq('id', avis_id);

  if (delErr) {
    console.error('[avis-delete]', delErr);
    return res.status(500).json({ error: delErr.message });
  }

  return res.json({ ok: true });
}
