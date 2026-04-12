// ================================================================
// Proxy Airtable sécurisé — remplace les appels directs du frontend
// Le PAT Airtable reste côté serveur (env var AIRTABLE_API_KEY)
// ================================================================
// Le frontend appelle : /api/airtable-proxy/Table/recordId?params
// Vercel rewrite: /api/airtable-proxy/:path* → /api/airtable-proxy?_path=:path*
// ================================================================

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

export default async function handler(req, res) {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) {
    console.error('[airtable-proxy] AIRTABLE_API_KEY ou AIRTABLE_BASE_ID manquant');
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  // Extraire le chemin depuis l'URL brute (après /api/airtable-proxy/)
  const urlPath = req.url || '';
  const match = urlPath.match(/\/api\/airtable-proxy\/([^?]*)/);
  const rawPath = match ? match[1] : '';

  if (!rawPath) {
    return res.status(400).json({ error: 'Table requise' });
  }

  // Séparer table et record ID
  // rawPath = "Prestataires" ou "Prestataires/recXXX"
  const segments = rawPath.split('/').filter(Boolean);
  const table = decodeURIComponent(segments[0]);
  const recordPart = segments.slice(1).join('/');

  // Construire l'URL Airtable
  let airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}`;
  if (recordPart) {
    airtableUrl += `/${recordPart}`;
  }

  // Transférer les query params
  const qsIndex = urlPath.indexOf('?');
  if (qsIndex !== -1) {
    airtableUrl += urlPath.substring(qsIndex);
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_KEY}`,
    'Content-Type': 'application/json'
  };

  const fetchOptions = {
    method: req.method || 'GET',
    headers
  };

  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(airtableUrl, fetchOptions);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[airtable-proxy] erreur:', err.message);
    return res.status(502).json({ error: 'Erreur de communication avec la base de données' });
  }
}
