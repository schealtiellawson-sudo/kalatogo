// ================================================================
// Inbox/WhatsApp Sequences — Flush (cron-friendly endpoint)
// POST/GET /api/wolo-pay/whatsapp-flush
// Lit les messages pending dans wolo_whatsapp_queue où scheduled_at <= now(),
// substitue les variables, et délivre via le canal disponible.
//
// Canaux par ordre de priorité :
//  1. WhatsApp Cloud (env WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_ID)
//  2. Twilio       (env TWILIO_SID + TWILIO_TOKEN + TWILIO_FROM)
//  3. INBOX        (toujours dispo) → push dans wolo_prestataires.notifications
//                                      → email Resend en doublon si email connu
//
// Sécurité : si CRON_SECRET défini, doit être passé en header X-Cron-Secret.
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { sendPushToUser } from './push-send.js';

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

// ───────────────────────────────────────────────────────
// Push dans la "Boîte du Fondateur" (notifications JSONB)
// + envoi email Resend en doublon si email + RESEND_API_KEY
// ───────────────────────────────────────────────────────
function inferTitle(templateKey, content) {
  // Titre court extrait du template_key ou de la 1ère ligne
  const firstLine = String(content || '').split('\n')[0].slice(0, 80).trim();
  const titles = {
    A1_bienvenue: 'Bienvenue sur WOLO Market',
    A2_mission_photos: 'Ajoute tes 3 photos',
    A3_temoignage: 'Aïcha de Tokpa — histoire vraie',
    A4_concours: 'Le Mur des Reines commence',
    A5_relance: 'On n\'a pas vu d\'activité chez toi',
    B1_lundi: 'WOLO, c\'est ton lundi',
    B2_carnet_client: 'Crée ton carnet de clientes en 10 min',
    B3_histoire_vraie: 'Mariam apprentie — comment elle a doublé',
    B4_concours_apprenties: 'Le Mur des Reines, ouvert à toi',
    B5_pro_indep: 'Investis dans ton indépendance',
    PED1_parrainage_40pct: 'Le parrainage 40% — opportunité majeure',
    PED2_pourquoi_pro: '5 raisons concrètes Plan Pro',
    PED3_recompenses: 'Les 500 000 FCFA distribués chaque mois',
    PED4_avis_clients: 'Les avis clients × 3 contacts',
    PED5_score_wolo: 'Comprends ton Score WOLO',
    PED6_disponibilite: 'Active ta disponibilité',
    PED7_partage_whatsapp: 'Ton lien WhatsApp partageable',
    PED8_recap: 'Bilan 75 jours sur WOLO',
  };
  return titles[templateKey] || firstLine || 'Message du fondateur';
}

async function sendToInbox(supa, userId, templateKey, content) {
  if (!userId) return false;
  // Charger notifications actuelles
  const { data: row, error: rErr } = await supa
    .from('wolo_prestataires')
    .select('id, email, notifications, nom_complet')
    .eq('user_id', userId).maybeSingle();
  if (rErr || !row) return { ok: false, reason: 'prestataire introuvable' };

  const current = Array.isArray(row.notifications) ? row.notifications : [];
  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'message_fondateur',
    template_key: templateKey,
    title: inferTitle(templateKey, content),
    body: content,
    from: 'Schealtiel · Fondateur WOLO Market',
    avatar: 'https://wolomarket.vercel.app/icons/founder-avatar.png',
    created_at: new Date().toISOString(),
    read: false,
  };
  const updated = [newMsg, ...current].slice(0, 200);  // max 200 messages
  const { error: uErr } = await supa
    .from('wolo_prestataires').update({ notifications: updated }).eq('id', row.id);
  if (uErr) return { ok: false, reason: uErr.message };
  return { ok: true, email: row.email, prenom: (row.nom_complet || '').split(' ')[0] };
}

async function sendEmailResend(toEmail, subject, content, prenom) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !toEmail) return null;
  // Mise en forme HTML simple persona Schealtiel
  const html = `<!doctype html><html><body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#0f1410;color:#F8F6F1;padding:0;margin:0;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#0f1410;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
    <div style="width:44px;height:44px;border-radius:50%;background:#E8940A;color:#0f1410;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;font-family:'Fraunces',serif;">S</div>
    <div>
      <div style="font-weight:700;color:#F8F6F1;font-size:15px;">Schealtiel</div>
      <div style="font-size:12px;color:rgba(248,246,241,0.55);">Fondateur · WOLO Market</div>
    </div>
  </div>
  <div style="font-size:15px;line-height:1.7;color:rgba(248,246,241,0.85);white-space:pre-line;">${(content || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(232,148,10,0.2);font-size:12px;color:rgba(248,246,241,0.5);">
    Tu reçois ce message parce que tu fais partie de la communauté WOLO Market.<br>
    <a href="https://wolomarket.com/#dashboard" style="color:#E8940A;">Ouvrir mon dashboard</a> · <a href="https://wolomarket.com/#cgu" style="color:rgba(248,246,241,0.5);">Désinscrire</a>
  </div>
</div></body></html>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Schealtiel <schealtiel@wolomarket.com>',
        to: [toEmail],
        subject,
        html,
      }),
    });
    if (!r.ok) return null;
    return 'resend';
  } catch (_) { return null; }
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

    // 4. Délivrer
    let sent = 0, inboxed = 0, emailed = 0, failed = 0;
    for (const m of dueMsgs) {
      const tplContent = tplMap[m.template_key];
      if (!tplContent) {
        await supabase.from('wolo_whatsapp_queue').update({
          status: 'failed', error: 'template introuvable', attempts: (m.attempts || 0) + 1,
        }).eq('id', m.id);
        failed++; continue;
      }
      // 4a. Substituer les variables (avec defaults)
      let finalContent = substitute(tplContent, {
        url_dashboard: 'https://wolomarket.com/#dashboard',
        url_awards: 'https://wolomarket.com/#awards',
        url_recompenses: 'https://wolomarket.com/#recompenses',
        url_parrainage: 'https://wolomarket.com/#dashboard',
        url_profil: 'https://wolomarket.com/#dashboard',
        url_search: 'https://wolomarket.com/#search',
        prenom: 'sœur',
        ...(m.payload || {}),
      });

      try {
        let provider = null;
        // 4b. Tenter WhatsApp Cloud / Twilio si dispo
        if (m.phone) {
          provider = await sendWhatsAppCloud(m.phone, finalContent).catch(() => null);
          if (!provider) provider = await sendTwilio(m.phone, finalContent).catch(() => null);
        }
        // 4c. Fallback : INBOX (toujours dispo) + email Resend en doublon si possible
        if (!provider) {
          const inbox = await sendToInbox(supabase, m.user_id, m.template_key, finalContent);
          if (inbox?.ok) {
            inboxed++;
            provider = 'inbox';
            // 4c.bis. Push web (PWA) — best-effort, ne bloque pas
            try {
              const title = inferTitle(m.template_key, finalContent);
              const previewBody = String(finalContent || '').slice(0, 180);
              await sendPushToUser(m.user_id, {
                title,
                body: previewBody,
                url: 'https://wolomarket.com/#dashboard',
                tag: 'fondateur-' + m.template_key,
                data: { template_key: m.template_key },
              });
            } catch (pushErr) {
              console.warn('[whatsapp-flush] push fail', pushErr?.message);
            }
            // Email en doublon (premiers messages = milestones critiques pour réveiller)
            const isMilestone = ['A1_bienvenue','A4_concours','PED1_parrainage_40pct','PED3_recompenses','PED8_recap'].includes(m.template_key);
            if (isMilestone && inbox.email) {
              const subject = inferTitle(m.template_key, finalContent);
              const e = await sendEmailResend(inbox.email, subject, finalContent, inbox.prenom);
              if (e) { emailed++; provider = 'inbox+email'; }
            }
          } else {
            console.log('[inbox:fail]', m.user_id, m.template_key, inbox?.reason);
            provider = 'log';
          }
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

    return res.status(200).json({
      ok: true, processed: dueMsgs.length,
      sent_whatsapp: sent, inboxed, emailed, failed,
    });
  } catch (err) {
    console.error('[whatsapp-flush]', err);
    // Log dans wolo_errors_log pour remonter dans l'agrégat monitoring
    try {
      await supabase.from('wolo_errors_log').insert({
        source: 'cron',
        error_msg: String(err.message || err).slice(0, 1000),
        stack: String(err.stack || '').slice(0, 4000),
        url: '/api/wolo-pay/whatsapp-flush',
        context: { handler: 'whatsapp-flush' },
      });
    } catch (_) { /* silencieux : on n'aggrave pas */ }
    return res.status(500).json({ error: 'Erreur interne', detail: err.message });
  }
}
