// ══════════════════════════════════════════
// WOLO Business Suite — Module 4 : Annonces équipe (patron)
// Table Airtable : Annonces_Equipe
// ══════════════════════════════════════════

(function(){
  'use strict';

  var state = { annonces: [] };

  async function loadAnnoncesPatron(){
    var root = document.getElementById('annonces-patron-root');
    if (!root) return;
    root.innerHTML = skeletonHTML();

    if (!window.currentPrestataire?.id) {
      root.innerHTML = `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">Connecte-toi pour diffuser des annonces.</div>`;
      return;
    }

    try {
      const patronId = window.currentPrestataire.id;
      const res = await fetch('/api/airtable-proxy/Annonces_Equipe?filterByFormula=' + encodeURIComponent(`{Patron ID}='${patronId}'`) + '&sort[0][field]=Date&sort[0][direction]=desc');
      state.annonces = res.ok ? ((await res.json()).records || []) : [];
    } catch(e){ console.warn('[annonces] load err', e); }
    render();
  }

  function render(){
    var root = document.getElementById('annonces-patron-root');
    if (!root) return;
    root.innerHTML = `
      <div style="font-family:'Poppins',sans-serif;color:#F8F6F1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;margin:0 0 4px;">Annonces équipe</h1>
            <p style="font-size:13px;color:rgba(248,246,241,.5);margin:0;">Diffuse un message à toute ton équipe. WhatsApp + dashboard employé.</p>
          </div>
          <button onclick="openNouvelleAnnonceModal()" style="background:#E8940A;color:#0f1410;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">+ Nouvelle annonce</button>
        </div>

        ${state.annonces.length === 0 ? emptyHTML() : listHTML()}
      </div>
    `;
  }

  function emptyHTML(){
    return `<div style="background:rgba(232,148,10,.03);border:1px dashed rgba(232,148,10,.2);border-radius:14px;padding:30px;text-align:center;">
      <div style="font-size:40px;opacity:.35;margin-bottom:8px;">📢</div>
      <p style="color:rgba(248,246,241,.5);margin:0;">Aucune annonce diffusée.</p>
    </div>`;
  }

  function listHTML(){
    return `<div style="display:grid;gap:10px;">
      ${state.annonces.map(a => {
        const f = a.fields || {};
        return `<div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:12px;padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${f['Titre'] || 'Annonce'}</div>
              <div style="font-size:12px;color:rgba(248,246,241,.7);line-height:1.5;">${f['Message'] || ''}</div>
            </div>
            <span style="font-size:10px;color:rgba(248,246,241,.4);font-family:'Space Mono',monospace;white-space:nowrap;">${f['Date'] ? new Date(f['Date']).toLocaleDateString('fr-FR') : ''}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;font-size:10px;color:rgba(248,246,241,.45);">
            <span>📤 ${f['Nb destinataires'] || 0} employé(s)</span>
            <span>•</span>
            <span>👁 ${f['Nb lus'] || 0} lu(s)</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function skeletonHTML(){
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.4);">Chargement annonces…</div>`;
  }

  window.openNouvelleAnnonceModal = function(){
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div id="annonce-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">
        <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:16px;padding:24px;max-width:500px;width:100%;font-family:'Poppins',sans-serif;color:#F8F6F1;">
          <h2 style="font-family:'Fraunces',serif;font-size:22px;margin:0 0 16px;">Nouvelle annonce</h2>
          <input id="ann-titre" type="text" placeholder="Titre (ex: Réunion demain 9h)" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-bottom:10px;font-family:inherit;">
          <textarea id="ann-msg" placeholder="Message…" rows="5" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-bottom:14px;font-family:inherit;resize:vertical;"></textarea>
          <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:16px;color:rgba(248,246,241,.7);">
            <input id="ann-wa" type="checkbox" checked> Diffuser aussi par WhatsApp
          </label>
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('annonce-modal-bg').remove()" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(248,246,241,.15);color:#F8F6F1;padding:10px;border-radius:10px;font-weight:600;cursor:pointer;">Annuler</button>
            <button onclick="submitAnnonce()" style="flex:2;background:#E8940A;border:none;color:#0f1410;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;">Diffuser à l'équipe</button>
          </div>
          <div id="ann-status" style="font-size:11px;color:rgba(248,246,241,.55);margin-top:10px;text-align:center;"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  };

  window.submitAnnonce = async function(){
    const titre = document.getElementById('ann-titre')?.value.trim();
    const msg = document.getElementById('ann-msg')?.value.trim();
    const pushWA = document.getElementById('ann-wa')?.checked;
    const statusEl = document.getElementById('ann-status');
    if (!titre || !msg) { if (statusEl) statusEl.textContent = '⚠️ Titre et message requis.'; return; }
    if (statusEl) statusEl.textContent = 'Diffusion…';
    try {
      const res = await fetch('/api/annonces/broadcast', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ patronId: window.currentPrestataire.id, titre, message: msg, whatsapp: pushWA })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      if (statusEl) statusEl.textContent = '✅ Annonce diffusée.';
      setTimeout(() => { document.getElementById('annonce-modal-bg')?.remove(); loadAnnoncesPatron(); }, 1500);
    } catch(e){
      if (statusEl) statusEl.textContent = '❌ ' + e.message + ' (backend en cours)';
    }
  };

  window.loadAnnoncesPatron = loadAnnoncesPatron;
})();
