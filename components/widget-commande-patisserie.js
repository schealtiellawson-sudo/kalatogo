// ================================================================
// Widget : Commande pâtisserie (boulangerie, gâteaux, pâtisseries)
// Endpoints : commande-patisserie-create / list / update
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
    const colors = { nouveau:'#E8940A', confirme:'#60a5fa', en_preparation:'#fbbf24', pret:'#2ec27e', livre:'#2ec27e', annule:'#ff8080' };
    return `<span style="background:${colors[s]||'#666'};color:#0f1410;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;">${esc(s)}</span>`;
  }

  R.register('commande_patisserie', {
    async renderProfile({ proUserId, fields, root }) {
      const proNom = fields['Nom complet'] || 'cette pâtisserie';
      root.innerHTML = `
        <p style="font-size:13px;color:rgba(248,246,241,.7);margin:0 0 14px;">Commande ton gâteau pour anniversaire, mariage ou événement. ${esc(proNom)} confirme par WhatsApp.</p>
        <button id="wcp-open" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:12px 20px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">🎂 Commander un gâteau</button>
      `;
      root.querySelector('#wcp-open').onclick = () => {
        const ov = modal(`
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:520px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;max-height:90vh;overflow-y:auto;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 16px;">Commande gâteau — ${esc(proNom)}</h4>
            <div style="display:grid;gap:10px;">
              <input id="cp-nom" placeholder="Ton nom *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cp-tel" placeholder="WhatsApp *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cp-type" placeholder="Type (Gâteau anniversaire, Pièce montée, …)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cp-saveurs" placeholder="Saveurs (Chocolat / Vanille / …)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cp-nb" type="number" min="1" placeholder="Nombre de personnes" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cp-msg" placeholder="Inscription sur le gâteau (ex: Joyeux anniversaire Awa)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cp-photo" placeholder="URL photo d'inspiration (optionnel)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <input id="cp-date" type="date" min="${new Date().toISOString().split('T')[0]}" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <input id="cp-heure" type="time" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(248,246,241,.85);"><input id="cp-livraison" type="checkbox"> Livraison souhaitée</label>
              <input id="cp-adresse" placeholder="Adresse de livraison (si oui)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cp-budget" type="number" placeholder="Budget FCFA (optionnel)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
              <button id="cp-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:10px 16px;cursor:pointer;">Annuler</button>
              <button id="cp-send" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Envoyer</button>
            </div>
          </div>`);
        ov.querySelector('#cp-cancel').onclick = () => ov.remove();
        ov.querySelector('#cp-send').onclick = async () => {
          const dateEv = ov.querySelector('#cp-date').value;
          if (!dateEv) { alert('Date de l\'événement requise.'); return; }
          const payload = {
            pro_user_id: proUserId,
            client_nom: ov.querySelector('#cp-nom').value.trim(),
            client_telephone: ov.querySelector('#cp-tel').value.trim(),
            type_produit: ov.querySelector('#cp-type').value.trim() || null,
            saveurs: ov.querySelector('#cp-saveurs').value.trim() || null,
            nb_personnes: ov.querySelector('#cp-nb').value ? parseInt(ov.querySelector('#cp-nb').value, 10) : null,
            message_personnalise: ov.querySelector('#cp-msg').value.trim() || null,
            photo_inspiration: ov.querySelector('#cp-photo').value.trim() || null,
            date_evenement: dateEv,
            heure_retrait: ov.querySelector('#cp-heure').value || null,
            livraison: ov.querySelector('#cp-livraison').checked,
            adresse_livraison: ov.querySelector('#cp-adresse').value.trim() || null,
            budget_fcfa: ov.querySelector('#cp-budget').value ? parseInt(ov.querySelector('#cp-budget').value, 10) : null,
          };
          if (!payload.client_nom || !payload.client_telephone) { alert('Nom et WhatsApp requis.'); return; }
          try {
            await R._api('commande-patisserie-create', payload);
            ov.innerHTML = `<div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:30px;max-width:420px;text-align:center;color:#F8F6F1;font-family:Poppins,sans-serif;"><div style="font-size:42px;margin-bottom:10px;">🎂</div><h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 8px;">Commande envoyée</h4><p style="font-size:14px;color:rgba(248,246,241,.75);margin:0 0 18px;">${esc(proNom)} confirme par WhatsApp.</p><button id="cp-close" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;">Fermer</button></div>`;
            ov.querySelector('#cp-close').onclick = () => ov.remove();
          } catch (e) { alert(e.message); }
        };
      };
    },

    async renderDashboard({ proUserId, root }) {
      let list = [];
      try { const data = await R._api(`commande-patisserie-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' }); list = data.commandes || []; } catch (e) { console.warn(e); }
      root.innerHTML = `<div style="margin-bottom:12px;font-size:13px;color:rgba(248,246,241,.65);">Commandes pâtisserie reçues — confirme, prépare, livre.</div><div id="wcp-list" style="display:grid;gap:10px;"></div>`;
      const listEl = root.querySelector('#wcp-list');
      function row(r) {
        const div = document.createElement('div');
        div.style.cssText = 'background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;display:grid;gap:6px;';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
            <div style="font-weight:700;font-size:14px;">${esc(r.client_nom)} · ${esc(r.type_produit || 'Commande')}</div>
            ${statutBadge(r.statut)}
          </div>
          <div style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(232,148,10,.85);">📅 ${esc(r.date_evenement)}${r.heure_retrait ? ' · ' + esc(r.heure_retrait) : ''}${r.livraison ? ' · 🚚 Livraison' : ''}</div>
          <div style="font-size:12px;color:rgba(248,246,241,.6);">📞 ${esc(r.client_telephone)}${r.nb_personnes ? ' · 👥 ' + r.nb_personnes + ' pers.' : ''}${r.budget_fcfa ? ' · 💰 ' + fmt(r.budget_fcfa) : ''}</div>
          ${r.saveurs ? `<div style="font-size:12px;color:rgba(248,246,241,.7);">🍫 ${esc(r.saveurs)}</div>` : ''}
          ${r.message_personnalise ? `<div style="font-size:12px;color:rgba(248,246,241,.65);font-style:italic;">« ${esc(r.message_personnalise)} »</div>` : ''}
          ${r.adresse_livraison ? `<div style="font-size:12px;color:rgba(248,246,241,.6);">📍 ${esc(r.adresse_livraison)}</div>` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
            ${['confirme','en_preparation','pret','livre','annule'].map(s => r.statut === s ? '' : `<button data-act="${s}" style="background:rgba(232,148,10,.15);border:1px solid rgba(232,148,10,.4);color:#E8940A;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">→ ${s}</button>`).join('')}
            <a href="https://wa.me/${esc(r.client_telephone.replace(/\D/g,''))}" target="_blank" style="background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:4px 10px;text-decoration:none;font-size:11px;">💬</a>
          </div>`;
        div.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
          try { await R._api('commande-patisserie-update', { id: r.id, statut: b.dataset.act }); r.statut = b.dataset.act; const fresh = row(r); div.parentNode && div.parentNode.replaceChild(fresh, div); } catch (e) { alert(e.message); }
        });
        return div;
      }
      if (!list.length) listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucune commande pour l'instant.</div>`;
      else list.forEach(r => listEl.appendChild(row(r)));
    },
  });
})();
