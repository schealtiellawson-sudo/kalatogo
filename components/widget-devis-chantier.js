// ================================================================
// Widget : Demande de devis chantier
// Métiers : Maçon, Plombier, Électricien, Peintre, Menuisier, etc.
// Endpoints : devis-chantier-create / devis-chantier-list /
//             devis-chantier-update
// ================================================================
(function () {
  if (!window.WoloWidgetsRunner) return;
  const R = window.WoloWidgetsRunner;
  const esc = R._escapeHtml;
  const fmt = R._fmtFcfa;

  function statutBadge(s) {
    const colors = {
      nouveau: '#E8940A', vu: '#9d8666', devis_envoye: '#3aa6ff',
      accepte: '#2ec27e', refuse: '#ff8080', annule: 'rgba(248,246,241,.4)', termine: '#2ec27e',
    };
    return `<span style="background:${colors[s] || '#666'};color:#0f1410;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.05em;">${esc(s.replace('_', ' '))}</span>`;
  }

  R.register('devis_chantier', {
    async renderProfile({ proUserId, fields, root }) {
      const proNom = fields['Nom complet'] || 'le pro';
      const metier = fields['Métier principal'] || '';
      root.innerHTML = `
        <p style="font-size:13px;color:rgba(248,246,241,.7);margin:0 0 14px;">Décris ton chantier (photos, surface, délai). ${esc(proNom)} te répond avec un devis chiffré.</p>
        <button id="wdc-open" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:12px 20px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">🔧 Demander un devis</button>
      `;
      root.querySelector('#wdc-open').onclick = () => {
        const MAX_PHOTOS = 6;
        const photosState = []; // URLs (uploadées ou ajoutées via fallback)
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
        ov.innerHTML = `
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:520px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 14px;">Devis chantier — ${esc(proNom)}</h4>
            <div style="display:grid;gap:10px;">
              <input id="wdc-nom" placeholder="Ton nom *" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="wdc-tel" placeholder="WhatsApp *" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="wdc-type" placeholder="Type de travaux (ex: réfection toiture, installation clim)" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <textarea id="wdc-desc" rows="3" placeholder="Décris le chantier — état actuel, ce que tu veux *" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;"></textarea>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <input id="wdc-surface" type="number" min="0" placeholder="Surface (m²)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <input id="wdc-budget" type="number" min="0" placeholder="Budget estimé (FCFA)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
              <input id="wdc-delai" placeholder="Délai souhaité (cette semaine, 1 mois…)" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="wdc-adresse" placeholder="Adresse du chantier (quartier, repère)" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">

              <label style="display:block;font-size:12px;color:rgba(248,246,241,.7);margin-top:4px;">Photos du lieu (max ${MAX_PHOTOS}, optionnel)</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <label style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:6px;">
                  <span>📷 Téléverser</span>
                  <input id="wdc-file" type="file" accept="image/*" multiple style="display:none;">
                </label>
                <button type="button" id="wdc-url-toggle" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:12px;">+ URL</button>
                <span id="wdc-upload-status" style="font-size:11px;color:rgba(248,246,241,.55);"></span>
              </div>
              <div id="wdc-thumbs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;"></div>
              <div id="wdc-url-row" style="display:none;gap:6px;">
                <input id="wdc-url-input" placeholder="https://i.ibb.co/..." style="flex:1;padding:8px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;font-family:'Space Mono',monospace;font-size:12px;">
                <button type="button" id="wdc-url-add" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:0 14px;font-weight:700;cursor:pointer;font-size:12px;">Ajouter</button>
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
              <button id="wdc-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:10px 16px;cursor:pointer;">Annuler</button>
              <button id="wdc-send" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Envoyer la demande</button>
            </div>
          </div>`;
        document.body.appendChild(ov);

        const thumbsEl = ov.querySelector('#wdc-thumbs');
        const statusEl = ov.querySelector('#wdc-upload-status');
        function renderThumbs() {
          thumbsEl.innerHTML = photosState.map((url, i) => `
            <div style="position:relative;aspect-ratio:1/1;background:#000 url('${esc(url)}') center/cover;border-radius:8px;border:1px solid rgba(232,148,10,.25);">
              <button type="button" data-idx="${i}" class="wdc-thumb-del" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px;line-height:1;">×</button>
            </div>`).join('');
          thumbsEl.querySelectorAll('.wdc-thumb-del').forEach(b => {
            b.onclick = () => {
              const i = parseInt(b.dataset.idx, 10);
              photosState.splice(i, 1);
              renderThumbs();
            };
          });
        }
        renderThumbs();

        ov.querySelector('#wdc-file').addEventListener('change', async (ev) => {
          const files = ev.target.files;
          if (!files || !files.length) return;
          const remaining = MAX_PHOTOS - photosState.length;
          if (remaining <= 0) { statusEl.textContent = `Limite ${MAX_PHOTOS} atteinte.`; return; }
          statusEl.textContent = 'Upload en cours…';
          try {
            const { urls, errors } = await R._uploadPhotos(files, { max: remaining });
            urls.forEach(u => photosState.push(u));
            renderThumbs();
            if (errors.length) statusEl.textContent = `${urls.length} ajoutée(s), ${errors.length} en erreur.`;
            else statusEl.textContent = `${urls.length} ajoutée(s).`;
          } catch (e) { statusEl.textContent = 'Erreur : ' + e.message; }
          ev.target.value = '';
        });
        const urlRow = ov.querySelector('#wdc-url-row');
        ov.querySelector('#wdc-url-toggle').onclick = () => {
          urlRow.style.display = (urlRow.style.display === 'flex') ? 'none' : 'flex';
        };
        ov.querySelector('#wdc-url-add').onclick = () => {
          const inp = ov.querySelector('#wdc-url-input');
          const u = (inp.value || '').trim();
          if (!u) return;
          if (photosState.length >= MAX_PHOTOS) { statusEl.textContent = `Limite ${MAX_PHOTOS} atteinte.`; return; }
          photosState.push(u);
          inp.value = '';
          renderThumbs();
        };

        ov.querySelector('#wdc-cancel').onclick = () => ov.remove();
        ov.querySelector('#wdc-send').onclick = async () => {
          const payload = {
            pro_user_id: proUserId,
            client_nom: ov.querySelector('#wdc-nom').value.trim(),
            client_telephone: ov.querySelector('#wdc-tel').value.trim(),
            type_travaux: ov.querySelector('#wdc-type').value.trim() || metier,
            description: ov.querySelector('#wdc-desc').value.trim(),
            surface_m2: parseInt(ov.querySelector('#wdc-surface').value, 10) || null,
            budget_estime_fcfa: parseInt(ov.querySelector('#wdc-budget').value, 10) || null,
            delai_souhaite: ov.querySelector('#wdc-delai').value.trim() || null,
            adresse_chantier: ov.querySelector('#wdc-adresse').value.trim() || null,
            photos: photosState.slice(0, MAX_PHOTOS),
          };
          if (!payload.client_nom || !payload.client_telephone || !payload.description) {
            alert('Nom, téléphone et description du chantier requis.'); return;
          }
          try {
            await R._api('devis-chantier-create', payload);
            ov.innerHTML = `<div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:30px;max-width:420px;text-align:center;color:#F8F6F1;font-family:Poppins,sans-serif;"><div style="font-size:42px;margin-bottom:10px;">✓</div><h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 8px;">Demande envoyée</h4><p style="font-size:14px;color:rgba(248,246,241,.75);margin:0 0 18px;">${esc(proNom)} va te répondre avec un devis chiffré.</p><button id="wdc-close" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;">Fermer</button></div>`;
            ov.querySelector('#wdc-close').onclick = () => ov.remove();
          } catch (e) { alert(e.message); }
        };
      };
    },

    async renderDashboard({ proUserId, root }) {
      let list = [];
      try {
        const data = await R._api(`devis-chantier-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' });
        list = data.devis || [];
      } catch (e) { console.warn(e); }

      root.innerHTML = `
        <div style="margin-bottom:12px;font-size:13px;color:rgba(248,246,241,.65);">Demandes de devis reçues. Réponds avec un montant + message ; le client est notifié par WhatsApp.</div>
        <div id="wdc-list" style="display:grid;gap:10px;"></div>`;
      const listEl = root.querySelector('#wdc-list');

      function row(d) {
        const div = document.createElement('div');
        div.style.cssText = 'background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;';
        const photos = (Array.isArray(d.photos) ? d.photos : []).slice(0, 4);
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
            <div style="font-weight:700;font-size:14px;">${esc(d.client_nom)}${d.type_travaux ? ' · ' + esc(d.type_travaux) : ''}</div>
            ${statutBadge(d.statut)}
          </div>
          <div style="font-size:12px;color:rgba(248,246,241,.7);line-height:1.45;">${esc(d.description)}</div>
          <div style="font-size:11px;color:rgba(248,246,241,.55);margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;">
            ${d.surface_m2 ? `<span>📐 ${d.surface_m2} m²</span>` : ''}
            ${d.budget_estime_fcfa ? `<span>💰 ${fmt(d.budget_estime_fcfa)}</span>` : ''}
            ${d.delai_souhaite ? `<span>⏳ ${esc(d.delai_souhaite)}</span>` : ''}
            ${d.adresse_chantier ? `<span>📍 ${esc(d.adresse_chantier)}</span>` : ''}
          </div>
          ${photos.length ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">${photos.map(p => `<a href="${esc(p)}" target="_blank" style="width:60px;height:60px;background:#000 url('${esc(p)}') center/cover;border-radius:6px;border:1px solid rgba(232,148,10,.2);"></a>`).join('')}</div>` : ''}
          ${d.devis_montant_fcfa ? `<div style="margin-top:8px;padding:8px;background:rgba(232,148,10,.1);border-radius:8px;font-size:12px;color:#E8940A;">Devis envoyé : ${fmt(d.devis_montant_fcfa)}${d.devis_message ? ' — « ' + esc(d.devis_message) + ' »' : ''}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            <a href="https://wa.me/${esc(d.client_telephone.replace(/\D/g,''))}?text=${encodeURIComponent('Bonjour ' + d.client_nom + ', je te recontacte au sujet de ta demande sur WOLO Market.')}" target="_blank" style="background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:5px 10px;text-decoration:none;font-size:12px;">💬 WhatsApp</a>
            <button data-act="devis" style="background:#E8940A;color:#0f1410;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:700;">📝 Envoyer un devis</button>
            <button data-act="refus" style="background:none;border:1px solid rgba(255,80,80,.4);color:#ff8080;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:12px;">Refuser</button>
          </div>`;
        div.querySelector('[data-act="devis"]').onclick = () => {
          const m = prompt('Montant du devis (FCFA)', d.devis_montant_fcfa || '');
          if (m == null) return;
          const txt = prompt('Message au client (optionnel)', d.devis_message || '');
          R._api('devis-chantier-update', {
            id: d.id, statut: 'devis_envoye',
            devis_montant_fcfa: parseInt(m, 10) || null,
            devis_message: (txt || '').trim() || null,
          }).then(() => location.reload()).catch(e => alert(e.message));
        };
        div.querySelector('[data-act="refus"]').onclick = () => {
          if (!confirm('Marquer cette demande comme refusée ?')) return;
          R._api('devis-chantier-update', { id: d.id, statut: 'refuse' })
            .then(() => location.reload()).catch(e => alert(e.message));
        };
        return div;
      }

      if (!list.length) {
        listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucune demande pour l'instant.</div>`;
        return;
      }
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      list.forEach(d => listEl.appendChild(row(d)));
    },
  });
})();
