// ================================================================
// WOZALI Messagerie — UI thread + messages candidat ↔ recruteur
// API : window.wozaliMessagerie.open({ candidature, role })
//   - candidature : record Airtable Candidatures (avec id + fields)
//   - role : 'candidat' | 'recruteur' (qui ouvre)
// Endpoints : thread-list, message-list, message-send
// ================================================================
(function () {
  const API = (action) => `/api/wozali-pay/${action}`;
  const wFetch = () => window.wozaliFetch || fetch;

  const TEMPLATES = {
    convocation: {
      label: '📅 Convocation entretien',
      content: 'Bonjour, ta candidature nous intéresse. On aimerait te rencontrer pour un entretien. Es-tu disponible cette semaine ? Précise-moi tes créneaux.',
    },
    demande_docs: {
      label: '📎 Demande de documents',
      content: 'Bonjour, peux-tu nous envoyer ton CV à jour + une pièce d\'identité ? Merci.',
    },
    refus: {
      label: '✗ Refus poli',
      content: 'Bonjour, merci pour ta candidature. Après étude, on a retenu un autre profil pour ce poste. On garde ton contact pour de futures opportunités. Bonne continuation.',
    },
  };

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function close() {
    const m = document.getElementById('wozali-msg-modal');
    if (m) m.remove();
  }

  let state = null; // { thread, messages, candidature, role, peerName, polling }

  async function findOrPrepareThread(candidature, role) {
    // 1. Tente de récupérer le thread existant via thread-list
    try {
      const res = await wFetch()(API('thread-list') + '?role=' + role);
      const data = await res.json();
      if (data?.threads?.length) {
        const found = data.threads.find(t => t.candidature_airtable_id === candidature.id);
        if (found) return { thread: found, exists: true };
      }
    } catch (e) {
      console.warn('[messagerie] thread-list failed', e);
    }
    return { thread: null, exists: false };
  }

  async function loadMessages(threadId) {
    const res = await wFetch()(API('message-list') + '?thread_id=' + encodeURIComponent(threadId));
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Erreur chargement messages');
    return data.messages || [];
  }

  async function sendMessage(content, template) {
    const f = state.candidature.fields;
    const body = {
      content,
      template: template || null,
    };
    if (state.thread?.id) {
      body.thread_id = state.thread.id;
    } else {
      // Création de thread : besoin des user_ids des deux côtés
      const candidatUserId = f['Candidat User ID'] || f['Candidat Supabase ID'] || null;
      const recruteurUserId = f['Recruteur User ID'] || f['Recruteur Supabase ID'] || (window.currentUser?.id || null);
      if (!candidatUserId || !recruteurUserId) {
        throw new Error('Identifiants manquants pour créer le fil. Contacte par WhatsApp en attendant.');
      }
      body.candidature_airtable_id = state.candidature.id;
      body.offre_airtable_id = f['Offre ID'] || null;
      body.candidat_user_id = candidatUserId;
      body.recruteur_user_id = recruteurUserId;
      body.candidat_nom = f['Candidat Nom'] || '';
      body.recruteur_nom = f['Recruteur Nom'] || '';
      body.offre_titre = f['Offre Titre'] || '';
    }
    const res = await wFetch()(API('message-send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Erreur envoi');
    if (!state.thread?.id && data.thread_id) {
      state.thread = { id: data.thread_id };
    }
    return data.message;
  }

  function renderMessages() {
    const list = document.getElementById('wozali-msg-list');
    if (!list) return;
    if (!state.messages.length) {
      list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:rgba(252, 224, 168,.4);font-size:13px;">Aucun message. Démarre la conversation 👇</div>`;
      return;
    }
    const myId = window.currentUser?.id;
    list.innerHTML = state.messages.map(m => {
      const mine = m.sender_user_id === myId;
      const bg = mine ? 'rgba(232,148,10,.15)' : 'rgba(255,255,255,.06)';
      const align = mine ? 'flex-end' : 'flex-start';
      const radius = mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px';
      return `<div style="display:flex;justify-content:${align};margin-bottom:8px;">
        <div style="max-width:75%;background:${bg};padding:10px 12px;border-radius:${radius};font-size:14px;color:#FCE0A8;line-height:1.45;white-space:pre-wrap;word-break:break-word;">
          ${escapeHtml(m.content)}
          <div style="font-size:10px;color:rgba(252, 224, 168,.4);margin-top:4px;text-align:right;">${fmtDate(m.created_at)}</div>
        </div>
      </div>`;
    }).join('');
    list.scrollTop = list.scrollHeight;
  }

  async function refresh() {
    if (!state?.thread?.id) return;
    try {
      state.messages = await loadMessages(state.thread.id);
      renderMessages();
    } catch (e) { /* silencieux pour le polling */ }
  }

  function startPolling() {
    if (state.polling) clearInterval(state.polling);
    state.polling = setInterval(refresh, 8000);
  }

  function stopPolling() {
    if (state?.polling) {
      clearInterval(state.polling);
      state.polling = null;
    }
  }

  async function open({ candidature, role }) {
    if (!candidature || !candidature.id) {
      window.toast?.('Candidature invalide', 'error');
      return;
    }
    if (!window.currentUser?.id) {
      window.toast?.('Connecte-toi pour envoyer un message', 'error');
      return;
    }

    const f = candidature.fields || {};
    const peerName = role === 'candidat' ? (f['Recruteur Nom'] || 'Recruteur') : (f['Candidat Nom'] || 'Candidat');
    state = { thread: null, messages: [], candidature, role, peerName, polling: null };

    // Modal
    close();
    const overlay = document.createElement('div');
    overlay.id = 'wozali-msg-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10001;display:flex;align-items:center;justify-content:center;padding:0;';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { stopPolling(); close(); } });

    const tmplBtns = role === 'recruteur' ? Object.entries(TEMPLATES).map(([k, v]) =>
      `<button type="button" data-tmpl="${k}" style="padding:6px 10px;border-radius:8px;background:rgba(232,148,10,.1);color:#E8940A;border:1px solid rgba(232,148,10,.25);font-size:11px;cursor:pointer;">${v.label}</button>`
    ).join('') : '';

    overlay.innerHTML = `
      <div style="background:#14100A;border:1px solid rgba(232,148,10,.3);border-radius:16px;width:min(560px,100%);max-height:90vh;display:flex;flex-direction:column;margin:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.06);">
          <div>
            <div style="font-family:'Geist Mono',monospace;font-size:10px;color:#E8940A;text-transform:uppercase;letter-spacing:2px;">Messagerie</div>
            <h3 style="font-family:Fraunces,serif;font-size:18px;font-weight:700;color:#FCE0A8;margin:4px 0 0;">${escapeHtml(peerName)}</h3>
            <div style="font-size:11px;color:rgba(252, 224, 168,.4);">${escapeHtml(f['Offre Titre'] || '')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:2px;position:relative;">
            <button id="wozali-msg-menu" aria-label="Options" style="background:none;border:none;color:rgba(252,224,168,.5);cursor:pointer;padding:6px;line-height:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            <button id="wozali-msg-close" style="background:none;border:none;color:rgba(252, 224, 168,.5);font-size:24px;cursor:pointer;line-height:1;padding:0 4px;">×</button>
            <div id="wozali-msg-menu-dd" style="display:none;position:absolute;top:34px;right:0;background:#1E180E;border:1px solid rgba(232,148,10,.25);border-radius:12px;min-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.5);z-index:10;overflow:hidden;">
              <button type="button" id="wozali-menu-signaler" style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;color:#FCE0A8;font-size:13.5px;padding:13px 16px;cursor:pointer;text-align:left;font-family:inherit;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8940A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Signaler la conversation
              </button>
            </div>
          </div>
        </div>
        <div id="wozali-msg-list" style="flex:1;min-height:300px;max-height:50vh;overflow-y:auto;padding:16px 20px;background:rgba(0,0,0,.2);">
          <div style="text-align:center;padding:40px 20px;color:rgba(252, 224, 168,.4);font-size:13px;">Chargement…</div>
        </div>
        ${tmplBtns ? `<div style="display:flex;gap:6px;padding:10px 20px 0;flex-wrap:wrap;">${tmplBtns}</div>` : ''}
        <form id="wozali-msg-form" style="display:flex;gap:8px;padding:14px 20px;border-top:1px solid rgba(255,255,255,.06);">
          <textarea id="wozali-msg-input" placeholder="Écris ton message…" rows="2" style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(232,148,10,.2);color:#FCE0A8;padding:10px 12px;border-radius:10px;font-family:Poppins,sans-serif;font-size:14px;resize:vertical;outline:none;"></textarea>
          <button type="submit" id="wozali-msg-send" style="padding:0 18px;border-radius:10px;background:#E8940A;color:#14100A;font-weight:700;border:none;cursor:pointer;font-size:13px;">Envoyer</button>
        </form>
        <div id="wozali-msg-malaise-zone" style="padding:0 20px;"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('wozali-msg-close').addEventListener('click', () => { stopPolling(); close(); });

    // ── Chantier 8 Dignité : signalement via le menu ⋮ (pattern WhatsApp) ──
    // Rien de visible en permanence : l'option vit dans le menu de la
    // conversation. Confirmation douce → signalement avec la conversation
    // → message de soutien immédiat. La victime n'est jamais laissée seule.
    const malaiseZone = document.getElementById('wozali-msg-malaise-zone');
    const menuDd = document.getElementById('wozali-msg-menu-dd');
    document.getElementById('wozali-msg-menu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuDd) menuDd.style.display = menuDd.style.display === 'none' ? 'block' : 'none';
    });
    overlay.addEventListener('click', () => { if (menuDd) menuDd.style.display = 'none'; });
    const malaiseLien = () => { if (malaiseZone) malaiseZone.innerHTML = ''; };
    const malaiseConfirm = () => {
      if (menuDd) menuDd.style.display = 'none';
      if (!malaiseZone) return;
      malaiseZone.innerHTML = `
        <div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.25);border-radius:12px;padding:12px 14px;text-align:left;">
          <div style="font-size:13px;color:#FCE0A8;font-weight:700;margin-bottom:4px;">Tu veux nous signaler cette conversation ?</div>
          <div style="font-size:12px;color:rgba(252,224,168,.6);line-height:1.5;margin-bottom:10px;">Elle sera analysée en toute confidentialité. L'autre personne ne saura pas que ça vient de toi.</div>
          <div style="display:flex;gap:8px;">
            <button type="button" id="wozali-malaise-oui" style="flex:1;background:#E8940A;color:#14100A;border:none;border-radius:10px;padding:9px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;">Oui, signaler</button>
            <button type="button" id="wozali-malaise-non" style="flex:1;background:none;border:1px solid rgba(255,255,255,.15);color:rgba(252,224,168,.55);border-radius:10px;padding:9px;font-size:12.5px;cursor:pointer;font-family:inherit;">Annuler</button>
          </div>
        </div>`;
      document.getElementById('wozali-malaise-non')?.addEventListener('click', malaiseLien);
      document.getElementById('wozali-malaise-oui')?.addEventListener('click', async () => {
        malaiseZone.innerHTML = `<div style="font-size:12px;color:rgba(252,224,168,.5);padding:8px;">Envoi…</div>`;
        try {
          const myId = window.currentUser?.id;
          const peerId = role === 'candidat'
            ? (f['Recruteur User ID'] || f['Recruteur Supabase ID'] || null)
            : (f['Candidat User ID'] || f['Candidat Supabase ID'] || null);
          const conversation = (state.messages || []).slice(-20).map(m => ({
            de: m.sender_user_id === myId ? 'moi' : 'autre',
            texte: m.content || '',
          }));
          const wFetch = window.wozaliFetch || window.woloFetch || fetch;
          const r = await wFetch('/api/wozali-pay/signalement-create', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              motif: 'malaise',
              target_user_id: peerId,
              target_candidature_airtable_id: candidature.id,
              conversation,
            }),
          });
          const data = await r.json();
          malaiseZone.innerHTML = `
            <div style="background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.3);border-radius:12px;padding:14px;text-align:left;">
              <div style="font-size:13px;color:#FCE0A8;line-height:1.6;">${escapeHtml(data?.soutien || 'Signalement bien reçu. Notre équipe va vérifier.')}</div>
            </div>`;
        } catch (e) {
          malaiseZone.innerHTML = `<div style="font-size:12px;color:#f87171;padding:8px;">Ça n'est pas parti. Vérifie ta connexion et réessaie.</div>`;
        }
      });
    };
    document.getElementById('wozali-menu-signaler')?.addEventListener('click', (e) => { e.stopPropagation(); malaiseConfirm(); });

    // Templates
    overlay.querySelectorAll('[data-tmpl]').forEach(b => {
      b.addEventListener('click', () => {
        const k = b.getAttribute('data-tmpl');
        const t = TEMPLATES[k];
        if (t) document.getElementById('wozali-msg-input').value = t.content;
      });
    });

    // Charger thread + messages
    try {
      const r = await findOrPrepareThread(candidature, role);
      state.thread = r.thread;
      if (r.exists) {
        state.messages = await loadMessages(r.thread.id);
      } else {
        state.messages = [];
      }
      renderMessages();
      if (r.exists) startPolling();
    } catch (e) {
      const list = document.getElementById('wozali-msg-list');
      if (list) list.innerHTML = `<div style="padding:18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#f87171;font-size:13px;">${escapeHtml(e.message)}</div>`;
    }

    // Submit
    document.getElementById('wozali-msg-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const input = document.getElementById('wozali-msg-input');
      const send = document.getElementById('wozali-msg-send');
      const content = input.value.trim();
      if (!content) return;
      send.disabled = true; send.textContent = '…';
      try {
        const msg = await sendMessage(content);
        state.messages.push(msg);
        renderMessages();
        input.value = '';
        if (!state.polling) startPolling();
      } catch (e) {
        window.toast?.(e.message, 'error');
      } finally {
        send.disabled = false; send.textContent = 'Envoyer';
      }
    });
  }

  window.wozaliMessagerie = { open, close };
})();
