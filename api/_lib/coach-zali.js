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
function _familleFor(metier) {
  const n = _normMetier(metier);
  if (!n) return FAMILLES.defaut;
  for (const key of Object.keys(FAMILLES)) {
    if (key === 'defaut') continue;
    if (FAMILLES[key].match.some(m => n.includes(m))) return FAMILLES[key];
  }
  return FAMILLES.defaut;
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
  const [{ data: prests }, { data: vues }, { data: rdvs }, { data: posts }, { data: msgs }] = await Promise.all([
    supabase.from('wozali_prestataires')
      .select('user_id, metier_principal, mode_emploi, photo_realisation_1, photo_realisation_2, tarif_min_fcfa, tarif_max_fcfa, latitude, description_services, statut_jour, statut_jour_at, nb_avis_recus')
      .in('user_id', userIds),
    supabase.from('wozali_profil_vues').select('profil_id, viewer_id, viewer_prest_id, id, created_at')
      .gte('created_at', il7j),
    supabase.from('wozali_rdv').select('prestataire_user_id, created_at').gte('created_at', il7j),
    supabase.from('wozali_posts').select('auteur_id').in('auteur_id', userIds).eq('actif', true).limit(2000),
    supabase.from('wozali_coach_messages')
      .select('user_id, type, lecon_key, action_faite, created_at')
      .in('user_id', userIds).in('type', ['lecon', 'resultat'])
      .gte('created_at', new Date(now.getTime() - 30 * 86400000).toISOString())
      .order('created_at', { ascending: true }),
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
  const rdv7jByUser = {};
  (rdvs || []).forEach(r => { if (r.prestataire_user_id) rdv7jByUser[r.prestataire_user_id] = (rdv7jByUser[r.prestataire_user_id] || 0) + 1; });
  const posteByUser = {}; (posts || []).forEach(p => { posteByUser[p.auteur_id] = true; });

  const histByUser = {};
  (msgs || []).forEach(m => { (histByUser[m.user_id] = histByUser[m.user_id] || []).push(m); });

  let nResultats = 0, nLecons = 0, nReduits = 0;

  for (const profil of profils) {
    const uid = profil.user_id;
    const p = prestByUser[uid];
    if (!p) continue;
    const hist = histByUser[uid] || [];
    const lecons = hist.filter(m => m.type === 'lecon');
    const derniere = lecons[lecons.length - 1] || null;
    const dejaEnvoyees = new Set(lecons.map(m => m.lecon_key).filter(Boolean));
    const ctx = {
      p,
      fam: _familleFor(p.metier_principal),
      vues7j: (vues7jByUser[uid] || new Set()).size,
      vuesHier: (vuesHierByUser[uid] || new Set()).size,
      rdv7j: rdv7jByUser[uid] || 0,
      aPoste: !!posteByUser[uid],
    };

    // Déjà une leçon aujourd'hui ? On ne double jamais.
    if (derniere && derniere.created_at >= debutJour.toISOString()) continue;

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

    // 2. Anti-spam : rythme réduit = 1 leçon tous les 3 jours
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

    // 3. LEÇON DU JOUR : la première pertinente jamais envoyée
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

  return { resultats: nResultats, lecons: nLecons, reduits: nReduits };
}
