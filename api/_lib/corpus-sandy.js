// ================================================================
// CORPUS SANDY — le cerveau marché de Coach Sandy
// Briques de connaissance sur le marché informel Togo/Bénin,
// injectées dans le prompt du chat selon le thème de la question.
// Contenu produit par recherche approfondie sourcée (2026-07),
// à rafraîchir chaque trimestre : un marché bouge, une experte
// périmée devient une menteuse.
//
// Chaque brique : { mots: [déclencheurs], texte: connaissance }.
// La détection est volontairement simple (sous-chaînes normalisées) :
// robuste, gratuite, zéro dépendance. Les 2 briques les plus
// pertinentes sont injectées, plafond ~2500 caractères au total.
// ================================================================

function _norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Les textes sont remplis par la recherche approfondie (voir docs/corpus-sandy).
// Structure posée d'avance pour brancher l'injection dès maintenant.
export const BRIQUES = {
  economie_informelle: {
    mots: ['informel', 'economie', 'smig', 'salaire', 'revenu moyen', 'declar', 'impot', 'taxe', 'patente', 'marche assigame', 'dantokpa', 'nana benz'],
    texte: 'Togo (ERI-ESI 2017, AFRISTAT) : l\'informel fournit 91,6% de tous les emplois (98% du privé). Rémunération horaire moyenne des salariés : 820 FCFA. Chômage officiel bas (3,9% BIT) mais sous-emploi massif : 22,8% des actifs, jeunes femmes les plus touchées. Les métiers manuels qualifiés gagnent en moyenne ~55 000 FCFA/mois. SMIG Togo : 52 500 FCFA depuis janvier 2023 (35 000 avant, gelé depuis 2012) ; son application dans l\'informel reste théorique. Bénin (ERI-ESI 2018, INStaD) : 92,6% d\'emploi informel hors agriculture (97% chez les femmes). Revenu moyen d\'activité : 65 468 FCFA national, 77 904 FCFA à Cotonou. 84,1% d\'emplois vulnérables (91% chez les femmes), 40% des actifs dépassent 48h/semaine. L\'artisanat togolais pèse 18% du PIB : ~1 million d\'actifs, 60 000 apprentis, 160 métiers en 8 branches. Seuls ~51% des ménages togolais ont l\'électricité : les coupures font partie du quotidien des ateliers. Histoire qui parle : les Nana Benz du Grand-Marché de Lomé (fortunes bâties sur le pagne wax, déclin années 90 face aux copies asiatiques), l\'incendie d\'Assigamé en 2013.',
  },
  apprentissage: {
    mots: ['apprenti', 'apprentie', 'patronne', 'formation', 'liberation', 'diplome', 'sortie d\'apprentissage', 'atelier de couture'],
    texte: 'Bénin : durée moyenne d\'apprentissage artisanal 3 ans, mais en pratique à la discrétion du patron selon les besoins de l\'atelier. Togo (enquête Danyi 2016) : frais de couture 60 000 à 90 000 FCFA, plus 5 000 de droit d\'entrée et 7 000 de signature de contrat. Dérives documentées : apprenties détournées vers les champs, les corvées d\'eau et le ménage (parfois 3 jours d\'atelier par semaine seulement), menace de ne pas être présentée à l\'examen utilisée comme moyen de pression, patrons absents des jours entiers. La "libération" traditionnelle coûtait cher (dot, cérémonies, rituel du dernier palmatoire) ; au Bénin, les examens EFAT ont supprimé ces pratiques. Le CQM (diplôme d\'État de fin d\'apprentissage, 12 500 FCFA) qualifie officiellement à ouvrir son propre atelier. Le CQP dual est financé à 90% par le FODEFCA (38 611 apprentis formés). Au Togo, ~20 000 diplômés d\'apprentissage sortent chaque année, et l\'auto-apprentissage par la pratique reste le mode dominant (54% des unités informelles).',
  },
  prix_et_marchandage: {
    mots: ['prix', 'tarif', 'negoci', 'marchand', 'cher', 'facture', 'devis', 'combien', 'payer', 'credit', 'rembours', 'dette', 'avance'],
    texte: 'Le marchandage est la norme partout, jusqu\'aux loyers commerciaux : le premier prix n\'est jamais le prix final. Les zémidjans pratiquent la double tarification (étrangers 2 à 4 fois le tarif local, nuit 1,5 à 2 fois le jour). Conséquence business : un prix AFFICHÉ cadre la négociation avant qu\'elle commence ; le client qui arrive en connaissant la fourchette négocie moins. Le paiement à la livraison reste un levier de confiance majeur : le client veut voir avant de payer. Le crédit client est répandu et pèse sur la trésorerie des petits commerçants : beaucoup vendent à des habitués qui paient "après". Conseil terrain : les avis clients et photos de réalisations donnent du poids pour défendre son prix sans baisser.',
  },
  argent_et_tontines: {
    mots: ['tontine', 'epargne', 'mobile money', 'flooz', 'momo', 'mixx', 'moov', 'celtiis', 'banque', 'pret', 'microfinance', 'economiser'],
    texte: 'La tontine rotative, appelée Adogbè au Togo/Bénin, est le vrai moteur d\'épargne : cotisations régulières, cagnotte remise à tour de rôle, zéro paperasse, confiance sociale plus forte que les contrats. Inclusion financière ~87-90% (BCEAO 2023) portée par le mobile money, pas par les banques. Bénin mi-2025 : MTN MoMo domine la valeur des transactions (87%), Celtiis Cash monte vite (21% des comptes), Moov Money 24% des comptes ; ~448 700 agents actifs ; paiements marchands +56% au 1er semestre 2025 (518 milliards FCFA). Le nano-crédit mobile explose (ex : 10 000 FCFA reçus par téléphone, remboursés en 3 jours ; MTN a une offre dédiée aux femmes commerçantes). Microfinance : taux plafonné à 24% dès juin 2026 (BCEAO), souvent ~20-27% avant ; frais des agrégateurs de paiement 2 à 3,5% par transaction. Vigilance : fraudes et usurpations d\'identité liées au mobile money signalées (APDP Bénin 2025).',
  },
  saisons_commerciales: {
    mots: ['saison', 'fete', 'noel', 'fin d\'annee', 'rentree', 'tabaski', 'funeraille', 'mariage', 'periode creuse', 'morte saison', 'pas de clients en ce moment'],
    texte: 'Les pics de l\'année : fêtes de fin d\'année (couture, coiffure, restauration explosent), rentrée scolaire (dépenses des familles, uniformes), Tabaski, mariages et funérailles (gros événements sociaux = grosses commandes couture/traiteur/déco). Après les fêtes : période creuse où "ça ne bouge pas", trésorerie tendue. Conseil terrain : préparer les commandes des fêtes des semaines à l\'avance et lisser la période creuse (relances des anciens clients, promotions ciblées, épargne tontine pendant les pics). À Cotonou, les embouteillages des heures de pointe (7h-9h, 17h-20h) peuvent quadrupler un trajet : la ponctualité se planifie.',
  },
  clients_et_confiance: {
    mots: ['client', 'bouche a oreille', 'recommand', 'confiance', 'fidel', 'reviennent pas', 'concurren', 'reputation', 'avis'],
    texte: 'Le bouche-à-oreille est le premier canal d\'acquisition du marché. Parcours d\'achat type : découverte sur TikTok/Instagram/Facebook, discussion sur WhatsApp, commande. Un profil ou site en ligne est perçu comme un signal de sérieux par rapport à un simple compte réseaux sociaux. Le paiement à la livraison rassure. La livraison à Cotonou passe par les zems et coursiers, avec repérage par points de référence (carrefour, pharmacie, église), pas par adresses postales. La recommandation d\'un client satisfait vaut plus que toute publicité : demander l\'avis systématiquement après une prestation réussie est le geste business le plus rentable du marché.',
  },
  charges_et_local: {
    mots: ['loyer', 'boutique', 'local', 'atelier', 'electricite', 'coupure', 'ceet', 'sbee', 'materiel', 'machine', 'equipement', 'transport', 'data', 'internet'],
    texte: 'Loyers boutiques réels (annonces 2025-2026) : Lomé, Djidjolé en bord de goudron : 100 000 FCFA/mois (23 m²), 150 000 (29 m²), 200 000 (50 m²). Conditions d\'entrée lourdes : caution 3 mois + 6 mois d\'avance + commission d\'un mois, frais de visite 5 000. Cotonou : quartier populaire (Agla) dès 60 000 FCFA/mois, carrefour Étoile Rouge 200 000, Haie Vive ~550 000 ; périphérie (Abomey-Calavi) nettement moins chère. Les loyers se négocient. "Au bord du goudron" (rue bitumée passante) = argument de valeur numéro un : le passage se paie. Électricité : ~51% des ménages togolais seulement, coupures fréquentes = pertes réelles pour ateliers et frigos. Transport Cotonou : zem 200-300 FCFA la course courte, 700-1 200 la longue ; Gozem moto 300-800 FCFA. Alternative au loyer : la visibilité en ligne gratuite remplace une partie du passage payant.',
  },
  numerique_et_reseaux: {
    mots: ['whatsapp', 'tiktok', 'facebook', 'reseau', 'en ligne', 'internet', 'jiji', 'coinafrique', 'afribaba', 'publier', 'statut whatsapp'],
    texte: 'Le smartphone est le seul écran du marché : 85% des achats en ligne au Bénin se font sur mobile, ~70% des paiements e-commerce passent par le mobile money. WhatsApp est LE canal de vente (découverte sur TikTok/Facebook, conclusion sur WhatsApp). Les artisans togolais vendent de plus en plus via TikTok/WhatsApp/Facebook pour éviter le coût des pubs. Créer sa propre boutique en ligne coûte 250 000 à 2 000 000 FCFA : hors de portée, d\'où la valeur d\'un profil professionnel gratuit. Le e-commerce local déçoit : 18+ plateformes fragmentées au Bénin, seule CoinAfrique émerge ; annonces sans confiance ni suivi. Risque réel : en juin 2025 le Togo a restreint Facebook, TikTok et WhatsApp pendant des manifestations, mettant à l\'arrêt les commerçantes qui vendent par ces canaux (le Togo avait déjà été condamné par la CEDEAO en 2020 pour une coupure similaire). Une présence qui ne dépend pas que des réseaux sociaux protège le business.',
  },
  plateforme_wozali: {
    mots: ['wozali', 'score', 'abonnement', 'plan pro', 'passer pro', 'bourse', 'parrainage', 'filleul', 'mon profil', 'mon compte', 'statut du jour', 'carte de visite', 'badge', 'vues', 'qui a vu', 'candidature', 'offre d\'emploi', 'cv', 'vitrine', 'comment faire', 'comment ca marche', 'ou je trouve', 'publier'],
    texte: 'WOZALI, ce que Sandy doit savoir répondre : le Score WOZALI (sur 100) décide du rang dans les recherches ; il monte avec le profil complet (photos, description, tarifs, position), les avis clients, la note et la présence régulière, et baisse après 14 jours sans connexion. Les badges automatiques "Répond vite" et "Très demandé" tombent tout seuls selon le comportement et ajoutent des points. Le Plan Pro (2 500 FCFA/mois, section Mon abonnement) donne : passage devant tout le monde dans les recherches, la liste de QUI a regardé ton profil (section Qui a vu ton profil), le parrainage actif (1 000 FCFA par filleul Pro par mois, récurrent, section Parrainage avec code + simulateur), et la conversation libre avec Sandy. La Bourse de Croissance : par pays (Togo/Bénin), débloquée à 5 000 membres Pro dans ce pays, les 10 meilleurs profils du mois de ce pays gagnent chacun un salaire, le SMIG du pays (Pro, profil complet, Score 80+, 3 avis/30j), résultats le dernier vendredi du mois, page Récompenses. Les outils gratuits : statut du jour (une phrase sur le profil, expire 24h, depuis la Vue d\'ensemble), photos de réalisations (section Mes photos), publications et stories, avis et bio en vocal, agenda de rendez-vous (Mon Agenda + Disponibilité), carte de visite QR et affiches à imprimer (Mes outils à imprimer), vitrine ambulante pour les vendeurs (Ma vitrine), CV WOZALI et candidatures (WOZALI Jobs). Tout se trouve dans Mon espace (le tableau de bord).',
  },
  strategies_business: {
    mots: ['strategie', 'grandir', 'developper', 'agrandir', 'offre', 'vendre plus', 'marketing', 'fideliser', 'rentab', 'benefice', 'investir', 'embaucher', 'agrandir', 'boutique en plus', 'deuxieme', 'concurrent', 'se demarquer', 'reussir'],
    texte: 'Stratégies éprouvées, adaptées au marché TG/BJ. 1) L\'offre irrésistible (Hormozi) : on n\'augmente pas ses prix en travaillant plus, on augmente la VALEUR perçue : garantie simple ("pas contente, je refais gratuitement"), petit bonus qui coûte peu (retouche offerte, livraison), délai clair. Le client paie la certitude, pas seulement le service. 2) La densité avant l\'expansion : dominer SON quartier et SON métier avant d\'ouvrir ailleurs ; 50 clientes fidèles à Bè valent mieux que 200 dispersées. 3) Faire revenir coûte 5 fois moins cher que conquérir : relancer ses anciens clients (message simple, nouveauté, promo ciblée) est l\'action la plus rentable qui existe. 4) Parler à la douleur, pas au produit (Suby) : le client n\'achète pas "couture", il achète "être la mieux habillée au mariage". 5) Le client est le héros (StoryBrand) : ton discours parle de LUI, pas de toi. 6) Systématiser le bouche-à-oreille : demander l\'avis et la recommandation après CHAQUE prestation réussie, sans honte. 7) Réinvestir patiemment (leçon des grands entrepreneurs africains, de Dangote aux Nana Benz) : les fortunes d\'ici se sont bâties en remettant les bénéfices dans l\'outil de travail, pas dans le paraître. 8) Les tontines comme levier d\'investissement : la cagnotte Adogbè peut financer la machine ou le stock, au moment des pics de saison.',
  },
  support_technique: {
    mots: ['probleme', 'bug', 'marche pas', 'fonctionne pas', 'erreur', 'bloque', 'connexion', 'connecter', 'mot de passe', 'photo ne s\'affiche', 'charge pas', 'lent', 'paiement', 'paye', 'rembourse', 'notification', 'supprimer mon compte'],
    texte: 'Dépannage WOZALI, premiers réflexes à donner : page qui ne charge pas ou photos absentes = souvent la connexion ou le mode économie de données (activable/désactivable dans le menu Mon espace) ; recharger la page règle beaucoup de cas. Photos qui ne s\'affichent pas juste après l\'ajout : patienter quelques secondes et recharger. Notifications : les activer via la carte dans Activité (et sur iPhone, installer d\'abord le site sur l\'écran d\'accueil). Paiement Pro : code de référence généré dans Mon abonnement, envoi mobile money, activation ensuite. Mot de passe oublié : lien sur l\'écran de connexion. RÈGLE D\'ESCALADE (absolue) : si le problème persiste, touche à l\'argent (paiement envoyé non activé, remboursement), au compte (suppression, piratage), ou à un litige entre personnes, Sandy n\'improvise JAMAIS : elle envoie vers le bouton "Besoin d\'aide ?" (dans le menu Mon espace), le support humain WOZALI répond directement.',
  },
  metiers: {
    mots: ['coiff', 'coutur', 'mecanic', 'macon', 'menuis', 'plomb', 'electricien', 'restaurant', 'cuisine', 'vendeuse', 'zemidjan', 'zem', 'taxi', 'soudeur'],
    texte: 'Douleurs par métier (terrain) : couture/coiffure : dépendance aux fêtes et cérémonies, clientes qui négocient ou paient après, apprenties exploitées, matériel cher. Mécanique : pièces détachées importées au prix volatil, clients qui laissent le véhicule sans payer. BTP : chantiers payés en tranches avec retards, devis cassés par les non-déclarés. Restauration/vente de nourriture : matières premières qui flambent, invendus, dépendance au passage. Commerce de marché : concurrence dense, place au marché chère, stock sur crédit fournisseur. Zémidjans : tarifs tirés vers le bas, essence, concurrence des applis (Gozem). Douleur commune que peu formulent : la dépendance au passage physique ("si je ne suis pas là, je ne vends pas") alors que la clientèle peut venir à eux par la recommandation et la présence en ligne.',
  },
  outils_faistoivoir: {
    mots: ['fais-toi voir', 'fais toi voir', 'accroche', 'ma phrase', 'anneau', 'photo de profil', 'epingl', 'epingler', 'poster', 'poste', 'tiktok', 'instagram', 'insta', 'facebook', 'banniere', 'couverture', 'partager', 'partage', 'story', 'vitrine', 'preuve', 'me faire connaitre', 'me faire voir', 'plus de clients', 'attirer', 'trouver des clients', 'personne me trouve', 'comprennent pas ce que je fais', 'se faire voir', 'qr'],
    texte: 'Outils GRATUITS "Fais-toi voir" (dashboard, section Fais-toi voir) : ils transforment les comptes sociaux du membre en portes d\'entree vers son profil WOZALI. Un seul outil propose a la fois, jamais la liste complete, toujours lie a un declencheur reel. (1) L\'accroche : Sandy reformule son metier cote client ("Je couds ta tenue de ceremonie en 5 jours, essayage inclus" plutot que "je fais la couture") ; passe toujours en premier, sert au profil, aux posts et a la banniere. (2) La photo a l\'anneau or : telecharger sa photo entouree d\'un anneau or, a mettre en photo de profil TikTok/Insta/Facebook ; vendue "look pro", victoire rapide 2 minutes apres une bonne photo. (3) Les 3 posts a epingler : Vitrine (photo + nom + ce qu\'il fait), Preuve (Score + un avis qu\'il choisit, des 3 avis), Contact (3 etapes + QR vers son profil) ; a telecharger, poster et EPINGLER en haut du compte, le compte devient une boutique ouverte 24h/24. (4) La banniere Facebook : couverture avec metier + quartier + lien, outil numero un pour qui est surtout sur Facebook. (5) Le partage : a chaque nouvel avis, celebrer puis proposer de le partager en story WhatsApp (un avis partage = un client qui parle a sa place) ; si le bouton n\'est pas encore actif, dire "ca arrive bientot" sans date. Objections frequentes, toujours valider sans culpabiliser puis un angle neuf : "j\'ai pas le temps" (tout est pret, tu crees rien, 5 min un soir), "ca sert a rien" (combien de clients t\'ont trouve seuls cette semaine ?), "j\'ai honte de me montrer" (on montre ton TRAVAIL, pas toi qui danses), "c\'est quoi WOZALI pour mes clients" (ils viennent pour TOI, WOZALI est juste la porte), "je sais pas epingler" (on le fait ensemble bouton par bouton), "pas encore d\'avis" (la Vitrine et le Contact marchent sans avis). Si l\'objection revient deux fois, lacher et attendre un declencheur naturel.',
  },
  langage_terrain: {
    mots: [], // brique transversale : jamais injectée seule, sert au ton
    texte: 'Parler comme le marché : "zem/zémidjan" (moto-taxi), "Adogbè" (tontine), "la libération" (fin d\'apprentissage), "au bord du goudron" (bien placé, sur rue bitumée), "momo/Flooz/Mixx" (mobile money), "ça ne bouge pas" (pas de clients en ce moment), "bonne cliente" (fidèle), "je te fais un prix" (ouverture de négociation). On se repère par points de référence (carrefour, pharmacie, station), jamais par adresse. Les unités de mesure réelles de l\'argent : le repas du soir, l\'écolage des enfants, le loyer, la cotisation de tontine. Jamais de métaphore de compte bancaire : l\'argent est cash ou momo. Le respect passe par les salutations complètes avant de parler affaires.',
  },
};

// Retourne les briques pertinentes pour une question, plafonnées.
export function briquesPour(question, maxChars = 2500) {
  const q = _norm(question);
  const scores = [];
  for (const [key, b] of Object.entries(BRIQUES)) {
    if (!b.texte) continue;
    const hits = b.mots.filter(m => q.includes(_norm(m))).length;
    if (hits > 0) scores.push({ key, hits, texte: b.texte });
  }
  scores.sort((a, b) => b.hits - a.hits);
  const out = [];
  let total = 0;
  for (const s of scores.slice(0, 2)) {
    if (total + s.texte.length > maxChars) break;
    out.push(`[Connaissance marché · ${s.key}]\n${s.texte}`);
    total += s.texte.length;
  }
  return out.join('\n\n');
}
