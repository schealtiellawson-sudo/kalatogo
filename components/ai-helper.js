// ================================================================
// WOLO AI Helper — client frontend pour /api/wolo-pay/ai-query
// Expose : window.woloAi.query(task, input, plan) + helpers UI
// Pattern IIFE comme les autres composants.
// ================================================================
(function () {
  const API_URL = '/api/wolo-pay/ai-query';

  const wFetch = () => window.woloFetch || fetch;

  async function query(task, input, plan = 'gratuit') {
    const fn = wFetch();
    const res = await fn(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, input, plan }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ----------------------------------------------------------------
  // Modal générique affichage résultat IA
  // ----------------------------------------------------------------
  function showAiModal({ title, loading = false, content = '', footer = '' }) {
    let overlay = document.getElementById('wolo-ai-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'wolo-ai-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div style="background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:16px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:10px;color:#E8940A;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">Agent IA WOLO</div>
            <h3 style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:#F8F6F1;margin:0;">${title}</h3>
          </div>
          <button onclick="document.getElementById('wolo-ai-modal').remove()" style="background:none;border:none;color:rgba(248,246,241,.5);font-size:24px;cursor:pointer;line-height:1;">×</button>
        </div>
        <div id="wolo-ai-modal-body" style="font-family:Poppins,sans-serif;font-size:14px;color:#F8F6F1;line-height:1.6;">
          ${loading
            ? '<div style="text-align:center;padding:40px 0;"><div style="display:inline-block;width:32px;height:32px;border:3px solid rgba(232,148,10,.2);border-top-color:#E8940A;border-radius:50%;animation:spin 0.8s linear infinite;"></div><div style="margin-top:12px;color:rgba(248,246,241,.5);font-size:12px;">Analyse en cours…</div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>'
            : content}
        </div>
        ${footer ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06);">${footer}</div>` : ''}
      </div>
    `;
    return overlay;
  }

  function updateAiModalBody(html, footer = '') {
    const body = document.getElementById('wolo-ai-modal-body');
    if (body) body.innerHTML = html;
    const overlay = document.getElementById('wolo-ai-modal');
    if (overlay && footer) {
      const container = overlay.querySelector('div > div:last-child');
      if (container && container.id !== 'wolo-ai-modal-body') container.innerHTML = footer;
    }
  }

  function closeAiModal() {
    const m = document.getElementById('wolo-ai-modal');
    if (m) m.remove();
  }

  // ----------------------------------------------------------------
  // SCORING CANDIDAT ↔ OFFRE
  // ----------------------------------------------------------------
  async function scoreCandidat(candidatureRecord, offreRecord) {
    const c = candidatureRecord.fields;
    const o = offreRecord.fields;
    showAiModal({ title: 'Analyse IA candidat', loading: true });

    const input = `OFFRE:
Titre: ${o['Titre'] || ''}
Métier: ${o['Métier'] || ''}
Quartier: ${o['Quartier'] || ''}, ${o['Ville'] || ''}
Type: ${o['Type de contrat'] || ''}
Expérience requise: ${o['Expérience requise'] || 'non précisée'}
Description: ${o['Description'] || ''}

CANDIDAT:
Nom: ${c['Candidat Nom'] || ''}
Métier: ${c['Candidat Métier'] || ''}
Score WOLO: ${c['Candidat Score WOLO'] || 0}/100
Message: ${c['Message'] || ''}`;

    try {
      const plan = window.currentPrestataire?.fields?.['Abonnement'] === 'Pro' ? 'pro' : 'gratuit';
      const { result, provider, cached, quota } = await query('score-candidat', input, plan);
      renderScoreResult(result, { provider, cached, quota });
    } catch (err) {
      renderError(err);
    }
  }

  function renderScoreResult(r, meta) {
    const score = r?.score || 0;
    const color = score >= 70 ? '#22c55e' : score >= 40 ? '#E8940A' : '#f87171';
    const html = `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-family:'Space Mono',monospace;font-size:56px;font-weight:900;color:${color};line-height:1;">${score}</div>
        <div style="font-size:11px;color:rgba(248,246,241,.4);text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Score IA / 100</div>
      </div>
      <div style="margin-bottom:16px;padding:14px;background:rgba(255,255,255,.04);border-radius:10px;">
        <div style="font-size:12px;color:rgba(248,246,241,.5);margin-bottom:6px;">Analyse</div>
        <div>${r?.justification || '—'}</div>
      </div>
      ${Array.isArray(r?.forces) && r.forces.length ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:#22c55e;margin-bottom:6px;font-weight:700;">✓ Forces</div>
          <ul style="margin:0;padding-left:20px;color:rgba(248,246,241,.8);">
            ${r.forces.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join('')}
          </ul>
        </div>` : ''}
      ${Array.isArray(r?.reserves) && r.reserves.length ? `
        <div style="margin-bottom:8px;">
          <div style="font-size:12px;color:#f87171;margin-bottom:6px;font-weight:700;">⚠ Réserves</div>
          <ul style="margin:0;padding-left:20px;color:rgba(248,246,241,.8);">
            ${r.reserves.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join('')}
          </ul>
        </div>` : ''}
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05);font-size:11px;color:rgba(248,246,241,.35);font-family:'Space Mono',monospace;">
        ${meta?.cached ? '⚡ cache' : `⚙ ${meta?.provider || '—'}`} · ${meta?.quota?.used || 0}/${meta?.quota?.limit || '—'} req/j
      </div>
    `;
    updateAiModalBody(html);
  }

  // ----------------------------------------------------------------
  // AIDE CV — améliore une section
  // ----------------------------------------------------------------
  async function ameliorerCv(sectionText, onApply) {
    showAiModal({ title: 'Amélioration CV', loading: true });
    try {
      const plan = window.currentPrestataire?.fields?.['Abonnement'] === 'Pro' ? 'pro' : 'gratuit';
      const { result, provider, quota } = await query('cv-help', sectionText, plan);
      const improved = typeof result === 'string' ? result : JSON.stringify(result);
      const id = 'ai-cv-result-' + Date.now();
      updateAiModalBody(`
        <div style="font-size:12px;color:rgba(248,246,241,.5);margin-bottom:8px;">Original</div>
        <div style="padding:12px;background:rgba(255,255,255,.03);border-radius:8px;margin-bottom:14px;font-size:13px;color:rgba(248,246,241,.6);">${escapeHtml(sectionText)}</div>
        <div style="font-size:12px;color:#E8940A;margin-bottom:8px;font-weight:700;">✨ Proposition IA</div>
        <div id="${id}" style="padding:14px;background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.25);border-radius:10px;">${escapeHtml(improved)}</div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button id="ai-apply-btn" style="flex:1;padding:10px;border-radius:10px;background:#E8940A;color:#0f1410;font-weight:700;border:none;cursor:pointer;">Appliquer</button>
          <button onclick="document.getElementById('wolo-ai-modal').remove()" style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,.06);color:#F8F6F1;border:1px solid rgba(255,255,255,.1);cursor:pointer;">Garder l'original</button>
        </div>
        <div style="margin-top:14px;font-size:11px;color:rgba(248,246,241,.35);font-family:'Space Mono',monospace;">⚙ ${provider} · ${quota?.used || 0}/${quota?.limit || '—'} req/j</div>
      `);
      const btn = document.getElementById('ai-apply-btn');
      if (btn && typeof onApply === 'function') {
        btn.addEventListener('click', () => { onApply(improved); closeAiModal(); });
      }
    } catch (err) {
      renderError(err);
    }
  }

  // ----------------------------------------------------------------
  // PRÉPA ENTRETIEN — 5 questions type + conseils
  // ----------------------------------------------------------------
  async function preparerEntretien(offre) {
    showAiModal({ title: 'Préparation entretien', loading: true });
    const input = `Offre: ${offre.fields?.['Titre'] || ''}
Métier: ${offre.fields?.['Métier'] || ''}
Expérience requise: ${offre.fields?.['Expérience requise'] || 'non précisée'}
Description: ${offre.fields?.['Description'] || ''}`;
    try {
      const plan = window.currentPrestataire?.fields?.['Abonnement'] === 'Pro' ? 'pro' : 'gratuit';
      const { result, provider, cached, quota } = await query('interview-prep', input, plan);
      const questions = result?.questions || [];
      const html = questions.length
        ? questions.map((q, i) => `
            <div style="margin-bottom:16px;padding:14px;background:rgba(255,255,255,.04);border-radius:10px;border-left:3px solid #E8940A;">
              <div style="font-size:11px;color:#E8940A;margin-bottom:6px;font-family:'Space Mono',monospace;">Q${i + 1}</div>
              <div style="font-weight:600;margin-bottom:8px;">${escapeHtml(q.q)}</div>
              <ul style="margin:0;padding-left:18px;color:rgba(248,246,241,.7);font-size:13px;">
                ${(q.tips || []).map(t => `<li style="margin-bottom:3px;">${escapeHtml(t)}</li>`).join('')}
              </ul>
            </div>
          `).join('')
        : '<div style="color:rgba(248,246,241,.5);text-align:center;padding:20px;">Aucune question générée.</div>';
      updateAiModalBody(html + `
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05);font-size:11px;color:rgba(248,246,241,.35);font-family:'Space Mono',monospace;">
          ${cached ? '⚡ cache' : `⚙ ${provider}`} · ${quota?.used || 0}/${quota?.limit || '—'} req/j
        </div>
      `);
    } catch (err) {
      renderError(err);
    }
  }

  // ----------------------------------------------------------------
  // ANALYSE QUALITÉ ANNONCE (pour recruteur avant publication)
  // ----------------------------------------------------------------
  async function analyserAnnonce(offreFields) {
    showAiModal({ title: 'Qualité de ton annonce', loading: true });
    const input = `Titre: ${offreFields['Titre'] || ''}
Métier: ${offreFields['Métier'] || ''}
Quartier/Ville: ${offreFields['Quartier'] || ''}, ${offreFields['Ville'] || ''}
Type: ${offreFields['Type de contrat'] || ''}
Salaire min: ${offreFields['Salaire min FCFA'] || '—'}
Salaire max: ${offreFields['Salaire max FCFA'] || '—'}
Expérience: ${offreFields['Expérience requise'] || '—'}
Description: ${offreFields['Description'] || ''}`;
    try {
      const plan = window.currentPrestataire?.fields?.['Abonnement'] === 'Pro' ? 'pro' : 'gratuit';
      const { result, provider, cached, quota } = await query('annonce-qualite', input, plan);
      const score = result?.score || 0;
      const color = score >= 70 ? '#22c55e' : score >= 40 ? '#E8940A' : '#f87171';
      const html = `
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-family:'Space Mono',monospace;font-size:48px;font-weight:900;color:${color};line-height:1;">${score}/100</div>
          <div style="font-size:11px;color:rgba(248,246,241,.4);text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Qualité annonce</div>
        </div>
        ${listBlock('✓ Points forts', result?.points_forts, '#22c55e')}
        ${listBlock('⚠ Manques', result?.manques, '#E8940A')}
        ${listBlock('🚨 Risques arnaque', result?.risques_arnaque, '#f87171')}
        ${listBlock('💡 Suggestions', result?.suggestions, '#60a5fa')}
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05);font-size:11px;color:rgba(248,246,241,.35);font-family:'Space Mono',monospace;">
          ${cached ? '⚡ cache' : `⚙ ${provider}`} · ${quota?.used || 0}/${quota?.limit || '—'} req/j
        </div>
      `;
      updateAiModalBody(html);
    } catch (err) {
      renderError(err);
    }
  }

  function listBlock(title, items, color) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;color:${color};margin-bottom:6px;font-weight:700;">${title}</div>
        <ul style="margin:0;padding-left:20px;color:rgba(248,246,241,.8);font-size:13px;">
          ${items.map(it => `<li style="margin-bottom:3px;">${escapeHtml(it)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderError(err) {
    const quota = err?.data?.limit;
    const msg = err?.status === 429
      ? `Quota IA atteint (${err.data?.used || 0}/${quota || '—'} requêtes aujourd'hui). Passe en Pro pour plus.`
      : err?.status === 503
      ? `Aucun provider IA n'est configuré. Contacte l'admin.`
      : `Impossible d'obtenir une réponse : ${err?.message || 'erreur inconnue'}`;
    updateAiModalBody(`
      <div style="padding:18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#f87171;font-size:13px;">${msg}</div>
      <div style="margin-top:14px;text-align:center;">
        <button onclick="document.getElementById('wolo-ai-modal').remove()" style="padding:10px 20px;border-radius:10px;background:rgba(255,255,255,.06);color:#F8F6F1;border:1px solid rgba(255,255,255,.1);cursor:pointer;">Fermer</button>
      </div>
    `);
  }

  // ----------------------------------------------------------------
  // API publique
  // ----------------------------------------------------------------
  window.woloAi = {
    query,
    scoreCandidat,
    ameliorerCv,
    preparerEntretien,
    analyserAnnonce,
    close: closeAiModal,
  };
})();
