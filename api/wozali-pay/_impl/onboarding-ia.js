// ================================================================
// WOZALI Jobs — Onboarding IA (Gemini) : scoring/extraction + lecture CV
// Auth requise (branché non-public dans le router).
// mode 'score' : analyse les réponses -> présentation pro + compétences
//                structurées + score_competence (dimensions Mercor).
// mode 'cv'    : lit un CV joint (PDF/image, base64) -> profil extrait.
// Anonymisation : on n'envoie ni nom ni téléphone (les réponses portent
// sur le travail). Style WOZALI : FR, pas de tiret cadratin, worker = héros,
// jamais inventer un diplôme/fait absent.
// ================================================================
import { callGemini } from '../../_lib/ai-providers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = req.body || {};
  try {
    if (body.mode === 'score') return await scoreProfile(body, res);
    if (body.mode === 'cv') return await parseCv(body, res);
    return res.status(400).json({ error: 'mode invalide' });
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'exception', detail: String(e && e.message || e).slice(0, 200) });
  }
}

async function scoreProfile(body, res) {
  const a = body.answers || {};
  const system = "Tu es Sandy, l'assistante IA de WOZALI (plateforme emploi au Togo et au Benin). Tu analyses les reponses d'un candidat pour batir son profil pro. Reponds UNIQUEMENT en JSON valide, rien d'autre. Style : francais, chaleureux et direct, le travailleur est le heros, JAMAIS de tiret cadratin. Ne juge PAS l'orthographe ni la grammaire (beaucoup ecrivent peu), juge le fond. N'invente JAMAIS un diplome, un chiffre ou un fait absent des reponses.";
  const user = "Reponses du candidat.\n"
    + "Metier : " + (a.metier || '') + "\n"
    + "Parcours : " + (a.exp || '') + "\n"
    + "Mise en situation metier : " + (a.situ || '') + "\n"
    + "Gestion d'un conflit client : " + (a.behav_conflit || '') + "\n"
    + "Explication du metier a un novice : " + (a.behav_explain || '') + "\n"
    + "Competences citees : " + (a.skills || '') + "\n"
    + "Fiabilite (delai) : " + (a.fiab || '') + "\n"
    + "Etudes/formation : " + (a.etudes || '') + "\n"
    + "Details metier : " + JSON.stringify(a.metier_details || {}) + "\n\n"
    + "Produis EXACTEMENT ce JSON :\n"
    + '{"presentation_pro":"3 a 4 phrases pro pour un recruteur, a la premiere personne, uniquement a partir des faits donnes",'
    + '"competences":["5 a 8 competences concretes deduites des reponses"],'
    + '"score_competence":0,'
    + '"score_breakdown":{"precision":0,"savoir_faire":0,"raisonnement":0,"fiabilite":0,"communication":0},'
    + '"score_justification":"1 phrase"}\n'
    + "Bareme du score_competence (0-100) : precision 0-20 (chiffres, outils, contexte nommes), savoir_faire 0-30 (qualite de la mise en situation), raisonnement 0-25 (process explique etape par etape), fiabilite 0-15, communication 0-10 (clarte de l'explication au novice). Additionne les 5 sous-scores.";
  const r = await callGemini({ system, user, jsonMode: true, maxTokens: 900 });
  var data;
  try { data = JSON.parse(r.text); } catch (e) { return res.status(200).json({ ok: false, reason: 'parse', raw: (r.text || '').slice(0, 300) }); }
  if (Array.isArray(data.competences)) data.competences = data.competences.map(function (s) { return String(s).trim(); }).filter(Boolean).slice(0, 8);
  if (typeof data.score_competence === 'number') data.score_competence = Math.max(0, Math.min(100, Math.round(data.score_competence)));
  return res.status(200).json({ ok: true, presentation_pro: data.presentation_pro || '', competences: data.competences || [], score_competence: data.score_competence, score_breakdown: data.score_breakdown || null, score_justification: data.score_justification || '' });
}

async function parseCv(body, res) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(200).json({ ok: false, reason: 'no-key' });
  const b64 = body.file_base64;
  const mime = body.mime || 'application/pdf';
  if (!b64) return res.status(400).json({ error: 'file manquant' });
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key;
  const prompt = "Lis ce CV et extrais un JSON, uniquement des faits presents dans le CV, n'invente rien. Style francais, pas de tiret cadratin. JSON EXACT : "
    + '{"metier":"le metier principal","annees_experience":"ex: 6 ans","niveau_etudes":"diplome/formation","competences":["4 a 8 competences"],"parcours_resume":"3 a 4 phrases a la premiere personne resumant l\'experience","langues":"langues parlees"}';
  const gbody = {
    contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 900, temperature: 0.2 }
  };
  const gres = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gbody) });
  if (!gres.ok) { const t = await gres.text(); return res.status(200).json({ ok: false, reason: 'gemini', detail: t.slice(0, 200) }); }
  const gj = await gres.json();
  const text = (gj && gj.candidates && gj.candidates[0] && gj.candidates[0].content && gj.candidates[0].content.parts && gj.candidates[0].content.parts[0] && gj.candidates[0].content.parts[0].text) || '';
  var data;
  try { data = JSON.parse(text); } catch (e) { return res.status(200).json({ ok: false, reason: 'parse' }); }
  if (Array.isArray(data.competences)) data.competences = data.competences.map(function (s) { return String(s).trim(); }).filter(Boolean).slice(0, 8);
  return res.status(200).json({ ok: true, metier: data.metier || '', annees_experience: data.annees_experience || '', niveau_etudes: data.niveau_etudes || '', competences: data.competences || [], parcours_resume: data.parcours_resume || '', langues: data.langues || '' });
}
