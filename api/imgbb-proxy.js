// ================================================================
// Proxy ImgBB — upload d'images sans exposer la clé API côté client
// POST /api/imgbb-proxy  body: FormData avec champ 'image'
// ================================================================

// N'autoriser QUE les origines WOZALI (empêche un site tiers d'utiliser notre clé ImgBB).
const ALLOWED_ORIGINS = [
  'https://wozali.africa',
  'https://www.wozali.africa',
  'https://wolomarket.vercel.app',
];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const IMGBB_KEY = process.env.IMGBB_API_KEY;
  if (!IMGBB_KEY) {
    console.error('[imgbb-proxy] IMGBB_API_KEY manquant');
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  try {
    // Le frontend envoie l'image en base64 dans le body JSON
    // ou en FormData — on supporte les deux
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const image = body?.image;

    if (!image) {
      return res.status(400).json({ error: 'Champ image requis' });
    }

    // Forward vers ImgBB avec la clé injectée côté serveur
    const formBody = new URLSearchParams();
    formBody.append('key', IMGBB_KEY);
    formBody.append('image', image);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formBody
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[imgbb-proxy] erreur:', err.message);
    return res.status(502).json({ error: 'Erreur upload image' });
  }
}
