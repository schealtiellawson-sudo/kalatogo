// POST /api/wolo-pay/commande-facon-create — public, le client peut être anonyme
import { pick, insertPublic } from '../../_lib/widgets-helpers.js';
import { supabase } from '../../_lib/supabase.js';
import { notifyPro } from '../../_lib/notify-pro.js';

const FIELDS = [
  'pro_user_id','client_nom','client_telephone','type_article',
  'description','photos_modele','mensurations','date_voulue','budget_fcfa'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const payload = pick(req.body || {}, FIELDS);
  if (!payload.pro_user_id) return res.status(400).json({ error: 'pro_user_id requis' });
  if (!payload.client_nom || !payload.client_telephone) return res.status(400).json({ error: 'client_nom et client_telephone requis' });
  if (!payload.description) return res.status(400).json({ error: 'description requise' });
  if (req.authenticatedUser?.user_id) payload.client_user_id = req.authenticatedUser.user_id;
  const data = await insertPublic('wolo_commande_facon', payload, res);
  if (!data) return;
  try { await notifyPro(supabase, payload.pro_user_id, 'commande_facon', payload); }
  catch (e) { console.warn('[commande-facon-create] notifyPro failed:', e.message); }
  return res.status(200).json({ commande: data });
}
