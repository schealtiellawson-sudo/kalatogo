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
      .select('texte, created_at')
      .eq('statut', 'approuve')
      .order('created_at', { ascending: false }).limit(30);
    const temoignages = (data || []).map(t => ({
      texte: t.texte,
      mois: new Date(t.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
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

    const { error } = await supabase.from('wozali_temoignages').insert({
      user_id: userId, texte,
      ia_verdict: verdict?.verdict || 'non_analyse',
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      ok: true,
      message: 'Reçu. Ton histoire sera relue puis publiée sans aucun nom, même pas le tien. Merci de l\'avoir dite : chaque histoire publiée rappelle pourquoi WOZALI existe.',
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

  return res.status(404).json({ error: 'Action inconnue' });
}
