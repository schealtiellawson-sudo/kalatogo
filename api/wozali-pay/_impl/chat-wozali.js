// ================================================================
// WOZALI — Chat interne avec IA auto-reply + escalade fondateur
// Actions :
//   POST chat-wozali-send         (auth requise)
//   GET  chat-wozali-history      (auth requise)
//   GET  chat-wozali-admin-list   (CRON_SECRET requis)
//   POST chat-wozali-admin-reply  (CRON_SECRET requis)
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { callGemini } from '../../_lib/ai-providers.js';
import { verifyAuth } from '../../_lib/auth.js';

// ── System prompt WOZALI complet ─────────────────────────────────
const WOZALI_SYSTEM_PROMPT = `Tu es l'assistant WOZALI, la marketplace africaine qui connecte les travailleurs de l'économie informelle avec leurs clients au Togo (Lomé) et au Bénin (Cotonou).

TON RÔLE : répondre aux questions des prestataires (pros) inscrits sur WOZALI. Sois direct, concret, chaleureux. Pas de réponse générique. Utilise le tutoiement.

---

## QU'EST-CE QUE WOZALI

WOZALI (Lingala : "nous existons / être ici") est une marketplace africaine qui rend visible l'économie informelle. Mission : connecter les travailleurs invisibles avec des clients, sans réseau, juste le travail. Lancé début juillet 2026, couvre Lomé (Togo) et Cotonou (Bénin) en phase 1, expansion vers toute l'Afrique de l'Ouest prévue.

Site : wozali.com (en attendant : wolomarket.vercel.app)
Contact : TikTok @wozali · Instagram @wozali

---

## PLANS TARIFAIRES

### Plan Gratuit
- Profil visible dans la recherche
- Candidatures à des offres d'emploi
- Parrainage verrouillé
- Pas de publication d'offres d'emploi
- Pas de Bourse de Croissance (requiert Pro)
- Fonctionnalités limitées

### Plan Pro — 2 500 FCFA/mois
- Tout débloqué
- Profil prioritaire dans la recherche (affiché en premier toujours)
- Statistiques de vues et contacts
- Publication d'offres d'emploi illimitées
- Parrainage actif (40% de commission)
- Éligibilité Bourse de Croissance après 1 mois Pro
- Éligibilité King & Queen WOLO après 2 mois Pro

### Comment passer au Pro
Depuis le dashboard → "Mon abonnement" → cliquer "Passer au Pro" → suivre les instructions de paiement (FedaPay ou virement). Le fondateur active manuellement après confirmation.

---

## PARRAINAGE / AFFILIATION

- Commission : 40% = 1 000 FCFA par filleul Pro par mois
- Code de parrainage unique format WOZALI + 4 lettres + 4 chiffres (ex: WOZALIabcd1234)
- Partager son lien ou code pour inviter
- Simulateur disponible dans le dashboard → "Mon Parrainage" : slider 1-500 filleuls
- Paliers : 3 filleuls = 3 000 F/mois, 10 = 10 000 F/mois, 50 = 50 000 F/mois, 100 = 100 000 F/mois, 500 = 500 000 F/mois
- Comparaison : SMIG Togo = 52 500 FCFA — 53 filleuls Pro suffisent pour le dépasser
- Paiement des commissions : virement mensuel

---

## BOURSE DE CROISSANCE

- Montant : 300 000 FCFA — 1 gagnant/mois (Togo OU Bénin, tirage aléatoire le 30 du mois)
- Conditions pour être éligible :
  1. Plan Pro ce mois (pas besoin de 2 mois consécutifs)
  2. Profil 100% complet (photo profil + bio + métier + ville/quartier + numéro)
  3. Score WOZALI ≥ 80/100
  4. Minimum 3 avis clients sur les 30 derniers jours
  5. Note moyenne ≥ 4.2 étoiles sur les 30 derniers jours
  6. Dernière connexion ≤ 14 jours
  7. Pas gagné la Bourse de Croissance les 3 derniers mois
  8. Avoir déclaré suivre les 2 comptes TikTok (bonus, non obligatoire mais augmente les chances)
- Vérifier son éligibilité : dashboard → "Récompenses"
- "Pas le plus connu. Le plus sérieux." — ce prix récompense la constance, pas la notoriété

---

## BOURSE DES MAINS D'OR

- Montant : 100 000 FCFA × 2 = 200 000 FCFA/mois (1 gagnante Togo + 1 gagnante Bénin)
- Réservé aux femmes coiffeuses et couturières
- Pas besoin d'être Pro (ouvert à toutes)
- Alternance : coiffure les mois impairs, couture les mois pairs
- Tirage aléatoire le 30 du mois
- Conditions :
  1. Métier = Coiffeuse ou Couturière (selon le mois en cours)
  2. Profil complet
  3. Au moins 1 photo de réalisation sur ton profil ce mois
  4. Au moins 1 avis client sur les 30 derniers jours
  5. Dernière connexion ≤ 14 jours
  6. Avoir déclaré suivre les comptes TikTok (bonus)
- Phrase clé : "Une machine Singer neuve coûte 95 000 FCFA. La Bourse des Mains d'Or paie 100 000 FCFA."
- Finale annuelle en décembre : 500 000 FCFA × 2 (Reine de l'Année Coiffure + Couture)

---

## WOZALI JOBS — OFFRES D'EMPLOI

### Côté candidat
- Voir les offres : dashboard → "Trouver un emploi"
- Filtres : métier, ville, quartier, type de contrat (CDI, CDD, Temps partiel, Freelance)
- Postuler en 1 clic avec son profil WOZALI
- Suivre ses candidatures : dashboard → "Mes candidatures"
- Préparer son CV WOZALI : dashboard → "Mon CV WOZALI"
- Statuts candidature : En attente / Vue / Retenue / Refusée

### Côté recruteur (Pro uniquement)
- Publier une offre : dashboard → "Je recrute" → "Publier une offre"
- Gérer ses offres : dashboard → "Mes offres"
- Voir les candidatures : dashboard → "Candidatures reçues"
- KPI : total, en attente, vues, retenus
- Exporter les candidatures en CSV

---

## SCORE WOZALI (max 100 pts)

- Profil complet : 30 pts (photo 8pts, bio 7pts, métier 5pts, ville/quartier 5pts, numéro vérifié 5pts)
- Note moyenne clients : 25 pts (5★=25, 4★=20, 3★=12, <3=0)
- Nombre d'avis : 15 pts (1-2=3pts, 3-5=7pts, 6-10=11pts, 11-20=13pts, 21+=15pts)
- Photos publiées : 10 pts (1-2=3pts, 3-5=6pts, 6+=10pts)
- Vues du profil : 10 pts (progressif 0-100 vues)
- Activité récente : 10 pts (≤3j=10pts, 4-7j=7pts, 8-14j=4pts, >14j=0pts)
- Perte : -1pt/jour après 14 jours sans connexion
- Voir son score : dashboard → profil → section Score WOZALI

---

## DASHBOARD — SECTIONS PRINCIPALES

- Mon profil : modifier photo, bio, services, tarifs, numéro
- Mes photos : gérer les réalisations (max 3 photos + album)
- Mon activité : messages WOZALI, likes, vues
- Disponible : toggle "disponible maintenant" visible sur son profil
- GPS : activer sa géolocalisation pour apparaître sur la carte
- Mon abonnement : voir son plan, passer au Pro
- Mon Parrainage : code, simulateur, historique commissions
- Récompenses : Bourse de Croissance + Bourse des Mains d'Or
- Trouver un emploi : offres d'emploi, carte, alertes
- Mes candidatures : candidatures envoyées
- Mon CV WOZALI : CV généré automatiquement
- Je recrute : publier des offres, voir candidatures (Pro)

---

## PROBLÈMES COURANTS

### Inscription / connexion
- Erreur "Database error" : réessayer après quelques secondes. Contacter le fondateur si persiste.
- Oublié son mot de passe : page connexion → "Mot de passe oublié" → email de réinitialisation
- Email non reçu : vérifier les spams

### Upload photo
- Format supporté : JPG, PNG, WEBP
- Taille max : 5 Mo
- Si l'upload échoue, attendre 2 secondes et réessayer
- Conseil : compresser les photos volumineuses avant upload

### GPS / Localisation
- Activer les autorisations de localisation dans les paramètres du navigateur
- Sur mobile : vérifier que le GPS est activé dans les paramètres du téléphone
- Sur Chrome : cliquer sur l'icône cadenas dans la barre d'adresse → Localisation → Autoriser

### Paiement Pro
- Montant : 2 500 FCFA/mois
- Modes de paiement : FedaPay, virement Wave/Orange Money
- Délai activation : quelques heures après confirmation du fondateur
- Référence de paiement : noter le code "WOL-XXXXXX" affiché au moment du paiement

### Profil non trouvé / invisible
- Vérifier que son profil est bien "disponible" (toggle dashboard)
- Ajouter une photo de profil et une description
- Attendre 5 à 10 minutes après inscription pour apparaître dans la recherche

---

## CE QUE TU NE DOIS PAS FAIRE

- Ne jamais inventer des fonctionnalités qui n'existent pas encore
- Ne jamais promettre une date de livraison de feature
- Ne jamais promettre un paiement ou un remboursement
- Ne jamais communiquer des informations personnelles d'autres utilisateurs
- Si tu ne connais pas la réponse avec certitude : dire que tu transmets au fondateur

---

## FORMAT DE RÉPONSE

- Court et direct (2-5 phrases max pour les questions simples)
- Tutoiement toujours
- Langue : français
- Pas d'émojis excessifs
- Si la réponse nécessite plusieurs étapes : liste numérotée
- Terminer par une question si pertinent ("Autre chose ?", "Ça t'aide ?")

---

## INDICATEUR DE CONFIANCE

À la fin de chaque réponse, ajouter sur une ligne séparée (pas visible par l'utilisateur) :
CONFIDENCE:HIGH si tu es sûr à plus de 80%
CONFIDENCE:LOW si tu as un doute ou la question dépasse ton périmètre`;

// ── Mots-clés détection demande de rencontre ────────────────────
const RENCONTRE_KEYWORDS = [
  'rencontre', 'rencontrer', 'rendez-vous', 'rdv', 'meeting',
  'se voir', 'nous voir', 'passer te voir', 'te voir', 'venir te voir',
  'venir vous voir', 'venir à vos locaux', 'venir au bureau',
  'dans tes bureaux', 'dans vos bureaux', 'te rencontrer', 'vous rencontrer',
  'te retrouver', 'vous retrouver', 'café', 'déjeuner avec toi',
  'dîner avec toi', 'appel vidéo', 'appel téléphonique avec toi'
];

function isRenconteRequest(message) {
  const lower = message.toLowerCase();
  return RENCONTRE_KEYWORDS.some(kw => lower.includes(kw));
}

function extractConfidence(text) {
  const m = text.match(/\nCONFIDENCE:(HIGH|LOW)\s*$/m);
  const confidence = m ? m[1] : 'HIGH';
  // Supprimer la ligne de l'indicateur de la réponse visible
  const cleanText = text.replace(/\nCONFIDENCE:(HIGH|LOW)\s*$/m, '').trim();
  return { confidence, cleanText };
}

// ── Handler principal ────────────────────────────────────────────

export default async function handler(req, res) {
  const action = req.query.action;

  // Vérification accès admin : CRON_SECRET OU JWT d'un admin (ADMIN_EMAILS)
  if (action === 'chat-wozali-admin-list' || action === 'chat-wozali-admin-reply') {
    const cronSecret = req.headers['x-cron-secret'];
    const cronOk = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!cronOk) {
      // Tenter auth JWT + vérification ADMIN_EMAILS
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const user = await verifyAuth(req);
      const isAdmin = user && adminEmails.includes(user.email.toLowerCase());
      if (!isAdmin) {
        return res.status(403).json({ error: 'Accès refusé — CRON_SECRET ou compte admin requis' });
      }
    }
  }

  switch (action) {
    case 'chat-wozali-send':    return handleSend(req, res);
    case 'chat-wozali-history': return handleHistory(req, res);
    case 'chat-wozali-admin-list':  return handleAdminList(req, res);
    case 'chat-wozali-admin-reply': return handleAdminReply(req, res);
    default:
      return res.status(404).json({ error: 'Action inconnue' });
  }
}

// ── POST chat-wozali-send ────────────────────────────────────────
async function handleSend(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requise' });

  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message requis' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message trop long (max 2000 caractères)' });
  }

  const msgText = message.trim();

  // Récupérer le genre du prestataire
  let genreUser = null;
  try {
    const { data: prest } = await supabase
      .from('wolo_prestataires')
      .select('genre')
      .eq('user_id', userId)
      .maybeSingle();
    if (prest?.genre) genreUser = prest.genre;
  } catch (e) {
    console.warn('[chat-wozali] genre fetch failed:', e.message);
  }

  // Insérer le message en statut attente_ia
  const { data: inserted, error: insertErr } = await supabase
    .from('wolo_chat_messages')
    .insert({
      user_id: userId,
      message: msgText,
      statut: 'attente_ia',
      genre_user: genreUser,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[chat-wozali] insert error:', insertErr.message);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du message' });
  }

  const messageId = inserted.id;

  // 1. Détecter demande de rencontre avant l'IA
  if (isRenconteRequest(msgText)) {
    const isWoman = genreUser === 'Femme';

    if (isWoman) {
      // Escalade prioritaire : femme qui demande une rencontre
      await supabase
        .from('wolo_chat_messages')
        .update({
          statut: 'escalade_fondateur',
          type_escalade: 'rencontre_prioritaire',
        })
        .eq('id', messageId);

      return res.status(200).json({
        ok: true,
        message_id: messageId,
        statut: 'escalade_fondateur',
        reponse: null,
        message_affiche: 'Message envoyé — nous reviendrons vers toi bientôt.',
      });
    } else {
      // Homme ou genre non renseigné : ignorer silencieusement
      await supabase
        .from('wolo_chat_messages')
        .update({
          statut: 'ignore',
          type_escalade: 'rencontre_ignoree',
          reponse_ia: null,
        })
        .eq('id', messageId);

      // Réponse neutre sans aucune indication du traitement interne
      return res.status(200).json({
        ok: true,
        message_id: messageId,
        statut: 'repondu_ia',
        reponse: 'Message reçu. Pour toute demande particulière, tu peux aussi nous écrire sur Instagram @wozali.',
        message_affiche: null,
      });
    }
  }

  // 2. Appel IA
  let iaResponse = null;
  let iaError = null;

  try {
    const result = await callGemini({
      system: WOZALI_SYSTEM_PROMPT,
      user: msgText,
      jsonMode: false,
      maxTokens: 600,
    });

    const { confidence, cleanText } = extractConfidence(result.text);

    if (confidence === 'LOW' || !cleanText || cleanText.length < 5) {
      iaError = 'confidence_low';
    } else {
      iaResponse = cleanText;
    }
  } catch (e) {
    console.error('[chat-wozali] IA error:', e.message);
    iaError = 'ia_failed';
  }

  // 3. Sauvegarder selon le résultat IA
  if (iaResponse) {
    // Réponse IA disponible
    await supabase
      .from('wolo_chat_messages')
      .update({
        statut: 'repondu_ia',
        reponse_ia: iaResponse,
      })
      .eq('id', messageId);

    return res.status(200).json({
      ok: true,
      message_id: messageId,
      statut: 'repondu_ia',
      reponse: iaResponse,
      message_affiche: null,
    });
  } else {
    // Escalade fondateur (IA insuffisante)
    await supabase
      .from('wolo_chat_messages')
      .update({
        statut: 'escalade_fondateur',
        type_escalade: 'complexe',
      })
      .eq('id', messageId);

    return res.status(200).json({
      ok: true,
      message_id: messageId,
      statut: 'escalade_fondateur',
      reponse: null,
      message_affiche: 'Message envoyé — nous reviendrons vers toi bientôt.',
    });
  }
}

// ── GET chat-wozali-history ─────────────────────────────────────
async function handleHistory(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.authenticatedUser?.user_id;
  if (!userId) return res.status(401).json({ error: 'Auth requise' });

  const { data, error } = await supabase
    .from('wolo_chat_messages')
    .select('id, message, reponse_ia, reponse_fondateur, statut, created_at, updated_at')
    .eq('user_id', userId)
    .neq('statut', 'ignore')           // On n'expose jamais les messages ignorés
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[chat-wozali] history error:', error.message);
    return res.status(500).json({ error: 'Erreur chargement historique' });
  }

  // Normaliser la réponse pour le frontend : merger reponse_ia + reponse_fondateur
  const messages = (data || []).map(m => ({
    id: m.id,
    message: m.message,
    reponse: m.reponse_fondateur || m.reponse_ia || null,
    statut: m.statut,
    en_attente: m.statut === 'escalade_fondateur' || m.statut === 'attente_ia',
    created_at: m.created_at,
    updated_at: m.updated_at,
  }));

  return res.status(200).json({ ok: true, messages });
}

// ── GET chat-wozali-admin-list ──────────────────────────────────
async function handleAdminList(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Optionnel : filtre statut via query
  const statutFilter = req.query.statut; // 'escalade_fondateur' | 'repondu_fondateur' | 'all'

  let query = supabase
    .from('wolo_chat_messages')
    .select(`
      id,
      user_id,
      message,
      reponse_ia,
      reponse_fondateur,
      statut,
      type_escalade,
      lu_par_fondateur,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!statutFilter || statutFilter === 'pending') {
    query = query.eq('statut', 'escalade_fondateur');
  } else if (statutFilter !== 'all') {
    query = query.eq('statut', statutFilter);
  } else {
    // 'all' : tout sauf 'ignore' et 'attente_ia' et 'repondu_ia'
    query = query.in('statut', ['escalade_fondateur', 'repondu_fondateur']);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[chat-wozali] admin-list error:', error.message);
    return res.status(500).json({ error: 'Erreur chargement DMs' });
  }

  // Enrichir avec le nom du prestataire
  const userIds = [...new Set((data || []).map(m => m.user_id))];
  let prestMap = {};
  if (userIds.length > 0) {
    try {
      const { data: prests } = await supabase
        .from('wolo_prestataires')
        .select('user_id, nom_complet, metier_principal, ville')
        .in('user_id', userIds);
      (prests || []).forEach(p => {
        prestMap[p.user_id] = {
          nom: p.nom_complet || 'Inconnu',
          metier: p.metier_principal || '',
          ville: p.ville || '',
        };
      });
    } catch (e) {
      console.warn('[chat-wozali] prest enrichment failed:', e.message);
    }
  }

  const messages = (data || []).map(m => ({
    ...m,
    prestataire: prestMap[m.user_id] || { nom: 'Inconnu', metier: '', ville: '' },
  }));

  const nonLus = messages.filter(m => !m.lu_par_fondateur && m.statut === 'escalade_fondateur').length;

  return res.status(200).json({ ok: true, messages, non_lus: nonLus });
}

// ── POST chat-wozali-admin-reply ────────────────────────────────
async function handleAdminReply(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message_id, reponse } = req.body || {};

  if (!message_id) return res.status(400).json({ error: 'message_id requis' });
  if (!reponse || typeof reponse !== 'string' || !reponse.trim()) {
    return res.status(400).json({ error: 'reponse requise' });
  }
  if (reponse.length > 3000) {
    return res.status(400).json({ error: 'reponse trop longue (max 3000 caractères)' });
  }

  // Vérifier que le message existe et est en escalade
  const { data: existing, error: fetchErr } = await supabase
    .from('wolo_chat_messages')
    .select('id, statut, user_id')
    .eq('id', message_id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return res.status(404).json({ error: 'Message introuvable' });
  }

  if (existing.statut !== 'escalade_fondateur') {
    return res.status(400).json({ error: `Ce message est au statut "${existing.statut}", pas en escalade` });
  }

  const { error: updateErr } = await supabase
    .from('wolo_chat_messages')
    .update({
      reponse_fondateur: reponse.trim(),
      statut: 'repondu_fondateur',
      lu_par_fondateur: true,
    })
    .eq('id', message_id);

  if (updateErr) {
    console.error('[chat-wozali] admin-reply update error:', updateErr.message);
    return res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }

  return res.status(200).json({ ok: true, message_id });
}
