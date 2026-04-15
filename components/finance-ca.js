// ══════════════════════════════════════════
// WOLO Business Suite — Module 5 : CA journalier + Finances
// Tables Airtable : CA_Journalier + Depenses
// ══════════════════════════════════════════

(function(){
  'use strict';

  var state = {
    mois: monthKey(new Date()),
    caEntries: [],
    depenses: []
  };

  function monthKey(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
  function todayKey(){ const d = new Date(); return d.toISOString().slice(0,10); }

  async function loadFinanceCA(){
    var root = document.getElementById('finance-ca-root');
    if (!root) return;
    root.innerHTML = skeletonHTML();

    if (!window.currentPrestataire?.id) {
      root.innerHTML = `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">Connecte-toi pour voir tes finances.</div>`;
      return;
    }

    try {
      const patronId = window.currentPrestataire.id;
      const filter = `AND({Patron ID}='${patronId}',DATETIME_FORMAT({Date},'YYYY-MM')='${state.mois}')`;
      const [caRes, depRes] = await Promise.all([
        fetch('/api/airtable-proxy/CA_Journalier?filterByFormula=' + encodeURIComponent(filter) + '&sort[0][field]=Date&sort[0][direction]=desc').catch(()=>({ok:false})),
        fetch('/api/airtable-proxy/Depenses?filterByFormula=' + encodeURIComponent(filter) + '&sort[0][field]=Date&sort[0][direction]=desc').catch(()=>({ok:false}))
      ]);
      state.caEntries = caRes.ok ? ((await caRes.json()).records || []) : [];
      state.depenses = depRes.ok ? ((await depRes.json()).records || []) : [];
    } catch(e){ console.warn('[finance] load err', e); }
    render();
  }

  function render(){
    var root = document.getElementById('finance-ca-root');
    if (!root) return;

    const totalCA = state.caEntries.reduce((s,e)=> s + (parseInt(e.fields?.['Montant FCFA'])||0), 0);
    const totalDep = state.depenses.reduce((s,e)=> s + (parseInt(e.fields?.['Montant FCFA'])||0), 0);
    const benef = totalCA - totalDep;

    // Graph données
    const daysInMonth = new Date(parseInt(state.mois.split('-')[0]), parseInt(state.mois.split('-')[1]), 0).getDate();
    const daily = Array(daysInMonth).fill(0);
    state.caEntries.forEach(e => {
      const d = e.fields?.['Date'];
      if (d) { const day = new Date(d).getDate(); daily[day-1] += parseInt(e.fields?.['Montant FCFA'])||0; }
    });
    const maxDay = Math.max(...daily, 1);

    root.innerHTML = `
      <div style="font-family:'Poppins',sans-serif;color:#F8F6F1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;margin:0 0 4px;">CA & finances</h1>
            <p style="font-size:13px;color:rgba(248,246,241,.5);margin:0;">Ton CA du mois en un coup d'œil. Saisie rapide, graph visuel.</p>
          </div>
          <div style="display:flex;gap:8px;">
            <input type="month" value="${state.mois}" onchange="changeCAMois(this.value)" style="background:rgba(255,255,255,.06);border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:9px 12px;color:#F8F6F1;font-family:inherit;">
            <button onclick="openSaisieCAModal()" style="background:#E8940A;color:#0f1410;border:none;padding:9px 16px;border-radius:10px;font-weight:700;cursor:pointer;">+ Saisir CA</button>
            <button onclick="openSaisieDepModal()" style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3);padding:9px 16px;border-radius:10px;font-weight:700;cursor:pointer;">+ Dépense</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px;">
          ${kpi('CA du mois', formatFCFA(totalCA), '#22c55e')}
          ${kpi('Dépenses', formatFCFA(totalDep), '#ef4444')}
          ${kpi('Bénéfice net', formatFCFA(benef), benef >= 0 ? '#E8940A' : '#ef4444')}
          ${kpi('Jours saisis', state.caEntries.length + '/' + daysInMonth, '#3b82f6')}
        </div>

        <div style="background:rgba(232,148,10,.04);border:1px solid rgba(232,148,10,.12);border-radius:14px;padding:18px;margin-bottom:20px;">
          <h3 style="font-family:'Fraunces',serif;font-size:16px;margin:0 0 14px;">Évolution CA quotidien</h3>
          <div style="display:flex;align-items:flex-end;gap:2px;height:140px;">
            ${daily.map((v, i) => `<div title="${i+1}: ${formatFCFA(v)}" style="flex:1;background:${v > 0 ? 'linear-gradient(180deg,#E8940A,rgba(232,148,10,.3))' : 'rgba(255,255,255,.03)'};height:${Math.max((v/maxDay)*100, v > 0 ? 3 : 1)}%;border-radius:3px 3px 0 0;min-height:2px;"></div>`).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(248,246,241,.4);font-family:'Space Mono',monospace;margin-top:6px;">
            <span>J1</span><span>J${Math.floor(daysInMonth/2)}</span><span>J${daysInMonth}</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="background:rgba(34,197,94,.04);border:1px solid rgba(34,197,94,.15);border-radius:12px;padding:14px;">
            <h4 style="font-family:'Fraunces',serif;font-size:14px;margin:0 0 10px;color:#22c55e;">Derniers CA</h4>
            ${state.caEntries.slice(0,5).map(e => entryHTML(e, '#22c55e')).join('') || '<p style="font-size:12px;color:rgba(248,246,241,.4);margin:0;">Aucune saisie.</p>'}
          </div>
          <div style="background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.15);border-radius:12px;padding:14px;">
            <h4 style="font-family:'Fraunces',serif;font-size:14px;margin:0 0 10px;color:#ef4444;">Dernières dépenses</h4>
            ${state.depenses.slice(0,5).map(e => entryHTML(e, '#ef4444')).join('') || '<p style="font-size:12px;color:rgba(248,246,241,.4);margin:0;">Aucune dépense.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  function entryHTML(e, color){
    const f = e.fields || {};
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px;">
      <span style="color:rgba(248,246,241,.7);">${f['Date'] ? new Date(f['Date']).toLocaleDateString('fr-FR') : '?'} · ${f['Catégorie'] || f['Description'] || '—'}</span>
      <span style="font-family:'Space Mono',monospace;color:${color};font-weight:700;">${formatFCFA(f['Montant FCFA']||0)}</span>
    </div>`;
  }

  function kpi(label, val, color){
    return `<div style="background:rgba(232,148,10,.05);border:1px solid rgba(232,148,10,.15);border-radius:12px;padding:14px;">
      <div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:900;color:${color};line-height:1.1;">${val}</div>
      <div style="font-size:10px;color:rgba(248,246,241,.45);text-transform:uppercase;letter-spacing:1px;margin-top:6px;">${label}</div>
    </div>`;
  }

  function formatFCFA(n){
    if (!n || n === 0) return '0 FCFA';
    return Number(n).toLocaleString('fr-FR') + ' FCFA';
  }

  function skeletonHTML(){ return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.4);">Chargement CA…</div>`; }

  window.changeCAMois = function(v){ state.mois = v; loadFinanceCA(); };

  window.openSaisieCAModal = function(){
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div id="ca-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">
        <div style="background:#0f1410;border:1px solid rgba(34,197,94,.3);border-radius:16px;padding:24px;max-width:420px;width:100%;font-family:'Poppins',sans-serif;color:#F8F6F1;">
          <h2 style="font-family:'Fraunces',serif;font-size:22px;margin:0 0 16px;">Saisir un CA</h2>
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Date</label>
          <input id="ca-date" type="date" value="${todayKey()}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;">
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Montant (FCFA)</label>
          <input id="ca-mt" type="number" placeholder="25000" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;">
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Catégorie</label>
          <select id="ca-cat" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;">
            <option>Ventes</option><option>Prestations</option><option>Acomptes</option><option>Autre</option>
          </select>
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Note (optionnel)</label>
          <input id="ca-note" type="text" placeholder="Ex: paiement client X" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:20px;font-family:inherit;">
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('ca-modal-bg').remove()" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(248,246,241,.15);color:#F8F6F1;padding:10px;border-radius:10px;font-weight:600;cursor:pointer;">Annuler</button>
            <button onclick="submitCA()" style="flex:2;background:#22c55e;border:none;color:#0f1410;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;">Enregistrer</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  };

  window.submitCA = async function(){
    const date = document.getElementById('ca-date')?.value;
    const mt = parseInt(document.getElementById('ca-mt')?.value||'0')||0;
    const cat = document.getElementById('ca-cat')?.value;
    const note = document.getElementById('ca-note')?.value.trim();
    if (!date || !mt) return alert('Date + montant requis');
    try {
      const res = await fetch('/api/airtable-proxy/CA_Journalier', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ records: [{ fields: {
          'Patron ID': window.currentPrestataire.id,
          'Date': date, 'Montant FCFA': mt, 'Catégorie': cat, 'Note': note
        }}]})
      });
      if (!res.ok) throw new Error('Erreur Airtable');
      document.getElementById('ca-modal-bg')?.remove();
      loadFinanceCA();
    } catch(e){ alert('❌ ' + e.message); }
  };

  window.openSaisieDepModal = function(){
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div id="dep-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">
        <div style="background:#0f1410;border:1px solid rgba(239,68,68,.3);border-radius:16px;padding:24px;max-width:420px;width:100%;font-family:'Poppins',sans-serif;color:#F8F6F1;">
          <h2 style="font-family:'Fraunces',serif;font-size:22px;margin:0 0 16px;">Saisir une dépense</h2>
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Date</label>
          <input id="dep-date" type="date" value="${todayKey()}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;">
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Montant (FCFA)</label>
          <input id="dep-mt" type="number" placeholder="5000" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;">
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Catégorie</label>
          <select id="dep-cat" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:14px;font-family:inherit;">
            <option>Matériel</option><option>Transport</option><option>Loyer</option><option>Salaires</option><option>Fournitures</option><option>Autre</option>
          </select>
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(248,246,241,.5);">Description</label>
          <input id="dep-desc" type="text" placeholder="Ex: achat tissu" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 12px;color:#F8F6F1;margin-top:6px;margin-bottom:20px;font-family:inherit;">
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('dep-modal-bg').remove()" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(248,246,241,.15);color:#F8F6F1;padding:10px;border-radius:10px;font-weight:600;cursor:pointer;">Annuler</button>
            <button onclick="submitDep()" style="flex:2;background:#ef4444;border:none;color:#F8F6F1;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;">Enregistrer</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  };

  window.submitDep = async function(){
    const date = document.getElementById('dep-date')?.value;
    const mt = parseInt(document.getElementById('dep-mt')?.value||'0')||0;
    const cat = document.getElementById('dep-cat')?.value;
    const desc = document.getElementById('dep-desc')?.value.trim();
    if (!date || !mt) return alert('Date + montant requis');
    try {
      const res = await fetch('/api/airtable-proxy/Depenses', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ records: [{ fields: {
          'Patron ID': window.currentPrestataire.id,
          'Date': date, 'Montant FCFA': mt, 'Catégorie': cat, 'Description': desc
        }}]})
      });
      if (!res.ok) throw new Error('Erreur Airtable');
      document.getElementById('dep-modal-bg')?.remove();
      loadFinanceCA();
    } catch(e){ alert('❌ ' + e.message); }
  };

  window.loadFinanceCA = loadFinanceCA;
})();
