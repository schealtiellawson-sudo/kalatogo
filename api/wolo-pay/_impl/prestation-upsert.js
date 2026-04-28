// POST /api/wolo-pay/prestation-upsert
// Auth requise. Crée ou met à jour une prestation pour le pro courant.
import { pick, insertSelf, updateOwned } from '../../_lib/widgets-helpers.js';

const FIELDS = ['libelle', 'description', 'prix_fcfa', 'duree_min', 'categorie', 'ordre', 'actif', 'photo_url'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const body = req.body || {};
  const payload = pick(body, FIELDS);
  if (!body.id) {
    if (!payload.libelle || payload.prix_fcfa == null) {
      return res.status(400).json({ error: 'libelle et prix_fcfa requis' });
    }
    const data = await insertSelf('wolo_prestations_catalogue', 'pro_user_id', userId, payload, res);
    if (!data) return;
    return res.status(200).json({ prestation: data });
  }
  const data = await updateOwned('wolo_prestations_catalogue', 'pro_user_id', body.id, userId, payload, res);
  if (!data) return;
  return res.status(200).json({ prestation: data });
}
