// ================================================================
// SÉQUENCE FONDATEUR J1-J5 — générée jour par jour par le cron
// (appelée par api/cron/score-wozali.js, comme le Coach Zali)
//
// Avant : les 6 messages étaient pré-écrits d'un bloc à l'inscription
// dans le JSON Notifications (dates futures). Ils ne s'adaptaient à
// rien. Désormais l'inscription n'écrit que le J0 ; le cron écrit le
// message du jour, en regardant ce que le membre a déjà fait.
//
// Rôles : Schealtiel = le POURQUOI (mission, piliers). Coach Zali =
// le COMMENT quotidien. Le J5 fait la passation explicite.
// Chaque message porte UN bouton d'action (action_label +
// action_section) rendu dans la Boîte WOZALI et le fil Activité.
// ================================================================

function _msg(id, title, body, actionLabel, actionSection) {
  return {
    id, type: 'message_fondateur', title, body,
    action_label: actionLabel, action_section: actionSection,
    created_at: new Date().toISOString(), read: false, from: 'Schealtiel',
  };
}

// ── Les 5 messages (voix fondateur, features à jour) ──
// ctx = { prenom, aPhoto, aStatut }
const JOURS = {
  1: (c) => {
    // Adaptation : s'il a déjà mis sa photo, l'action du jour devient le statut du jour.
    const actionTxt = c.aPhoto
      ? `Aujourd'hui, écris ton statut du jour. Une phrase sur ton profil qui dit au quartier que tu es là, disponible, maintenant. Ceux qui hésitaient viennent aujourd'hui.`
      : `Aujourd'hui, ajoute une photo de ta dernière réalisation.\nUne seule suffit pour commencer.\n\nParce que chaque photo que tu ajoutes, c'est un client qui voit la qualité de ton travail avant même de t'appeler. Et un client qui voit, c'est un client qui fait confiance. Et la confiance, ça se transforme en argent.`;
    return _msg('w_j1', 'Le Score qui change tout',
`${c.prenom},

Imagine quelqu'un dans ton quartier qui cherche ton métier en ce moment.

Il ouvre WOZALI. Il tape son quartier.

La liste des prestataires apparaît. Il appelle le premier.
Pas forcément le meilleur. Le premier.

C'est là que le Score WOZALI change tout pour toi.

---

Le Score, c'est ton rang dans les résultats de recherche.
Plus il est élevé, plus tu apparais en haut de la liste.
Et celui qui est en haut reçoit l'appel.

Pas le plus connu. Pas le mieux connecté.
Celui dont le profil montre qu'il est sérieux.

Trois choses font monter ton Score :

Ton profil complet.
Photo de profil, description, tarifs, photos de tes réalisations. Chaque élément manquant, c'est une place perdue dans les résultats.

Les avis de tes clients.
Chaque étoile laissée sur ton profil dit aux autres clients : cette personne fait bien son travail. C'est le carburant de ton Score.

Ta présence régulière.
Connecte-toi, mets ton profil à jour, réponds vite. WOZALI récompense ceux qui sont actifs, jusqu'aux badges "Répond vite" et "Très demandé" que les clients voient sur ton profil.

---

${actionTxt}

A demain.`,
      c.aPhoto ? 'Écrire mon statut du jour' : 'Ajouter ma photo', c.aPhoto ? 'overview' : 'photos');
  },
  2: (c) => _msg('w_j2', "L'emploi sans compromis",
`${c.prenom},

Combien de personnes autour de toi ont eu un emploi grâce à quelqu'un qui voulait quelque chose en retour ?

Un contact. Un intermédiaire. Un chef qui fixe ses conditions avant même que tu commences à travailler.

C'est le marché de l'emploi ici. Et ce n'est pas normal.

---

WOZALI Jobs existe pour que ça ne soit plus ton seul chemin.

Quand un employeur publie une offre sur WOZALI, il voit ton profil, ton Score, tes réalisations, les avis de tes clients. Il te contacte parce que ton travail lui convient.

Pas parce que tu connais quelqu'un.
Pas parce que tu as accepté quelque chose.
Pas parce que tu viens de la bonne famille.

Juste ton dossier qui parle pour toi.

Et toi tu postules depuis ton téléphone, en deux clics, sans te déplacer, sans intermédiaire entre vous.

---

Regarde les offres disponibles dans ta ville. Si quelque chose te correspond, envoie ta candidature.

Un emploi trouvé proprement, c'est aussi ce que tu mérites.

A demain.`,
    'Voir les offres près de chez moi', 'emploi-mode'),
  3: (c) => _msg('w_j3', "De l'argent même quand tu ne travailles pas",
`${c.prenom},

Il y a deux types de revenus.

Celui que tu gagnes quand tu travailles.
Et celui qui rentre même quand tu ne travailles pas.

Le premier, tu le connais déjà. Tu travailles, tu es payé. Tu ne travailles pas, il ne rentre rien. C'est épuisant de dépendre uniquement de ça.

Le deuxième, c'est ce que le parrainage WOZALI te donne.

---

Voici comment ça fonctionne.

Tu as un code de parrainage unique. Chaque personne qui s'inscrit avec ton code et passe au Plan Pro te rapporte 1 000 FCFA par mois. Tant qu'elle reste Pro.

Pas une seule fois. Chaque mois.

3 filleuls Pro - 3 000 FCFA par mois.
10 filleuls Pro - 10 000 FCFA par mois.
50 filleuls Pro - 50 000 FCFA par mois.

Le SMIG au Togo est de 52 500 FCFA.
53 filleuls Pro suffisent pour le dépasser.
Sans travailler plus. Juste parce que tu as parlé de WOZALI aux bonnes personnes.

---

Ton lien et ton code sont prêts, avec un simulateur pour voir exactement ce que ça peut donner. Partage ton lien aujourd'hui à des gens qui travaillent, qui ont un métier, qui cherchent à être vus.

Tu te demandes sûrement ce qu'est le Plan Pro.
Demain je t'explique tout.

A demain.`,
    'Voir mon code de parrainage', 'parrainage'),
  4: (c) => _msg('w_j4', 'Le Plan Pro',
`${c.prenom},

Je t'avais promis de t'expliquer le Plan Pro.

Sur WOZALI il y a deux façons d'être présent.

Le Plan Gratuit : ton profil existe, tu es visible.
C'est déjà bien. Mais tu es dans la liste avec tout le monde.

Le Plan Pro : tu passes devant tout le monde. Toujours.

---

Voilà ce que ça change concrètement.

Quand quelqu'un cherche ton métier dans ton quartier, les profils Pro apparaissent en premier dans les résultats. Systématiquement. Peu importe qui s'est inscrit avant toi.

En clair : un prestataire gratuit inscrit depuis 2 ans apparaît après toi si tu es Pro.

C'est ça la priorité Pro.

---

Mais il y a plus.

Tu vois QUI a regardé ton profil. Pas juste un chiffre : la liste des personnes, leur métier, leur quartier. Un client qui hésite, tu le rappelles avant qu'il aille voir ailleurs.

Le parrainage dont je t'ai parlé hier, les 1 000 FCFA par filleul par mois, n'est actif qu'en Plan Pro.

Et ton coach WOZALI va plus loin avec toi : tu lui poses TES questions, il analyse TES chiffres.

---

Le Plan Pro coûte 2 500 FCFA par mois.

C'est le prix d'un repas. Pour une visibilité qui peut te rapporter dix, vingt, cinquante fois plus que ça.

Et demain je te parle de quelque chose que peu de plateformes font : 500 000 FCFA distribués chaque mois aux membres les plus sérieux.

A demain. Ce que je t'annonce mérite que tu sois là.`,
    'Découvrir le Plan Pro', 'abonnement'),
  5: (c) => _msg('w_j5', "Ce qui s'ouvre devant toi",
`${c.prenom},

Cette semaine je t'ai parlé de plusieurs choses.

Ton Score qui fait venir les clients sans chercher.
WOZALI Jobs qui te donne accès à l'emploi sans compromis.
Le parrainage qui construit un revenu récurrent.
Le Plan Pro qui te met devant tout le monde.

Tout ça existe. Tout ça est disponible pour toi maintenant.

Mais aujourd'hui je veux te parler de ce que WOZALI fait qu'aucune autre plateforme ne fait ici.

---

Chaque mois, WOZALI distribue 500 000 FCFA à ses membres les plus sérieux.

Pas les plus connus. Les plus constants.

La Bourse de Croissance : 100 000 FCFA chacun pour les 5 meilleurs profils du mois, hommes ou femmes, Togo ou Bénin. Conditions : Plan Pro, profil complet, Score WOZALI à 80 sur 100 minimum, 3 avis clients sur les 30 derniers jours.

Le classement regarde ton travail. Tes avis clients, ta note, ta constance. Pas tes abonnés. Pas ton nombre de vues. Quelqu'un avec 10 clientes satisfaites passe devant quelqu'un avec 100 000 abonnés et des avis moyens.

Premiers résultats : 25 septembre 2026.

---

Une dernière chose, et elle compte.

À partir de demain, ton coach WOZALI prend le relais. Il s'appelle Coach Zali. Chaque matin, un conseil, une action précise, tes chiffres réels. Il connaît ton profil et il sait exactement ce qui te bloque.

Moi je reviendrai te parler aux grands moments : ton premier avis, ton Score qui décolle, le jour où tu deviens éligible à la Bourse.

Les gens qui gagnent sur WOZALI ne sont pas plus talentueux que toi. Ils sont juste plus constants.

Sois de ceux-là.

Schealtiel`,
    'Faire connaissance avec Coach Zali', 'coach'),
};

// ── Messages événementiels : la voix mission pour les victoires ──
// Détectés chaque jour par les données, envoyés UNE seule fois
// (marqueur = l'id du message dans le JSON Notifications).
// Un seul événement célébré par jour et par membre : la victoire
// mérite sa place, pas une pile de confettis d'un coup.
const EVENEMENTS = [
  {
    id: 'ev_avis1',
    cond: (p) => (p.nb_avis_recus || 0) >= 1,
    build: (c) => _msg('ev_avis1', 'Ton premier avis est arrivé',
`${c.prenom},

Quelqu'un a pris le temps d'écrire publiquement que ton travail vaut quelque chose.

Réfléchis à ce que ça veut dire. Cette personne n'y gagne rien. Elle l'a fait parce que tu l'as mérité.

Ce premier avis, personne ne pourra te l'enlever. Et chaque client qui visite ton profil à partir d'aujourd'hui le lira avant de te contacter.

Le premier est le plus dur. Maintenant, demande le deuxième.

Schealtiel`,
      'Lire mon avis', 'avis'),
  },
  {
    id: 'ev_pro',
    cond: (p) => String(p.abonnement || '').trim().toLowerCase() === 'pro',
    build: (c) => _msg('ev_pro', 'Tu viens de passer devant tout le monde',
`${c.prenom},

Tu es Pro maintenant.

Concrètement, à partir de cette minute : quand quelqu'un cherche ton métier dans ton quartier, tu apparais avant les autres. Ton parrainage est actif, chaque filleul Pro te rapporte 1 000 FCFA par mois. Et tu vois QUI regarde ton profil.

Tu as investi dans ton travail. La plupart des gens n'osent pas faire ça.

Maintenant fais travailler cet investissement : regarde qui est passé sur ton profil, et rappelle ceux qui hésitent.

Schealtiel`,
      'Voir qui a regardé mon profil', 'vues'),
  },
  {
    id: 'ev_score80',
    cond: (p) => (p.score_wozali || 0) >= 80,
    build: (c) => _msg('ev_score80', '80 sur 100',
`${c.prenom},

Ton Score WOZALI vient de passer 80.

Tu sais ce que ça veut dire ? La majorité des profils n'y arrivent jamais. Toi tu y es, parce que tu as fait le travail : profil complet, clients satisfaits, présence régulière.

À ce niveau, tu sors en haut des recherches. Et la Bourse de Croissance, les 100 000 FCFA mensuels pour les meilleurs profils, exige exactement ce score.

Tu n'es plus en train de découvrir WOZALI. Tu es en train de gagner dessus.

Schealtiel`,
      'Voir les récompenses', 'recompenses'),
  },
  {
    id: 'ev_bourse',
    cond: (p) => String(p.abonnement || '').trim().toLowerCase() === 'pro'
      && (p.score_wozali || 0) >= 80 && (p.nb_avis_recus || 0) >= 3,
    build: (c) => _msg('ev_bourse', 'La Bourse te regarde maintenant',
`${c.prenom},

Plan Pro. Score au-dessus de 80. Des avis clients réels.

Tu coches les conditions principales de la Bourse de Croissance : 100 000 FCFA pour chacun des 5 meilleurs profils du mois. Le classement regarde ton travail, tes avis, ta constance. Rien d'autre.

Beaucoup rêvent de ce genre de reconnaissance. Toi tu l'as construite, avis après avis, client après client.

Reste constant jusqu'au tirage. C'est tout ce qui te sépare de la liste des gagnants.

Schealtiel`,
      'Voir où j\'en suis', 'recompenses'),
  },
];

// Détecte et envoie les messages événementiels (1 max/jour/membre).
export async function runFondateurEvents(supabase) {
  const { data: rows } = await supabase
    .from('wozali_prestataires')
    .select('id, user_id, prenom, nom_complet, notifications, abonnement, score_wozali, nb_avis_recus');
  if (!rows || !rows.length) return { evenements: 0 };

  let envoyes = 0;
  for (const r of rows) {
    let arr = [];
    try { arr = typeof r.notifications === 'string' ? JSON.parse(r.notifications) : (r.notifications || []); } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    const dejaId = (id) => arr.some(m => m && m.id === id);

    const ev = EVENEMENTS.find(E => !dejaId(E.id) && E.cond(r));
    if (!ev) continue;
    const ctx = { prenom: (r.prenom || (r.nom_complet || '').split(' ')[0] || '').trim() };
    arr.push(ev.build(ctx));
    const { error } = await supabase
      .from('wozali_prestataires')
      .update({ notifications: JSON.stringify(arr) })
      .eq('id', r.id);
    if (!error) envoyes++;
  }
  return { evenements: envoyes };
}

// ── Générateur quotidien ──
// Écrit le message du jour (J1..J5) aux membres inscrits il y a 1 à 5
// jours, s'il n'existe pas déjà dans leur JSON Notifications.
// Les anciens membres (séquence pré-écrite complète) sont ignorés
// naturellement : leurs ids w_j1..w_j5 existent déjà.
export async function runSequenceFondateur(supabase) {
  const now = Date.now();
  const il7j = new Date(now - 7 * 86400000).toISOString();
  const { data: rows } = await supabase
    .from('wozali_prestataires')
    .select('id, user_id, prenom, nom_complet, notifications, created_at, photo_realisation_1, photo_realisation_2, statut_jour')
    .gte('created_at', il7j);
  if (!rows || !rows.length) return { envoyes: 0 };

  let envoyes = 0;
  for (const r of rows) {
    const dayIdx = Math.floor((now - new Date(r.created_at).getTime()) / 86400000);
    if (dayIdx < 1 || dayIdx > 5) continue;

    let arr = [];
    try { arr = typeof r.notifications === 'string' ? JSON.parse(r.notifications) : (r.notifications || []); } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];

    const dejaId = (id) => arr.some(m => m && (m.id === id || (id === 'w_j4' && m.id === 'w_j4_pro')));
    const id = 'w_j' + dayIdx;
    if (dejaId(id)) continue;

    const ctx = {
      prenom: (r.prenom || (r.nom_complet || '').split(' ')[0] || '').trim(),
      aPhoto: !!(r.photo_realisation_1 || r.photo_realisation_2),
      aStatut: !!r.statut_jour,
    };
    arr.push(JOURS[dayIdx](ctx));
    const { error } = await supabase
      .from('wozali_prestataires')
      .update({ notifications: JSON.stringify(arr) })
      .eq('id', r.id);
    if (!error) envoyes++;
  }
  return { envoyes };
}
