// ================================================================
// Agents Terrain — CRUD + recherche prestataires + sync Airtable
// POST /api/wolo-pay/agents-terrain { action, token, ... }
// Actions: list, search, add, remove, update
// Admin-only (vérifié via ADMIN_EMAILS)
// ================================================================
import { supabase } from '../../_lib/supabase.js';
import { syncToAirtable, updateAirtable } from '../../_lib/airtable-sync.js';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

async function verifyAdmin(token) {
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!ADMIN_EMAILS.length) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;
  return user;
}

async function airtableGet(formula) {
  if (!AIRTABLE_KEY) return [];
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent('Prestataires')}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=20`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.records || [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, token } = body;

    // Vérification admin obligatoire
    const admin = await verifyAdmin(token);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès admin requis' });

    // ── LIST : tous les agents terrain ──
    if (action === 'list') {
      const { data: agents, error } = await supabase
        .from('agents_terrain')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec stats parrainage pour chaque agent
      const enriched = await Promise.all((agents || []).map(async (agent) => {
        // Nombre de filleuls via code parrainage
        const { count: nbFilleuls } = await supabase
          .from('parrainages')
          .select('id', { count: 'exact', head: true })
          .eq('parrain_id', agent.user_id);

        // Nombre de filleuls Pro (via abonnements ou parrainages actifs avec commissions)
        const { data: commissions } = await supabase
          .from('commissions_parrainage')
          .select('montant')
          .eq('parrain_id', agent.user_id);

        const totalComm = (commissions || []).reduce((s, c) => s + (c.montant || 0), 0);

        return {
          ...agent,
          nb_filleuls: nbFilleuls || 0,
          total_commissions: totalComm
        };
      }));

      return res.status(200).json({ ok: true, agents: enriched });
    }

    // ── SEARCH : chercher un prestataire par téléphone ou nom ──
    if (action === 'search') {
      const { q } = body;
      if (!q || q.length < 2) return res.status(200).json({ ok: true, results: [] });

      // Recherche dans Airtable Prestataires par téléphone ou nom
      const isPhone = /^\d/.test(q.trim());
      let formula;
      if (isPhone) {
        formula = `FIND("${q.trim()}", {Numéro de téléphone})`;
      } else {
        formula = `FIND(LOWER("${q.trim().toLowerCase()}"), LOWER({Nom complet}))`;
      }

      const records = await airtableGet(formula);

      const results = records.map(r => ({
        airtable_id: r.id,
        nom: r.fields['Nom complet'] || '',
        telephone: r.fields['Numéro de téléphone'] || '',
        metier: r.fields['Métier principal'] || '',
        quartier: r.fields['Quartier'] || '',
        photo: r.fields['Photo Profil'] || '',
        abonnement: r.fields['Abonnement'] || 'Base',
        code_parrainage: r.fields['Code Parrainage'] || '',
        email: r.fields['Email'] || '',
        genre: r.fields['Genre'] || ''
      }));

      return res.status(200).json({ ok: true, results });
    }

    // ── ADD : ajouter un agent terrain ──
    if (action === 'add') {
      const { airtable_id, nom, telephone, ville, genre, code_parrainage, email, user_id } = body;
      if (!nom || !ville || !genre) {
        return res.status(400).json({ ok: false, error: 'nom, ville et genre requis' });
      }

      // Vérifier doublon
      const { data: existing } = await supabase
        .from('agents_terrain')
        .select('id')
        .eq('telephone', telephone)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ ok: false, error: 'Cet agent est déjà enregistré' });
      }

      // Insérer dans Supabase
      const agentData = {
        user_id: user_id || null,
        airtable_id: airtable_id || null,
        nom,
        telephone: telephone || null,
        email: email || null,
        ville,
        genre, // H ou F
        code_parrainage: code_parrainage || null,
        actif: true
      };

      const { data: inserted, error } = await supabase
        .from('agents_terrain')
        .insert(agentData)
        .select()
        .single();

      if (error) throw error;

      // Sync Airtable backup (fire-and-forget)
      syncToAirtable('Agents Terrain', {
        'Nom': nom,
        'Téléphone': telephone || '',
        'Email': email || '',
        'Ville': ville,
        'Genre': genre,
        'Code Parrainage': code_parrainage || '',
        'Actif': true,
        'Supabase ID': inserted.id,
        'User ID': user_id || ''
      });

      return res.status(200).json({ ok: true, agent: inserted });
    }

    // ── REMOVE : désactiver un agent ──
    if (action === 'remove') {
      const { agent_id } = body;
      if (!agent_id) return res.status(400).json({ ok: false, error: 'agent_id requis' });

      const { error } = await supabase
        .from('agents_terrain')
        .update({ actif: false })
        .eq('id', agent_id);

      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    // ── UPDATE : modifier ville/genre/actif ──
    if (action === 'update') {
      const { agent_id, updates } = body;
      if (!agent_id || !updates) return res.status(400).json({ ok: false, error: 'agent_id et updates requis' });

      const allowed = ['ville', 'genre', 'actif'];
      const clean = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) clean[k] = updates[k];
      }

      const { error } = await supabase
        .from('agents_terrain')
        .update(clean)
        .eq('id', agent_id);

      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Action inconnue' });

  } catch (err) {
    console.error('[agents-terrain]', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
}
