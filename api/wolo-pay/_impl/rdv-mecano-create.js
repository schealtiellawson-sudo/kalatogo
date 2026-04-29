import { pick, insertPublic } from '../../_lib/widgets-helpers.js';
const FIELDS = [
  'pro_user_id','client_nom','client_telephone','marque','modele','annee',
  'immatriculation','type_intervention','description','date_souhaitee','heure_souhaitee'
];
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const payload = pick(req.body || {}, FIELDS);
  if (!payload.pro_user_id) return res.status(400).json({ error: 'pro_user_id requis' });
  if (!payload.client_nom || !payload.client_telephone) return res.status(400).json({ error: 'client_nom et client_telephone requis' });
  if (req.authenticatedUser?.user_id) payload.client_user_id = req.authenticatedUser.user_id;
  const data = await insertPublic('wolo_rdv_mecano', payload, res);
  if (!data) return;
  return res.status(200).json({ rdv: data });
}
