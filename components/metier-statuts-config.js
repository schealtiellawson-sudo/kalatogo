// ================================================================
// WOLO Market — Mapping métier → statuts socio-économiques
//
// API : window.WoloMetierStatuts
//   .getStatutsFor(metier)   → { statuts: [...], intro: '...', sequence_prefix: 'M_xxx' }
//   .getIntroFor(metier)     → string (phrase contextuelle d'inscription)
//   .getSequenceId(metier, statut) → 'M_apprentie_couture' / 'M_patron_garage' / etc.
//   .normalizeMetier(metier) → métier normalisé (lowercase, sans accents)
//
// Source : RECHERCHE-METIERS-AOC-2026-04-29.md (12 familles, ~60 métiers)
//
// Principe :
//   - Le pattern apprenti/maître/indépendant n'est PAS universel.
//   - Pour les métiers où il existe (coiffure, couture, BTP, méca, etc.) → on l'expose.
//   - Pour les métiers où il n'existe pas (digital, santé, transport, services personne) →
//     on propose un découpage adapté (freelance / employé / patron, ou propriétaire / salarié).
//   - L'apprenti n'a PAS la capacité de payer 2 500 F → bouton Pro caché ou tardif (J+13).
//   - Les statuts sont privés par défaut côté profil public (sauf "Patron" qui est un atout).
// ================================================================
(function () {
  function normalize(s) {
    if (!s) return '';
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ── Catalogues de statuts réutilisables ──────────────────────────

  // Pattern coiffure / couture / esthétique (apprentissage féminin payant fort)
  const STATUTS_BEAUTE_FEM = [
    {
      value: 'apprentie',
      emoji: '🌱',
      label: 'Apprentie chez une patronne',
      description: "Tu apprends chez Madame depuis quelques mois ou années. Tu n'as pas encore tes propres clientes. WOLO te donne ton dimanche."
    },
    {
      value: 'patronne',
      emoji: '👑',
      label: 'Cheffe de salon / Patronne',
      description: "Tu diriges ton salon ou atelier. Tu as des apprenties ou des employées. WOLO t'aide à recruter, payer, gérer."
    },
    {
      value: 'independante',
      emoji: '🚪',
      label: 'Indépendante (domicile / sur commande)',
      description: "Tu travailles seule à ton compte, à domicile ou sur commande. Pas d'atelier fixe. WOLO te donne tes clientes du quartier."
    }
  ];

  // Pattern barbier (masculin, frais d'entrée plus bas)
  const STATUTS_BARBIER = [
    {
      value: 'apprenti',
      emoji: '🌱',
      label: 'Apprenti chez un patron',
      description: "Tu apprends dans un salon. Pas encore tes propres clients. WOLO te donne tes débuts."
    },
    {
      value: 'patron',
      emoji: '👑',
      label: 'Patron de salon barbier',
      description: "Tu diriges ton salon. Tu recrutes, tu gères les apprentis. WOLO t'aide pipeline, paie, équipe."
    },
    {
      value: 'independant',
      emoji: '✂️',
      label: 'Indépendant / Ambulant',
      description: "Tu coupes à domicile ou ambulant, pas de salon fixe. WOLO te connecte à ton quartier."
    }
  ];

  // Pattern BTP / Construction (apprenticeship masculin)
  const STATUTS_BTP = [
    {
      value: 'apprenti',
      emoji: '🌱',
      label: 'Apprenti chez un chef',
      description: "Tu apprends sur les chantiers chez un patron. Argent de poche journalier. WOLO te donne le dimanche pour tes propres petits boulots."
    },
    {
      value: 'compagnon',
      emoji: '🔨',
      label: "Compagnon / Ouvrier qualifié",
      description: "Tu as fini ton apprenticeship. Tu travailles pour des chefs sur les chantiers. WOLO te donne tes clients directs."
    },
    {
      value: 'patron',
      emoji: '👷',
      label: 'Patron / Chef de chantier',
      description: "Tu diriges ton équipe. Tu fais des devis. WOLO t'aide devis chantier, recrutement, paie."
    },
    {
      value: 'independant',
      emoji: '🛠️',
      label: 'Indépendant solo',
      description: "Tu travailles seul, pas d'équipe. Petits chantiers et dépannages. WOLO te rend visible dans ton quartier."
    }
  ];

  // Pattern mécanique auto/moto
  const STATUTS_MECANO = [
    {
      value: 'apprenti',
      emoji: '🌱',
      label: 'Apprenti au garage',
      description: "Tu apprends chez un patron. Pas encore tes propres clients. WOLO te donne tes samedis perso."
    },
    {
      value: 'compagnon',
      emoji: '🔧',
      label: "Compagnon / Ouvrier mécano",
      description: "Tu travailles au garage à la commission. WOLO te donne tes clients directs."
    },
    {
      value: 'patron',
      emoji: '🏭',
      label: 'Patron de garage',
      description: "Tu diriges ton garage. Apprentis, ouvriers, commandes. WOLO t'aide RDV mécano, équipe, paie."
    },
    {
      value: 'independant',
      emoji: '🛞',
      label: 'Indépendant à domicile',
      description: "Tu te déplaces chez le client, pas de garage fixe. WOLO te géolocalise."
    }
  ];

  // Pattern réparateur tech (GSM, PC, électroménager)
  const STATUTS_REP_TECH = [
    {
      value: 'apprenti',
      emoji: '🌱',
      label: 'Apprenti dans un corner GSM',
      description: "Tu apprends la réparation dans une boutique. WOLO te donne tes premiers clients perso."
    },
    {
      value: 'patron',
      emoji: '🏪',
      label: 'Patron de boutique',
      description: "Tu diriges ta boutique GSM/électronique. WOLO catalogue prestations + équipe."
    },
    {
      value: 'independant',
      emoji: '📱',
      label: 'Réparateur indépendant',
      description: "Tu répares à domicile ou sur place, pas de boutique. WOLO te rend visible."
    }
  ];

  // Pattern photo / vidéo / créatif (autodidaxie + studios)
  const STATUTS_CREATIF = [
    {
      value: 'freelance',
      emoji: '🎨',
      label: 'Freelance solo',
      description: "Tu travailles seul, à ton compte. Tu cherches des clients à chaque projet. WOLO te donne portfolio + visibilité."
    },
    {
      value: 'resident_studio',
      emoji: '🏛️',
      label: 'Résident studio',
      description: "Tu travailles dans un studio sans en être propriétaire. Tu partages les revenus. WOLO te donne ton profil perso."
    },
    {
      value: 'patron_studio',
      emoji: '🎬',
      label: 'Patron studio / agence',
      description: "Tu diriges ton studio. Tu recrutes des résidents. WOLO t'aide pipeline + équipe + commande façon."
    }
  ];

  // Pattern imprimerie / sérigraphie (apprenticeship classique)
  const STATUTS_IMPRIMERIE = [
    {
      value: 'apprenti',
      emoji: '🌱',
      label: "Apprenti à l'atelier",
      description: "Tu apprends dans un atelier. WOLO te donne tes débuts."
    },
    {
      value: 'patron',
      emoji: '🖨️',
      label: "Patron d'atelier",
      description: "Tu diriges ton atelier. Tu fais des devis. WOLO t'aide commande façon + équipe."
    },
    {
      value: 'independant',
      emoji: '🎯',
      label: 'Indépendant / Freelance',
      description: "Tu travailles seul, à la commande. WOLO te rend visible."
    }
  ];

  // Pattern transport (propriétaire vs salarié)
  const STATUTS_TRANSPORT = [
    {
      value: 'salarie',
      emoji: '🪪',
      label: "Chauffeur salarié / Titulaire",
      description: "Tu conduis le véhicule d'un patron. Tu lui verses un loyer journalier. WOLO te donne ton carnet client perso."
    },
    {
      value: 'proprietaire',
      emoji: '🚖',
      label: 'Propriétaire de mon véhicule',
      description: "Le taxi/moto est à toi. WOLO te donne réseau corporate (mariages, hôtels, courses longues)."
    },
    {
      value: 'patron_flotte',
      emoji: '🏁',
      label: 'Patron de flotte',
      description: "Tu possèdes plusieurs véhicules avec des chauffeurs. WOLO t'aide tracking, paie, équipe."
    }
  ];

  // Pattern coursier / livreur
  const STATUTS_COURSIER = [
    {
      value: 'salarie_plateforme',
      emoji: '📦',
      label: 'Livreur plateforme (Glovo, Yango...)',
      description: "Tu fais des courses pour une grosse plateforme. WOLO te donne ton réseau B2B perso (boutiques, restos)."
    },
    {
      value: 'proprietaire',
      emoji: '🏍️',
      label: 'Coursier indépendant (moto perso)',
      description: "Tu as ta moto, tu travailles direct avec les clients. WOLO te donne devis livraison + carnet."
    }
  ];

  // Pattern restauration : pâtisserie / boulangerie (apprenticeship)
  const STATUTS_PATIS = [
    {
      value: 'apprenti',
      emoji: '🌱',
      label: "Apprenti à la pâtisserie / boulangerie",
      description: "Tu apprends chez un patron. Horaires durs (3h-12h). WOLO te donne tes commandes perso du dimanche."
    },
    {
      value: 'patron',
      emoji: '🎂',
      label: 'Patron de pâtisserie / boulangerie',
      description: "Tu diriges ton commerce. WOLO t'aide commande pâtisserie + équipe + paie."
    },
    {
      value: 'independant',
      emoji: '🥐',
      label: 'Indépendant (à la commande)',
      description: "Tu fais des gâteaux/viennoiseries chez toi sur commande. WOLO te rend visible."
    }
  ];

  // Pattern cuisine domicile / Mama Cantine
  const STATUTS_CUISINE = [
    {
      value: 'mama_cantine',
      emoji: '🍲',
      label: 'Mama Cantine / Cuisinière de quartier',
      description: "Tu nourris ton quartier tous les jours. WOLO te connecte aux bureaux pour le déjeuner."
    },
    {
      value: 'traiteur',
      emoji: '🎉',
      label: 'Traiteur événementiel',
      description: "Tu cuisines pour mariages, baptêmes, événements. WOLO t'aide devis événementiel + portfolio."
    },
    {
      value: 'ambulant',
      emoji: '🥟',
      label: 'Vendeur(se) ambulant(e)',
      description: "Tu vends sur la rue (beignets, brochettes, jus). WOLO partage ta position du jour."
    }
  ];

  // Pattern restaurant (entité business)
  const STATUTS_RESTO = [
    {
      value: 'patron',
      emoji: '🏪',
      label: 'Patron / Gérant',
      description: "Tu diriges l'établissement. WOLO t'aide réservation + équipe + paie."
    },
    {
      value: 'employe',
      emoji: '🧑‍🍳',
      label: 'Employé(e) (cuisinier, serveur, gérant salarié)',
      description: "Tu travailles dans un restaurant existant. WOLO te garde un profil pro hors emploi."
    },
    {
      value: 'freelance_extra',
      emoji: '⏱️',
      label: "Extra freelance (renfort événement)",
      description: "Tu fais des prestations ponctuelles. WOLO te connecte aux patrons qui cherchent un extra."
    }
  ];

  // Pattern services à la personne
  const STATUTS_SVC_PERSO = [
    {
      value: 'employee_fixe',
      emoji: '🏠',
      label: "Employée fixe chez un particulier",
      description: "Tu travailles tous les jours pour la même famille. WOLO te donne contrat type + Safety + référent."
    },
    {
      value: 'freelance_multi',
      emoji: '🔑',
      label: 'Freelance multi-foyers',
      description: "Tu travailles dans plusieurs maisons à la prestation. WOLO t'aide carnet + Safety + horaires."
    },
    {
      value: 'ponctuelle',
      emoji: '⚡',
      label: 'Prestation ponctuelle (événement, garde)',
      description: "Tu interviens à la demande. WOLO te donne Score + recommandations digitales."
    }
  ];

  // Pattern santé formée (kiné, opticien, nutritionniste)
  const STATUTS_SANTE_FORM = [
    {
      value: 'freelance',
      emoji: '🩺',
      label: 'Praticien(ne) formé(e) freelance',
      description: "Tu as ton diplôme, tu travailles à ton compte. WOLO t'aide catalogue prestations + RDV."
    },
    {
      value: 'employe',
      emoji: '🏥',
      label: 'Employé(e) clinique / centre',
      description: "Tu travailles pour une structure médicale. WOLO te donne profil perso pour activités hors structure."
    },
    {
      value: 'patron_centre',
      emoji: '🏛️',
      label: 'Patron(ne) de centre',
      description: "Tu diriges ton centre/cabinet. WOLO t'aide équipe + paie + commandes corporate."
    }
  ];

  // Pattern tradipraticien (héritage)
  const STATUTS_TRADI = [
    {
      value: 'heritier',
      emoji: '🌿',
      label: 'Héritier/héritière (savoir transmis)',
      description: "Tu pratiques un savoir traditionnel reçu en famille. WOLO te donne profil + témoignages + Safety."
    },
    {
      value: 'patron_centre_tradi',
      emoji: '🏛️',
      label: 'Patron(ne) de centre traditionnel',
      description: "Tu diriges un centre. WOLO t'aide visibilité + équipe."
    }
  ];

  // Pattern éducation / conseil
  const STATUTS_EDUC = [
    {
      value: 'etudiant_freelance',
      emoji: '📚',
      label: 'Étudiant(e) qui donne des cours',
      description: "Tu es à l'université, tu donnes des cours pour gagner. WOLO te connecte aux parents du quartier."
    },
    {
      value: 'freelance_forme',
      emoji: '🎓',
      label: 'Freelance formé(e)',
      description: "Tu as ton diplôme, tu travailles à ton compte. WOLO t'aide portfolio + tarifs structurés."
    },
    {
      value: 'employe_structure',
      emoji: '🏢',
      label: 'Employé(e) de structure',
      description: "Tu travailles pour un cabinet/agence/école. WOLO te garde un profil perso pour activités hors structure."
    },
    {
      value: 'patron_cabinet',
      emoji: '👔',
      label: 'Patron(ne) de cabinet',
      description: "Tu diriges ton cabinet. WOLO t'aide pipeline + équipe + paie + facturation."
    }
  ];

  // Pattern talents digitaux
  const STATUTS_DIGITAL = [
    {
      value: 'freelance_debutant',
      emoji: '🌱',
      label: 'Freelance débutant (< 2 ans)',
      description: "Tu débutes en freelance. Pas encore de portfolio solide. WOLO t'aide portfolio + tarifs guides + premier client subv."
    },
    {
      value: 'freelance_confirme',
      emoji: '⭐',
      label: 'Freelance confirmé (> 2 ans)',
      description: "Tu as ton réseau. WOLO te donne portfolio premium + diaspora ready."
    },
    {
      value: 'employe_agence',
      emoji: '💼',
      label: 'Employé(e) agence / startup',
      description: "Tu travailles pour une agence ou une startup. WOLO te garde un profil perso pour side-projects."
    },
    {
      value: 'patron_agence',
      emoji: '🚀',
      label: "Fondateur(trice) d'agence",
      description: "Tu diriges ton agence. WOLO t'aide pipeline + équipe + facturation B2B."
    }
  ];

  // Pattern commerces (entités)
  const STATUTS_COMMERCE = [
    {
      value: 'patron',
      emoji: '🏪',
      label: 'Patron(ne) / Gérant(e)',
      description: "Tu diriges le commerce. WOLO t'aide pipeline + équipe + paie."
    },
    {
      value: 'employe',
      emoji: '🧑‍💼',
      label: 'Employé(e)',
      description: "Tu travailles dans un commerce existant. WOLO te garde un profil perso."
    }
  ];

  // Pattern commande façon (cordonnier, bijoutier, teinturier, brodeuse)
  // Hybride : apprenti / patron / indépendant
  const STATUTS_COMMANDE_FACON = [
    {
      value: 'apprenti',
      emoji: '🌱',
      label: "Apprenti(e) à l'atelier",
      description: "Tu apprends ton métier chez un patron. WOLO te donne tes premières commandes."
    },
    {
      value: 'patron',
      emoji: '👑',
      label: "Patron(ne) d'atelier",
      description: "Tu diriges ton atelier. WOLO t'aide commande façon + équipe."
    },
    {
      value: 'independant',
      emoji: '✋',
      label: 'Indépendant(e) à la commande',
      description: "Tu travailles seul(e), à la commande. WOLO te rend visible."
    }
  ];

  // Pattern modèle / influenceur (catégorie particulière)
  const STATUTS_INFLUENCEUR = [
    {
      value: 'debut',
      emoji: '🌱',
      label: 'Modèle / influenceur(se) débutant(e)',
      description: "Tu construis ton audience. WOLO te donne portfolio + premier réseau marques locales."
    },
    {
      value: 'confirme',
      emoji: '✨',
      label: 'Influenceur(se) confirmé(e)',
      description: "Tu as ton audience. WOLO te connecte aux marques B/T."
    }
  ];

  // ── Mapping métier (normalisé) → config ──────────────────────────
  // sequence_prefix : préfixe de séquence WhatsApp (sera complété par _<statut>)
  //                   ex : 'M_apprentie_couture', 'M_patron_garage'
  // intro : phrase contextuelle affichée au-dessus du choix de statut
  //
  // IMPORTANT : si un métier n'a pas pattern apprenti/maître clair, on utilise un autre découpage.

  const METIER_CONFIG = {
    // ─── BEAUTÉ & BIEN-ÊTRE ─────────────────────────────────────
    'coiffeur': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours coiffure ?",
      sequence_prefix: 'M_xxx_coiffure'
    },
    'coiffeuse': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours coiffure ?",
      sequence_prefix: 'M_xxx_coiffure'
    },
    'tresseuse': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours coiffure ?",
      sequence_prefix: 'M_xxx_coiffure'
    },
    'estheticienne': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours esthé ?",
      sequence_prefix: 'M_xxx_esthe'
    },
    'esthe': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours esthé ?",
      sequence_prefix: 'M_xxx_esthe'
    },
    'barbier': {
      statuts: STATUTS_BARBIER,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_barbier'
    },
    'tatoueur': {
      statuts: [
        { value: 'autodidacte', emoji: '🎨', label: 'Autodidacte', description: "Tu t'es formé(e) seul(e). WOLO portfolio + visibilité." },
        { value: 'resident_studio', emoji: '🏛️', label: 'Résident studio', description: "Tu tatoues dans un studio sans en être propriétaire. WOLO profil perso." },
        { value: 'patron_studio', emoji: '👑', label: 'Patron(ne) studio', description: "Tu diriges ton studio. WOLO équipe + commande façon." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_tatoueur'
    },
    'tatoueuse': {
      statuts: [
        { value: 'autodidacte', emoji: '🎨', label: 'Autodidacte', description: "Tu t'es formée seule. WOLO portfolio + visibilité." },
        { value: 'resident_studio', emoji: '🏛️', label: 'Résidente studio', description: "Tu tatoues dans un studio sans en être propriétaire. WOLO profil perso." },
        { value: 'patron_studio', emoji: '👑', label: 'Patronne studio', description: "Tu diriges ton studio. WOLO équipe + commande façon." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_tatoueur'
    },
    'onglerie': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours nail art ?",
      sequence_prefix: 'M_xxx_nail'
    },
    'nail art': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours nail art ?",
      sequence_prefix: 'M_xxx_nail'
    },
    'manucure': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es ?",
      sequence_prefix: 'M_xxx_nail'
    },
    'maquilleur': {
      statuts: [
        { value: 'autodidacte_freelance', emoji: '🎨', label: 'Freelance autodidacte', description: "Tu t'es formé(e) (YouTube + stages). WOLO portfolio + visibilité." },
        { value: 'resident_studio', emoji: '🏛️', label: 'Résident(e) studio/salon', description: "Tu maquilles dans un salon sans en être propriétaire. WOLO profil perso." },
        { value: 'patron', emoji: '👑', label: 'Patron(ne)', description: "Tu diriges ton studio. WOLO équipe." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_maquilleur'
    },
    'maquilleuse': {
      statuts: [
        { value: 'autodidacte_freelance', emoji: '🎨', label: 'Freelance autodidacte', description: "Tu t'es formée (YouTube + stages). WOLO portfolio + visibilité." },
        { value: 'resident_studio', emoji: '🏛️', label: 'Résidente studio/salon', description: "Tu maquilles dans un salon sans en être propriétaire. WOLO profil perso." },
        { value: 'patronne', emoji: '👑', label: 'Patronne', description: "Tu diriges ton studio. WOLO équipe." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_maquilleur'
    },
    'masseur': {
      statuts: STATUTS_SANTE_FORM,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_masseur'
    },
    'masseuse': {
      statuts: STATUTS_SANTE_FORM,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_masseur'
    },
    'spa': {
      statuts: [
        { value: 'patron_spa', emoji: '🏛️', label: 'Patron(ne) institut/spa', description: "Tu diriges l'institut. WOLO équipe + RDV + paie." },
        { value: 'employe', emoji: '🧖', label: 'Employé(e) spa', description: "Tu travailles dans un institut existant. WOLO profil perso." },
        { value: 'freelance', emoji: '✨', label: 'Freelance soins', description: "Tu fais des soins à domicile ou ponctuel. WOLO portfolio + Safety." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_spa'
    },
    'spa et soins': {
      statuts: [
        { value: 'patron_spa', emoji: '🏛️', label: 'Patron(ne) institut/spa', description: "Tu diriges l'institut. WOLO équipe + RDV + paie." },
        { value: 'employe', emoji: '🧖', label: 'Employé(e) spa', description: "Tu travailles dans un institut existant. WOLO profil perso." },
        { value: 'freelance', emoji: '✨', label: 'Freelance soins', description: "Tu fais des soins à domicile ou ponctuel. WOLO portfolio + Safety." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_spa'
    },

    // ─── ARTISANAT & CONSTRUCTION ─────────────────────────────
    'menuisier': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es dans la menuiserie :",
      sequence_prefix: 'M_xxx_menuisier'
    },
    'ebeniste': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_ebeniste'
    },
    'macon': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es dans la maçonnerie :",
      sequence_prefix: 'M_xxx_macon'
    },
    'maconnerie': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_macon'
    },
    'electricien': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_electricien'
    },
    'plombier': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_plombier'
    },
    'peintre': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_peintre'
    },
    'peintre batiment': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_peintre'
    },
    'peintre en batiment': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_peintre'
    },
    'soudeur': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es dans la soudure :",
      sequence_prefix: 'M_xxx_soudeur'
    },
    'carreleur': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_carreleur'
    },
    'ferronnier': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_ferronnier'
    },
    'vitrier': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_vitrier'
    },
    'tapissier': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_tapissier'
    },
    'climatiseur': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_climatisation'
    },
    'climatisation': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_climatisation'
    },
    'frigoriste': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_frigoriste'
    },
    'froid': {
      statuts: STATUTS_BTP,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_climatisation'
    },

    // ─── MÉCANIQUE & TECH ──────────────────────────────────────
    'mecanicien': {
      statuts: STATUTS_MECANO,
      intro: "Pour bien te servir, dis-nous où tu en es dans la mécanique :",
      sequence_prefix: 'M_xxx_mecano'
    },
    'mecanicien auto': {
      statuts: STATUTS_MECANO,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_mecano_auto'
    },
    'mecanicien moto': {
      statuts: STATUTS_MECANO,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_mecano_moto'
    },
    'electronicien': {
      statuts: STATUTS_REP_TECH,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_electronicien'
    },
    'reparateur telephones': {
      statuts: STATUTS_REP_TECH,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_gsm'
    },
    'reparateur telephone': {
      statuts: STATUTS_REP_TECH,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_gsm'
    },
    'informaticien': {
      statuts: STATUTS_REP_TECH,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_info'
    },
    'technicien pc': {
      statuts: STATUTS_REP_TECH,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_info'
    },
    'reparateur electromenager': {
      statuts: STATUTS_REP_TECH,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_electromenager'
    },

    // ─── MODE & TEXTILE ────────────────────────────────────────
    'couturier': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours couture ?",
      sequence_prefix: 'M_xxx_couture'
    },
    'couturiere': {
      statuts: STATUTS_BEAUTE_FEM,
      intro: "Important pour t'envoyer les bons conseils : où tu en es dans ton parcours couture ?",
      sequence_prefix: 'M_xxx_couture'
    },
    'tailleur': {
      statuts: [
        { value: 'apprenti', emoji: '🌱', label: "Apprenti chez un maître tailleur", description: "Tu apprends la coupe homme. WOLO te donne tes premières commandes." },
        { value: 'patron', emoji: '👑', label: "Maître tailleur / Patron", description: "Tu diriges ton atelier. Costumes, retouches. WOLO commande façon + équipe." },
        { value: 'independant', emoji: '✂️', label: 'Indépendant à la commande', description: "Tu travailles seul. WOLO te rend visible." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_tailleur'
    },
    'styliste': {
      statuts: STATUTS_CREATIF,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_styliste'
    },
    'brodeur': {
      statuts: STATUTS_COMMANDE_FACON,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_brodeur'
    },
    'brodeuse': {
      statuts: STATUTS_COMMANDE_FACON,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_brodeur'
    },
    'cordonnier': {
      statuts: STATUTS_COMMANDE_FACON,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_cordonnier'
    },
    'teinturier': {
      statuts: STATUTS_COMMANDE_FACON,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_teinturier'
    },
    'tie dye': {
      statuts: STATUTS_COMMANDE_FACON,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_teinturier'
    },
    'vendeur vetements': {
      statuts: [
        { value: 'marche', emoji: '🛍️', label: 'Vendeur(se) marché / ambulant(e)', description: "Tu vends sur le marché ou en ambulant. WOLO te donne profil + clientèle quartier." },
        { value: 'patron_boutique', emoji: '🏪', label: 'Patron(ne) de boutique', description: "Tu diriges ta boutique. WOLO équipe + paie + visibilité." },
        { value: 'employe', emoji: '🧑‍💼', label: 'Employé(e) boutique', description: "Tu travailles dans une boutique existante. WOLO profil perso." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_vendeur_vetements'
    },

    // ─── PHOTO & CRÉATIF ───────────────────────────────────────
    'photographe': {
      statuts: STATUTS_CREATIF,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_photographe'
    },
    'videaste': {
      statuts: STATUTS_CREATIF,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_videaste'
    },
    'graphiste': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_graphiste'
    },
    'serigraphie': {
      statuts: STATUTS_IMPRIMERIE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_serigraphe'
    },
    'imprimeur': {
      statuts: STATUTS_IMPRIMERIE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_imprimeur'
    },

    // ─── TRANSPORT & LOGISTIQUE ────────────────────────────────
    'chauffeur taxi': {
      statuts: STATUTS_TRANSPORT,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_taxi'
    },
    'chauffeur livreur': {
      statuts: STATUTS_TRANSPORT,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_livreur'
    },
    'chauffeur': {
      statuts: STATUTS_TRANSPORT,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_chauffeur'
    },
    'coursier moto': {
      statuts: STATUTS_COURSIER,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_coursier'
    },
    'coursier': {
      statuts: STATUTS_COURSIER,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_coursier'
    },
    'demenageur': {
      statuts: [
        { value: 'employe', emoji: '👷', label: 'Employé / journalier', description: "Tu travailles à la mission pour un patron. WOLO te donne ton profil + carnet client." },
        { value: 'patron_equipe', emoji: '🚚', label: 'Patron équipe déménagement', description: "Tu as ton équipe et ton camion. WOLO devis + équipe." }
      ],
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_demenageur'
    },

    // ─── RESTAURATION ──────────────────────────────────────────
    'restaurant': {
      statuts: STATUTS_RESTO,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_restaurant'
    },
    'restaurateur': {
      statuts: STATUTS_RESTO,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_restaurant'
    },
    'cuisinier a domicile': {
      statuts: STATUTS_CUISINE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_cuisine'
    },
    'cuisinier': {
      statuts: STATUTS_CUISINE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_cuisine'
    },
    'patissier': {
      statuts: STATUTS_PATIS,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_patissier'
    },
    'patissiere': {
      statuts: STATUTS_PATIS,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_patissier'
    },
    'patisserie': {
      statuts: STATUTS_PATIS,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_patissier'
    },
    'boulanger': {
      statuts: STATUTS_PATIS,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_boulanger'
    },
    'boulangerie': {
      statuts: STATUTS_PATIS,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_boulanger'
    },
    'traiteur': {
      statuts: [
        { value: 'traiteur_solo', emoji: '🎉', label: 'Traiteur solo', description: "Tu travailles seul(e). WOLO devis événementiel + portfolio." },
        { value: 'patron_equipe', emoji: '🍽️', label: 'Patron équipe traiteur', description: "Tu as ton équipe. WOLO pipeline + paie + extras." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_traiteur'
    },
    'vendeur ambulant nourriture': {
      statuts: [
        { value: 'ambulant_solo', emoji: '🥟', label: "Vendeur(se) ambulant(e) seul(e)", description: "Tu vends ta préparation à la rue. WOLO partage ta position du jour + abo client." }
      ],
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_ambulant'
    },

    // ─── SERVICES À LA PERSONNE ────────────────────────────────
    'agent menage': {
      statuts: STATUTS_SVC_PERSO,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_menage'
    },
    'menage': {
      statuts: STATUTS_SVC_PERSO,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_menage'
    },
    'baby sitter': {
      statuts: [
        { value: 'fixe', emoji: '🏠', label: "Baby-sitter fixe", description: "Tu gardes les enfants d'une même famille. WOLO Safety + référent + contrat type." },
        { value: 'ponctuelle', emoji: '⚡', label: 'Garde ponctuelle / événement', description: "Tu interviens à la demande. WOLO Score + recommandations digitales." }
      ],
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_baby_sitter'
    },
    'aide soignant a domicile': {
      statuts: [
        { value: 'forme_freelance', emoji: '🩺', label: 'Aide-soignant(e) formé(e) freelance', description: "Tu as ton diplôme. WOLO catalogue prestations + RDV." },
        { value: 'employe_structure', emoji: '🏥', label: 'Employé(e) structure médicale', description: "Tu travailles pour une clinique. WOLO profil perso." },
        { value: 'sans_diplome', emoji: '⚠️', label: 'Aide-soignant(e) sans diplôme', description: "Tu accompagnes à domicile sans diplôme. WOLO Safety + obligation transparence client." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_aide_soignant'
    },
    'aide soignant': {
      statuts: [
        { value: 'forme_freelance', emoji: '🩺', label: 'Aide-soignant(e) formé(e) freelance', description: "Tu as ton diplôme. WOLO catalogue prestations + RDV." },
        { value: 'employe_structure', emoji: '🏥', label: 'Employé(e) structure médicale', description: "Tu travailles pour une clinique. WOLO profil perso." },
        { value: 'sans_diplome', emoji: '⚠️', label: 'Aide-soignant(e) sans diplôme', description: "Tu accompagnes à domicile sans diplôme. WOLO Safety + obligation transparence client." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_aide_soignant'
    },
    'lavandiere': {
      statuts: STATUTS_SVC_PERSO,
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_lavandiere'
    },

    // ─── ÉDUCATION & CONSEIL ───────────────────────────────────
    'professeur particulier': {
      statuts: STATUTS_EDUC,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_prof'
    },
    'professeur': {
      statuts: STATUTS_EDUC,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_prof'
    },
    'prof': {
      statuts: STATUTS_EDUC,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_prof'
    },
    'formateur': {
      statuts: [
        { value: 'freelance', emoji: '🎓', label: 'Formateur freelance', description: "Tu formes à ton compte. WOLO portfolio + cours offres." },
        { value: 'patron_centre', emoji: '🏢', label: 'Patron centre formation', description: "Tu diriges ton centre. WOLO équipe + cours offres + paie." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_formateur'
    },
    'coach': {
      statuts: [
        { value: 'freelance', emoji: '⚡', label: 'Coach freelance', description: "Tu coaches à ton compte. WOLO portfolio + cours offres." },
        { value: 'patron_studio', emoji: '🏛️', label: 'Patron studio coaching', description: "Tu diriges ton studio. WOLO équipe." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_coach'
    },
    'traducteur': {
      statuts: STATUTS_EDUC,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_traducteur'
    },
    'comptable': {
      statuts: STATUTS_EDUC,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_comptable'
    },
    'agent immobilier': {
      statuts: STATUTS_EDUC,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_immo'
    },
    'juriste': {
      statuts: STATUTS_EDUC,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_juriste'
    },

    // ─── BIEN-ÊTRE & SANTÉ ─────────────────────────────────────
    'herboriste': {
      statuts: STATUTS_TRADI,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_herboriste'
    },
    'tradipraticien': {
      statuts: STATUTS_TRADI,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_tradi'
    },
    'nutritionniste': {
      statuts: STATUTS_SANTE_FORM,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_nutritionniste'
    },
    'kinesitherapeute': {
      statuts: STATUTS_SANTE_FORM,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_kine'
    },
    'kine': {
      statuts: STATUTS_SANTE_FORM,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_kine'
    },
    'opticien': {
      statuts: STATUTS_SANTE_FORM,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_opticien'
    },

    // ─── TALENTS DIGITAUX ─────────────────────────────────────
    'developpeur': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_dev'
    },
    'community manager': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_cm'
    },
    'redacteur': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_redacteur'
    },
    'data analyst': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_data'
    },
    'monteur video': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_montage'
    },
    'motion designer': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_motion'
    },
    'expert excel': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_excel'
    },
    'chef de projet digital': {
      statuts: STATUTS_DIGITAL,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_cdp'
    },
    'modele': {
      statuts: STATUTS_INFLUENCEUR,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_modele'
    },
    'influenceur': {
      statuts: STATUTS_INFLUENCEUR,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_influenceur'
    },
    'modele influenceur': {
      statuts: STATUTS_INFLUENCEUR,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_influenceur'
    },
    'vendeur terrain': {
      statuts: [
        { value: 'commission', emoji: '🤝', label: 'Vendeur(se) à la commission', description: "Tu vends pour une marque/société. WOLO te donne profil + carnet client." },
        { value: 'independant', emoji: '🛒', label: 'Indépendant(e) (ta propre marchandise)', description: "Tu vends ce que tu achètes toi-même. WOLO te rend visible." }
      ],
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_vendeur'
    },
    'secretaire': {
      statuts: [
        { value: 'employee', emoji: '🧑‍💼', label: 'Employée fixe', description: "Tu travailles pour une boîte. WOLO te garde un profil perso." },
        { value: 'freelance', emoji: '⌨️', label: 'Secrétaire freelance', description: "Tu travailles à la prestation pour plusieurs clients. WOLO carnet + tarifs." }
      ],
      intro: "Pour bien te servir, dis-nous comment tu travailles :",
      sequence_prefix: 'M_xxx_secretaire'
    },
    'architecte': {
      statuts: [
        { value: 'freelance', emoji: '📐', label: 'Architecte freelance', description: "Tu travailles à ton compte. WOLO portfolio + devis chantier." },
        { value: 'employe_cabinet', emoji: '🏢', label: 'Employé(e) cabinet', description: "Tu travailles pour un cabinet existant. WOLO profil perso." },
        { value: 'patron_cabinet', emoji: '👔', label: 'Patron(ne) cabinet', description: "Tu diriges ton cabinet. WOLO pipeline + équipe + facturation." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_architecte'
    },

    // ─── COMMERCES (entités) ──────────────────────────────────
    'pharmacie': {
      statuts: STATUTS_COMMERCE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_pharmacie'
    },
    'supermarche': {
      statuts: STATUTS_COMMERCE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_supermarche'
    },
    'quincaillerie': {
      statuts: STATUTS_COMMERCE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_quincaillerie'
    },
    'institut beaute': {
      statuts: STATUTS_COMMERCE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_institut'
    },
    'hotel': {
      statuts: STATUTS_COMMERCE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_hotel'
    },
    'pressing': {
      statuts: STATUTS_COMMERCE,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_pressing'
    },

    // ─── DIVERS / FALLBACK ────────────────────────────────────
    'jardinier': {
      statuts: [
        { value: 'apprenti', emoji: '🌱', label: 'Apprenti', description: "Tu apprends chez un patron. WOLO te donne tes débuts." },
        { value: 'independant', emoji: '🌿', label: 'Indépendant', description: "Tu travailles seul, à la commande. WOLO te rend visible." },
        { value: 'patron', emoji: '🌳', label: 'Patron équipe', description: "Tu diriges ton équipe. WOLO devis + équipe." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_jardinier'
    },
    'paysagiste': {
      statuts: [
        { value: 'freelance', emoji: '🌿', label: 'Paysagiste freelance', description: "Tu travailles à ton compte. WOLO portfolio + devis chantier." },
        { value: 'patron', emoji: '🌳', label: 'Patron équipe', description: "Tu diriges ton équipe. WOLO devis + équipe." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_paysagiste'
    },
    'bijoutier': {
      statuts: STATUTS_COMMANDE_FACON,
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_bijoutier'
    }
  };

  // ── API ────────────────────────────────────────────────────────

  function getConfig(metier) {
    const norm = normalize(metier);
    if (!norm) return null;
    if (METIER_CONFIG[norm]) return METIER_CONFIG[norm];
    // Match partiel (le métier saisi contient une clé connue)
    for (const k in METIER_CONFIG) {
      if (norm.includes(k) || k.includes(norm)) return METIER_CONFIG[k];
    }
    return null;
  }

  function getStatutsFor(metier) {
    const cfg = getConfig(metier);
    if (cfg) {
      return {
        statuts: cfg.statuts.slice(),
        intro: cfg.intro,
        sequence_prefix: cfg.sequence_prefix
      };
    }
    // Fallback générique : freelance / employé / patron
    return {
      statuts: [
        { value: 'freelance', emoji: '⚡', label: 'Indépendant(e) / Freelance', description: "Tu travailles à ton compte. WOLO te rend visible." },
        { value: 'employe', emoji: '🧑‍💼', label: 'Employé(e)', description: "Tu travailles pour quelqu'un. WOLO te garde un profil perso." },
        { value: 'patron', emoji: '👑', label: 'Patron(ne) / Gérant(e)', description: "Tu diriges ton activité. WOLO équipe + paie." }
      ],
      intro: "Pour bien te servir, dis-nous où tu en es :",
      sequence_prefix: 'M_xxx_generic'
    };
  }

  function getIntroFor(metier) {
    const cfg = getConfig(metier);
    if (cfg && cfg.intro) return cfg.intro;
    return "Pour bien te servir, dis-nous où tu en es :";
  }

  function getSequenceId(metier, statut) {
    const cfg = getStatutsFor(metier);
    if (!cfg || !cfg.sequence_prefix || !statut) return null;
    // Mapping statut → token court (apprenti/apprentie/patron/patronne/independante/etc.)
    // sequence_prefix est de la forme 'M_xxx_<metier>'. On remplace 'xxx' par le statut.
    const safeStatut = String(statut).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return cfg.sequence_prefix.replace('xxx', safeStatut);
  }

  // Donne tous les statuts possibles dans le système (utile debug / admin)
  function getAllStatutValues() {
    const set = new Set();
    Object.values(METIER_CONFIG).forEach(cfg => {
      cfg.statuts.forEach(s => set.add(s.value));
    });
    return Array.from(set).sort();
  }

  // Retourne true si l'apprenti d'un métier doit avoir le bouton Pro masqué/tardif
  function isApprentiStatut(statut) {
    if (!statut) return false;
    const s = String(statut).toLowerCase();
    return s === 'apprenti' || s === 'apprentie' || s.startsWith('apprenti_') || s.startsWith('apprentie_');
  }

  // Retourne true si le statut est un patron (cible Pro Salon 5K)
  function isPatronStatut(statut) {
    if (!statut) return false;
    const s = String(statut).toLowerCase();
    return s === 'patron' || s === 'patronne' || s.startsWith('patron_') || s.startsWith('patronne_') || s === 'patron_flotte' || s === 'patron_studio' || s === 'patron_cabinet' || s === 'patron_agence' || s === 'patron_centre' || s === 'patron_centre_tradi' || s === 'patron_spa' || s === 'patron_boutique' || s === 'patron_equipe';
  }

  window.WoloMetierStatuts = {
    METIER_CONFIG,
    normalizeMetier: normalize,
    getStatutsFor,
    getIntroFor,
    getSequenceId,
    getAllStatutValues,
    isApprentiStatut,
    isPatronStatut
  };
})();
