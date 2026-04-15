// POST /api/wolo-pay/annonces-broadcast — diffuse annonce à toute l'équipe du patron
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

  const { patronId, titre, message, whatsapp } = req.body || {};
  if (!patronId || !titre || !message) {
    return res.status(400).json({ error: 'patronId, titre et message requis' });
  }

  try {
    const formula = encodeURIComponent(`AND({Patron ID}='${patronId}',{Statut}='Actif')`);
    const empData = await airtable(`Employes?filterByFormula=${formula}`);
    const nbDest = empData.records?.length || 0;

    const ann = await airtable('Annonces_Equipe', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          'Patron ID': patronId,
          'Titre': titre,
          'Message': message,
          'Date': new Date().toISOString(),
          'Canal': whatsapp ? 'Dashboard + WhatsApp' : 'Dashboard',
          'Nb destinataires': nbDest,
          'Nb lus': 0
        }
      })
    });

    return res.status(200).json({ id: ann.id, nbDestinataires: nbDest });
  } catch (err) {
    console.error('[annonces-broadcast]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
