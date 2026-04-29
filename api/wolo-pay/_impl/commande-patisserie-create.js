import { pick, insertPublic } from '../../_lib/widgets-helpers.js';
const FIELDS = [
  'pro_user_id','client_nom','client_telephone','type_produit','saveurs',
  'nb_personnes','message_personnalise','photo_inspiration','date_evenement',
  'heure_retrait','livraison','adresse_livraison','budget_fcfa'
];
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const payload = pick(req.body || {}, FIELDS);
  if (!payload.pro_user_id) return res.status(400).json({ error: 'pro_user_id requis' });
  if (!payload.client_nom || !payload.client_telephone) return res.status(400).json({ error: 'client_nom et client_telephone requis' });
  if (!payload.date_evenement) return res.status(400).json({ error: 'date_evenement requise' });
  if (req.authenticatedUser?.user_id) payload.client_user_id = req.authenticatedUser.user_id;
  const data = await insertPublic('wolo_commande_patisserie', payload, res);
  if (!data) return;
  return res.status(200).json({ commande: data });
}
