// ================================================================
// Widget : RDV véhicule (mécanicien auto/moto, garage, lavage)
// Endpoints : rdv-mecano-create / rdv-mecano-list / rdv-mecano-update
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
    const colors = { nouveau:'#E8940A', confirme:'#2ec27e', refuse:'#ff8080', annule:'rgba(248,246,241,.4)', honore:'#2ec27e' };
    return `<span style="background:${colors[s]||'#666'};color:#0f1410;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;">${esc(s)}</span>`;
  }

  R.register('rdv_mecano', {
    async renderProfile({ proUserId, fields, root }) {
      const proNom = fields['Nom complet'] || 'ce garage';
      root.innerHTML = `
        <p style="font-size:13px;color:rgba(248,246,241,.7);margin:0 0 14px;">Prends RDV pour ton véhicule. ${esc(proNom)} confirme par WhatsApp.</p>
        <button id="wrm-open" style="background:#E8940A;color:#0f1410;border:none;border-radius:10px;padding:12px 20px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;">🔩 Prendre RDV véhicule</button>
      `;
      root.querySelector('#wrm-open').onclick = () => {
        const ov = modal(`
          <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:22px;max-width:500px;width:100%;color:#F8F6F1;font-family:Poppins,sans-serif;">
            <h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 16px;">RDV véhicule — ${esc(proNom)}</h4>
            <div style="display:grid;gap:10px;">
              <input id="rm-nom" placeholder="Ton nom *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <input id="rm-tel" placeholder="WhatsApp *" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <input id="rm-marque" placeholder="Marque (Toyota…)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <input id="rm-modele" placeholder="Modèle (Corolla…)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
              <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;">
                <input id="rm-annee" type="number" placeholder="Année" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <input id="rm-imm" placeholder="Immatriculation" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
              <input id="rm-type" placeholder="Type d'intervention (vidange, freins, diagnostic…)" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              <textarea id="rm-desc" rows="2" placeholder="Décris le problème ou ce que tu veux faire…" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;resize:vertical;"></textarea>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <input id="rm-date" type="date" min="${new Date().toISOString().split('T')[0]}" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
                <input id="rm-heure" type="time" style="padding:10px;background:#16201a;border:1px solid rgba(232,148,10,.2);border-radius:8px;color:#F8F6F1;">
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
              <button id="rm-cancel" style="background:none;border:1px solid rgba(248,246,241,.2);color:#F8F6F1;border-radius:8px;padding:10px 16px;cursor:pointer;">Annuler</button>
              <button id="rm-send" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Envoyer</button>
            </div>
          </div>`);
        ov.querySelector('#rm-cancel').onclick = () => ov.remove();
        ov.querySelector('#rm-send').onclick = async () => {
          const payload = {
            pro_user_id: proUserId,
            client_nom: ov.querySelector('#rm-nom').value.trim(),
            client_telephone: ov.querySelector('#rm-tel').value.trim(),
            marque: ov.querySelector('#rm-marque').value.trim() || null,
            modele: ov.querySelector('#rm-modele').value.trim() || null,
            annee: ov.querySelector('#rm-annee').value ? parseInt(ov.querySelector('#rm-annee').value, 10) : null,
            immatriculation: ov.querySelector('#rm-imm').value.trim() || null,
            type_intervention: ov.querySelector('#rm-type').value.trim() || null,
            description: ov.querySelector('#rm-desc').value.trim() || null,
            date_souhaitee: ov.querySelector('#rm-date').value || null,
            heure_souhaitee: ov.querySelector('#rm-heure').value || null,
          };
          if (!payload.client_nom || !payload.client_telephone) { alert('Nom et WhatsApp requis.'); return; }
          try {
            await R._api('rdv-mecano-create', payload);
            ov.innerHTML = `<div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:14px;padding:30px;max-width:420px;text-align:center;color:#F8F6F1;font-family:Poppins,sans-serif;"><div style="font-size:42px;margin-bottom:10px;">✓</div><h4 style="font-family:Fraunces,serif;font-style:italic;color:#E8940A;margin:0 0 8px;">RDV demandé</h4><p style="font-size:14px;color:rgba(248,246,241,.75);margin:0 0 18px;">${esc(proNom)} confirme par WhatsApp.</p><button id="rm-close" style="background:#E8940A;color:#0f1410;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;">Fermer</button></div>`;
            ov.querySelector('#rm-close').onclick = () => ov.remove();
          } catch (e) { alert(e.message); }
        };
      };
    },

    async renderDashboard({ proUserId, root }) {
      let list = [];
      try { const data = await R._api(`rdv-mecano-list?pro_user_id=${encodeURIComponent(proUserId)}`, null, { method: 'GET' }); list = data.rdvs || []; } catch (e) { console.warn(e); }
      root.innerHTML = `<div style="margin-bottom:12px;font-size:13px;color:rgba(248,246,241,.65);">RDV véhicule reçus — confirme ou refuse, le client est notifié par WhatsApp.</div><div id="wrm-list" style="display:grid;gap:10px;"></div>`;
      const listEl = root.querySelector('#wrm-list');
      function row(r) {
        const div = document.createElement('div');
        div.style.cssText = 'background:#16201a;border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px 14px;display:grid;gap:6px;';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
            <div style="font-weight:700;font-size:14px;">${esc(r.client_nom)} · ${esc(r.marque || '?')} ${esc(r.modele || '')}</div>
            ${statutBadge(r.statut)}
          </div>
          <div style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(232,148,10,.85);">${esc(r.date_souhaitee || '?')} · ${esc(r.heure_souhaitee || '?')}${r.immatriculation ? ' · 🚗 ' + esc(r.immatriculation) : ''}</div>
          <div style="font-size:12px;color:rgba(248,246,241,.6);">📞 ${esc(r.client_telephone)}${r.type_intervention ? ' · 🔧 ' + esc(r.type_intervention) : ''}</div>
          ${r.description ? `<div style="font-size:12px;color:rgba(248,246,241,.55);font-style:italic;">« ${esc(r.description)} »</div>` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
            ${r.statut === 'nouveau' ? `<button data-act="confirme" style="background:#2ec27e;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">✓ Confirmer</button><button data-act="refuse" style="background:#ff8080;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">✗ Refuser</button>` : ''}
            ${r.statut === 'confirme' ? `<button data-act="honore" style="background:#2ec27e;color:#0f1410;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:700;">→ Honoré</button>` : ''}
            <a href="https://wa.me/${esc(r.client_telephone.replace(/\D/g,''))}" target="_blank" style="background:none;border:1px solid rgba(232,148,10,.4);color:#F8F6F1;border-radius:6px;padding:4px 10px;text-decoration:none;font-size:11px;">💬 WhatsApp</a>
          </div>`;
        div.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
          try { await R._api('rdv-mecano-update', { id: r.id, statut: b.dataset.act }); r.statut = b.dataset.act; const fresh = row(r); div.parentNode && div.parentNode.replaceChild(fresh, div); } catch (e) { alert(e.message); }
        });
        return div;
      }
      if (!list.length) listEl.innerHTML = `<div style="color:rgba(248,246,241,.55);font-size:13px;">Aucun RDV pour l'instant.</div>`;
      else list.forEach(r => listEl.appendChild(row(r)));
    },
  });
})();
