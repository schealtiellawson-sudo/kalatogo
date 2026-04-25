// ================================================================
// WOLO Messagerie — UI thread + messages candidat ↔ recruteur
// API : window.woloMessagerie.open({ candidature, role })
//   - candidature : record Airtable Candidatures (avec id + fields)
//   - role : 'candidat' | 'recruteur' (qui ouvre)
// Endpoints : thread-list, message-list, message-send
// ================================================================
(function () {
  const API = (action) => `/api/wolo-pay/${action}`;
  const wFetch = () => window.woloFetch || fetch;

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
    const m = document.getElementById('wolo-msg-modal');
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
    const list = document.getElementById('wolo-msg-list');
    if (!list) return;
    if (!state.messages.length) {
      list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:rgba(248,246,241,.4);font-size:13px;">Aucun message. Démarre la conversation 👇</div>`;
      return;
    }
    const myId = window.currentUser?.id;
    list.innerHTML = state.messages.map(m => {
      const mine = m.sender_user_id === myId;
      const bg = mine ? 'rgba(232,148,10,.15)' : 'rgba(255,255,255,.06)';
      const align = mine ? 'flex-end' : 'flex-start';
      const radius = mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px';
      return `<div style="display:flex;justify-content:${align};margin-bottom:8px;">
        <div style="max-width:75%;background:${bg};padding:10px 12px;border-radius:${radius};font-size:14px;color:#F8F6F1;line-height:1.45;white-space:pre-wrap;word-break:break-word;">
          ${escapeHtml(m.content)}
          <div style="font-size:10px;color:rgba(248,246,241,.4);margin-top:4px;text-align:right;">${fmtDate(m.created_at)}</div>
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
    overlay.id = 'wolo-msg-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10001;display:flex;align-items:center;justify-content:center;padding:0;';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { stopPolling(); close(); } });

    const tmplBtns = role === 'recruteur' ? Object.entries(TEMPLATES).map(([k, v]) =>
      `<button type="button" data-tmpl="${k}" style="padding:6px 10px;border-radius:8px;background:rgba(232,148,10,.1);color:#E8940A;border:1px solid rgba(232,148,10,.25);font-size:11px;cursor:pointer;">${v.label}</button>`
    ).join('') : '';

    overlay.innerHTML = `
      <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:16px;width:min(560px,100%);max-height:90vh;display:flex;flex-direction:column;margin:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.06);">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:10px;color:#E8940A;text-transform:uppercase;letter-spacing:2px;">Messagerie</div>
            <h3 style="font-family:Fraunces,serif;font-size:18px;font-weight:700;color:#F8F6F1;margin:4px 0 0;">${escapeHtml(peerName)}</h3>
            <div style="font-size:11px;color:rgba(248,246,241,.4);">${escapeHtml(f['Offre Titre'] || '')}</div>
          </div>
          <button id="wolo-msg-close" style="background:none;border:none;color:rgba(248,246,241,.5);font-size:24px;cursor:pointer;line-height:1;">×</button>
        </div>
        <div id="wolo-msg-list" style="flex:1;min-height:300px;max-height:50vh;overflow-y:auto;padding:16px 20px;background:rgba(0,0,0,.2);">
          <div style="text-align:center;padding:40px 20px;color:rgba(248,246,241,.4);font-size:13px;">Chargement…</div>
        </div>
        ${tmplBtns ? `<div style="display:flex;gap:6px;padding:10px 20px 0;flex-wrap:wrap;">${tmplBtns}</div>` : ''}
        <form id="wolo-msg-form" style="display:flex;gap:8px;padding:14px 20px;border-top:1px solid rgba(255,255,255,.06);">
          <textarea id="wolo-msg-input" placeholder="Écris ton message…" rows="2" style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(232,148,10,.2);color:#F8F6F1;padding:10px 12px;border-radius:10px;font-family:Poppins,sans-serif;font-size:14px;resize:vertical;outline:none;"></textarea>
          <button type="submit" id="wolo-msg-send" style="padding:0 18px;border-radius:10px;background:#E8940A;color:#0f1410;font-weight:700;border:none;cursor:pointer;font-size:13px;">Envoyer</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('wolo-msg-close').addEventListener('click', () => { stopPolling(); close(); });

    // Templates
    overlay.querySelectorAll('[data-tmpl]').forEach(b => {
      b.addEventListener('click', () => {
        const k = b.getAttribute('data-tmpl');
        const t = TEMPLATES[k];
        if (t) document.getElementById('wolo-msg-input').value = t.content;
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
      const list = document.getElementById('wolo-msg-list');
      if (list) list.innerHTML = `<div style="padding:18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#f87171;font-size:13px;">${escapeHtml(e.message)}</div>`;
    }

    // Submit
    document.getElementById('wolo-msg-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const input = document.getElementById('wolo-msg-input');
      const send = document.getElementById('wolo-msg-send');
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

  window.woloMessagerie = { open, close };
})();
