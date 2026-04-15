// POST /api/wolo-pay/invitation-create — crée invitation employé + token unique
import crypto from 'crypto';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return res.status(500).json({ error: 'Config manquante' });

  const { patronId, patronNom, nomPrevu, whatsapp, postePrevu, salairePrevu } = req.body || {};
  if (!patronId || !nomPrevu || !whatsapp || !postePrevu) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  const token = crypto.randomBytes(16).toString('hex');

  try {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Invitations_Employes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Patron ID': patronId,
          'Patron Nom': patronNom || '',
          'Nom prévu': nomPrevu,
          'WhatsApp': whatsapp,
          'Poste prévu': postePrevu,
          'Salaire prévu': salairePrevu || 0,
          'Token': token,
          'Statut': 'Envoyée',
          'Date envoi': new Date().toISOString()
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('[invitation-create]', data);
      return res.status(response.status).json({ error: data.error?.message || 'Erreur Airtable' });
    }
    return res.status(200).json({ token, recordId: data.id });
  } catch (err) {
    console.error('[invitation-create]', err.message);
    return res.status(502).json({ error: 'Erreur serveur' });
  }
}
