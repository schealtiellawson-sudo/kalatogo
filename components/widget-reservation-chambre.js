// ================================================================
// Widget : Réservation chambre (hôtel, auberge, maison d'hôtes)
// Endpoints : reservation-chambre-create / list / update
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
  function statutBadge(s) {
    const colors = { en_attente:'#E8940A', confirmee:'#2ec27e', refusee:'#ff8080', annulee:'rgba(248,246,241,.4)', honoree:'#2ec27e', no_show:'#ff8080' };
    return `<span style="background:${colors[s]||'#666'};color:#0f1410;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;">${esc(s)}</span>`;
  }
  function nuits(a, d) { try { return Math.max(1, Math.round((new Date(d)-new Date(a))/86400000)); } catch (e) { return 1; } }

  R.register('reservation_chambre', {
    async renderProfile({ proUserId, fields, root }) {
      const proNom = fields['Nom complet'] || 'cet établissement';
      root.innerHTML = `
        <p style="font-size:13px;color:rgba(248,246,241,.7);margin:0 0 14px;">Réserve ta chambre directement. ${esc(proNom)} confirme la disponibilité par WhatsApp.</p>
        <button id="wrc-open" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:12px 20px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">🛏️ Réserver une chambre</button>
      `;
      root.querySelector('#wrc-open').onclick = () => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const ov = modal(`
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:500px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;max-height:90vh;overflow-y:auto;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 16px;">Réservation — ${esc(proNom)}</h4>
            <div style="display:grid;gap:10px;">
              <input id="rc-nom" placeholder="Ton nom *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="rc-tel" placeholder="WhatsApp *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="rc-mail" type="email" placeholder="Email (optionnel)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <select id="rc-type" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <option value="">— Type de chambre —</option>
                <option>Standard</option><option>Confort</option><option>Suite</option><option>Deluxe</option>
              </select>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <input id="rc-cham" type="number" min="1" max="10" value="1" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;" placeholder="Chambres">
                <input id="rc-ad" type="number" min="1" max="20" value="1" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;" placeholder="Adultes">
                <input id="rc-en" type="number" min="0" max="10" value="0" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;" placeholder="Enfants">
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <label style="display:flex;flex-direction:column;font-size:11px;color:rgba(248,246,241,.6);">Arrivée<input id="rc-arr" type="date" min="${today}" value="${today}" style="margin-top:4px;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;"></label>
                <label style="display:flex;flex-direction:column;font-size:11px;color:rgba(248,246,241,.6);">Départ<input id="rc-dep" type="date" min="${tomorrow}" value="${tomorrow}" style="margin-top:4px;padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;"></label>
              </div>
              <textarea id="rc-msg" rows="2" placeholder="Demande spéciale (lit bébé, late check-in…)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;resize:vertical;"></textarea>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
              <button id="rc-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:10px 16px;cursor:pointer;">Annuler</button>
              <button id="rc-send" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Envoyer</button>
            </div>
          </div>`);
        ov.querySelector('#rc-cancel').onclick = () => ov.remove();
        ov.querySelector('#rc-send').onclick = async () => {
          const arr = ov.querySelector('#rc-arr').value;
          const dep = ov.querySelector('#rc-dep').value;
          if (!arr || !dep) { alert('Dates arrivée et départ requises.'); return; }
          if (new Date(dep) <= new Date(arr)) { alert('Le départ doit être après l\'arrivée.'); return; }
          const payload = {
            pro_user_id: proUserId,
            client_nom: ov.querySelector('#rc-nom').value.trim(),
            client_telephone: ov.querySelector('#rc-tel').value.trim(),
            client_email: ov.querySelector('#rc-mail').value.trim() || null,
            type_chambre: ov.querySelector('#rc-type').value || null,
            nb_chambres: parseInt(ov.querySelector('#rc-cham').value, 10) || 1,
            nb_adultes: parseInt(ov.querySelector('#rc-ad').value, 10) || 1,
            nb_enfants: parseInt(ov.querySelector('#rc-en').value, 10) || 0,
            arrivee: arr,
            depart: dep,
            message: ov.querySelector('#rc-msg').value.trim() || null,
          };
          if (!payload.client_nom || !payload.client_telephone) { alert('Nom et WhatsApp requis.'); return; }
          try {
            await R._api('reservation-chambre-create', payload);
            ov.innerHTML = `<div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:30px;max-width:420px;text-align:center;color:#F8F6F1;font-family:Poppins,sans-serif;"><div style="font-size:42px;margin-bottom:10px;">🛏️</div><h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 8px;">Demande envoyée</h4><p style="font-size:14px;color:rgba(248,246,241,.75);margin:0 0 18px;">${esc(proNom)} confirme par WhatsApp.</p><button id="rc-close" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;">Fermer</button></div>`;
            ov.querySelector('#rc-close').onclick = () => ov.remove();
          } catch (e) { alert(e.message); }
        };
      };
    },

    async renderDashboard({ proUserId, root }) {
      let list = [];
      try { const data = await R._api(`reservation-chambre-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' }); list = data.reservations || []; } catch (e) { console.warn(e); }
      root.innerHTML = `<div style="margin-bottom:12px;font-size:13px;color:rgba(248,246,241,.65);">Réservations chambre reçues — confirme, refuse, ou marque comme honorées.</div><div id="wrc-list" style="display:grid;gap:10px;"></div>`;
      const listEl = root.querySelector('#wrc-list');
      function row(r) {
        const div = document.createElement('div');
        div.style.cssText = 'background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;display:grid;gap:6px;';
        const n = nuits(r.arrivee, r.depart);
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
            <div style="font-weight:700;font-size:14px;">${esc(r.client_nom)} · ${r.nb_chambres} ch · ${r.nb_adultes}A${r.nb_enfants ? '+' + r.nb_enfants + 'E' : ''}</div>
            ${statutBadge(r.statut)}
          </div>
          <div style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(232,148,10,.85);">${esc(r.arrivee)} → ${esc(r.depart)} · ${n} nuit${n>1?'s':''}${r.type_chambre ? ' · ' + esc(r.type_chambre) : ''}</div>
          <div style="font-size:12px;color:rgba(248,246,241,.6);">📞 ${esc(r.client_telephone)}${r.client_email ? ' · ' + esc(r.client_email) : ''}${r.prix_total_fcfa ? ' · 💰 ' + fmt(r.prix_total_fcfa) : ''}</div>
          ${r.message ? `<div style="font-size:12px;color:rgba(248,246,241,.55);font-style:italic;">« ${esc(r.message)} »</div>` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
            ${r.statut === 'en_attente' ? `<button data-act="confirmee" style="background:#2ec27e;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">✓ Confirmer</button><button data-act="refusee" style="background:#ff8080;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">✗ Refuser</button>` : ''}
            ${r.statut === 'confirmee' ? `<button data-act="honoree" style="background:#2ec27e;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">→ Honorée</button><button data-act="no_show" style="background:#ff8080;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">→ No-show</button>` : ''}
            <a href="https://wa.me/${esc(r.client_telephone.replace(/\D/g,''))}" target="_blank" style="background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:4px 10px;text-decoration:none;font-size:11px;">💬</a>
          </div>`;
        div.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
          try { await R._api('reservation-chambre-update', { id: r.id, statut: b.dataset.act }); r.statut = b.dataset.act; const fresh = row(r); div.parentNode && div.parentNode.replaceChild(fresh, div); } catch (e) { alert(e.message); }
        });
        return div;
      }
      if (!list.length) listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucune réservation pour l'instant.</div>`;
      else list.forEach(r => listEl.appendChild(row(r)));
    },
  });
})();
