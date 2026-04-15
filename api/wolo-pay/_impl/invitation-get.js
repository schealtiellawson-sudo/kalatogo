// GET /api/wolo-pay/invitation-get?token=xxx — récupère invitation par token (public)
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return res.status(500).json({ error: 'Config manquante' });

  const token = req.query.token;
  if (!token) return res.status(400).json({ error: 'Token requis' });

  try {
    const formula = encodeURIComponent(`{Token}='${token}'`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/Invitations_Employes?filterByFormula=${formula}&maxRecords=1`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` } });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur' });
    const rec = data.records?.[0];
    if (!rec) return res.status(404).json({ error: 'Invitation introuvable ou expirée' });
    return res.status(200).json({
      id: rec.id,
      patronId: rec.fields['Patron ID'],
      patronNom: rec.fields['Patron Nom'],
      nomPrevu: rec.fields['Nom prévu'],
      whatsapp: rec.fields['WhatsApp'],
      postePrevu: rec.fields['Poste prévu'],
      salairePrevu: rec.fields['Salaire prévu'] || 0,
      statut: rec.fields['Statut']
    });
  } catch (err) {
    console.error('[invitation-get]', err.message);
    return res.status(502).json({ error: 'Erreur serveur' });
  }
}
