// ================================================================
// COACH ZALI — séquenceur quotidien (appelé par le cron score-wozali)
// Pour chaque membre qui a ouvert sa conversation Coach :
//   1. Si la dernière leçon a été suivie d'action → message RÉSULTAT
//      avec ses chiffres réels (vues, demandes) : la boucle de preuve.
//   2. Sinon, choisir LA leçon du jour selon ses données (jamais une
//      leçon déjà envoyée), en respectant l'anti-spam.
// Anti-spam : max 1 leçon/jour ; 3 leçons ignorées d'affilée →
// rythme 'reduit' (1 leçon tous les 3 jours) ; une action faite →
// retour au rythme quotidien.
// Charte Zali : langue de la rue, douleur argent, une action par
// leçon, jamais de promesse chiffrée de gains.
// ================================================================

// ── Familles de métiers (Chantier 3) ──
// Résolution par sous-chaîne sur le métier normalisé. Chaque famille
// apporte le mot client(e) + des exemples concrets injectés dans les
// leçons : la couturière ne lit pas la même phrase que le maçon.
function _normMetier(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
const FAMILLES = {
  beaute: {
    match: ['coiff', 'esthet', 'maquill', 'barbier', 'onglerie', 'tress', 'pedicure', 'manucure'],
    cli: 'ta cliente', clis: 'tes clientes', unCli: 'une cliente',
    exPhoto: 'ta dernière coiffure, celle dont tu es fière',
    exStatut: '"Libre cet après-midi pour tresses"',
    rdv: true,
  },
  couture: {
    match: ['coutur', 'styliste', 'tailleur', 'brodeur', 'modeliste'],
    cli: 'ta cliente', clis: 'tes clientes', unCli: 'une cliente',
    exPhoto: 'ton dernier modèle cousu, porté si possible',
    exStatut: '"Je prends les commandes pour la fête"',
    rdv: true,
  },
  resto: {
    match: ['restaurant', 'cuisin', 'patissi', 'traiteur', 'boulang', 'grillade', 'maquis'],
    cli: 'ton client', clis: 'tes clients', unCli: 'un client',
    exPhoto: 'ton plat du jour, pris avant le service',
    exStatut: '"Aujourd\'hui : poulet braisé + atiéké"',
    rdv: false,
  },
  btp: {
    match: ['macon', 'menuis', 'plomb', 'electric', 'carrel', 'peintre', 'soud', 'charpent', 'staff', 'ferronn', 'vitrier'],
    cli: 'ton client', clis: 'tes clients', unCli: 'un client',
    exPhoto: 'ton dernier chantier terminé, avant/après si tu peux',
    exStatut: '"Disponible pour petits travaux cette semaine"',
    rdv: false,
  },
  mecanique: {
    match: ['mecanic', 'vulcanis', 'motoriste', 'garage', 'electricien auto'],
    cli: 'ton client', clis: 'tes clients', unCli: 'un client',
    exPhoto: 'une panne réparée dans ton atelier',
    exStatut: '"Atelier ouvert, dépannage rapide aujourd\'hui"',
    rdv: true,
  },
  commerce: {
    match: ['vendeur', 'vendeuse', 'commerc', 'boutiqu', 'revend', 'marchand'],
    cli: 'ton client', clis: 'tes clients', unCli: 'un client',
    exPhoto: 'tes articles du jour, bien rangés',
    exStatut: '"Nouvel arrivage aujourd\'hui"',
    rdv: false, vitrine: true,
  },
  defaut: {
    match: [],
    cli: 'ton client', clis: 'tes clients', unCli: 'un client',
    exPhoto: 'ta dernière réalisation, celle dont tu es fier',
    exStatut: '"Disponible aujourd\'hui"',
    rdv: false,
  },
};
function _familleKeyFor(metier) {
  const n = _normMetier(metier);
  if (!n) return 'defaut';
  for (const key of Object.keys(FAMILLES)) {
    if (key === 'defaut') continue;
    if (FAMILLES[key].match.some(m => n.includes(m))) return key;
  }
  return 'defaut';
}
function _familleFor(metier) {
  return FAMILLES[_familleKeyFor(metier)];
}

// ── Bibliothèque de leçons (clé stable = jamais renvoyée deux fois) ──
// cond(ctx) → true si la leçon est pertinente pour ce membre aujourd'hui.
// ctx.fam = sa famille de métier (mots et exemples injectés dans le texte).
const LECONS = [
  {
    key: 'photos',
    cond: (c) => !c.p.photo_realisation_1 && !c.p.photo_realisation_2,
    titre: "Ton profil n'a pas encore de photos de ton travail.",
    corpsFn: (c) => `${c.fam.unCli.charAt(0).toUpperCase() + c.fam.unCli.slice(1)} qui ne te connaît pas ne peut pas deviner que tu travailles bien. ${c.fam.cli === 'ta cliente' ? 'Elle' : 'Il'} regarde les photos. Pas de photos, ${c.fam.cli === 'ta cliente' ? 'elle' : 'il'} passe chez quelqu'un d'autre. Ajoute une seule photo : ${c.fam.exPhoto}.`,
    cta: 'Ajouter ma photo maintenant', target: 'photos',
  },
  {
    key: 'tarifs',
    cond: (c) => !c.p.tarif_min_fcfa && !c.p.tarif_max_fcfa,
    titre: 'Celui qui ne voit pas tes prix imagine le pire.',
    corpsFn: (c) => `${c.fam.unCli.charAt(0).toUpperCase() + c.fam.unCli.slice(1)} qui hésite regarde une chose : est-ce que je peux me le permettre. Pas de prix affiché, ${c.fam.cli === 'ta cliente' ? 'elle n\'ose' : 'il n\'ose'} pas demander, et ça part ailleurs. Mets une fourchette simple, ça suffit.`,
    cta: 'Ajouter mes tarifs', target: 'profil',
  },
  {
    key: 'gps',
    cond: (c) => !c.p.latitude,
    titre: 'Les clients cherchent près de chez eux.',
    corps: "Quand quelqu'un cherche ton métier, les profils localisés sortent sur la carte. Sans ta position, tu n'existes pas sur la carte de ton propre quartier. Ça prend 30 secondes.",
    cta: 'Ajouter ma position', target: 'profil',
  },
  {
    key: 'description',
    cond: (c) => !((c.p.description_services || '').trim().length > 10),
    titre: 'Deux phrases qui disent ce que tu fais, ça change tout.',
    corpsFn: (c) => `${c.fam.cli.charAt(0).toUpperCase() + c.fam.cli.slice(1)} lit ta description avant d'appeler. Rien d'écrit, ${c.fam.cli === 'ta cliente' ? 'elle' : 'il'} ne sait pas si tu fais ce qu'${c.fam.cli === 'ta cliente' ? 'elle' : 'il'} cherche, et ne prend pas le risque. Écris simplement : ce que tu fais, pour qui, dans quel coin.`,
    cta: 'Écrire ma description', target: 'profil',
  },
  {
    key: 'statut_jour',
    cond: (c) => !c.p.statut_jour || (c.p.statut_jour_at && (Date.now() - new Date(c.p.statut_jour_at).getTime()) > 3 * 86400000),
    titre: "Quand tu es libre et que personne ne le sait, c'est une journée sans argent.",
    corpsFn: (c) => `Le statut du jour, c'est une phrase sur ton profil qui dit au quartier : je suis là, maintenant. Par exemple : ${c.fam.exStatut}. Celui qui hésitait n'hésite plus, il vient aujourd'hui.`,
    cta: 'Écrire mon statut du jour', target: 'overview',
  },
  {
    key: 'vues_sans_contact',
    cond: (c) => c.vues7j >= 5 && c.rdv7j === 0,
    titreFn: (c) => `${c.vues7j} personnes ont regardé ton profil cette semaine. Aucune n'a pris rendez-vous.`,
    corps: "Ils viennent, ils regardent, ils repartent. En général il manque la chose qui rassure : des photos récentes, des prix clairs, un profil complet. On règle ça maintenant, un client qui regarde doit avoir tout ce qu'il faut pour te choisir.",
    cta: 'Compléter mon profil', target: 'profil',
  },
  {
    key: 'avis',
    cond: (c) => (c.p.nb_avis_recus || 0) === 0 && (c.p.photo_realisation_1 || c.p.photo_realisation_2),
    titre: "Un profil sans avis, c'est une parole sans témoin.",
    corpsFn: (c) => `${c.fam.cli.charAt(0).toUpperCase() + c.fam.cli.slice(1)} croit les autres clients, pas les promesses. Envoie ton profil à 3 personnes pour qui tu as déjà travaillé et demande-leur un avis honnête. Chaque avis, c'est ${c.fam.unCli} de demain qui hésite et qui te choisit toi.`,
    cta: 'Voir ma page avis', target: 'avis',
  },
  {
    key: 'post',
    cond: (c) => !c.aPoste,
    titre: 'Montre ce que tes mains ont fait cette semaine.',
    corpsFn: (c) => `Une publication avec une photo de ton travail, c'est ta vitrine qui parle à tout le quartier. Par exemple : ${c.fam.exPhoto}. Ceux qui te suivent la voient, ceux qui la partagent te font connaître. Une photo, deux phrases, c'est tout.`,
    cta: 'Publier maintenant', target: 'posts',
  },
  // ── Leçons métier-spécifiques (features vivantes uniquement) ──
  {
    key: 'dispo_rdv',
    cond: (c) => !!c.fam.rdv && !!(c.p.photo_realisation_1 || c.p.photo_realisation_2),
    titre: "Pendant que tu travailles, ton agenda peut vendre à ta place.",
    corpsFn: (c) => `Quand ${c.fam.unCli} veut réserver, ${c.fam.cli === 'ta cliente' ? 'elle' : 'il'} ne veut pas attendre ta réponse au téléphone. Ta disponibilité WOZALI montre tes créneaux : on choisit, on réserve, tu reçois la demande. Toi tu bosses, l'agenda encaisse les rendez-vous.`,
    cta: 'Régler ma disponibilité', target: 'dispo',
  },
  {
    key: 'vitrine',
    cond: (c) => !!c.fam.vitrine,
    titre: 'Ceux qui passent devant toi ne sont pas les seuls acheteurs du quartier.',
    corps: "Ta vitrine WOZALI, c'est ton étal visible par tout le monde : ce que tu vends aujourd'hui, ton prix, où te trouver. Celui qui cherche depuis chez lui te voit, et vient. Mets un produit, une photo, un prix.",
    cta: 'Ouvrir ma vitrine', target: 'vente-ambulante',
  },
  {
    key: 'cv_wozali',
    cond: (c) => c.p.mode_emploi === true,
    titre: 'Ton CV WOZALI travaille pendant que tu dors.',
    corps: "Les patrons qui publient des offres regardent les profils disponibles. Un CV complet avec ton expérience et tes preuves de travail, c'est toi qu'on appelle en premier. Complète-le une fois, il parle pour toi tous les jours.",
    cta: 'Compléter mon CV WOZALI', target: 'emploi-cv',
  },
  {
    key: 'carte_qr',
    cond: (c) => !!(c.p.photo_realisation_1 && (c.p.tarif_min_fcfa || c.p.tarif_max_fcfa)),
    titre: 'Le client qui sort de chez toi doit pouvoir te retrouver.',
    corps: "Ta carte de visite WOZALI avec ton code QR : il la scanne, il tombe sur ton profil, tes photos, tes avis. Il la montre à quelqu'un, et ce quelqu'un devient ton client. Imprime-la, pose-la où tes clients passent.",
    cta: 'Voir mes outils à imprimer', target: 'outils',
  },
];

function _hier(now) { return new Date(now.getTime() - 86400000); }

// ── Chantier 6 : gamification légère ──
// Paliers dignité métier (jamais de points imaginaires, jamais de
// classement public). Le palier se calcule depuis les données, la
// célébration part quand il monte.
const PALIERS = [
  null,
  { nom: 'Profil solide',
    msg: "Photos, tarifs, description, position : ton profil est complet. Un client qui tombe dessus a tout ce qu'il faut pour te choisir. Prochaine étape : qu'on te VOIE. Statut du jour, publications, et le quartier saura que tu es là.",
  },
  { nom: 'Visible dans ton quartier',
    msg: "Les gens te regardent maintenant. Ton profil vit, tes visites montent. Prochaine étape : que tes clients parlent pour toi. 3 avis, et tu passes dans la catégorie de ceux qu'on recommande.",
  },
  { nom: 'Recommandé par tes clients',
    msg: "3 avis ou plus. Tes clients te défendent publiquement, et ça, aucun concurrent ne peut le copier. Prochaine étape : la référence de ton métier. Score 80 et un badge de comportement, et tu joues dans la cour de la Bourse.",
  },
  { nom: 'Référence de ton métier',
    msg: "Score au sommet, badge gagné, clients qui témoignent. Dans ton métier, dans ta ville, tu fais partie de ceux qu'on cite. Maintenant ton travail, c'est de le rester : la constance paie chaque mois sur WOZALI.",
  },
];

function _palierFor(c) {
  const p = c.p;
  const p1 = !!((p.photo_realisation_1 || p.photo_realisation_2)
    && (p.tarif_min_fcfa || p.tarif_max_fcfa)
    && (p.description_services || '').trim().length > 10
    && p.latitude);
  if (!p1) return 0;
  const p2 = !!(c.aPoste || p.statut_jour) && c.vues7j >= 5;
  if (!p2) return 1;
  if ((p.nb_avis_recus || 0) < 3) return 2;
  const p4 = (p.score_wozali || 0) >= 80 && (p.badges_auto || []).length > 0;
  return p4 ? 4 : 3;
}

// Badges auto (étape 20) : célébrés une fois quand ils tombent.
const BADGE_CELEBRATIONS = {
  repond_vite: {
    titre: 'Badge gagné : ⚡ Répond vite',
    corps: "Tous les clients qui visitent ton profil voient maintenant que tu réponds vite. Tu sais ce que ça change ? Celui qui hésite entre deux pros choisit celui qui ne le fera pas attendre. Ce badge, tu le gardes tant que tu continues à répondre. Il travaille pour toi.",
  },
  tres_demande: {
    titre: 'Badge gagné : 🔥 Très demandé',
    corps: "Ton profil fait partie des plus regardés de ton métier. Les clients le voient en arrivant : les autres viennent chez toi, donc on peut te faire confiance. La demande appelle la demande. Continue à répondre présent.",
  },
};

// Défis de la semaine (lundi) : objectif simple, mesuré par les
// données, bilan chiffré le lundi suivant.
const DEFIS = {
  defi_photos: {
    cond: (c) => !(c.p.photo_realisation_1 && c.p.photo_realisation_2 && c.p.photo_realisation_3),
    titre: 'Tes 3 photos de travail',
    corps: "D'ici dimanche, complète tes 3 photos de réalisations. Trois preuves valent mieux qu'une promesse : le client qui voit trois travaux réussis ne se demande plus si tu sais faire.",
    cta: 'Ajouter mes photos', target: 'photos',
    reussi: (c) => !!(c.p.photo_realisation_1 && c.p.photo_realisation_2 && c.p.photo_realisation_3),
    bravo: 'Tes 3 photos sont en ligne. Ton profil montre maintenant ce que tes mains savent faire.',
  },
  defi_post: {
    cond: (c) => c.posts7j < 2,
    titre: '2 publications d\'ici dimanche',
    corps: "D'ici dimanche, publie 2 fois : une photo de ton travail, une info, une offre. Chaque publication, c'est ta vitrine qui parle au quartier pendant que tu travailles.",
    cta: 'Publier maintenant', target: 'posts',
    reussi: (c) => c.posts7j >= 2,
    bravoFn: (c) => `${c.posts7j} publication${c.posts7j > 1 ? 's' : ''} cette semaine. Ta vitrine a parlé pour toi.`,
  },
  defi_avis: {
    cond: () => true,
    titre: '1 nouvel avis client',
    corps: "D'ici dimanche, obtiens 1 nouvel avis. Pense à ton dernier client satisfait : envoie-lui ton profil et demande-lui deux phrases honnêtes. C'est lui qui convaincra le prochain.",
    cta: 'Voir ma page avis', target: 'avis',
    reussi: (c) => c.avis7j >= 1,
    bravoFn: (c) => `${c.avis7j} nouvel${c.avis7j > 1 ? 's avis' : ' avis'} cette semaine. Un client qui parle, c'est dix clients qui écoutent.`,
  },
};
function _choisirDefi(c, dejaKeys) {
  for (const k of ['defi_photos', 'defi_post', 'defi_avis']) {
    if (!dejaKeys.has(k) && DEFIS[k].cond(c)) return k;
  }
  return 'defi_avis'; // le défi avis est toujours rejouable
}

// ── Radar du marché (Pro, le lundi) ──
// Compare le membre aux MEILLEURS de sa famille de métier dans sa
// ville (groupe anonyme, jamais une personne nommée). Chaque écart
// vient avec sa cause et UNE action : le Radar EST le défi de la
// semaine du membre Pro.
function _median(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Construit les stats des groupes (famille|ville) à partir de TOUS
// les prestataires. Fallback famille entière si le groupe ville est
// trop petit (< 5 profils).
function _buildRadarGroupes(tousPrests, reponsesParUser, il7jIso) {
  const groupes = {};
  (tousPrests || []).forEach(r => {
    const fam = _familleKeyFor(r.metier_principal);
    const ville = _normMetier(r.ville) || '*';
    for (const key of [fam + '|' + ville, fam + '|*']) {
      (groupes[key] = groupes[key] || []).push(r);
    }
  });
  const stats = {};
  for (const key of Object.keys(groupes)) {
    const rows = groupes[key].filter(r => (r.score_wozali || 0) > 0);
    if (rows.length < 5) continue;
    rows.sort((a, b) => (b.score_wozali || 0) - (a.score_wozali || 0));
    const top = rows.slice(0, Math.max(3, Math.ceil(rows.length * 0.3)));
    const statutPct = top.filter(r => r.statut_jour_at && r.statut_jour_at >= il7jIso).length / top.length;
    const photosPct = top.filter(r => [r.photo_realisation_1, r.photo_realisation_2, r.photo_realisation_3].filter(Boolean).length >= 2).length / top.length;
    const reps = [];
    top.forEach(r => { (reponsesParUser[r.user_id] || []).forEach(h => reps.push(h)); });
    stats[key] = { n: top.length, statutPct, photosPct, reponseMedH: _median(reps) };
  }
  return stats;
}

// Compose le message Radar : lignes elles/toi + l'action corrective.
function _radarMessage(ctx, grp, mesReponsesH, il7jIso) {
  const fem = ctx.fam.cli === 'ta cliente';
  const eux = fem ? 'elles' : 'eux';
  const lignes = [];
  const ecarts = [];

  const monStatut = !!(ctx.p.statut_jour_at && ctx.p.statut_jour_at >= il7jIso);
  if (grp.statutPct >= 0.5) {
    lignes.push(`Statut du jour cette semaine · ${eux} : oui · toi : ${monStatut ? 'oui ✓' : 'NON'}`);
    if (!monStatut) ecarts.push({ k: 'statut', cause: `${fem ? 'Elles disent' : 'Ils disent'} au quartier quand ${fem ? 'elles sont' : 'ils sont'} disponibles. Toi, personne ne le sait.`, cta: 'Écrire mon statut du jour', target: 'overview' });
  }
  const mesPhotos = [ctx.p.photo_realisation_1, ctx.p.photo_realisation_2, ctx.p.photo_realisation_3].filter(Boolean).length;
  if (grp.photosPct >= 0.5) {
    lignes.push(`Photos du travail (2 et plus) · ${eux} : oui · toi : ${mesPhotos >= 2 ? 'oui ✓' : 'NON (' + mesPhotos + ')'}`);
    if (mesPhotos < 2) ecarts.push({ k: 'photos', cause: `Le client compare les photos avant d'appeler. Là, il ne peut pas te comparer, donc il ne t'appelle pas.`, cta: 'Ajouter mes photos', target: 'photos' });
  }
  const maRep = _median(mesReponsesH || []);
  if (grp.reponseMedH != null) {
    const euxH = Math.max(1, Math.round(grp.reponseMedH));
    lignes.push(`Temps de réponse aux demandes · ${eux} : ${euxH} h · toi : ${maRep != null ? Math.round(maRep) + ' h' : 'pas encore mesuré'}`);
    if (maRep != null && maRep > grp.reponseMedH * 2) ecarts.push({ k: 'reponse', cause: `Le client écrit, la réponse tarde, il appelle quelqu'un d'autre. C'est exactement là que ça part.`, cta: 'Voir mes demandes', target: 'rdv' });
  }
  if (!lignes.length) return null;

  const ecart = ecarts[0] || null;
  const corps = `J'ai analysé les ${fem ? 'mieux classées' : 'mieux classés'} de ton métier${grp.ville ? ' dans ta ville' : ''} cette semaine (${grp.n} profils, personne n'est nommé). Voilà ce qu'${eux === 'elles' ? 'elles font' : 'ils font'}, et où tu en es :\n\n`
    + lignes.join('\n')
    + (ecart
      ? `\n\n${ecart.cause}\n\nCette semaine on corrige UNE chose. C'est ton défi.`
      : `\n\nTu tiens le rythme des meilleurs. Cette semaine, on ne change rien : on tient.`);
  return {
    titre: '📡 Ton Radar du marché',
    corps,
    cta_label: ecart ? ecart.cta : null,
    cta_target: ecart ? ecart.target : null,
  };
}

// Message résultat : ses chiffres réels depuis la veille (boucle de preuve)
function _resultatCorps(ctx) {
  const lignes = [];
  lignes.push(ctx.vuesHier === 0
    ? 'Personne hier, mais ce que tu as fait reste sur ton profil et travaille pour toi.'
    : `${ctx.vuesHier} ${ctx.vuesHier > 1 ? 'personnes ont' : 'personne a'} vu ton profil hier.`);
  if (ctx.vues7j > 0) lignes.push(`${ctx.vues7j} sur les 7 derniers jours.`);
  if (ctx.rdv7j > 0) lignes.push(`${ctx.rdv7j} demande${ctx.rdv7j > 1 ? 's' : ''} de rendez-vous cette semaine.`);
  return `Hier tu as fait l'action que je t'avais montrée. Regarde :\n\n` + lignes.join('\n')
    + `\n\nTu vois ? Tu n'as rien payé. Tu as juste agi, et les gens ont regardé. On continue.`;
}

// ── Séquenceur principal ──
// Retourne { resultats, lecons, reduits } (compteurs pour le JSON du cron).
export async function runCoachZali(supabase) {
  const now = new Date();
  const debutJour = new Date(now); debutJour.setUTCHours(0, 0, 0, 0);
  const il7j = new Date(now.getTime() - 7 * 86400000).toISOString();
  const hier = _hier(debutJour).toISOString();

  // Membres ayant ouvert leur conversation Coach
  const { data: profils } = await supabase.from('wozali_coach_profil').select('*');
  if (!profils || !profils.length) return { resultats: 0, lecons: 0, reduits: 0 };
  const userIds = profils.map(p => p.user_id);

  // Données du jour (une requête par table, agrégées en mémoire)
  const [{ data: prests }, { data: vues }, { data: rdvs }, { data: posts }, { data: msgs }, { data: avisRecents }, { data: tousPrests }] = await Promise.all([
    supabase.from('wozali_prestataires')
      .select('user_id, metier_principal, ville, abonnement, mode_emploi, photo_realisation_1, photo_realisation_2, photo_realisation_3, tarif_min_fcfa, tarif_max_fcfa, latitude, description_services, statut_jour, statut_jour_at, nb_avis_recus, score_wozali, badges_auto')
      .in('user_id', userIds),
    supabase.from('wozali_profil_vues').select('profil_id, viewer_id, viewer_prest_id, id, created_at')
      .gte('created_at', il7j),
    supabase.from('wozali_rdv').select('prestataire_user_id, statut, created_at, updated_at').gte('created_at', il7j),
    supabase.from('wozali_posts').select('auteur_id, created_at').in('auteur_id', userIds).eq('actif', true).limit(2000),
    supabase.from('wozali_coach_messages')
      .select('user_id, type, lecon_key, action_faite, created_at')
      .in('user_id', userIds).in('type', ['lecon', 'resultat', 'defi', 'celebration'])
      .gte('created_at', new Date(now.getTime() - 30 * 86400000).toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('avis').select('prestataire_id, created_at').gte('created_at', il7j),
    // Radar du marché : tous les prestataires (groupes anonymes famille|ville)
    supabase.from('wozali_prestataires')
      .select('user_id, metier_principal, ville, score_wozali, statut_jour_at, photo_realisation_1, photo_realisation_2, photo_realisation_3')
      .limit(5000),
  ]);

  const prestByUser = {}; (prests || []).forEach(p => { prestByUser[p.user_id] = p; });
  // Vues par profil prestataire → il faut le mapping prest.id ; on passe par une 2e requête légère
  const { data: prestIds } = await supabase.from('wozali_prestataires').select('id, user_id').in('user_id', userIds);
  const userByPrestId = {}; (prestIds || []).forEach(r => { userByPrestId[r.id] = r.user_id; });

  const vues7jByUser = {}, vuesHierByUser = {};
  (vues || []).forEach(v => {
    const uid = userByPrestId[v.profil_id];
    if (!uid) return;
    const key = v.viewer_prest_id || v.viewer_id || ('anon-' + v.id);
    (vues7jByUser[uid] = vues7jByUser[uid] || new Set()).add(key);
    if (v.created_at >= hier && v.created_at < debutJour.toISOString()) {
      (vuesHierByUser[uid] = vuesHierByUser[uid] || new Set()).add(key);
    }
  });
  const rdv7jByUser = {}, reponsesParUser = {};
  (rdvs || []).forEach(r => {
    if (!r.prestataire_user_id) return;
    rdv7jByUser[r.prestataire_user_id] = (rdv7jByUser[r.prestataire_user_id] || 0) + 1;
    // Temps de réponse (heures) : statut sorti de "Demandé"
    if (r.statut && r.statut !== 'Demandé' && r.updated_at && r.updated_at !== r.created_at) {
      const h = (new Date(r.updated_at) - new Date(r.created_at)) / 3600000;
      if (h >= 0) (reponsesParUser[r.prestataire_user_id] = reponsesParUser[r.prestataire_user_id] || []).push(h);
    }
  });
  // Stats de groupes pour le Radar du marché (Pro, lundi)
  const radarStats = _buildRadarGroupes(tousPrests, reponsesParUser, il7j);
  const posteByUser = {}, posts7jByUser = {};
  (posts || []).forEach(p => {
    posteByUser[p.auteur_id] = true;
    if (p.created_at >= il7j) posts7jByUser[p.auteur_id] = (posts7jByUser[p.auteur_id] || 0) + 1;
  });
  const avis7jByUser = {};
  (avisRecents || []).forEach(a => {
    const uid = userByPrestId[a.prestataire_id];
    if (uid) avis7jByUser[uid] = (avis7jByUser[uid] || 0) + 1;
  });

  const histByUser = {};
  (msgs || []).forEach(m => { (histByUser[m.user_id] = histByUser[m.user_id] || []).push(m); });

  let nResultats = 0, nLecons = 0, nReduits = 0, nPaliers = 0, nBadges = 0, nDefis = 0, nRadars = 0;
  const estLundi = now.getUTCDay() === 1;

  for (const profil of profils) {
    const uid = profil.user_id;
    const p = prestByUser[uid];
    if (!p) continue;
    const hist = histByUser[uid] || [];
    const lecons = hist.filter(m => m.type === 'lecon');
    const derniere = lecons[lecons.length - 1] || null;
    const dernierMsg = hist[hist.length - 1] || null;
    const dejaEnvoyees = new Set(hist.map(m => m.lecon_key).filter(Boolean));
    const ctx = {
      p,
      fam: _familleFor(p.metier_principal),
      vues7j: (vues7jByUser[uid] || new Set()).size,
      vuesHier: (vuesHierByUser[uid] || new Set()).size,
      rdv7j: rdv7jByUser[uid] || 0,
      aPoste: !!posteByUser[uid],
      posts7j: posts7jByUser[uid] || 0,
      avis7j: avis7jByUser[uid] || 0,
    };

    // Déjà un message aujourd'hui ? On ne double jamais.
    if (dernierMsg && dernierMsg.created_at >= debutJour.toISOString()) continue;

    // 1. RÉSULTAT : la dernière leçon date d'hier et l'action a été faite,
    //    et aucun résultat n'a suivi.
    if (derniere && derniere.action_faite
        && derniere.created_at >= hier
        && !hist.some(m => m.type === 'resultat' && m.created_at > derniere.created_at)) {
      await supabase.from('wozali_coach_messages').insert({
        user_id: uid, type: 'resultat', titre: 'Regarde ce que ça a donné', corps: _resultatCorps(ctx),
      });
      await supabase.from('wozali_coach_profil').update({
        lecons_ignorees: 0, rythme: 'quotidien', updated_at: now.toISOString(),
      }).eq('user_id', uid);
      nResultats++;
      continue; // le résultat EST le message du jour
    }

    // 2. PALIER : la progression dignité métier vient de monter → célébration
    const palierCalcule = _palierFor(ctx);
    if (palierCalcule > (profil.palier || 0)) {
      const pal = PALIERS[palierCalcule];
      await supabase.from('wozali_coach_messages').insert({
        user_id: uid, type: 'celebration', lecon_key: 'palier_' + palierCalcule,
        titre: 'Palier atteint : ' + pal.nom, corps: pal.msg,
      });
      await supabase.from('wozali_coach_profil').update({
        palier: palierCalcule, lecons_ignorees: 0, rythme: 'quotidien', updated_at: now.toISOString(),
      }).eq('user_id', uid);
      nPaliers++;
      continue; // la célébration EST le message du jour
    }

    // 3. BADGE : un badge auto vient de tomber → célébration unique
    const badgeNouveau = (p.badges_auto || []).find(b => BADGE_CELEBRATIONS[b] && !dejaEnvoyees.has('badge_' + b));
    if (badgeNouveau) {
      const bc = BADGE_CELEBRATIONS[badgeNouveau];
      await supabase.from('wozali_coach_messages').insert({
        user_id: uid, type: 'celebration', lecon_key: 'badge_' + badgeNouveau,
        titre: bc.titre, corps: bc.corps,
      });
      nBadges++;
      continue;
    }

    // 4. RADAR DU MARCHÉ (lundi, Pro) : pour le membre Pro, le Radar
    //    remplace le défi — son écart corrigé EST le défi de la semaine.
    if (estLundi && String(p.abonnement || '').trim().toLowerCase() === 'pro') {
      const famKey = _familleKeyFor(p.metier_principal);
      const villeKey = _normMetier(p.ville) || '*';
      const grp = radarStats[famKey + '|' + villeKey]
        ? { ...radarStats[famKey + '|' + villeKey], ville: true }
        : (radarStats[famKey + '|*'] ? { ...radarStats[famKey + '|*'], ville: false } : null);
      if (grp) {
        const radar = _radarMessage(ctx, grp, reponsesParUser[uid] || [], il7j);
        if (radar) {
          await supabase.from('wozali_coach_messages').insert({
            user_id: uid, type: 'radar', lecon_key: 'radar',
            titre: radar.titre, corps: radar.corps,
            cta_label: radar.cta_label, cta_target: radar.cta_target,
          });
          nRadars++;
          continue;
        }
      }
      // Pas assez de profils dans sa niche : il reçoit le défi classique.
    }

    // 5. DÉFI DE LA SEMAINE (lundi) : bilan chiffré du précédent + nouveau défi
    if (estLundi) {
      const defisPassés = hist.filter(m => m.type === 'defi');
      const dernierDefi = defisPassés[defisPassés.length - 1] || null;
      let bilan = '';
      if (dernierDefi && DEFIS[dernierDefi.lecon_key]
          && (now - new Date(dernierDefi.created_at)) <= 8 * 86400000) {
        const D = DEFIS[dernierDefi.lecon_key];
        bilan = D.reussi(ctx)
          ? `Défi de la semaine dernière : réussi. ${D.bravoFn ? D.bravoFn(ctx) : D.bravo}\n\n`
          : `Le défi de la semaine dernière n'est pas passé, et ce n'est pas grave : ce qui compte, c'est de rester dans le jeu.\n\n`;
      }
      const defiKey = _choisirDefi(ctx, new Set(defisPassés.map(m => m.lecon_key)));
      const D = DEFIS[defiKey];
      await supabase.from('wozali_coach_messages').insert({
        user_id: uid, type: 'defi', lecon_key: defiKey,
        titre: D.titre, corps: bilan + D.corps,
        cta_label: D.cta, cta_target: D.target,
      });
      nDefis++;
      continue;
    }

    // 6. Anti-spam : rythme réduit = 1 leçon tous les 3 jours
    let ignorees = profil.lecons_ignorees || 0;
    let rythme = profil.rythme || 'quotidien';
    if (derniere && !derniere.action_faite) {
      ignorees = ignorees + 1;
      if (ignorees >= 3) rythme = 'reduit';
    } else if (derniere && derniere.action_faite) {
      ignorees = 0; rythme = 'quotidien';
    }
    if (rythme === 'reduit' && derniere
        && (now - new Date(derniere.created_at)) < 3 * 86400000) {
      nReduits++;
      await supabase.from('wozali_coach_profil').update({
        lecons_ignorees: ignorees, rythme, updated_at: now.toISOString(),
      }).eq('user_id', uid);
      continue;
    }

    // 7. LEÇON DU JOUR : la première pertinente jamais envoyée
    const lecon = LECONS.find(L => !dejaEnvoyees.has(L.key) && L.cond(ctx));
    if (lecon) {
      await supabase.from('wozali_coach_messages').insert({
        user_id: uid, type: 'lecon', lecon_key: lecon.key,
        titre: lecon.titreFn ? lecon.titreFn(ctx) : lecon.titre,
        corps: lecon.corpsFn ? lecon.corpsFn(ctx) : lecon.corps,
        cta_label: lecon.cta, cta_target: lecon.target,
      });
      nLecons++;
    }
    await supabase.from('wozali_coach_profil').update({
      lecons_ignorees: ignorees, rythme,
      ...(lecon ? { derniere_lecon_at: now.toISOString() } : {}),
      updated_at: now.toISOString(),
    }).eq('user_id', uid);
  }

  return { resultats: nResultats, lecons: nLecons, reduits: nReduits, paliers: nPaliers, badges: nBadges, defis: nDefis, radars: nRadars };
}
