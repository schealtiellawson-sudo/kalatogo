// POST /api/wolo-pay/devis-chantier-update
import { pick, updateOwned } from '../../_lib/widgets-helpers.js';

const FIELDS = ['statut','devis_montant_fcfa','devis_message'];
const VALID = ['nouveau','vu','devis_envoye','accepte','refuse','annule','termine'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  const body = req.body || {};
  if (!body.id) return res.status(400).json({ error: 'id requis' });
  if (body.statut && !VALID.includes(body.statut)) return res.status(400).json({ error: 'statut invalide' });
  const patch = pick(body, FIELDS);
  const data = await updateOwned('wolo_devis_chantier', 'pro_user_id', body.id, userId, patch, res);
  if (!data) return;
  return res.status(200).json({ devis: data });
}
