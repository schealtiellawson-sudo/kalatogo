// ================================================================
// WOLO Mes entretiens — liste à venir + passés (candidat OU recruteur)
// API : window.woloEntretiensList.load(containerId)
// Endpoint : entretien-list (GET, scope=all)
// ================================================================
(function () {
  const API = (a) => `/api/wolo-pay/${a}`;
  const wFetch = () => window.woloFetch || fetch;

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }) + ' à ' +
           d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  const TYPE_LABEL = { presentiel: '🏢 Présentiel', visio: '💻 Visio', telephone: '📞 Téléphone' };
  const TYPE_LIEU_FIELD = { presentiel: 'lieu', visio: 'lien_visio', telephone: 'telephone' };

  const RESULTAT_BADGE = {
    pending:        { label: 'À venir',        bg: 'rgba(232,148,10,.15)', color: '#E8940A' },
    concluant:      { label: 'Concluant',      bg: 'rgba(34,197,94,.15)',  color: '#22c55e' },
    non_concluant:  { label: 'Non concluant',  bg: 'rgba(239,68,68,.12)',  color: '#f87171' },
    annule:         { label: 'Annulé',         bg: 'rgba(255,255,255,.06)', color: 'rgba(248,246,241,.5)' },
  };

  async function load(containerId) {
    const container = document.getElementById(containerId || 'mes-entretiens-container');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement des entretiens...</div>';

    if (!window.currentUser?.id) {
      container.innerHTML = `<div style="text-align:center;padding:60px;color:rgba(248,246,241,.4);">Connecte-toi pour voir tes entretiens.</div>`;
      return;
    }

    try {
      const res = await wFetch()(API('entretien-list') + '?scope=all');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur chargement');
      const all = data.entretiens || [];
      const now = Date.now();
      const upcoming = all.filter(e => new Date(e.date_heure).getTime() >= now && e.resultat === 'pending')
                          .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));
      const past = all.filter(e => !(upcoming.includes(e)))
                      .sort((a, b) => new Date(b.date_heure) - new Date(a.date_heure));

      if (all.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:rgba(248,246,241,.5);font-family:Poppins,sans-serif;">
          <div style="font-size:48px;margin-bottom:12px;">📅</div>
          <p style="font-size:15px;margin:0 0 6px;">Aucun entretien planifié.</p>
          <p style="font-size:12px;margin:0;color:rgba(248,246,241,.35);">Quand un recruteur planifie un entretien avec toi, il apparaît ici.</p>
        </div>`;
        return;
      }

      container.innerHTML = `
        ${upcoming.length ? `
          <div style="margin-bottom:24px;">
            <div style="font-family:'Space Mono',monospace;font-size:11px;color:#E8940A;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">À venir (${upcoming.length})</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;">
              ${upcoming.map(renderCard).join('')}
            </div>
          </div>
        ` : ''}
        ${past.length ? `
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(248,246,241,.45);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Historique (${past.length})</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;">
              ${past.map(renderCard).join('')}
            </div>
          </div>
        ` : ''}
      `;
    } catch (e) {
      container.innerHTML = `<div style="padding:18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#f87171;font-size:13px;font-family:Poppins,sans-serif;">${escapeHtml(e.message)}</div>`;
    }
  }

  function renderCard(e) {
    const isRecru = e.role === 'recruteur';
    const peerLabel = isRecru ? 'Candidat' : 'Recruteur';
    const badge = RESULTAT_BADGE[e.resultat] || RESULTAT_BADGE.pending;
    const lieuField = TYPE_LIEU_FIELD[e.type];
    const lieu = e[lieuField] || '';
    const past = new Date(e.date_heure).getTime() < Date.now();

    return `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(232,148,10,.12);border-radius:14px;padding:16px;font-family:Poppins,sans-serif;color:#F8F6F1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px;">
          <div>
            <div style="font-size:11px;color:rgba(248,246,241,.45);text-transform:uppercase;letter-spacing:1px;">${TYPE_LABEL[e.type] || e.type}</div>
            <div style="font-family:Fraunces,serif;font-size:16px;font-weight:700;color:#F8F6F1;margin-top:2px;">${escapeHtml(e.offre_titre || 'Entretien')}</div>
          </div>
          <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${badge.bg};color:${badge.color};white-space:nowrap;">${badge.label}</span>
        </div>
        <div style="font-size:12px;color:rgba(248,246,241,.55);margin-bottom:8px;">📅 ${fmtDate(e.date_heure)}</div>
        ${lieu ? `<div style="font-size:12px;color:rgba(248,246,241,.55);margin-bottom:8px;word-break:break-all;">📍 ${escapeHtml(lieu)}</div>` : ''}
        <div style="font-size:11px;color:rgba(248,246,241,.4);margin-bottom:10px;">${peerLabel} · vous êtes ${isRecru ? 'recruteur' : 'candidat'}</div>
        ${isRecru && past && e.resultat === 'pending' ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button onclick="window.woloEntretiensList.setResultat('${e.id}','concluant')" style="padding:5px 10px;border-radius:8px;background:rgba(34,197,94,.15);color:#22c55e;border:none;cursor:pointer;font-size:12px;font-weight:700;">✓ Concluant</button>
            <button onclick="window.woloEntretiensList.setResultat('${e.id}','non_concluant')" style="padding:5px 10px;border-radius:8px;background:rgba(239,68,68,.12);color:#f87171;border:none;cursor:pointer;font-size:12px;font-weight:700;">✗ Non concluant</button>
            <button onclick="window.woloEntretiensList.setResultat('${e.id}','annule')" style="padding:5px 10px;border-radius:8px;background:rgba(255,255,255,.06);color:rgba(248,246,241,.6);border:none;cursor:pointer;font-size:12px;">Annuler</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  async function setResultat(entretienId, resultat) {
    try {
      const res = await wFetch()(API('entretien-upsert'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entretienId, resultat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      window.toast?.('Statut mis à jour ✓', 'success');
      load();
    } catch (e) {
      window.toast?.(e.message, 'error');
    }
  }

  window.woloEntretiensList = { load, setResultat };
  window.loadMesEntretiens = () => load('mes-entretiens-container');
})();
