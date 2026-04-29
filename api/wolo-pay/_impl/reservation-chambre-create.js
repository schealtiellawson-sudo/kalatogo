import { pick, insertPublic } from '../../_lib/widgets-helpers.js';
const FIELDS = [
  'pro_user_id','client_nom','client_telephone','client_email','type_chambre',
  'nb_chambres','nb_adultes','nb_enfants','arrivee','depart','message'
];
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const payload = pick(req.body || {}, FIELDS);
  if (!payload.pro_user_id) return res.status(400).json({ error: 'pro_user_id requis' });
  if (!payload.client_nom || !payload.client_telephone) return res.status(400).json({ error: 'client_nom et client_telephone requis' });
  if (!payload.arrivee || !payload.depart) return res.status(400).json({ error: 'arrivee et depart requis' });
  if (new Date(payload.depart) <= new Date(payload.arrivee)) return res.status(400).json({ error: 'date départ doit être après l\'arrivée' });
  if (req.authenticatedUser?.user_id) payload.client_user_id = req.authenticatedUser.user_id;
  const data = await insertPublic('wolo_reservation_chambre', payload, res);
  if (!data) return;
  return res.status(200).json({ reservation: data });
}
