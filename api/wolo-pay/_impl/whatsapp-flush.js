// ================================================================
// WhatsApp Sequences — Flush (cron-friendly endpoint)
// POST/GET /api/wolo-pay/whatsapp-flush
// Lit les messages pending dans wolo_whatsapp_queue où scheduled_at <= now(),
// substitue les variables, et envoie via le provider configuré.
//
// Provider :
//  - Si env WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_ID → Meta WhatsApp Cloud API
//  - Si env TWILIO_SID + TWILIO_TOKEN + TWILIO_FROM → Twilio
//  - Sinon → log dans la queue (provider='log') et marque sent (mode dev/staging)
//
// Sécurité : si CRON_SECRET défini, doit être passé en header X-Cron-Secret.
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const BATCH = 30;

async function sendWhatsAppCloud(phone, content) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null;
  const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace(/\D/g, ''),
      type: 'text',
      text: { preview_url: true, body: content },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`whatsapp_cloud ${r.status}: ${t.slice(0, 200)}`);
  }
  return 'whatsapp_cloud';
}

async function sendTwilio(phone, content) {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.TWILIO_FROM;            // ex: 'whatsapp:+14155238886'
  if (!sid || !token || !from) return null;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      From: from,
      To: `whatsapp:${phone}`,
      Body: content,
    }).toString(),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`twilio ${r.status}: ${t.slice(0, 200)}`);
  }
  return 'twilio';
}

function substitute(content, payload) {
  if (!content) return '';
  return content.replace(/\{(\w+)\}/g, (_, k) => {
    const v = payload?.[k];
    return v != null ? String(v) : '';
  });
}

export default async function handler(req, res) {
  // Vérif secret cron si défini
  if (process.env.CRON_SECRET && req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'cron secret invalide' });
  }

  try {
    // 1. Pull batch des messages dus
    const { data: dueMsgs, error: fErr } = await supabase
      .from('wolo_whatsapp_queue')
      .select('id, user_id, phone, template_key, payload, attempts')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(BATCH);
    if (fErr) throw fErr;
    if (!dueMsgs || dueMsgs.length === 0) {
      return res.status(200).json({ ok: true, processed: 0, message: 'rien à envoyer' });
    }

    // 2. Charger les templates correspondants
    const tplKeys = [...new Set(dueMsgs.map(m => m.template_key))];
    const { data: tpls } = await supabase
      .from('wolo_whatsapp_templates')
      .select('key, content')
      .in('key', tplKeys);
    const tplMap = {};
    for (const t of (tpls || [])) tplMap[t.key] = t.content;

    // 3. Marquer "sending" pour éviter double envoi
    const ids = dueMsgs.map(m => m.id);
    await supabase
      .from('wolo_whatsapp_queue')
      .update({ status: 'sending', attempts: 0 })
      .in('id', ids);

    // 4. Envoyer
    let sent = 0, failed = 0, logged = 0;
    for (const m of dueMsgs) {
      const tplContent = tplMap[m.template_key];
      if (!tplContent) {
        await supabase.from('wolo_whatsapp_queue').update({
          status: 'failed', error: 'template introuvable', attempts: (m.attempts || 0) + 1,
        }).eq('id', m.id);
        failed++; continue;
      }
      const finalContent = substitute(tplContent, {
        url_dashboard: 'https://wolomarket.com/#dashboard',
        url_awards: 'https://wolomarket.com/#awards',
        prenom: 'sœur',
        ...(m.payload || {}),
      });
      try {
        let provider = await sendWhatsAppCloud(m.phone, finalContent).catch(() => null);
        if (!provider) provider = await sendTwilio(m.phone, finalContent).catch(() => null);
        if (!provider) {
          // Mode log : pas d'API configurée — on log en console
          console.log('[whatsapp:log]', m.phone, m.template_key, finalContent.slice(0, 100));
          provider = 'log';
          logged++;
        } else {
          sent++;
        }
        await supabase.from('wolo_whatsapp_queue').update({
          status: 'sent', sent_at: new Date().toISOString(), provider,
          attempts: (m.attempts || 0) + 1,
        }).eq('id', m.id);
      } catch (e) {
        failed++;
        await supabase.from('wolo_whatsapp_queue').update({
          status: 'failed', error: String(e.message || e).slice(0, 500),
          attempts: (m.attempts || 0) + 1,
        }).eq('id', m.id);
      }
    }

    return res.status(200).json({ ok: true, processed: dueMsgs.length, sent, logged, failed });
  } catch (err) {
    console.error('[whatsapp-flush]', err);
    return res.status(500).json({ error: 'Erreur interne', detail: err.message });
  }
}
