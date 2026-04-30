// ================================================================
// Battle Bénin vs Togo — Scoreboard public viral
// GET /api/wolo-pay/battle-score
//
// Retourne :
//   {
//     ok, mois,
//     benin: { prestataires, photos, votes, gagnantes_mois, top_villes: [{ville,count}, ...] },
//     togo:  { prestataires, photos, votes, gagnantes_mois, top_villes: [...] },
//     leader: 'BJ' | 'TG' | 'tie',
//     score_total: { BJ, TG },
//     updated_at
//   }
//
// Score par pays = prestataires*1 + photos*3 + votes*1 + gagnantes_mois*50
// ================================================================
import { supabase } from '../../_lib/supabase.js';

const VILLES_BJ_REGEX = /cotonou|porto|abomey|parakou|bohicon|natitingou|lokossa|djougou|kandi/i;

function classerPays(ville) {
  if (!ville) return null;
  if (VILLES_BJ_REGEX.test(ville)) return 'BJ';
  return 'TG';
}

function topVilles(photos, k = 5) {
  const counts = {};
  for (const p of photos) {
    const v = (p.ville || '').trim();
    if (!v) continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([ville, count]) => ({ ville, count }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const mois = req.query.mois || new Date().toISOString().slice(0, 7);

  try {
    // 1) Prestataires actifs par pays
    //    On les classe par ville (table wolo_prestataires n'a pas de col pays).
    const { data: prests, error: errPrest } = await supabase
      .from('wolo_prestataires')
      .select('user_id, ville');
    if (errPrest) throw errPrest;

    let prestBJ = 0, prestTG = 0;
    for (const p of (prests || [])) {
      const c = classerPays(p.ville);
      if (c === 'BJ') prestBJ++;
      else if (c === 'TG') prestTG++;
    }

    // 2) Photos Mur des Reines du mois courant par pays
    const { data: photos, error: errPhotos } = await supabase
      .from('feed_photos')
      .select('id, pays, ville')
      .eq('mois', mois)
      .eq('video_validee', true);
    if (errPhotos) throw errPhotos;

    const photosBJ = (photos || []).filter(p => p.pays === 'BJ');
    const photosTG = (photos || []).filter(p => p.pays === 'TG');

    const photoIds = (photos || []).map(p => p.id);
    const photoPays = {};
    for (const p of (photos || [])) photoPays[p.id] = p.pays;

    // 3) Votes (duels) émis sur les photos du mois
    let votesBJ = 0, votesTG = 0;
    if (photoIds.length > 0) {
      // On compte les duels où le winner est une photo du mois,
      // attribué au pays de la photo gagnante.
      // Batch pour éviter url trop longue : tronche par 200.
      for (let i = 0; i < photoIds.length; i += 200) {
        const chunk = photoIds.slice(i, i + 200);
        const { data: duels, error: errD } = await supabase
          .from('duels_photos')
          .select('winner')
          .in('winner', chunk);
        if (errD) throw errD;
        for (const d of (duels || [])) {
          const c = photoPays[d.winner];
          if (c === 'BJ') votesBJ++;
          else if (c === 'TG') votesTG++;
        }
      }
    }

    // 4) Gagnantes du mois (wolo_awards)
    const { data: gagnantes, error: errG } = await supabase
      .from('wolo_awards')
      .select('pays, gagnant')
      .eq('mois', mois)
      .eq('gagnant', true);
    if (errG) throw errG;

    const gagnantesBJ = (gagnantes || []).filter(g => g.pays === 'BJ').length;
    const gagnantesTG = (gagnantes || []).filter(g => g.pays === 'TG').length;

    // 5) Top villes
    const topVillesBJ = topVilles(photosBJ);
    const topVillesTG = topVilles(photosTG);

    // 6) Score total + leader
    const scoreBJ = prestBJ + photosBJ.length * 3 + votesBJ + gagnantesBJ * 50;
    const scoreTG = prestTG + photosTG.length * 3 + votesTG + gagnantesTG * 50;

    let leader = 'tie';
    if (scoreBJ > scoreTG) leader = 'BJ';
    else if (scoreTG > scoreBJ) leader = 'TG';

    return res.status(200).json({
      ok: true,
      mois,
      benin: {
        prestataires: prestBJ,
        photos: photosBJ.length,
        votes: votesBJ,
        gagnantes_mois: gagnantesBJ,
        top_villes: topVillesBJ,
      },
      togo: {
        prestataires: prestTG,
        photos: photosTG.length,
        votes: votesTG,
        gagnantes_mois: gagnantesTG,
        top_villes: topVillesTG,
      },
      leader,
      score_total: { BJ: scoreBJ, TG: scoreTG },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[battle-score]', err);
    return res.status(500).json({ error: 'Erreur interne', detail: err.message });
  }
}
