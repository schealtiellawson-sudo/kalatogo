// ================================================================
// MUR DES TÉMOIGNAGES ANONYMES — "Ce qu'on ne devrait plus jamais accepter"
// Chantier 8 Dignité, étape 2 (2026-07-18)
//
// Actions (routées par req.query.action) :
//   temoignage-create  (auth)   : dépôt + filtre IA anti-noms
//   temoignage-list    (public) : témoignages approuvés (texte + mois SEULEMENT)
//   temoignage-moderer (admin)  : approuver / rejeter (ADMIN_EMAILS)
//
// Anonymat : aucune réponse de ce module ne contient jamais user_id.
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { PROVIDERS, availableProviders } from '../../_lib/ai-providers.js';

const SYSTEM_FILTRE = `Tu filtres un témoignage anonyme destiné à être publié sur une plateforme au Togo/Bénin. Le témoignage raconte une injustice vécue au travail (piston, harcèlement, exploitation d'apprentie, salaire impayé...). Règle absolue : AUCUNE personne, entreprise, boutique, salon ou lieu précis identifiable ne doit pouvoir être reconnu (nom, prénom, surnom, nom commercial, adresse précise). Un quartier ou une ville en général est acceptable. Réponds UNIQUEMENT en JSON :
{"verdict": "ok" | "noms_detectes" | "hors_sujet", "details": "<1 phrase en français>"}
"hors_sujet" = insultes gratuites, politique, contenu sans rapport avec le travail. Dans le doute sur un nom : "noms_detectes" (on protège d'abord).`;

function _isAdmin(req) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const email = (req.authenticatedUser?.email || '').toLowerCase();
  return !!email && adminEmails.includes(email);
}

async function _filtreIA(texte) {
  try {
    const available = availableProviders();
    const order = ['groq', 'gemini', 'cerebras', 'mistral'].filter(n => available.includes(n));
    for (const name of order) {
      try {
        const r = await PROVIDERS[name].fn({ system: SYSTEM_FILTRE, user: texte, jsonMode: true, maxTokens: 150 });
        try { return JSON.parse(r.text); } catch (e) {
          const m = String(r.text || '').match(/\{[\s\S]*\}/);
          if (m) return JSON.parse(m[0]);
        }
      } catch (e) { /* provider suivant */ }
    }
  } catch (e) { console.warn('[temoignages] filtre ia', e); }
  return null; // IA indisponible → la modération humaine tranche
}

// ════════════════════════════════════════════════════════════
// SAFE ZONE — réactions de soutien + modération des réponses
// ════════════════════════════════════════════════════════════

// Réactions autorisées : jeu FERMÉ, aucune option négative possible
const SUPPORT_TYPES = ['crois', 'courage', 'merci', 'moi_aussi'];

// Couche 1 — modération DÉTERMINISTE des réponses (tourne toujours, même IA HS)
const _INSULTES = ['salope','pute','putain','connard','connasse','conne','pd','pédé','menteuse','menteur','folle','tarée','tocard','abruti','idiote','idiot','débile','pétasse','chienne','salaud','enculé','batard','bâtard','ordure','pouffiasse'];
const _BLAME = [/tu l'?as? cherch/i, /c'?est (de )?ta faute/i, /t'?avais qu'?[àa]/i, /pourquoi (t'?es|tu es|elle est|vous êtes) rest/i, /tu mens/i, /elle ment/i, /vous mentez/i, /c'?est faux/i, /(elle|tu|vous) exag[éè]r/i, /bien fait pour/i, /l'?as bien cherch/i, /fallait pas/i];
const _NOMMER = [/\b(il|elle)\s+s'?appelle\b/i, /\ble\s+nomm[ée]\b/i, /\bun[e]?\s+certain[e]?\b/i, /(monsieur|madame|mr|mme|m\.)\s+[A-ZÉÈÀ]/, /\b(chez|salon|atelier|garage|boutique|magasin|entreprise|soci[ée]t[ée]|bar|maquis|h[ôo]tel|société)\s+[A-ZÉÈÀ][a-zà-ÿ]{2,}/, /son nom c'?est/i, /il travaille (à|au|chez)/i];
const _CONTACT = [/https?:\/\//i, /www\./i, /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i, /@[A-Za-z0-9_]{3,}/, /(\+?\d[\s.\-]?){8,}/];

function _moderationCommentaire(texte) {
  const t = String(texte || '').trim();
  if (t.length < 2) return { ok: false, motif: 'court', message: 'Écris au moins un mot.' };
  if (t.length > 500) return { ok: false, motif: 'long', message: 'Reste court : 500 caractères maximum.' };
  const low = t.toLowerCase();
  if (_CONTACT.some(rx => rx.test(t)))
    return { ok: false, motif: 'contact', message: 'Pas de lien, de numéro ni de contact ici. Ce mur est un espace de parole, pas un carnet d\'adresses.' };
  if (_NOMMER.some(rx => rx.test(t)))
    return { ok: false, motif: 'nommer', message: 'On ne nomme personne, jamais — ni l\'agresseur, ni un lieu, ni une entreprise. Ça protège tout le monde, toi comprise. Reformule sans citer de nom.' };
  if (_INSULTES.some(w => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(low)))
    return { ok: false, motif: 'insulte', message: 'Ce message contient des mots insultants. Ici on soutient, on n\'attaque pas. Réécris-le avec respect.' };
  if (_BLAME.some(rx => rx.test(t)))
    return { ok: false, motif: 'jugement', message: 'Ce mur est une zone de soutien : aucun jugement, aucune remise en cause de la personne qui témoigne. Si tu ne peux pas soutenir, n\'écris pas.' };
  return { ok: true };
}

const SYSTEM_FILTRE_COMMENTAIRE = `Tu modères un commentaire sous un témoignage de harcèlement ou d'abus sexuel au travail (plateforme Togo/Bénin). Ce mur est une ZONE DE SOUTIEN. BLOQUE si le commentaire : nomme ou cherche à identifier une personne / entreprise / lieu ; pousse à révéler le nom de l'agresseur ; juge, culpabilise ou met en doute la victime (victim-blaming) ; insulte, harcèle, menace, ou vise quelqu'un ; contient un contact (numéro, lien) ; est hors-sujet. Dans le doute : BLOQUE (on protège d'abord). Réponds UNIQUEMENT en JSON :
{"verdict":"ok"|"bloque","motif":"nommer|jugement|insulte|harcelement|contact|hors_sujet","details":"<1 phrase bienveillante en français adressée à la personne>"}`;

async function _filtreCommentaireIA(texte) {
  try {
    const available = availableProviders();
    const order = ['groq', 'gemini', 'cerebras', 'mistral'].filter(n => available.includes(n));
    for (const name of order) {
      try {
        const r = await PROVIDERS[name].fn({ system: SYSTEM_FILTRE_COMMENTAIRE, user: texte, jsonMode: true, maxTokens: 150 });
        try { return JSON.parse(r.text); } catch (e) {
          const m = String(r.text || '').match(/\{[\s\S]*\}/);
          if (m) return JSON.parse(m[0]);
        }
      } catch (e) { /* provider suivant */ }
    }
  } catch (e) { console.warn('[temoignages] filtre commentaire ia', e); }
  return null;
}

export default async function handler(req, res) {
  const action = req.query.action;

  // ── Lecture publique : témoignages approuvés, texte + mois seulement ──
  if (action === 'temoignage-list') {
    if (_isAdmin(req) && req.query.moderation === '1') {
      const { data } = await supabase.from('wozali_temoignages')
        .select('id, texte, ia_verdict, statut, created_at')
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: true }).limit(50);
      return res.status(200).json({ ok: true, temoignages: data || [] });
    }
    const { data } = await supabase.from('wozali_temoignages')
      .select('id, texte, created_at, anonyme, auteur_affiche')
      .eq('statut', 'approuve')
      .order('created_at', { ascending: false }).limit(30);
    const rows = data || [];
    const ids = rows.map(t => t.id);

    // Compteurs de soutien + de réponses (une requête chacun, agrégés en mémoire)
    const reacts = {}, reps = {};
    if (ids.length) {
      const { data: rx } = await supabase.from('wozali_temoignage_reactions')
        .select('temoignage_id, type').in('temoignage_id', ids);
      (rx || []).forEach(r => {
        reacts[r.temoignage_id] = reacts[r.temoignage_id] || {};
        reacts[r.temoignage_id][r.type] = (reacts[r.temoignage_id][r.type] || 0) + 1;
      });
      const { data: rp } = await supabase.from('wozali_temoignage_reponses')
        .select('temoignage_id').eq('statut', 'approuve').in('temoignage_id', ids);
      (rp || []).forEach(r => { reps[r.temoignage_id] = (reps[r.temoignage_id] || 0) + 1; });
    }

    const temoignages = rows.map(t => ({
      id: t.id,
      texte: t.texte,
      mois: new Date(t.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      // Anonyme par défaut ; on ne renvoie le nom d'affichage QUE si la personne a signé
      anonyme: t.anonyme !== false,
      auteur: (t.anonyme === false && t.auteur_affiche) ? t.auteur_affiche : null,
      reactions: reacts[t.id] || {},
      nb_reponses: reps[t.id] || 0,
    }));
    return res.status(200).json({ ok: true, temoignages });
  }

  // ── Dépôt d'un témoignage ──
  if (action === 'temoignage-create') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const userId = req.authenticatedUser?.user_id;
    if (!userId) return res.status(401).json({ error: 'Auth requis' });

    const texte = String(req.body?.texte || '').trim().slice(0, 800);
    if (texte.length < 40) {
      return res.status(400).json({ ok: false, motif: 'court', message: 'Raconte un peu plus : quelques phrases suffisent, mais il faut qu\'on comprenne ce qui s\'est passé.' });
    }

    // Anti-abus léger : 2 témoignages max par personne et par semaine
    const il7j = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count } = await supabase.from('wozali_temoignages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', il7j);
    if ((count || 0) >= 2) {
      return res.status(429).json({ ok: false, motif: 'limite', message: 'Tu as déjà partagé cette semaine. Merci pour ça. Reviens la semaine prochaine si tu as autre chose à raconter.' });
    }

    // Filtre IA anti-noms : la diffamation ne passe pas, même anonyme
    const verdict = await _filtreIA(texte);
    if (verdict?.verdict === 'noms_detectes') {
      return res.status(400).json({
        ok: false, motif: 'noms',
        message: 'Ton histoire compte, mais on ne peut publier aucun nom : ni personne, ni salon, ni entreprise. Réécris-la sans nommer qui que ce soit ("ma patronne", "un recruteur", "un salon de mon quartier") et renvoie-la.',
      });
    }
    if (verdict?.verdict === 'hors_sujet') {
      return res.status(400).json({
        ok: false, motif: 'hors_sujet',
        message: 'Ce mur est réservé aux histoires vécues au travail. Si tu veux nous parler d\'autre chose, passe par Besoin d\'aide.',
      });
    }

    // Choix de la personne : anonyme (défaut) ou signé avec un nom d'affichage
    const anonyme = req.body?.anonyme !== false;
    let auteur_affiche = null;
    if (!anonyme) {
      auteur_affiche = String(req.body?.auteur_affiche || '').trim().slice(0, 60) || null;
    }

    const { error } = await supabase.from('wozali_temoignages').insert({
      user_id: userId, texte,
      anonyme, auteur_affiche,
      ia_verdict: verdict?.verdict || 'non_analyse',
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      ok: true,
      message: anonyme
        ? 'Reçu. Ton histoire sera relue puis publiée sans aucun nom, même pas le tien. Merci de l\'avoir dite : chaque histoire publiée rappelle pourquoi WOZALI existe.'
        : 'Reçu. Ton histoire sera relue puis publiée avec ton prénom, comme tu l\'as choisi. Merci de la porter à visage découvert : ton courage en protège d\'autres.',
    });
  }

  // ── Modération (fondateur) ──
  if (action === 'temoignage-moderer') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!_isAdmin(req)) return res.status(403).json({ error: 'Accès admin requis' });
    const { id, decision } = req.body || {};
    if (!id || !['approuver', 'rejeter'].includes(decision)) {
      return res.status(400).json({ error: 'id + decision (approuver|rejeter) requis' });
    }
    const { error } = await supabase.from('wozali_temoignages')
      .update({ statut: decision === 'approuver' ? 'approuve' : 'rejete' })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // ── Réaction de soutien (toggle) ──
  if (action === 'temoignage-react') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const userId = req.authenticatedUser?.user_id;
    if (!userId) return res.status(401).json({ error: 'Auth requis' });
    const { temoignage_id, type } = req.body || {};
    if (!temoignage_id || !SUPPORT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'temoignage_id + type de soutien requis' });
    }
    const { data: existing } = await supabase.from('wozali_temoignage_reactions')
      .select('id').eq('temoignage_id', temoignage_id).eq('user_id', userId).eq('type', type).maybeSingle();
    if (existing) await supabase.from('wozali_temoignage_reactions').delete().eq('id', existing.id);
    else await supabase.from('wozali_temoignage_reactions').insert({ temoignage_id, user_id: userId, type });
    const { data: rx } = await supabase.from('wozali_temoignage_reactions')
      .select('type, user_id').eq('temoignage_id', temoignage_id);
    const counts = {}, mine = [];
    (rx || []).forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; if (r.user_id === userId) mine.push(r.type); });
    return res.status(200).json({ ok: true, reactions: counts, mine });
  }

  // ── Fil de réponses d'un témoignage (public) ──
  if (action === 'temoignage-reponses') {
    const temoignage_id = req.query.temoignage_id || req.body?.temoignage_id;
    if (!temoignage_id) return res.status(400).json({ error: 'temoignage_id requis' });
    // On récupère l'auteur du témoignage pour marquer ses réponses "Autrice" (jamais son id)
    const { data: temo } = await supabase.from('wozali_temoignages').select('user_id').eq('id', temoignage_id).maybeSingle();
    const autriceId = temo?.user_id || null;
    const { data } = await supabase.from('wozali_temoignage_reponses')
      .select('id, texte, created_at, anonyme, auteur_affiche, user_id')
      .eq('temoignage_id', temoignage_id).eq('statut', 'approuve')
      .order('created_at', { ascending: true }).limit(200);
    const reponses = (data || []).map(r => ({
      id: r.id,
      texte: r.texte,
      quand: new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      anonyme: r.anonyme !== false,
      auteur: (r.anonyme === false && r.auteur_affiche) ? r.auteur_affiche : null,
      autrice: !!autriceId && r.user_id === autriceId,
    }));
    return res.status(200).json({ ok: true, reponses });
  }

  // ── Poster une réponse (auth + double modération) ──
  if (action === 'temoignage-reponse-create') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const userId = req.authenticatedUser?.user_id;
    if (!userId) return res.status(401).json({ error: 'Auth requis' });
    const { temoignage_id } = req.body || {};
    if (!temoignage_id) return res.status(400).json({ error: 'temoignage_id requis' });
    const texte = String(req.body?.texte || '').trim().slice(0, 500);

    // Couche 1 — déterministe (toujours)
    const det = _moderationCommentaire(texte);
    if (!det.ok) return res.status(400).json({ ok: false, motif: det.motif, message: det.message });

    // Couche 2 — IA (si dispo)
    const v = await _filtreCommentaireIA(texte);
    if (v?.verdict === 'bloque') {
      const messages = {
        nommer: 'On ne nomme personne ici. Reformule sans citer de nom, de lieu ni d\'entreprise.',
        jugement: 'Zone de soutien : aucun jugement de la personne qui témoigne. Si tu ne peux pas soutenir, ne commente pas.',
        insulte: 'Propos non tolérés ici. On soutient, on n\'attaque pas.',
        harcelement: 'Ce message vise ou harcèle quelqu\'un. Il n\'a pas sa place sur ce mur.',
        contact: 'Pas de contact ni de lien sur ce mur.',
        hors_sujet: 'Ce mur est réservé au soutien autour de ces témoignages.',
      };
      return res.status(400).json({ ok: false, motif: v.motif || 'bloque', message: v.details || messages[v.motif] || 'Ton message a été bloqué pour protéger cet espace. Réécris-le dans un esprit de soutien, sans nommer personne.' });
    }

    // Anti-abus : 10 réponses / heure / personne
    const il1h = new Date(Date.now() - 3600000).toISOString();
    const { count } = await supabase.from('wozali_temoignage_reponses')
      .select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', il1h);
    if ((count || 0) >= 10) return res.status(429).json({ ok: false, motif: 'limite', message: 'Tu as beaucoup écrit récemment. Reviens dans un moment.' });

    const anonyme = req.body?.anonyme !== false;
    let auteur_affiche = null;
    if (!anonyme) auteur_affiche = String(req.body?.auteur_affiche || '').trim().slice(0, 60) || null;

    const { error } = await supabase.from('wozali_temoignage_reponses').insert({
      temoignage_id, user_id: userId, texte, anonyme, auteur_affiche, statut: 'approuve',
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      ok: true,
      message: anonyme ? 'Message publié, en anonyme.' : 'Message publié, signé.',
    });
  }

  // ── Signaler une réponse (public, auto-masque à 2 signalements) ──
  if (action === 'temoignage-reponse-signaler') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { reponse_id } = req.body || {};
    if (!reponse_id) return res.status(400).json({ error: 'reponse_id requis' });
    const { data: rep } = await supabase.from('wozali_temoignage_reponses').select('signalements').eq('id', reponse_id).maybeSingle();
    const n = (rep?.signalements || 0) + 1;
    const upd = { signalements: n };
    if (n >= 2) upd.statut = 'masque'; // masquage auto en attendant la relecture admin
    await supabase.from('wozali_temoignage_reponses').update(upd).eq('id', reponse_id);
    return res.status(200).json({ ok: true, masque: n >= 2 });
  }

  return res.status(404).json({ error: 'Action inconnue' });
}
