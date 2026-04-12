// ================================================================
// API — Sitemap XML dynamique
// Route : /sitemap.xml (via rewrite vercel.json)
// ================================================================

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY  = process.env.AIRTABLE_API_KEY;
const AT_URL        = `https://api.airtable.com/v0/${AIRTABLE_BASE}`;
const AT_HEADERS    = { Authorization: `Bearer ${AIRTABLE_KEY}` };

function buildSlug(nom, metier, ville) {
  return [nom, metier, ville].filter(Boolean).join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  try {
    let allRecords = [];
    let offset = '';

    do {
      const url = `${AT_URL}/Prestataires?fields%5B%5D=Nom%20complet&fields%5B%5D=M%C3%A9tier%20principal&pageSize=100${offset ? '&offset=' + offset : ''}`;
      const r = await fetch(url, { headers: AT_HEADERS });
      const data = await r.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || '';
    } while (offset);

    const today = new Date().toISOString().slice(0, 10);

    const urls = allRecords
      .filter(r => r.fields['Nom complet'])
      .map(r => {
        const f = r.fields;
        const slug = buildSlug(f['Nom complet'], f['Métier principal'], '');
        return `  <url>
    <loc>https://wolomarket.com/profil/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://wolomarket.com</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('sitemap error:', err);
    return res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
