// POST /api/wolo-pay/devis-chantier-create  (public — auth optionnelle)
import { pick, insertPublic } from '../../_lib/widgets-helpers.js';
import { supabase } from '../../_lib/supabase.js';
import { notifyPro } from '../../_lib/notify-pro.js';

const FIELDS = [
  'pro_user_id','client_nom','client_telephone','client_email',
  'type_travaux','description','surface_m2','budget_estime_fcfa',
  'delai_souhaite','adresse_chantier','photos'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const payload = pick(body, FIELDS);
  if (!payload.pro_user_id) return res.status(400).json({ error: 'pro_user_id requis' });
  if (!payload.client_nom || !payload.client_telephone) return res.status(400).json({ error: 'nom + tel requis' });
  if (!payload.description) return res.status(400).json({ error: 'description requise' });

  if (req.authenticatedUser?.user_id) payload.client_user_id = req.authenticatedUser.user_id;
  const data = await insertPublic('wolo_devis_chantier', payload, res);
  if (!data) return;
  try { await notifyPro(supabase, payload.pro_user_id, 'devis_chantier', payload); }
  catch (e) { console.warn('[devis-chantier-create] notifyPro failed:', e.message); }
  return res.status(200).json({ devis: data });
}
