import { pick, updateOwned } from '../../_lib/widgets-helpers.js';
const FIELDS = ['statut','reponse_pro','date_souhaitee','heure_souhaitee'];
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id requis' });
  const patch = pick(req.body, FIELDS);
  const data = await updateOwned('wolo_rdv_mecano', 'pro_user_id', id, userId, patch, res);
  if (!data) return;
  return res.status(200).json({ rdv: data });
}
