// ================================================================
// Widget : Réservation de table (restaurants, bars, lounges)
// Endpoints : reservation-table-create / reservation-table-list /
//             reservation-table-update
// ================================================================
(function () {
  if (!window.WoloWidgetsRunner) return;
  const R = window.WoloWidgetsRunner;
  const esc = R._escapeHtml;

  function modal(html) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }

  function statutBadge(s) {
    const colors = {
      en_attente: '#E8940A', confirmee: '#2ec27e', refusee: '#ff8080',
      annulee: 'rgba(248,246,241,.4)', honoree: '#2ec27e', no_show: '#ff8080',
    };
    return `<span style="background:${colors[s] || '#666'};color:#0f1410;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.05em;">${esc(s)}</span>`;
  }

  R.register('reservation_table', {
    async renderProfile({ proUserId, fields, root }) {
      const proNom = fields['Nom complet'] || 'le restaurant';
      root.innerHTML = `
        <p style="font-size:13px;color:rgba(248,246,241,.7);margin:0 0 14px;">Réserve une table directement. ${esc(proNom)} confirmera par WhatsApp.</p>
        <button id="wrt-open" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:12px 20px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">🍽️ Réserver une table</button>
      `;
      root.querySelector('#wrt-open').onclick = () => {
        const ov = modal(`
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:480px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 16px;">Réservation chez ${esc(proNom)}</h4>
            <div style="display:grid;gap:10px;">
              <input id="rt-nom" placeholder="Ton nom *" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="rt-tel" placeholder="Téléphone WhatsApp *" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <input id="rt-date" type="date" min="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <input id="rt-heure" type="time" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
              <input id="rt-nb" type="number" min="1" max="50" placeholder="Nombre de personnes *" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="rt-occ" placeholder="Occasion (anniversaire, pro…)" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <textarea id="rt-msg" rows="2" placeholder="Demande spéciale (table fenêtre, allergies…)" style="width:100%;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;"></textarea>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
              <button id="rt-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:10px 16px;cursor:pointer;">Annuler</button>
              <button id="rt-send" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Envoyer la demande</button>
            </div>
          </div>`);
        ov.querySelector('#rt-cancel').onclick = () => ov.remove();
        ov.querySelector('#rt-send').onclick = async () => {
          const payload = {
            pro_user_id: proUserId,
            client_nom: ov.querySelector('#rt-nom').value.trim(),
            client_telephone: ov.querySelector('#rt-tel').value.trim(),
            date_reservation: ov.querySelector('#rt-date').value,
            heure: ov.querySelector('#rt-heure').value,
            nb_personnes: parseInt(ov.querySelector('#rt-nb').value, 10),
            occasion: ov.querySelector('#rt-occ').value.trim() || null,
            message: ov.querySelector('#rt-msg').value.trim() || null,
          };
          if (!payload.client_nom || !payload.client_telephone || !payload.date_reservation || !payload.heure || !payload.nb_personnes) {
            alert('Nom, téléphone, date, heure et nombre de personnes requis.');
            return;
          }
          try {
            await R._api('reservation-table-create', payload);
            ov.innerHTML = `<div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:30px;max-width:420px;text-align:center;color:#F8F6F1;font-family:Poppins,sans-serif;"><div style="font-size:42px;margin-bottom:10px;">✓</div><h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 8px;">Demande envoyée</h4><p style="font-size:14px;color:rgba(248,246,241,.75);margin:0 0 18px;">${esc(proNom)} va te confirmer par WhatsApp.</p><button id="rt-close" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;">Fermer</button></div>`;
            ov.querySelector('#rt-close').onclick = () => ov.remove();
          } catch (e) { alert(e.message); }
        };
      };
    },

    async renderDashboard({ proUserId, root }) {
      let list = [];
      try {
        const data = await R._api(`reservation-table-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' });
        list = data.reservations || [];
      } catch (e) { console.warn(e); }

      root.innerHTML = `
        <div style="margin-bottom:12px;font-size:13px;color:rgba(248,246,241,.65);">Demandes de réservation reçues — confirme ou refuse, le client est notifié par WhatsApp.</div>
        <div id="wrt-list" style="display:grid;gap:10px;"></div>`;
      const listEl = root.querySelector('#wrt-list');

      function row(r) {
        const div = document.createElement('div');
        div.style.cssText = 'background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;';
        div.innerHTML = `
          <div style="flex:1;min-width:180px;">
            <div style="font-weight:700;font-size:14px;">${esc(r.client_nom)} · ${r.nb_personnes} pers.</div>
            <div style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(232,148,10,.85);margin-top:2px;">${esc(r.date_reservation)} · ${esc(r.heure)}</div>
            <div style="font-size:12px;color:rgba(248,246,241,.6);margin-top:4px;">📞 ${esc(r.client_telephone)}${r.occasion ? ' · 🎉 ' + esc(r.occasion) : ''}</div>
            ${r.message ? `<div style="font-size:12px;color:rgba(248,246,241,.55);margin-top:4px;font-style:italic;">« ${esc(r.message)} »</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
            ${statutBadge(r.statut)}
            <div style="display:flex;gap:4px;">
              ${r.statut === 'en_attente' ? `<button data-act="confirm" style="background:#2ec27e;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;font-weight:700;">✓ Confirmer</button><button data-act="refuse" style="background:#ff8080;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;font-weight:700;">✗ Refuser</button>` : ''}
              <a href="https://wa.me/${esc(r.client_telephone.replace(/\D/g,''))}" target="_blank" style="background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:4px 10px;text-decoration:none;font-size:12px;">💬</a>
            </div>
          </div>`;
        const send = async (statut) => {
          try {
            await R._api('reservation-table-update', { id: r.id, statut });
            r.statut = statut;
            const fresh = row(r);
            div.parentNode && div.parentNode.replaceChild(fresh, div);
          } catch (e) { alert(e.message); }
        };
        div.querySelector('[data-act="confirm"]')?.addEventListener('click', () => send('confirmee'));
        div.querySelector('[data-act="refuse"]')?.addEventListener('click', () => send('refusee'));
        return div;
      }
      function refresh() {
        listEl.innerHTML = '';
        if (!list.length) {
          listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucune demande pour l'instant.</div>`;
          return;
        }
        list.sort((a,b) => (b.date_reservation + b.heure).localeCompare(a.date_reservation + a.heure));
        list.forEach(r => listEl.appendChild(row(r)));
      }
      refresh();
    },
  });
})();
