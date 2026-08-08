/* ============================================================
   WOZALI Jobs — Onboarding « Le travail te trouve » (Lot 3)
   Module AUTONOME, ADDITIF, GATED. Ne touche pas le coach diagnostic.
   - Flux texte adaptatif (cluster metier + relance + etudes + competences + preuve)
   - Sauvegarde dans la table de base wozali_prestataires (colonnes marche 1)
   - INERTE tant que le flag n'est pas actif :
       localStorage['wz_emploi_onboarding_beta'] === '1'  OU  URL ?onboarding=beta
   - Voix Celine + extraction IA = lots ulterieurs (ici : texte, sauvegarde reelle)
   Ouvre via : window.wozaliEmploiOnboarding.open()
   ============================================================ */
(function () {
  'use strict';

  function flagOn() {
    try {
      if (location.search.indexOf('onboarding=beta') !== -1) { localStorage.setItem('wz_emploi_onboarding_beta', '1'); }
      return localStorage.getItem('wz_emploi_onboarding_beta') === '1';
    } catch (e) { return false; }
  }
  function sbClient() {
    var c = window.supabase;
    return (c && typeof c.from === 'function') ? c : null;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }
  function cap(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function skillList(a) { return String(a.skills || '').split(/[,;/]|\bet\b/).map(function (x) { return x.trim(); }).filter(Boolean); }
  // Reecriture pro (client-side, en attendant l'IA serveur Gemini/ameliorerCv).
  function buildPresentation(a) {
    var m = a.metier ? cap(a.metier) : 'Professionnel';
    var yrs = (String(a.exp || '').match(/(\d+)\s*an/) || [])[1];
    var head = m + (yrs ? (', ' + yrs + ' ans d\'expérience') : '') + '. ';
    var body = String(a.exp || '').replace(/^(je |j'|j’)/i, '').replace(/\s+/g, ' ').trim();
    return head + (body ? cap(body) : 'Travail soigné, livré dans les délais') + '. Sérieux, ponctuel, attentif aux détails.';
  }
  function computeScore(a) {
    var s = 45 + Math.min(20, String(a.exp || '').length / 12) + Math.min(12, skillList(a).length * 3) + (a.etudes ? 6 : 0);
    return Math.min(88, Math.round(s));
  }

  var CLUSTERS = [
    { re: /coutur|tailleur|stylist|brod|mode/i, k: 'couture' },
    { re: /electric|electro/i, k: 'electricite' },
    { re: /vend|commerc|boutiq|march|vente/i, k: 'vente' },
    { re: /coiff|tress|barb|beaut/i, k: 'coiffure' },
    { re: /macon|maçon|btp|batiment|carrel|peintre|plomb/i, k: 'maconnerie' },
    { re: /mecan|garage|moto|auto|tolier/i, k: 'mecanique' },
    { re: /cuisin|restau|chef|patiss|traiteur/i, k: 'restauration' },
    { re: /menage|ménage|nettoy|domestiq|linge/i, k: 'menage' },
    { re: /chauff|taxi|zemi|livr|transport|conduct/i, k: 'transport' }
  ];
  var METIER_Q = {
    couture: [{ id: 'c_type', q: 'Tu fais plutôt du sur-mesure, du prêt-à-porter, ou surtout des retouches ?' }, { id: 'c_machine', q: 'Quelles machines tu maîtrises ? (droite, surjeteuse, brodeuse...)' }],
    electricite: [{ id: 'e_type', q: 'Tu fais des installations dans les maisons, ou aussi de l\'industriel ?' }, { id: 'e_habil', q: 'Tu as une habilitation ou une attestation électrique ? Laquelle ?' }],
    vente: [{ id: 'v_prod', q: 'Tu vends quels produits, exactement ?' }, { id: 'v_role', q: 'Tu tiens la caisse et tu gères le stock, ou tu vends seulement ?' }],
    coiffure: [{ id: 'k_type', q: 'Tu fais quoi le mieux : tresses, tissage, coupe homme, soins ?' }, { id: 'k_lieu', q: 'Tu travailles dans un salon, ou tu te déplaces chez les clientes ?' }],
    maconnerie: [{ id: 'ma_type', q: 'Tu fais du gros œuvre, du carrelage, de la peinture, ou plusieurs ?' }, { id: 'ma_eq', q: 'Tu travailles seul, ou tu peux amener une équipe ?' }],
    mecanique: [{ id: 'me_type', q: 'Tu répares surtout des motos, des voitures, ou les deux ?' }, { id: 'me_lieu', q: 'Tu as ton propre garage, ou tu te déplaces ?' }],
    restauration: [{ id: 'r_type', q: 'Tu cuisines quoi le mieux, et pour combien de personnes tu peux servir ?' }],
    menage: [{ id: 'mn_type', q: 'Tu fais du ménage, de la lessive, la garde d\'enfants, ou plusieurs ?' }],
    transport: [{ id: 't_permis', q: 'Tu as le permis, et depuis combien de temps tu conduis ?' }, { id: 't_veh', q: 'Tu as ton propre véhicule (moto, voiture, tricycle) ?' }],
    generic: [{ id: 'g_task', q: 'Décris-moi une mission typique que tu fais très bien, du début à la fin.' }]
  };
  var PROBE = {
    exp: 'Donne-moi un exemple concret : qu\'est-ce que tu as fait récemment, et pour qui ?',
    skills: 'Ajoute une ou deux choses de plus. Qu\'est-ce que peu de gens font aussi bien que toi ?',
    _default: 'Tu peux m\'en dire un peu plus ? Deux mots de plus suffisent.'
  };
  function clusterOf(metier) {
    for (var i = 0; i < CLUSTERS.length; i++) { if (CLUSTERS[i].re.test(metier || '')) return CLUSTERS[i].k; }
    return 'generic';
  }

  var state = { queue: [], idx: 0, answers: {}, probed: {} };

  function buildQueue(metier) {
    var k = clusterOf(metier);
    state.answers._cluster = k;
    var tail = [
      { id: 'age', q: 'Quel âge tu as ?', ph: 'Ex: 27', min: 1 },
      { id: 'etudes', q: 'Jusqu\'où tu as étudié, et tu as un diplôme ou une formation dans ton métier ? Si tu n\'en as pas, ce n\'est pas grave, ton travail parle pour toi.', ph: 'Ex: CAP couture, ou appris sur le tas', min: 1 },
      { id: 'exp', q: 'Raconte-moi : depuis combien de temps tu fais ça, et qu\'est-ce que tu as déjà fait ? Parle normalement, comme à un client.', ph: 'Ex: 6 ans, robes, uniformes, retouches...', min: 8, probe: true }
    ];
    (METIER_Q[k] || METIER_Q.generic).forEach(function (mq) { tail.push({ id: mq.id, q: mq.q, ph: 'Ta réponse', min: 3, probe: true }); });
    tail.push({ id: 'skills', q: 'Et qu\'est-ce que tu sais bien faire ? Cite-moi trois ou quatre choses.', ph: 'Ex: coupe, broderie, mesures...', min: 3, probe: true });
    tail.push({ id: 'zone', q: 'Dernière chose : tu travailles dans quel quartier, et tu es disponible quand ?', ph: 'Ex: Tokoin, Lomé, tous les jours', min: 2 });
    return tail;
  }

  // ── Rendu overlay (charte Nuit) ──
  var root = null;
  function ov(html) {
    if (!root) {
      root = document.createElement('div');
      root.id = 'wz-emploi-onb';
      root.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d0a06;overflow-y:auto;font-family:Geist,system-ui,sans-serif;color:#FCE0A8;';
      document.body.appendChild(root);
    }
    root.innerHTML = html;
  }
  function close() { try { stopAud(); } catch (e) {} if (root) { root.remove(); root = null; } }

  var CSS = ''
    + '#wz-emploi-onb .wrap{max-width:460px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;padding:16px 16px 26px;}'
    + '#wz-emploi-onb .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}'
    + '#wz-emploi-onb .logo{font-family:"DM Serif Display",Georgia,serif;font-size:16px;}#wz-emploi-onb .logo em{color:#E8940A;font-style:italic;}'
    + '#wz-emploi-onb .x{background:none;border:none;color:rgba(252,224,168,.5);font-size:22px;cursor:pointer;}'
    + '#wz-emploi-onb .trk{height:5px;background:rgba(252,224,168,.12);border-radius:4px;overflow:hidden;margin-bottom:14px;}'
    + '#wz-emploi-onb .trk i{display:block;height:100%;background:#E8940A;transition:width .4s;}'
    + '#wz-emploi-onb .thread{flex:1;display:flex;flex-direction:column;gap:10px;}'
    + '#wz-emploi-onb .row{display:flex;gap:9px;align-items:flex-end;}#wz-emploi-onb .row.me{justify-content:flex-end;}'
    + '#wz-emploi-onb .av{width:34px;height:34px;border-radius:50%;background:#2a2113;border:1px solid #E8940A;display:grid;place-items:center;font-family:"DM Serif Display",Georgia,serif;color:#E8940A;flex:0 0 auto;}'
    + '#wz-emploi-onb .msg{max-width:80%;font-size:14px;line-height:1.5;padding:11px 13px;border-radius:15px;}'
    + '#wz-emploi-onb .msg.s{background:#1E180E;border:1px solid rgba(232,148,10,.24);border-bottom-left-radius:5px;}'
    + '#wz-emploi-onb .msg.m{background:#E8940A;color:#241500;border-bottom-right-radius:5px;font-weight:600;}'
    + '#wz-emploi-onb .composer{margin-top:12px;display:flex;flex-direction:column;gap:8px;}'
    + '#wz-emploi-onb textarea{background:#1E180E;border:1px solid rgba(232,148,10,.24);border-radius:14px;color:#FCE0A8;font-family:inherit;font-size:15px;padding:11px 12px;resize:none;min-height:48px;}'
    + '#wz-emploi-onb .send{background:#E8940A;color:#241500;font-weight:700;font-size:14px;border:none;border-radius:13px;padding:14px;cursor:pointer;font-family:inherit;}'
    + '#wz-emploi-onb .opt{background:#1E180E;border:1px solid rgba(232,148,10,.24);color:#FCE0A8;border-radius:12px;padding:12px;font-size:14px;cursor:pointer;font-family:inherit;text-align:left;width:100%;margin-bottom:8px;}'
    + '#wz-emploi-onb .hint{font-size:11px;color:rgba(252,224,168,.4);text-align:center;}'
    + '#wz-emploi-onb .dots{display:inline-flex;gap:5px;align-items:center;padding:3px 2px;}'
    + '#wz-emploi-onb .dots span{width:7px;height:7px;border-radius:50%;background:rgba(252,224,168,.55);animation:wzonbpulse 1.1s infinite;}'
    + '@keyframes wzonbpulse{0%,60%,100%{opacity:.3;transform:translateY(0);}30%{opacity:1;transform:translateY(-3px);}}'
    + '#wz-emploi-onb .play{display:inline-block;margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#E8940A;background:rgba(232,148,10,.12);border:1px solid rgba(232,148,10,.24);border-radius:20px;padding:5px 10px;cursor:pointer;user-select:none;}'
    + '#wz-emploi-onb .play.playing{background:#E8940A;color:#241500;}'
    + '#wz-emploi-onb .vtoggle{background:none;border:none;color:#E8940A;font-size:18px;cursor:pointer;margin-right:8px;}'
    + '#wz-emploi-onb .inrow{display:flex;gap:8px;align-items:flex-end;}#wz-emploi-onb .inrow textarea{flex:1;}'
    + '#wz-emploi-onb .micbtn{width:48px;height:48px;border-radius:50%;background:#1E180E;border:1px solid #E8940A;color:#E8940A;font-size:20px;cursor:pointer;flex:0 0 auto;}'
    + '#wz-emploi-onb .micbtn.rec{background:#E8940A;color:#241500;animation:wzonbpulse 1s infinite;}'
    + '#wz-emploi-onb .cvcard{background:#1E180E;border:1px solid #E8940A;border-radius:16px;overflow:hidden;margin-top:6px;}'
    + '#wz-emploi-onb .cvhead{display:flex;gap:11px;align-items:center;padding:14px;border-bottom:1px solid rgba(232,148,10,.2);}'
    + '#wz-emploi-onb .cvav{width:46px;height:46px;border-radius:50%;background:#2a2113;border:1px solid #E8940A;display:grid;place-items:center;font-family:"DM Serif Display",Georgia,serif;color:#E8940A;font-size:20px;flex:0 0 auto;}'
    + '#wz-emploi-onb .cvname{font-family:"DM Serif Display",Georgia,serif;font-size:19px;}'
    + '#wz-emploi-onb .cvsub{font-size:12px;color:rgba(252,224,168,.6);}'
    + '#wz-emploi-onb .cvbadge{display:inline-block;margin-top:5px;font-family:ui-monospace,Menlo,monospace;font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#0d3a1f;background:#7bd88f;border-radius:20px;padding:3px 8px;font-weight:700;}'
    + '#wz-emploi-onb .cvscores{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 14px 0;}'
    + '#wz-emploi-onb .cvsc{background:#14100A;border:1px solid rgba(232,148,10,.2);border-radius:10px;padding:9px;text-align:center;}'
    + '#wz-emploi-onb .cvsc .v{font-family:"DM Serif Display",Georgia,serif;font-size:24px;color:#E8940A;line-height:1;}'
    + '#wz-emploi-onb .cvsc .l{font-family:ui-monospace,Menlo,monospace;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:rgba(252,224,168,.4);margin-top:4px;}'
    + '#wz-emploi-onb .cveye{font-family:ui-monospace,Menlo,monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#E8940A;margin:12px 14px 6px;}'
    + '#wz-emploi-onb .cvtxt{font-size:13px;color:rgba(252,224,168,.75);line-height:1.5;padding:0 14px;}'
    + '#wz-emploi-onb .cvchips{padding:0 14px;}'
    + '#wz-emploi-onb .cvchip{display:inline-block;font-size:12px;background:rgba(232,148,10,.13);border:1px solid rgba(232,148,10,.24);color:#FCE0A8;border-radius:18px;padding:5px 10px;margin:0 5px 6px 0;}'
    + '#wz-emploi-onb .cvkv{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:6px 14px;border-top:1px solid rgba(232,148,10,.08);}'
    + '#wz-emploi-onb .cvkv span:first-child{color:rgba(252,224,168,.4);}'
    + '#wz-emploi-onb .cvpro{margin:12px 14px 14px;background:rgba(232,148,10,.1);border:1px solid rgba(232,148,10,.24);border-radius:12px;padding:11px;font-size:12px;color:rgba(252,224,168,.7);}'
    + '#wz-emploi-onb .cvpro b{color:#FCE0A8;}';

  function shell() {
    return '<style>' + CSS + '</style><div class="wrap"><div class="top"><div class="logo"><em>W</em>OZALI · Ouvert au travail</div>'
      + '<div><button class="vtoggle" id="wz-onb-voice" aria-label="Lecture auto">🔇</button><button class="x" id="wz-onb-x" aria-label="Fermer">✕</button></div></div>'
      + '<div class="trk"><i id="wz-onb-bar"></i></div><div class="thread" id="wz-onb-thread"></div>'
      + '<div class="composer" id="wz-onb-composer"></div></div>';
  }
  function thread() { return document.getElementById('wz-onb-thread'); }
  function composer() { return document.getElementById('wz-onb-composer'); }
  var curAudio = null, curBtn = null, voiceOn = false; // auto-lecture OFF par defaut : l'utilisateur clique « Ecouter »
  function setPlayBtn(b, p) { if (b) { b.textContent = p ? '⏸ Pause' : '▶ Écouter'; b.classList.toggle('playing', !!p); } }
  function stopAud() { if (curAudio) { try { curAudio.pause(); } catch (e) {} } curAudio = null; if (curBtn) { setPlayBtn(curBtn, false); curBtn = null; } }
  function playAud(audId, btn) {
    if (!audId) return;
    if (curBtn === btn && curAudio) { stopAud(); return; }
    stopAud();
    try {
      curAudio = new Audio('/assets/sandy/' + audId + '.mp3'); curBtn = btn || null; setPlayBtn(btn, true);
      curAudio.onended = function () { if (curBtn === btn) { setPlayBtn(btn, false); curBtn = null; curAudio = null; } };
      curAudio.play().catch(function () { if (curBtn === btn) { setPlayBtn(btn, false); curBtn = null; curAudio = null; } });
    } catch (e) { setPlayBtn(btn, false); }
  }
  function sandy(t, audId) {
    var r = document.createElement('div'); r.className = 'row';
    var pb = audId ? '<span class="play">▶ Écouter</span>' : '';
    r.innerHTML = '<div class="av">S</div><div class="msg s">' + esc(t) + pb + '</div>';
    thread().appendChild(r); scroll();
    if (audId) {
      var b = r.querySelector('.play');
      if (b) b.onclick = function () { playAud(audId, b); };
      if (voiceOn) playAud(audId, b);
    }
  }
  function me(t) { var r = document.createElement('div'); r.className = 'row me'; r.innerHTML = '<div class="msg m">' + esc(t) + '</div>'; thread().appendChild(r); scroll(); }
  function scroll() { var t = thread(); if (t) t.scrollTop = t.scrollHeight; }
  function bar(pct) { var b = document.getElementById('wz-onb-bar'); if (b) b.style.width = Math.round(pct) + '%'; }
  // Indicateur « Sandy écrit... » (facon WhatsApp) : dots animés pendant un délai
  // réaliste proportionnel à la longueur du message, puis affiche la bulle.
  function typing(text, audId) {
    return new Promise(function (resolve) {
      var c = composer(); if (c) c.innerHTML = '';
      var r = document.createElement('div'); r.className = 'row';
      r.innerHTML = '<div class="av">S</div><div class="msg s"><span class="dots"><span style="animation-delay:0s"></span><span style="animation-delay:.18s"></span><span style="animation-delay:.36s"></span></span></div>';
      var t = thread(); if (t) { t.appendChild(r); scroll(); }
      var delay = Math.min(2400, 850 + String(text || '').length * 22);
      setTimeout(function () { r.remove(); sandy(text, audId); resolve(); }, delay);
    });
  }
  function audIdFor(step) {
    if (step.kind === 'probe') { return step.baseId === 'exp' ? 'probe_exp' : step.baseId === 'skills' ? 'probe_skills' : 'probe_default'; }
    return step.id; // age/etudes/exp/skills/zone + questions metier ont tous un clip du meme nom
  }

  function startMic(mic, ta) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { ta.placeholder = 'Micro non supporté ici, écris ta réponse.'; ta.focus(); return; }
    try {
      var r = new SR(); r.lang = 'fr-FR'; r.interimResults = false; mic.classList.add('rec');
      r.onresult = function (e) { ta.value = (ta.value ? ta.value + ' ' : '') + e.results[0][0].transcript; };
      r.onend = function () { mic.classList.remove('rec'); };
      r.onerror = function () { mic.classList.remove('rec'); ta.placeholder = 'Micro indisponible, écris ta réponse.'; ta.focus(); };
      r.start();
    } catch (e) { mic.classList.remove('rec'); ta.focus(); }
  }
  function inputRow(ph) {
    var row = document.createElement('div'); row.className = 'inrow';
    var ta = document.createElement('textarea'); ta.id = 'wz-onb-inp'; ta.placeholder = ph || 'Ta réponse';
    var mic = document.createElement('button'); mic.className = 'micbtn'; mic.type = 'button'; mic.textContent = '🎙️';
    mic.onclick = function () { startMic(mic, ta); };
    row.appendChild(ta); row.appendChild(mic);
    return { row: row, ta: ta };
  }
  function askText(step) {
    var c = composer(); c.innerHTML = '';
    var ir = inputRow(step.ph);
    var btn = document.createElement('button'); btn.className = 'send'; btn.textContent = 'Valider ✓';
    btn.onclick = function () { validate(step); };
    var h = document.createElement('div'); h.className = 'hint'; h.textContent = 'Écris, ou appuie sur le micro pour parler.';
    c.appendChild(ir.row); c.appendChild(btn); c.appendChild(h); ir.ta.focus();
  }
  function validate(step) {
    var inp = document.getElementById('wz-onb-inp'); if (!inp) return;
    var v = (inp.value || '').trim(); if (!v) { inp.focus(); return; }
    me(v);
    if (step.kind === 'probe') { state.answers[step.baseId] = (state.answers[step.baseId] ? state.answers[step.baseId] + ' ' : '') + v; return next(); }
    state.answers[step.id] = v;
    if (step.probe && words(v) < (step.min || 6) && !state.probed[step.id]) {
      state.probed[step.id] = true;
      state.queue.splice(state.idx + 1, 0, { id: step.id + '_probe', kind: 'probe', baseId: step.id, q: PROBE[step.id] || PROBE._default, min: 1 });
    }
    next();
  }
  function next() { state.idx++; render(); }

  async function render() {
    if (state.idx >= state.queue.length) return finish();
    bar(state.idx / state.queue.length * 100);
    var step = state.queue[state.idx];
    await typing(step.q, audIdFor(step));
    askText(step);
  }

  async function save() {
    var sb = sbClient();
    if (!sb || !window.currentUser) return { ok: false, reason: 'no-client' };
    var a = state.answers;
    var skills = (a.skills || '').split(/[,;/]|\bet\b/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8);
    var details = {};
    ['c_type', 'c_machine', 'e_type', 'e_habil', 'v_prod', 'v_role', 'k_type', 'k_lieu', 'ma_type', 'ma_eq', 'me_type', 'me_lieu', 'r_type', 'mn_type', 't_permis', 't_veh', 'g_task'].forEach(function (id) { if (a[id]) details[id] = a[id]; });
    var ageNum = parseInt(String(a.age || '').replace(/\D/g, ''), 10);
    var patch = {
      ouvert_au_travail: true,
      cluster_metier: a._cluster || null,
      competences_brut: skills.length ? skills : null,
      niveau_etudes: a.etudes || null,
      onboarding_transcript: [a.exp, a.skills].filter(Boolean).join('\n') || null,
      metier_details: Object.keys(details).length ? details : null
    };
    state._pres = buildPresentation(a); state._score = computeScore(a);
    patch.presentation_pro = state._pres;
    patch.score_competence = state._score;
    if (ageNum >= 10 && ageNum <= 99) patch.age = ageNum;  // n'ecrase pas un age existant si saisie invalide
    try {
      var r = await sb.from('wozali_prestataires').update(patch).eq('user_id', window.currentUser.id);
      if (r && r.error) return { ok: false, reason: r.error.message };
      return { ok: true };
    } catch (e) { return { ok: false, reason: String(e) }; }
  }

  function renderCV() {
    var a = state.answers;
    var chips = skillList(a).slice(0, 6).map(function (s) { return '<span class="cvchip">' + esc(s) + '</span>'; }).join('') || '<span class="cvchip">à compléter</span>';
    var details = [];
    ['c_type', 'c_machine', 'e_type', 'e_habil', 'v_prod', 'v_role', 'k_type', 'k_lieu', 'ma_type', 'ma_eq', 'me_type', 'me_lieu', 'r_type', 'mn_type', 't_permis', 't_veh', 'g_task'].forEach(function (id) { if (a[id]) details.push(esc(a[id])); });
    var card = document.createElement('div'); card.className = 'cvcard';
    card.innerHTML =
      '<div class="cvhead"><div class="cvav">' + esc(cap(a.metier || '?').charAt(0)) + '</div>'
      + '<div><div class="cvname">' + esc(cap(a.metier || 'Mon métier')) + '</div>'
      + '<div class="cvsub">' + esc(a.zone || '') + '</div><div class="cvbadge">● Ouvert au travail</div></div></div>'
      + '<div class="cvscores"><div class="cvsc"><div class="v">' + (state._score || '—') + '</div><div class="l">Compétence</div></div>'
      + '<div class="cvsc"><div class="v">—</div><div class="l">Fiabilité · 1res missions</div></div></div>'
      + '<div class="cveye">Présentation · écrite par Sandy</div><div class="cvtxt">' + esc(state._pres || '') + '</div>'
      + '<div class="cveye">Compétences</div><div class="cvchips">' + chips + '</div>'
      + (a.etudes ? '<div class="cvkv"><span>Formation</span><span>' + esc(a.etudes) + '</span></div>' : '')
      + (a.age ? '<div class="cvkv"><span>Âge</span><span>' + esc(a.age) + ' ans</span></div>' : '')
      + (details.length ? '<div class="cvkv"><span>Spécialité</span><span>' + details.join(' · ') + '</span></div>' : '')
      + '<div class="cvpro"><b>Passe Pro</b> : Pro te met devant, ton score te garde devant. Ajoute des photos de ton travail pour monter ton score.</div>';
    thread().appendChild(card); scroll();
  }

  async function finish() {
    bar(100);
    await typing('C\'est fait ! J\'enregistre ton profil « Ouvert au travail ». Le recruteur voit ton métier, tes compétences et ton quartier.', 'finish1');
    composer().innerHTML = '<div class="hint">Enregistrement...</div>';
    var res = await save();
    var c = composer(); c.innerHTML = '';
    if (res.ok) {
      await typing('Ton profil est prêt. On te prévient dès qu\'un recruteur cherche ton métier près de toi. En attendant, ajoute des photos de ton travail : ton profil sera bien plus fort.', 'finish_ok');
      renderCV();
    } else {
      await typing('J\'ai tes réponses, mais l\'enregistrement a calé (' + esc(res.reason || '') + '). Réessaie dans un instant, tes réponses ne sont pas perdues.');
    }
    var btn = document.createElement('button'); btn.className = 'send'; btn.textContent = 'Terminer';
    btn.onclick = function () { close(); try { if (typeof showDashSection === 'function') showDashSection('overview'); } catch (e) {} };
    c.appendChild(btn);
  }

  function open() {
    if (!window.currentUser) { try { toast('Connecte-toi d\'abord pour créer ton profil emploi.', 'error'); } catch (e) {} return; }
    state = { queue: [], idx: 0, answers: {}, probed: {} };
    voiceOn = false;
    ov(shell());
    document.getElementById('wz-onb-x').onclick = close;
    var vb = document.getElementById('wz-onb-voice');
    if (vb) vb.onclick = function () { voiceOn = !voiceOn; vb.textContent = voiceOn ? '🔊' : '🔇'; if (!voiceOn) stopAud(); };
    // Q0 : Sandy comprend D'ABORD pourquoi la personne est la. Elle ne lance le
    // flux emploi QUE si l'objectif est de trouver du travail.
    askGoal();
  }

  async function askGoal() {
    await typing('Salut ! Moi c\'est Sandy. Dis-moi d\'abord : qu\'est-ce que tu cherches sur WOZALI ?', 'goal');
    var c = composer(); c.innerHTML = '';
    [{ k: 'emploi', l: 'Trouver du travail' },
     { k: 'clients', l: 'Trouver des clients' },
     { k: 'promo', l: 'Faire connaître mon activité' },
     { k: 'curieux', l: 'Juste regarder pour l\'instant' }]
      .forEach(function (o) {
        var b = document.createElement('button'); b.className = 'opt'; b.textContent = o.l;
        b.onclick = function () { pickGoal(o); }; c.appendChild(b);
      });
  }
  async function pickGoal(o) {
    me(o.l); state.answers.but = o.k;
    if (o.k === 'emploi') {
      await typing('Super. On va rendre ton profil « Ouvert au travail ». D\'abord : c\'est quoi ton métier ?', 'metier_prompt');
      askMetier();
    } else if (o.k === 'clients' || o.k === 'promo') {
      await typing('Bien reçu. Pour ça, ta vitrine WOZALI (ton profil public, tes photos, tes avis) est ta meilleure arme. Cette partie arrive très bientôt. En attendant, complète ton profil, c\'est ce qui te rend visible.', 'clients_promo');
      endBtn();
    } else {
      await typing('Pas de souci ! Explore librement. Je suis là dès que tu veux avancer, dans ton espace.', 'curieux');
      endBtn();
    }
  }
  function askMetier() {
    var c = composer(); c.innerHTML = '';
    var ir = inputRow('Ex: couturière, électricien, vendeuse...');
    var btn = document.createElement('button'); btn.className = 'send'; btn.textContent = 'Continuer';
    btn.onclick = function () {
      var v = (ir.ta.value || '').trim(); if (!v) { ir.ta.focus(); return; }
      me(v); state.answers.metier = v; state.queue = buildQueue(v); state.idx = 0; render();
    };
    c.appendChild(ir.row); c.appendChild(btn); ir.ta.focus();
  }
  function endBtn() {
    var c = composer(); c.innerHTML = '';
    var btn = document.createElement('button'); btn.className = 'send'; btn.textContent = 'Fermer';
    btn.onclick = function () { close(); };
    c.appendChild(btn);
  }

  window.wozaliEmploiOnboarding = { open: open, flagOn: flagOn };

  // Entree GATED : bouton flottant visible uniquement si le flag beta est actif.
  // Aucune modification du core ; invisible aux vrais utilisateurs.
  function injectBetaBtn() {
    if (!flagOn() || document.getElementById('wz-onb-beta-btn')) return;
    var b = document.createElement('button');
    b.id = 'wz-onb-beta-btn';
    b.textContent = '🎙️ Onboarding emploi (beta)';
    b.style.cssText = 'position:fixed;left:14px;bottom:96px;z-index:9998;background:#E8940A;color:#241500;border:none;border-radius:22px;padding:11px 16px;font-weight:700;font-size:13px;font-family:Geist,system-ui,sans-serif;box-shadow:0 8px 22px -8px rgba(0,0,0,.6);cursor:pointer;';
    b.onclick = function () { window.wozaliEmploiOnboarding.open(); };
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', injectBetaBtn); }
  else { injectBetaBtn(); }
})();

