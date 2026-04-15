// ════════════════════════════════════════════
// POST /api/paie/pay
// Paye un employé : crée Paiements_Salaire + Fiches_Paie
// Body: { patronId, employeId, mois (YYYY-MM), montant }
// ════════════════════════════════════════════

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

  const { patronId, employeId, mois, montant } = req.body || {};
  if (!patronId || !employeId || !mois || !montant) {
    return res.status(400).json({ error: 'patronId, employeId, mois, montant requis' });
  }

  try {
    const empRes = await airtable(`Employes/${employeId}`);
    const nom = empRes.fields?.['Nom complet'] || '';
    const poste = empRes.fields?.['Poste'] || '';

    const paiement = await airtable('Paiements_Salaire', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          'Patron ID': patronId,
          'Employe ID': employeId,
          'Employe Nom': nom,
          'Mois': mois,
          'Montant FCFA': montant,
          'Date': new Date().toISOString().split('T')[0],
          'Méthode': 'WOLO Pay',
          'Statut': 'Payé'
        }
      })
    });

    const fiche = await airtable('Fiches_Paie', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          'Patron ID': patronId,
          'Employe ID': employeId,
          'Employe Nom': nom,
          'Poste': poste,
          'Mois': mois,
          'Salaire FCFA': montant,
          'Net FCFA': montant,
          'Paiement ID': paiement.id,
          'Généré le': new Date().toISOString()
        }
      })
    });

    return res.status(200).json({ paiementId: paiement.id, ficheId: fiche.id });
  } catch (err) {
    console.error('[paie/pay]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
