// ================================================================
// Proxy ImgBB — upload d'images sans exposer la clé API côté client
// POST /api/imgbb-proxy  body: FormData avec champ 'image'
// ================================================================

export const config = {
  api: {
    bodyParser: false, // On gère le multipart nous-mêmes
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const IMGBB_KEY = process.env.IMGBB_API_KEY;
  if (!IMGBB_KEY) {
    console.error('[imgbb-proxy] IMGBB_API_KEY manquant');
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  try {
    // Lire le body brut
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Extraire le boundary du Content-Type
    const contentType = req.headers['content-type'] || '';

    // Reconstruire le FormData avec la clé API injectée côté serveur
    // On parse le multipart pour extraire l'image, puis on renvoie à ImgBB
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'Content-Type multipart/form-data requis' });
    }

    // Forward vers ImgBB en ajoutant la clé dans l'URL
    const imgbbUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`;

    const response = await fetch(imgbbUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: rawBody
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[imgbb-proxy] erreur:', err.message);
    return res.status(502).json({ error: 'Erreur upload image' });
  }
}
