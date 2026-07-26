/* ══════════════════════════════════════════════════════════
   WOZALI MATCH — module refonte (chargé APRÈS app3.js, surcharge l'ancien)
   Refonte Fable 5 · 2026-07-26 · algorithme de pertinence + UI premium
   Autonome : fallback _currentUser (privé dans l'IIFE app3.js).
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var _sb = (typeof window._sb === 'function') ? window._sb : function () { return window.supabase || null; };
  async function _currentUser() {
    try {
      if (window.currentUser) return window.currentUser;
      var sb = _sb(); if (!sb) return null;
      var r = await sb.auth.getUser();
      return (r && r.data && r.data.user) || null;
    } catch (e) { return null; }
  }
  // ══════════════════════════════════════════════════════════
  // WOZALI MATCH — REFONTE (algorithme de pertinence + UI premium)
  // ══════════════════════════════════════════════════════════

  // ── Familles de métiers (synonymes / variantes du marché Togo-Bénin) ──
  var WZM_FAMILLES_METIERS = [
    { id: 'coiffure',  label: 'coiffure et beauté',   stems: ['coiff','tress','natte','barbier','esthet','maquill','onglerie','manucure','pedicure','perruq'] },
    { id: 'couture',   label: 'couture et mode',      stems: ['coutur','tailleur','styliste','modeliste','brod','tricot'] },
    { id: 'batiment',  label: 'bâtiment',             stems: ['macon','maconnerie','carrel','platr','peintre','peinture','staff','crepiss','etanch'] },
    { id: 'technique', label: 'électricité, plomberie, froid', stems: ['electricien','electricite','plombier','plomberie','frigoriste','froid','climatis','antenniste'] },
    { id: 'mecanique', label: 'mécanique et métal',   stems: ['mecanicien','mecanique','soudeur','soudure','tolier','vulcanis','forgeron','garagiste'] },
    { id: 'bois',      label: 'bois',                 stems: ['menuisier','menuiserie','ebeniste','charpentier','vernisseur'] },
    { id: 'cuisine',   label: 'cuisine et traiteur',  stems: ['cuisinier','cuisiniere','patissier','patisserie','traiteur','boulanger','restaurat'] },
    { id: 'transport', label: 'transport et livraison', stems: ['chauffeur','zemidjan','zem','taxi','livreur','conducteur','moto'] },
    { id: 'digital',   label: 'digital et image',     stems: ['developpeur','graphiste','photographe','videaste','infograph','informatic','webdesign','communit'] },
    { id: 'evenement', label: 'événementiel',         stems: ['dj','decorateur','decoration','animateur','sono','evenement'] },
    { id: 'sport',     label: 'sport et bien-être',   stems: ['coach','entraineur','masseur','massage'] },
    { id: 'agri',      label: 'agriculture',          stems: ['agricult','maraich','jardinier','eleveur','elevage'] }
  ];

  function _wzmNorm(s) {
    return (s || '').toString().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function _wzmStemHit(normText, stem) {
    if (!normText) return false;
    if (stem.length <= 3) return normText.split(' ').indexOf(stem) !== -1;
    if (normText.indexOf(stem) !== -1) return true;
    return normText.split(' ').some(function(w) { return w.indexOf(stem) === 0; });
  }

  function _wzmFamilleDe(metier) {
    var n = _wzmNorm(metier);
    if (!n) return null;
    for (var i = 0; i < WZM_FAMILLES_METIERS.length; i++) {
      var fam = WZM_FAMILLES_METIERS[i];
      for (var j = 0; j < fam.stems.length; j++) {
        if (_wzmStemHit(n, fam.stems[j])) return fam;
      }
    }
    return null;
  }

  window._wozaliMatchScore = function(prestataire, criteres) {
    var pts = 0;
    var raisons = [];
    var p = prestataire || {};
    var c = criteres || {};

    var nCrit = _wzmNorm(c.metier);
    var nPro = _wzmNorm(p.metier_principal);
    var famCrit = _wzmFamilleDe(c.metier);
    var famPro = _wzmFamilleDe(p.metier_principal);
    if (nCrit && nPro && nCrit === nPro) {
      pts += 45; raisons.push([100, 'Métier exact', true]);
    } else if (nCrit && nPro && nCrit.length >= 4 && nPro.length >= 4 &&
               (nPro.indexOf(nCrit) !== -1 || nCrit.indexOf(nPro) !== -1)) {
      pts += 38; raisons.push([95, 'Métier correspondant', true]);
    } else if (famCrit && famPro && famCrit.id === famPro.id) {
      pts += 30; raisons.push([90, 'Même famille : ' + famCrit.label, false]);
    }

    if (!c.ville) {
      pts += 12;
    } else if (_wzmNorm(p.ville) === _wzmNorm(c.ville)) {
      pts += 20; raisons.push([80, 'Même ville', false]);
    }

    if (c.quartier && p.quartier) {
      var nq = _wzmNorm(c.quartier), npq = _wzmNorm(p.quartier);
      if (nq && npq && (npq.indexOf(nq) !== -1 || nq.indexOf(npq) !== -1)) {
        pts += 8; raisons.push([85, 'Même quartier', true]);
      }
    }

    var sw = Math.max(0, Math.min(100, Number(p.score_wozali) || 0));
    pts += Math.round(sw * 0.15);
    if (sw >= 80) raisons.push([70, 'Score WOZALI élevé', false]);

    var note = Number(p.note_moyenne) || 0;
    var nbAvis = Number(p.nb_avis_recus != null ? p.nb_avis_recus : p.nb_avis) || 0;
    if (note >= 4.5 && nbAvis >= 3) { pts += 8; raisons.push([75, 'Noté ' + note.toFixed(1) + ' sur 5', false]); }
    else if (note >= 4 && nbAvis >= 1) { pts += 5; raisons.push([65, 'Bien noté par ses clients', false]); }
    else if (nbAvis >= 1) { pts += 2; }

    if (p.abonnement === 'Pro') { pts += 5; raisons.push([60, p.badge_verifie ? 'Pro vérifié' : 'Membre Pro', false]); }
    else if (p.badge_verifie) { pts += 3; raisons.push([55, 'Profil vérifié', false]); }
    if (p.disponible_maintenant === true || p.disponible === true) {
      pts += 4; raisons.push([68, 'Disponible maintenant', false]);
    }

    raisons.sort(function(a, b) { return b[0] - a[0]; });
    return {
      pourcentage: Math.max(0, Math.min(100, pts)),
      raisons: raisons.slice(0, 3).map(function(r) { return { label: r[1], fort: r[2] }; })
    };
  };

  function _wzmBtnLoading(id, on, labelOn, labelOff) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = !!on;
    btn.textContent = on ? labelOn : labelOff;
  }

  function _wzmSkeletonHtml(n) {
    var one = '<div class="wzm-skel">' +
      '<div class="wzm-skel-row">' +
        '<div class="wzm-skel-avatar wzm-shimmer"></div>' +
        '<div class="wzm-skel-lines"><div class="wzm-skel-line wzm-shimmer"></div><div class="wzm-skel-line courte wzm-shimmer"></div></div>' +
        '<div class="wzm-skel-ring wzm-shimmer"></div>' +
      '</div>' +
      '<div class="wzm-skel-chips"><div class="wzm-skel-chip wzm-shimmer"></div><div class="wzm-skel-chip wzm-shimmer"></div></div>' +
    '</div>';
    var out = '';
    for (var i = 0; i < (n || 3); i++) out += one;
    return out;
  }

  function _wzmEmptyHtml(titre, texte, ctaHtml) {
    return '<div class="wzm-vide">' +
      '<div class="wzm-vide-icone"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></div>' +
      '<h4>' + escapeHtml(titre) + '</h4>' +
      '<p>' + texte + '</p>' +
      (ctaHtml || '') +
    '</div>';
  }

  function _wzmChipsHtml(raisons) {
    if (!raisons || !raisons.length) return '';
    return '<div class="wzm-chips">' + raisons.map(function(r) {
      return '<span class="wzm-chip' + (r.fort ? ' wzm-chip-fort' : '') + '">' + escapeHtml(r.label) + '</span>';
    }).join('') + '</div>';
  }

  function _wzmAvatarHtml(photo, nom, scoreEleve) {
    var initiale = escapeHtml((nom || 'W').trim().charAt(0).toUpperCase());
    var inner = photo
      ? '<img src="' + escapeHtml(photo) + '" alt="" loading="lazy" onerror="this.parentNode.textContent=\'' + initiale + '\'">'
      : initiale;
    return '<div class="wzm-avatar-wrap' + (scoreEleve ? ' wzm-ring-or' : '') + '"><div class="wzm-avatar">' + inner + '</div></div>';
  }

  function _wzmProCardHtml(pr, m) {
    var uid = pr.user_id || pr.id || '';
    var nom = pr.nom_complet || pr.nom || 'Prestataire';
    var note = Number(pr.note_moyenne) || 0;
    var nbAvis = Number(pr.nb_avis_recus != null ? pr.nb_avis_recus : pr.nb_avis) || 0;
    var drapeau = pr.pays === 'Togo' ? '🇹🇬' : (pr.pays === 'Bénin' ? '🇧🇯' : '');
    var meta = [pr.metier_principal || '', pr.quartier || ''].filter(Boolean).map(escapeHtml).join(' · ');
    return '<div class="wzm-card">' +
      '<div class="wzm-card-top">' +
        _wzmAvatarHtml(pr.photo_profil || pr.photo_url || '', nom, (Number(pr.score_wozali) || 0) >= 80) +
        '<div class="wzm-card-id">' +
          '<div class="wzm-card-nom">' + escapeHtml(nom) + (pr.abonnement === 'Pro' ? '<span class="wzm-badge-pro">PRO</span>' : '') + '</div>' +
          '<div class="wzm-card-meta">' + meta + (drapeau ? ' ' + drapeau : '') + '</div>' +
          (nbAvis > 0 ? '<div class="wzm-card-note"><b>' + note.toFixed(1) + '</b> sur 5 · ' + nbAvis + ' avis</div>' : '') +
        '</div>' +
        '<div><div class="wzm-match-ring" style="--p:' + m.pourcentage + '"><span>' + m.pourcentage + '%</span></div><span class="wzm-ring-label">match</span></div>' +
      '</div>' +
      _wzmChipsHtml(m.raisons) +
      '<div class="wzm-card-actions">' +
        '<button class="wzm-btn-ghost" onclick="showProfil(\'' + escapeHtml(uid) + '\');showPage(\'profil\')">Voir le profil</button>' +
        '<button class="wzm-btn-plein" onclick="contacterAuteur(\'' + escapeHtml(uid) + '\')">Contacter</button>' +
      '</div>' +
    '</div>';
  }

  window.initWozaliMatch = async function() {
    var user = await _currentUser();
    if (user) chargerMesDemandesMatch(user.id);
    try {
      var q = window.currentPrestataire && window.currentPrestataire.fields && window.currentPrestataire.fields['Quartier'];
      var input = document.getElementById('wzm-quartier');
      if (q && input && !input.value) input.value = q;
    } catch (e) {}
  };

  window.lancerWozaliMatch = async function() {
    var user = await verifierConnexionOuPopup('créer une demande');
    if (!user) return;
    var sb = _sb(); if (!sb) { window.toast && toast('Connexion au serveur impossible. Réessaie.', 'error'); return; }

    var description = (document.getElementById('match-description') || {}).value; description = (description || '').trim();
    var metier = (document.getElementById('match-metier') || {}).value || '';
    var ville = (document.getElementById('match-ville') || {}).value || '';
    var quartier = ((document.getElementById('wzm-quartier') || {}).value || '').trim();
    var budget = parseInt((document.getElementById('match-budget') || {}).value, 10) || null;

    if (!description || !metier) {
      window.toast ? toast('Décris ton besoin et choisis le métier.', 'error') : console.warn('champs manquants');
      return;
    }

    var container = document.getElementById('match-resultats');
    var liste = document.getElementById('match-resultats-liste');
    var count = document.getElementById('wzm-res-count');
    var confirmBox = document.getElementById('wzm-confirm');
    if (container) container.style.display = 'block';
    if (count) count.textContent = '';
    if (liste) liste.innerHTML = _wzmSkeletonHtml(3);
    _wzmBtnLoading('wzm-cta-client', true, 'Recherche en cours...', 'Trouver mon prestataire');

    try {
      var ins = await sb.from('wozali_match_demandes').insert({
        client_id: user.id,
        description: description,
        metier_recherche: metier,
        ville: ville || null,
        budget_max: budget,
        statut: 'ouvert'
      });
      if (ins && ins.error) throw ins.error;

      if (confirmBox) {
        confirmBox.style.display = 'block';
        confirmBox.innerHTML = '<strong>Ta demande est en ligne.</strong> Les meilleurs profils correspondants viennent d\'être prévenus. Tu peux aussi les contacter directement ci-dessous.';
      }
      window.toast && toast('Demande créée. On cherche ton match.', 'success');

      var famille = _wzmFamilleDe(metier);
      var patterns = [_wzmNorm(metier).split(' ')[0]];
      if (famille) famille.stems.forEach(function(s) { if (s.length >= 4) patterns.push(s); });
      patterns = patterns.filter(function(p, i, arr) { return p && p.length >= 3 && arr.indexOf(p) === i; });
      var orExpr = patterns.map(function(p) {
        return 'metier_principal.ilike.%' + p.replace(/[,()]/g, '') + '%';
      }).join(',');

      var query = sb.from('wozali_prestataires')
        .select('user_id, nom_complet, metier_principal, photo_profil, quartier, ville, pays, score_wozali, abonnement, disponible_maintenant, note_moyenne, nb_avis_recus, badge_verifie')
        .or(orExpr)
        .order('score_wozali', { ascending: false })
        .limit(60);
      var res = await query;
      var pros = (res && res.data) || [];

      var criteres = { metier: metier, ville: ville, quartier: quartier, budget: budget };
      var scored = pros.map(function(pr) {
        return { pr: pr, m: window._wozaliMatchScore(pr, criteres) };
      }).filter(function(x) { return x.m.pourcentage >= 30; });
      scored.sort(function(a, b) {
        return (b.m.pourcentage - a.m.pourcentage) || ((Number(b.pr.score_wozali) || 0) - (Number(a.pr.score_wozali) || 0));
      });
      scored = scored.slice(0, 12);

      if (!scored.length) {
        if (count) count.textContent = '';
        if (liste) liste.innerHTML = _wzmEmptyHtml(
          'Aucun profil trouvé pour l\'instant',
          'Personne en ' + escapeHtml(metier) + (ville ? ' à ' + escapeHtml(ville) : '') + ' pour le moment. Ta demande reste ouverte : dès qu\'un profil correspond, il la verra.',
          '<button class="wzm-btn-ghost" style="flex:none;padding:10px 20px;" onclick="document.getElementById(\'match-ville\').value=\'\';lancerWozaliMatch()">Chercher dans toutes les villes</button>'
        );
        return;
      }

      if (count) count.innerHTML = '<b>' + scored.length + '</b> prestataire' + (scored.length > 1 ? 's' : '') + ' trouvé' + (scored.length > 1 ? 's' : '') + ' · triés par pertinence';
      if (liste) liste.innerHTML = scored.map(function(x) { return _wzmProCardHtml(x.pr, x.m); }).join('');

      if (typeof envoyerNotificationFeed === 'function') {
        var top5 = scored.slice(0, 5);
        for (var i = 0; i < top5.length; i++) {
          try {
            await envoyerNotificationFeed(
              top5[i].pr.user_id || top5[i].pr.id,
              'wozali_match',
              'Nouvelle demande WOZALI Match',
              'Un client cherche un ' + metier + (ville ? ' à ' + ville : '') + '. Ton profil correspond à ' + top5[i].m.pourcentage + '%.',
              '#dashboard'
            );
          } catch (e) {}
        }
      }

      chargerMesDemandesMatch(user.id);
      try { container.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    } catch (e) {
      console.warn('[wozaliMatch]', e);
      if (liste) liste.innerHTML = '';
      window.toast && toast('Ça a calé pendant la recherche. Réessaie dans 2 secondes.', 'error');
    } finally {
      _wzmBtnLoading('wzm-cta-client', false, '', 'Trouver mon prestataire');
    }
  };

  window.chargerMesDemandesMatch = async function(userId) {
    var container = document.getElementById('match-demandes-liste');
    if (!container) return;
    var sb = _sb(); if (!sb) return;
    try {
      var res = await sb.from('wozali_match_demandes')
        .select('*').eq('client_id', userId)
        .order('created_at', { ascending: false }).limit(10);
      var demandes = (res && res.data) || [];
      if (!demandes.length) {
        container.innerHTML = '<p style="color:rgba(252,224,168,0.4);font-size:13px;font-family:\'Geist\',sans-serif;">Aucune demande pour le moment. Ta première demande apparaîtra ici.</p>';
        return;
      }
      container.innerHTML = demandes.map(function(d) {
        var statutHtml = d.statut === 'ouvert'
          ? '<span class="wzm-demande-statut"><span class="wzm-statut-dot wzm-dot-ouvert"></span>Ouverte</span>'
          : d.statut === 'en_cours'
            ? '<span class="wzm-demande-statut"><span class="wzm-statut-dot wzm-dot-encours"></span>En cours</span>'
            : '<span class="wzm-demande-statut"><span class="wzm-statut-dot wzm-dot-ferme"></span>Fermée</span>';
        return '<div class="wzm-demande-card">' +
          '<div class="wzm-demande-head"><strong>' + escapeHtml(d.metier_recherche) + '</strong>' + statutHtml + '</div>' +
          '<p>' + escapeHtml(d.description) + '</p>' +
          '<div class="wzm-dem-meta">' +
            (d.ville ? '<span>' + escapeHtml(d.ville) + '</span>' : '') +
            (d.budget_max ? '<span>Budget max <b>' + Number(d.budget_max).toLocaleString('fr-FR') + ' FCFA</b></span>' : '') +
            '<span>' + getDateRelative(d.created_at) + '</span>' +
          '</div>' +
          (d.statut === 'ouvert' ? '<button class="wzm-btn-fermer" onclick="fermerDemande(\'' + d.id + '\', this)">Fermer la demande</button>' : '') +
        '</div>';
      }).join('');
    } catch (e) { console.warn('[wzm demandes]', e); }
  };

  window.fermerDemande = async function(demandeId, btnEl) {
    if (btnEl && !btnEl.dataset.wzmConfirm) {
      btnEl.dataset.wzmConfirm = '1';
      btnEl.classList.add('wzm-confirm-state');
      btnEl.textContent = 'Confirmer la fermeture ?';
      setTimeout(function() {
        if (btnEl && btnEl.dataset.wzmConfirm) {
          delete btnEl.dataset.wzmConfirm;
          btnEl.classList.remove('wzm-confirm-state');
          btnEl.textContent = 'Fermer la demande';
        }
      }, 4000);
      return;
    }
    var sb = _sb(); if (!sb) return;
    try {
      var res = await sb.from('wozali_match_demandes').update({ statut: 'fermé' }).eq('id', demandeId);
      if (res && res.error) throw res.error;
      window.toast && toast('Demande fermée.', 'success');
      var user = await _currentUser();
      if (user) chargerMesDemandesMatch(user.id);
    } catch (e) {
      console.warn(e);
      window.toast && toast('Impossible de fermer la demande. Réessaie.', 'error');
    }
  };

  window.switchMatchMode = function(mode) {
    var btnClient = document.getElementById('match-mode-client');
    var btnTravail = document.getElementById('match-mode-travail');
    var formClient = document.getElementById('match-form-client');
    var formTravail = document.getElementById('match-form-travail');
    var resClient = document.getElementById('match-resultats');
    var resTravail = document.getElementById('match-resultats-travail');
    var confirmBox = document.getElementById('wzm-confirm');
    var estClient = mode === 'client';

    if (btnClient) btnClient.classList.toggle('wzm-active', estClient);
    if (btnTravail) btnTravail.classList.toggle('wzm-active', !estClient);
    if (formClient) formClient.style.display = estClient ? '' : 'none';
    if (formTravail) formTravail.style.display = estClient ? 'none' : '';
    if (resClient) resClient.style.display = 'none';
    if (resTravail) resTravail.style.display = 'none';
    if (confirmBox) confirmBox.style.display = 'none';
  };

  window.lancerWozaliMatchTravail = async function() {
    var user = await verifierConnexionOuPopup('voir les demandes');
    if (!user) return;
    var sb = _sb(); if (!sb) { window.toast && toast('Connexion au serveur impossible. Réessaie.', 'error'); return; }

    var metier = (document.getElementById('match-travail-metier') || {}).value || '';
    var ville = (document.getElementById('match-travail-ville') || {}).value || '';

    if (!metier) {
      window.toast ? toast('Sélectionne ton métier pour voir les demandes.', 'error') : console.warn('métier manquant');
      return;
    }

    var container = document.getElementById('match-resultats-travail');
    var liste = document.getElementById('match-travail-liste');
    var count = document.getElementById('wzm-travail-count');
    if (container) container.style.display = 'block';
    if (count) count.textContent = '';
    if (liste) liste.innerHTML = _wzmSkeletonHtml(3);
    _wzmBtnLoading('wzm-cta-travail', true, 'Recherche en cours...', 'Voir les demandes qui me correspondent');

    try {
      var famille = _wzmFamilleDe(metier);
      var patterns = [_wzmNorm(metier).split(' ')[0]];
      if (famille) famille.stems.forEach(function(s) { if (s.length >= 4) patterns.push(s); });
      patterns = patterns.filter(function(p, i, arr) { return p && p.length >= 3 && arr.indexOf(p) === i; });
      var orExpr = patterns.map(function(p) {
        return 'metier_recherche.ilike.%' + p.replace(/[,()]/g, '') + '%';
      }).join(',');

      var res = await sb.from('wozali_match_demandes')
        .select('*')
        .eq('statut', 'ouvert')
        .or(orExpr)
        .order('created_at', { ascending: false })
        .limit(30);
      var demandes = (res && res.data) || [];

      var nMetier = _wzmNorm(metier);
      demandes.forEach(function(d) {
        var s = 0;
        if (_wzmNorm(d.metier_recherche) === nMetier) s += 50; else s += 25;
        if (ville && _wzmNorm(d.ville) === _wzmNorm(ville)) s += 30;
        else if (!ville) s += 15;
        var ageH = (Date.now() - new Date(d.created_at).getTime()) / 36e5;
        if (ageH <= 24) s += 15; else if (ageH <= 72) s += 8;
        d._wzmScore = s;
      });
      demandes.sort(function(a, b) { return (b._wzmScore - a._wzmScore) || (new Date(b.created_at) - new Date(a.created_at)); });
      demandes = demandes.slice(0, 20);

      if (!demandes.length) {
        if (liste) liste.innerHTML = _wzmEmptyHtml(
          'Pas encore de demande pour toi',
          'Aucun client ne cherche un ' + escapeHtml(metier) + (ville ? ' à ' + escapeHtml(ville) : '') + ' en ce moment. Complète ton profil : dès qu\'une demande tombe, tu remontes en premier.',
          '<button class="wzm-btn-plein" style="flex:none;padding:10px 20px;" onclick="showPage(\'dashboard\')">Compléter mon profil</button>'
        );
        return;
      }

      var clientIds = demandes.map(function(d) { return d.client_id; }).filter(Boolean)
        .filter(function(v, i, arr) { return arr.indexOf(v) === i; });
      var clientMap = {};
      if (clientIds.length) {
        var rc = await sb.from('wozali_prestataires').select('user_id, nom_complet, photo_profil').in('user_id', clientIds);
        ((rc && rc.data) || []).forEach(function(c) { clientMap[c.user_id] = c; });
      }

      if (count) count.innerHTML = '<b>' + demandes.length + '</b> demande' + (demandes.length > 1 ? 's' : '') + ' ouverte' + (demandes.length > 1 ? 's' : '') + ' · triées par pertinence';
      if (liste) liste.innerHTML = demandes.map(function(d) {
        var client = clientMap[d.client_id] || {};
        var nomClient = client.nom_complet || 'Client';
        var chips = [];
        if (_wzmNorm(d.metier_recherche) === nMetier) chips.push({ label: 'Métier exact', fort: true });
        else chips.push({ label: 'Ta famille de métier', fort: false });
        if (ville && _wzmNorm(d.ville) === _wzmNorm(ville)) chips.push({ label: 'Ta ville', fort: true });
        var ageH = (Date.now() - new Date(d.created_at).getTime()) / 36e5;
        if (ageH <= 24) chips.push({ label: 'Publiée aujourd\'hui', fort: false });
        return '<div class="wzm-card">' +
          '<div class="wzm-card-top">' +
            _wzmAvatarHtml(client.photo_profil || '', nomClient, false) +
            '<div class="wzm-card-id">' +
              '<div class="wzm-card-nom">' + escapeHtml(nomClient) + '</div>' +
              '<div class="wzm-card-meta">' + getDateRelative(d.created_at) + '</div>' +
            '</div>' +
            '<span class="wzm-demande-statut"><span class="wzm-statut-dot wzm-dot-ouvert"></span>Ouverte</span>' +
          '</div>' +
          '<p class="wzm-dem-desc">' + escapeHtml(d.description) + '</p>' +
          '<div class="wzm-dem-meta">' +
            '<span><b>' + escapeHtml(d.metier_recherche) + '</b></span>' +
            (d.ville ? '<span>' + escapeHtml(d.ville) + '</span>' : '') +
            (d.budget_max ? '<span>Budget max <b>' + Number(d.budget_max).toLocaleString('fr-FR') + ' FCFA</b></span>' : '') +
          '</div>' +
          _wzmChipsHtml(chips.slice(0, 3)) +
          '<div class="wzm-card-actions">' +
            '<button class="wzm-btn-plein" onclick="contacterAuteur(\'' + escapeHtml(d.client_id || '') + '\')">Répondre au client</button>' +
          '</div>' +
        '</div>';
      }).join('');
      try { container.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    } catch (e) {
      console.warn('[wzm travail]', e);
      if (liste) liste.innerHTML = '';
      window.toast && toast('Ça a calé pendant la recherche. Réessaie dans 2 secondes.', 'error');
    } finally {
      _wzmBtnLoading('wzm-cta-travail', false, '', 'Voir les demandes qui me correspondent');
    }
  };

})();
