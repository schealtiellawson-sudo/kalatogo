// ══════════════════════════════════════════
// WOLO Business Suite — Module 1 : Équipe & Invitation
// Table Airtable : Employes + Invitations_Employes
// ══════════════════════════════════════════

(function(){
  'use strict';

  var state = { employes: [], invitations: [], loading: false };

  async function loadEquipeDashboard(){
    var root = document.getElementById('equipe-dashboard-root');
    if (!root) return;
    root.innerHTML = skeletonHTML();

    if (!window.currentPrestataire?.id) {
      root.innerHTML = connectFirstHTML();
      return;
    }

    state.loading = true;
    try {
      const patronId = window.currentPrestataire.id;
      // Fetch employés + invitations en parallèle
      const [empRes, invRes] = await Promise.all([
        fetch('/api/airtable-proxy/Employes?filterByFormula=' + encodeURIComponent(`{Patron ID}='${patronId}'`)).catch(()=>({ok:false})),
        fetch('/api/airtable-proxy/Invitations_Employes?filterByFormula=' + encodeURIComponent(`{Patron ID}='${patronId}'`)).catch(()=>({ok:false}))
      ]);
      state.employes = empRes.ok ? ((await empRes.json()).records || []) : [];
      state.invitations = invRes.ok ? ((await invRes.json()).records || []) : [];
    } catch(e){ console.warn('[equipe] load err', e); }
    state.loading = false;
    render();
  }

  function render(){
    var root = document.getElementById('equipe-dashboard-root');
    if (!root) return;

    const totalEmp = state.employes.length;
    const actifs = state.employes.filter(e => e.fields?.['Statut'] === 'Actif').length;
    const invPendantes = state.invitations.filter(i => i.fields?.['Statut'] === 'Envoyée').length;

    root.innerHTML = `
      <div style="font-family:'Poppins',sans-serif;color:#F8F6F1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;margin:0 0 4px;">Mon équipe</h1>
            <p style="font-size:13px;color:rgba(248,246,241,.5);margin:0;">Gère tes employés. Invite, paye, communique — tout en un seul lieu.</p>
          </div>
          <button onclick="openInviteEmployeModal()" style="background:#E8940A;color:#0f1410;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">+ Inviter un employé</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;">
          ${kpiCard('Total équipe', totalEmp, '#E8940A')}
          ${kpiCard('Actifs', actifs, '#22c55e')}
          ${kpiCard('Invitations en attente', invPendantes, '#3b82f6')}
        </div>

        ${totalEmp === 0 && invPendantes === 0 ? emptyStateHTML() : employesListHTML()}

        ${invPendantes > 0 ? invitationsListHTML() : ''}
      </div>
    `;
  }

  function kpiCard(label, val, color){
    return `<div style="background:rgba(232,148,10,.05);border:1px solid rgba(232,148,10,.15);border-radius:12px;padding:14px;text-align:center;">
      <div style="font-family:'Space Mono',monospace;font-size:26px;font-weight:900;color:${color};line-height:1;">${val}</div>
      <div style="font-size:10px;color:rgba(248,246,241,.45);text-transform:uppercase;letter-spacing:1px;margin-top:6px;">${label}</div>
    </div>`;
  }

  function emptyStateHTML(){
    return `<div style="background:rgba(232,148,10,.03);border:1px dashed rgba(232,148,10,.2);border-radius:14px;padding:40px 20px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;opacity:.4;">👥</div>
      <h3 style="font-family:'Fraunces',serif;font-size:20px;margin:0 0 8px;">Pas encore d'équipe.</h3>
      <p style="font-size:13px;color:rgba(248,246,241,.55);max-width:420px;margin:0 auto 20px;">Invite un premier employé. Il recevra un lien sur WhatsApp, créera son compte WOLO, et apparaîtra ici.</p>
      <button onclick="openInviteEmployeModal()" style="background:#E8940A;color:#0f1410;border:none;padding:10px 24px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">+ Inviter mon premier employé</button>
    </div>`;
  }

  function employesListHTML(){
    if (!state.employes.length) return '';
    return `<div style="margin-bottom:24px;">
      <h3 style="font-family:'Fraunces',serif;font-size:18px;margin:0 0 12px;">Équipe active</h3>
      <div style="display:grid;gap:10px;">
        ${state.employes.map(e => employeCardHTML(e)).join('')}
      </div>
    </div>`;
  }

  function employeCardHTML(emp){
    const f = emp.fields || {};
    const nom = f['Nom complet'] || 'Sans nom';
    const poste = f['Poste'] || '—';
    const statut = f['Statut'] || 'En attente';
    const photo = f['Photo'] || '';
    const salaire = f['Salaire FCFA'] || 0;
    return `<div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:12px;padding:14px;display:flex;align-items:center;gap:14px;">
      <div style="width:48px;height:48px;border-radius:50%;background:${photo ? 'url('+photo+') center/cover' : 'rgba(232,148,10,.15)'};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:14px;">${nom}</div>
        <div style="font-size:12px;color:rgba(248,246,241,.55);">${poste}${salaire ? ' · ' + Number(salaire).toLocaleString('fr-FR') + ' FCFA/mois' : ''}</div>
      </div>
      <span style="background:rgba(34,197,94,.12);color:#22c55e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.5px;">${statut}</span>
      <button onclick="openEmployeDetail('${emp.id}')" style="background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);color:#F8F6F1;padding:6px 10px;border-radius:8px;font-size:11px;cursor:pointer;">Détail</button>
    </div>`;
  }

  function invitationsListHTML(){
    return `<div>
      <h3 style="font-family:'Fraunces',serif;font-size:18px;margin:0 0 12px;">Invitations en cours</h3>
      <div style="display:grid;gap:10px;">
        ${state.invitations.filter(i => i.fields?.['Statut'] === 'Envoyée').map(i => {
          const f = i.fields || {};
          return `<div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:12px;padding:12px;display:flex;align-items:center;gap:14px;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">${f['Nom prévu'] || 'Employé'}</div>
              <div style="font-size:11px;color:rgba(248,246,241,.5);">${f['WhatsApp'] || ''} · ${f['Poste prévu'] || '—'}</div>
            </div>
            <span style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.5px;">En attente</span>
            <button onclick="resendInvitation('${i.id}')" style="background:rgba(255,255,255,.06);border:1px solid rgba(59,130,246,.25);color:#F8F6F1;padding:6px 10px;border-radius:8px;font-size:11px;cursor:pointer;">Relancer</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  function skeletonHTML(){
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.4);font-family:'Poppins',sans-serif;">Chargement de ton équipe…</div>`;
  }

  function connectFirstHTML(){
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);font-family:'Poppins',sans-serif;">
      <p>Connecte-toi pour voir ton équipe.</p>
    </div>`;
  }

  // ── Modale d'invitation ──
  window.openInviteEmployeModal = function(){
    const modal = document.createElement('div');
    modal.id = 'invite-employe-modal';
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)closeInviteEmployeModal()">
        <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:16px;padding:24px;max-width:460px;width:100%;font-family:'Poppins',sans-serif;color:#F8F6F1;">
          <h2 style="font-family:'Fraunces',serif;font-size:22px;margin:0 0 6px;">Inviter un employé</h2>
          <p style="font-size:12px;color:rgba(248,246,241,.55);margin:0 0 20px;">Il recevra un lien WhatsApp pour créer son compte WOLO et être relié à toi.</p>

          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Nom complet</label>
          <input id="inv-nom" type="text" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;" placeholder="Ex : Kossi Afedzi">

          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">WhatsApp (format international)</label>
          <input id="inv-wa" type="text" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;" placeholder="+228 9X XX XX XX">

          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Poste</label>
          <input id="inv-poste" type="text" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;" placeholder="Ex : Couturière senior">

          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Salaire mensuel (FCFA, optionnel)</label>
          <input id="inv-salaire" type="number" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;" placeholder="50000">

          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">IBAN / RIB (pour virement salaire)</label>
          <input id="inv-iban" type="text" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:20px;font-family:inherit;font-family:'Space Mono',monospace;letter-spacing:1px;" placeholder="BJ000 0000 0000 0000 0000">

          <div style="display:flex;gap:10px;">
            <button onclick="closeInviteEmployeModal()" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(248,246,241,.15);color:#F8F6F1;padding:10px;border-radius:10px;font-weight:600;cursor:pointer;">Annuler</button>
            <button onclick="submitInviteEmploye()" style="flex:2;background:#E8940A;border:none;color:#0f1410;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;">Envoyer l'invitation WhatsApp</button>
          </div>
          <div id="inv-status" style="font-size:11px;color:rgba(248,246,241,.55);margin-top:10px;text-align:center;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window.closeInviteEmployeModal = function(){
    document.getElementById('invite-employe-modal')?.remove();
  };

  window.submitInviteEmploye = async function(){
    const nom = document.getElementById('inv-nom')?.value.trim();
    const wa = document.getElementById('inv-wa')?.value.trim();
    const poste = document.getElementById('inv-poste')?.value.trim();
    const salaire = parseInt(document.getElementById('inv-salaire')?.value || '0') || 0;
    const iban = document.getElementById('inv-iban')?.value.trim();
    const statusEl = document.getElementById('inv-status');

    if (!nom || !wa || !poste) {
      if (statusEl) statusEl.textContent = '⚠️ Remplis nom, WhatsApp et poste au minimum.';
      return;
    }

    if (statusEl) statusEl.textContent = 'Génération du lien…';

    try {
      const patronId = window.currentPrestataire?.id;
      const patronNom = window.currentPrestataire?.fields?.['Nom complet'] || 'Ton patron';
      const wFetch = window.woloFetch || fetch;
      const res = await wFetch('/api/wolo-pay/invitation-create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          patronId, patronNom,
          nomPrevu: nom, whatsapp: wa, postePrevu: poste,
          salairePrevu: salaire, iban: iban
        })
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error || 'Erreur serveur');

      const inviteUrl = window.location.origin + '/invite.html?token=' + data.token;
      const message = encodeURIComponent(
        `Bonjour ${nom}, c'est ${patronNom}.\n\n` +
        `Je t'invite à rejoindre mon équipe sur WOLO Market comme ${poste}.\n` +
        `Clique pour créer ton compte (2 minutes) :\n${inviteUrl}\n\n` +
        `À très vite !`
      );
      const waLink = `https://wa.me/${wa.replace(/\D/g,'')}?text=${message}`;
      window.open(waLink, '_blank');
      if (statusEl) statusEl.textContent = '✅ Lien WhatsApp ouvert. Ferme cette fenêtre.';
      setTimeout(() => { closeInviteEmployeModal(); loadEquipeDashboard(); }, 2000);
    } catch(e){
      if (statusEl) statusEl.textContent = '❌ ' + e.message;
    }
  };

  window.resendInvitation = function(invId){
    const inv = state.invitations.find(i => i.id === invId);
    if (!inv) return;
    const f = inv.fields || {};
    const token = f['Token'] || '';
    if (!token) return alert('Token manquant pour cette invitation.');
    const inviteUrl = window.location.origin + '/invite.html?token=' + token;
    const message = encodeURIComponent(
      `Bonjour ${f['Nom prévu']}, je relance mon invitation WOLO Market.\n\n` +
      `Ton lien :\n${inviteUrl}\n\n` +
      `Merci !`
    );
    const waLink = `https://wa.me/${(f['WhatsApp']||'').replace(/\D/g,'')}?text=${message}`;
    window.open(waLink, '_blank');
  };

  window.openEmployeDetail = function(empId){
    const emp = state.employes.find(e => e.id === empId);
    if (!emp) return;
    const f = emp.fields || {};
    const modal = document.createElement('div');
    modal.id = 'employe-detail-modal';
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)document.getElementById('employe-detail-modal')?.remove()">
        <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:16px;padding:24px;max-width:460px;width:100%;font-family:'Poppins',sans-serif;color:#F8F6F1;">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
            <div style="width:56px;height:56px;border-radius:50%;background:${f['Photo'] ? 'url('+f['Photo']+') center/cover' : 'rgba(232,148,10,.15)'};flex-shrink:0;"></div>
            <div>
              <h2 style="font-family:'Fraunces',serif;font-size:20px;margin:0;">${f['Nom complet'] || 'Employé'}</h2>
              <p style="font-size:12px;color:rgba(248,246,241,.5);margin:2px 0 0;">${f['Poste'] || '—'}${f['Salaire FCFA'] ? ' · ' + Number(f['Salaire FCFA']).toLocaleString('fr-FR') + ' FCFA/mois' : ''}</p>
            </div>
          </div>

          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">IBAN / RIB</label>
          <input id="emp-iban" type="text" value="${f['IBAN'] || ''}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:'Space Mono',monospace;letter-spacing:1px;" placeholder="BJ000 0000 0000 0000 0000">

          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Salaire mensuel (FCFA)</label>
          <input id="emp-salaire" type="number" value="${f['Salaire FCFA'] || ''}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:20px;font-family:inherit;" placeholder="50000">

          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('employe-detail-modal')?.remove()" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(248,246,241,.15);color:#F8F6F1;padding:10px;border-radius:10px;font-weight:600;cursor:pointer;">Fermer</button>
            <button onclick="saveEmployeDetail('${empId}')" style="flex:2;background:#E8940A;border:none;color:#0f1410;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;">Enregistrer</button>
          </div>
          <div id="emp-detail-status" style="font-size:11px;color:rgba(248,246,241,.55);margin-top:10px;text-align:center;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window.saveEmployeDetail = async function(empId){
    const iban = document.getElementById('emp-iban')?.value.trim();
    const salaire = parseInt(document.getElementById('emp-salaire')?.value || '0') || 0;
    const statusEl = document.getElementById('emp-detail-status');
    if (statusEl) statusEl.textContent = 'Enregistrement…';
    try {
      const res = await fetch('/api/airtable-proxy/Employes/' + empId, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ fields: { 'IBAN': iban, 'Salaire FCFA': salaire } })
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      if (statusEl) statusEl.textContent = '✅ Enregistré.';
      setTimeout(() => { document.getElementById('employe-detail-modal')?.remove(); loadEquipeDashboard(); }, 1000);
    } catch(e){
      if (statusEl) statusEl.textContent = '❌ ' + e.message;
    }
  };

  window.loadEquipeDashboard = loadEquipeDashboard;
})();
