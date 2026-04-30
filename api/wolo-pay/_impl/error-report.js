// ================================================================
// Monitoring — Error Report (frontend → DB)
// POST /api/wolo-pay/error-report   (PUBLIC, rate-limited 100/h/IP)
//
// Body : { source?: 'frontend'|'backend'|'cron', error_msg, stack?, url?,
//          user_agent?, context?: {email, prest_id, ...} }
//
// Sécurité :
//  - Rate limit en mémoire : 100 events/h/IP (best effort sans Redis)
//  - Tronque tous les champs (anti-flood DB)
//  - N''expose JAMAIS de stack au client
//  - source forcée à 'frontend' si non whitelistée
// ================================================================
import { supabase } from '../../_lib/supabase.js';

// Rate limit en mémoire (réinit au cold start, suffit pour MVP)
const RATE_BUCKET = new Map(); // ip -> { count, windowStart }
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 100;

function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function checkRate(ip) {
  const now = Date.now();
  const slot = RATE_BUCKET.get(ip);
  if (!slot || now - slot.windowStart > WINDOW_MS) {
    RATE_BUCKET.set(ip, { count: 1, windowStart: now });
    return true;
  }
  slot.count += 1;
  return slot.count <= MAX_PER_WINDOW;
}

function trunc(v, max) {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ip = clientIp(req);
    if (!checkRate(ip)) {
      return res.status(429).json({ ok: false, error: 'Rate limit dépassé' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const errorMsg = trunc(body.error_msg, 1000);
    if (!errorMsg) {
      return res.status(400).json({ ok: false, error: 'error_msg requis' });
    }

    let source = String(body.source || 'frontend').toLowerCase();
    if (!['frontend', 'backend', 'cron'].includes(source)) source = 'frontend';

    // Récupère user_id si Authorization présent (sans bloquer si absent)
    let userId = null;
    try {
      const auth = req.headers.authorization || '';
      const token = auth.replace(/^Bearer\s+/i, '');
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        if (data?.user?.id) userId = data.user.id;
      }
    } catch (_) { /* silencieux */ }

    const ctx = (body.context && typeof body.context === 'object') ? body.context : {};
    // Anonymise email si trop long / random data
    const safeContext = {};
    for (const k of Object.keys(ctx).slice(0, 20)) {
      safeContext[trunc(k, 60)] = trunc(typeof ctx[k] === 'object' ? JSON.stringify(ctx[k]) : ctx[k], 500);
    }

    const row = {
      user_id:    userId,
      source,
      error_msg:  errorMsg,
      stack:      trunc(body.stack, 4000),
      url:        trunc(body.url, 500),
      user_agent: trunc(body.user_agent || req.headers['user-agent'], 500),
      context:    safeContext,
      ip:         trunc(ip, 64),
    };

    const { error } = await supabase.from('wolo_errors_log').insert(row);
    if (error) {
      // Pas de leak du message DB côté client
      console.error('[error-report] insert failed:', error.message);
      return res.status(500).json({ ok: false, error: 'Erreur enregistrement' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[error-report] handler:', e.message);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
}
