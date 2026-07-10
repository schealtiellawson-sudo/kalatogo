// ================================================================
// API — Profil SEO (SSR meta tags pour crawlers sociaux)
// Route : /profil/:slug (via rewrite vercel.json)
// Sert index.html avec meta tags dynamiques pour OG/Twitter
// ================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from './_lib/supabase.js';

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

  // Chercher le prestataire correspondant au slug dans Supabase
  // On scanne les prestataires et on compare les slugs (pas de champ slug en base)
  let matched = null;
  let matchedAvis = [];
  try {
    const PAGE = 1000; // Supabase plafonne à 1000 lignes par requête
    let from = 0;
    do {
      const { data, error } = await supabase
        .from('wozali_prestataires')
        .select('id, nom_complet, metier_principal, quartier, description_services, whatsapp, photo_profil, numero_telephone')
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = data || [];
      for (const rec of rows) {
        const s = buildSlug(rec.nom_complet, rec.metier_principal, '');
        if (s === slug) { matched = rec; break; }
      }
      if (matched) break;
      if (rows.length < PAGE) break;
      from += PAGE;
    } while (true);

    // Fetch avis count + note (avis validés uniquement)
    if (matched) {
      const { data: avisData, error: avisError } = await supabase
        .from('wozali_avis')
        .select('note_globale')
        .eq('prestataire_id', matched.id)
        .eq('validated', true);
      if (avisError) throw avisError;
      matchedAvis = avisData || [];
    }
  } catch (e) {
    console.error('profil-seo supabase:', e);
  }

  if (!matched) {
    // Slug non trouvé — servir index.html normal (le SPA gèrera)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  const nom = matched.nom_complet || '';
  const metier = matched.metier_principal || '';
  const ville = matched.quartier || '';
  const quartier = matched.quartier || '';
  const bio = matched.description_services || '';
  const photo = matched.whatsapp || matched.photo_profil || '';
  const tel = matched.numero_telephone || '';
  const nbAvis = matchedAvis.length;
  const note = nbAvis > 0 ? (matchedAvis.reduce((s, r) => s + (r.note_globale || 0), 0) / nbAvis) : 0;

  const canonicalUrl = `https://wozali.com/profil/${slug}`;
  const pageTitle = `${escHtml(nom)} — ${escHtml(metier)} à ${escHtml(ville)} · WOZALI`;
  const metaDesc = nbAvis > 0
    ? `${escHtml(nom)}, ${escHtml(metier)} à ${escHtml(quartier)}, ${escHtml(ville)}. ${note.toFixed(1)}/5 · ${nbAvis} avis clients vérifiés. Contacte-le directement sur WOZALI.`
    : `${escHtml(nom)}, ${escHtml(metier)} à ${escHtml(quartier)}, ${escHtml(ville)}. Contacte-le directement sur WOZALI.`;
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
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')}</script>
  <meta name="wozali-profil-id" content="${matched.id}">`;

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
