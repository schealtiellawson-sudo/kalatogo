// ================================================================
// SÉQUENCE FONDATEUR J1-J5 : générée jour par jour par le cron
// (appelée par api/cron/score-wozali.js, comme le Coach Sandy)
//
// Avant : les 6 messages étaient pré-écrits d'un bloc à l'inscription
// dans le JSON Notifications (dates futures). Ils ne s'adaptaient à
// rien. Désormais l'inscription n'écrit que le J0 ; le cron écrit le
// message du jour, en regardant ce que le membre a déjà fait.
//
// Rôles : Schealtiel = le POURQUOI (mission, piliers). Coach Sandy =
// le COMMENT quotidien. Le J5 fait la passation explicite.
// Chaque message porte UN bouton d'action (action_label +
// action_section) rendu dans la Boîte WOZALI et le fil Activité.
// ================================================================

function _msg(id, title, body, actionLabel, actionSection) {
  return {
    id, type: 'message_fondateur', title, body,
    action_label: actionLabel, action_section: actionSection,
    created_at: new Date().toISOString(), read: false, from: 'Fondateur WOZALI',
  };
}

// ── Les 5 messages (voix fondateur, features à jour) ──
// ctx = { prenom, aPhoto, aStatut }
const JOURS = {
  1: (c) => {
    // Adaptation : s'il a déjà mis sa photo, l'action du jour devient le statut du jour.
    const actionTxt = c.aPhoto
      ? `Aujourd'hui, une seule action : écris ton statut du jour. Une phrase sur ton profil qui dit au quartier que tu es là, disponible, maintenant. Celui qui hésitait ce matin peut t'appeler ce soir.`
      : `Aujourd'hui, une seule action : ajoute une photo de ta dernière réalisation. Une seule suffit.\n\nUn client qui voit ton travail avant de t'appeler, c'est un client qui arrive déjà convaincu. Et un client convaincu discute moins le prix.`;
    return _msg('w_j1', "Chez qui l'argent s'arrête",
`${c.prenom},

Ce soir, dans ton quartier, quelqu'un a été payé pour un travail que tu fais aussi bien que lui. Peut-être mieux.

L'argent est sorti de la poche d'un client. Il est rentré chez un autre.

Pas chez le meilleur. Chez celui que le client a trouvé en premier.

---

Sur WOZALI, celui qu'on trouve en premier, c'est celui qui a le meilleur Score.

Le Score WOZALI, c'est ton rang dans les résultats de recherche. Trois choses le font monter :

Ton profil complet.
Photo, description, tarifs, réalisations. Chaque case vide te coûte des places.

Les avis de tes clients.
Chaque étoile dit au client suivant : ici, le travail est sérieux.

Ta régularité.
Tu te connectes, tu mets à jour, tu réponds vite. WOZALI le voit et te fait monter, jusqu'aux badges "Répond vite" et "Très demandé" que les clients voient sur ton profil.

Aucune relation là-dedans. Aucun cousin bien placé. Du travail, des preuves, de la constance.

---

${actionTxt}

L'argent de ton quartier circule tous les jours. Fais-le s'arrêter chez toi.`,
      c.aPhoto ? 'Écrire mon statut du jour' : 'Ajouter ma photo', c.aPhoto ? 'overview' : 'photos');
  },
  2: (c) => _msg('w_j2', "L'emploi sans compromis",
`${c.prenom},

Combien de CV envoyés sur WhatsApp sans réponse ? Combien de « je te rappelle » qui ne rappellent jamais ?

Pendant ce temps, le loyer n'attend pas. L'école des enfants n'attend pas.

Ici, un poste se donne souvent avant même d'être annoncé. À un cousin. À une connaissance. Et parfois, on exige d'une candidate ce qu'on n'a pas le droit de demander à quelqu'un qui veut juste travailler.

---

WOZALI Jobs fonctionne autrement.

Un employeur publie une offre. Il voit ton profil, ton Score, tes réalisations, les avis de tes clients. Il te contacte parce que ton dossier tient debout.

Pas parce que tu connais quelqu'un.
Pas parce que tu as accepté quelque chose.
Pas parce que tu portes le bon nom de famille.

Tu postules depuis ton téléphone, en deux clics. Postuler est gratuit. Publier une offre aussi, si un jour c'est toi qui recrutes.

---

Regarde les offres dans ta ville. Si une te correspond, envoie ta candidature aujourd'hui.

Ta valeur, c'est ton travail. Personne sur WOZALI n'a le droit de te demander autre chose.`,
    'Voir les offres près de chez moi', 'emploi-mode'),
  3: (c) => _msg('w_j3', "L'argent qui rentre chaque mois",
`${c.prenom},

Autour de toi, il y a des gens qui travaillent bien et que personne ne trouve. Le mécanicien du coin. La couturière de ta rue. Peut-être ta propre sœur.

Tu peux les faire entrer sur WOZALI. Et être payé pour ça.

---

Tu as un code de parrainage unique. Chaque personne qui s'inscrit avec ton code et passe au Plan Pro te rapporte 1 000 FCFA par mois. Tant qu'elle reste abonnée.

Pas une seule fois. Chaque mois.

3 filleuls Pro : 3 000 FCFA par mois.
10 filleuls Pro : 10 000 FCFA par mois.
50 filleuls Pro : 50 000 FCFA par mois.

Toi tu aides quelqu'un à trouver des clients. Lui il fait tourner son commerce. Et toi tu touches ta part, mois après mois, pour l'avoir amené.

---

Ton lien et ton code sont prêts, avec un simulateur pour voir exactement ce que ça peut donner. Partage-les aujourd'hui à des gens qui travaillent, qui ont un métier, qui cherchent des clients.

Tu te demandes ce qu'est le Plan Pro. Demain, je te l'explique en entier.

Ton premier filleul, tu connais déjà son nom.`,
    'Voir mon code de parrainage', 'parrainage'),
  4: (c) => _msg('w_j4', 'Le Plan Pro',
`${c.prenom},

Hier je t'ai promis de t'expliquer le Plan Pro.

Sur WOZALI, ton profil gratuit existe déjà et travaille pour toi. Mais il est dans la liste, avec tout le monde.

Le Plan Pro te met devant. Toujours.

---

Concrètement, voilà ce qui change.

Quand quelqu'un cherche ton métier dans ton quartier, les profils Pro sortent en premier. Systématiquement. Un prestataire gratuit inscrit depuis deux ans passe après toi.

Tu vois QUI a regardé ton profil. Pas juste un chiffre : la liste des personnes, leur métier, leur quartier. Un client qui hésite, tu le rattrapes avant qu'il aille voir ailleurs.

Le parrainage d'hier, les 1 000 FCFA par filleul par mois, s'active avec le Pro.

Et Coach Sandy passe en direct avec toi : tu lui poses tes questions quand tu veux, elle te répond en temps réel, sur ton commerce à toi.

---

Le Plan Pro coûte 2 500 FCFA par mois.

Le prix d'un repas. Un repas par mois pour passer devant tout le monde, fais le calcul.

Demain je te parle de ce que presque aucune plateforme ne fait : payer chaque mois ses membres les plus sérieux. Un salaire chacun.

Sois là demain. Ce message-là, tu voudras l'avoir lu.`,
    'Découvrir le Plan Pro', 'abonnement'),
  5: (c) => _msg('w_j5', "Ce qui s'ouvre devant toi",
`${c.prenom},

Cette semaine je t'ai montré quatre choses.

Ton Score, qui fait venir les clients sans supplier personne.
WOZALI Jobs, où ton dossier parle à ta place.
Le parrainage, qui te paie chaque mois pour ceux que tu amènes.
Le Plan Pro, qui te met devant tout le monde.

Tout ça est là, disponible, maintenant.

Aujourd'hui, la dernière pièce. Celle que je t'ai promise hier.

---

Chaque mois, WOZALI paie ses membres les plus sérieux. Pas un bonus symbolique. Un salaire.

La Bourse de Croissance : dans chaque pays, dès que 5 000 membres Pro sont réunis, elle se débloque. Le Togo et le Bénin courent l'un contre l'autre. Une fois ouverte, les 10 meilleurs profils du mois touchent chacun un salaire, le salaire minimum légal de leur pays, versé en Crédit WOZALI sur leur compte WOZALI.

Le classement repart de zéro le 1er de chaque mois. Personne ne s'assoit sur sa place.

Et il regarde ton travail. Tes avis vérifiés, ta note, ta constance. Zéro tirage au sort. Les abonnés ne comptent pas, les vues non plus. Une couturière avec 10 clientes satisfaites passe devant une vedette avec 100 000 abonnés et des avis moyens.

Les conditions : Plan Pro, profil complet, Score WOZALI à 80 sur 100 minimum, 3 avis clients sur les 30 derniers jours. Résultats chaque dernier vendredi du mois, dans les pays qui ont débloqué leur Bourse.

---

Une dernière chose, et elle compte.

À partir de demain, Coach Sandy prend le relais. Sandy est une intelligence artificielle, entraînée sur le commerce du Togo et du Bénin. Chaque jour, un conseil et des leçons pour faire avancer ton activité. En Pro, tu lui parles librement, elle te répond en temps réel.

Moi je reviendrai aux grands moments : ton premier avis, ton Score qui décolle, le jour où la Bourse commence à te regarder.

Ceux qui gagnent sur WOZALI ne sont pas plus doués que toi. Ils sont plus constants. Sois de ceux-là.`,
    'Faire connaissance avec Coach Sandy', 'coach'),
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

Quelqu'un vient d'écrire publiquement que ton travail vaut quelque chose.

Cette personne n'y gagne rien. Elle l'a fait parce que tu l'as mérité.

Ce premier avis, personne ne peut te le retirer. Chaque client qui ouvre ton profil à partir d'aujourd'hui le lira avant de t'appeler.

Le premier est le plus dur à obtenir. Va chercher le deuxième pendant que c'est chaud.`,
      'Lire mon avis', 'avis'),
  },
  {
    id: 'ev_faistoivoir',
    cond: (p) => !!(p.photo_realisation_1 || p.photo_realisation_2),
    build: (c) => _msg('ev_faistoivoir', 'Ton compte social, une boutique ouverte',
`${c.prenom}, une chose que beaucoup de membres découvrent trop tard.

Tes abonnés sur TikTok ou WhatsApp te connaissent déjà. Mais quand l'un d'eux a besoin de toi, ou connaît quelqu'un qui a besoin de toi, il ne sait pas comment t'envoyer ce client. Le mur est là.

J'ai préparé pour toi des posts déjà prêts, avec ton lien WOZALI dessus. C'est gratuit, pour tout le monde. Clique sur le bouton en bas, prends le premier et épingle-le en haut de ton compte.

Comme ça, toute personne qui tombe sur ta page atterrit sur ton profil, voit ton travail, et peut te contacter direct.

Le mur entre toi et tes clients, tu viens de le casser toi-même.`,
      'Ouvrir Fais-toi voir', 'faistoivoir'),
  },
  {
    id: 'ev_pro',
    cond: (p) => String(p.abonnement || '').trim().toLowerCase() === 'pro',
    build: (c) => _msg('ev_pro', 'Tu viens de passer devant tout le monde',
`${c.prenom},

Tu es Pro maintenant.

À partir de cette minute : quand quelqu'un cherche ton métier dans ton quartier, tu sors avant les autres. Ton parrainage est actif, chaque filleul Pro te rapporte 1 000 FCFA par mois. Tu vois QUI regarde ton profil. Et Coach Sandy te répond en direct, quand tu veux.

Tu as mis 2 500 FCFA sur ton propre travail. La plupart des gens n'osent pas.

Maintenant fais-les travailler : ouvre la liste de ceux qui ont vu ton profil, et rappelle ceux qui hésitent.`,
      'Voir qui a regardé mon profil', 'vues'),
  },
  {
    id: 'ev_score80',
    cond: (p) => (p.score_wozali || 0) >= 80,
    build: (c) => _msg('ev_score80', '80 sur 100',
`${c.prenom},

Ton Score WOZALI vient de passer 80.

La majorité des profils n'y arrivent jamais. Toi tu y es, parce que tu as fait le travail : profil complet, clients satisfaits, présence régulière.

À ce niveau, tu sors en haut des recherches. Et la Bourse de Croissance, un salaire chaque mois pour les 10 meilleurs profils de ton pays, exige exactement ce score.

Tu n'es plus en train de découvrir WOZALI. Tu es en train de gagner dessus.`,
      'Voir les récompenses', 'recompenses'),
  },
  {
    id: 'ev_bourse',
    cond: (p) => String(p.abonnement || '').trim().toLowerCase() === 'pro'
      && (p.score_wozali || 0) >= 80 && (p.nb_avis_recus || 0) >= 3,
    build: (c) => _msg('ev_bourse', 'La Bourse te regarde maintenant',
`${c.prenom},

Plan Pro. Score au-dessus de 80. Des avis clients réels.

Tu coches les conditions de la Bourse de Croissance : un salaire pour chacun des 10 meilleurs profils de ton pays ce mois-ci. Le classement regarde tes avis, ta note, ta constance. Rien d'autre. Et il repart de zéro chaque 1er du mois.

Cette place, personne ne te l'a donnée. Tu l'as construite, avis après avis, client après client.

Reste constant jusqu'au dernier vendredi du mois. C'est tout ce qui te sépare de la liste.`,
      'Voir où j\'en suis', 'recompenses'),
  },
];

// Détecte et envoie les messages événementiels (1 max/jour/membre).
export async function runFondateurEvents(supabase) {
  const { data: rows } = await supabase
    .from('wozali_prestataires')
    .select('id, user_id, prenom, nom_complet, notifications, abonnement, score_wozali, nb_avis_recus, photo_realisation_1, photo_realisation_2');
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

// ── Relance douce sur inactivité (M6) ──
// Une seule fois, aux membres sans connexion depuis 21 à 25 jours
// (fenêtre courte + dédup par id 'w_relance' = jamais de spam).
export async function runFondateurRelance(supabase) {
  const now = Date.now();
  const min25 = new Date(now - 25 * 86400000).toISOString();
  const max21 = new Date(now - 21 * 86400000).toISOString();
  const { data: rows } = await supabase
    .from('wozali_prestataires')
    .select('id, prenom, nom_complet, notifications, derniere_connexion')
    .not('derniere_connexion', 'is', null)
    .lte('derniere_connexion', max21)
    .gte('derniere_connexion', min25);
  if (!rows || !rows.length) return { relances: 0 };

  let envoyes = 0;
  for (const r of rows) {
    let arr = [];
    try { arr = typeof r.notifications === 'string' ? JSON.parse(r.notifications) : (r.notifications || []); } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    if (arr.some(m => m && m.id === 'w_relance')) continue;
    const prenom = (r.prenom || (r.nom_complet || '').split(' ')[0] || '').trim();
    arr.push({
      id: 'w_relance', type: 'message_fondateur', from: 'Schealtiel',
      title: "Ta place t'attend", read: false, created_at: new Date().toISOString(),
      action_label: 'Revenir sur mon profil', action_section: 'profil',
      body: `${prenom}, c'est Schealtiel. Ça fait un moment que je ne t'ai pas vu passer.\n\nPeut-être que la semaine était chargée. Peut-être que tu te demandes si ça vaut le coup. Je comprends les deux, et je ne suis pas là pour te mettre la pression.\n\nJe te dis juste ceci : ton profil est toujours là, exactement où tu l'as laissé. Rien n'est perdu. Et pendant ce temps, des gens cherchent ton métier dans ton quartier.\n\nReviens cinq minutes aujourd'hui. Juste cinq. Regarde ton profil, ajuste une chose, une seule.\n\nLa place que tu as prise ici, personne ne l'a prise à ta place. Elle t'attend.`,
    });
    const { error } = await supabase
      .from('wozali_prestataires')
      .update({ notifications: JSON.stringify(arr) })
      .eq('id', r.id);
    if (!error) envoyes++;
  }
  return { relances: envoyes };
}
