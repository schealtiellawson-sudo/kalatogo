// ================================================================
// Widget : Portfolio multi-projets
// Métiers : Graphiste, Photographe, Vidéaste, Architecte…
// Endpoints : portfolio-list / portfolio-upsert / portfolio-delete
// ================================================================
(function () {
  if (!window.WoloWidgetsRunner) return;
  const R = window.WoloWidgetsRunner;
  const esc = R._escapeHtml;
  const fmt = R._fmtFcfa;

  async function fetchProjets(proUserId) {
    if (!proUserId) return [];
    const data = await R._api(`portfolio-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' });
    return data.projets || [];
  }

  function projetTile(p) {
    const cover = (Array.isArray(p.photos) && p.photos[0]) || '';
    return `
      <article style="background:#16201a;border:1px solid rgba(232,148,10,.18);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;">
        ${cover ? `<div style="aspect-ratio:4/3;background:#000 url('${esc(cover)}') center/cover no-repeat;"></div>` : `<div style="aspect-ratio:4/3;background:#0f1410;display:flex;align-items:center;justify-content:center;color:rgba(232,148,10,.4);font-size:24px;">📷</div>`}
        <div style="padding:12px 14px;">
          ${p.categorie ? `<div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.06em;color:rgba(232,148,10,.85);text-transform:uppercase;margin-bottom:4px;">${esc(p.categorie)}</div>` : ''}
          <div style="font-weight:700;font-size:15px;color:#F8F6F1;">${esc(p.titre)}</div>
          ${p.description ? `<div style="font-size:12px;color:rgba(248,246,241,.65);margin-top:6px;line-height:1.4;">${esc(p.description)}</div>` : ''}
          ${p.prix_indicatif_fcfa ? `<div style="font-family:'Space Mono',monospace;font-size:12px;color:#E8940A;margin-top:8px;">À partir de ${fmt(p.prix_indicatif_fcfa)}</div>` : ''}
        </div>
      </article>`;
  }

  R.register('portfolio', {
    async renderProfile({ proUserId, root }) {
      const projets = await fetchProjets(proUserId);
      if (!projets.length) {
        root.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucun projet publié pour le moment.</div>`;
        return;
      }
      root.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">${projets.map(projetTile).join('')}</div>`;
    },

    async renderDashboard({ proUserId, root }) {
      let projets = [];
      try { projets = await fetchProjets(proUserId); } catch (e) { console.warn(e); }

      root.innerHTML = `
        <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:13px;color:rgba(248,246,241,.65);">Présente tes meilleurs projets, organisés par catégorie.</div>
          <button id="wpf-add" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">+ Nouveau projet</button>
        </div>
        <div id="wpf-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;"></div>
      `;
      const listEl = root.querySelector('#wpf-list');

      function tile(p) {
        const div = document.createElement('div');
        div.innerHTML = projetTile(p);
        const card = div.firstElementChild;
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;padding:0 14px 12px;';
        actions.innerHTML = `
          <button data-act="edit" style="flex:1;background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:6px;cursor:pointer;font-size:12px;">✏️ Modifier</button>
          <button data-act="del" style="background:none;border:1px solid rgba(255,80,80,.4);color:#ff8080;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;">🗑</button>`;
        card.appendChild(actions);
        actions.querySelector('[data-act="edit"]').onclick = () => openForm(p);
        actions.querySelector('[data-act="del"]').onclick = async () => {
          if (!confirm(`Supprimer le projet « ${p.titre} » ?`)) return;
          try {
            await R._api('portfolio-delete', { id: p.id });
            projets = projets.filter(x => x.id !== p.id);
            refresh();
          } catch (e) { alert(e.message); }
        };
        return card;
      }

      function refresh() {
        listEl.innerHTML = '';
        if (!projets.length) {
          listEl.innerHTML = `<div style="grid-column:1/-1;color:rgba(248,246,241,.55);font-size:13px;">Aucun projet pour l'instant. Ajoute ton premier — c'est ton CV visuel.</div>`;
          return;
        }
        projets.forEach(p => listEl.appendChild(tile(p)));
      }

      function openForm(p) {
        const isEdit = !!p && p.id;
        const f = p || {};
        const photosCsv = Array.isArray(f.photos) ? f.photos.join('\n') : '';
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
        ov.innerHTML = `
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:540px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 14px;">${isEdit ? 'Modifier' : 'Nouveau'} projet</h4>
            <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Titre *</label>
            <input id="wpf-titre" value="${esc(f.titre || '')}" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;margin-bottom:10px;">
            <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Catégorie</label>
            <input id="wpf-cat" value="${esc(f.categorie || '')}" placeholder="Logo, Mariage, Portrait…" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;margin-bottom:10px;">
            <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Description</label>
            <textarea id="wpf-desc" rows="2" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;margin-bottom:10px;">${esc(f.description || '')}</textarea>
            <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">URLs photos (1 par ligne, ImgBB)</label>
            <textarea id="wpf-photos" rows="4" placeholder="https://i.ibb.co/...\nhttps://i.ibb.co/..." style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;margin-bottom:10px;font-family:'Space Mono',monospace;font-size:12px;">${esc(photosCsv)}</textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
              <div>
                <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Prix indicatif (FCFA)</label>
                <input id="wpf-prix" type="number" min="0" value="${esc(f.prix_indicatif_fcfa || '')}" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
              <div>
                <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-bottom:4px;">Date</label>
                <input id="wpf-date" type="date" value="${esc(f.date_realisation || '')}" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
              <button id="wpf-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:8px 14px;cursor:pointer;">Annuler</button>
              <button id="wpf-save" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:8px 18px;font-weight:700;cursor:pointer;">${isEdit ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </div>`;
        document.body.appendChild(ov);
        ov.querySelector('#wpf-cancel').onclick = () => ov.remove();
        ov.querySelector('#wpf-save').onclick = async () => {
          const photosArr = ov.querySelector('#wpf-photos').value
            .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          const payload = {
            id: isEdit ? f.id : undefined,
            titre: ov.querySelector('#wpf-titre').value.trim(),
            categorie: ov.querySelector('#wpf-cat').value.trim() || null,
            description: ov.querySelector('#wpf-desc').value.trim() || null,
            photos: photosArr,
            prix_indicatif_fcfa: parseInt(ov.querySelector('#wpf-prix').value, 10) || null,
            date_realisation: ov.querySelector('#wpf-date').value || null,
          };
          if (!payload.titre) { alert('Titre requis.'); return; }
          try {
            const data = await R._api('portfolio-upsert', payload);
            const saved = data.projet;
            if (isEdit) {
              const idx = projets.findIndex(x => x.id === saved.id);
              if (idx >= 0) projets[idx] = saved; else projets.push(saved);
            } else {
              projets.push(saved);
            }
            ov.remove();
            refresh();
          } catch (e) { alert(e.message); }
        };
      }

      root.querySelector('#wpf-add').onclick = () => openForm(null);
      refresh();
    },
  });
})();
