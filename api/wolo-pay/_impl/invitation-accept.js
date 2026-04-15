// POST /api/wolo-pay/invitation-accept — crée fiche Employes + marque invitation acceptée
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

async function airtable(path, opts = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Airtable error');
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return res.status(500).json({ error: 'Config manquante' });

  const { token, userId, nomComplet, photo } = req.body || {};
  if (!token || !userId || !nomComplet) {
    return res.status(400).json({ error: 'Token, userId et nomComplet requis' });
  }

  try {
    const formula = encodeURIComponent(`{Token}='${token}'`);
    const invData = await airtable(`Invitations_Employes?filterByFormula=${formula}&maxRecords=1`);
    const inv = invData.records?.[0];
    if (!inv) return res.status(404).json({ error: 'Invitation introuvable' });
    if (inv.fields['Statut'] === 'Acceptée') {
      return res.status(409).json({ error: 'Invitation déjà acceptée' });
    }

    const empData = await airtable('Employes', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          'User ID': userId,
          'Patron ID': inv.fields['Patron ID'],
          'Patron Nom': inv.fields['Patron Nom'] || '',
          'Nom complet': nomComplet,
          'Poste': inv.fields['Poste prévu'] || '',
          'Salaire FCFA': inv.fields['Salaire prévu'] || 0,
          'WhatsApp': inv.fields['WhatsApp'] || '',
          'Photo': photo || '',
          'Statut': 'Actif',
          'Date entrée': new Date().toISOString().split('T')[0]
        }
      })
    });

    await airtable(`Invitations_Employes/${inv.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          'Statut': 'Acceptée',
          'Date acceptation': new Date().toISOString(),
          'Employe ID': empData.id
        }
      })
    });

    return res.status(200).json({ employeId: empData.id });
  } catch (err) {
    console.error('[invitation-accept]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
