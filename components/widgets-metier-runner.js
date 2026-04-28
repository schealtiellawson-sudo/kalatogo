// ================================================================
// WOLO Market — Runner widgets métier
// Affiche dynamiquement les widgets adaptés au métier d'un prestataire,
// soit sur son profil public, soit dans son dashboard.
//
// API :
//   window.WoloWidgetsRunner.injectOnProfile(record, container)
//   window.WoloWidgetsRunner.injectOnDashboard(record, container)
//   window.WoloWidgetsRunner.register(key, { renderProfile, renderDashboard })
//
// Chaque composant widget s'enregistre avec son rendu pour profil public
// et/ou dashboard. Le runner ne sait que orchestrer, pas afficher.
// ================================================================
(function () {
  const REG = {};

  function register(key, impl) {
    REG[key] = Object.assign({}, REG[key] || {}, impl || {});
  }

  function getCfg() {
    return window.WoloWidgetsConfig;
  }

  function makeSection(title, icon, body) {
    const wrap = document.createElement('section');
    wrap.className = 'wolo-widget-metier';
    wrap.style.cssText = 'background:#0f1410;border:1px solid rgba(232,148,10,.18);border-radius:14px;padding:18px;margin:18px 0;color:#F8F6F1;font-family:Poppins,sans-serif;';
    const h = document.createElement('h3');
    h.style.cssText = 'font-family:Fraunces,serif;font-style:italic;font-size:20px;color:#E8940A;margin:0 0 14px;display:flex;align-items:center;gap:10px;';
    h.innerHTML = `<span>${icon || ''}</span><span>${title}</span>`;
    wrap.appendChild(h);
    wrap.appendChild(body);
    return wrap;
  }

  function makeFallback(meta) {
    const div = document.createElement('div');
    div.style.cssText = 'color:rgba(248,246,241,.55);font-size:13px;font-family:Poppins,sans-serif;';
    div.textContent = `Le widget "${meta.label}" est en cours de finalisation.`;
    return div;
  }

  async function injectOnProfile(record, container) {
    const cfg = getCfg();
    if (!cfg || !record || !container) return;
    const fields = record.fields || {};
    const metier = fields['Métier principal'] || '';
    const proUserId = fields['User ID'] || record.user_id || null;
    const keys = cfg.getWidgetsForProfilePublic(metier);
    for (const key of keys) {
      const meta = cfg.getWidgetMeta(key);
      if (!meta) continue;
      const impl = REG[key];
      const body = document.createElement('div');
      try {
        if (impl && typeof impl.renderProfile === 'function') {
          await impl.renderProfile({ record, fields, proUserId, root: body });
        } else {
          body.appendChild(makeFallback(meta));
        }
      } catch (e) {
        console.warn('[widgets] erreur', key, e);
        body.appendChild(makeFallback(meta));
      }
      container.appendChild(makeSection(meta.label, meta.icon, body));
    }
  }

  async function injectOnDashboard(record, container) {
    const cfg = getCfg();
    if (!cfg || !record || !container) return;
    const fields = record.fields || {};
    const metier = fields['Métier principal'] || '';
    const proUserId = fields['User ID'] || record.user_id || null;
    const keys = cfg.getWidgetsForDashboard(metier);
    container.innerHTML = '';
    if (keys.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:rgba(248,246,241,.55);font-size:13px;padding:18px;font-family:Poppins,sans-serif;';
      empty.textContent = "Aucun widget spécifique à ton métier pour le moment. Renseigne ton « Métier principal » pour activer les fonctionnalités adaptées.";
      container.appendChild(empty);
      return;
    }
    for (const key of keys) {
      const meta = cfg.getWidgetMeta(key);
      if (!meta) continue;
      const impl = REG[key];
      const body = document.createElement('div');
      try {
        if (impl && typeof impl.renderDashboard === 'function') {
          await impl.renderDashboard({ record, fields, proUserId, root: body });
        } else {
          body.appendChild(makeFallback(meta));
        }
      } catch (e) {
        console.warn('[widgets] erreur dash', key, e);
        body.appendChild(makeFallback(meta));
      }
      container.appendChild(makeSection(meta.label, meta.icon, body));
    }
  }

  // Helpers HTTP partagés par les composants widgets
  async function api(action, body, opts) {
    const wFetch = window.woloFetch || fetch;
    const init = {
      method: (opts && opts.method) || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) init.body = JSON.stringify(body);
    const res = await wFetch(`/api/wolo-pay/${action}`, init);
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmtFcfa(n) {
    if (n == null || n === '') return '';
    const v = Number(n);
    if (Number.isNaN(v)) return '';
    return v.toLocaleString('fr-FR') + ' FCFA';
  }

  window.WoloWidgetsRunner = {
    register,
    injectOnProfile,
    injectOnDashboard,
    _api: api,
    _escapeHtml: escapeHtml,
    _fmtFcfa: fmtFcfa,
  };
})();
