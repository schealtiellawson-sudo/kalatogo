// ================================================================
// Score WOLO — Calcul complet sur 100 points (6 composantes)
// Utilisé par le cron horaire + endpoint dashboard
// ================================================================

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'applmj1RDrJkR8C4w';
const AIRTABLE_KEY  = process.env.AIRTABLE_API_KEY;
const AT_BASE_URL   = `https://api.airtable.com/v0/${AIRTABLE_BASE}`;
const AT_HEADERS    = { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' };

// ── 1. Profil complet (max 30 pts) ──
// Photo 8, Bio 7, Métier 5, Ville+Quartier 5, Numéro 5
function scoreProfil(fields) {
  let pts = 0;
  if (fields['Photo Profil'])              pts += 8;
  if ((fields['Description des services'] || '').trim().length > 10) pts += 7;
  if (fields['Métier principal'])          pts += 5;
  if (fields['Quartier'] || fields['Ville']) pts += 5;
  if (fields['Numéro de téléphone'] || fields['WhatsApp']) pts += 5;
  return pts; // max 30
}

// ── 2. Note moyenne clients (max 25 pts) ──
function scoreNote(noteMoyenne) {
  if (noteMoyenne >= 4.5) return 25;
  if (noteMoyenne >= 4.0) return 20;
  if (noteMoyenne >= 3.0) return 12;
  return 0;
}

// ── 3. Nombre d'avis (max 15 pts) ──
function scoreAvis(nbAvis) {
  if (nbAvis >= 21) return 15;
  if (nbAvis >= 11) return 13;
  if (nbAvis >= 6)  return 11;
  if (nbAvis >= 3)  return 7;
  if (nbAvis >= 1)  return 3;
  return 0;
}

// ── 4. Photos publiées (max 10 pts) ──
function scorePhotos(fields) {
  let nb = 0;
  if (fields['Photo Réalisation 1']) nb++;
  if (fields['Photo Réalisation 2']) nb++;
  if (fields['Photo Réalisation 3']) nb++;
  // Albums JSON → photos supplémentaires
  try {
    const albums = JSON.parse(fields['Albums'] || '[]');
    for (const a of albums) nb += (a.photos || []).length;
  } catch {}
  if (nb >= 6) return 10;
  if (nb >= 3) return 6;
  if (nb >= 1) return 3;
  return 0;
}

// ── 5. Vues du profil (max 10 pts) ──
// Progressif : 0 vue = 0, 100+ = 10
function scoreVues(vuesMois) {
  if (vuesMois <= 0) return 0;
  if (vuesMois >= 100) return 10;
  return Math.round((vuesMois / 100) * 10);
}

// ── 6. Activité récente (max 10 pts) ──
function scoreActivite(derniereActivite) {
  if (!derniereActivite) return 0;
  const jours = (Date.now() - new Date(derniereActivite).getTime()) / 86400000;
  if (jours <= 3)  return 10;
  if (jours <= 7)  return 7;
  if (jours <= 14) return 4;
  return 0;
}

// ── Calcul total ──
export function calculerScoreWolo({ fields, noteMoyenne, nbAvis, vuesMois, derniereActivite }) {
  const composantes = {
    profil:   scoreProfil(fields),         // max 30
    note:     scoreNote(noteMoyenne),      // max 25
    avis:     scoreAvis(nbAvis),           // max 15
    photos:   scorePhotos(fields),         // max 10
    vues:     scoreVues(vuesMois),         // max 10
    activite: scoreActivite(derniereActivite), // max 10
  };
  composantes.total = Math.min(
    composantes.profil + composantes.note + composantes.avis +
    composantes.photos + composantes.vues + composantes.activite,
    100
  );
  return composantes;
}

// ── Pente douce : -1pt/jour après 14j inactivité ──
export function penteDouce(scoreActuel, derniereActivite) {
  if (!derniereActivite) return scoreActuel;
  const jours = (Date.now() - new Date(derniereActivite).getTime()) / 86400000;
  if (jours < 14) return scoreActuel;
  const malus = Math.floor(jours - 13); // -1 à J14, -2 à J15, etc.
  return Math.max(0, scoreActuel - malus);
}

// ── Fetch Airtable helpers ──
async function fetchAllAirtable(table, params = '') {
  const records = [];
  let offset = '';
  do {
    const sep = params ? '&' : '?';
    const url = `${AT_BASE_URL}/${encodeURIComponent(table)}${params ? '?' + params : ''}${offset ? `${sep}offset=${offset}` : ''}`;
    const r = await fetch(url, { headers: AT_HEADERS });
    if (!r.ok) { console.error(`[AT] ${table}:`, r.status); break; }
    const d = await r.json();
    records.push(...(d.records || []));
    offset = d.offset || '';
  } while (offset);
  return records;
}

// ── Batch recalcul pour tous les membres ──
// Retourne un Map<email, { score, composantes }>
export async function recalculerTousLesScores(supabase) {
  // 1. Charger TOUS les prestataires Airtable
  const prestataires = await fetchAllAirtable('Prestataires');

  // 2. Charger TOUS les avis Airtable (pour note + nb)
  const avis = await fetchAllAirtable('Avis');

  // 3. Grouper les avis par Prestataire ID
  const avisParPrest = {};
  for (const a of avis) {
    const pid = a.fields['Prestataire ID'];
    if (!pid) continue;
    if (!avisParPrest[pid]) avisParPrest[pid] = [];
    avisParPrest[pid].push(a);
  }

  // 4. Charger les profiles Supabase pour derniere_activite + vues_mois
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, derniere_activite, vues_mois, score_wolo');

  const profilesByEmail = {};
  for (const p of (profiles || [])) {
    if (p.email) profilesByEmail[p.email.toLowerCase()] = p;
  }

  // 5. Calculer pour chaque prestataire
  const resultats = [];

  for (const prest of prestataires) {
    const f = prest.fields;
    const email = (f['Email'] || '').toLowerCase();
    if (!email) continue;

    const profile = profilesByEmail[email];
    if (!profile) continue;

    // Avis pour ce prestataire
    const mesAvis = avisParPrest[prest.id] || [];
    const nbAvis = mesAvis.length;
    let noteMoyenne = 0;
    if (nbAvis > 0) {
      const sum = mesAvis.reduce((s, a) => s + (a.fields['Note globale sur 5'] || 0), 0);
      noteMoyenne = sum / nbAvis;
    }

    const composantes = calculerScoreWolo({
      fields: f,
      noteMoyenne,
      nbAvis,
      vuesMois: profile.vues_mois || 0,
      derniereActivite: profile.derniere_activite,
    });

    // Appliquer pente douce
    const scoreFinal = penteDouce(composantes.total, profile.derniere_activite);

    resultats.push({
      userId:    profile.id,
      email,
      scoreFinal,
      composantes,
      ancienScore: profile.score_wolo || 0,
      derniereActivite: profile.derniere_activite,
    });
  }

  return resultats;
}
