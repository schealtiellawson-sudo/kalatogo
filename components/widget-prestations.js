// ================================================================
// Widget : Grille de prestations + prix individuels
// Métiers : coiffeuse, couturière, esthé, mécanicien (forfaits), etc.
// Endpoint : prestation-list / prestation-upsert / prestation-delete
// ================================================================
(function () {
  if (!window.WoloWidgetsRunner) return;
  const R = window.WoloWidgetsRunner;
  const esc = R._escapeHtml;
  const fmt = R._fmtFcfa;

  async function fetchPrestations(proUserId) {
    if (!proUserId) return [];
    const data = await R._api(`prestation-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' });
    return data.prestations || [];
  }

  function pcardPublic(p) {
    return `
      <article style="background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:12px;padding:14px;display:flex;justify-content:space-between;gap:12px;align-items:center;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:15px;color:#F8F6F1;">${esc(p.libelle)}</div>
          ${p.categorie ? `<div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:rgba(232,148,10,.85);margin-top:2px;">${esc(p.categorie)}</div>` : ''}
          ${p.description ? `<div style="font-size:12px;color:rgba(248,246,241,.65);margin-top:6px;line-height:1.4;">${esc(p.description)}</div>` : ''}
          ${p.duree_min ? `<div style="font-size:11px;color:rgba(248,246,241,.5);margin-top:4px;">⏱ ${p.duree_min} min</div>` : ''}
        </div>
        <div style="font-family:'Space Mono',monospace;font-size:14px;color:#E8940A;font-weight:700;white-space:nowrap;">${fmt(p.prix_fcfa)}</div>
      </article>`;
  }

  R.register('prestations_catalogue', {
    async renderProfile({ proUserId, root }) {
      const list = await fetchPrestations(proUserId);
      if (!list.length) {
        root.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Le pro n'a pas encore publié de grille de prestations.</div>`;
        return;
      }
      root.innerHTML = `<div style="display:grid;grid-template-columns:1fr;gap:10px;">${list.map(pcardPublic).join('')}</div>`;
    },

    async renderDashboard({ proUserId, root }) {
      let list = [];
      try { list = await fetchPrestations(proUserId); } catch (e) { console.warn(e); }

      root.innerHTML = `
        <div style="margin-bottom:12px;">
          <button id="wpc-add" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">+ Ajouter une prestation</button>
        </div>
        <div id="wpc-list" style="display:grid;gap:10px;"></div>
      `;
      const listEl = root.querySelector('#wpc-list');

      function row(p) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:grid;grid-template-columns:1fr 110px 80px;gap:8px;align-items:center;background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:10px 12px;';
        wrap.innerHTML = `
          <div>
            <div style="font-weight:700;font-size:14px;">${esc(p.libelle)}</div>
            ${p.categorie ? `<div style="font-size:11px;color:rgba(232,148,10,.85);text-transform:uppercase;letter-spacing:.05em;">${esc(p.categorie)}</div>` : ''}
          </div>
          <div style="color:#E8940A;font-family:'Space Mono',monospace;font-weight:700;font-size:13px;">${fmt(p.prix_fcfa)}</div>
          <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button data-act="edit" style="background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;">✏️</button>
            <button data-act="del" style="background:none;border:1px solid rgba(255,80,80,.4);color:#ff8080;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;">🗑</button>
          </div>`;
        wrap.querySelector('[data-act="edit"]').onclick = () => openForm(p);
        wrap.querySelector('[data-act="del"]').onclick = async () => {
          if (!confirm(`Supprimer « ${p.libelle} » ?`)) return;
          try {
            await R._api('prestation-delete', { id: p.id });
            wrap.remove();
          } catch (e) { alert(e.message); }
        };
        return wrap;
      }

      function refresh() {
        listEl.innerHTML = '';
        if (!list.length) {
          listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucune prestation. Ajoute la première — ex : « Brushing — 5 000 FCFA ».</div>`;
          return;
        }
        list.forEach(p => listEl.appendChild(row(p)));
      }

      function openForm(p) {
        const isEdit = !!p && p.id;
        const f = p || {};
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
        ov.innerHTML = `
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:480px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 14px;">${isEdit ? 'Modifier' : 'Ajouter'} une prestation</h4>
            <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Nom de la prestation *</label>
            <input id="wpc-libelle" value="${esc(f.libelle || '')}" placeholder="Brushing, Lavage, Tresses…" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;margin-bottom:10px;">
            <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Catégorie</label>
            <input id="wpc-cat" value="${esc(f.categorie || '')}" placeholder="Soins, Tresses, Couture-femme…" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;margin-bottom:10px;">
            <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Description</label>
            <textarea id="wpc-desc" rows="2" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;margin-bottom:10px;">${esc(f.description || '')}</textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
              <div>
                <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Prix (FCFA) *</label>
                <input id="wpc-prix" type="number" min="0" value="${esc(f.prix_fcfa || '')}" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
              <div>
                <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Durée (min)</label>
                <input id="wpc-duree" type="number" min="0" value="${esc(f.duree_min || '')}" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
              <button id="wpc-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:8px 14px;cursor:pointer;">Annuler</button>
              <button id="wpc-save" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:8px 18px;font-weight:700;cursor:pointer;">${isEdit ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </div>`;
        document.body.appendChild(ov);
        ov.querySelector('#wpc-cancel').onclick = () => ov.remove();
        ov.querySelector('#wpc-save').onclick = async () => {
          const payload = {
            id: isEdit ? f.id : undefined,
            libelle: ov.querySelector('#wpc-libelle').value.trim(),
            categorie: ov.querySelector('#wpc-cat').value.trim() || null,
            description: ov.querySelector('#wpc-desc').value.trim() || null,
            prix_fcfa: parseInt(ov.querySelector('#wpc-prix').value, 10),
            duree_min: parseInt(ov.querySelector('#wpc-duree').value, 10) || null,
          };
          if (!payload.libelle || isNaN(payload.prix_fcfa)) { alert('Nom et prix requis.'); return; }
          try {
            const data = await R._api('prestation-upsert', payload);
            const saved = data.prestation;
            if (isEdit) {
              const idx = list.findIndex(x => x.id === saved.id);
              if (idx >= 0) list[idx] = saved; else list.push(saved);
            } else {
              list.push(saved);
            }
            ov.remove();
            refresh();
          } catch (e) { alert(e.message); }
        };
      }

      root.querySelector('#wpc-add').onclick = () => openForm(null);
      refresh();
    },
  });
})();
