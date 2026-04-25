// ================================================================
// WOLO Signalement — modale signalement arnaque/ghosting/etc.
// API : window.woloSignalement.open({ targetUserId?, offreId?, candidatureId?, contextLabel? })
// Endpoint : signalement-create (POST)
// ================================================================
(function () {
  const API = (a) => `/api/wolo-pay/${a}`;
  const wFetch = () => window.woloFetch || fetch;

  const MOTIFS = [
    { v: 'arnaque',     l: '💸 Arnaque (paiement demandé, faux poste)' },
    { v: 'ghosting',    l: '👻 Ghosting (aucune réponse depuis longtemps)' },
    { v: 'fake_offre',  l: '🚩 Fausse offre (poste inexistant)' },
    { v: 'harcelement', l: '⚠️ Harcèlement / propos déplacés' },
    { v: 'autre',       l: '📝 Autre' },
  ];

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function close() {
    const m = document.getElementById('wolo-flag-modal');
    if (m) m.remove();
  }

  function open({ targetUserId, offreId, candidatureId, contextLabel } = {}) {
    if (!window.currentUser?.id) {
      window.toast?.('Connecte-toi pour signaler', 'error');
      return;
    }
    if (!targetUserId && !offreId && !candidatureId) {
      window.toast?.('Cible de signalement manquante', 'error');
      return;
    }
    close();
    const overlay = document.createElement('div');
    overlay.id = 'wolo-flag-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.innerHTML = `
      <div style="background:#0f1410;border:1px solid rgba(239,68,68,.4);border-radius:16px;max-width:460px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:2px;">Signalement</div>
            <h3 style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:#F8F6F1;margin:4px 0 0;">Signaler un problème</h3>
            ${contextLabel ? `<div style="font-size:11px;color:rgba(248,246,241,.4);margin-top:4px;">${escapeHtml(contextLabel)}</div>` : ''}
          </div>
          <button id="wolo-flag-close" style="background:none;border:none;color:rgba(248,246,241,.5);font-size:24px;cursor:pointer;line-height:1;">×</button>
        </div>
        <div style="text-align:right;margin-bottom:14px;">
          <button type="button" onclick="window.woloSignalement.openHistory()" style="background:rgba(255,255,255,.05);color:rgba(248,246,241,.7);border:1px solid rgba(255,255,255,.1);padding:5px 11px;border-radius:8px;font-size:11px;cursor:pointer;">📋 Mes signalements précédents</button>
        </div>

        <form id="wolo-flag-form" style="display:flex;flex-direction:column;gap:14px;font-family:Poppins,sans-serif;font-size:13px;color:#F8F6F1;">
          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:11px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Motif</span>
            <select id="flag-motif" required style="background:rgba(255,255,255,.05);border:1px solid rgba(239,68,68,.25);color:#F8F6F1;padding:10px;border-radius:8px;outline:none;">
              ${MOTIFS.map(m => `<option value="${m.v}">${m.l}</option>`).join('')}
            </select>
          </label>

          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:11px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Description (facultatif)</span>
            <textarea id="flag-desc" rows="4" maxlength="2000" placeholder="Donne le plus de détails possible…" style="background:rgba(255,255,255,.05);border:1px solid rgba(239,68,68,.25);color:#F8F6F1;padding:10px;border-radius:8px;outline:none;font-family:Poppins,sans-serif;resize:vertical;"></textarea>
          </label>

          <div style="font-size:11px;color:rgba(248,246,241,.45);background:rgba(255,255,255,.03);padding:10px;border-radius:8px;">
            On reçoit ton signalement, on l'examine, et on protège la communauté. Ton identité reste confidentielle.
          </div>

          <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:rgba(248,246,241,.65);cursor:pointer;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.2);padding:10px;border-radius:8px;">
            <input type="checkbox" id="flag-mediation" style="accent-color:#c084fc;margin-top:2px;flex-shrink:0;">
            <span><strong style="color:#c084fc;">🤖 Demander aussi une analyse IA</strong> — un médiateur IA analyse la situation et te propose 3 étapes de résolution + 2 messages-types prêts à envoyer. Gratuit (1 requête sur ton quota).</span>
          </label>

          <div style="display:flex;gap:10px;">
            <button type="button" id="wolo-flag-cancel" style="flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,.06);color:#F8F6F1;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-weight:600;">Annuler</button>
            <button type="submit" id="wolo-flag-send" style="flex:2;padding:12px;border-radius:10px;background:#dc2626;color:#fff;border:none;cursor:pointer;font-weight:700;">Envoyer le signalement</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('wolo-flag-close').addEventListener('click', close);
    document.getElementById('wolo-flag-cancel').addEventListener('click', close);

    document.getElementById('wolo-flag-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = document.getElementById('wolo-flag-send');
      btn.disabled = true; btn.textContent = '…';
      const motif = document.getElementById('flag-motif').value;
      const desc = document.getElementById('flag-desc').value.trim();
      const wantMediation = document.getElementById('flag-mediation')?.checked;
      try {
        const body = { motif, description: desc };
        if (targetUserId) body.target_user_id = targetUserId;
        if (offreId) body.target_offre_airtable_id = offreId;
        if (candidatureId) body.target_candidature_airtable_id = candidatureId;

        const res = await wFetch()(API('signalement-create'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Erreur envoi');
        window.toast?.('Signalement enregistré. Merci.', 'success');

        if (wantMediation) {
          await runMediation({ motif, desc, contextLabel });
          // close() est appelé depuis runMediation après l'affichage, ne pas fermer ici
        } else {
          close();
        }
      } catch (e) {
        window.toast?.(e.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Envoyer le signalement';
      }
    });
  }

  // Lance l'IA mediation et remplace le contenu du modal par le résultat
  async function runMediation({ motif, desc, contextLabel }) {
    const overlay = document.getElementById('wolo-flag-modal');
    if (!overlay) return;
    const card = overlay.querySelector('div');
    card.innerHTML = `
      <div style="text-align:center;padding:40px 20px;font-family:Poppins,sans-serif;">
        <div style="display:inline-block;width:32px;height:32px;border:3px solid rgba(168,85,247,.2);border-top-color:#c084fc;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <div style="margin-top:14px;color:rgba(248,246,241,.6);font-size:13px;">🤖 Le médiateur IA analyse ta situation…</div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
    try {
      const input = `Contexte : ${contextLabel || '—'}
Motif signalé : ${motif}
Description par le plaignant : ${desc || '(non précisée)'}

Tu dois répondre UNIQUEMENT en JSON valide. Si tu manques de contexte, propose néanmoins une médiation neutre basée sur le motif.`;
      const plan = window.currentPrestataire?.fields?.['Abonnement'] === 'Pro' ? 'pro' : 'gratuit';
      const res = await wFetch()(API('ai-query'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'mediation', input, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      renderMediation(card, data.result || {});
    } catch (e) {
      card.innerHTML = `
        <div style="font-family:Poppins,sans-serif;color:#F8F6F1;">
          <div style="padding:18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#f87171;font-size:13px;">
            Médiation IA indisponible : ${escapeHtml(e.message)}
          </div>
          <div style="text-align:center;margin-top:16px;">
            <button onclick="document.getElementById('wolo-flag-modal').remove()" style="padding:10px 22px;border-radius:10px;background:rgba(255,255,255,.06);color:#F8F6F1;border:1px solid rgba(255,255,255,.15);cursor:pointer;">Fermer</button>
          </div>
        </div>
      `;
    }
  }

  function renderMediation(card, r) {
    const tortLabel = {
      candidat: 'Plutôt côté candidat',
      employeur: 'Plutôt côté employeur',
      les_deux: 'Les deux parties',
      aucun: 'Aucun tort manifeste',
    }[r.torts_probables] || '—';
    const etapes = Array.isArray(r.etapes) ? r.etapes : [];
    const copyMsg = (id) => `(()=>{const el=document.getElementById('${id}');if(el){navigator.clipboard.writeText(el.textContent);window.toast&&window.toast('Message copié',\\'success\\');}})()`;

    card.innerHTML = `
      <div style="font-family:Poppins,sans-serif;color:#F8F6F1;max-height:80vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:10px;color:#c084fc;text-transform:uppercase;letter-spacing:2px;">Médiation IA</div>
            <h3 style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:#F8F6F1;margin:4px 0 0;">Plan de résolution</h3>
          </div>
          <button onclick="document.getElementById('wolo-flag-modal').remove()" style="background:none;border:none;color:rgba(248,246,241,.5);font-size:24px;cursor:pointer;line-height:1;">×</button>
        </div>

        ${r.resume_litige ? `
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="font-size:11px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Résumé du litige</div>
            <div style="font-size:13px;">${escapeHtml(r.resume_litige)}</div>
            <div style="margin-top:6px;font-size:11px;color:#c084fc;">Tort probable : <strong>${tortLabel}</strong></div>
          </div>
        ` : ''}

        ${etapes.length ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:#E8940A;font-weight:700;margin-bottom:8px;">Étapes proposées</div>
            ${etapes.map((e, i) => `
              <div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;">
                <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:rgba(232,148,10,.2);color:#E8940A;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;">${i+1}</div>
                <div style="font-size:13px;line-height:1.55;">${escapeHtml(e)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${r.message_candidat ? `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div style="font-size:12px;color:#60a5fa;font-weight:700;">Message à envoyer côté candidat</div>
              <button onclick="${copyMsg('mediation-msg-cand')}" style="background:rgba(96,165,250,.12);color:#60a5fa;border:none;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;">Copier</button>
            </div>
            <div id="mediation-msg-cand" style="background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2);border-radius:8px;padding:10px;font-size:13px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(r.message_candidat)}</div>
          </div>
        ` : ''}

        ${r.message_employeur ? `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div style="font-size:12px;color:#22c55e;font-weight:700;">Message à envoyer côté employeur</div>
              <button onclick="${copyMsg('mediation-msg-emp')}" style="background:rgba(34,197,94,.12);color:#22c55e;border:none;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;">Copier</button>
            </div>
            <div id="mediation-msg-emp" style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:8px;padding:10px;font-size:13px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(r.message_employeur)}</div>
          </div>
        ` : ''}

        <div style="text-align:center;margin-top:16px;font-size:11px;color:rgba(248,246,241,.4);">L'IA propose, tu décides. Cette médiation n'engage pas WOLO Market.</div>

        <div style="display:flex;gap:8px;margin-top:14px;">
          <button onclick="document.getElementById('wolo-flag-modal').remove()" style="flex:1;padding:11px;border-radius:10px;background:rgba(255,255,255,.06);color:#F8F6F1;border:1px solid rgba(255,255,255,.15);cursor:pointer;font-weight:600;">Fermer</button>
        </div>
      </div>
    `;
  }

  // ----------------------------------------------------------------
  // HISTORIQUE — Mes signalements
  // ----------------------------------------------------------------
  const STATUT_BADGE = {
    nouveau:  { label: 'Nouveau',  bg: 'rgba(232,148,10,.15)', color: '#E8940A' },
    en_cours: { label: 'En cours', bg: 'rgba(96,165,250,.15)', color: '#60a5fa' },
    resolu:   { label: 'Résolu',   bg: 'rgba(34,197,94,.15)',  color: '#22c55e' },
    rejete:   { label: 'Rejeté',   bg: 'rgba(255,255,255,.06)', color: 'rgba(248,246,241,.5)' },
  };
  const MOTIF_LABEL = {
    arnaque: '💸 Arnaque', ghosting: '👻 Ghosting', fake_offre: '🚩 Fausse offre',
    harcelement: '⚠️ Harcèlement', autre: '📝 Autre',
  };

  async function openHistory() {
    if (!window.currentUser?.id) {
      window.toast?.('Connecte-toi pour voir tes signalements', 'error');
      return;
    }
    close();
    const overlay = document.createElement('div');
    overlay.id = 'wolo-flag-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.innerHTML = `
      <div style="background:#0f1410;border:1px solid rgba(232,148,10,.25);border-radius:16px;max-width:560px;width:100%;padding:24px;max-height:85vh;overflow-y:auto;font-family:Poppins,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:10px;color:#E8940A;text-transform:uppercase;letter-spacing:2px;">Historique</div>
            <h3 style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:#F8F6F1;margin:4px 0 0;">Mes signalements</h3>
          </div>
          <button onclick="document.getElementById('wolo-flag-modal').remove()" style="background:none;border:none;color:rgba(248,246,241,.5);font-size:24px;cursor:pointer;line-height:1;">×</button>
        </div>
        <div id="wolo-flag-list">
          <div style="text-align:center;padding:30px;color:rgba(248,246,241,.4);font-size:13px;">Chargement…</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    try {
      const res = await wFetch()(API('signalement-list'));
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur chargement');
      const list = data.signalements || [];
      const container = document.getElementById('wolo-flag-list');
      if (!container) return;
      if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:rgba(248,246,241,.5);font-size:13px;">
          <div style="font-size:36px;margin-bottom:10px;">✓</div>
          Tu n'as fait aucun signalement. Reste vigilant.
        </div>`;
        return;
      }
      container.innerHTML = list.map(s => {
        const st = STATUT_BADGE[s.statut] || STATUT_BADGE.nouveau;
        const date = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '—';
        const target = s.target_offre_airtable_id ? 'Offre' : s.target_candidature_airtable_id ? 'Candidature' : 'Profil';
        return `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(232,148,10,.1);border-radius:12px;padding:14px;margin-bottom:10px;color:#F8F6F1;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-weight:700;font-size:14px;">${MOTIF_LABEL[s.motif] || s.motif}</div>
            <span style="padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${st.bg};color:${st.color};">${st.label}</span>
          </div>
          <div style="font-size:11px;color:rgba(248,246,241,.45);margin-bottom:8px;">${target} · ${date}</div>
          ${s.description ? `<div style="font-size:12px;color:rgba(248,246,241,.7);line-height:1.5;background:rgba(0,0,0,.2);padding:8px 10px;border-radius:6px;">${escapeHtml(s.description)}</div>` : ''}
          ${s.mediation_result ? `<div style="margin-top:8px;font-size:11px;color:#c084fc;">🤖 Médiation IA disponible</div>` : ''}
        </div>`;
      }).join('');
    } catch (e) {
      const c = document.getElementById('wolo-flag-list');
      if (c) c.innerHTML = `<div style="padding:18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#f87171;font-size:13px;">${escapeHtml(e.message)}</div>`;
    }
  }

  window.woloSignalement = { open, openHistory, close };
})();
