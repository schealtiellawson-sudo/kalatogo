// ================================================================
// WOLO Entretien — modale planification entretien
// API : window.woloEntretien.open({ candidature, onSaved })
// Endpoint : entretien-upsert (POST), entretien-list (GET)
// ================================================================
(function () {
  const API = (a) => `/api/wolo-pay/${a}`;
  const wFetch = () => window.woloFetch || fetch;

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function close() {
    const m = document.getElementById('wolo-rdv-modal');
    if (m) m.remove();
  }

  function defaultDateTimeLocal() {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function open({ candidature, onSaved }) {
    if (!candidature || !candidature.id) {
      window.toast?.('Candidature invalide', 'error');
      return;
    }
    if (!window.currentUser?.id) {
      window.toast?.('Connecte-toi pour planifier un entretien', 'error');
      return;
    }
    const f = candidature.fields || {};
    const candidatUserId = f['Candidat User ID'] || f['Candidat Supabase ID'] || '';

    close();
    const overlay = document.createElement('div');
    overlay.id = 'wolo-rdv-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.innerHTML = `
      <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:16px;max-width:480px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:10px;color:#E8940A;text-transform:uppercase;letter-spacing:2px;">Planifier entretien</div>
            <h3 style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:#F8F6F1;margin:4px 0 0;">${escapeHtml(f['Candidat Nom'] || 'Candidat')}</h3>
            <div style="font-size:11px;color:rgba(248,246,241,.4);">${escapeHtml(f['Offre Titre'] || '')}</div>
          </div>
          <button id="wolo-rdv-close" style="background:none;border:none;color:rgba(248,246,241,.5);font-size:24px;cursor:pointer;line-height:1;">×</button>
        </div>

        <form id="wolo-rdv-form" style="display:flex;flex-direction:column;gap:14px;font-family:Poppins,sans-serif;font-size:13px;color:#F8F6F1;">
          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:11px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Type</span>
            <select id="rdv-type" style="background:rgba(255,255,255,.05);border:1px solid rgba(232,148,10,.2);color:#F8F6F1;padding:10px;border-radius:8px;outline:none;">
              <option value="presentiel">Présentiel</option>
              <option value="visio">Visio</option>
              <option value="telephone">Téléphone</option>
            </select>
          </label>

          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:11px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Date et heure</span>
            <input type="datetime-local" id="rdv-date" required value="${defaultDateTimeLocal()}" style="background:rgba(255,255,255,.05);border:1px solid rgba(232,148,10,.2);color:#F8F6F1;padding:10px;border-radius:8px;outline:none;font-family:Poppins,sans-serif;">
          </label>

          <div id="rdv-location-wrap">
            <label style="display:flex;flex-direction:column;gap:6px;">
              <span id="rdv-location-label" style="font-size:11px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Lieu</span>
              <input type="text" id="rdv-location" placeholder="Adresse / quartier" style="background:rgba(255,255,255,.05);border:1px solid rgba(232,148,10,.2);color:#F8F6F1;padding:10px;border-radius:8px;outline:none;font-family:Poppins,sans-serif;">
            </label>
          </div>

          <div style="display:flex;gap:10px;margin-top:6px;">
            <button type="button" id="wolo-rdv-cancel" style="flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,.06);color:#F8F6F1;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-weight:600;">Annuler</button>
            <button type="submit" id="wolo-rdv-save" style="flex:2;padding:12px;border-radius:10px;background:#E8940A;color:#0f1410;border:none;cursor:pointer;font-weight:700;">Planifier</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const typeSel = document.getElementById('rdv-type');
    const locLabel = document.getElementById('rdv-location-label');
    const locInput = document.getElementById('rdv-location');
    typeSel.addEventListener('change', () => {
      const t = typeSel.value;
      if (t === 'presentiel') { locLabel.textContent = 'Lieu'; locInput.placeholder = 'Adresse / quartier'; }
      else if (t === 'visio') { locLabel.textContent = 'Lien visio'; locInput.placeholder = 'https://meet.google.com/…'; }
      else { locLabel.textContent = 'Numéro à appeler'; locInput.placeholder = '+228 9X XX XX XX'; }
    });

    document.getElementById('wolo-rdv-close').addEventListener('click', close);
    document.getElementById('wolo-rdv-cancel').addEventListener('click', close);

    document.getElementById('wolo-rdv-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!candidatUserId) {
        window.toast?.('Candidat sans compte Supabase. Contacte-le par WhatsApp.', 'error');
        return;
      }
      const btn = document.getElementById('wolo-rdv-save');
      btn.disabled = true; btn.textContent = '…';
      const type = typeSel.value;
      const date = document.getElementById('rdv-date').value;
      const loc = locInput.value.trim();

      const body = {
        candidature_airtable_id: candidature.id,
        candidat_user_id: candidatUserId,
        offre_titre: f['Offre Titre'] || '',
        type,
        date_heure: new Date(date).toISOString(),
      };
      if (type === 'presentiel') body.lieu = loc;
      else if (type === 'visio') body.lien_visio = loc;
      else body.telephone = loc;

      try {
        const res = await wFetch()(API('entretien-upsert'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Erreur planification');
        window.toast?.('Entretien planifié ✓', 'success');
        notifyCandidat(candidature, body).catch(() => {});
        close();
        if (typeof onSaved === 'function') onSaved(data.entretien);
      } catch (e) {
        window.toast?.(e.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Planifier';
      }
    });
  }

  // Pousse une notif candidat via le mécanisme Prestataires.Notifications JSON existant
  async function notifyCandidat(candidature, body) {
    const fn = typeof window.notifyCandidatEntretien === 'function' ? window.notifyCandidatEntretien : null;
    if (fn) { try { await fn(candidature, body); } catch {} }
  }

  window.woloEntretien = { open, close };
})();
