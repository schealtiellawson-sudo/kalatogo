// ================================================================
// Monitoring — Health Metrics aggregator (cron 1×/jour)
// POST /api/wolo-pay/health-metrics    (CRON-only via X-Cron-Secret)
//
// 1. Agrège les erreurs des dernières 24h par heure dans wolo_health_metrics
// 2. Si volume d''erreurs > seuil → email Resend à schealtiellawson@gmail.com
//    avec récap top 5 messages d''erreur
//
// Seuils (modifiables via env) :
//   ALERT_ERROR_THRESHOLD_24H        (défaut 50)   — total erreurs/24h
//   ALERT_FRONTEND_THRESHOLD_24H     (défaut 100)  — frontend seul
//   ALERT_BACKEND_THRESHOLD_24H      (défaut 20)   — backend seul (bcp + grave)
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const ADMIN_EMAIL = 'schealtiellawson@gmail.com';

const THRESHOLDS = {
  total:    parseInt(process.env.ALERT_ERROR_THRESHOLD_24H || '50', 10),
  frontend: parseInt(process.env.ALERT_FRONTEND_THRESHOLD_24H || '100', 10),
  backend:  parseInt(process.env.ALERT_BACKEND_THRESHOLD_24H || '20', 10),
};

function isAuthorized(req) {
  // Vercel cron envoie un Authorization: Bearer <CRON_SECRET>
  // ou notre header custom
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // pas de secret = autorisé (dev)
  const auth = req.headers.authorization || '';
  if (auth === `Bearer ${cronSecret}`) return true;
  if (req.headers['x-cron-secret'] === cronSecret) return true;
  return false;
}

async function aggregateLast24h() {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('wolo_errors_log')
    .select('source, created_at, error_msg')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) throw new Error(`fetch errors: ${error.message}`);
  return data || [];
}

function bucketByHour(rows) {
  const buckets = {}; // key = `${source}|${isoHour}` -> count
  for (const r of rows) {
    const dt = new Date(r.created_at);
    dt.setMinutes(0, 0, 0);
    const k = `${r.source}|${dt.toISOString()}`;
    buckets[k] = (buckets[k] || 0) + 1;
  }
  return buckets;
}

function top5Messages(rows) {
  const counts = {};
  for (const r of rows) {
    const key = (r.error_msg || '').slice(0, 200);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([msg, count]) => ({ msg, count }));
}

async function upsertMetrics(buckets) {
  const rows = Object.entries(buckets).map(([k, count]) => {
    const [source, hour] = k.split('|');
    return { metric: `erreur_${source}`, hour, count };
  });
  if (!rows.length) return 0;
  const { error } = await supabase
    .from('wolo_health_metrics')
    .upsert(rows, { onConflict: 'metric,hour' });
  if (error) throw new Error(`upsert metrics: ${error.message}`);
  return rows.length;
}

async function sendAlertEmail({ total, byCounts, topMsgs }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[health-metrics] RESEND_API_KEY absent — skip alerte');
    return false;
  }

  const topHtml = topMsgs.map(t =>
    `<li><b>${t.count}×</b> ${escape(t.msg)}</li>`
  ).join('');

  const html = `<!doctype html><html><body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#0f1410;color:#F8F6F1;padding:0;margin:0;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
    <div style="width:44px;height:44px;border-radius:50%;background:#E8940A;color:#0f1410;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;">!</div>
    <div>
      <div style="font-weight:700;color:#F8F6F1;font-size:16px;">Alerte monitoring WOLO Market</div>
      <div style="font-size:12px;color:rgba(248,246,241,0.55);">Dernières 24h</div>
    </div>
  </div>
  <div style="background:rgba(232,148,10,0.08);border-left:3px solid #E8940A;padding:14px 16px;margin-bottom:18px;">
    <div style="font-size:14px;line-height:1.6;">
      <b>${total}</b> erreurs sur 24h<br>
      Frontend : <b>${byCounts.frontend || 0}</b><br>
      Backend : <b>${byCounts.backend || 0}</b><br>
      Cron : <b>${byCounts.cron || 0}</b>
    </div>
  </div>
  <div style="font-size:14px;color:rgba(248,246,241,0.85);margin-bottom:8px;"><b>Top 5 erreurs</b></div>
  <ol style="font-size:13px;line-height:1.7;color:rgba(248,246,241,0.8);padding-left:20px;">${topHtml}</ol>
  <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(232,148,10,0.2);font-size:12px;color:rgba(248,246,241,0.5);">
    Voir les logs : Supabase → table <code>wolo_errors_log</code>.<br>
    Ajuster le seuil : env vars <code>ALERT_*_THRESHOLD_24H</code>.
  </div>
</div></body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'WOLO Monitoring <monitoring@wolomarket.com>',
        to: [ADMIN_EMAIL],
        subject: `[WOLO Alerte] ${total} erreurs / 24h`,
        html,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('[health-metrics] resend failed:', r.status, t.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[health-metrics] resend exception:', e.message);
    return false;
  }
}

function escape(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Cron secret invalide' });
  }

  try {
    const rows = await aggregateLast24h();
    const buckets = bucketByHour(rows);
    const upserted = await upsertMetrics(buckets);

    const byCounts = rows.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {});
    const total = rows.length;

    let alertSent = false;
    let triggered = null;
    if (total >= THRESHOLDS.total) triggered = 'total';
    else if ((byCounts.frontend || 0) >= THRESHOLDS.frontend) triggered = 'frontend';
    else if ((byCounts.backend || 0) >= THRESHOLDS.backend) triggered = 'backend';

    if (triggered) {
      const topMsgs = top5Messages(rows);
      alertSent = await sendAlertEmail({ total, byCounts, topMsgs });
    }

    // Purge logs > 30 jours
    let purged = 0;
    try {
      const { data } = await supabase.rpc('purge_old_errors', { retention_days: 30 });
      purged = typeof data === 'number' ? data : 0;
    } catch (_) { /* function peut ne pas exister encore */ }

    return res.status(200).json({
      ok: true,
      total_24h: total,
      by_source: byCounts,
      buckets_upserted: upserted,
      thresholds: THRESHOLDS,
      alert_triggered: triggered,
      alert_sent: alertSent,
      purged_old: purged,
    });
  } catch (e) {
    console.error('[health-metrics]', e);
    return res.status(500).json({ error: 'Erreur interne', detail: e.message });
  }
}
