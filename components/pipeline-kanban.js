// ══════════════════════════════════════════
// WOLO Business — Pipeline Talent Kanban (Phase B)
// Drag & drop HTML5 natif — aucune lib externe
// Sources : Airtable Offres d'Emploi + Candidatures + Agents Terrain + Employes
// ══════════════════════════════════════════

(function(){
  'use strict';

  var state = {
    view: localStorage.getItem('wolo_pipeline_view') || 'kanban',
    cards: [],          // flat list
    offres: [],         // offres pour colonne 1 et filtre
    filterOffre: '',
    filterVille: '',
    search: ''
  };

  // Mapping Statut Airtable → colonne Kanban
  // Source table : "Candidatures" (WOLO Jobs)  et "Agents Terrain"
  var STATUT_TO_COL = {
    'En attente': 'nouveau',
    'Vue': 'nouveau',
    'Présélectionné': 'shortlist',
    'Shortlist': 'shortlist',
    'Entretien': 'entretien',
    'Retenue': 'retenu',
    'Retenu': 'retenu',
    'Validé': 'equipe',
    'Onboarding': 'onboarding',
    'Refusée': 'parti',
    'Refusé': 'parti',
    'Parti': 'parti'
  };

  // Reverse mapping : colonne cible → statut à écrire
  var COL_TO_STATUT = {
    'nouveau': 'En attente',
    'shortlist': 'Présélectionné',
    'entretien': 'Entretien',
    'retenu': 'Retenue',
    'onboarding': 'Onboarding',
    'equipe': 'Validé',
    'parti': 'Refusée'
  };

  window.loadPipelineKanban = async function(){
    var board = document.getElementById('kanban-board');
    if (!board) return;
    try {
      // Récupère les candidatures WOLO Jobs + Agents Terrain en parallèle
      var userId = (window.currentUser && window.currentUser.id) || '';
      var prestId = (window.currentPrestataire && window.currentPrestataire.id) || '';

      var [offresRes, candJobsRes, candAgentsRes] = await Promise.all([
        fetch('/api/airtable-proxy/' + encodeURIComponent("Offres d'Emploi") +
              (prestId ? '?filterByFormula=' + encodeURIComponent("{Recruteur ID}='" + prestId + "'") : '')),
        fetch('/api/airtable-proxy/Candidatures' +
              (prestId ? '?filterByFormula=' + encodeURIComponent("{Recruteur ID}='" + prestId + "'") : '')),
        fetch('/api/airtable-proxy/' + encodeURIComponent('Agents Terrain'))
      ]);

      var offres = (await offresRes.json()).records || [];
      var candJobs = (await candJobsRes.json()).records || [];
      var candAgents = (await candAgentsRes.json()).records || [];

      state.offres = offres;

      // Normalise en "cartes"
      state.cards = [];

      // Offres en ligne (colonne 1)
      offres.forEach(function(o){
        if (!o.fields.Active) return;
        state.cards.push({
          id: o.id,
          type: 'offre',
          col: 'offre',
          name: o.fields['Titre'] || '(Sans titre)',
          meta: (o.fields['Métier'] || '') + ' · ' + (o.fields['Ville'] || ''),
          photo: o.fields['Photo 1'] || '',
          ville: o.fields['Ville'] || '',
          date: o.fields['Date création'] || '',
          candidatures: o.fields['Nb candidatures'] || 0,
          offreId: o.id,
          offreTitre: o.fields['Titre']
        });
      });

      // Candidatures WOLO Jobs
      candJobs.forEach(function(c){
        var statut = c.fields['Statut'] || 'En attente';
        state.cards.push({
          id: c.id,
          type: 'candidature-jobs',
          col: STATUT_TO_COL[statut] || 'nouveau',
          statut: statut,
          name: c.fields['Candidat Nom'] || '(Anonyme)',
          meta: (c.fields['Candidat Métier'] || '') + ' · ' + (c.fields['Offre Titre'] || ''),
          photo: c.fields['Candidat Photo'] || '',
          ville: '',
          score: c.fields['Candidat Score WOLO'] || 0,
          tel: c.fields['Candidat WhatsApp'] || '',
          date: c.fields['Date candidature'] || '',
          offreId: c.fields['Offre ID'] || '',
          offreTitre: c.fields['Offre Titre'] || '',
          airtableTable: 'Candidatures'
        });
      });

      // Candidatures Agents Terrain
      candAgents.forEach(function(c){
        var statut = c.fields['Statut'] || 'En attente';
        state.cards.push({
          id: c.id,
          type: 'candidature-agent',
          col: STATUT_TO_COL[statut] || 'nouveau',
          statut: statut,
          name: ((c.fields['Prénom'] || '') + ' ' + (c.fields['Nom'] || '')).trim() || '(Anonyme)',
          meta: 'Agent terrain · ' + (c.fields['Ville'] || '') + ' · ' + (c.fields['Quartier'] || ''),
          photo: ((c.fields['Photos'] || '').split('\n')[0] || ''),
          ville: c.fields['Ville'] || '',
          tel: c.fields['Téléphone'] || '',
          date: c.fields['Date Ajout'] || '',
          airtableTable: 'Agents Terrain'
        });
      });

      // TODO Phase C : charger aussi table Employes (col 'equipe')

      fillOffreFilter();
      renderKPIs();
      setPipelineView(state.view);

    } catch(err) {
      console.error('loadPipelineKanban error:', err);
      board.innerHTML = '<div style="padding:30px;color:#ff6b6b;font-family:Poppins,sans-serif;">Erreur de chargement. ' + (err.message || '') + '</div>';
    }
  };

  function fillOffreFilter(){
    var sel = document.getElementById('kanban-filter-offre');
    if (!sel) return;
    var options = '<option value="">Toutes les offres</option>';
    state.offres.forEach(function(o){
      options += '<option value="' + o.id + '">' + (o.fields.Titre || '(Sans titre)') + '</option>';
    });
    sel.innerHTML = options;
  }

  function renderKPIs(){
    var cont = document.getElementById('kanban-kpis');
    if (!cont) return;
    var counts = { offre:0, nouveau:0, shortlist:0, entretien:0, retenu:0, onboarding:0, equipe:0, parti:0 };
    state.cards.forEach(function(c){ if (counts[c.col] !== undefined) counts[c.col]++; });
    var kpi = function(lbl, v, color){
      return '<div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.15);border-radius:10px;padding:12px;text-align:center;">' +
        '<div style="font-family:Space Mono,monospace;font-size:22px;font-weight:900;color:' + color + ';line-height:1;">' + v + '</div>' +
        '<div style="font-family:Poppins,sans-serif;font-size:10px;color:rgba(248,246,241,.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px;">' + lbl + '</div>' +
      '</div>';
    };
    cont.innerHTML =
      kpi('Offres', counts.offre, '#E8940A') +
      kpi('Nouveaux', counts.nouveau, '#F8F6F1') +
      kpi('Shortlist', counts.shortlist, '#3b82f6') +
      kpi('Entretien', counts.entretien, '#a78bfa') +
      kpi('Retenu', counts.retenu, '#22c55e') +
      kpi('Onboarding', counts.onboarding, '#E8940A') +
      kpi('Équipe', counts.equipe, '#22c55e') +
      kpi('Parti', counts.parti, 'rgba(248,246,241,.4)');
  }

  window.filterPipelineKanban = function(){
    state.filterOffre = document.getElementById('kanban-filter-offre').value;
    state.filterVille = document.getElementById('kanban-filter-ville').value;
    state.search = (document.getElementById('kanban-search').value || '').toLowerCase();
    setPipelineView(state.view);
  };

  function getFilteredCards(){
    return state.cards.filter(function(c){
      if (state.filterOffre && c.offreId !== state.filterOffre && c.id !== state.filterOffre) return false;
      if (state.filterVille && c.ville !== state.filterVille) return false;
      if (state.search) {
        var hay = (c.name + ' ' + (c.meta||'') + ' ' + (c.offreTitre||'')).toLowerCase();
        if (hay.indexOf(state.search) === -1) return false;
      }
      return true;
    });
  }

  window.setPipelineView = function(view){
    state.view = view;
    localStorage.setItem('wolo_pipeline_view', view);

    // Toggle buttons
    ['kanban','table','grid'].forEach(function(v){
      var btn = document.getElementById('kanban-btn-' + v);
      if (btn) btn.classList.toggle('active', v === view);
    });

    var board = document.getElementById('kanban-board');
    var table = document.getElementById('kanban-table-view');
    var grid  = document.getElementById('kanban-grid-view');
    if (board) board.style.display = (view === 'kanban') ? 'flex' : 'none';
    if (table) table.style.display = (view === 'table') ? 'block' : 'none';
    if (grid)  grid.style.display  = (view === 'grid')  ? 'grid' : 'none';

    var cards = getFilteredCards();
    if (view === 'kanban') renderKanban(cards);
    else if (view === 'table') renderTable(cards);
    else if (view === 'grid') renderGrid(cards);
  };

  function renderKanban(cards){
    document.querySelectorAll('.kanban-col').forEach(function(col){
      var colKey = col.getAttribute('data-col');
      var body = col.querySelector('[data-col-body]');
      var countEl = col.querySelector('[data-col-count]');
      var items = cards.filter(function(c){ return c.col === colKey; });
      countEl.textContent = items.length;

      if (!items.length) {
        body.innerHTML = '<div class="kanban-col-empty"><div class="kanban-col-empty-icon">—</div>Aucun</div>';
      } else {
        body.innerHTML = items.map(cardHTML).join('');
      }

      // Drop handlers
      col.ondragover = function(e){ e.preventDefault(); col.classList.add('drop-hover'); };
      col.ondragleave = function(){ col.classList.remove('drop-hover'); };
      col.ondrop = function(e){
        e.preventDefault();
        col.classList.remove('drop-hover');
        var cardId = e.dataTransfer.getData('text/plain');
        transitionCard(cardId, colKey);
      };
    });

    // Drag handlers on cards
    document.querySelectorAll('.kanban-card').forEach(function(el){
      el.ondragstart = function(e){
        e.dataTransfer.setData('text/plain', el.getAttribute('data-card-id'));
        el.classList.add('dragging');
      };
      el.ondragend = function(){ el.classList.remove('dragging'); };
    });
  }

  function cardHTML(c){
    var photo = c.photo
      ? '<img class="kanban-card-photo" src="' + c.photo + '" alt="" onerror="this.style.display=\'none\'">'
      : '';
    var score = (c.score && c.score > 0)
      ? '<span class="kanban-card-score">⚡ ' + c.score + '</span>'
      : '';

    if (c.type === 'offre') {
      return '<div class="kanban-card" draggable="false" data-card-id="' + c.id + '" onclick="showOffreDetail(\'' + c.id + '\')" style="cursor:pointer;">' +
        '<div class="kanban-card-name">' + escapeHTML(c.name) + '</div>' +
        '<div class="kanban-card-meta">' + escapeHTML(c.meta) + '</div>' +
        '<div style="font-size:11px;color:#E8940A;font-family:Space Mono,monospace;">' +
          c.candidatures + ' candidature' + (c.candidatures > 1 ? 's' : '') +
        '</div>' +
      '</div>';
    }

    return '<div class="kanban-card" draggable="true" data-card-id="' + c.id + '" data-card-table="' + (c.airtableTable||'') + '">' +
      photo +
      '<div class="kanban-card-name">' + escapeHTML(c.name) + '</div>' +
      '<div class="kanban-card-meta">' + escapeHTML(c.meta || '') + '</div>' +
      score +
      '<div class="kanban-card-actions">' +
        '<button class="kanban-card-menu-btn" onclick="event.stopPropagation();openCardMenu(event, \'' + c.id + '\', \'' + (c.airtableTable||'') + '\', \'' + encodeURIComponent(c.tel||'') + '\')">⋯</button>' +
      '</div>' +
      (c.col === 'onboarding' ? onboardingChecklistHTML(c) : '') +
    '</div>';
  }

  function onboardingChecklistHTML(c){
    return '<div class="kanban-checklist">' +
      '<div class="kanban-checklist-item">☐ Contrat signé</div>' +
      '<div class="kanban-checklist-item">☐ CNI reçue</div>' +
      '<div class="kanban-checklist-item">☐ Compte WOLO créé</div>' +
    '</div>';
  }

  function renderTable(cards){
    var tb = document.getElementById('kanban-table-body');
    if (!tb) return;
    if (!cards.length) {
      tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:rgba(248,246,241,.4);">Aucune candidature.</td></tr>';
      return;
    }
    tb.innerHTML = cards.map(function(c){
      var photo = c.photo ? '<img src="' + c.photo + '" style="width:36px;height:36px;border-radius:8px;object-fit:cover;">' : '<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.06);"></div>';
      return '<tr>' +
        '<td>' + photo + '</td>' +
        '<td style="font-weight:600;">' + escapeHTML(c.name) + '</td>' +
        '<td>' + escapeHTML(c.offreTitre || c.meta || '') + '</td>' +
        '<td>' + escapeHTML(c.ville || '—') + '</td>' +
        '<td>' + colBadge(c.col) + '</td>' +
        '<td>' + (c.score ? '⚡ ' + c.score : '—') + '</td>' +
        '<td>' + (c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '—') + '</td>' +
        '<td><button class="kanban-card-menu-btn" onclick="openCardMenu(event, \'' + c.id + '\', \'' + (c.airtableTable||'') + '\', \'' + encodeURIComponent(c.tel||'') + '\')">⋯</button></td>' +
      '</tr>';
    }).join('');
  }

  function renderGrid(cards){
    var el = document.getElementById('kanban-grid-view');
    if (!el) return;
    if (!cards.length) {
      el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(248,246,241,.4);">Aucune candidature.</div>';
      return;
    }
    el.innerHTML = cards.map(cardHTML).join('');
  }

  function colBadge(col){
    var map = {
      offre: ['📢','#E8940A','Offre'],
      nouveau: ['👀','#F8F6F1','Nouveau'],
      shortlist: ['⭐','#3b82f6','Shortlist'],
      entretien: ['📞','#a78bfa','Entretien'],
      retenu: ['✅','#22c55e','Retenu'],
      onboarding: ['🎯','#E8940A','Onboarding'],
      equipe: ['💼','#22c55e','Équipe'],
      parti: ['🚪','rgba(248,246,241,.5)','Parti']
    };
    var m = map[col] || ['•','#F8F6F1','—'];
    return '<span class="kanban-card-badge" style="background:' + m[1] + '22;color:' + m[1] + ';">' + m[0] + ' ' + m[2] + '</span>';
  }

  // ── TRANSITION (drag & drop ou action manuelle) ──
  window.transitionCard = async function(cardId, targetCol){
    var card = state.cards.find(function(c){ return c.id === cardId; });
    if (!card) return;
    if (card.col === targetCol) return;
    if (card.type === 'offre') { toast('Une offre reste dans sa colonne.', 'error'); return; }

    var newStatut = COL_TO_STATUT[targetCol];
    if (!newStatut) return;

    var oldCol = card.col;
    // Optimistic UI
    card.col = targetCol;
    card.statut = newStatut;
    renderKPIs();
    setPipelineView(state.view);

    try {
      var tableName = card.airtableTable || 'Candidatures';
      var res = await fetch('/api/airtable-proxy/' + encodeURIComponent(tableName), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ id: cardId, fields: { Statut: newStatut } }] })
      });
      if (!res.ok) throw new Error('Airtable PATCH failed');

      toast(card.name + ' → ' + newStatut, 'success');

      // Hook : passage en "equipe" → créer record Employes
      if (targetCol === 'equipe' && oldCol !== 'equipe') {
        await createEmployeFromCandidate(card);
      }

    } catch(err) {
      console.error('transitionCard:', err);
      // Rollback
      card.col = oldCol;
      renderKPIs();
      setPipelineView(state.view);
      toast('Erreur — transition annulée', 'error');
    }
  };

  async function createEmployeFromCandidate(card){
    // Module 1 — à activer quand la table Employes existe
    if (!window.currentPrestataire || !window.currentPrestataire.id) return;
    try {
      var fields = {
        'Patron Prestataire ID': window.currentPrestataire.id,
        'Employe Prénom': (card.name.split(' ')[0] || ''),
        'Employe Nom': (card.name.split(' ').slice(1).join(' ') || ''),
        'Téléphone': card.tel || '',
        'Photo': card.photo || '',
        'Date embauche': new Date().toISOString().slice(0,10),
        'Statut rattachement': 'Invitation à envoyer',
        'Actif': true,
        'Origine': card.airtableTable || 'Candidatures'
      };
      var res = await fetch('/api/airtable-proxy/Employes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fields })
      });
      if (res.ok) {
        toast('✨ ' + card.name + ' intégré à l\'équipe — invite-le à créer son compte WOLO.', 'success');
      }
    } catch(err) {
      console.warn('createEmployeFromCandidate (table Employes peut-être pas encore créée):', err);
    }
  }

  // ── MENU CONTEXTUEL ⋯ ──
  window.openCardMenu = function(ev, cardId, table, telEncoded){
    ev.stopPropagation();
    closeCardMenu();
    var card = state.cards.find(function(c){ return c.id === cardId; });
    if (!card) return;
    var tel = decodeURIComponent(telEncoded || '');

    var menu = document.createElement('div');
    menu.className = 'kanban-context-menu';
    menu.id = 'kanban-ctx-menu';
    menu.innerHTML =
      (tel ? '<button onclick="window.open(\'https://wa.me/' + tel.replace(/\+/g,'') + '\',\'_blank\');closeCardMenu()">💬 Contacter WhatsApp</button>' : '') +
      '<button onclick="transitionCard(\'' + cardId + '\',\'shortlist\');closeCardMenu()">⭐ Shortlist</button>' +
      '<button onclick="transitionCard(\'' + cardId + '\',\'entretien\');closeCardMenu()">📞 Planifier entretien</button>' +
      '<button onclick="transitionCard(\'' + cardId + '\',\'retenu\');closeCardMenu()">✅ Retenir</button>' +
      '<button onclick="transitionCard(\'' + cardId + '\',\'onboarding\');closeCardMenu()">🎯 Lancer onboarding</button>' +
      '<button onclick="transitionCard(\'' + cardId + '\',\'equipe\');closeCardMenu()">💼 Intégrer à l\'équipe</button>' +
      '<button onclick="transitionCard(\'' + cardId + '\',\'parti\');closeCardMenu()" style="color:#ff6b6b;">✗ Refuser / Retirer</button>';

    document.body.appendChild(menu);
    var rect = ev.target.getBoundingClientRect();
    menu.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';

    setTimeout(function(){
      document.addEventListener('click', closeCardMenu, { once: true });
    }, 10);
  };

  window.closeCardMenu = function(){
    var m = document.getElementById('kanban-ctx-menu');
    if (m) m.remove();
  };

  // ── UTILS ──
  function escapeHTML(s){
    return String(s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  // Toast minimal si non présent
  if (typeof window.toast !== 'function') {
    window.toast = function(msg, type){
      console.log('[' + (type||'info') + ']', msg);
    };
  }

})();
