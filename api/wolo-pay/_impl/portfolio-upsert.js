// POST /api/wolo-pay/portfolio-upsert
import { pick, insertSelf, updateOwned } from '../../_lib/widgets-helpers.js';

const FIELDS = ['titre','description','categorie','client_nom','date_realisation','photos','video_url','prix_indicatif_fcfa','ordre','publie'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requis' });

  const body = req.body || {};
  const payload = pick(body, FIELDS);
  if (!body.id) {
    if (!payload.titre) return res.status(400).json({ error: 'titre requis' });
    const data = await insertSelf('wolo_portfolio_projets', 'pro_user_id', userId, payload, res);
    if (!data) return;
    return res.status(200).json({ projet: data });
  }
  const data = await updateOwned('wolo_portfolio_projets', 'pro_user_id', body.id, userId, payload, res);
  if (!data) return;
  return res.status(200).json({ projet: data });
}
