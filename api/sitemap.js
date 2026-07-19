// ================================================================
// API — Sitemap XML dynamique
// Route : /sitemap.xml (via rewrite vercel.json)
// ================================================================

import { supabase } from './_lib/supabase.js';

function buildSlug(nom, metier, ville) {
  return [nom, metier, ville].filter(Boolean).join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  try {
    // Supabase plafonne une requête à 1000 lignes par défaut :
    // on pagine avec .range() pour récupérer tous les prestataires.
    const PAGE_SIZE = 1000;
    let allRecords = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('wozali_prestataires')
        .select('nom_complet, metier_principal')
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = data || [];
      allRecords = allRecords.concat(rows);
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const today = new Date().toISOString().slice(0, 10);

    const urls = allRecords
      .filter(r => r['nom_complet'])
      .map(r => {
        const slug = buildSlug(r['nom_complet'], r['metier_principal'], '');
        return `  <url>
    <loc>https://wozali.africa/profil/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://wozali.africa</loc>
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
