// ================================================================
// Monitoring — Health Check (uptime probe)
// GET /api/wolo-pay/health-check   (PUBLIC)
//
// Réponse : { status:'ok'|'degraded'|'down', db, timestamp, version,
//             latency_ms }
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev';

export default async function handler(req, res) {
  const startedAt = Date.now();
  let dbStatus = 'unknown';
  let httpStatus = 200;
  let overall = 'ok';

  try {
    // Ping rapide : compte 1 ligne sur une petite table système
    // (table d''erreurs : presque toujours dispo, légère)
    const { error } = await supabase
      .from('wolo_errors_log')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    if (error) {
      dbStatus = 'error';
      overall = 'degraded';
      console.warn('[health-check] db error:', error.message);
    } else {
      dbStatus = 'ok';
    }
  } catch (e) {
    dbStatus = 'error';
    overall = 'down';
    httpStatus = 503;
    console.error('[health-check]', e.message);
  }

  const body = {
    status: overall,
    db: dbStatus,
    timestamp: new Date().toISOString(),
    version: VERSION,
    latency_ms: Date.now() - startedAt,
  };

  // Cache court côté CDN (éviter abus, mais pinger à jour)
  res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=10');
  return res.status(httpStatus).json(body);
}
