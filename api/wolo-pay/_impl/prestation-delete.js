// POST /api/wolo-pay/prestation-delete  body: { id }
import { deleteOwned } from '../../_lib/widgets-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  const id = req.body?.id;
  if (!id) return res.status(400).json({ error: 'id requis' });
  const ok = await deleteOwned('wolo_prestations_catalogue', 'pro_user_id', id, userId, res);
  if (!ok) return;
  return res.status(200).json({ ok: true });
}
