// ================================================================
// WOLO supaAvis — adaptateur Supabase pour les Avis clients
// Format de retour Airtable {id, fields, createdTime}
// ================================================================
(function () {
  const AT_TO_SUPA = {
    'Prestataire ID':       'prestataire_id',
    'Prestataire User ID':  'prestataire_user_id',
    'prestataire_airtable_id': 'prestataire_airtable_id',
    'Auteur':               'auteur_nom',
    'Auteur Nom':           'auteur_nom',
    'Auteur User ID':       'auteur_user_id',
    'Auteur WhatsApp':      'auteur_whatsapp',
    'Auteur Photo':         'auteur_photo',
    'Note globale sur 5':   'note_globale',
    'Note':                 'note_globale',
    'Note qualité':         'note_qualite',
    'Note ponctualité':     'note_ponctualite',
    'Note communication':   'note_communication',
    'Commentaire':          'commentaire',
    'Validé':               'validated',
    'Validated':            'validated',
    'Flagged':              'flagged',
    'Date':                 'date_avis',
    'Date avis':            'date_avis',
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
  // Options : { prestataire_id, prestataire_user_id, validated, limit }
  // ============================================================
  async function list(options = {}) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    let q = supa.from('wolo_avis').select('*');
    if (options.prestataire_id)      q = q.eq('prestataire_id', options.prestataire_id);
    if (options.prestataire_user_id) q = q.eq('prestataire_user_id', options.prestataire_user_id);
    if (options.validated !== undefined) q = q.eq('validated', options.validated);
    q = q.order('date_avis', { ascending: false });
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(_toAirtableRecord);
  }

  async function create(fields) {
    const supa = _supa();
    if (!supa) throw new Error('Supabase client non chargé');
    const row = _toSupaRow(fields);
    if (!row.note_globale) throw new Error('Note globale requise');
    if (row.validated === undefined) row.validated = true;
    if (!row.date_avis) row.date_avis = new Date().toISOString().slice(0, 10);
    const { data, error } = await supa.from('wolo_avis').insert(row).select('*').single();
    if (error) throw error;
    return _toAirtableRecord(data);
  }

  // Helper : moyenne + nombre d'avis pour un prestataire (calcul côté client si trigger SQL pas dispo)
  async function statsForPrestataire(prestataireId) {
    const records = await list({ prestataire_id: prestataireId, validated: true, limit: 500 });
    if (!records.length) return { count: 0, avg: 0 };
    const sum = records.reduce((s, r) => s + Number(r.fields['Note globale sur 5'] || 0), 0);
    return { count: records.length, avg: Number((sum / records.length).toFixed(2)) };
  }

  window.supaAvis = { list, create, statsForPrestataire };
})();
