// ================================================================
// WOLO Market — Mapping métier → widgets actifs
// API : window.WoloWidgetsConfig
//   .getWidgetsForMetier(metier)        → array de widget keys
//   .getWidgetsForProfilePublic(metier) → widgets affichés profil public
//   .getWidgetsForDashboard(metier)     → widgets affichés dashboard pro
//   .normalizeMetier(metier)            → métier normalisé (lowercase, sans accents)
//
// Chaque widget est défini par :
//   - key            : identifiant unique
//   - label          : texte affiché
//   - icon           : emoji
//   - render(...)    : fournie par le composant qui s'enregistre
//   - dashboardOnly  : si true, pas affiché sur profil public
//   - publicOnly     : si true, pas affiché sur dashboard pro
// ================================================================
(function () {
  function normalize(s) {
    if (!s) return '';
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  // ── Tous les widgets métier connus ──
  // L'implémentation (render) est fournie par les composants ; cette
  // table ne contient que les métadonnées + visibility.
  const WIDGETS = {
    // Catalogue de prestations (coiffeuse, couturière, esthé, mécano forfaits…)
    prestations_catalogue: {
      key: 'prestations_catalogue',
      label: 'Mes prestations',
      icon: '💇',
      both: true,
    },
    // Portfolio multi-projets (créatifs)
    portfolio: {
      key: 'portfolio',
      label: 'Portfolio',
      icon: '📷',
      both: true,
    },
    // Réservation de table (restaurants)
    reservation_table: {
      key: 'reservation_table',
      label: 'Réserver une table',
      icon: '🍽️',
      both: true,
    },
    // Demande de devis chantier (BTP / installateurs)
    devis_chantier: {
      key: 'devis_chantier',
      label: 'Demande de devis',
      icon: '🔧',
      both: true,
    },
    // Commande à façon (cordonnier, tailleur, bijoutier)
    commande_facon: {
      key: 'commande_facon',
      label: 'Commande sur mesure',
      icon: '✂️',
      both: true,
    },
    // RDV mécano (garage, lavage auto, mécanicien moto)
    rdv_mecano: {
      key: 'rdv_mecano',
      label: 'Prendre RDV véhicule',
      icon: '🔩',
      both: true,
    },
    // Commande pâtisserie / gâteau
    commande_patisserie: {
      key: 'commande_patisserie',
      label: 'Commander un gâteau',
      icon: '🎂',
      both: true,
    },
    // Réservation chambre (hôtels)
    reservation_chambre: {
      key: 'reservation_chambre',
      label: 'Réserver une chambre',
      icon: '🛏️',
      both: true,
    },
    // Catalogue de cours / matières (prof particulier, coach)
    cours_offres: {
      key: 'cours_offres',
      label: 'Mes cours / matières',
      icon: '📚',
      both: true,
    },
  };

  // ── Mapping métier → widgets (clé : libellé tel qu'il apparaît dans
  // Airtable / Supabase ; matching insensible à la casse + accents) ──
  // Pour ajouter un métier : ajouter une ligne ici, c'est tout.
  const METIER_WIDGETS = {
    // Restauration
    'restaurant':            ['reservation_table'],
    'restaurateur':          ['reservation_table'],
    'maquis':                ['reservation_table'],
    'bar':                   ['reservation_table'],
    'lounge':                ['reservation_table'],
    'fast food':             ['reservation_table'],
    'food truck':            ['reservation_table'],
    'traiteur':              ['reservation_table', 'commande_patisserie'],

    // Hébergement
    'hotel':                 ['reservation_chambre'],
    'auberge':               ['reservation_chambre'],
    'maison d hotes':        ['reservation_chambre'],
    'maison dhotes':         ['reservation_chambre'],

    // Pâtisserie / Boulangerie
    'patissier':             ['commande_patisserie', 'prestations_catalogue'],
    'patissiere':            ['commande_patisserie', 'prestations_catalogue'],
    'boulanger':             ['commande_patisserie', 'prestations_catalogue'],
    'boulangerie':           ['commande_patisserie', 'prestations_catalogue'],
    'patisserie':            ['commande_patisserie', 'prestations_catalogue'],

    // Coiffure / Esthétique / Beauté
    'coiffeuse':             ['prestations_catalogue', 'portfolio'],
    'coiffeur':              ['prestations_catalogue', 'portfolio'],
    'tresseuse':             ['prestations_catalogue', 'portfolio'],
    'esthe':                 ['prestations_catalogue', 'portfolio'],
    'estheticienne':         ['prestations_catalogue', 'portfolio'],
    'manucure':              ['prestations_catalogue', 'portfolio'],
    'maquilleuse':           ['prestations_catalogue', 'portfolio'],
    'barbier':               ['prestations_catalogue', 'portfolio'],

    // Couture / mode
    'couturiere':            ['prestations_catalogue', 'commande_facon', 'portfolio'],
    'couturier':             ['prestations_catalogue', 'commande_facon', 'portfolio'],
    'tailleur':              ['commande_facon', 'portfolio', 'prestations_catalogue'],
    'styliste':              ['portfolio', 'commande_facon'],

    // Création visuelle / multimédia
    'graphiste':             ['portfolio', 'prestations_catalogue'],
    'photographe':           ['portfolio', 'prestations_catalogue'],
    'videaste':              ['portfolio', 'prestations_catalogue'],
    'monteur video':         ['portfolio', 'prestations_catalogue'],
    'designer':              ['portfolio', 'prestations_catalogue'],
    'illustrateur':          ['portfolio'],
    'architecte':            ['portfolio', 'devis_chantier'],
    'decorateur':            ['portfolio', 'devis_chantier'],
    'webdesigner':           ['portfolio', 'prestations_catalogue'],
    'developpeur':           ['portfolio', 'prestations_catalogue'],
    'community manager':     ['portfolio', 'prestations_catalogue'],

    // BTP / installation / artisanat technique
    'macon':                 ['devis_chantier', 'portfolio'],
    'maconnerie':            ['devis_chantier', 'portfolio'],
    'plombier':              ['devis_chantier'],
    'electricien':           ['devis_chantier'],
    'peintre':               ['devis_chantier', 'portfolio'],
    'peintre batiment':      ['devis_chantier', 'portfolio'],
    'menuisier':             ['devis_chantier', 'portfolio', 'commande_facon'],
    'ebeniste':              ['devis_chantier', 'portfolio', 'commande_facon'],
    'carreleur':             ['devis_chantier', 'portfolio'],
    'soudeur':               ['devis_chantier', 'commande_facon'],
    'climatisation':         ['devis_chantier'],
    'frigoriste':            ['devis_chantier'],
    'forage':                ['devis_chantier'],
    'jardinier':             ['devis_chantier', 'prestations_catalogue'],
    'paysagiste':            ['devis_chantier', 'portfolio'],

    // Mobilité / mécanique
    'mecanicien':            ['rdv_mecano', 'prestations_catalogue'],
    'mecanicien auto':       ['rdv_mecano', 'prestations_catalogue'],
    'mecanicien moto':       ['rdv_mecano', 'prestations_catalogue'],
    'garagiste':             ['rdv_mecano', 'prestations_catalogue'],
    'lavage auto':           ['rdv_mecano', 'prestations_catalogue'],

    // Cordonnerie / réparation
    'cordonnier':            ['commande_facon', 'prestations_catalogue'],
    'bijoutier':             ['commande_facon', 'portfolio'],
    'reparateur':            ['prestations_catalogue', 'devis_chantier'],

    // Enseignement / coaching
    'professeur':            ['cours_offres'],
    'professeur particulier':['cours_offres'],
    'prof':                  ['cours_offres'],
    'coach':                 ['cours_offres'],
    'coach sportif':         ['cours_offres'],
    'coach personnel':       ['cours_offres'],
    'formateur':             ['cours_offres', 'prestations_catalogue'],

    // Santé bien-être
    'masseuse':              ['prestations_catalogue'],
    'masseur':               ['prestations_catalogue'],
    'kine':                  ['prestations_catalogue'],

    // Autres services au catalogue
    'menage':                ['prestations_catalogue'],
    'baby sitter':           ['prestations_catalogue'],
    'chauffeur':             ['prestations_catalogue'],
    'demenageur':            ['devis_chantier', 'prestations_catalogue'],
  };

  function getWidgetsForMetier(metier) {
    const norm = normalize(metier);
    if (!norm) return [];
    // Match exact d'abord
    if (METIER_WIDGETS[norm]) return METIER_WIDGETS[norm].slice();
    // Fallback : match partiel (le métier contient une clé connue)
    for (const k in METIER_WIDGETS) {
      if (norm.includes(k) || k.includes(norm)) return METIER_WIDGETS[k].slice();
    }
    return [];
  }

  function getWidgetMeta(key) {
    return WIDGETS[key] || null;
  }

  function getWidgetsForProfilePublic(metier) {
    return getWidgetsForMetier(metier).filter(k => {
      const w = WIDGETS[k];
      return w && !w.dashboardOnly;
    });
  }

  function getWidgetsForDashboard(metier) {
    return getWidgetsForMetier(metier).filter(k => {
      const w = WIDGETS[k];
      return w && !w.publicOnly;
    });
  }

  window.WoloWidgetsConfig = {
    WIDGETS,
    METIER_WIDGETS,
    normalizeMetier: normalize,
    getWidgetsForMetier,
    getWidgetsForProfilePublic,
    getWidgetsForDashboard,
    getWidgetMeta,
  };
})();
