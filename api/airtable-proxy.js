// ================================================================
// Proxy Airtable sécurisé — remplace les appels directs du frontend
// Le PAT Airtable reste côté serveur (env var AIRTABLE_API_KEY)
// ================================================================
// Le frontend appelle : /api/airtable-proxy/Table/recordId?params
// Vercel rewrite: /api/airtable-proxy/:path* → /api/airtable-proxy?_path=:path*
// ================================================================
//
// SÉCURITÉ :
//   - GET : toujours public
//   - Écriture : whitelist stricte par table (WRITE_WHITELIST)
//   - 'email-prestataire' : JWT Supabase requis + ownership Email vérifié
//   - 'open-authenticated' : whitelist suffit, auth côté UI + Supabase RLS (V1.1 : ownership serveur)
//   - 'public-create' : POST sans auth (client anonyme — ex: RDV, Avis)
//   - 'create-only' : POST uniquement, PATCH/DELETE bloqués
//   - Table absente du whitelist → 403
// ================================================================

import { requireAuth } from './_lib/auth.js';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

// Tables où l'écriture (POST/PATCH/DELETE) via ce proxy public est autorisée.
//
// `ownership` indique comment vérifier que le user a le droit de muter le record :
//   - 'email-prestataire'  : le record doit avoir Email == auth.email (table Prestataires)
//   - 'open-authenticated' : tout user authentifié peut écrire
//   - 'create-only'        : POST seulement, pas de PATCH/DELETE via proxy
//   - 'public-create'      : POST sans auth (ex: client anonyme réserve un RDV ou laisse un avis)
//                            PATCH/DELETE sur ces tables exigent quand même auth.
const WRITE_WHITELIST = {
  // Profil prestataire : écriture restreinte au propriétaire (lookup Email)
  'Prestataires': { ownership: 'email-prestataire' },
  // Photos d'avis : POST uniquement
  'Photos Avis': { ownership: 'create-only' },
  // Posts du fil : ouvert aux users authentifiés
  'Posts': { ownership: 'open-authenticated' },
  // Favoris : un user authentifié gère ses propres favoris
  'Favoris': { ownership: 'open-authenticated' },
  // RDV : clients anonymes peuvent réserver (pas de compte requis)
  'Rendez-vous': { ownership: 'public-create' },
  // Avis : clients anonymes ou connectés peuvent noter un prestataire
  'Avis': { ownership: 'public-create' },
  // Abonnements : follow/unfollow (POST + DELETE), user connecté
  'Abonnements': { ownership: 'open-authenticated' },
  // Candidatures : postuler (POST) + recruteur met à jour statut (PATCH)
  'Candidatures': { ownership: 'open-authenticated' },
  // Offres d'Emploi : recruteur publie/modifie/supprime ses offres
  "Offres d'Emploi": { ownership: 'open-authenticated' },
};

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function logDenied(reason, ctx) {
  try {
    console.warn('[airtable-proxy][403]', reason, JSON.stringify(ctx));
  } catch (_) {
    console.warn('[airtable-proxy][403]', reason);
  }
}

async function fetchAirtable(url, options) {
  let response = await fetch(url, options);
  if (response.status === 429) {
    await new Promise(r => setTimeout(r, 1200));
    response = await fetch(url, options);
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 2500));
      response = await fetch(url, options);
    }
  }
  return response;
}

async function getRecordEmail(table, recordId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`;
  const response = await fetchAirtable(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_KEY}`
    }
  });
  if (!response.ok) return { error: response.status };
  const data = await response.json();
  const email = data?.fields?.Email || data?.fields?.email || null;
  return { email };
}

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
  const recordId = recordPart ? decodeURIComponent(recordPart.split('?')[0].split('/')[0]) : null;

  const method = (req.method || 'GET').toUpperCase();
  const isWrite = WRITE_METHODS.has(method);

  // ────────────────────────────────────────────────────────────
  // SÉCURITÉ : GET reste public, écritures vérifient whitelist + auth
  // ────────────────────────────────────────────────────────────
  if (isWrite) {
    // 1. Vérifier que la table est dans la whitelist AVANT l'auth
    const rule = WRITE_WHITELIST[table];
    if (!rule) {
      logDenied('table-not-whitelisted', { table, method, ip: req.headers['x-forwarded-for'] || null });
      return res.status(403).json({
        error: 'Écriture non autorisée sur cette table via ce proxy',
        hint: 'Utilise un endpoint applicatif dédié (/api/wozali-pay/*).'
      });
    }

    // 2. Déterminer si l'auth est requise pour cette opération
    //    - 'email-prestataire' : auth toujours requise (vérifie ownership du record)
    //    - 'create-only'       : pas d'auth requise (POST uniquement, PATCH/DELETE bloqués)
    //    - 'public-create'     : pas d'auth requise pour POST (PATCH/DELETE via auth si besoin)
    //    - 'open-authenticated': pas d'auth côté proxy — sécurité assurée par Supabase RLS
    //                            et par le gating UI. V1.1 ajoutera ownership côté serveur.
    const needsAuth = rule.ownership === 'email-prestataire';

    // 3. Auth obligatoire uniquement pour email-prestataire
    let user = null;
    if (needsAuth) {
      user = await requireAuth(req, res);
      if (!user) {
        logDenied('no-auth', { table, method, ip: req.headers['x-forwarded-for'] || null });
        return; // requireAuth a déjà répondu 401
      }
    }

    // 4. create-only : bloquer PATCH/DELETE
    if (rule.ownership === 'create-only' && method !== 'POST') {
      logDenied('create-only-table-mutation', { table, method });
      return res.status(403).json({
        error: 'Seule la création (POST) est autorisée sur cette table via ce proxy'
      });
    }

    // 5. email-prestataire : vérifier ownership du record
    if (rule.ownership === 'email-prestataire') {
      if (method !== 'POST') {
        if (!recordId || !recordId.startsWith('rec')) {
          logDenied('missing-record-id', { table, method, user: user.email });
          return res.status(400).json({ error: 'Record ID requis pour cette opération' });
        }
        const lookup = await getRecordEmail(table, recordId);
        if (lookup.error) {
          logDenied('record-lookup-failed', { table, method, user: user.email, recordId, status: lookup.error });
          return res.status(404).json({ error: 'Record introuvable' });
        }
        const ownerEmail = (lookup.email || '').trim().toLowerCase();
        const userEmail = (user.email || '').trim().toLowerCase();
        if (!ownerEmail || ownerEmail !== userEmail) {
          logDenied('email-mismatch', { table, method, user: userEmail, recordOwner: ownerEmail, recordId });
          return res.status(403).json({ error: 'Tu ne peux modifier que ton propre profil' });
        }
      } else {
        // POST sur Prestataires : forcer Email = user.email pour empêcher l'usurpation
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
          if (body && body.fields) {
            body.fields.Email = user.email;
            req.body = body;
          }
        } catch (_) { /* body non-JSON: laissera Airtable répondre 422 */ }
      }
    }
    // 'open-authenticated' + 'public-create' PATCH/DELETE : pas de check ownership supplémentaire ici
    // (V1.1 : ajouter vérification ownership côté serveur pour Candidatures/Offres)
  }

  // ────────────────────────────────────────────────────────────
  // Construction URL Airtable + transfert
  // ────────────────────────────────────────────────────────────
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
    method,
    headers
  };

  if (['POST', 'PATCH', 'PUT'].includes(method)) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    fetchOptions.body = body;
  }

  try {
    const response = await fetchAirtable(airtableUrl, fetchOptions);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[airtable-proxy] erreur:', err.message);
    return res.status(502).json({ error: 'Erreur de communication avec la base de données' });
  }
}
