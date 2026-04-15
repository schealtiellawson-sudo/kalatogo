// ══════════════════════════════════════════
// WOLO Business Suite — Module 3 : Mon emploi (vue employé)
// Tables Airtable : Employes + Fiches_Paie + Paiements_Salaire + Annonces_Equipe
// ══════════════════════════════════════════

(function(){
  'use strict';

  var state = { employe: null, fiches: [], paiements: [], annonces: [] };

  async function loadMonEmploi(){
    var root = document.getElementById('mon-emploi-root');
    if (!root) return;
    root.innerHTML = skeletonHTML();

    if (!window.currentPrestataire?.id) {
      root.innerHTML = `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">Connecte-toi pour voir ton emploi.</div>`;
      return;
    }

    try {
      const userId = window.currentPrestataire.id;
      // Cherche fiche employé liée à ce user
      const empRes = await fetch('/api/airtable-proxy/Employes?filterByFormula=' + encodeURIComponent(`{User ID}='${userId}'`));
      const empData = empRes.ok ? await empRes.json() : { records: [] };
      state.employe = empData.records?.[0] || null;

      if (!state.employe) {
        root.innerHTML = noEmployeHTML();
        return;
      }

      const empId = state.employe.id;
      const patronId = state.employe.fields?.['Patron ID'] || '';

      const [fichesRes, paysRes, annRes] = await Promise.all([
        fetch('/api/airtable-proxy/Fiches_Paie?filterByFormula=' + encodeURIComponent(`{Employe ID}='${empId}'`) + '&sort[0][field]=Mois&sort[0][direction]=desc').catch(()=>({ok:false})),
        fetch('/api/airtable-proxy/Paiements_Salaire?filterByFormula=' + encodeURIComponent(`{Employe ID}='${empId}'`) + '&sort[0][field]=Date&sort[0][direction]=desc').catch(()=>({ok:false})),
        fetch('/api/airtable-proxy/Annonces_Equipe?filterByFormula=' + encodeURIComponent(`{Patron ID}='${patronId}'`) + '&sort[0][field]=Date&sort[0][direction]=desc').catch(()=>({ok:false}))
      ]);
      state.fiches = fichesRes.ok ? ((await fichesRes.json()).records || []) : [];
      state.paiements = paysRes.ok ? ((await paysRes.json()).records || []) : [];
      state.annonces = annRes.ok ? ((await annRes.json()).records || []) : [];
    } catch(e){ console.warn('[mon-emploi] load err', e); }
    render();
  }

  function render(){
    var root = document.getElementById('mon-emploi-root');
    if (!root || !state.employe) return;

    const f = state.employe.fields || {};
    const nom = f['Nom complet'] || '—';
    const poste = f['Poste'] || '—';
    const salaire = parseInt(f['Salaire FCFA'])||0;
    const patronNom = f['Patron Nom'] || 'Mon patron';

    const totalPaye = state.paiements.reduce((s,p)=> s + (parseInt(p.fields?.['Montant FCFA'])||0), 0);
    const dernierMois = state.paiements[0]?.fields?.['Mois'] || '—';

    root.innerHTML = `
      <div style="font-family:'Poppins',sans-serif;color:#F8F6F1;">
        <div style="margin-bottom:20px;">
          <h1 style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;margin:0 0 4px;">Mon emploi</h1>
          <p style="font-size:13px;color:rgba(248,246,241,.5);margin:0;">${poste} chez <strong>${patronNom}</strong></p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px;">
          ${kpiCard('Salaire mensuel', formatFCFA(salaire), '#E8940A')}
          ${kpiCard('Total perçu', formatFCFA(totalPaye), '#22c55e')}
          ${kpiCard('Dernier paiement', dernierMois, '#3b82f6')}
          ${kpiCard('Bulletins', state.fiches.length, '#a855f7')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <h3 style="font-family:'Fraunces',serif;font-size:18px;margin:0 0 12px;">Mes bulletins</h3>
            ${state.fiches.length === 0 ? emptyMini('Aucun bulletin pour le moment.') : fichesListHTML()}
          </div>
          <div>
            <h3 style="font-family:'Fraunces',serif;font-size:18px;margin:0 0 12px;">Annonces de l'équipe</h3>
            ${state.annonces.length === 0 ? emptyMini('Aucune annonce.') : annoncesListHTML()}
          </div>
        </div>
      </div>
    `;
  }

  function fichesListHTML(){
    return `<div style="display:grid;gap:8px;">
      ${state.fiches.map(fi => {
        const f = fi.fields || {};
        return `<div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;font-size:13px;">${f['Mois'] || '—'}</div>
            <div style="font-size:11px;color:rgba(248,246,241,.55);font-family:'Space Mono',monospace;">${formatFCFA(f['Net FCFA'] || f['Salaire FCFA'] || 0)}</div>
          </div>
          <button onclick="window.open('/api/wolo-pay/paie-bulletin?id=${encodeURIComponent(fi.id)}','_blank')" style="background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);color:#F8F6F1;padding:6px 10px;border-radius:8px;font-size:11px;cursor:pointer;">📄 PDF</button>
        </div>`;
      }).join('')}
    </div>`;
  }

  function annoncesListHTML(){
    return `<div style="display:grid;gap:8px;">
      ${state.annonces.slice(0,5).map(a => {
        const f = a.fields || {};
        return `<div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:10px;padding:12px;">
          <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">
            <div style="font-weight:700;font-size:13px;">${f['Titre'] || 'Annonce'}</div>
            <span style="font-size:10px;color:rgba(248,246,241,.4);font-family:'Space Mono',monospace;white-space:nowrap;">${f['Date'] ? new Date(f['Date']).toLocaleDateString('fr-FR') : ''}</span>
          </div>
          <div style="font-size:12px;color:rgba(248,246,241,.7);line-height:1.4;">${f['Message'] || ''}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function emptyMini(msg){
    return `<div style="background:rgba(232,148,10,.03);border:1px dashed rgba(232,148,10,.2);border-radius:10px;padding:20px;text-align:center;font-size:12px;color:rgba(248,246,241,.5);">${msg}</div>`;
  }

  function noEmployeHTML(){
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.55);font-family:'Poppins',sans-serif;">
      <div style="font-size:48px;opacity:.4;margin-bottom:12px;">💼</div>
      <h3 style="font-family:'Fraunces',serif;font-size:20px;margin:0 0 8px;color:#F8F6F1;">Tu n'es pas (encore) employé sur WOLO.</h3>
      <p style="font-size:13px;max-width:420px;margin:0 auto;">Si tu attends une invitation d'un patron, vérifie ton WhatsApp. Si tu es prestataire, va dans <strong>Mon équipe</strong>.</p>
    </div>`;
  }

  function kpiCard(label, val, color){
    return `<div style="background:rgba(232,148,10,.05);border:1px solid rgba(232,148,10,.15);border-radius:12px;padding:14px;">
      <div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:900;color:${color};line-height:1.1;">${val}</div>
      <div style="font-size:10px;color:rgba(248,246,241,.45);text-transform:uppercase;letter-spacing:1px;margin-top:6px;">${label}</div>
    </div>`;
  }

  function formatFCFA(n){
    if (!n || n === 0) return '0 FCFA';
    return Number(n).toLocaleString('fr-FR') + ' FCFA';
  }

  function skeletonHTML(){
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.4);">Chargement de ton emploi…</div>`;
  }

  window.loadMonEmploi = loadMonEmploi;
})();
