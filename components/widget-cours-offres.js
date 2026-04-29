// ================================================================
// Widget : Catalogue de cours (prof particulier, coach, formateur)
// Endpoints : cours-offres-list (public) / cours-offres-upsert / cours-offres-delete
// ================================================================
(function () {
  if (!window.WoloWidgetsRunner) return;
  const R = window.WoloWidgetsRunner;
  const esc = R._escapeHtml;
  const fmt = R._fmtFcfa;

  function modal(html) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }

  R.register('cours_offres', {
    async renderProfile({ proUserId, fields, root }) {
      let offres = [];
      try { const data = await R._api(`cours-offres-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' }); offres = data.offres || []; } catch (e) { console.warn(e); }
      const proTel = (fields['Numéro de téléphone'] || fields['WhatsApp'] || '').replace(/\D/g,'');
      if (!offres.length) { root.innerHTML = `<p style="font-size:13px;color:rgba(248,246,241,.55);">Le formateur n'a pas encore publié de cours.</p>`; return; }
      root.innerHTML = `
        <p style="font-size:13px;color:rgba(248,246,241,.7);margin:0 0 14px;">Cours et matières proposés. Pour réserver une séance, écris directement par WhatsApp.</p>
        <div style="display:grid;gap:8px;">
          ${offres.map(o => `
            <div style="background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
              <div style="flex:1;min-width:160px;">
                <div style="font-weight:700;font-size:14px;color:#F8F6F1;">${esc(o.matiere)}${o.niveau ? ' <span style="color:rgba(248,246,241,.5);font-weight:400;font-size:12px;">· ' + esc(o.niveau) + '</span>' : ''}</div>
                ${o.modalite ? `<div style="font-size:12px;color:rgba(248,246,241,.55);margin-top:2px;">📍 ${esc(o.modalite)}${o.duree_seance_min ? ' · ⏱️ ' + o.duree_seance_min + ' min' : ''}</div>` : ''}
                ${o.description ? `<div style="font-size:12px;color:rgba(248,246,241,.65);margin-top:4px;font-style:italic;">${esc(o.description)}</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <div style="font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#E8940A;">${fmt(o.tarif_horaire_fcfa)}/h</div>
                ${proTel ? `<a href="https://wa.me/${esc(proTel)}?text=${encodeURIComponent('Bonjour, je suis intéressé par votre cours de ' + o.matiere)}" target="_blank" style="background:#E8940A;color:#0f1410;border-radius:6px;padding:4px 10px;text-decoration:none;font-size:11px;font-weight:700;">💬 Réserver</a>` : ''}
              </div>
            </div>`).join('')}
        </div>`;
    },

    async renderDashboard({ proUserId, root }) {
      let offres = [];
      try { const data = await R._api(`cours-offres-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' }); offres = data.offres || []; } catch (e) { console.warn(e); }
      root.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
          <div style="font-size:13px;color:rgba(248,246,241,.65);">Tes matières / cours / tarifs horaires.</div>
          <button id="wco-add" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">+ Ajouter une matière</button>
        </div>
        <div id="wco-list" style="display:grid;gap:10px;"></div>`;
      const listEl = root.querySelector('#wco-list');

      function form(existing) {
        const ov = modal(`
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:480px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 16px;">${existing ? 'Modifier' : 'Ajouter'} un cours</h4>
            <div style="display:grid;gap:10px;">
              <input id="co-mat" placeholder="Matière (Maths, Anglais, Yoga…) *" value="${existing ? esc(existing.matiere) : ''}" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="co-niv" placeholder="Niveau (Primaire, Lycée, Adulte…)" value="${existing && existing.niveau ? esc(existing.niveau) : ''}" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="co-tar" type="number" placeholder="Tarif horaire FCFA *" value="${existing ? existing.tarif_horaire_fcfa : ''}" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="co-dur" type="number" placeholder="Durée séance (minutes)" value="${existing && existing.duree_seance_min ? existing.duree_seance_min : 60}" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <select id="co-mod" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <option value="">— Modalité —</option>
                <option ${existing && existing.modalite==='domicile' ? 'selected' : ''}>domicile</option>
                <option ${existing && existing.modalite==='visio' ? 'selected' : ''}>visio</option>
                <option ${existing && existing.modalite==='studio' ? 'selected' : ''}>studio</option>
              </select>
              <textarea id="co-desc" rows="2" placeholder="Description courte (méthode, public, …)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;resize:vertical;">${existing && existing.description ? esc(existing.description) : ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
              <button id="co-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:10px 16px;cursor:pointer;">Annuler</button>
              <button id="co-save" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Enregistrer</button>
            </div>
          </div>`);
        ov.querySelector('#co-cancel').onclick = () => ov.remove();
        ov.querySelector('#co-save').onclick = async () => {
          const mat = ov.querySelector('#co-mat').value.trim();
          const tar = parseInt(ov.querySelector('#co-tar').value, 10);
          if (!mat || !tar) { alert('Matière et tarif requis.'); return; }
          const body = {
            matiere: mat,
            niveau: ov.querySelector('#co-niv').value.trim() || null,
            tarif_horaire_fcfa: tar,
            duree_seance_min: parseInt(ov.querySelector('#co-dur').value, 10) || 60,
            modalite: ov.querySelector('#co-mod').value || null,
            description: ov.querySelector('#co-desc').value.trim() || null,
          };
          if (existing) body.id = existing.id;
          try { await R._api('cours-offres-upsert', body); ov.remove(); R.injectOnDashboard({ proUserId, fields: window.currentPrestataire?.fields || {}, root: root.parentNode || root }); }
          catch (e) { alert(e.message); }
        };
      }

      root.querySelector('#wco-add').onclick = () => form(null);

      function refresh() {
        listEl.innerHTML = '';
        if (!offres.length) { listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucun cours encore. Ajoute ta première matière.</div>`; return; }
        offres.forEach(o => {
          const div = document.createElement('div');
          div.style.cssText = 'background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;';
          div.innerHTML = `
            <div style="flex:1;min-width:160px;">
              <div style="font-weight:700;font-size:14px;">${esc(o.matiere)}${o.niveau ? ' · ' + esc(o.niveau) : ''}</div>
              <div style="font-family:'Space Mono',monospace;font-size:12px;color:#E8940A;margin-top:2px;">${fmt(o.tarif_horaire_fcfa)}/h${o.duree_seance_min ? ' · ' + o.duree_seance_min + ' min' : ''}${o.modalite ? ' · ' + esc(o.modalite) : ''}</div>
              ${o.description ? `<div style="font-size:12px;color:rgba(248,246,241,.6);margin-top:4px;font-style:italic;">${esc(o.description)}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;">
              <button data-act="edit" style="background:rgba(232,148,10,.15);border:1px solid rgba(232,148,10,.4);color:#E8940A;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">✏️</button>
              <button data-act="del" style="background:rgba(255,128,128,.15);border:1px solid rgba(255,128,128,.4);color:#ff8080;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">🗑️</button>
            </div>`;
          div.querySelector('[data-act="edit"]').onclick = () => form(o);
          div.querySelector('[data-act="del"]').onclick = async () => {
            if (!confirm('Supprimer cette matière ?')) return;
            try { await R._api('cours-offres-delete', { id: o.id }); offres = offres.filter(x => x.id !== o.id); refresh(); } catch (e) { alert(e.message); }
          };
          listEl.appendChild(div);
        });
      }
      refresh();
    },
  });
})();
