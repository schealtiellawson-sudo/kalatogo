// ================================================================
// Proxy Airtable sécurisé — remplace les appels directs du frontend
// Route: /api/airtable-proxy/<table>/<recordId?>
// Le PAT Airtable reste côté serveur (env var AIRTABLE_API_KEY)
// ================================================================

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

export default async function handler(req, res) {
  // Vérifier que les env vars sont configurées
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) {
    console.error('[airtable-proxy] AIRTABLE_API_KEY ou AIRTABLE_BASE_ID manquant');
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  // Reconstruire le chemin Airtable depuis les segments
  const pathSegments = req.query.path;
  if (!pathSegments || pathSegments.length === 0) {
    return res.status(400).json({ error: 'Table requise' });
  }

  // pathSegments[0] = table name, pathSegments[1] = record ID (optionnel)
  const table = decodeURIComponent(pathSegments[0]);
  const recordPart = pathSegments.slice(1).map(s => encodeURIComponent(s)).join('/');

  // Construire l'URL Airtable
  let airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}`;
  if (recordPart) {
    airtableUrl += `/${recordPart}`;
  }

  // Transférer les query params (sauf 'path' qui est le catch-all de Vercel)
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path') {
      queryParams.append(key, value);
    }
  }
  const qs = queryParams.toString();
  if (qs) airtableUrl += `?${qs}`;

  // Construire les headers
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_KEY}`,
    'Content-Type': 'application/json'
  };

  // Forward la requête
  const fetchOptions = {
    method: req.method || 'GET',
    headers
  };

  // Transférer le body pour POST/PATCH/PUT
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(airtableUrl, fetchOptions);
    const data = await response.json();

    // Retourner le même status code
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[airtable-proxy] erreur:', err.message);
    return res.status(502).json({ error: 'Erreur de communication avec la base de données' });
  }
}
