// GET /api/wolo-pay/portfolio-list?pro_user_id=...
import { listByPro } from '../../_lib/widgets-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const data = await listByPro('wolo_portfolio_projets', 'pro_user_id', req, res, {
    extraFilter: (q) => q.eq('publie', true),
    orderBy: 'ordre',
  });
  if (!data) return;
  return res.status(200).json({ projets: data });
}
