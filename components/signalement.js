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
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:2px;">Signalement</div>
            <h3 style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:#F8F6F1;margin:4px 0 0;">Signaler un problème</h3>
            ${contextLabel ? `<div style="font-size:11px;color:rgba(248,246,241,.4);margin-top:4px;">${escapeHtml(contextLabel)}</div>` : ''}
          </div>
          <button id="wolo-flag-close" style="background:none;border:none;color:rgba(248,246,241,.5);font-size:24px;cursor:pointer;line-height:1;">×</button>
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
      try {
        const body = {
          motif: document.getElementById('flag-motif').value,
          description: document.getElementById('flag-desc').value.trim(),
        };
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
        close();
      } catch (e) {
        window.toast?.(e.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Envoyer le signalement';
      }
    });
  }

  window.woloSignalement = { open, close };
})();
