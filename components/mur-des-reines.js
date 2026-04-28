// ══════════════════════════════════════════
// WOLO Awards — Le Mur des Reines
// Sprint 14 — Feed viral + Découvrir + Podium + Gamification
// ══════════════════════════════════════════

(function(){
  'use strict';

  const API = '/api/wolo-pay';
  const wFetch = window.woloFetch || fetch;

  const state = {
    tab: 'feed',                    // feed | discover | podium | moi
    feedTab: 'tous',                // tous | awards | mon-quartier | suivies
    categorie: 'toutes',            // toutes | coiffure | couture | libre
    discoverMode: 'swipe',          // swipe | duel | roulette
    podiumCat: 'coiffure',          // coiffure | couture
    photos: [],
    duelPair: [],
    duelQueue: [],
    duelIndex: 0,
    duelCount: 0,
    duelStreak: 0,
    duelAnimating: false,
    roulette: null,
    swipeIndex: 0,
    theme: null,
    countdown: null,
    badges: null,
    mesStats: null,
    leaderboard: [],
    duels: [],
    hallFame: [],
    loading: false,
  };

  // ──────────────────────────────────────────
  // LOADER PRINCIPAL
  // ──────────────────────────────────────────
  window.loadMurDesReines = async function(){
    const root = document.getElementById('mur-des-reines-root');
    if (!root) return;
    root.innerHTML = skeletonHTML();

    try {
      // Charger thème + badges (si user) en parallèle
      const [themeRes, ...rest] = await Promise.all([
        fetch(`${API}/theme-mois`).then(r => r.json()).catch(() => null),
        window.currentUser?.id ? (window.woloFetch || fetch)(`${API}/badges-list?user_id=${window.currentUser.id}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      ]);
      state.theme = themeRes?.theme || null;
      state.countdown = themeRes?.countdown || null;
      state.badges = rest[0] || null;
    } catch(e){ console.warn('[mur] theme/badges load', e); }

    render();
    await loadTab(state.tab);
  };

  async function loadTab(tab){
    state.tab = tab;
    if (tab === 'feed') await loadFeed();
    else if (tab === 'discover') await loadDiscover();
    else if (tab === 'podium') await loadPodium();
    else if (tab === 'moi') await loadMesContrib();
    render();
  }

  async function loadFeed(){
    state.loading = true;
    const mois = new Date().toISOString().slice(0,7);
    const params = new URLSearchParams({ mois, tri: 'recent', limit: 30 });
    if (state.categorie && state.categorie !== 'toutes') params.set('categorie', state.categorie);
    if (state.feedTab === 'awards') params.set('is_awards_candidate', 'true');
    if (state.feedTab === 'mon-quartier' && window.currentPrestataire?.fields?.Quartier) {
      params.set('quartier', window.currentPrestataire.fields.Quartier);
    }
    if (window.currentUser?.id) params.set('viewer_id', window.currentUser.id);
    try {
      const res = await fetch(`${API}/feed-list?${params}`).then(r => r.json());
      state.photos = res?.photos || [];
    } catch(e){ console.warn('[mur] feed', e); state.photos = []; }
    state.loading = false;
  }

  async function loadDiscover(){
    state.loading = true;
    const params = new URLSearchParams({ mode: state.discoverMode });
    if (state.categorie && state.categorie !== 'toutes') params.set('categorie', state.categorie);
    if (window.currentUser?.id) params.set('viewer_id', window.currentUser.id);
    if (state.discoverMode === 'swipe') params.set('limit', '15');
    try {
      const res = await fetch(`${API}/feed-discover?${params}`).then(r => r.json());
      if (state.discoverMode === 'duel') {
        state.duelPair = res?.photos || [];
      } else if (state.discoverMode === 'roulette') {
        state.roulette = (res?.photos || [])[0] || null;
      } else {
        state.photos = res?.photos || [];
        state.swipeIndex = 0;
      }
    } catch(e){ console.warn('[mur] discover', e); }
    state.loading = false;
  }

  async function loadPodium(){
    state.loading = true;
    const mois = new Date().toISOString().slice(0,7);
    try {
      const [topCat, lbV, duelsR] = await Promise.all([
        fetch(`${API}/feed-list?mois=${mois}&is_awards_candidate=true&categorie=${state.podiumCat}&tri=populaire&limit=10`).then(r => r.json()),
        fetch(`${API}/leaderboard?type=ville&scope=mois&limit=10`).then(r => r.json()),
        fetch(`${API}/duels-list${window.currentUser?.id ? '?viewer_id=' + window.currentUser.id : ''}`).then(r => r.json()),
      ]);
      state.photos = topCat?.photos || [];
      state.leaderboard = lbV?.leaderboard || [];
      state.duels = duelsR?.duels || [];
    } catch(e){ console.warn('[mur] podium', e); }
    state.loading = false;
  }

  async function loadMesContrib(){
    if (!window.currentUser?.id) { state.photos = []; return; }
    state.loading = true;
    const mois = new Date().toISOString().slice(0,7);
    try {
      const res = await fetch(`${API}/feed-list?user_id=${window.currentUser.id}&mois=${mois}&viewer_id=${window.currentUser.id}&limit=30`).then(r => r.json());
      state.photos = res?.photos || [];
    } catch(e){ console.warn('[mur] moi', e); }
    state.loading = false;
  }

  // ──────────────────────────────────────────
  // RENDU
  // ──────────────────────────────────────────
  function render(){
    const root = document.getElementById('mur-des-reines-root');
    if (!root) return;

    root.innerHTML = `
      <div class="mur-container" style="color:#F8F6F1;font-family:'Poppins',sans-serif;max-width:1100px;margin:0 auto;padding:0 16px;">
        ${heroHTML()}
        ${tabsHTML()}
        <div class="mur-body" style="padding:20px 0 80px;">
          ${state.loading ? loaderHTML() : contentHTML()}
        </div>
      </div>
      ${fabPosterHTML()}
    `;
  }

  function heroHTML(){
    const t = state.theme || {};
    const cd = state.countdown || {};
    const jours = cd.jours_restants != null ? cd.jours_restants : '—';
    const themeCur = state.categorie === 'couture' ? (t.theme_couture || '—') : (t.theme_coiffure || '—');
    // Calendrier 2026 : alternance Coiffure (impair) / Couture (pair)
    const moisIdx = new Date().getMonth(); // 0-11
    const moisNom = ['Janv','Févr','Mars','Avril','Mai','Juin','Juillet','Août','Sept','Oct','Nov','Déc'][moisIdx];
    const isFinaleMois = moisIdx === 11;
    const isCoiffureMois = (moisIdx + 1) % 2 === 1;  // mois impairs = coiffure
    const catActive = isFinaleMois ? 'FINALE ANNUELLE' : (isCoiffureMois ? '✂️ COIFFURE' : '👗 COUTURE');
    return `
      <div class="mur-hero" style="background:linear-gradient(135deg,#0f1410 0%,#1a1f1a 100%);border:1px solid rgba(232,148,10,.3);border-radius:20px;padding:32px 24px;margin:16px 0 24px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-40px;right:-40px;width:220px;height:220px;background:radial-gradient(circle,rgba(232,148,10,.25) 0%,transparent 70%);"></div>
        <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:3px;color:#E8940A;margin-bottom:10px;">LE MUR DES REINES · ${moisNom.toUpperCase()} 2026 · ${catActive}</div>
        <h1 style="font-family:'Fraunces',serif;font-size:clamp(26px,5vw,38px);font-weight:900;margin:0 0 14px;line-height:1.15;">
          Ta grand-mère a tressé pour nourrir.<br>
          Ta mère a cousu pour t'envoyer à l'école.<br>
          <span style="color:#E8940A;">Maintenant c'est ton tour. Et le pays regarde.</span>
        </h1>
        <p style="margin:0 0 18px;color:rgba(248,246,241,.85);font-size:15px;max-width:720px;line-height:1.75;">
          Les Nana Benz ont tenu Lomé avec du wax. Ta mère a tenu sa maison avec une aiguille. Aujourd'hui, on rend cet héritage visible. <strong style="color:#F8F6F1;">Et on le paye 100 000 FCFA.</strong>
        </p>

        <!-- BLOC STAKES (100K = …) -->
        <div style="background:rgba(232,148,10,.08);border-left:3px solid #E8940A;padding:14px 18px;margin-bottom:18px;border-radius:0 12px 12px 0;max-width:720px;">
          <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:#E8940A;margin-bottom:6px;">CE QUE 100 000 FCFA REPRÉSENTENT</div>
          <p style="margin:0;font-size:14px;color:rgba(248,246,241,.85);line-height:1.7;">Un trimestre de loyer à Bè · une machine Singer pro · une formation BTS · le cahier de l'année pour 3 enfants. <strong style="color:#F8F6F1;">Pas une loterie. Ton talent.</strong></p>
        </div>

        <!-- BLOC COMMENT ÇA MARCHE -->
        <div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.2);border-radius:14px;padding:16px 18px;margin-bottom:18px;max-width:720px;">
          <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:#E8940A;margin-bottom:10px;">COMMENT ÇA MARCHE</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:20px;flex-shrink:0;">📸</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#F8F6F1;margin-bottom:2px;">1. Poste 3 photos</div>
                <div style="font-size:12px;color:rgba(248,246,241,.6);line-height:1.5;">Ta plus belle coupe ou ta plus belle tenue. Tag obligatoire de la coiffeuse / couturière.</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:20px;flex-shrink:0;">⚔️</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#F8F6F1;margin-bottom:2px;">2. Le moteur de duels tourne</div>
                <div style="font-size:12px;color:rgba(248,246,241,.6);line-height:1.5;">Ta photo passe en duel face à d'autres. +10 pts si elle gagne, +1 si elle perd, +20 streak après 3 duels.</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:20px;flex-shrink:0;">👑</span>
              <div>
                <div style="font-weight:700;font-size:13px;color:#F8F6F1;margin-bottom:2px;">3. 2 Reines couronnées</div>
                <div style="font-size:12px;color:rgba(248,246,241,.6);line-height:1.5;"><strong style="color:#E8940A;">100 000 F</strong> Reine Bénin + <strong style="color:#E8940A;">100 000 F</strong> Reine Togo (1 par pays par construction).</div>
              </div>
            </div>
          </div>
        </div>

        <!-- BLOC CALENDRIER 3 PHASES -->
        <div style="background:rgba(248,246,241,.04);border:1px solid rgba(248,246,241,.1);border-radius:14px;padding:14px 18px;margin-bottom:18px;max-width:720px;">
          <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:#E8940A;margin-bottom:10px;">📅 CALENDRIER DU MOIS</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px 12px;">
              <div style="font-size:11px;color:#E8940A;font-weight:700;">📸 1 → 15</div>
              <div style="font-size:12px;color:rgba(248,246,241,.7);margin-top:2px;">Poste ta photo</div>
            </div>
            <div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px 12px;">
              <div style="font-size:11px;color:#E8940A;font-weight:700;">⚔️ 16 → 25</div>
              <div style="font-size:12px;color:rgba(248,246,241,.7);margin-top:2px;">La communauté duel-vote</div>
            </div>
            <div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px 12px;">
              <div style="font-size:11px;color:#E8940A;font-weight:700;">👑 26 → 30</div>
              <div style="font-size:12px;color:rgba(248,246,241,.7);margin-top:2px;">Couronnement + virement</div>
            </div>
          </div>
        </div>

        <!-- BLOC DIASPORA -->
        <div style="background:rgba(34,197,94,.05);border:1px dashed rgba(34,197,94,.3);border-radius:14px;padding:14px 18px;margin-bottom:18px;max-width:720px;">
          <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:#22c55e;margin-bottom:6px;">📲 LA DIASPORA AUSSI</div>
          <p style="margin:0;font-size:13px;color:rgba(248,246,241,.8);line-height:1.6;"><strong style="color:#F8F6F1;">Ta cousine à Paris ? Ta tante à Bruxelles ?</strong> Elles peuvent voter. Partage le lien WhatsApp. Une voix de Cotonou compte autant qu'une voix de Brooklyn.</p>
        </div>

        <!-- BLOC FINALE ANNUELLE DÉCEMBRE -->
        <div style="background:linear-gradient(135deg,rgba(232,148,10,.12),rgba(232,148,10,.04));border:2px solid rgba(232,148,10,.4);border-radius:14px;padding:16px 18px;margin-bottom:18px;max-width:720px;">
          <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:#E8940A;margin-bottom:6px;">🏆 DÉCEMBRE 2026 — FINALE ANNUELLE</div>
          <p style="margin:0 0 8px;font-size:14px;color:rgba(248,246,241,.85);line-height:1.6;">12 Reines mensuelles s'affrontent en décembre. Bénin vs Togo.</p>
          <p style="margin:0;font-size:13px;color:#E8940A;font-weight:800;">Reine de l'Année Coiffure : 500 000 FCFA · Reine de l'Année Couture : 500 000 FCFA · Élues sur leur travail. Pas sur leurs amis.</p>
        </div>

        <!-- BLOC BONUS INVISIBLES -->
        <div style="background:rgba(248,246,241,.03);border:1px solid rgba(248,246,241,.08);border-radius:14px;padding:14px 18px;margin-bottom:18px;max-width:720px;">
          <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:rgba(248,246,241,.5);margin-bottom:8px;">🎁 CE QUE LA REINE GAGNE VRAIMENT</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:rgba(248,246,241,.75);line-height:1.85;">
            <li>100 000 FCFA virés direct (Mobile Money / virement bancaire)</li>
            <li>Profil épinglé page d'accueil pendant 30 jours</li>
            <li>Badge <strong style="color:#E8940A;">"Reine ${isCoiffureMois ? 'Coiffure' : 'Couture'} · ${moisNom} 2026"</strong> à vie sur ton profil pro</li>
            <li>Priorité Bourse de Croissance le mois suivant (si Pro)</li>
            <li>Ticket direct pour la finale annuelle décembre</li>
          </ul>
        </div>

        <p style="margin:0 0 16px;color:rgba(248,246,241,.55);font-size:12px;font-style:italic;max-width:600px;">
          Ouvert à toutes les femmes du Togo et du Bénin. Pas besoin d'être Pro pour gagner. Ta grand-mère, ta mère, ton talent — c'est ton héritage.
        </p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span style="background:rgba(232,148,10,.15);border:1px solid rgba(232,148,10,.3);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;color:#E8940A;">
            🎯 Thème du mois : ${themeCur}
          </span>
          ${t.hashtag ? `<span style="background:rgba(232,148,10,.08);border:1px dashed rgba(232,148,10,.3);border-radius:999px;padding:6px 14px;font-size:12px;font-family:'Space Mono',monospace;color:rgba(248,246,241,.85);">${t.hashtag}</span>` : ''}
          <span style="background:transparent;border:1px solid rgba(248,246,241,.2);border-radius:999px;padding:6px 14px;font-size:12px;color:rgba(248,246,241,.75);">
            ⏳ Plus que ${jours} jour${jours > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    `;
  }

  function statsBarHTML(){
    if (!window.currentUser?.id || !state.badges) return '';
    const b = state.badges;
    const niv = b.niveau_meta || {};
    const streak = b.streak || {};
    const hasPosted = (b.nb_photos || 0) > 0;

    if (!hasPosted) return '';

    const progPct = b.next ? Math.min(100, Math.round((b.next.actuel / b.next.seuil) * 100)) : 100;
    return `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:180px;background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.2);border-radius:14px;padding:14px 16px;">
          <div style="font-size:11px;letter-spacing:2px;color:rgba(248,246,241,.5);text-transform:uppercase;font-family:'Space Mono',monospace;">Ton niveau</div>
          <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:#E8940A;margin:2px 0;">${niv.emoji || ''} ${(niv.niveau || 'apprentie').toUpperCase()}</div>
          ${b.next ? `<div style="height:4px;background:rgba(232,148,10,.15);border-radius:999px;overflow:hidden;margin-top:6px;"><div style="height:100%;width:${progPct}%;background:#E8940A;"></div></div><div style="font-size:10px;color:rgba(248,246,241,.5);margin-top:4px;">${b.next.actuel} / ${b.next.seuil} likes → ${b.next.cible}</div>` : `<div style="font-size:10px;color:rgba(248,246,241,.5);margin-top:4px;">Niveau max atteint 🌟</div>`}
        </div>
        <div style="flex:1;min-width:180px;background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.2);border-radius:14px;padding:14px 16px;">
          <div style="font-size:11px;letter-spacing:2px;color:rgba(248,246,241,.5);text-transform:uppercase;font-family:'Space Mono',monospace;">Ta série</div>
          <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:#E8940A;margin:2px 0;">🔥 ${streak.current_streak || 0} jour${(streak.current_streak||0) > 1 ? 's' : ''}</div>
          <div style="font-size:10px;color:rgba(248,246,241,.5);">Multiplicateur votes ×${streak.multiplicateur || 1}</div>
        </div>
        <div style="flex:1;min-width:180px;background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.2);border-radius:14px;padding:14px 16px;cursor:pointer;" onclick="murChangeTab('moi')">
          <div style="font-size:11px;letter-spacing:2px;color:rgba(248,246,241,.5);text-transform:uppercase;font-family:'Space Mono',monospace;">Tes photos</div>
          <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:#E8940A;margin:2px 0;">${b.nb_photos || 0}</div>
          <div style="font-size:10px;color:rgba(248,246,241,.5);">${b.total_likes || 0} likes cumulés</div>
        </div>
        <div style="flex:1;min-width:180px;background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.2);border-radius:14px;padding:14px 16px;">
          <div style="font-size:11px;letter-spacing:2px;color:rgba(248,246,241,.5);text-transform:uppercase;font-family:'Space Mono',monospace;">Tes badges</div>
          <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:#E8940A;margin:2px 0;">${(b.badges || []).length}</div>
          <div style="font-size:10px;color:rgba(248,246,241,.5);">${(b.badges||[]).slice(0,5).map(x => x.emoji).join(' ') || '—'}</div>
        </div>
      </div>
    `;
  }

  function tabsHTML(){
    const tabs = [
      { id: 'feed',     lbl: '📜 À la Une',     hint: 'Les photos du jour' },
      { id: 'discover', lbl: '⚔️ Les Duels',    hint: 'Vote · Swipe · Roulette' },
      { id: 'podium',   lbl: '👑 Le Podium',    hint: 'Top + Duels + Hall of Fame' },
      { id: 'moi',      lbl: '✨ Mes Photos',   hint: 'Mes photos et badges' },
    ];
    return `
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none;">
        ${tabs.map(t => `
          <button onclick="murChangeTab('${t.id}')" style="flex-shrink:0;padding:10px 18px;border-radius:999px;border:1px solid ${state.tab === t.id ? '#E8940A' : 'rgba(232,148,10,.25)'};background:${state.tab === t.id ? '#E8940A' : 'transparent'};color:${state.tab === t.id ? '#0f1410' : '#F8F6F1'};font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">
            ${t.lbl}
          </button>
        `).join('')}
      </div>
      ${(state.tab === 'feed' || state.tab === 'discover') ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
          ${['toutes','coiffure','couture','libre'].map(c => `
            <button onclick="murSetCat('${c}')" style="padding:6px 14px;border-radius:999px;border:1px solid ${state.categorie === c ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${state.categorie === c ? 'rgba(232,148,10,.15)' : 'transparent'};color:${state.categorie === c ? '#E8940A' : 'rgba(248,246,241,.7)'};font-size:12px;font-weight:600;cursor:pointer;">
              ${c === 'toutes' ? 'Toutes' : c === 'coiffure' ? '✂️ Coiffure' : c === 'couture' ? '👗 Couture' : '📷 Libre'}
            </button>
          `).join('')}
        </div>` : ''}
    `;
  }

  function contentHTML(){
    if (state.tab === 'feed')      return feedContentHTML();
    if (state.tab === 'discover')  return discoverContentHTML();
    if (state.tab === 'podium')    return podiumContentHTML();
    if (state.tab === 'moi')       return moiContentHTML();
    return '';
  }

  // ──────────────────────────────────────────
  // FEED
  // ──────────────────────────────────────────
  function feedContentHTML(){
    if (!state.photos?.length) return emptyFeedHTML();
    const filters = [
      { id: 'tous', lbl: 'Tout le monde' },
      { id: 'awards', lbl: '🏆 Candidates Awards' },
      { id: 'mon-quartier', lbl: '📍 Mon quartier' },
    ];
    return `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
        ${filters.map(f => `
          <button onclick="murSetFeedTab('${f.id}')" style="padding:4px 12px;border-radius:999px;border:1px solid ${state.feedTab === f.id ? '#E8940A' : 'rgba(248,246,241,.15)'};background:${state.feedTab === f.id ? 'rgba(232,148,10,.15)' : 'transparent'};color:${state.feedTab === f.id ? '#E8940A' : 'rgba(248,246,241,.6)'};font-size:11px;cursor:pointer;">
            ${f.lbl}
          </button>
        `).join('')}
      </div>
      <div class="mur-feed-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;">
        ${state.photos.map(photoCardHTML).join('')}
      </div>
    `;
  }

  function photoCardHTML(p){
    const catEmoji = p.categorie === 'coiffure' ? '✂️' : p.categorie === 'couture' ? '👗' : '📷';
    const boosted = p.is_boosted;
    return `
      <div class="mur-photo-card" style="background:#0f1410;border:1px solid ${boosted ? '#E8940A' : 'rgba(232,148,10,.15)'};border-radius:16px;overflow:hidden;position:relative;${boosted ? 'box-shadow:0 0 20px rgba(232,148,10,.25);' : ''}">
          ${boosted ? `<div style="position:absolute;top:10px;right:10px;z-index:3;background:#E8940A;color:#0f1410;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:1px;">✨ BOOST</div>` : ''}
          ${p.is_awards_candidate ? `<div style="position:absolute;top:10px;left:10px;z-index:3;background:rgba(15,20,16,.8);color:#E8940A;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid #E8940A;">🏆 CANDIDATE</div>` : ''}
          <div onclick="murOpenPhoto('${p.id}')" style="cursor:pointer;aspect-ratio:4/5;background:#1a1f1a url('${escapeAttr(p.photo_url)}') center/cover;"></div>
          <div style="padding:12px 14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#1a1f1a url('${escapeAttr(p.user_avatar || '')}') center/cover;flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:#F8F6F1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.user_nom)}</div>
                <div style="font-size:10px;color:rgba(248,246,241,.5);font-family:'Space Mono',monospace;">${catEmoji} ${p.quartier || p.ville || '—'}</div>
              </div>
            </div>
            ${p.description ? `<div style="font-size:12px;color:rgba(248,246,241,.7);margin-bottom:10px;line-height:1.4;max-height:54px;overflow:hidden;">${escapeHtml(p.description)}</div>` : ''}
            <div style="display:flex;gap:4px;align-items:center;">
              <button onclick="murToggleLike('${p.id}',this)" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(232,148,10,.2);background:transparent;color:${p.liked_by_me ? '#E8940A' : '#F8F6F1'};cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;gap:5px;">
                ${p.liked_by_me ? '❤️' : '🤍'} <span class="like-count">${p.nb_likes || 0}</span>
              </button>
              <button onclick="murOpenComments('${p.id}')" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(232,148,10,.2);background:transparent;color:#F8F6F1;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;gap:5px;">
                💬 ${p.nb_commentaires || 0}
              </button>
              <button onclick="murShareWhatsApp('${p.id}')" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(37,211,102,.3);background:rgba(37,211,102,.08);color:#25d366;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;gap:5px;">
                📲 ${p.nb_shares || 0}
              </button>
            </div>
          </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────
  // DÉCOUVRIR
  // ──────────────────────────────────────────
  function discoverContentHTML(){
    const modes = [
      { id: 'swipe', lbl: '📲 Swipe', hint: 'Défile comme TikTok' },
      { id: 'duel', lbl: '⚔️ Duel', hint: 'Choisis entre 2 photos' },
      { id: 'roulette', lbl: '🎡 Roulette', hint: 'Découvre une inconnue' },
    ];
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
        ${modes.map(m => `
          <button onclick="murSetDiscoverMode('${m.id}')" style="flex:1;min-width:130px;padding:14px 18px;border-radius:14px;border:1px solid ${state.discoverMode === m.id ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${state.discoverMode === m.id ? 'rgba(232,148,10,.15)' : 'transparent'};color:${state.discoverMode === m.id ? '#E8940A' : '#F8F6F1'};cursor:pointer;text-align:left;">
            <div style="font-size:16px;font-weight:700;margin-bottom:2px;">${m.lbl}</div>
            <div style="font-size:11px;opacity:.7;">${m.hint}</div>
          </button>
        `).join('')}
      </div>
      ${state.discoverMode === 'swipe' ? swipeHTML() : state.discoverMode === 'duel' ? duelHTML() : rouletteHTML()}
    `;
  }

  function swipeHTML(){
    if (!state.photos?.length) return emptyFeedHTML('Pas encore de photo à découvrir. Reviens après quelques posts.');
    const idx = state.swipeIndex;
    const p = state.photos[idx];
    if (!p) return `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:48px;margin-bottom:12px;">✨</div>
        <h3 style="font-family:'Fraunces',serif;margin:0 0 6px;">Tu as tout vu ce mois !</h3>
        <p style="color:rgba(248,246,241,.6);">Reviens demain pour de nouvelles reines.</p>
        <button onclick="murChangeTab('feed')" style="margin-top:16px;padding:10px 20px;background:#E8940A;color:#0f1410;border:none;border-radius:999px;font-weight:700;cursor:pointer;">Retour au feed</button>
      </div>
    `;
    return `
      <div style="max-width:420px;margin:0 auto;">
        <div style="font-size:11px;color:rgba(248,246,241,.5);text-align:center;margin-bottom:8px;font-family:'Space Mono',monospace;">${idx + 1} / ${state.photos.length}</div>
        <div style="aspect-ratio:4/5;background:#1a1f1a url('${escapeAttr(p.photo_url)}') center/cover;border-radius:20px;position:relative;overflow:hidden;">
          <div style="position:absolute;inset:auto 0 0 0;padding:20px;background:linear-gradient(to top,rgba(15,20,16,.95),transparent);">
            <div style="font-family:'Fraunces',serif;font-size:20px;font-weight:900;margin-bottom:2px;">${escapeHtml(p.user_nom)}</div>
            <div style="font-size:12px;color:rgba(248,246,241,.7);font-family:'Space Mono',monospace;">${p.categorie === 'coiffure' ? '✂️' : p.categorie === 'couture' ? '👗' : '📷'} ${p.quartier || p.ville || '—'} · ${p.nb_likes || 0} ❤️</div>
            ${p.description ? `<div style="font-size:13px;color:rgba(248,246,241,.85);margin-top:6px;">${escapeHtml(p.description)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button onclick="murSwipeNext(false)" style="flex:1;padding:14px;border-radius:14px;border:1px solid rgba(248,246,241,.15);background:transparent;color:#F8F6F1;font-weight:700;cursor:pointer;">⏭️ Passer</button>
          <button onclick="murSwipeLike('${p.id}')" style="flex:2;padding:14px;border-radius:14px;border:none;background:#E8940A;color:#0f1410;font-weight:700;font-size:15px;cursor:pointer;">❤️ Like & suivant</button>
        </div>
      </div>
    `;
  }

  function duelHTML(){
    if (!state.duelPair || state.duelPair.length < 2) return emptyFeedHTML('Pas assez de photos pour un duel.');
    return `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-family:'Fraunces',serif;font-size:20px;font-weight:900;">Laquelle tu préfères ?</div>
        <div style="font-size:12px;color:rgba(248,246,241,.5);margin-top:4px;">1 clic = 1 vote. Ensuite on tire au sort 2 nouvelles.</div>
        ${state.duelCount > 0 && state.duelCount % 5 === 0 ? `
          <div style="margin-top:10px;">
            <button onclick="murShareGeneral()" style="padding:8px 16px;background:#25D366;color:white;border:none;border-radius:999px;font-weight:700;cursor:pointer;font-size:12px;">📲 Envoie ce duel à une amie</button>
          </div>
        ` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:680px;margin:0 auto;">
        ${state.duelPair.map(p => `
          <button onclick="murDuelVote('${p.id}')" style="padding:0;border:2px solid rgba(232,148,10,.25);background:#0f1410;border-radius:14px;overflow:hidden;cursor:pointer;">
            <div style="aspect-ratio:4/5;background:#1a1f1a url('${escapeAttr(p.photo_url)}') center/cover;"></div>
            <div style="padding:10px 12px;text-align:left;color:#F8F6F1;">
              <div style="font-size:13px;font-weight:700;">${escapeHtml(p.user_nom)}</div>
              <div style="font-size:10px;color:rgba(248,246,241,.5);font-family:'Space Mono',monospace;">${p.quartier || p.ville || '—'} · ${p.nb_likes} ❤️</div>
            </div>
          </button>
        `).join('')}
      </div>
    `;
  }

  function rouletteHTML(){
    const p = state.roulette;
    if (!p) return emptyFeedHTML();
    return `
      <div style="max-width:420px;margin:0 auto;text-align:center;">
        <div style="font-size:11px;color:rgba(248,246,241,.5);margin-bottom:8px;font-family:'Space Mono',monospace;">LA ROULETTE · Tombée au hasard</div>
        <div style="aspect-ratio:4/5;background:#1a1f1a url('${escapeAttr(p.photo_url)}') center/cover;border-radius:20px;"></div>
        <div style="margin-top:12px;">
          <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;">${escapeHtml(p.user_nom)}</div>
          <div style="font-size:12px;color:rgba(248,246,241,.6);font-family:'Space Mono',monospace;">${p.categorie === 'coiffure' ? '✂️' : p.categorie === 'couture' ? '👗' : '📷'} ${p.quartier || p.ville || '—'} · ${p.nb_likes} ❤️</div>
          ${p.description ? `<div style="font-size:13px;color:rgba(248,246,241,.8);margin-top:8px;">${escapeHtml(p.description)}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button onclick="murToggleLike('${p.id}',this).then(()=>murSetDiscoverMode('roulette'))" style="flex:1;padding:14px;border-radius:14px;border:none;background:#E8940A;color:#0f1410;font-weight:700;cursor:pointer;">❤️ Like</button>
          <button onclick="murSetDiscoverMode('roulette')" style="flex:1;padding:14px;border-radius:14px;border:1px solid rgba(248,246,241,.15);background:transparent;color:#F8F6F1;font-weight:700;cursor:pointer;">🎡 Une autre</button>
        </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────
  // PODIUM
  // ──────────────────────────────────────────
  function podiumContentHTML(){
    return `
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <button onclick="murSetPodiumCat('coiffure')" style="flex:1;padding:12px;border-radius:12px;border:1px solid ${state.podiumCat === 'coiffure' ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${state.podiumCat === 'coiffure' ? 'rgba(232,148,10,.15)' : 'transparent'};color:${state.podiumCat === 'coiffure' ? '#E8940A' : '#F8F6F1'};font-weight:700;cursor:pointer;">✂️ Podium Coiffure · 100 000 F × 2</button>
        <button onclick="murSetPodiumCat('couture')" style="flex:1;padding:12px;border-radius:12px;border:1px solid ${state.podiumCat === 'couture' ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${state.podiumCat === 'couture' ? 'rgba(232,148,10,.15)' : 'transparent'};color:${state.podiumCat === 'couture' ? '#E8940A' : '#F8F6F1'};font-weight:700;cursor:pointer;">👗 Podium Couture · 100 000 F × 2</button>
      </div>
      <h3 style="font-family:'Fraunces',serif;margin:8px 0 12px;">Top 10 du mois</h3>
      ${state.photos.length === 0 ? `<div style="padding:30px;text-align:center;color:rgba(248,246,241,.5);">Aucune candidate encore. Les premières postent maintenant.</div>` : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
          ${state.photos.map((p, i) => podiumCardHTML(p, i+1)).join('')}
        </div>
      `}
      <h3 style="font-family:'Fraunces',serif;margin:32px 0 12px;">🏙️ Battle des villes · Top 10</h3>
      ${leaderboardHTML(state.leaderboard)}
      ${state.duels.length > 0 ? `
        <h3 style="font-family:'Fraunces',serif;margin:32px 0 12px;">⚔️ Duels de la semaine</h3>
        ${state.duels.map(duelCardHTML).join('')}
      ` : ''}
    `;
  }

  function podiumCardHTML(p, rang){
    const medal = rang === 1 ? '🥇' : rang === 2 ? '🥈' : rang === 3 ? '🥉' : '';
    return `
      <div style="background:#0f1410;border:1px solid ${rang <= 3 ? '#E8940A' : 'rgba(232,148,10,.15)'};border-radius:14px;overflow:hidden;position:relative;">
        <div style="position:absolute;top:10px;left:10px;z-index:2;background:rgba(15,20,16,.85);color:#E8940A;padding:4px 10px;border-radius:999px;font-weight:900;font-size:12px;">${medal} #${rang}</div>
        <div onclick="murOpenPhoto('${p.id}')" style="aspect-ratio:4/5;background:#1a1f1a url('${escapeAttr(p.photo_url)}') center/cover;cursor:pointer;"></div>
        <div style="padding:10px 12px;">
          <div style="font-size:13px;font-weight:700;">${escapeHtml(p.user_nom)}</div>
          <div style="font-size:10px;color:rgba(248,246,241,.5);font-family:'Space Mono',monospace;">${p.quartier || p.ville || '—'}</div>
          <div style="margin-top:6px;font-size:12px;color:#E8940A;font-weight:700;">${p.nb_likes || 0} ❤️ · ${p.nb_commentaires || 0} 💬</div>
        </div>
      </div>
    `;
  }

  function leaderboardHTML(items){
    if (!items?.length) return `<div style="padding:20px;color:rgba(248,246,241,.5);text-align:center;">Pas encore de classement ce mois.</div>`;
    return `
      <div style="background:#0f1410;border:1px solid rgba(232,148,10,.15);border-radius:14px;overflow:hidden;">
        ${items.map((it, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;${i < items.length-1 ? 'border-bottom:1px solid rgba(232,148,10,.08);' : ''}">
            <div style="width:32px;text-align:center;font-weight:900;color:${i<3 ? '#E8940A' : 'rgba(248,246,241,.5)'};">${i+1}</div>
            <div style="width:36px;height:36px;border-radius:50%;background:#1a1f1a url('${escapeAttr(it.avatar || '')}') center/cover;"></div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.nom)}</div>
              <div style="font-size:10px;color:rgba(248,246,241,.5);font-family:'Space Mono',monospace;">${it.ville || it.quartier || '—'} · ${it.nb_photos} photos</div>
            </div>
            <div style="font-weight:700;color:#E8940A;">${it.total_likes} ❤️</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function duelCardHTML(d){
    const total = (d.votes_a || 0) + (d.votes_b || 0);
    return `
      <div style="background:#0f1410;border:1px solid rgba(232,148,10,.2);border-radius:14px;padding:14px;margin-bottom:10px;">
        <div style="font-size:11px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:2px;font-family:'Space Mono',monospace;margin-bottom:6px;">${d.type === 'quartier' ? 'Quartiers' : d.type === 'ville' ? 'Villes' : 'Catégories'}</div>
        <div style="display:flex;gap:8px;">
          <button onclick="murDuelVoteGlobal('${d.id}','a')" style="flex:1;padding:12px;border-radius:10px;border:1px solid ${d.mon_vote === 'a' ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${d.mon_vote === 'a' ? 'rgba(232,148,10,.2)' : 'transparent'};color:#F8F6F1;font-weight:700;cursor:${d.mon_vote ? 'default' : 'pointer'};">${escapeHtml(d.nom_a)}<br><span style="font-size:11px;opacity:.6;">${d.votes_a || 0} votes</span></button>
          <div style="display:flex;align-items:center;justify-content:center;font-weight:900;color:#E8940A;">VS</div>
          <button onclick="murDuelVoteGlobal('${d.id}','b')" style="flex:1;padding:12px;border-radius:10px;border:1px solid ${d.mon_vote === 'b' ? '#E8940A' : 'rgba(232,148,10,.2)'};background:${d.mon_vote === 'b' ? 'rgba(232,148,10,.2)' : 'transparent'};color:#F8F6F1;font-weight:700;cursor:${d.mon_vote ? 'default' : 'pointer'};">${escapeHtml(d.nom_b)}<br><span style="font-size:11px;opacity:.6;">${d.votes_b || 0} votes</span></button>
        </div>
        ${total > 0 ? `
          <div style="display:flex;height:6px;background:rgba(248,246,241,.08);border-radius:999px;margin-top:10px;overflow:hidden;">
            <div style="width:${d.pct_a.toFixed(0)}%;background:#E8940A;"></div>
            <div style="width:${d.pct_b.toFixed(0)}%;background:rgba(248,246,241,.3);"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(248,246,241,.5);margin-top:4px;font-family:'Space Mono',monospace;">
            <span>${d.pct_a.toFixed(0)}%</span><span>${total} votes</span><span>${d.pct_b.toFixed(0)}%</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ──────────────────────────────────────────
  // MON MUR
  // ──────────────────────────────────────────
  function moiContentHTML(){
    if (!window.currentUser?.id) return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.7);">Connecte-toi pour voir ton mur personnel.</div>`;
    if (!state.photos?.length) return `
      <div style="padding:40px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🌱</div>
        <h3 style="font-family:'Fraunces',serif;margin:0 0 6px;">Ton mur attend sa 1ère reine.</h3>
        <p style="color:rgba(248,246,241,.6);max-width:360px;margin:6px auto 20px;">Poste ta 1ère photo. Cheveux, couture, peu importe. Ici c'est chez toi.</p>
        <button onclick="murOpenPoster()" style="padding:12px 24px;background:#E8940A;color:#0f1410;border:none;border-radius:999px;font-weight:700;cursor:pointer;">📸 Poster ma 1ère photo</button>
      </div>
    `;
    return `
      ${statsBarHTML()}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
        ${state.photos.map(photoCardHTML).join('')}
      </div>
      <div style="margin-top:24px;">
        <h3 style="font-family:'Fraunces',serif;margin-bottom:10px;">Tes badges</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${(state.badges?.badges || []).map(b => `
            <div style="background:rgba(232,148,10,.08);border:1px solid rgba(232,148,10,.2);border-radius:12px;padding:10px 14px;min-width:110px;text-align:center;">
              <div style="font-size:26px;">${b.emoji || '🏅'}</div>
              <div style="font-size:12px;font-weight:700;margin-top:4px;">${escapeHtml(b.titre || b.badge_type)}</div>
              <div style="font-size:10px;color:rgba(248,246,241,.5);margin-top:2px;">${escapeHtml(b.hint || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────
  function skeletonHTML(){
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">Chargement du mur…</div>`;
  }
  function loaderHTML(){
    return `<div style="padding:40px;text-align:center;color:rgba(248,246,241,.5);">…</div>`;
  }
  function emptyFeedHTML(msg){
    return `
      <div style="padding:40px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">📷</div>
        <h3 style="font-family:'Fraunces',serif;margin:0 0 6px;">${msg || 'Le mur attend ses premières reines.'}</h3>
        <p style="color:rgba(248,246,241,.6);max-width:360px;margin:6px auto 20px;">Sois la 1ère à poster ce mois. Les sœurs vont suivre.</p>
        <button onclick="murOpenPoster()" style="padding:12px 24px;background:#E8940A;color:#0f1410;border:none;border-radius:999px;font-weight:700;cursor:pointer;">📸 Poster ma photo</button>
      </div>
    `;
  }
  function fabPosterHTML(){
    return `<button onclick="murOpenPoster()" style="position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;background:#E8940A;color:#0f1410;border:none;font-size:24px;cursor:pointer;box-shadow:0 10px 30px rgba(232,148,10,.4);z-index:98;">📸</button>`;
  }
  function monthLabel(){
    const m = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const d = new Date();
    return `${m[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
  }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  // ──────────────────────────────────────────
  // ACTIONS PUBLIQUES (window.*)
  // ──────────────────────────────────────────
  window.murChangeTab = (t) => loadTab(t);
  window.murSetCat = (c) => { state.categorie = c; loadTab(state.tab); };
  window.murSetFeedTab = (f) => { state.feedTab = f; loadFeed().then(render); };
  window.murSetDiscoverMode = (m) => { state.discoverMode = m; loadDiscover().then(render); };
  window.murSetPodiumCat = (c) => { state.podiumCat = c; loadPodium().then(render); };

  window.murSwipeNext = () => { state.swipeIndex++; render(); };
  window.murSwipeLike = async (photoId) => {
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('accéder au Mur des Reines');}else{window.showPage&&window.showPage('inscription');} return; }
    const fn = window.woloFetch || fetch;
    await fn(`${API}/feed-like`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: window.currentUser.id, photo_id: photoId }) }).catch(()=>{});
    state.swipeIndex++;
    render();
  };
  window.murDuelVote = async (photoId) => {
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('accéder au Mur des Reines');}else{window.showPage&&window.showPage('inscription');} return; }
    const fn = window.woloFetch || fetch;
    await fn(`${API}/feed-like`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: window.currentUser.id, photo_id: photoId }) }).catch(()=>{});
    await loadDiscover(); render();
  };
  window.murDuelVoteGlobal = async (duelId, choix) => {
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('accéder au Mur des Reines');}else{window.showPage&&window.showPage('inscription');} return; }
    const fn = window.woloFetch || fetch;
    await fn(`${API}/duels-list`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: window.currentUser.id, duel_id: duelId, choix }) }).catch(()=>{});
    await loadPodium(); render();
  };

  window.murToggleLike = async (photoId, btn) => {
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('accéder au Mur des Reines');}else{window.showPage&&window.showPage('inscription');} return; }
    const fn = window.woloFetch || fetch;
    try {
      const r = await fn(`${API}/feed-like`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: window.currentUser.id, photo_id: photoId }) }).then(r => r.json());
      if (btn && r) {
        const liked = r.liked;
        btn.style.color = liked ? '#E8940A' : '#F8F6F1';
        const countEl = btn.querySelector('.like-count');
        if (countEl) countEl.textContent = String((parseInt(countEl.textContent) || 0) + (liked ? 1 : -1));
        btn.innerHTML = btn.innerHTML.replace(/🤍|❤️/, liked ? '❤️' : '🤍');
      }
    } catch(e){ console.warn('[mur] like', e); }
  };

  window.murShareGeneral = () => {
    const msg = encodeURIComponent(`👑 Le Mur des Reines — WOLO Market\n\nCoiffure ou Couture ? Vote pour ta Reine du mois.\n100 000 FCFA × 2 Reines (1 Bénin + 1 Togo) chaque mois.\n+ 1 000 000 FCFA en finale décembre — Bénin vs Togo.\n\nTout le monde vote gratuitement !\nTa cousine à Paris ? Ta tante à Bruxelles ? Elles peuvent voter aussi.\n\n👉 https://wolomarket.com/#awards\n\n#MurDesReines #ReineWOLO #WOLOMarket`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  window.murShareWhatsApp = async (photoId) => {
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('accéder au Mur des Reines');}else{window.showPage&&window.showPage('inscription');} return; }
    const fn = window.woloFetch || fetch;
    try {
      const r = await fn(`${API}/vote-share`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: window.currentUser.id, photo_id: photoId }) }).then(r => r.json());
      if (r?.whatsapp_url) window.open(r.whatsapp_url, '_blank');
    } catch(e){ console.warn('[mur] share', e); }
  };

  window.murOpenPhoto = (photoId) => {
    const p = state.photos.find(x => x.id === photoId) || state.duelPair.find(x => x.id === photoId) || state.roulette;
    if (!p) return;
    const modal = document.getElementById('mur-photo-modal');
    if (modal) modal.remove();
    const html = `
      <div id="mur-photo-modal" style="position:fixed;inset:0;background:rgba(15,20,16,.92);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this){this.remove();}">
        <div style="max-width:620px;width:100%;max-height:90vh;overflow-y:auto;background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:20px;">
          <div style="aspect-ratio:4/5;background:#1a1f1a url('${escapeAttr(p.photo_url)}') center/cover;"></div>
          <div style="padding:20px 24px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="width:44px;height:44px;border-radius:50%;background:#1a1f1a url('${escapeAttr(p.user_avatar || '')}') center/cover;"></div>
              <div>
                <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:900;">${escapeHtml(p.user_nom)}</div>
                <div style="font-size:11px;color:rgba(248,246,241,.5);font-family:'Space Mono',monospace;">${p.categorie === 'coiffure' ? '✂️ Coiffure' : p.categorie === 'couture' ? '👗 Couture' : '📷'} · ${p.quartier || p.ville || '—'}</div>
              </div>
            </div>
            ${p.theme_mois ? `<div style="background:rgba(232,148,10,.08);border-left:3px solid #E8940A;padding:10px 12px;font-size:12px;margin-bottom:10px;">🎯 ${escapeHtml(p.theme_mois)}</div>` : ''}
            ${p.description ? `<p style="color:rgba(248,246,241,.8);font-size:14px;margin-bottom:14px;">${escapeHtml(p.description)}</p>` : ''}
            <div style="display:flex;gap:8px;margin-bottom:16px;">
              <button onclick="murToggleLike('${p.id}',this)" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(232,148,10,.2);background:transparent;color:#F8F6F1;cursor:pointer;">${p.liked_by_me ? '❤️' : '🤍'} <span class="like-count">${p.nb_likes||0}</span></button>
              <button onclick="murShareWhatsApp('${p.id}')" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(37,211,102,.3);background:rgba(37,211,102,.08);color:#25d366;cursor:pointer;">📲 Partager WhatsApp</button>
            </div>
            <h4 style="margin:0 0 10px;font-family:'Fraunces',serif;">Commentaires</h4>
            <div id="mur-comments-box" style="max-height:280px;overflow-y:auto;margin-bottom:12px;"><div style="color:rgba(248,246,241,.5);font-size:12px;">Chargement…</div></div>
            ${window.currentUser?.id ? `
              <div style="display:flex;gap:8px;">
                <input id="mur-comment-input" placeholder="Laisse un mot doux…" style="flex:1;padding:10px 14px;border-radius:999px;border:1px solid rgba(248,246,241,.15);background:#1a1f1a;color:#F8F6F1;">
                <button onclick="murPostComment('${p.id}')" style="padding:10px 18px;border-radius:999px;border:none;background:#E8940A;color:#0f1410;font-weight:700;cursor:pointer;">Envoyer</button>
              </div>
            ` : `<div style="font-size:12px;color:rgba(248,246,241,.5);text-align:center;">Connecte-toi pour commenter</div>`}
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    loadCommentsInto(p.id);
  };

  async function loadCommentsInto(photoId){
    try {
      const r = await fetch(`${API}/feed-comment?photo_id=${photoId}`).then(r => r.json());
      const box = document.getElementById('mur-comments-box');
      if (!box) return;
      if (!r?.comments?.length) { box.innerHTML = `<div style="color:rgba(248,246,241,.5);font-size:12px;">Sois la 1ère à commenter.</div>`; return; }
      box.innerHTML = r.comments.map(c => `
        <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(248,246,241,.05);">
          <div style="width:30px;height:30px;border-radius:50%;background:#1a1f1a url('${escapeAttr(c.user_avatar || '')}') center/cover;flex-shrink:0;"></div>
          <div><div style="font-weight:700;font-size:12px;">${escapeHtml(c.user_nom)}</div><div style="font-size:13px;color:rgba(248,246,241,.85);">${escapeHtml(c.contenu)}</div></div>
        </div>
      `).join('');
    } catch(e){ console.warn('[mur] comments', e); }
  }

  window.murOpenComments = (id) => window.murOpenPhoto(id);

  window.murPostComment = async (photoId) => {
    const input = document.getElementById('mur-comment-input');
    if (!input || !input.value.trim()) return;
    const fn = window.woloFetch || fetch;
    await fn(`${API}/feed-comment`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: window.currentUser.id, photo_id: photoId, contenu: input.value.trim() }) }).catch(()=>{});
    input.value = '';
    loadCommentsInto(photoId);
  };

  // ──────────────────────────────────────────
  // UPLOAD PHOTO (Poster)
  // ──────────────────────────────────────────
  window.murOpenPoster = () => {
    if (!window.currentUser?.id) { if(typeof verifierConnexionOuPopup==='function'){verifierConnexionOuPopup('accéder au Mur des Reines');}else{window.showPage&&window.showPage('inscription');} return; }
    const existing = document.getElementById('mur-poster-modal');
    if (existing) existing.remove();
    const t = state.theme || {};
    const html = `
      <div id="mur-poster-modal" style="position:fixed;inset:0;background:rgba(15,20,16,.96);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;" onclick="if(event.target===this){this.remove();}">
        <div style="max-width:520px;width:100%;background:#0f1410;border:1px solid rgba(232,148,10,.3);border-radius:20px;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
            <div>
              <div style="font-size:11px;color:#E8940A;letter-spacing:2px;font-family:'Space Mono',monospace;">POSTER UNE PHOTO</div>
              <h2 style="margin:4px 0 0;font-family:'Fraunces',serif;font-size:24px;">Montre ton talent 👑</h2>
            </div>
            <button onclick="document.getElementById('mur-poster-modal').remove()" style="background:transparent;border:none;color:#F8F6F1;font-size:24px;cursor:pointer;">×</button>
          </div>
          <label style="display:block;font-size:11px;color:rgba(248,246,241,.6);margin-bottom:6px;letter-spacing:1px;">CATÉGORIE</label>
          <div style="display:flex;gap:6px;margin-bottom:16px;">
            <label style="flex:1;"><input type="radio" name="murCat" value="coiffure" checked style="display:none;" onchange="murToggleCatRadio(this)"><div class="murCatBtn active" data-cat="coiffure" style="padding:10px;border-radius:10px;border:1px solid #E8940A;background:rgba(232,148,10,.15);color:#E8940A;text-align:center;cursor:pointer;font-weight:700;font-size:13px;">✂️ Coiffure</div></label>
            <label style="flex:1;"><input type="radio" name="murCat" value="couture" style="display:none;" onchange="murToggleCatRadio(this)"><div class="murCatBtn" data-cat="couture" style="padding:10px;border-radius:10px;border:1px solid rgba(232,148,10,.2);background:transparent;color:#F8F6F1;text-align:center;cursor:pointer;font-weight:700;font-size:13px;">👗 Couture</div></label>
            <label style="flex:1;"><input type="radio" name="murCat" value="libre" style="display:none;" onchange="murToggleCatRadio(this)"><div class="murCatBtn" data-cat="libre" style="padding:10px;border-radius:10px;border:1px solid rgba(232,148,10,.2);background:transparent;color:#F8F6F1;text-align:center;cursor:pointer;font-weight:700;font-size:13px;">📷 Libre</div></label>
          </div>
          <div id="murThemeIndicator" style="background:rgba(232,148,10,.08);border-left:3px solid #E8940A;padding:10px 12px;font-size:12px;margin-bottom:14px;">🎯 Thème du mois : <strong>${escapeHtml(t.theme_coiffure || '—')}</strong></div>
          <label style="display:block;font-size:11px;color:rgba(248,246,241,.6);margin-bottom:6px;letter-spacing:1px;">PHOTOS (jusqu'à 3 photos · format carré ou 4:5 recommandé)</label>
          <input type="file" id="murFile" accept="image/*" multiple style="width:100%;padding:10px;border-radius:10px;border:1px dashed rgba(232,148,10,.3);background:rgba(232,148,10,.05);color:#F8F6F1;margin-bottom:6px;">
          <div style="font-size:11px;color:rgba(248,246,241,.45);margin-bottom:14px;font-style:italic;">📸 Tu peux poster jusqu'à 3 photos — comme sur Tinder. La 1ère = principale, les 2 autres = détails (côté, dos, accessoire, posture).</div>
          <div id="murPreview" style="margin-bottom:14px;display:none;aspect-ratio:4/5;background:#1a1f1a center/cover;border-radius:12px;"></div>
          <label style="display:block;font-size:11px;color:rgba(248,246,241,.6);margin-bottom:6px;letter-spacing:1px;">TAG DE LA COIFFEUSE / COUTURIÈRE <span style="color:#E8940A;">— OBLIGATOIRE</span></label>
          <input type="text" id="murTag" placeholder="Ex: @reine_des_tresses_cotonou ou nom de la couturière" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(232,148,10,.3);background:#1a1f1a;color:#F8F6F1;margin-bottom:6px;">
          <div style="font-size:11px;color:rgba(248,246,241,.55);margin-bottom:14px;line-height:1.5;">💛 Sans tag, ta photo n'est pas éligible. Si tu es l'apprentie ou la pro, tu peux te tagger toi-même.</div>
          <label style="display:block;font-size:11px;color:rgba(248,246,241,.6);margin-bottom:6px;letter-spacing:1px;">LÉGENDE (facultative · 500 char max)</label>
          <textarea id="murDesc" rows="3" maxlength="500" placeholder="Qui t'as appris ? Ça a pris combien de temps ? Raconte." style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(248,246,241,.1);background:#1a1f1a;color:#F8F6F1;margin-bottom:8px;resize:vertical;"></textarea>
          <div style="background:rgba(232,148,10,.05);border:1px solid rgba(232,148,10,.18);border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:rgba(248,246,241,.65);line-height:1.55;">⚠️ Si une autre personne porte la coupe ou la tenue sur la photo, assure-toi qu'elle a donné son accord pour figurer sur Le Mur des Reines.</div>
          <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:rgba(248,246,241,.75);margin-bottom:16px;cursor:pointer;">
            <input type="checkbox" id="murAwards" style="margin-top:3px;">
            <span>📣 <strong>Candidater officiellement pour Le Mur des Reines</strong> (100 000 F × 2 Reines/mois — ouvert à toutes les femmes B/T)</span>
          </label>
          <button onclick="murSubmitPhoto()" id="murSubmitBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#E8940A;color:#0f1410;font-weight:900;font-size:15px;cursor:pointer;">Poster sur le mur ✨</button>
          <div id="murSubmitMsg" style="margin-top:10px;font-size:12px;text-align:center;color:rgba(248,246,241,.6);"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('murFile').addEventListener('change', onFileChange);
  };

  window.murToggleCatRadio = (input) => {
    document.querySelectorAll('.murCatBtn').forEach(el => {
      el.style.border = '1px solid rgba(232,148,10,.2)';
      el.style.background = 'transparent';
      el.style.color = '#F8F6F1';
    });
    const btn = document.querySelector(`.murCatBtn[data-cat="${input.value}"]`);
    if (btn) { btn.style.border = '1px solid #E8940A'; btn.style.background = 'rgba(232,148,10,.15)'; btn.style.color = '#E8940A'; }
    const t = state.theme || {};
    const ind = document.getElementById('murThemeIndicator');
    if (ind) {
      const themeTxt = input.value === 'couture' ? (t.theme_couture || '—') : input.value === 'coiffure' ? (t.theme_coiffure || '—') : 'Photo libre — pose ce que tu veux';
      ind.innerHTML = `🎯 Thème du mois : <strong>${escapeHtml(themeTxt)}</strong>`;
    }
  };

  let selectedFiles = [];
  async function onFileChange(e){
    const files = Array.from(e.target.files || []).slice(0, 3);  // max 3 photos
    if (!files.length) return;
    selectedFiles = files;
    const prev = document.getElementById('murPreview');
    if (prev) {
      // Mosaïque : 1ère grande, 2 autres en bandeau
      const urls = files.map(f => URL.createObjectURL(f));
      prev.style.display = 'block';
      prev.style.backgroundImage = `url('${urls[0]}')`;
      // Petits indicateurs des autres photos
      const ind = document.getElementById('murPhotosIndicator');
      if (ind) ind.textContent = `📸 ${files.length} photo${files.length > 1 ? 's' : ''} sélectionnée${files.length > 1 ? 's' : ''}`;
    }
  }

  window.murSubmitPhoto = async () => {
    const btn = document.getElementById('murSubmitBtn');
    const msg = document.getElementById('murSubmitMsg');
    if (!selectedFiles.length) { if (msg) msg.textContent = 'Choisis au moins une photo.'; return; }
    btn.disabled = true; btn.textContent = 'Envoi…';

    const cat = document.querySelector('input[name="murCat"]:checked')?.value || 'coiffure';
    const desc = document.getElementById('murDesc')?.value || '';
    const tagPro = (document.getElementById('murTag')?.value || '').trim();
    const isAwards = document.getElementById('murAwards')?.checked || false;

    if (isAwards && !tagPro) {
      if (msg) msg.textContent = '⚠️ Pour candidater au Mur des Reines, le tag de la coiffeuse / couturière est obligatoire (sinon ta photo n\'est pas éligible).';
      btn.disabled = false; btn.textContent = 'Poster sur le mur ✨';
      return;
    }

    try {
      // Upload toutes les photos via ImgBB en parallèle
      btn.textContent = `Upload 1/${selectedFiles.length}…`;
      const uploads = await Promise.all(selectedFiles.map(async (f, i) => {
        const fd = new FormData();
        fd.append('image', f);
        const up = await fetch('/api/imgbb-proxy', { method:'POST', body: fd }).then(r => r.json());
        if (!up?.url) throw new Error(`Upload photo ${i+1} échoué`);
        return up.url;
      }));
      btn.textContent = 'Envoi…';

      // Poster
      const fn = window.woloFetch || fetch;
      const prof = window.currentPrestataire?.fields || {};
      const r = await fn(`${API}/feed-post`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        user_id: window.currentUser.id,
        photo_url: uploads[0],                  // photo principale (compat)
        photos_url: uploads,                    // toutes les photos (jsonb 1-3)
        description: desc,
        categorie: cat,
        quartier: prof['Quartier'] || null,
        ville: prof['Ville'] || null,
        pays: prof['Pays'] || null,
        is_awards_candidate: isAwards,
        tag_pro_libre: tagPro || null,         // tag manuel (nom libre, futur lookup auto)
      }) }).then(r => r.json());

      if (r?.error) { msg.textContent = r.error; btn.disabled = false; btn.textContent = 'Poster sur le mur ✨'; return; }

      msg.innerHTML = `✅ ${r.message || 'Postée !'}${r.badge_debloque ? ` · Badge débloqué : ${r.badge_debloque}` : ''}`;
      setTimeout(() => {
        document.getElementById('mur-poster-modal')?.remove();
        loadMurDesReines();
      }, 1500);
    } catch(e){
      console.warn('[mur] submit', e);
      msg.textContent = 'Erreur — réessaie.';
      btn.disabled = false; btn.textContent = 'Poster sur le mur ✨';
    }
  };
})();
