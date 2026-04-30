// POST /api/wolo-pay/reservation-table-create
// Public — un client (potentiellement non auth) crée une demande.
// Si l'utilisateur est connecté, son user_id est associé à la résa.
import { pick, insertPublic } from '../../_lib/widgets-helpers.js';
import { supabase } from '../../_lib/supabase.js';
import { notifyPro } from '../../_lib/notify-pro.js';

const FIELDS = [
  'pro_user_id','client_nom','client_telephone','client_email',
  'date_reservation','heure','nb_personnes','occasion','message'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const payload = pick(body, FIELDS);
  if (!payload.pro_user_id) return res.status(400).json({ error: 'pro_user_id requis' });
  if (!payload.client_nom || !payload.client_telephone) return res.status(400).json({ error: 'client_nom et client_telephone requis' });
  if (!payload.date_reservation || !payload.heure || !payload.nb_personnes) return res.status(400).json({ error: 'date, heure et nb_personnes requis' });

  // Auth optionnelle
  if (req.authenticatedUser?.user_id) payload.client_user_id = req.authenticatedUser.user_id;

  const data = await insertPublic('wolo_reservations_table', payload, res);
  if (!data) return;
  // Best-effort : pousse une notif dans la Boîte du Fondateur du pro.
  try { await notifyPro(supabase, payload.pro_user_id, 'reservation_table', payload); }
  catch (e) { console.warn('[reservation-table-create] notifyPro failed:', e.message); }
  return res.status(200).json({ reservation: data });
}
