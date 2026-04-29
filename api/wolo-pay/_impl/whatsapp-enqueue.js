// ================================================================
// Inbox/WhatsApp Sequences — Enqueue
// POST /api/wolo-pay/whatsapp-enqueue
// Body: { user_id, phone?, sequence, payload?: {} }
// Insère tous les templates de la séquence dans wolo_whatsapp_queue.
// Pour le premier message (delay 0h), livre immédiatement (inbox + email).
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const ALLOWED_SEQUENCES = [
  'A_onboarding','B_apprentie','C_concours',
  'M_apprentie_coiffure','M_apprentie_couture',
  'M_patronne_coiffure','M_patronne_couture',
  'M_indep_coiffure','M_indep_couture',
  'M_client_recherche',
  'M_pedago',
];

function inferTitle(templateKey, content) {
  const firstLine = String(content || '').split('\n')[0].slice(0, 80).trim();
  return firstLine || 'Message du fondateur';
}

function substitute(content, payload) {
  if (!content) return '';
  return content.replace(/\{(\w+)\}/g, (_, k) => {
    const v = payload?.[k];
    return v != null ? String(v) : '';
  });
}

async function pushInbox(userId, templateKey, content) {
  const { data: row } = await supabase
    .from('wolo_prestataires')
    .select('id, email, notifications, nom_complet')
    .eq('user_id', userId).maybeSingle();
  if (!row) return null;
  const current = Array.isArray(row.notifications) ? row.notifications : [];
  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'message_fondateur',
    template_key: templateKey,
    title: inferTitle(templateKey, content),
    body: content,
    from: 'Schealtiel · Fondateur WOLO Market',
    created_at: new Date().toISOString(),
    read: false,
  };
  const updated = [newMsg, ...current].slice(0, 200);
  await supabase.from('wolo_prestataires').update({ notifications: updated }).eq('id', row.id);
  return { email: row.email, prenom: (row.nom_complet || '').split(' ')[0] };
}

async function sendEmailResend(toEmail, subject, content) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !toEmail) return false;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0f1410;color:#F8F6F1;margin:0;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
    <div style="width:44px;height:44px;border-radius:50%;background:#E8940A;color:#0f1410;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;">S</div>
    <div><div style="font-weight:700;font-size:15px;">Schealtiel</div><div style="font-size:12px;opacity:0.6;">Fondateur · WOLO Market</div></div>
  </div>
  <div style="font-size:15px;line-height:1.7;opacity:0.85;white-space:pre-line;">${(content||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(232,148,10,0.2);font-size:12px;opacity:0.5;">
    <a href="https://wolomarket.com/#dashboard" style="color:#E8940A;">Ouvrir mon dashboard</a>
  </div>
</div></body></html>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Schealtiel <schealtiel@wolomarket.com>', to: [toEmail], subject, html }),
    });
    return r.ok;
  } catch (_) { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { user_id, phone, sequence, payload = {} } = req.body || {};
  if (!user_id || !sequence) {
    return res.status(400).json({ error: 'user_id et sequence requis' });
  }
  if (!ALLOWED_SEQUENCES.includes(sequence)) {
    return res.status(400).json({ error: 'sequence inconnue' });
  }

  try {
    // 1. Charger les templates de la séquence (avec content pour livraison immédiate)
    const { data: templates, error: tErr } = await supabase
      .from('wolo_whatsapp_templates')
      .select('key, step, delay_hours, content')
      .eq('sequence', sequence)
      .eq('active', true)
      .order('step', { ascending: true });
    if (tErr) throw tErr;
    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'Aucun template actif pour cette séquence' });
    }

    // 2. Annuler une éventuelle séquence pending du même type pour ce user (resync)
    const seqPrefix = sequence.split('_')[0] + '%';
    await supabase
      .from('wolo_whatsapp_queue')
      .update({ status: 'cancelled' })
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .like('template_key', seqPrefix);

    // 3. Insérer chaque template avec scheduled_at calculé
    const now = Date.now();
    const rows = templates.map(t => ({
      user_id,
      phone: phone || null,
      template_key: t.key,
      payload,
      scheduled_at: new Date(now + t.delay_hours * 3600 * 1000).toISOString(),
      status: 'pending',
    }));

    const { data: inserted, error: iErr } = await supabase
      .from('wolo_whatsapp_queue')
      .insert(rows)
      .select('id, template_key, scheduled_at');
    if (iErr) throw iErr;

    // 4. LIVRAISON IMMÉDIATE du 1er message (delay_hours = 0)
    // → Push dans la Boîte du Fondateur + email Resend si milestone
    let immediate_delivered = 0;
    const firstTpl = templates.find(t => t.delay_hours === 0);
    if (firstTpl) {
      const finalContent = substitute(firstTpl.content, {
        url_dashboard: 'https://wolomarket.com/#dashboard',
        url_awards: 'https://wolomarket.com/#awards',
        url_recompenses: 'https://wolomarket.com/#recompenses',
        url_parrainage: 'https://wolomarket.com/#dashboard',
        url_profil: 'https://wolomarket.com/#dashboard',
        prenom: payload.prenom || 'sœur',
        ...payload,
      });
      const inbox = await pushInbox(user_id, firstTpl.key, finalContent).catch(() => null);
      if (inbox) {
        immediate_delivered = 1;
        // Email pour A1_bienvenue toujours, ou autre milestone
        if (firstTpl.key === 'A1_bienvenue' || firstTpl.key === 'B1_lundi') {
          await sendEmailResend(inbox.email, inferTitle(firstTpl.key, finalContent), finalContent);
        }
        // Marquer le 1er message comme sent (provider=inbox)
        const firstQueueRow = (inserted || []).find(r => r.template_key === firstTpl.key);
        if (firstQueueRow) {
          await supabase.from('wolo_whatsapp_queue').update({
            status: 'sent', sent_at: new Date().toISOString(), provider: 'inbox',
          }).eq('id', firstQueueRow.id);
        }
      }
    }

    return res.status(201).json({
      ok: true,
      sequence,
      enqueued: inserted?.length || 0,
      immediate_delivered,
      first_send: inserted?.[0]?.scheduled_at,
      messages: inserted,
    });
  } catch (err) {
    console.error('[whatsapp-enqueue]', err);
    return res.status(500).json({ error: 'Erreur interne', detail: err.message });
  }
}
