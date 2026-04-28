// GET /api/wolo-pay/prestation-list?pro_user_id=...
// Public — renvoie le catalogue actif des prestations d'un pro.
import { listByPro } from '../../_lib/widgets-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const data = await listByPro('wolo_prestations_catalogue', 'pro_user_id', req, res, {
    extraFilter: (q) => q.eq('actif', true),
    orderBy: 'ordre',
  });
  if (!data) return; // listByPro a déjà répondu en cas d'erreur
  return res.status(200).json({ prestations: data });
}
