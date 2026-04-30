// ================================================================
// WOLO supaCandidatures — adaptateur Supabase pour les Candidatures
// Format de retour Airtable {id, fields, createdTime}
// ================================================================
(function () {
  const AT_TO_SUPA = {
    'Offre ID':            'offre_airtable_id',  // compat Sprint H/I
    'offre_id':            'offre_id',
    'Offre Titre':         'offre_titre',
    'Candidat ID':         'candidat_prestataire_id',
    'Candidat User ID':    'candidat_user_id',
    'Candidat Nom':        'candidat_nom',
    'Candidat Métier':     'candidat_metier',
    'Candidat WhatsApp':   'candidat_whatsapp',
    'Candidat Photo':      'candidat_photo',
    'Candidat Quartier':   'candidat_quartier',
    'Candidat Score WOLO': 'candidat_score_wolo',
    'Recruteur ID':        'recruteur_prestataire_id',
    'Recruteur User ID':   'recruteur_user_id',
    'Recruteur Nom':       'recruteur_nom',
    'Message':             'message',
    'Statut':              'statut',
    'Date candidature':    'date_candidature',
    'Score IA':            'score_ia',
    'Score IA justification': 'score_ia_justification',
    'airtable_record_id':  'airtable_record_id',
  };

  function _supa() { return window.supabase || window.supa; }

  function _toAirtableRecord(row) {
    if (!row) return null;
    const fields = {};
    for (const [atName, supaCol] of Object.entries(AT_TO_SUPA)) {
      const v = row[supaCol];
      if (v != null) fields[atName] = v;
    }
    return { id: row.id, fields, createdTime: row.created_at };
  }

  function _toSupaRow(fields) {
    const row = {};
    for (const [atName, value] of Object.entries(fields || {})) {
      const supaCol = AT_TO_SUPA[atName];
      if (supaCol) row[supaCol] = value;
    }
    return row;
  }

  // ============================================================
  // List avec filtres
  // Options : { recruteur_user_id, candidat_user_id, offre_id, statut, limit }
  // ============================================================
  async function list(options = {}) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    let q = supa.from('wolo_candidatures').select('*');
    if (options.recruteur_user_id) q = q.eq('recruteur_user_id', options.recruteur_user_id);
    if (options.candidat_user_id)  q = q.eq('candidat_user_id', options.candidat_user_id);
    if (options.offre_id)          q = q.eq('offre_id', options.offre_id);
    if (options.statut)            q = q.eq('statut', options.statut);
    q = q.order('date_candidature', { ascending: false });
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(_toAirtableRecord);
  }

  async function findById(id) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const { data, error } = await supa.from('wolo_candidatures').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function create(fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    if (!row.candidat_user_id && window.currentUser?.id) row.candidat_user_id = window.currentUser.id;
    if (!row.statut) row.statut = 'En attente';
    if (!row.date_candidature) row.date_candidature = new Date().toISOString();
    const { data, error } = await supa.from('wolo_candidatures').insert(row).select('*').single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function update(id, fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    delete row.candidat_user_id;
    delete row.recruteur_user_id;
    const { data, error } = await supa.from('wolo_candidatures').update(row).eq('id', id).select('*').single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  async function updateStatut(id, statut) {
    return update(id, { Statut: statut });
  }

  async function setScoreIA(id, score, justification) {
    return update(id, { 'Score IA': score, 'Score IA justification': justification || '' });
  }

  window.supaCandidatures = { list, findById, create, update, updateStatut, setScoreIA };
})();
