// ================================================================
// API — Profil SEO (SSR meta tags pour crawlers sociaux)
// Route : /profil/:slug (via rewrite vercel.json)
// Sert index.html avec meta tags dynamiques pour OG/Twitter
// ================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'applmj1RDrJkR8C4w';
const AIRTABLE_KEY  = process.env.AIRTABLE_API_KEY;
const AT_URL        = `https://api.airtable.com/v0/${AIRTABLE_BASE}`;
const AT_HEADERS    = { Authorization: `Bearer ${AIRTABLE_KEY}` };

function buildSlug(nom, metier, ville) {
  return [nom, metier, ville].filter(Boolean).join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escHtml(s) { return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export default async function handler(req, res) {
  const slug = req.query.slug || '';

  // Lire index.html
  let html;
  try {
    html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
  } catch {
    return res.status(500).send('index.html introuvable');
  }

  // Chercher le prestataire correspondant au slug dans Airtable
  // On fetch tous les prestataires et on compare les slugs (pas de champ slug en base)
  let matched = null;
  let matchedAvis = [];
  try {
    const fields = ['Nom complet','Métier principal','Ville','Quartier','Description des services',
                    'WhatsApp','Photo de profil','Numéro de téléphone','Latitude','Longitude'].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    let offset = '';
    do {
      const url = `${AT_URL}/Prestataires?${fields}&pageSize=100${offset ? '&offset=' + offset : ''}`;
      const r = await fetch(url, { headers: AT_HEADERS });
      const data = await r.json();
      for (const rec of (data.records || [])) {
        const f = rec.fields;
        const s = buildSlug(f['Nom complet'], f['Métier principal'], f['Ville']);
        if (s === slug) { matched = rec; break; }
      }
      if (matched) break;
      offset = data.offset || '';
    } while (offset);

    // Fetch avis count + note
    if (matched) {
      const formula = encodeURIComponent(`{Prestataire ID}='${matched.id}'`);
      const avisRes = await fetch(`${AT_URL}/Avis?filterByFormula=${formula}&fields%5B%5D=${encodeURIComponent('Note globale sur 5')}&pageSize=100`, { headers: AT_HEADERS });
      const avisData = await avisRes.json();
      matchedAvis = avisData.records || [];
    }
  } catch (e) {
    console.error('profil-seo airtable:', e);
  }

  if (!matched) {
    // Slug non trouvé — servir index.html normal (le SPA gèrera)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  const f = matched.fields;
  const nom = f['Nom complet'] || '';
  const metier = f['Métier principal'] || '';
  const ville = f['Ville'] || '';
  const quartier = f['Quartier'] || '';
  const bio = f['Description des services'] || '';
  const photo = f['WhatsApp'] || (f['Photo de profil'] && f['Photo de profil'][0]?.url) || '';
  const tel = f['Numéro de téléphone'] || '';
  const nbAvis = matchedAvis.length;
  const note = nbAvis > 0 ? (matchedAvis.reduce((s, r) => s + (r.fields['Note globale sur 5'] || 0), 0) / nbAvis) : 0;

  const canonicalUrl = `https://wolomarket.com/profil/${slug}`;
  const pageTitle = `${escHtml(nom)} — ${escHtml(metier)} à ${escHtml(ville)} · WOLO Market`;
  const metaDesc = nbAvis > 0
    ? `${escHtml(nom)}, ${escHtml(metier)} à ${escHtml(quartier)}, ${escHtml(ville)}. ${note.toFixed(1)}/5 · ${nbAvis} avis clients vérifiés. Contacte-le directement sur WOLO Market.`
    : `${escHtml(nom)}, ${escHtml(metier)} à ${escHtml(quartier)}, ${escHtml(ville)}. Contacte-le directement sur WOLO Market.`;
  const ogDesc = nbAvis > 0
    ? `${note.toFixed(1)}/5 étoiles · ${nbAvis} avis. Trouve les meilleurs prestataires de Cotonou et Lomé.`
    : `Trouve les meilleurs prestataires de Cotonou et Lomé.`;

  // Déterminer le pays
  const villeLower = (ville || '').toLowerCase();
  const country = (villeLower.includes('lom') || villeLower.includes('kara') || villeLower.includes('sokod')) ? 'TG' : 'BJ';

  // Schema.org LocalBusiness
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${nom} — ${metier}`,
    description: bio.slice(0, 300),
    address: {
      '@type': 'PostalAddress',
      addressLocality: ville,
      addressRegion: quartier,
      addressCountry: country
    },
    url: canonicalUrl,
    ...(tel ? { telephone: tel } : {}),
    ...(photo ? { image: photo } : {})
  };
  if (nbAvis > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: note.toFixed(1),
      reviewCount: nbAvis
    };
  }

  // Injecter les meta tags dans le <head>
  const metaTags = `
  <title>${pageTitle}</title>
  <meta name="description" content="${escHtml(metaDesc)}">
  <meta property="og:title" content="${escHtml(nom)} — ${escHtml(metier)} à ${escHtml(ville)}">
  <meta property="og:description" content="${escHtml(ogDesc)}">
  <meta property="og:image" content="${escHtml(photo)}">
  <meta property="og:url" content="${canonicalUrl}">
  <link rel="canonical" href="${canonicalUrl}">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <meta name="wolo-profil-id" content="${matched.id}">`;

  // Remplacer le <title> existant et injecter après </title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    metaTags
  );
  // Remplacer les og:title et og:description existants
  html = html.replace(/<meta property="og:title"[^>]*>/, '');
  html = html.replace(/<meta property="og:description"[^>]*>/, '');
  html = html.replace(/<meta property="og:url"[^>]*>/, '');
  html = html.replace(/<meta name="description"[^>]*>/, '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
  return res.status(200).send(html);
}
