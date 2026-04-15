// ══════════════════════════════════════════
// WOLO Business Suite — Module 2 : Paie & Bulletins
// Tables Airtable : Fiches_Paie + Paiements_Salaire
// ══════════════════════════════════════════

(function(){
  'use strict';

  var state = { mois: monthKey(new Date()), employes: [], fiches: [], paiements: [] };

  function monthKey(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }

  async function loadPaieDashboard(){
    var root = document.getElementById('paie-dashboard-root');
    if (!root) return;
    root.innerHTML = skeletonHTML();

    if (!window.currentPrestataire?.id) {
      root.innerHTML = `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">Connecte-toi pour gérer la paie.</div>`;
      return;
    }

    try {
      const patronId = window.currentPrestataire.id;
      const [empRes, ficheRes, payRes] = await Promise.all([
        fetch('/api/airtable-proxy/Employes?filterByFormula=' + encodeURIComponent(`{Patron ID}='${patronId}'`)).catch(()=>({ok:false})),
        fetch('/api/airtable-proxy/Fiches_Paie?filterByFormula=' + encodeURIComponent(`AND({Patron ID}='${patronId}',{Mois}='${state.mois}')`)).catch(()=>({ok:false})),
        fetch('/api/airtable-proxy/Paiements_Salaire?filterByFormula=' + encodeURIComponent(`AND({Patron ID}='${patronId}',{Mois}='${state.mois}')`)).catch(()=>({ok:false}))
      ]);
      state.employes = empRes.ok ? ((await empRes.json()).records || []) : [];
      state.fiches = ficheRes.ok ? ((await ficheRes.json()).records || []) : [];
      state.paiements = payRes.ok ? ((await payRes.json()).records || []) : [];
    } catch(e){ console.warn('[paie] load err', e); }
    render();
  }

  function render(){
    var root = document.getElementById('paie-dashboard-root');
    if (!root) return;

    const total = state.employes.reduce((s,e)=> s + (parseInt(e.fields?.['Salaire FCFA'])||0), 0);
    const payes = state.paiements.reduce((s,p)=> s + (parseInt(p.fields?.['Montant FCFA'])||0), 0);
    const reste = total - payes;

    root.innerHTML = `
      <div style="font-family:'Poppins',sans-serif;color:#F8F6F1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;margin:0 0 4px;">Paie & bulletins</h1>
            <p style="font-size:13px;color:rgba(248,246,241,.5);margin:0;">Paye ton équipe via WOLO Pay. Génère les bulletins en 1 clic.</p>
          </div>
          <input type="month" value="${state.mois}" onchange="changePaieMois(this.value)" style="background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:9px 12px;color:#F8F6F1;font-family:inherit;">
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px;">
          ${kpiCard('Masse salariale', formatFCFA(total), '#E8940A')}
          ${kpiCard('Déjà payé ' + state.mois, formatFCFA(payes), '#22c55e')}
          ${kpiCard('Reste à payer', formatFCFA(reste), reste > 0 ? '#ef4444' : '#22c55e')}
          ${kpiCard('Bulletins générés', state.fiches.length + '/' + state.employes.length, '#3b82f6')}
        </div>

        ${state.employes.length === 0 ? emptyHTML() : payrollTableHTML()}
      </div>
    `;
  }

  function emptyHTML(){
    return `<div style="background:rgba(232,148,10,.03);border:1px dashed rgba(232,148,10,.2);border-radius:14px;padding:30px;text-align:center;">
      <p style="color:rgba(248,246,241,.5);margin:0 0 14px;">Aucun employé pour le moment.</p>
      <button onclick="showDashSection('talent-equipe')" style="background:#E8940A;color:#0f1410;border:none;padding:9px 18px;border-radius:10px;font-weight:700;cursor:pointer;">Inviter mon premier employé</button>
    </div>`;
  }

  function payrollTableHTML(){
    return `<div style="background:rgba(232,148,10,.03);border:1px solid rgba(232,148,10,.1);border-radius:12px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead style="background:rgba(232,148,10,.06);">
          <tr>
            <th style="padding:10px;text-align:left;font-family:'Space Mono',monospace;font-size:10px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Employé</th>
            <th style="padding:10px;text-align:left;font-family:'Space Mono',monospace;font-size:10px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Poste</th>
            <th style="padding:10px;text-align:right;font-family:'Space Mono',monospace;font-size:10px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Salaire</th>
            <th style="padding:10px;text-align:center;font-family:'Space Mono',monospace;font-size:10px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Statut</th>
            <th style="padding:10px;text-align:center;font-family:'Space Mono',monospace;font-size:10px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${state.employes.map(e => rowHTML(e)).join('')}
        </tbody>
      </table>
    </div>
    <p style="font-size:11px;color:rgba(248,246,241,.35);margin-top:12px;">Module 2 — MVP. Le paiement WOLO Pay s'effectue via ton solde. Les bulletins PDF sont générés côté serveur à la demande.</p>`;
  }

  function rowHTML(emp){
    const f = emp.fields || {};
    const nom = f['Nom complet'] || '—';
    const poste = f['Poste'] || '—';
    const salaire = parseInt(f['Salaire FCFA'])||0;
    const fiche = state.fiches.find(x => x.fields?.['Employe ID'] === emp.id);
    const paiement = state.paiements.find(x => x.fields?.['Employe ID'] === emp.id);
    const paye = !!paiement;
    return `<tr style="border-top:1px solid rgba(255,255,255,.04);">
      <td style="padding:10px;font-weight:600;">${nom}</td>
      <td style="padding:10px;color:rgba(248,246,241,.6);">${poste}</td>
      <td style="padding:10px;text-align:right;font-family:'Space Mono',monospace;">${formatFCFA(salaire)}</td>
      <td style="padding:10px;text-align:center;">
        <span style="background:${paye ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.12)'};color:${paye ? '#22c55e' : '#ef4444'};font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.5px;">${paye ? 'Payé' : 'En attente'}</span>
      </td>
      <td style="padding:10px;text-align:center;">
        ${paye
          ? `<button onclick="downloadBulletin('${fiche?.id || ''}')" style="background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);color:#F8F6F1;padding:6px 10px;border-radius:8px;font-size:11px;cursor:pointer;">📄 Bulletin</button>`
          : `<button onclick="payerEmploye('${emp.id}', ${salaire}, '${nom.replace(/'/g,"\\'")}')" style="background:#E8940A;color:#0f1410;border:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">💸 Payer</button>`
        }
      </td>
    </tr>`;
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
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.4);">Chargement paie…</div>`;
  }

  window.changePaieMois = function(v){ state.mois = v; loadPaieDashboard(); };

  window.payerEmploye = async function(empId, salaire, nom){
    if (!confirm(`Payer ${formatFCFA(salaire)} à ${nom} pour ${state.mois} via WOLO Pay ?`)) return;
    try {
      const patronId = window.currentPrestataire.id;
      const wFetch = window.woloFetch || fetch;
      const res = await wFetch('/api/wolo-pay/paie-pay', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ patronId, employeId: empId, mois: state.mois, montant: salaire })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur paiement');
      alert('✅ Paiement effectué. Bulletin généré.');
      loadPaieDashboard();
    } catch(e){
      alert('❌ ' + e.message + '\n(Module 2 backend en cours — placeholder actif)');
    }
  };

  window.downloadBulletin = function(ficheId){
    if (!ficheId) return alert('Bulletin introuvable.');
    window.open('/api/wolo-pay/paie-bulletin?id=' + encodeURIComponent(ficheId), '_blank');
  };

  window.loadPaieDashboard = loadPaieDashboard;
})();
