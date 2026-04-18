// ══════════════════════════════════════════
// King & Queen WOLO — Concours beauté/charme
// Duels Tinder infini + Classement + Finale TG vs BJ
// ══════════════════════════════════════════

(function(){
  'use strict';

  const API = '/api/wolo-pay';
  const wFetch = window.woloFetch || fetch;

  const state = {
    tab: 'accueil',
    photos: [],
    duelQueue: [],
    duelIndex: 0,
    duelCount: 0,
    duelStreak: 0,
    duelAnimating: false,
    duelSwipeDir: null,
    classementGenre: 'femme',
    classementPays: 'tous',
    mesPhotos: [],
    leaderboard: [],
    finale: null,
    loading: false,
    poolSize: 0,
  };

  // ──────────────────────────────────────────
  // LOADER PRINCIPAL
  // ──────────────────────────────────────────
  window.loadKingQueen = async function(){
    const root = document.getElementById('king-queen-root');
    if (!root) return;
    root.innerHTML = skeletonHTML();
    render();
    await loadTab(state.tab);
  };

  async function loadTab(tab){
    state.tab = tab;
    if (tab === 'accueil') { /* static */ }
    else if (tab === 'duels') await loadDuelBatch();
    else if (tab === 'classement') await loadClassement();
    else if (tab === 'participer') await loadMesPhotos();
    render();
  }

  async function loadDuelBatch(){
    state.loading = true;
    try {
      const params = new URLSearchParams({ mode: 'duel', batch: '20', contest: 'king-queen' });
      if (window.currentUser?.id) params.set('viewer_id', window.currentUser.id);
      const res = await fetch(`${API}/feed-discover?${params}`).then(r => r.json());
      state.duelQueue = res?.pairs || [];
      state.duelIndex = 0;
      state.poolSize = res?.pool_size || 0;
    } catch(e){ console.warn('[kq] duel batch', e); state.duelQueue = []; }
    state.loading = false;
  }

  async function loadClassement(){
    state.loading = true;
    try {
      const params = new URLSearchParams({ type: 'king-queen', genre: state.classementGenre });
      if (state.classementPays !== 'tous') params.set('pays', state.classementPays);
      const res = await fetch(`${API}/leaderboard?${params}`).then(r => r.json());
      state.leaderboard = res?.leaderboard || [];
    } catch(e){ console.warn('[kq] classement', e); state.leaderboard = []; }
    state.loading = false;
  }

  async function loadMesPhotos(){
    if (!window.currentUser?.id) { state.mesPhotos = []; return; }
    state.loading = true;
    try {
      const res = await fetch(`${API}/feed-list?user_id=${window.currentUser.id}&contest=king-queen&limit=10`).then(r => r.json());
      state.mesPhotos = res?.photos || [];
    } catch(e){ console.warn('[kq] mes photos', e); state.mesPhotos = []; }
    state.loading = false;
  }

  // ──────────────────────────────────────────
  // RENDU
  // ──────────────────────────────────────────
  function render(){
    const root = document.getElementById('king-queen-root');
    if (!root) return;
    root.innerHTML = `
      <div class="kq-container" style="color:#F8F6F1;font-family:'Poppins',sans-serif;max-width:1100px;margin:0 auto;padding:0 16px;">
        ${heroHTML()}
        ${tabsHTML()}
        <div class="kq-body" style="padding:20px 0 80px;">
          ${state.loading ? loaderHTML() : contentHTML()}
        </div>
      </div>
    `;
  }

  function heroHTML(){
    return `
      <div style="background:linear-gradient(135deg,#0f1410 0%,#1a1f1a 100%);border:1px solid rgba(232,148,10,.3);border-radius:20px;padding:32px 24px;margin:16px 0 24px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-40px;right:-40px;width:220px;height:220px;background:radial-gradient(circle,rgba(232,148,10,.25) 0%,transparent 70%);"></div>
        <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:3px;color:#E8940A;margin-bottom:10px;">KING & QUEEN WOLO · ${monthLabel()}</div>
        <h1 style="font-family:'Fraunces',serif;font-size:clamp(26px,5vw,36px);font-weight:900;margin:0 0 12px;line-height:1.15;">
          Qui est le plus beau ?<br>
          Qui est la plus belle ?<br>
          <span style="color:#E8940A;">Togo vs Bénin. Toi tu décides.</span>
        </h1>
        <p style="margin:0 0 14px;color:rgba(248,246,241,.8);font-size:15px;max-width:720px;line-height:1.7;">
          Poste tes 3 plus belles photos. La communauté swipe et vote. À la fin du mois, le King et la Queen gagnent <strong style="color:#E8940A;">50 000 FCFA chacun</strong>. Duel final : Togo vs Bénin.
        </p>

        <div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.2);border-radius:14px;padding:16px 18px;margin-bottom:18px;max-width:720px;">
          <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:#E8940A;margin-bottom:10px;">COMMENT ÇA MARCHE</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:20px;flex-shrink:0;">📸</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#F8F6F1;margin-bottom:2px;">1. Poste 3 photos</div>
                <div style="font-size:12px;color:rgba(248,246,241,.6);line-height:1.5;">Selfie, tenue, charme — c'est toi. Hommes et femmes. Pas de catégorie, juste toi.</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:20px;flex-shrink:0;">⚔️</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#F8F6F1;margin-bottom:2px;">2. La communauté swipe</div>
                <div style="font-size:12px;color:rgba(248,246,241,.6);line-height:1.5;">Duels Tinder infini. Swipe à droite pour voter. Des milliers de duels chaque jour.</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:20px;flex-shrink:0;">👑</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#F8F6F1;margin-bottom:2px;">3. Duel final TG vs BJ</div>
                <div style="font-size:12px;color:rgba(248,246,241,.6);line-height:1.5;">Le meilleur homme Togo vs Bénin → <strong style="color:#E8940A;">King 50 000 F</strong>. Idem femmes → <strong style="color:#E8940A;">Queen 50 000 F</strong>.</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.2);border-radius:12px;padding:12px 16px;text-align:center;min-width:120px;">
            <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:#E8940A;">50 000 F</div>
            <div style="font-size:11px;color:rgba(248,246,241,.6);">👑 King du mois</div>
          </div>
          <div style="background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.2);border-radius:12px;padding:12px 16px;text-align:center;min-width:120px;">
            <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:#E8940A;">50 000 F</div>
            <div style="font-size:11px;color:rgba(248,246,241,.6);">👑 Queen du mois</div>
          </div>
          <div style="background:rgba(232,148,10,.04);border:1px solid rgba(232,148,10,.12);border-radius:12px;padding:12px 16px;text-align:center;min-width:120px;">
            <div style="font-size:11px;color:rgba(248,246,241,.5);line-height:1.5;">Éligible aux gains :<br><strong style="color:#E8940A;">Pro 2+ mois</strong></div>
          </div>
        </div>
      </div>
    `;
  }

  function tabsHTML(){
    const tabs = [
      { id: 'accueil',    lbl: '🏠 Accueil' },
      { id: 'duels',      lbl: '⚔️ Duels' },
      { id: 'classement', lbl: '🏆 Classement' },
      { id: 'participer', lbl: '📸 Participer' },
    ];
    return `
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none;">
        ${tabs.map(t => `
          <button onclick="kqChangeTab('${t.id}')" style="flex-shrink:0;padding:10px 18px;border-radius:999px;border:1px solid ${state.tab === t.id ? '#E8940A' : 'rgba(232,148,10,.25)'};background:${state.tab === t.id ? '#E8940A' : 'transparent'};color:${state.tab === t.id ? '#0f1410' : '#F8F6F1'};font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">
            ${t.lbl}
          </button>
        `).join('')}
      </div>
    `;
  }

  function contentHTML(){
    if (state.tab === 'accueil')    return accueilHTML();
    if (state.tab === 'duels')      return duelsHTML();
    if (state.tab === 'classement') return classementHTML();
    if (state.tab === 'participer') return participerHTML();
    return '';
  }

  // ──────────────────────────────────────────
  // ACCUEIL
  // ──────────────────────────────────────────
  function accueilHTML(){
    return `
      <div style="text-align:center;padding:40px 0;">
        <div style="font-size:64px;margin-bottom:16px;">👑</div>
        <h2 style="font-family:'Fraunces',serif;font-size:28px;margin:0 0 12px;">Prêt(e) à jouer ?</h2>
        <p style="color:rgba(248,246,241,.7);max-width:480px;margin:0 auto 24px;font-size:15px;line-height:1.7;">
          Swipe entre des photos de participants de tout le Togo et le Bénin. Choisis qui tu préfères. C'est addictif, c'est gratuit, et tu décides qui sera King ou Queen.
        </p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button onclick="kqChangeTab('duels')" style="padding:16px 32px;background:#E8940A;color:#0f1410;border:none;border-radius:14px;font-weight:900;font-size:16px;cursor:pointer;">⚔️ Commencer les duels</button>
          <button onclick="kqChangeTab('participer')" style="padding:16px 32px;background:transparent;color:#E8940A;border:2px solid #E8940A;border-radius:14px;font-weight:700;font-size:16px;cursor:pointer;">📸 Participer</button>
        </div>

        <div style="margin-top:40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:700px;margin-left:auto;margin-right:auto;">
          <div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:14px;padding:20px;">
            <div style="font-size:32px;margin-bottom:8px;">🔥</div>
            <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:900;margin-bottom:4px;">Infini</div>
            <div style="font-size:13px;color:rgba(248,246,241,.6);line-height:1.5;">Swipe autant que tu veux. 3 heures si ça te chante. Tant qu'il y a des participants, il y a des duels.</div>
          </div>
          <div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:14px;padding:20px;">
            <div style="font-size:32px;margin-bottom:8px;">🌍</div>
            <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:900;margin-bottom:4px;">Togo vs Bénin</div>
            <div style="font-size:13px;color:rgba(248,246,241,.6);line-height:1.5;">À la fin du mois, le meilleur de chaque pays s'affronte. Le gagnant représente son pays.</div>
          </div>
          <div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:14px;padding:20px;">
            <div style="font-size:32px;margin-bottom:8px;">💰</div>
            <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:900;margin-bottom:4px;">100 000 F</div>
            <div style="font-size:13px;color:rgba(248,246,241,.6);line-height:1.5;">50 000 F pour le King. 50 000 F pour la Queen. Chaque mois. Réservé aux Pro 2+ mois.</div>
          </div>
        </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────
  // DUELS TINDER INFINI
  // ──────────────────────────────────────────
  function duelsHTML(){
    if (!state.duelQueue.length) return emptyHTML('Pas encore assez de participants pour les duels. Sois parmi les premiers !');

    const pair = state.duelQueue[state.duelIndex];
    if (!pair) {
      return `
        <div style="text-align:center;padding:40px 20px;">
          <div style="font-size:48px;margin-bottom:12px;">🔥</div>
          <h3 style="font-family:'Fraunces',serif;margin:0 0 8px;">Tu as voté ${state.duelCount} fois !</h3>
          <p style="color:rgba(248,246,241,.6);margin-bottom:6px;">Série actuelle : ${state.duelStreak} 🔥</p>
          <p style="color:rgba(248,246,241,.5);font-size:13px;">Recharge de nouvelles paires…</p>
          <button onclick="kqReloadDuels()" style="margin-top:16px;padding:12px 28px;background:#E8940A;color:#0f1410;border:none;border-radius:999px;font-weight:700;cursor:pointer;">⚔️ Continuer les duels</button>
        </div>
      `;
    }

    const [a, b] = pair;
    return `
      <div style="max-width:720px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(248,246,241,.5);margin-bottom:4px;">DUEL ${state.duelCount + 1} · Série : ${state.duelStreak} 🔥</div>
          <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;">Qui tu préfères ?</div>
          <div style="font-size:12px;color:rgba(248,246,241,.5);margin-top:4px;">Clique sur ta préférence. C'est instantané.</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;position:relative;" id="kq-duel-grid">
          ${duelCardHTML(a, 'a')}
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#0f1410;border:2px solid #E8940A;border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#E8940A;font-size:14px;z-index:5;">VS</div>
          ${duelCardHTML(b, 'b')}
        </div>

        <div style="display:flex;justify-content:center;gap:8px;margin-top:16px;">
          <button onclick="kqSkipDuel()" style="padding:10px 20px;border-radius:999px;border:1px solid rgba(248,246,241,.15);background:transparent;color:rgba(248,246,241,.6);cursor:pointer;font-size:13px;">⏭️ Passer</button>
        </div>
      </div>
    `;
  }

  function duelCardHTML(p, side){
    return `
      <button onclick="kqVoteDuel('${p.id}','${side}')" class="kq-duel-card" style="padding:0;border:2px solid rgba(232,148,10,.2);background:#0f1410;border-radius:16px;overflow:hidden;cursor:pointer;transition:all .2s;position:relative;" onmouseenter="this.style.borderColor='#E8940A';this.style.transform='scale(1.02)'" onmouseleave="this.style.borderColor='rgba(232,148,10,.2)';this.style.transform='scale(1)'">
        <div style="aspect-ratio:3/4;background:#1a1f1a url('${esc(p.photo_url)}') center/cover;"></div>
        <div style="padding:12px 14px;text-align:left;color:#F8F6F1;">
          <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:900;margin-bottom:2px;">${esc(p.user_nom)}</div>
          <div style="font-size:11px;color:rgba(248,246,241,.5);font-family:'Space Mono',monospace;">
            ${p.user_pays === 'TG' ? '🇹🇬' : '🇧🇯'} ${p.quartier || p.ville || '—'}
          </div>
          ${p.win_rate != null ? `<div style="font-size:11px;color:#E8940A;margin-top:4px;">Win rate : ${p.win_rate}%</div>` : ''}
        </div>
      </button>
    `;
  }

  // ──────────────────────────────────────────
  // CLASSEMENT
  // ──────────────────────────────────────────
  function classementHTML(){
    return `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="display:flex;gap:4px;">
          ${['femme','homme'].map(g => `
            <button onclick="kqSetGenre('${g}')" style="padding:8px 16px;border-radius:999px;border:1px solid ${state.classementGenre === g ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${state.classementGenre === g ? 'rgba(232,148,10,.15)' : 'transparent'};color:${state.classementGenre === g ? '#E8940A' : '#F8F6F1'};font-weight:700;cursor:pointer;font-size:13px;">
              ${g === 'femme' ? '👑 Queens' : '🤴 Kings'}
            </button>
          `).join('')}
        </div>
        <div style="display:flex;gap:4px;">
          ${['tous','TG','BJ'].map(p => `
            <button onclick="kqSetPays('${p}')" style="padding:8px 14px;border-radius:999px;border:1px solid ${state.classementPays === p ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${state.classementPays === p ? 'rgba(232,148,10,.15)' : 'transparent'};color:${state.classementPays === p ? '#E8940A' : '#F8F6F1'};font-weight:600;cursor:pointer;font-size:12px;">
              ${p === 'tous' ? '🌍 Tous' : p === 'TG' ? '🇹🇬 Togo' : '🇧🇯 Bénin'}
            </button>
          `).join('')}
        </div>
      </div>

      <h3 style="font-family:'Fraunces',serif;margin:8px 0 12px;">
        Top ${state.classementGenre === 'femme' ? 'Queens' : 'Kings'} du mois
        ${state.classementPays !== 'tous' ? ` · ${state.classementPays === 'TG' ? '🇹🇬 Togo' : '🇧🇯 Bénin'}` : ''}
      </h3>

      ${state.leaderboard.length === 0 ? `
        <div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">Pas encore de classement. Les premiers duels sont en cours.</div>
      ` : `
        ${state.leaderboard.length >= 3 ? topThreeHTML(state.leaderboard.slice(0, 3)) : ''}
        <div style="background:#0f1410;border:1px solid rgba(232,148,10,.15);border-radius:14px;overflow:hidden;margin-top:16px;">
          ${state.leaderboard.map((p, i) => classementRowHTML(p, i + 1)).join('')}
        </div>
      `}
    `;
  }

  function topThreeHTML(top){
    const order = top.length >= 3 ? [top[1], top[0], top[2]] : top;
    const sizes = top.length >= 3 ? [{ h: '100px', ring: 'silver' }, { h: '130px', ring: 'gold' }, { h: '90px', ring: '#CD7F32' }] : [];
    return `
      <div style="display:flex;justify-content:center;align-items:flex-end;gap:16px;margin-bottom:8px;">
        ${order.map((p, i) => {
          const isFirst = i === 1;
          const medal = i === 0 ? '🥈' : i === 1 ? '🥇' : '🥉';
          const sz = sizes[i] || {};
          return `
            <div style="text-align:center;flex:1;max-width:150px;">
              <div style="width:${isFirst ? '90px' : '70px'};height:${isFirst ? '90px' : '70px'};border-radius:50%;border:3px solid ${isFirst ? '#E8940A' : 'rgba(232,148,10,.4)'};background:#1a1f1a url('${esc(p.avatar || p.user_avatar || '')}') center/cover;margin:0 auto 8px;"></div>
              <div style="font-size:22px;">${medal}</div>
              <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.nom || p.user_nom)}</div>
              <div style="font-size:11px;color:#E8940A;font-weight:700;">${p.duel_wins || p.total_likes || 0} wins</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function classementRowHTML(p, rang){
    const medal = rang === 1 ? '🥇' : rang === 2 ? '🥈' : rang === 3 ? '🥉' : '';
    const winRate = (p.duel_wins || 0) + (p.duel_losses || 0) > 0
      ? Math.round((p.duel_wins || 0) / ((p.duel_wins || 0) + (p.duel_losses || 0)) * 100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(232,148,10,.06);">
        <div style="width:32px;text-align:center;font-weight:900;color:${rang <= 3 ? '#E8940A' : 'rgba(248,246,241,.5)'};">${medal || rang}</div>
        <div style="width:44px;height:44px;border-radius:50%;background:#1a1f1a url('${esc(p.avatar || p.user_avatar || '')}') center/cover;flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.nom || p.user_nom)}</div>
          <div style="font-size:11px;color:rgba(248,246,241,.5);font-family:'Space Mono',monospace;">
            ${p.pays === 'TG' ? '🇹🇬' : '🇧🇯'} ${p.ville || p.quartier || '—'} · Win rate ${winRate}%
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:900;color:#E8940A;font-size:16px;">${p.duel_wins || 0}</div>
          <div style="font-size:10px;color:rgba(248,246,241,.5);">wins</div>
        </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────
  // PARTICIPER
  // ──────────────────────────────────────────
  function participerHTML(){
    if (!window.currentUser?.id) return `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:12px;">🔒</div>
        <h3 style="font-family:'Fraunces',serif;margin:0 0 8px;">Connecte-toi pour participer</h3>
        <p style="color:rgba(248,246,241,.6);margin-bottom:16px;">Un compte WOLO Market gratuit suffit pour jouer.</p>
        <button onclick="if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('participer au King & Queen');}else{window.showPage&&window.showPage('inscription');}" style="padding:14px 28px;background:#E8940A;color:#0f1410;border:none;border-radius:999px;font-weight:700;cursor:pointer;">Créer mon compte</button>
      </div>
    `;

    const nbPhotos = state.mesPhotos.length;
    const complete = nbPhotos >= 3;
    return `
      <div style="max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="font-family:'Fraunces',serif;margin:0 0 8px;">Tes photos King & Queen</h2>
          <p style="color:rgba(248,246,241,.7);font-size:14px;">3 photos obligatoires pour participer aux duels.</p>
          <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;">
            ${[1,2,3].map(i => `
              <div style="width:12px;height:12px;border-radius:50%;background:${nbPhotos >= i ? '#E8940A' : 'rgba(232,148,10,.2)'};"></div>
            `).join('')}
          </div>
          <div style="font-size:12px;color:${complete ? '#4ade80' : 'rgba(248,246,241,.5)'};margin-top:6px;">
            ${complete ? '✅ Participation complète — tu es dans les duels !' : `${nbPhotos}/3 photos · ${3 - nbPhotos} restante${3 - nbPhotos > 1 ? 's' : ''}`}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
          ${[0,1,2].map(i => {
            const photo = state.mesPhotos[i];
            if (photo) {
              return `
                <div style="aspect-ratio:3/4;background:#1a1f1a url('${esc(photo.photo_url)}') center/cover;border-radius:14px;border:2px solid #E8940A;position:relative;">
                  <div style="position:absolute;top:8px;left:8px;background:rgba(15,20,16,.85);color:#E8940A;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">Photo ${i+1}</div>
                  ${photo.duel_wins != null ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(15,20,16,.85);color:#E8940A;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;">${photo.duel_wins} wins</div>` : ''}
                </div>
              `;
            }
            return `
              <button onclick="kqOpenUpload(${i+1})" style="aspect-ratio:3/4;border-radius:14px;border:2px dashed rgba(232,148,10,.3);background:rgba(232,148,10,.04);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:rgba(248,246,241,.5);gap:8px;">
                <div style="font-size:32px;">📸</div>
                <div style="font-size:12px;font-weight:700;">Photo ${i+1}</div>
              </button>
            `;
          }).join('')}
        </div>

        ${!complete ? `
          <button onclick="kqOpenUpload(${nbPhotos + 1})" style="width:100%;padding:16px;background:#E8940A;color:#0f1410;border:none;border-radius:14px;font-weight:900;font-size:15px;cursor:pointer;">📸 Ajouter la photo ${nbPhotos + 1}</button>
        ` : `
          <div style="background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.3);border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;margin-bottom:8px;">✅</div>
            <div style="font-weight:700;color:#4ade80;margin-bottom:4px;">Tu es dans les duels !</div>
            <div style="font-size:13px;color:rgba(248,246,241,.6);">Tes photos apparaissent dans les duels de la communauté. Partage ton profil sur WhatsApp pour récolter plus de votes.</div>
            <button onclick="kqShareWhatsApp()" style="margin-top:12px;padding:10px 20px;background:#25D366;color:white;border:none;border-radius:999px;font-weight:700;cursor:pointer;">📲 Partager sur WhatsApp</button>
          </div>
        `}

        <div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:14px;padding:16px;margin-top:20px;">
          <div style="font-size:12px;color:#E8940A;font-weight:700;margin-bottom:6px;">💡 RÈGLE D'ÉLIGIBILITÉ AUX GAINS</div>
          <div style="font-size:13px;color:rgba(248,246,241,.7);line-height:1.6;">
            Tout le monde peut participer et jouer. Mais pour toucher les <strong>50 000 FCFA</strong>, il faut être sur le <strong>Plan Pro depuis au moins 2 mois</strong>. Si le gagnant n'est pas Pro — il gagne le titre mais pas l'argent. Le montant est reporté au mois suivant.
          </div>
        </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────
  // UPLOAD MODAL
  // ──────────────────────────────────────────
  function openUploadModal(slotNum){
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('participer au King & Queen');}else{window.showPage&&window.showPage('inscription');} return; }
    const existing = document.getElementById('kq-upload-modal');
    if (existing) existing.remove();

    const html = `
      <div id="kq-upload-modal" style="position:fixed;inset:0;background:rgba(15,20,16,.96);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;" onclick="if(event.target===this){this.remove();}">
        <div style="max-width:480px;width:100%;background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:20px;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
            <div>
              <div style="font-size:11px;color:#E8940A;letter-spacing:2px;font-family:'Space Mono',monospace;">PHOTO ${slotNum} / 3</div>
              <h2 style="margin:4px 0 0;font-family:'Fraunces',serif;font-size:22px;">King & Queen 👑</h2>
            </div>
            <button onclick="document.getElementById('kq-upload-modal').remove()" style="background:transparent;border:none;color:#F8F6F1;font-size:24px;cursor:pointer;">×</button>
          </div>
          <p style="font-size:13px;color:rgba(248,246,241,.6);margin-bottom:16px;">Selfie, tenue, charme — montre-toi sous ton meilleur jour. C'est TOI le sujet.</p>
          <input type="file" id="kqFile" accept="image/*" style="width:100%;padding:12px;border-radius:10px;border:1px dashed rgba(232,148,10,.3);background:rgba(232,148,10,.05);color:#F8F6F1;margin-bottom:14px;">
          <div id="kqPreview" style="display:none;aspect-ratio:3/4;background:#1a1f1a center/cover;border-radius:14px;margin-bottom:14px;"></div>
          <button onclick="kqSubmitPhoto(${slotNum})" id="kqSubmitBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#E8940A;color:#0f1410;font-weight:900;font-size:15px;cursor:pointer;">Poster la photo ${slotNum} ✨</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('kqFile').addEventListener('change', function(){
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e){
        const prev = document.getElementById('kqPreview');
        if (prev) { prev.style.display = 'block'; prev.style.backgroundImage = `url('${e.target.result}')`; }
      };
      reader.readAsDataURL(file);
    });
  }

  async function submitPhoto(slotNum){
    const fileInput = document.getElementById('kqFile');
    if (!fileInput?.files?.length) { toast('Choisis une photo','error'); return; }
    const btn = document.getElementById('kqSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Upload en cours…'; }

    try {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('image', file);
      const imgRes = await fetch('https://api.imgbb.com/1/upload?key=44b066fbd3bac68b98ed01be987e5030', { method: 'POST', body: formData }).then(r => r.json());
      if (!imgRes?.data?.url) throw new Error('Upload photo échoué');

      const fn = window.woloFetch || fetch;
      const r = await fn(`${API}/feed-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: window.currentUser.id,
          photo_url: imgRes.data.url,
          categorie: 'king-queen',
          contest: 'king-queen',
          slot: slotNum,
          description: '',
        })
      }).then(r => r.json());

      if (r?.ok) {
        document.getElementById('kq-upload-modal')?.remove();
        if (typeof toast === 'function') toast('Photo postée !', 'success');
        await loadMesPhotos();
        render();
      } else {
        throw new Error(r?.error || 'Erreur');
      }
    } catch(e){
      console.error('[kq] upload', e);
      if (typeof toast === 'function') toast('Erreur upload : ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = `Poster la photo ${slotNum} ✨`; }
    }
  }

  // ──────────────────────────────────────────
  // ACTIONS DUELS
  // ──────────────────────────────────────────
  async function voteDuel(winnerId, side){
    if (state.duelAnimating) return;
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('voter dans un duel');}else{window.showPage&&window.showPage('inscription');} return; }

    state.duelAnimating = true;
    const pair = state.duelQueue[state.duelIndex];
    if (!pair) return;

    const loserId = side === 'a' ? pair[1].id : pair[0].id;

    // Animation flash
    const grid = document.getElementById('kq-duel-grid');
    if (grid) {
      const cards = grid.querySelectorAll('.kq-duel-card');
      const winIdx = side === 'a' ? 0 : 1;
      const loseIdx = side === 'a' ? 1 : 0;
      if (cards[winIdx]) cards[winIdx].style.borderColor = '#4ade80';
      if (cards[loseIdx]) { cards[loseIdx].style.opacity = '0.3'; cards[loseIdx].style.transform = 'scale(0.95)'; }
    }

    try {
      const fn = window.woloFetch || fetch;
      await fn(`${API}/feed-discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_id: winnerId, loser_id: loserId, voter_id: window.currentUser.id })
      }).catch(() => {});
    } catch(e){ console.warn('[kq] vote', e); }

    state.duelCount++;
    state.duelStreak++;

    setTimeout(() => {
      state.duelIndex++;
      state.duelAnimating = false;
      if (state.duelIndex >= state.duelQueue.length) {
        loadDuelBatch().then(render);
      } else {
        render();
      }
    }, 400);
  }

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────
  function skeletonHTML(){ return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">Chargement…</div>`; }
  function loaderHTML(){ return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">…</div>`; }
  function emptyHTML(msg){ return `<div style="padding:40px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">👑</div><h3 style="font-family:'Fraunces',serif;margin:0 0 6px;">${msg}</h3><button onclick="kqChangeTab('participer')" style="margin-top:16px;padding:12px 24px;background:#E8940A;color:#0f1410;border:none;border-radius:999px;font-weight:700;cursor:pointer;">📸 Participer</button></div>`; }
  function monthLabel(){ const m=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']; const d=new Date(); return `${m[d.getMonth()]} ${d.getFullYear()}`.toUpperCase(); }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(msg, type){ if (typeof window.toast === 'function') window.toast(msg, type); }

  // ──────────────────────────────────────────
  // ACTIONS PUBLIQUES
  // ──────────────────────────────────────────
  window.kqChangeTab = (t) => loadTab(t);
  window.kqSetGenre = (g) => { state.classementGenre = g; loadClassement().then(render); };
  window.kqSetPays = (p) => { state.classementPays = p; loadClassement().then(render); };
  window.kqReloadDuels = () => loadDuelBatch().then(render);
  window.kqVoteDuel = (winnerId, side) => voteDuel(winnerId, side);
  window.kqSkipDuel = () => { state.duelIndex++; render(); };
  window.kqOpenUpload = (slot) => openUploadModal(slot);
  window.kqSubmitPhoto = (slot) => submitPhoto(slot);
  window.kqShareWhatsApp = () => {
    const msg = encodeURIComponent(`Je participe au King & Queen WOLO ! 👑\n\nViens voter pour moi et gagne ta place aussi.\n50 000 FCFA pour le King. 50 000 FCFA pour la Queen.\n\n👉 https://wolomarket.com\n\n#KingQueenWOLO #WOLOMarket`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

})();
