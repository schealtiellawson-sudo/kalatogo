// ================================================================
// Widget : Commande sur mesure (cordonnier, tailleur, bijoutier)
// Endpoints : commande-facon-create / commande-facon-list / commande-facon-update
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
    const colors = { nouveau:'#E8940A', vu:'#60a5fa', en_cours:'#fbbf24', pret:'#2ec27e', livre:'#2ec27e', annule:'#ff8080' };
    return `<span style="background:${colors[s]||'#666'};color:#0f1410;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.05em;">${esc(s)}</span>`;
  }

  R.register('commande_facon', {
    async renderProfile({ proUserId, fields, root }) {
      const proNom = fields['Nom complet'] || 'cet artisan';
      root.innerHTML = `
        <p style="font-size:13px;color:rgba(248,246,241,.7);margin:0 0 14px;">Commande sur mesure — décris ce que tu veux et joins une photo modèle. ${esc(proNom)} te répond par WhatsApp.</p>
        <button id="wcf-open" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:12px 20px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">✂️ Faire une demande sur mesure</button>
      `;
      root.querySelector('#wcf-open').onclick = () => {
        const ov = modal(`
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:500px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 16px;">Commande sur mesure — ${esc(proNom)}</h4>
            <div style="display:grid;gap:10px;">
              <input id="cf-nom" placeholder="Ton nom *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cf-tel" placeholder="WhatsApp *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="cf-type" placeholder="Type d'article (Robe, Chaussures, Bague…)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <textarea id="cf-desc" rows="4" placeholder="Décris l'article, taille, tissu, couleurs… *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;resize:vertical;"></textarea>
              <input id="cf-photo" placeholder="URL d'une photo modèle (optionnel)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <input id="cf-date" type="date" min="${new Date().toISOString().split('T')[0]}" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <input id="cf-budget" type="number" placeholder="Budget FCFA" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
              <button id="cf-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:10px 16px;cursor:pointer;">Annuler</button>
              <button id="cf-send" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Envoyer</button>
            </div>
          </div>`);
        ov.querySelector('#cf-cancel').onclick = () => ov.remove();
        ov.querySelector('#cf-send').onclick = async () => {
          const photoUrl = ov.querySelector('#cf-photo').value.trim();
          const payload = {
            pro_user_id: proUserId,
            client_nom: ov.querySelector('#cf-nom').value.trim(),
            client_telephone: ov.querySelector('#cf-tel').value.trim(),
            type_article: ov.querySelector('#cf-type').value.trim() || null,
            description: ov.querySelector('#cf-desc').value.trim(),
            photos_modele: photoUrl ? [photoUrl] : [],
            date_voulue: ov.querySelector('#cf-date').value || null,
            budget_fcfa: ov.querySelector('#cf-budget').value ? parseInt(ov.querySelector('#cf-budget').value, 10) : null,
          };
          if (!payload.client_nom || !payload.client_telephone || !payload.description) { alert('Nom, WhatsApp et description requis.'); return; }
          try {
            await R._api('commande-facon-create', payload);
            ov.innerHTML = `<div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:30px;max-width:420px;text-align:center;color:#F8F6F1;font-family:Poppins,sans-serif;"><div style="font-size:42px;margin-bottom:10px;">✓</div><h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 8px;">Demande envoyée</h4><p style="font-size:14px;color:rgba(248,246,241,.75);margin:0 0 18px;">${esc(proNom)} va te répondre par WhatsApp.</p><button id="cf-close" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;">Fermer</button></div>`;
            ov.querySelector('#cf-close').onclick = () => ov.remove();
          } catch (e) { alert(e.message); }
        };
      };
    },

    async renderDashboard({ proUserId, root }) {
      let list = [];
      try { const data = await R._api(`commande-facon-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' }); list = data.commandes || []; } catch (e) { console.warn(e); }
      root.innerHTML = `<div style="margin-bottom:12px;font-size:13px;color:rgba(248,246,241,.65);">Commandes sur mesure reçues — accuse réception, réponds, marque l'avancement.</div><div id="wcf-list" style="display:grid;gap:10px;"></div>`;
      const listEl = root.querySelector('#wcf-list');
      function row(r) {
        const div = document.createElement('div');
        div.style.cssText = 'background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;display:grid;gap:6px;';
        const photoHtml = (r.photos_modele && r.photos_modele[0]) ? `<a href="${esc(r.photos_modele[0])}" target="_blank" style="color:#E8940A;font-size:12px;">📷 Voir le modèle</a>` : '';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
            <div style="font-weight:700;font-size:14px;">${esc(r.client_nom)}${r.type_article ? ' · ' + esc(r.type_article) : ''}</div>
            ${statutBadge(r.statut)}
          </div>
          <div style="font-size:12px;color:rgba(248,246,241,.6);">📞 ${esc(r.client_telephone)}${r.budget_fcfa ? ` · 💰 ${fmt(r.budget_fcfa)}` : ''}${r.date_voulue ? ` · 📅 ${esc(r.date_voulue)}` : ''}</div>
          <div style="font-size:13px;color:rgba(248,246,241,.85);font-style:italic;">« ${esc(r.description)} »</div>
          ${photoHtml}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
            ${['vu','en_cours','pret','livre','annule'].map(s => r.statut === s ? '' : `<button data-act="${s}" style="background:rgba(232,148,10,.15);border:1px solid rgba(232,148,10,.4);color:#E8940A;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">→ ${s}</button>`).join('')}
            <a href="https://wa.me/${esc(r.client_telephone.replace(/\D/g,''))}" target="_blank" style="background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:4px 10px;text-decoration:none;font-size:11px;">💬 WhatsApp</a>
          </div>`;
        div.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
          try { await R._api('commande-facon-update', { id: r.id, statut: b.dataset.act }); r.statut = b.dataset.act; const fresh = row(r); div.parentNode && div.parentNode.replaceChild(fresh, div); } catch (e) { alert(e.message); }
        });
        return div;
      }
      if (!list.length) listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucune commande pour l'instant.</div>`;
      else list.forEach(r => listEl.appendChild(row(r)));
    },
  });
})();
