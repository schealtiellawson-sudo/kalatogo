
// ════════════════════════════════════════════════════════════
// PLAN PRO REFONTE — Tirages mensuels permanents
// ════════════════════════════════════════════════════════════

// --- Countdown vers le dernier vendredi du mois à 18h00 WAT ---
function lancerCountdown(){
  function getNextLastFriday(){function lastFri(y,m){var d=new Date(y,m+1,0,18,0,0,0);d.setDate(d.getDate()-((d.getDay()+2)%7));return d;}var now=new Date();var firstDraw=lastFri(2026,7);if(now<firstDraw)return firstDraw.getTime();var y=now.getFullYear(),m=now.getMonth();var d=lastFri(y,m);if(now>=d){m++;if(m>11){m=0;y++;}d=lastFri(y,m);}return d.getTime();}
  var cible = getNextLastFriday();
  var jEl = document.getElementById('cnt-jours');
  var hEl = document.getElementById('cnt-heures');
  var mEl = document.getElementById('cnt-minutes');
  var sEl = document.getElementById('cnt-secondes');
  if(!jEl) return;
  function tick(){
    var now = Date.now();
    var diff = cible - now;
    if(diff <= 0){
      var timer = document.getElementById('wozali-countdown-timer');
      if(timer){
        timer.innerHTML = '<div style="font-family:Georgia,serif;color:#E8940A;font-size:22px;">🏆 Le tirage a eu lieu. Voir les résultats.</div>';
      }
      clearInterval(intv);
      return;
    }
    var j = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    jEl.textContent = String(j).padStart(2,'0');
    hEl.textContent = String(h).padStart(2,'0');
    mEl.textContent = String(m).padStart(2,'0');
    sEl.textContent = String(s).padStart(2,'0');
  }
  tick();
  var intv = setInterval(tick, 1000);
}

// --- FAQ Pro accordéon ---
function initFaqPro(){
  var items = document.querySelectorAll('.wozali-faq-pro .wozali-faq-item');
  items.forEach(function(item){
    var q = item.querySelector('.wozali-faq-question');
    if(!q) return;
    q.addEventListener('click', function(){
      var wasOpen = item.classList.contains('open');
      items.forEach(function(o){ o.classList.remove('open'); });
      if(!wasOpen) item.classList.add('open');
    });
  });
}

// --- Mur des gagnants : fetch wozali_awards Supabase ---
async function chargerGagnants(){
  var container = document.getElementById('wozali-gagnants-liste');
  if(!container) return;
  try{
    var supa = window.supabase;
    if(!supa) return;
    var { data: rows, error } = await supa
      .from('wozali_awards')
      .select('*')
      .eq('gagnant', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if(error || !rows) return;
    // Normaliser au format attendu par le renderer
    var records = rows.map(function(r){
      return { fields: {
        'Nom complet': r.user_nom || r.nom || '',
        'Métier': r.metier || '',
        'Quartier': r.quartier || '',
        'Score': r.score_wozali || '',
        'Nb avis': r.nb_avis || '',
        'Montant': r.montant_fcfa || 0,
        'Mois': r.mois || ''
      }};
    });
    if(!records.length) return; // garder placeholder
    container.innerHTML = '';
    records.forEach(function(r){
      var f = r.fields || {};
      var nom = f['Nom'] || f['Nom complet'] || 'Gagnant';
      var photo = f['Photo'] && f['Photo'][0] ? f['Photo'][0].url : '';
      var initiale = (nom[0] || '?').toUpperCase();
      var metier = f['Métier'] || '';
      var quartier = f['Quartier'] || '';
      var score = f['Score'] || '';
      var nbAvis = f['Nb avis'] || f['Avis'] || '';
      var temoignage = f['Témoignage'] || '';
      var montant = f['Montant'] || '';
      var mois = f['Mois'] || '';
      var avatarStyle = photo ? 'background-image:url('+photo+');' : '';
      var card = document.createElement('div');
      card.className = 'wozali-gagnant-card';
      card.innerHTML =
        '<div class="head">'+
          '<div class="wozali-gagnant-avatar" style="'+avatarStyle+'">'+(photo?'':initiale)+'</div>'+
          '<div>'+
            '<div class="nom">'+nom+'</div>'+
            '<div class="meta">'+metier+(quartier?' · '+quartier:'')+'</div>'+
          '</div>'+
        '</div>'+
        (score?'<div class="score">Score WOZALI '+score+'/100'+(nbAvis?' · '+nbAvis+' avis':'')+'</div>':'')+
        (temoignage?'<div class="temoignage">« '+temoignage+' »</div>':'')+
        '<div><span class="montant-gagne">'+(typeof montant==='number'?montant.toLocaleString('fr-FR')+' FCFA':montant)+'</span> '+(mois?'<span class="mois">· '+mois+'</span>':'')+'</div>';
      container.appendChild(card);
    });
  }catch(e){ /* silencieux : garder placeholder */ }
}

// --- Compteurs FOMO (membres Pro / fondateurs / faq nb pro) ---
async function chargerFomoCompteurs(){
  try{
    var supa = window.supabase;
    if(!supa) return;
    var { count: nbPro } = await supa
      .from('wozali_prestataires')
      .select('*', { count: 'exact', head: true })
      .eq('abonnement', 'Pro');
    nbPro = nbPro || 0;
    var setTxt = function(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; };
    setTxt('cnt-membres-pro', nbPro);
    setTxt('faq-nb-pro', nbPro);
    var places = Math.max(0, 100 - nbPro);
    setTxt('cnt-fondateurs', places);
  }catch(e){}
}

// --- Init au DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    lancerCountdown();
    initFaqPro();
    chargerGagnants();
    chargerFomoCompteurs();
  }, 500);
});

// === Sprint 3 — Bourse de Croissance ===
async function verifierEligibiliteBourse(userId){
  if(typeof supabase==='undefined'||!supabase) return {eligible:false,raison:'supabase_indisponible'};
  const {data:profil,error}=await supabase.from('wozali_prestataires').select('abonnement, score_wozali').eq('user_id',userId).maybeSingle();
  if(error||!profil) return {eligible:false,raison:'profil_introuvable'};
  const maintenant=new Date();
  const estPro=profil?.abonnement==='Pro';
  const moisPro=2; // pro_since absent de wozali_prestataires — vérif durée gérée server-side
  const deuxMoisPro=moisPro>=2;
  const scoreOk=(profil.score_wozali||0)>=80;
  const il_y_a_30j=new Date(maintenant-30*86400000);
  const {count:nbAvisRecents}=await supabase.from('avis').select('*',{count:'exact',head:true}).eq('prestataire_id',userId).gte('created_at',il_y_a_30j.toISOString());
  const avisOk=(nbAvisRecents||0)>=4;
  const {data:avisRecents}=await supabase.from('avis').select('note').eq('prestataire_id',userId).gte('created_at',il_y_a_30j.toISOString());
  const noteMoyenne=avisRecents&&avisRecents.length>0?avisRecents.reduce((s,a)=>s+a.note,0)/avisRecents.length:0;
  const noteOk=noteMoyenne>=4.2;
  const nonGagnantRecent=true;
  const conditions={estPro,deuxMoisPro,scoreOk,avisOk,noteOk,nonGagnantRecent};
  const eligible=Object.values(conditions).every(Boolean);
  const prochainTirage=prochainVendrediFinMois();
  const joursRestants=Math.ceil((prochainTirage-maintenant)/86400000);
  return {eligible,conditions,manque:Object.entries(conditions).filter(([,v])=>!v).map(([k])=>k),nbAvisRecents:nbAvisRecents||0,noteMoyenne:Math.round(noteMoyenne*10)/10,moisPro:Math.floor(moisPro),scoreActuel:profil.score_wozali||0,prochainTirage,joursRestants};
}
function prochainVendrediFinMois(){
  function dernierVendredi(y,mo){var fin=new Date(y,mo+1,0,18,0,0,0);var j=fin.getDay();fin.setDate(fin.getDate()-((j>=5)?j-5:j+2));return fin;}
  var now=new Date();var y=now.getFullYear(),mo=now.getMonth();
  var dv=dernierVendredi(y,mo);
  if(dv.getTime()<=now.getTime()){mo++;if(mo>11){mo=0;y++;}dv=dernierVendredi(y,mo);}
  return dv.getTime();
}
async function afficherWidgetBourse(userId){
  const c=document.getElementById('widget-bourse');if(!c)return;
  const r=await verifierEligibiliteBourse(userId);
  if(r.raison){c.innerHTML='';return;}
  const {eligible,conditions,manque,joursRestants,prochainTirage}=r;
  const dateFmt=new Date(prochainTirage).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  if(!conditions.estPro){
    c.innerHTML=`<div class="widget-bourse etat-non-pro"><div class="widget-header"><span class="widget-icon">🏆</span><span class="widget-titre">BOURSE DE CROISSANCE</span><span class="badge-statut rouge">Non éligible</span></div><p class="widget-montant-preview"><span class="montant-juillet">300 000 FCFA</span><span class="montant-label">lancement juin</span></p><p>La Bourse de Croissance est réservée aux membres Pro.</p><a href="#abonnement" class="widget-cta">→ Passer au Plan Pro pour participer</a></div>`;return;
  }
  if(!eligible){
    const act={scoreOk:`→ Il te manque ${80-r.scoreActuel} points de Score WOZALI`,avisOk:`→ Il te manque ${4-r.nbAvisRecents} avis clients récents`,noteOk:`→ Ta note moyenne (${r.noteMoyenne}★) doit atteindre 4,2★`};
    c.innerHTML=`<div class="widget-bourse etat-incomplet"><div class="widget-header"><span class="widget-icon">🏆</span><span class="widget-titre">BOURSE DE CROISSANCE</span><span class="badge-statut orange">Incomplet</span></div><p>Tirage le <strong>${dateFmt}</strong> — dans ${joursRestants} jours.</p><p>Tu es éligible en durée. Mais il te manque :</p><ul class="widget-manque">${manque.filter(m=>act[m]).map(m=>`<li>${act[m]}</li>`).join('')}</ul><p class="widget-urgence">Il reste ${joursRestants} jours avant le tirage.</p></div>`;return;
  }
  c.innerHTML=`<div class="widget-bourse etat-eligible"><div class="widget-header"><span class="widget-icon">🏆</span><span class="widget-titre">BOURSE DE CROISSANCE</span><span class="badge-statut or">✓ Éligible</span></div><div class="widget-eligible-checks"><span>✓ Plan Pro actif</span><span>✓ Score WOZALI : ${r.scoreActuel}/100</span><span>✓ ${r.nbAvisRecents} avis clients récents</span></div><p>Prochain tirage : <strong>${dateFmt} à 18h00</strong></p><p class="widget-countdown-mini" id="bourse-mini-countdown"></p><p class="widget-sub">Reste actif. Reste Pro. Tu es dans la course.</p></div>`;
  lancerMiniCountdown('bourse-mini-countdown',new Date(prochainTirage));
}
function lancerMiniCountdown(id,cible){function maj(){const e=document.getElementById(id);if(!e)return;const d=cible-new Date();if(d<=0){e.textContent='Le tirage a lieu maintenant.';return;}const j=Math.floor(d/86400000),h=Math.floor((d%86400000)/3600000),m=Math.floor((d%3600000)/60000);e.textContent=`J-${j} · ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}min`;}maj();setInterval(maj,60000);}

// === Recalcul Score WOZALI ===
async function majActiviteEtScore(userId){
  if(typeof supabase==='undefined'||!supabase)return;
  // activité trackée côté server (cron score-wozali) — pas de mise à jour directe ici
  await recalculerScoreWozali(userId);
}
async function recalculerScoreWozali(userId){
  if(typeof supabase==='undefined'||!supabase)return 0;
  const {data:p}=await supabase.from('wozali_prestataires').select('*').eq('user_id',userId).maybeSingle();
  if(!p)return 0;
  const {data:avis}=await supabase.from('avis').select('note').eq('prestataire_id',userId);
  const nbPhotos=0; // photos trackées dans wozali_prestataires colonnes photo_realisation_*
  const profilComplet=calculerCompletudeProfile(p)*0.30;
  const noteMoyenne=avis&&avis.length>0?(avis.reduce((s,a)=>s+a.note,0)/avis.length/5)*25:0;
  const nbAvis=Math.min((avis?.length||0),20)/20*15;
  const photos=Math.min((nbPhotos||0),5)/5*10;
  const vues=Math.min((p.nb_vues||0),500)/500*10;
  const activite=p.derniere_activite&&(new Date()-new Date(p.derniere_activite))<14*86400000?10:0;
  const total=Math.min(Math.round(profilComplet+noteMoyenne+nbAvis+photos+vues+activite),100);
  await supabase.from('wozali_prestataires').update({score_wozali:total}).eq('user_id',userId);
  return total;
}
function calculerCompletudeProfile(p){const c=[p.nom_complet||p.nom,p.telephone,p.metier_principal||p.metier,p.description_services||p.description,p.photo_profil||p.photo_url,p.ville,p.quartier,p.tarif_min];return c.filter(Boolean).length/c.length*100;}

document.addEventListener('DOMContentLoaded',()=>{
  if(typeof window!=='undefined'&&window.currentUser&&window.currentUser.id){
    afficherWidgetBourse(window.currentUser.id);
  }
});

// =========================================================
// === Sprint 4 — Top 50 + WOZALI Match ========
// =========================================================

// --- Top 50 ---
async function calculerEtSauvegarderTop50(){
  if(typeof supabase==='undefined'||!supabase)return [];
  try{
    const {data}=await supabase.from('wozali_prestataires').select('user_id, nom_complet, metier_principal, photo_profil, ville, pays, score_wozali').order('score_wozali',{ascending:false}).limit(50);
    return data||[];
  }catch(e){console.warn('[top50 calc]',e);return [];}
}
async function afficherTop50(paysFiltre){
  const container=document.getElementById('top50-liste');if(!container)return;
  container.innerHTML='<div class="awards-vide">Chargement du Top 50…</div>';
  let list=await calculerEtSauvegarderTop50();
  if(paysFiltre&&paysFiltre!=='tous')list=list.filter(p=>(p.pays||'').toLowerCase().includes(paysFiltre.toLowerCase()));
  if(!list.length){container.innerHTML='<div class="awards-vide">Aucun prestataire classé pour le moment. Active ton profil pour apparaître ici.</div>';return;}
  container.innerHTML=list.map((p,i)=>{
    const rang=i+1;const rangCls=rang<=3?`rang-${rang}`:'';const top10=rang<=10?'<span class="badge-top10">TOP 10</span>':'';
    const score=p.score_wozali||0;
    return `<div class="top50-card"><div class="top50-rang-col"><span class="top50-rang ${rangCls}">#${rang}</span>${top10}</div><img class="top50-photo" src="${encodeURI(p.photo_profil||p.photo_url||'')}" alt=""><div class="top50-info"><strong class="top50-nom">${escapeHtml(p.nom_complet||p.nom||'—')}</strong><span>${escapeHtml(p.metier_principal||p.metier||'')}</span><span>${escapeHtml(p.ville||'')} ${p.pays?('· '+escapeHtml(p.pays)):''}</span><div class="top50-score-bar"><div class="top50-score-fill" style="width:${score}%"></div></div></div><a class="top50-voir" href="#" onclick="showPage('profil','${p.user_id||p.id}');return false;">Voir →</a></div>`;
  }).join('');
}
document.addEventListener('click',(e)=>{
  const b=e.target.closest('.top50-filtre');
  if(b){document.querySelectorAll('.top50-filtre').forEach(x=>x.classList.remove('active'));b.classList.add('active');afficherTop50(b.dataset.pays);}
});

// --- WOZALI Match ---
const SYNONYMES_METIERS={'dev':'developpeur','développeur':'developpeur','developer':'developpeur','web':'developpeur','coiffure':'coiffeur','coiffeuse':'coiffeur','menuisier':'menuiserie','electricien':'electricite','électricien':'electricite','plombier':'plomberie','maçon':'maconnerie','macon':'maconnerie'};
function normaliserMetier(m){if(!m)return '';const n=m.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return SYNONYMES_METIERS[n]||n;}

async function calculerMatchsCandidatPourDashboard(userId){
  if(typeof supabase==='undefined'||!supabase)return [];
  try{
    const {data:p}=await supabase.from('wozali_prestataires').select('metier_principal, ville, pays, score_wozali').eq('user_id',userId).maybeSingle();
    if(!p)return [];
    const {data:offres}=await supabase.from('offres_emploi').select('*').eq('actif',true).limit(50);
    if(!offres)return [];
    const mProfil=normaliserMetier(p.metier_principal||p.metier);
    return offres.map(o=>{
      let score=0;
      if(normaliserMetier(o.metier)===mProfil)score+=50;
      if(o.ville&&(p.ville)&&o.ville.toLowerCase()===(p.ville||'').toLowerCase())score+=25;
      if(o.pays&&(p.pays)&&o.pays.toLowerCase()===(p.pays||'').toLowerCase())score+=15;
      if((p.score_wozali||0)>=70)score+=10;
      return {...o,match_score:score};
    }).filter(o=>o.match_score>=50).sort((a,b)=>b.match_score-a.match_score).slice(0,5);
  }catch(e){console.warn('[matchs]',e);return [];}
}
async function calculerMatchsEmployeurPourOffre(offre){
  if(typeof supabase==='undefined'||!supabase)return [];
  try{
    const {data:profs}=await supabase.from('wozali_prestataires').select('user_id, nom_complet, metier_principal, photo_profil, ville, quartier, pays, score_wozali').order('score_wozali',{ascending:false}).limit(100);
    if(!profs)return [];
    const mOffre=normaliserMetier(offre.metier);
    return profs.map(p=>{
      let score=0;
      if(normaliserMetier(p.metier_principal||p.metier)===mOffre)score+=50;
      if(p.ville&&offre.ville&&p.ville.toLowerCase()===offre.ville.toLowerCase())score+=25;
      if(p.pays&&offre.pays&&p.pays.toLowerCase()===offre.pays.toLowerCase())score+=15;
      if((p.score_wozali||0)>=70)score+=10;
      return {...p,match_score:score};
    }).filter(p=>p.match_score>=50).sort((a,b)=>b.match_score-a.match_score).slice(0,5);
  }catch(e){console.warn('[matchsEmp]',e);return [];}
}

async function afficherMatchsDashboard(userId){
  const c=document.getElementById('section-matchs-prioritaires');if(!c)return;
  const matchs=await calculerMatchsCandidatPourDashboard(userId);
  if(!matchs.length){c.innerHTML=`<div class="matchs-header"><h4>🎯 Offres pour toi</h4></div><p class="matchs-vide">Pas de match aujourd'hui. On t'alerte dès qu'une offre correspond.</p><button class="match-btn" onclick="activerAlerteMatch('${userId}')">Activer les alertes</button>`;return;}
  c.innerHTML=`<div class="matchs-header"><h4>🎯 Offres prioritaires pour toi</h4><p>Ton profil matche avec ${matchs.length} offre(s).</p></div><div class="matchs-liste">${matchs.map(o=>`<div class="match-card"><div class="match-score-badge">${o.match_score}%</div><div class="match-info"><strong>${o.titre||o.metier||'Offre'}</strong><span>${o.ville||''} ${o.pays?('· '+o.pays):''}</span></div><button class="match-btn" onclick="showPage('emploi')">Voir</button></div>`).join('')}</div><a class="voir-toutes-offres" href="#" onclick="showPage('emploi');return false;">Voir toutes les offres →</a>`;
}
async function activerAlerteMatch(userId){
  if(typeof supabase==='undefined'||!supabase)return;
  try{await supabase.from('wozali_prestataires').update({alerte_match:true}).eq('user_id',userId);alert('🔔 Alertes activées. Tu seras notifié dès qu\'une offre correspond.');}catch(e){ /* champ optionnel */ }
}

async function afficherTalentsRecommandesApresPublication(offre){
  const c=document.getElementById('talents-recommandes-container');if(!c)return;
  const talents=await calculerMatchsEmployeurPourOffre(offre);
  if(!talents.length){c.innerHTML='';return;}
  c.innerHTML=`<div class="section-matchs"><div class="matchs-header"><h4>🎯 Pros qui matchent ton offre</h4></div>${talents.map(t=>`<div class="talent-card"><img class="talent-photo" src="${encodeURI(t.photo_profil||t.photo_url||'')}" alt=""><div class="talent-info"><strong>${escapeHtml(t.nom_complet||t.nom||'—')}</strong><span>${escapeHtml(t.metier_principal||t.metier||'')} · ${escapeHtml(t.ville||'')}</span><span class="talent-match-score">Match ${t.match_score}%</span></div><a class="talent-contact-btn" href="#" onclick="showPage('profil','${t.user_id||t.id}');return false;">Contacter</a></div>`).join('')}</div>`;
}
// alias sans "Apres" au cas où référencé
const afficherTalentsRecommandesAprePublication=afficherTalentsRecommandesApresPublication;

// --- Realtime offres_emploi ---
try{
  if(typeof supabase!=='undefined'&&supabase?.channel){
    supabase.channel('offres_emploi_realtime').on('postgres_changes',{event:'INSERT',schema:'public',table:'offres_emploi'},(payload)=>{
      if(window.currentUser?.id)afficherMatchsDashboard(window.currentUser.id);
    }).subscribe();
  }
}catch(e){console.warn('[realtime offres]',e);}

// --- Auto-init Sprint 4 ---
document.addEventListener('DOMContentLoaded',()=>{
  try{afficherTop50('tous');}catch(e){}
  if(window.currentUser?.id){
    try{afficherMatchsDashboard(window.currentUser.id);}catch(e){}
  }
});



/* ══════════════════════════════════════════
   SPRINT 8 — FEED SOCIAL WOZALI (JS enrichi)
   ══════════════════════════════════════════ */
(function(){
  'use strict';

  // Globals
  window.feedPage = 0;
  window.feedChargement = false;
  window.feedFini = false;
  window.feedOngletActif = 'pour-toi';
  window.feedSousFiltre = 'tous';
  window.feedTalentTab = 'profils';

  function _sb() { return window.supabase || null; }
  async function _currentUser() {
    if (window.currentUser && window.currentUser.id) return window.currentUser;
    try {
      const sb = _sb(); if (!sb) return null;
      const { data } = await sb.auth.getUser();
      return data?.user || null;
    } catch(e) { return null; }
  }

  window.escapeHtml = window.escapeHtml || function(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  window.getDateRelative = function(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    if (m < 1) return 'à l\'instant';
    if (m < 60) return `il y a ${m}min`;
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h/24)}j`;
  };

  if (typeof window.majActiviteEtScore !== 'function') {
    window.majActiviteEtScore = async function(/*userId, type*/) { /* no-op */ };
  }

  // Popup inscription (redirige vers showPage inscription)
  window.verifierConnexionOuPopup = async function(action) {
    action = action || 'interagir';
    const user = await _currentUser();
    if (user) return user;
    const popup = document.createElement('div');
    popup.className = 'wozali-popup-overlay';
    popup.innerHTML = `
      <div class="wozali-popup">
        <button class="popup-close" onclick="this.closest('.wozali-popup-overlay').remove()">✕</button>
        <h3>Crée ton compte pour ${escapeHtml(action)}</h3>
        <p>Gratuit · 30 secondes · Sans carte bancaire.</p>
        <a class="wozali-btn-primary" onclick="document.querySelector('.wozali-popup-overlay')?.remove(); showPage('inscription');">→ Créer mon compte gratuit</a>
        <p class="popup-login">Déjà un compte ? <a onclick="document.querySelector('.wozali-popup-overlay')?.remove(); showPage('login');">Se connecter</a></p>
      </div>
    `;
    document.body.appendChild(popup);
    return null;
  };

  // Stories enrichies — système Instagram/TikTok complet (24h, halo, seen/unseen)
  window.chargerStoriesWOZALI = async function() {
    const container = document.getElementById('wozali-stories');
    if (!container) return;
    const sb = _sb();
    const user = await _currentUser();

    // Set global utilisé pour les halos sur les cartes et pages profil
    if (!window._storyUserIds) window._storyUserIds = new Set();
    else window._storyUserIds.clear();

    const cutoff = new Date(Date.now() - 86400000).toISOString();
    let storiesItems = [];
    let aLaUne = [];
    let myStories = [];

    // 1. Ma propre story + stories des gens suivis (si connecté)
    if (sb && user) {
      try {
        // Story perso
        const { data: ms } = await sb.from('wozali_stories')
          .select('*').eq('user_id', user.id).gte('created_at', cutoff)
          .order('created_at', { ascending: true });
        myStories = ms || [];
        if (myStories.length) window._storyUserIds.add(user.id);
      } catch(e) {}
      try {
        const { data: abos } = await sb.from('wozali_abonnements')
          .select('suivi_id').eq('suiveur_id', user.id).limit(30);
        if (abos && abos.length) {
          const suiviIds = abos.map(a => a.suivi_id);
          const { data: rawStories } = await sb.from('wozali_stories')
            .select('user_id').in('user_id', suiviIds).gte('created_at', cutoff);
          const uids = [...new Set((rawStories||[]).map(s => s.user_id))];
          if (uids.length) {
            const { data: profils } = await sb.from('wozali_prestataires')
              .select('user_id, nom_complet, photo_profil').in('user_id', uids);
            const pMap = {};
            for (const p of (profils||[])) pMap[p.user_id] = p;
            for (const uid of uids) {
              const pr = pMap[uid] || {};
              const seen = !!localStorage.getItem('wz_story_seen_'+uid);
              window._storyUserIds.add(uid);
              storiesItems.push({ userId: uid, nom: (pr.nom_complet||'Pro').split(' ')[0], photo: pr.photo_profil||'', seen });
            }
            storiesItems.sort((a, b) => (a.seen ? 1 : 0) - (b.seen ? 1 : 0));
          }
        }
      } catch(e) {}
    }

    // 2. À la une (Pro vedette)
    try {
      if (sb) {
        const r = await sb.from('Une_Selections').select('*').eq('Active', true).limit(3);
        aLaUne = r.data || [];
        const ids = aLaUne.map(p => p.auteur_id).filter(Boolean);
        if (ids.length) {
          const { data: auteurs } = await sb.from('wozali_prestataires').select('user_id, nom_complet, photo_profil').in('user_id', ids);
          const aMap = {};
          for (const a of (auteurs||[])) aMap[a.user_id] = a;
          aLaUne.forEach(p => { p._auteur = aMap[p.auteur_id] || null; });
        }
      }
    } catch(e) {}

    // Construire le HTML
    const items = [];

    // Ma Story — ring si story active, sinon bouton "+"
    if (user) {
      const myPhoto = window.currentPrestataire?.fields?.['Photo de profil'] || window.currentPrestataire?.photo_profil || '';
      const myNom = (window.currentPrestataire?.fields?.['Nom complet'] || window.currentPrestataire?.nom_complet || 'Moi').split(' ')[0];
      if (myStories.length > 0) {
        items.push(`<div class="story-item" onclick="openProfilStory('${user.id}')"><div style="position:relative;"><div class="story-ring"><div class="story-avatar" style="background:${myPhoto ? 'transparent' : '#1a2018'}">${myPhoto ? `<img src="${escapeHtml(myPhoto)}" alt="${escapeHtml(myNom)}" loading="lazy">` : `<span style="font-size:22px;font-weight:700;color:#E8940A;">${escapeHtml(myNom.charAt(0))}</span>`}</div></div><div onclick="event.stopPropagation();openFilStoryComposer()" style="position:absolute;bottom:0;right:0;width:20px;height:20px;background:#E8940A;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#14100A;border:2px solid #0f0b07;">+</div></div><span class="story-label">${escapeHtml(myNom)}</span></div>`);
      } else {
        items.push(`<div class="story-item" onclick="openFilStoryComposer()"><div class="story-add">+</div><span class="story-label">Ma Story</span></div>`);
      }
    }

    // Bourse
    items.push(`<div class="story-item" onclick="showPage('recompenses')"><div class="story-ring bourse"><div class="story-avatar" style="background:#1a2018;"><span class="story-emoji">🏆</span></div></div><span class="story-label">Bourse</span></div>`);

    // Stories des suivis
    for (const s of storiesItems) {
      items.push(`<div class="story-item" onclick="openProfilStory('${s.userId}')"><div class="story-ring${s.seen ? ' story-ring--seen' : ''}"><div class="story-avatar" style="background:${s.photo ? 'transparent' : '#1a2018'}">${s.photo ? `<img src="${escapeHtml(s.photo)}" alt="${escapeHtml(s.nom)}" loading="lazy">` : `<span style="font-size:22px;font-weight:700;color:#E8940A;">${escapeHtml(s.nom.charAt(0))}</span>`}</div></div><span class="story-label">${escapeHtml(s.nom)}</span></div>`);
    }

    // À la une
    for (const p of aLaUne) {
      const a = p._auteur || {};
      const nom = (a.nom_complet||'Pro').split(' ')[0];
      const uid = a.user_id || p.auteur_id || '';
      items.push(`<div class="story-item" onclick="${uid ? `showProfil('${uid}')` : ''}"><div class="story-ring"><div class="story-avatar" style="background:${a.photo_profil ? 'transparent' : '#1a2018'}">${a.photo_profil ? `<img src="${escapeHtml(a.photo_profil)}" alt="${escapeHtml(nom)}" loading="lazy">` : `<span class="story-emoji">⭐</span>`}</div></div><span class="story-label">${escapeHtml(nom)}</span></div>`);
    }

    container.innerHTML = `<div class="stories-scroll">${items.join('')}</div>`;
    window._reapplyStoryHalos?.();
  };

  // Coup du jour
  window.chargerCoupDuJour = async function() {
    const container = document.getElementById('coup-du-jour');
    if (!container) return;
    container.innerHTML = '';
    const sb = _sb(); if (!sb) return;
    const aujourd_hui = new Date().toISOString().slice(0,10);
    let post = null;
    try {
      const r = await sb.from('wozali_posts')
        .select('*')
        .eq('coup_du_jour', true)
        .eq('coup_du_jour_date', aujourd_hui)
        .eq('actif', true)
        .limit(1)
        .maybeSingle();
      post = r.data;
      if (post?.auteur_id) {
        const { data: auteur } = await sb.from('wozali_prestataires').select('nom_complet, metier_principal, quartier, pays, photo_profil').eq('user_id', post.auteur_id).maybeSingle();
        if (auteur) post._auteur = auteur;
      }
    } catch(e) { post = null; }
    if (!post) return;
    const p = post._auteur ? { nom: post._auteur.nom_complet, metier: post._auteur.metier_principal, quartier: post._auteur.quartier, pays: post._auteur.pays, photo_url: post._auteur.photo_profil } : { nom: 'Prestataire', metier: '', quartier: '' };
    container.innerHTML = `
      <div class="coup-du-jour-card">
        <div class="coup-header">
          <span class="coup-badge">⭐ COUP DU JOUR</span>
          <span class="coup-date">${new Date().toLocaleDateString('fr-FR', { weekday:'long' })}</span>
        </div>
        <div class="coup-media">
          ${post.media_type === 'video'
            ? `<video src="${escapeHtml(post.media_url)}" controls playsinline class="coup-video"></video>`
            : `<img src="${escapeHtml(post.media_url || '')}" class="coup-photo" alt="Réalisation" loading="lazy">`}
          ${post.verifie_client ? '<span class="coup-verifie">✅ Vérifié par le client</span>' : ''}
        </div>
        <div class="coup-footer">
          <div class="coup-auteur">
            <img src="${escapeHtml(p.photo_url || '')}" class="coup-auteur-photo" alt="${escapeHtml(p.nom||'')}" onerror="this.style.display='none'" loading="lazy">
            <div>
              <strong>${escapeHtml(p.nom||'Prestataire')}</strong><br>
              <span style="font-size:12px;color:rgba(252, 224, 168,0.5);">${escapeHtml(p.metier||'')} · ${escapeHtml(p.quartier||'')} ${p.pays === 'Togo' ? '🇹🇬' : '🇧🇯'}</span>
            </div>
          </div>
          <div class="coup-actions">
            <button onclick="toggleLike('${post.id}', this)" class="action-btn">❤️ <span id="likes-${post.id}">${post.nb_likes||0}</span></button>
            <button class="coup-cta" onclick="contacterAuteur('${post.auteur_id}')">Contacter →</button>
          </div>
        </div>
      </div>
    `;
  };

  // Render post (multi-photos + badges enrichis)
  window.renderPost = function(post, currentUser) {
    const p = post.profiles || { nom: 'Prestataire', metier: '', quartier: '' };
    const isOwner = currentUser && currentUser.id === post.auteur_id;
    const dateRelative = getDateRelative(post.created_at);
    const photos = post.photos || (post.media_url ? [post.media_url] : []);
    const hasMultiPhotos = photos.length > 1;

    let mediaHtml = '';
    if (post.media_type === 'video' && post.media_url) {
      mediaHtml = `<div class="post-media"><video src="${escapeHtml(post.media_url)}" controls playsinline class="post-video"></video></div>`;
    } else if (hasMultiPhotos) {
      mediaHtml = `
        <div class="post-media">
          <div class="post-photos-carousel" id="carousel-${post.id}">
            ${photos.map(url => `<img src="${escapeHtml(url)}" class="post-img" alt="Réalisation" loading="lazy">`).join('')}
          </div>
          <div class="post-photo-dots">
            ${photos.map((_, i) => `<div class="post-photo-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
          </div>
        </div>`;
    } else if (photos.length === 1) {
      mediaHtml = `<div class="post-media"><img src="${escapeHtml(photos[0])}" class="post-img" alt="Réalisation" loading="lazy"></div>`;
    }

    return `
      <article class="feed-post" data-post-id="${post.id}">
        <div class="post-header">
          <button class="post-auteur-link" onclick="contacterAuteur('${post.auteur_id}')">
            <img src="${escapeHtml(p.photo_url || '')}" class="post-auteur-photo" alt="${escapeHtml(p.nom||'')}" loading="lazy" onerror="this.style.visibility='hidden'">
            <div class="post-auteur-info">
              <strong>${escapeHtml(p.nom || 'Prestataire')}</strong>
              <span>${escapeHtml(p.metier||'')} · ${escapeHtml(p.quartier||'')} ${p.pays === 'Togo' ? '🇹🇬' : '🇧🇯'}</span>
            </div>
          </button>
          <div class="post-header-right">
            <span class="post-date">${dateRelative}</span>
            ${post.coup_du_jour ? '<span class="post-badge-coup">⭐ COUP DU JOUR</span>' : ''}
            ${post.verifie_client ? '<span class="post-badge-verifie" title="Un client vérifié a confirmé la qualité de cette réalisation">✅ Réalisation Vérifiée</span>' : ''}
            ${p.score_wozali >= 70 ? `<span class="talent-score-badge">Score ${p.score_wozali}</span>` : ''}
          </div>
        </div>
        ${mediaHtml}
        ${post.contenu ? `<p class="post-contenu">${escapeHtml(post.contenu)}</p>` : ''}
        <div class="post-actions">
          <div class="post-actions-left">
            <button class="action-btn like-btn ${post.user_a_like ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
              <span class="like-icon">${post.user_a_like ? '❤️' : '🤍'}</span>
              <span class="like-count" id="likes-${post.id}">${post.nb_likes||0}</span>
            </button>
            <button class="action-btn" onclick="afficherCommentaires('${post.id}')">💬 <span>${post.nb_commentaires||0}</span></button>
            <button class="action-btn" onclick="partagerPost('${post.id}', ${JSON.stringify(p.nom||'').replace(/"/g,'&quot;')}, ${JSON.stringify(p.metier||'').replace(/"/g,'&quot;')}, ${JSON.stringify(p.quartier||'').replace(/"/g,'&quot;')})">📤</button>
          </div>
          <div class="post-actions-right">
            ${!isOwner
              ? `<button class="post-contact-btn" onclick="contacterAuteur('${post.auteur_id}')">Contacter →</button>`
              : `<button onclick="supprimerPost('${post.id}')" class="post-delete-btn">Supprimer</button>`}
          </div>
        </div>
        <div class="post-commentaires" id="commentaires-${post.id}" style="display:none;">
          <div class="commentaires-liste" id="liste-${post.id}"></div>
          <div class="commentaire-form">
            <input type="text" placeholder="Ajoute un commentaire..." id="input-commentaire-${post.id}" onkeydown="if(event.key==='Enter') publierCommentaire('${post.id}')">
            <button onclick="publierCommentaire('${post.id}')">→</button>
          </div>
        </div>
      </article>
    `;
  };

  window.contacterAuteur = function(auteurId) {
    try { localStorage.setItem('wozali_last_profil_id', auteurId); } catch(e){}
    if (typeof showProfil === 'function') showProfil(auteurId);
    else showPage('profil');
  };

  window.afficherEtatVideFeed = async function(onglet) {
    const liste = document.getElementById('feed-liste');
    if (!liste) return;
    const messages = {
      'pour-toi': { e: '📭', t: 'Aucun post pour le moment', s: 'Sois le premier à publier une réalisation.' },
      'abonnements': { e: '👥', t: 'Tu ne suis personne encore', s: 'Suis des prestataires pour voir leurs publications ici' },
      'ma-ville': { e: '🏙️', t: 'Rien dans ta ville pour l\'instant', s: 'Les nouveaux posts de ta ville apparaîtront ici.' },
      'talent-radar': { e: '🎯', t: 'Aucun profil trouvé', s: 'Ajuste les filtres pour découvrir des pros.' }
    };
    const m = messages[onglet] || messages['pour-toi'];
    liste.innerHTML = `<div class="feed-etat-vide"><span class="emoji">${m.e}</span><p><strong>${m.t}</strong></p><p>${m.s}</p></div>`;

    // Suggestions de Pro à suivre si onglet abonnements et vide
    if (onglet === 'abonnements') {
      const sb = _sb();
      if (!sb) return;
      try {
        const { data: pros } = await sb.from('wozali_prestataires')
          .select('user_id, nom_complet, metier_principal, photo_profil, quartier, pays, score_wozali')
          .eq('abonnement', 'Pro')
          .order('score_wozali', { ascending: false })
          .limit(5);
        if (pros && pros.length > 0) {
          liste.insertAdjacentHTML('beforeend', `
            <div class="feed-suggestions">
              <h4>Suggestions de prestataires à suivre</h4>
              ${pros.map(pr => `
                <div class="suggestion-card">
                  <img src="${escapeHtml(pr.photo_profil||pr.photo_url||'')}" class="suggestion-photo" alt="" onerror="this.style.visibility='hidden'" loading="lazy">
                  <div class="suggestion-info">
                    <strong>${escapeHtml(pr.nom_complet||pr.nom||'Prestataire')}</strong>
                    <span>${escapeHtml(pr.metier_principal||pr.metier||'')} · ${escapeHtml(pr.quartier||'')} ${pr.pays==='Togo'?'🇹🇬':'🇧🇯'}</span>
                  </div>
                  <button class="suggestion-follow-btn" onclick="suivreSuggestion('${pr.user_id}', this)">Suivre</button>
                </div>
              `).join('')}
            </div>
          `);
        }
      } catch(e) { console.warn('suggestions', e); }
    }
  };

  window.suivreSuggestion = async function(profilId, btn) {
    const user = await verifierConnexionOuPopup('suivre');
    if (!user) return;
    const sb = _sb(); if (!sb) return;
    btn.disabled = true; btn.textContent = '...';
    try {
      await sb.from('wozali_abonnements').insert({ suiveur_id: user.id, suivi_id: profilId });
      btn.textContent = '✓ Suivi'; btn.classList.add('following');
    } catch(e) {
      btn.disabled = false; btn.textContent = 'Suivre';
      console.warn('suivre', e);
    }
  };

  window.chargerFeed = async function(reset) {
    if (window.feedChargement || (window.feedFini && !reset)) return;
    window.feedChargement = true;
    const sb = _sb();
    if (!sb) { window.feedChargement = false; afficherEtatVideFeed(window.feedOngletActif); return; }

    if (reset) {
      window.feedPage = 0;
      window.feedFini = false;
      const liste = document.getElementById('feed-liste');
      if (liste) liste.innerHTML = '';
    }

    const user = await _currentUser();
    const limite = 10;
    const offset = window.feedPage * limite;

    // Afficher/masquer sous-filtres et filtres talent
    const sousFiltres = document.getElementById('feed-sous-filtres');
    const talentFiltres = document.getElementById('talent-filtres');
    if (sousFiltres) sousFiltres.style.display = window.feedOngletActif === 'ma-ville' ? 'flex' : 'none';
    if (talentFiltres) talentFiltres.style.display = window.feedOngletActif === 'talent-radar' ? 'flex' : 'none';

    // Talent Radar = charger profils, pas des posts
    if (window.feedOngletActif === 'talent-radar') {
      window.feedChargement = false;
      if (window.feedTalentTab === 'epingles') {
        chargerMesEpingles(user);
      } else {
        chargerTalentRadar(user?.id);
      }
      return;
    }

    try {
      let query = sb.from('wozali_posts')
        .select('*')
        .eq('actif', true)
        .range(offset, offset + limite - 1);

      if (window.feedOngletActif === 'pour-toi') {
        // Algorithme Pour toi : coups du jour en tête, puis vérifiés, puis score élevé, puis récents
        query = query.order('coup_du_jour', { ascending: false })
                     .order('verifie_client', { ascending: false })
                     .order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (window.feedOngletActif === 'abonnements') {
        if (!user) {
          afficherEtatVideFeed('abonnements');
          window.feedChargement = false; window.feedFini = true; return;
        }
        const { data: abos } = await sb.from('wozali_abonnements').select('suivi_id').eq('suiveur_id', user.id);
        const ids = (abos || []).map(a => a.suivi_id);
        if (ids.length === 0) {
          afficherEtatVideFeed('abonnements');
          window.feedChargement = false; window.feedFini = true; return;
        }
        query = query.in('auteur_id', ids);
      }

      if (window.feedOngletActif === 'ma-ville') {
        if (user) {
          try {
            const { data: profil } = await sb.from('wozali_prestataires').select('ville').eq('user_id', user.id).maybeSingle();
            if (profil?.ville) query = query.eq('ville', profil.ville);
          } catch(e) {}
        }
        // Sous-filtre métier
        if (window.feedSousFiltre && window.feedSousFiltre !== 'tous') {
          const metierMap = {
            'artisans': ['Coiffeur','Couturier','Menuisier','Maçon','Soudeur','Carreleur','Peintre','Décorateur'],
            'services': ['Électricien','Plombier','Photographe','DJ','Coach sportif','Développeur','Graphiste'],
            'commerce': ['Traiteur','Commerce','Vente','Restaurant']
          };
          const metiers = metierMap[window.feedSousFiltre] || [];
          if (metiers.length > 0) query = query.in('metier', metiers);
        }
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      if (!posts || posts.length === 0) {
        if (window.feedPage === 0) afficherEtatVideFeed(window.feedOngletActif);
        window.feedFini = true;
        window.feedChargement = false;
        return;
      }
      if (posts.length < limite) window.feedFini = true;

      // Enrichir les posts avec les données auteur depuis wozali_prestataires
      try {
        const auteurIds = [...new Set(posts.map(p => p.auteur_id).filter(Boolean))];
        if (auteurIds.length > 0) {
          const { data: auteurs } = await sb.from('wozali_prestataires')
            .select('user_id, nom_complet, metier_principal, quartier, pays, photo_profil, score_wozali, abonnement')
            .in('user_id', auteurIds);
          const auteurMap = {};
          for (const a of (auteurs || [])) auteurMap[a.user_id] = a;
          posts.forEach(p => {
            const a = auteurMap[p.auteur_id] || {};
            p.profiles = { nom: a.nom_complet || 'Prestataire', metier: a.metier_principal || '', quartier: a.quartier || '', pays: a.pays || '', photo_url: a.photo_profil || '', score_wozali: a.score_wozali || 0, abonnement: a.abonnement || '' };
          });
        }
      } catch(e) { console.warn('feed auteur enrich', e); }

      // Marquer les posts likés par l'utilisateur
      let likedPostIds = new Set();
      if (user && posts.length > 0) {
        try {
          const postIds = posts.map(p => p.id);
          const { data: likes } = await sb.from('wozali_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds);
          likedPostIds = new Set((likes || []).map(l => l.post_id));
        } catch(e) {}
      }

      const liste = document.getElementById('feed-liste');
      posts.forEach(p => {
        p.user_a_like = likedPostIds.has(p.id);
        liste.insertAdjacentHTML('beforeend', renderPost(p, user));
      });

      // Setup carrousel scroll dots
      posts.forEach(p => {
        const photos = p.photos || (p.media_url ? [p.media_url] : []);
        if (photos.length > 1) {
          const carousel = document.getElementById(`carousel-${p.id}`);
          if (carousel) {
            carousel.addEventListener('scroll', () => {
              const scrollLeft = carousel.scrollLeft;
              const width = carousel.offsetWidth;
              const idx = Math.round(scrollLeft / width);
              const dots = carousel.parentElement.querySelectorAll('.post-photo-dot');
              dots.forEach((d, i) => d.classList.toggle('active', i === idx));
            });
          }
        }
      });

      window.feedPage++;
    } catch(e) {
      console.warn('chargerFeed error', e);
      if (window.feedPage === 0) afficherEtatVideFeed(window.feedOngletActif);
      window.feedFini = true;
    }
    window.feedChargement = false;
  };

  // Likes
  window.toggleLike = async function(postId, btn) {
    const user = await verifierConnexionOuPopup('liker ce post');
    if (!user) return;
    const sb = _sb(); if (!sb) return;
    const isLiked = btn.classList.contains('liked');
    const countEl = document.getElementById(`likes-${postId}`);
    const current = parseInt(countEl?.textContent || '0') || 0;
    try {
      if (isLiked) {
        await sb.from('wozali_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        await sb.from('wozali_posts').update({ nb_likes: Math.max(0, current - 1) }).eq('id', postId);
        btn.classList.remove('liked');
        const ic = btn.querySelector('.like-icon'); if (ic) ic.textContent = '🤍';
        if (countEl) countEl.textContent = Math.max(0, current - 1);
      } else {
        await sb.from('wozali_likes').insert({ post_id: postId, user_id: user.id });
        await sb.from('wozali_posts').update({ nb_likes: current + 1 }).eq('id', postId);
        btn.classList.add('liked');
        const ic = btn.querySelector('.like-icon'); if (ic) ic.textContent = '❤️';
        if (countEl) countEl.textContent = current + 1;
        majActiviteEtScore(user.id, 'like');
      }
    } catch(e) { console.warn('toggleLike', e); }
  };

  window.afficherCommentaires = async function(postId) {
    const user = await verifierConnexionOuPopup('commenter');
    if (!user) return;
    const zone = document.getElementById(`commentaires-${postId}`);
    if (!zone) return;
    zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
    if (zone.style.display === 'none') return;
    const sb = _sb(); if (!sb) return;
    try {
      const { data: commentaires } = await sb.from('wozali_commentaires')
        .select('*')
        .eq('post_id', postId).eq('actif', true)
        .order('created_at', { ascending: true }).limit(20);
      // Enrichir avec auteurs
      const commentAuteurIds = [...new Set((commentaires||[]).map(c=>c.auteur_id).filter(Boolean))];
      let commentAuteurMap = {};
      if (commentAuteurIds.length > 0) {
        const { data: auteurs } = await sb.from('wozali_prestataires').select('user_id, nom_complet, photo_profil').in('user_id', commentAuteurIds);
        for (const a of (auteurs||[])) commentAuteurMap[a.user_id] = a;
      }
      const liste = document.getElementById(`liste-${postId}`);
      if (!liste) return;
      liste.innerHTML = (commentaires || []).map(c => {
        const auteur = commentAuteurMap[c.auteur_id] || {};
        const cp = { nom: auteur.nom_complet || auteur.nom || 'Utilisateur', photo_url: auteur.photo_profil || auteur.photo_url || '' };
        return `
          <div class="commentaire">
            <img src="${escapeHtml(cp.photo_url || '')}" class="commentaire-photo" alt="" onerror="this.style.visibility='hidden'" loading="lazy">
            <div class="commentaire-corps">
              <strong>${escapeHtml(cp.nom || 'Utilisateur')}</strong>
              <p>${escapeHtml(c.contenu)}</p>
              <span>${getDateRelative(c.created_at)}</span>
            </div>
          </div>`;
      }).join('') || '<p style="font-size:12px;color:rgba(252, 224, 168,0.4);">Aucun commentaire. Sois le premier.</p>';
    } catch(e) { console.warn(e); }
  };

  window.publierCommentaire = async function(postId) {
    const user = await verifierConnexionOuPopup('commenter');
    if (!user) return;
    const input = document.getElementById(`input-commentaire-${postId}`);
    const contenu = input?.value?.trim();
    if (!contenu) return;
    const sb = _sb(); if (!sb) return;
    try {
      await sb.from('wozali_commentaires').insert({ post_id: postId, auteur_id: user.id, contenu });
      // Increment count (fetch + update)
      const { data: cur } = await sb.from('wozali_posts').select('nb_commentaires').eq('id', postId).maybeSingle();
      await sb.from('wozali_posts').update({ nb_commentaires: (cur?.nb_commentaires || 0) + 1 }).eq('id', postId);
      input.value = '';
      // Re-open comments (toggle twice to refresh)
      const zone = document.getElementById(`commentaires-${postId}`);
      if (zone) zone.style.display = 'none';
      afficherCommentaires(postId);
      majActiviteEtScore(user.id, 'commentaire');
    } catch(e) { console.warn(e); }
  };

  window.partagerPost = function(postId, nom, metier, quartier) {
    const url = `${window.location.origin}${window.location.pathname}#feed-${postId}`;
    const message = encodeURIComponent(
      `👷 Regarde le travail de ${nom} sur WOZALI :\n${url}\n\n` +
      `${nom} est ${metier} à ${quartier}.\nContacte-le directement sur WOZALI.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  window.supprimerPost = async function(postId) {
    if (!confirm('Supprimer ce post ?')) return;
    const sb = _sb(); if (!sb) return;
    try {
      await sb.from('wozali_posts').update({ actif: false }).eq('id', postId);
      const el = document.querySelector(`[data-post-id="${postId}"]`);
      if (el) el.remove();
    } catch(e) { console.warn(e); }
  };

  // Zone publication
  window.afficherZonePublication = async function() {
    const zone = document.getElementById('feed-publier-zone');
    if (!zone) return;
    const user = await _currentUser();
    if (!user) {
      zone.innerHTML = `
        <div class="publier-invite">
          <p>Partage tes réalisations avec la communauté WOZALI.</p>
          <a class="wozali-btn-primary" onclick="showPage('inscription')">→ Créer mon compte gratuit</a>
        </div>`;
      return;
    }
    let photoUrl = '';
    try {
      const sb = _sb();
      if (sb) {
        const { data } = await sb.from('wozali_prestataires').select('photo_profil').eq('user_id', user.id).maybeSingle();
        photoUrl = data?.photo_profil || '';
      }
    } catch(e) {}
    zone.innerHTML = `
      <div class="publier-zone">
        <img src="${escapeHtml(photoUrl)}" class="publier-photo" alt="Moi" onerror="this.style.visibility='hidden'" loading="lazy">
        <button class="publier-btn" onclick="ouvrirModalPublication()">Partage une réalisation...</button>
        <button class="publier-btn-icon" onclick="ouvrirModalPublication()">📷</button>
      </div>`;
  };

  window.ouvrirModalPublication = async function() {
    const user = await verifierConnexionOuPopup('publier');
    if (!user) return;
    window._postFiles = [];
    const modal = document.createElement('div');
    modal.className = 'wozali-modal-overlay';
    modal.id = 'modal-publication';
    modal.innerHTML = `
      <div class="wozali-modal">
        <div class="modal-header">
          <h3>Partage une réalisation</h3>
          <button onclick="document.getElementById('modal-publication').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="upload-zone" id="upload-zone" onclick="document.getElementById('media-input').click()">
            <input type="file" id="media-input" accept="image/*,video/*" multiple style="display:none" onchange="previewMultiMedia(this)">
            <div id="upload-placeholder">
              <span class="upload-icon">📷</span>
              <p>Ajoute des photos ou une vidéo</p>
              <span style="font-size:11px;color:rgba(252, 224, 168,0.4);">JPG, PNG, MP4 · Plusieurs photos possibles</span>
            </div>
            <div id="upload-preview" style="display:none"></div>
          </div>
          <div class="upload-thumbs" id="upload-thumbs" style="display:none;"></div>
          <textarea id="post-description" placeholder="Décris ta réalisation, partage un conseil..." rows="3" maxlength="500"></textarea>
          <span class="char-count" id="char-count">0/500</span>
        </div>
        <div class="modal-footer">
          <button onclick="document.getElementById('modal-publication').remove()" class="btn-annuler">Annuler</button>
          <button onclick="publierPost()" class="wozali-btn-primary" id="btn-publier">Publier</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('post-description').addEventListener('input', function(){
      document.getElementById('char-count').textContent = `${this.value.length}/500`;
    });
  };

  // Multi-photos preview
  window.previewMultiMedia = function(input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    window._postFiles = window._postFiles || [];
    for (let i = 0; i < files.length; i++) window._postFiles.push(files[i]);
    const preview = document.getElementById('upload-preview');
    const placeholder = document.getElementById('upload-placeholder');
    const thumbs = document.getElementById('upload-thumbs');

    if (window._postFiles.length === 1 && window._postFiles[0].type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<video src="${e.target.result}" controls class="preview-media"></video>`;
        placeholder.style.display = 'none'; preview.style.display = 'block';
      };
      reader.readAsDataURL(window._postFiles[0]);
      return;
    }

    placeholder.style.display = 'none';
    preview.style.display = 'none';
    thumbs.style.display = 'flex';
    thumbs.innerHTML = '';
    window._postFiles.forEach((f, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        thumbs.insertAdjacentHTML('beforeend', `<img src="${e.target.result}" class="upload-thumb" alt="Photo ${idx+1}">`);
      };
      reader.readAsDataURL(f);
    });
    thumbs.insertAdjacentHTML('beforeend', `<div class="upload-add-more" onclick="document.getElementById('media-input').click()">+</div>`);
  };

  // Legacy single preview (backward compat)
  window.previewMedia = window.previewMultiMedia;

  window.publierPost = async function() {
    const btn = document.getElementById('btn-publier');
    if (btn) { btn.disabled = true; btn.textContent = 'Publication en cours...'; }
    const sb = _sb(); if (!sb) return;
    const user = await _currentUser();
    if (!user) { btn && (btn.disabled = false); return; }
    let profil = {};
    try {
      const r = await sb.from('wozali_prestataires').select('ville, quartier, pays, metier_principal').eq('user_id', user.id).maybeSingle();
      profil = r.data || {};
    } catch(e) {}
    const description = document.getElementById('post-description').value.trim();
    const files = window._postFiles || [];
    let photos = [], mediaUrl = null, mediaType = null;

    // Upload chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      try {
        const fileName = `posts/${user.id}/${Date.now()}_${i}.${file.name.split('.').pop()}`;
        const { data: uploadData, error: upErr } = await sb.storage.from('wozali-media').upload(fileName, file, { upsert: false });
        if (!upErr && uploadData) {
          const { data: pub } = sb.storage.from('wozali-media').getPublicUrl(fileName);
          const url = pub?.publicUrl;
          if (url) {
            if (isVideo) { mediaUrl = url; mediaType = 'video'; }
            else photos.push(url);
          }
        }
      } catch(e) { console.warn('upload', e); }
    }

    // Backward compat: si 1 seule photo, mettre aussi en media_url
    if (photos.length === 1 && !mediaUrl) { mediaUrl = photos[0]; mediaType = 'photo'; }
    else if (photos.length > 1 && !mediaUrl) { mediaUrl = photos[0]; mediaType = 'photo'; }

    if (!mediaUrl && photos.length === 0 && !description) {
      if (btn) { btn.disabled = false; btn.textContent = 'Publier'; }
      alert('Ajoute au moins une photo ou un texte.');
      return;
    }
    try {
      const postData = {
        auteur_id: user.id,
        type: 'realisation',
        contenu: description || null,
        media_url: mediaUrl,
        media_type: mediaType,
        ville: profil.ville,
        pays: profil.pays,
        metier: profil.metier_principal || profil.metier
      };
      if (photos.length > 0) postData.photos = photos;

      const { error } = await sb.from('wozali_posts').insert(postData);
      if (!error) {
        document.getElementById('modal-publication')?.remove();
        window._postFiles = [];
        if (typeof majActiviteEtScore === 'function') majActiviteEtScore(user.id, 'post');
        chargerFeed(true);
      } else {
        if (btn) { btn.disabled = false; btn.textContent = 'Publier'; }
      }
    } catch(e) {
      console.warn(e);
      if (btn) { btn.disabled = false; btn.textContent = 'Publier'; }
    }
  };

  // Talent Radar avec filtres
  window.chargerTalentRadar = async function(userId) {
    const sb = _sb(); if (!sb) return;
    const liste = document.getElementById('feed-liste');
    if (!liste) return;

    // Lire les filtres
    const filtreMetier = document.getElementById('talent-filtre-metier')?.value || '';
    const filtreVille = document.getElementById('talent-filtre-ville')?.value || '';
    const filtreNote = parseFloat(document.getElementById('talent-filtre-note')?.value || '0');
    const filtrePro = document.getElementById('talent-filtre-pro')?.checked || false;

    try {
      let query = sb.from('wozali_prestataires')
        .select('user_id, nom_complet, metier_principal, photo_profil, quartier, pays, note_moyenne, nb_avis, score_wozali, abonnement')
        .order('score_wozali', { ascending: false }).limit(20);
      if (filtreMetier) query = query.eq('metier_principal', filtreMetier);
      if (filtreVille) query = query.eq('ville', filtreVille);
      if (filtreNote > 0) query = query.gte('note_moyenne', filtreNote);
      if (filtrePro) query = query.eq('abonnement', 'Pro');

      const { data: talents } = await query;
      if (!talents || talents.length === 0) { afficherEtatVideFeed('talent-radar'); return; }

      liste.innerHTML = `
        <div class="talent-radar-section">
          <span class="eyebrow">🎯 ${talents.length} PROFIL${talents.length > 1 ? 'S' : ''} DISPONIBLE${talents.length > 1 ? 'S' : ''}</span>
          <div class="talent-radar-grid">
            ${talents.map(t => `
              <div class="talent-radar-card">
                <img src="${escapeHtml(t.photo_profil||t.photo_url||'')}" class="talent-photo" alt="${escapeHtml(t.nom_complet||t.nom||'')}" onerror="this.style.visibility='hidden'" loading="lazy">
                <div class="talent-info">
                  <strong>${escapeHtml(t.nom_complet||t.nom||'')}</strong>
                  <span>${escapeHtml(t.metier_principal||t.metier||'')} · ${escapeHtml(t.quartier||'')} ${t.pays === 'Togo' ? '🇹🇬' : '🇧🇯'}</span>
                  <span>⭐ ${t.note_moyenne || '—'}/5 · ${t.nb_avis || 0} avis</span>
                  <div style="display:flex;gap:6px;margin-top:4px;">
                    <span class="talent-score-badge">Score ${t.score_wozali || 0}</span>
                    ${t.abonnement === 'Pro' ? '<span class="talent-pro-badge">PRO</span>' : ''}
                  </div>
                </div>
                <div class="talent-actions">
                  <button onclick="epinglerTalent('${t.user_id||t.id}', this)" class="btn-epingler">📌 Épingler</button>
                  <button class="wozali-btn-primary" style="font-size:12px;padding:6px 12px;" onclick="contacterAuteur('${t.user_id||t.id}')">Voir →</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    } catch(e) { console.warn(e); afficherEtatVideFeed('talent-radar'); }
  };

  // Épingler un talent
  window.epinglerTalent = async function(talentId, btn) {
    const user = await verifierConnexionOuPopup('épingler un pro');
    if (!user) return;
    const sb = _sb(); if (!sb) return;
    try {
      const noteInput = prompt('Ajoute une note personnelle (optionnel) :');
      await sb.from('wozali_epingles').upsert({
        recruteur_id: user.id, profil_id: talentId, note: noteInput || null
      }, { onConflict: 'recruteur_id,profil_id' });
      if (btn) { btn.textContent = '✓ Épinglé'; btn.disabled = true; btn.style.color = '#E8940A'; }
    } catch(e) { console.warn(e); }
  };

  // Mes épingles
  window.chargerMesEpingles = async function(user) {
    const liste = document.getElementById('feed-liste');
    if (!liste) return;
    if (!user) { liste.innerHTML = '<div class="feed-etat-vide"><span class="emoji">📌</span><p><strong>Connecte-toi pour voir tes épingles</strong></p></div>'; return; }
    const sb = _sb(); if (!sb) return;
    try {
      const { data: epingles } = await sb.from('wozali_epingles')
        .select('*')
        .eq('recruteur_id', user.id)
        .order('created_at', { ascending: false });
      if (!epingles || epingles.length === 0) {
        liste.innerHTML = '<div class="feed-etat-vide"><span class="emoji">📌</span><p><strong>Aucun profil épinglé</strong></p><p>Épingle des profils depuis l\'onglet Profils pour les retrouver ici.</p></div>';
        return;
      }
      // Enrichir avec wozali_prestataires
      const profilIds = epingles.map(ep => ep.profil_id).filter(Boolean);
      let profilMap = {};
      if (profilIds.length > 0) {
        const { data: profils } = await sb.from('wozali_prestataires')
          .select('user_id, nom_complet, metier_principal, photo_profil, quartier, pays, score_wozali, note_moyenne, nb_avis')
          .in('user_id', profilIds);
        for (const p of (profils || [])) profilMap[p.user_id] = p;
      }
      liste.innerHTML = `
        <div class="talent-radar-section">
          <span class="eyebrow">📌 MES ÉPINGLES (${epingles.length})</span>
          <div class="talent-radar-grid">
            ${epingles.map(ep => {
              const t = profilMap[ep.profil_id] || {};
              return `
                <div class="epingle-card">
                  <img src="${escapeHtml(t.photo_profil||t.photo_url||'')}" class="talent-photo" alt="" onerror="this.style.visibility='hidden'" loading="lazy">
                  <div class="talent-info" style="flex:1;">
                    <strong>${escapeHtml(t.nom_complet||t.nom||'')}</strong>
                    <span>${escapeHtml(t.metier_principal||t.metier||'')} · ${escapeHtml(t.quartier||'')} ${t.pays==='Togo'?'🇹🇬':'🇧🇯'}</span>
                    <span>⭐ ${t.note_moyenne||'—'}/5 · Score ${t.score_wozali||0}</span>
                    ${ep.note ? `<span style="color:#E8940A;font-style:italic;font-size:11px;">📝 ${escapeHtml(ep.note)}</span>` : ''}
                  </div>
                  <div class="talent-actions">
                    <button class="wozali-btn-primary" style="font-size:12px;padding:6px 12px;" onclick="contacterAuteur('${t.user_id||t.id||ep.profil_id}')">Voir →</button>
                    <button class="btn-epingler" onclick="retirerEpingle('${ep.id}', this)" style="color:#ff6b6b;border-color:rgba(255,107,107,0.3);">✕</button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    } catch(e) { console.warn(e); }
  };

  window.retirerEpingle = async function(epingleId, btn) {
    if (!confirm('Retirer cette épingle ?')) return;
    const sb = _sb(); if (!sb) return;
    try {
      await sb.from('wozali_epingles').delete().eq('id', epingleId);
      const card = btn.closest('.epingle-card');
      if (card) card.remove();
    } catch(e) { console.warn(e); }
  };

  window.switchTalentTab = function(tab) {
    window.feedTalentTab = tab;
    document.querySelectorAll('.talent-sub-tab').forEach(b => b.classList.toggle('active', b.dataset.ttab === tab));
    _currentUser().then(u => {
      if (tab === 'epingles') chargerMesEpingles(u);
      else chargerTalentRadar(u?.id);
    });
  };

  // Notifications feed (quota)
  window.envoyerNotificationFeed = async function(userId, type, titre, corps, url) {
    const sb = _sb(); if (!sb) return;
    const heure = new Date().getHours();
    if (heure >= 22 || heure < 7) return;
    const aujourd_hui = new Date().toISOString().slice(0,10);
    try {
      const { count } = await sb.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', `${aujourd_hui}T00:00:00`)
        .in('type', ['feed_like','feed_commentaire','coup_du_jour']);
      if ((count || 0) >= 3) return;
      await sb.from('notifications').insert({ user_id: userId, type, titre, corps, url, lu: false });
    } catch(e) { console.warn(e); }
  };

  // Init feed (appelé par showPage('feed'))
  window.initFeedWOZALI = function() {
    chargerStoriesWOZALI();
    chargerCoupDuJour();
    chargerFeed(true);
    afficherZonePublication();

    // FAB visibility
    const fab = document.getElementById('feed-fab');
    if (fab) fab.style.display = 'flex';

    if (window.__feedInited) return;
    window.__feedInited = true;

    // Infinite scroll
    const sentinel = document.getElementById('feed-sentinel');
    if (sentinel && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && window.feedOngletActif !== 'talent-radar') chargerFeed();
      }, { threshold: 0.1 });
      obs.observe(sentinel);
    }

    // Onglet clicks
    document.querySelectorAll('.feed-onglet').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.feed-onglet').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.feedOngletActif = btn.dataset.feed;
        chargerFeed(true);
      });
    });

    // Sous-filtres Ma ville
    document.querySelectorAll('.sous-filtre').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sous-filtre').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.feedSousFiltre = btn.dataset.sf;
        chargerFeed(true);
      });
    });

    // Talent Radar filtres change
    ['talent-filtre-metier','talent-filtre-ville','talent-filtre-note','talent-filtre-pro'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        _currentUser().then(u => chargerTalentRadar(u?.id));
      });
    });

    // Vérifier notifications non lues
    checkFeedNotifications();
  };

  // Badge notification feed
  window.checkFeedNotifications = async function() {
    const badge = document.getElementById('feed-notif-badge');
    if (!badge) return;
    const user = await _currentUser();
    if (!user) { badge.style.display = 'none'; return; }
    const sb = _sb(); if (!sb) return;
    try {
      const { count } = await sb.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('lu', false);
      badge.style.display = (count && count > 0) ? 'block' : 'none';
    } catch(e) { badge.style.display = 'none'; }
  };

  // ══ WOZALI MATCH ══
  window.initWozaliMatch = async function() {
    const user = await _currentUser();
    if (user) chargerMesDemandesMatch(user.id);
  };

  window.lancerWozaliMatch = async function() {
    const user = await verifierConnexionOuPopup('créer une demande');
    if (!user) return;
    const sb = _sb(); if (!sb) return;
    const description = document.getElementById('match-description')?.value?.trim();
    const metier = document.getElementById('match-metier')?.value;
    const ville = document.getElementById('match-ville')?.value;
    const budget = parseInt(document.getElementById('match-budget')?.value) || null;

    if (!description || !metier) { alert('Remplis au moins la description et le métier.'); return; }

    try {
      // 1. Créer la demande
      await sb.from('wozali_match_demandes').insert({
        client_id: user.id,
        description, metier_recherche: metier, ville: ville || null, budget_max: budget, statut: 'ouvert'
      });

      // 2. Chercher les prestataires correspondants
      let query = sb.from('wozali_prestataires')
        .select('user_id, nom_complet, metier_principal, photo_profil, quartier, pays, score_wozali, abonnement')
        .ilike('metier_principal', `%${metier}%`)
        .order('score_wozali', { ascending: false })
        .limit(10);
      if (ville) query = query.eq('ville', ville);

      const { data: pros } = await query;
      const container = document.getElementById('match-resultats');
      const liste = document.getElementById('match-resultats-liste');
      if (!pros || pros.length === 0) {
        container.style.display = 'block';
        liste.innerHTML = '<div class="feed-etat-vide"><span class="emoji">😕</span><p><strong>Aucun prestataire trouvé</strong></p><p>Essaie avec un autre métier ou une autre ville.</p></div>';
        return;
      }

      container.style.display = 'block';
      liste.innerHTML = pros.map(pr => `
        <div class="match-result-card">
          <img src="${escapeHtml(pr.photo_profil||pr.photo_url||'')}" class="match-result-photo" alt="" onerror="this.style.visibility='hidden'" loading="lazy">
          <div class="match-result-info">
            <strong>${escapeHtml(pr.nom_complet||pr.nom||'')} ${pr.abonnement==='Pro'?'<span class="talent-pro-badge">PRO</span>':''}</strong>
            <span>${escapeHtml(pr.metier_principal||pr.metier||'')} · ${escapeHtml(pr.quartier||'')} ${pr.pays==='Togo'?'🇹🇬':'🇧🇯'}</span>
          </div>
          <div class="match-result-score">
            ${pr.score_wozali||0}
            <small>Score</small>
          </div>
          <button class="wozali-btn-primary" style="font-size:13px;padding:8px 14px;" onclick="contacterAuteur('${pr.user_id||pr.id}')">Contacter</button>
        </div>
      `).join('');

      // 3. Notifier les prestataires correspondants (max 5)
      const top5 = pros.slice(0, 5);
      for (const pr of top5) {
        try {
          await envoyerNotificationFeed(pr.user_id||pr.id, 'wozali_match', '🤝 Nouvelle demande WOZALI Match',
            `Un client cherche un ${metier}${ville ? ' à ' + ville : ''}. Regarde si ça correspond !`,
            '#dashboard');
        } catch(e) {}
      }

      // Refresh mes demandes
      chargerMesDemandesMatch(user.id);
    } catch(e) { console.warn('match', e); alert('Erreur lors de la création de la demande.'); }
  };

  window.chargerMesDemandesMatch = async function(userId) {
    const container = document.getElementById('match-demandes-liste');
    if (!container) return;
    const sb = _sb(); if (!sb) return;
    try {
      const { data: demandes } = await sb.from('wozali_match_demandes')
        .select('*').eq('client_id', userId)
        .order('created_at', { ascending: false }).limit(10);
      if (!demandes || demandes.length === 0) {
        container.innerHTML = '<p style="color:rgba(252, 224, 168,0.4);font-size:13px;">Aucune demande pour le moment.</p>';
        return;
      }
      container.innerHTML = demandes.map(d => `
        <div class="match-demande-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="color:#FCE0A8;font-family:Georgia,serif;">${escapeHtml(d.metier_recherche)}</strong>
            <span class="match-statut ${d.statut}">${d.statut === 'ouvert' ? '🟢 Ouvert' : d.statut === 'en_cours' ? '🟡 En cours' : '⚪ Fermé'}</span>
          </div>
          <p style="font-size:13px;color:rgba(252, 224, 168,0.7);margin:0 0 8px;">${escapeHtml(d.description)}</p>
          <div style="display:flex;gap:12px;font-size:12px;color:rgba(252, 224, 168,0.4);">
            ${d.ville ? `<span>📍 ${escapeHtml(d.ville)}</span>` : ''}
            ${d.budget_max ? `<span>💰 Budget max: ${d.budget_max.toLocaleString()} FCFA</span>` : ''}
            <span>${getDateRelative(d.created_at)}</span>
          </div>
          ${d.statut === 'ouvert' ? `<button onclick="fermerDemande('${d.id}')" style="margin-top:8px;background:none;border:1px solid rgba(252, 224, 168,0.15);color:rgba(252, 224, 168,0.5);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">Fermer la demande</button>` : ''}
        </div>
      `).join('');
    } catch(e) { console.warn(e); }
  };

  window.fermerDemande = async function(demandeId) {
    if (!confirm('Fermer cette demande ?')) return;
    const sb = _sb(); if (!sb) return;
    try {
      await sb.from('wozali_match_demandes').update({ statut: 'fermé' }).eq('id', demandeId);
      const user = await _currentUser();
      if (user) chargerMesDemandesMatch(user.id);
    } catch(e) { console.warn(e); }
  };

  // ====== WOZALI MATCH — Mode switch + Mode Travail ======
  window.switchMatchMode = function(mode) {
    const btnClient = document.getElementById('match-mode-client');
    const btnTravail = document.getElementById('match-mode-travail');
    const formClient = document.getElementById('match-form-client');
    const formTravail = document.getElementById('match-form-travail');
    const resClient = document.getElementById('match-resultats');
    const resTravail = document.getElementById('match-resultats-travail');

    if (mode === 'client') {
      btnClient.style.background = 'rgba(232,148,10,0.15)';
      btnClient.style.color = '#E8940A';
      btnTravail.style.background = 'rgba(255,255,255,0.02)';
      btnTravail.style.color = 'rgba(252, 224, 168,0.5)';
      formClient.style.display = '';
      formTravail.style.display = 'none';
      if (resClient) resClient.style.display = 'none';
      if (resTravail) resTravail.style.display = 'none';
    } else {
      btnTravail.style.background = 'rgba(232,148,10,0.15)';
      btnTravail.style.color = '#E8940A';
      btnClient.style.background = 'rgba(255,255,255,0.02)';
      btnClient.style.color = 'rgba(252, 224, 168,0.5)';
      formClient.style.display = 'none';
      formTravail.style.display = '';
      if (resClient) resClient.style.display = 'none';
      if (resTravail) resTravail.style.display = 'none';
    }
  };

  window.lancerWozaliMatchTravail = async function() {
    const user = await verifierConnexionOuPopup('voir les offres');
    if (!user) return;
    const sb = _sb(); if (!sb) return;
    const metier = document.getElementById('match-travail-metier')?.value;
    const ville = document.getElementById('match-travail-ville')?.value;
    const description = document.getElementById('match-travail-description')?.value?.trim();

    if (!metier) { alert('Sélectionne ton métier pour voir les offres.'); return; }

    try {
      // Chercher les demandes ouvertes correspondant au métier
      let query = sb.from('wozali_match_demandes')
        .select('*')
        .eq('statut', 'ouvert')
        .ilike('metier_recherche', `%${metier}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (ville) query = query.eq('ville', ville);

      const { data: demandes } = await query;
      const container = document.getElementById('match-resultats-travail');
      const liste = document.getElementById('match-travail-liste');
      if (!demandes || demandes.length === 0) {
        container.style.display = 'block';
        liste.innerHTML = '<div class="feed-etat-vide"><span class="emoji">😕</span><p><strong>Aucune offre trouvée pour le moment</strong></p><p>Pas encore de demandes en ' + escapeHtml(metier) + (ville ? ' à ' + escapeHtml(ville) : '') + '.<br>Crée ton profil WOZALI pour être visible quand un client cherchera.</p><button class="wozali-btn-primary" style="margin-top:12px;font-size:13px;padding:10px 20px;" onclick="showPage(\'inscription\')">Créer mon profil gratuit</button></div>';
        return;
      }
      // Enrichir les demandes avec les infos client
      const clientIdsTravail = [...new Set((demandes).map(d=>d.client_id).filter(Boolean))];
      let clientMapTravail = {};
      if (clientIdsTravail.length > 0) {
        const { data: clients } = await sb.from('wozali_prestataires').select('user_id, nom_complet, photo_profil').in('user_id', clientIdsTravail);
        for (const c of (clients||[])) clientMapTravail[c.user_id] = c;
      }

      container.style.display = 'block';
      liste.innerHTML = demandes.map(d => {
        const client = clientMapTravail[d.client_id] || {};
        return `
          <div class="match-result-card" style="flex-direction:column;align-items:stretch;gap:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${escapeHtml(client.photo_profil||client.photo_url||'')}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(232,148,10,0.3);" alt="" onerror="this.style.visibility='hidden'" loading="lazy">
              <div style="flex:1;">
                <strong style="color:#FCE0A8;font-size:14px;font-family:Georgia,serif;">${escapeHtml(client.nom_complet||client.nom||'Client')}</strong>
                <span style="display:block;font-size:11px;color:rgba(252, 224, 168,0.4);">${getDateRelative(d.created_at)}</span>
              </div>
              <span style="font-size:11px;padding:3px 10px;border-radius:10px;background:rgba(232,148,10,0.15);color:#E8940A;font-family:'Geist Mono',monospace;">🟢 Ouvert</span>
            </div>
            <p style="color:rgba(252, 224, 168,0.8);font-size:14px;margin:0;line-height:1.6;">${escapeHtml(d.description)}</p>
            <div style="display:flex;gap:12px;font-size:12px;color:rgba(252, 224, 168,0.5);">
              <span>🔧 ${escapeHtml(d.metier_recherche)}</span>
              ${d.ville ? '<span>📍 ' + escapeHtml(d.ville) + '</span>' : ''}
              ${d.budget_max ? '<span>💰 Budget max: ' + d.budget_max.toLocaleString() + ' FCFA</span>' : ''}
            </div>
            <button class="wozali-btn-primary" style="font-size:13px;padding:10px 16px;width:100%;" onclick="repondreMatch('${d.id}', '${d.client_id}')">💼 Je suis intéressé — répondre</button>
          </div>
        `;
      }).join('');
    } catch(e) { console.warn('[matchTravail]', e); alert('Erreur lors de la recherche.'); }
  };
})();



// ══════════════════════════════════════════
// RECRUTEMENT AGENTS — Form submission
// ══════════════════════════════════════════
// ── Quartiers dynamiques pour formulaire recrutement ──
var RECRUT_QUARTIERS = {
  'Lomé (Togo)': [
    'Adawlato / Grand Marché','Adidogomé','Aflao','Agbalépédogan','Agoè-Assiyéyé',
    'Agoè-Nyivé','Agoè-Zongo','Akodésséwa','Amoutivé','Anfamé',
    'Atiégou','Baguida','Bè','Bè-Klikamé','Bè-Kpota',
    'Cacaveli','Djidjolé','Djidjolé-Nord','Djidjolé-Sud','Doumasséssé',
    'Gbényédji','Gbossimé','Hédzranawoé','Kagomé','Kanyikopé',
    'Kégué','Kélékougan','Klikamé','Kodjoviakopé','Koma',
    'Légbassito','Lomé Centre','Lomé Port','Novissi','Nukafu',
    'Nyékonakpoè','Nyékonakpoè-Nord','Soviépé','Tokoin','Tokoin-Est',
    'Tokoin-Forêt','Tokoin-Gbadago','Tokoin-Hôpital','Tokoin-Wuiti',
    'Totsi','Wuiti','Zanguéra','Zébé',
    'Autre'
  ],
  'Cotonou (Bénin)': [
    'Abomey-Calavi','Agla','Agontikon','Ahouansori','Akogbato',
    'Akpakpa','Akpakpa-Centre','Ayelawadjè','Cadjehoun','Cotonou Centre',
    'Dantokpa','Djomèhountin','Fifadji','Fidjrossè','Fidjrossè-Plage',
    'Ganhi','Gbégamey','Gbéto','Godomey','Godomey-Togoudo',
    'Houéyiho','Jéricho','Kpankpan','Les Cocotiers','Menontin',
    'Midombo','Missèbo','Missérété','PK10','PK14',
    'Placodji','Sainte-Rita','Sègbèya','Sikècodji','Sèmè-Podji',
    'Tankpè','Tokpa-Hoho','Vedoko','Vodjè','Wologuédé',
    'Zogbo','Zongo',
    'Autre'
  ]
};

// Quartiers ciblés en interne (stratégie déploiement)
var QUARTIERS_CIBLES = {
  'Lomé': ['Bè','Bè-Kpota','Bè-Klikamé','Grand Marché / Adawlato','Adidogomé','Agoè-Nyivé','Tokoin'],
  'Cotonou': ['Dantokpa','Ganhi','Akpakpa','Abomey-Calavi','Godomey']
};

function updateRecrutQuartiers() {
  var ville = document.getElementById('recrut-ville').value;
  var qSel = document.getElementById('recrut-quartier');
  qSel.innerHTML = '';
  // Match par contenu pour éviter les problèmes d'encodage accents
  var quartiers = null;
  if (ville.indexOf('Lom') > -1) quartiers = RECRUT_QUARTIERS['Lomé (Togo)'];
  else if (ville.indexOf('Coton') > -1) quartiers = RECRUT_QUARTIERS['Cotonou (Bénin)'];
  if (!quartiers) {
    qSel.innerHTML = '<option value="">— Choisis d\'abord ta ville —</option>';
    return;
  }
  qSel.innerHTML = '<option value="">— Choisis ton quartier —</option>';
  quartiers.forEach(function(q) {
    var opt = document.createElement('option');
    opt.value = q; opt.textContent = q;
    qSel.appendChild(opt);
  });
}

async function submitRecrutement(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';

  try {
    // Validation indicatif téléphone vs ville
    var tel = document.getElementById('recrut-tel').value.trim();
    var ville = document.getElementById('recrut-ville').value;
    if (!tel.startsWith('+')) { toast('Ajoute l\'indicatif pays (+228 ou +229) avant ton numéro', 'error'); btn.disabled = false; btn.textContent = 'Envoyer ma candidature →'; return; }
    var is228 = tel.startsWith('+228');
    var is229 = tel.startsWith('+229');
    if (!is228 && !is229) { toast('Indicatif invalide. Utilise +228 (Togo) ou +229 (Bénin)', 'error'); btn.disabled = false; btn.textContent = 'Envoyer ma candidature →'; return; }
    if (is228 && ville.indexOf('Cotonou') > -1) { toast('Tu as mis +228 (Togo) mais choisi Cotonou (Bénin). Vérifie ton numéro ou ta ville.', 'error'); btn.disabled = false; btn.textContent = 'Envoyer ma candidature →'; return; }
    if (is229 && ville.indexOf('Lomé') > -1) { toast('Tu as mis +229 (Bénin) mais choisi Lomé (Togo). Vérifie ton numéro ou ta ville.', 'error'); btn.disabled = false; btn.textContent = 'Envoyer ma candidature →'; return; }

    // Upload photos to ImgBB
    var photoFiles = document.getElementById('recrut-photos').files;
    if (!photoFiles || photoFiles.length === 0) { toast('Ajoute au moins 1 photo', 'error'); btn.disabled = false; btn.textContent = 'Envoyer ma candidature →'; return; }
    if (photoFiles.length > 3) { toast('Maximum 3 photos', 'error'); btn.disabled = false; btn.textContent = 'Envoyer ma candidature →'; return; }

    var photoUrls = [];
    for (var i = 0; i < Math.min(photoFiles.length, 3); i++) {
      var url = await uploadToImgBB(photoFiles[i]);
      if (url) photoUrls.push(url);
    }
    if (photoUrls.length === 0) { toast('Erreur upload photos', 'error'); btn.disabled = false; btn.textContent = 'Envoyer ma candidature →'; return; }

    // Submit to Airtable
    var fields = {
      'Prénom': document.getElementById('recrut-prenom').value.trim(),
      'Nom': document.getElementById('recrut-nom').value.trim(),
      'Téléphone': document.getElementById('recrut-tel').value.trim(),
      'Ville': (function(v){ if(v.indexOf('Lomé')>-1) return 'Lomé'; if(v.indexOf('Cotonou')>-1) return 'Cotonou'; return v; })(document.getElementById('recrut-ville').value),
      'Quartier': document.getElementById('recrut-quartier').value,
      'Âge': parseInt(document.getElementById('recrut-age').value),
      'Genre': document.getElementById('recrut-genre').value === 'Homme' ? 'H' : 'F',
      'Disponibilité': document.getElementById('recrut-dispo').value,
      'Photos': photoUrls.join('\n'),
      'Pourquoi': document.getElementById('recrut-pourquoi').value.trim(),
      'Source': document.getElementById('recrut-source').value,
      'Date Ajout': new Date().toISOString(),
      'Statut': 'En attente'
    };

    var supa = window.supabase;
    if (!supa) throw new Error('Supabase non chargé');
    var { error: insertErr } = await supa.from('wozali_candidatures_agents_terrain').insert({
      prenom: fields['Prénom'] || '',
      nom: fields['Nom'] || '',
      telephone: fields['Téléphone'] || '',
      email: fields['Email'] || '',
      age: fields['Âge'] ? parseInt(fields['Âge']) : null,
      genre: fields['Genre'] || null,
      ville: fields['Ville'] || null,
      quartier: fields['Quartier'] || null,
      disponibilite: fields['Disponibilité'] || null,
      photos: fields['Photos'] || null,
      pourquoi: fields['Pourquoi'] || null,
      source: fields['Source'] || null,
      statut: 'En attente'
    });
    if (insertErr) throw new Error(insertErr.message);

    // Masquer TOUT le contenu de la page recrutement sauf le merci
    document.getElementById('recrut-form-wrap').style.display = 'none';
    document.getElementById('recrut-merci').style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Candidature envoyée !', 'success');

  } catch(err) {
    console.error('Recrutement submit error:', err);
    toast('Erreur lors de l\'envoi. Réessaie.', 'error');
    btn.disabled = false;
    btn.textContent = 'Envoyer ma candidature →';
  }
}

// ══════════════════════════════════════════
// CANDIDATURES AGENTS — Dashboard intégré
// ══════════════════════════════════════════
var _candCache = [];
var _candView = 'grid';

function switchAgentTab(tab) {
  var tabs = ['candidatures', 'actifs'];
  tabs.forEach(function(t) {
    var panel = document.getElementById('agent-panel-' + t);
    var btn = document.getElementById('agent-tab-' + t);
    if (!panel || !btn) return;
    if (t === tab) {
      panel.style.display = 'block';
      btn.style.color = '#E8940A';
      btn.style.borderBottom = '2px solid #E8940A';
    } else {
      panel.style.display = 'none';
      btn.style.color = 'rgba(252, 224, 168,.4)';
      btn.style.borderBottom = '2px solid transparent';
    }
  });
  if (tab === 'candidatures' && !_candCache.length) loadCandidatures();
  if (tab === 'actifs') { loadAgentsTerrain(); }
}

async function loadCandidatures() {
  try {
    var supa = window.supabase;
    if (!supa) throw new Error('Supabase non chargé');
    var { data: rows, error } = await supa
      .from('wozali_candidatures_agents_terrain')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    // Normaliser au format {id, fields} pour compatibilité avec le renderer existant
    _candCache = (rows || []).map(function(r) {
      return { id: r.id, fields: {
        'Prénom': r.prenom || '',
        'Nom': r.nom || '',
        'Téléphone': r.telephone || '',
        'Email': r.email || '',
        'Âge': r.age || '',
        'Genre': r.genre || '',
        'Ville': r.ville || '',
        'Quartier': r.quartier || '',
        'Disponibilité': r.disponibilite || '',
        'Photos': r.photos || '',
        'Pourquoi': r.pourquoi || '',
        'Source': r.source || '',
        'Date Ajout': r.created_at || '',
        'Statut': r.statut || 'En attente',
        'Actif': r.actif || false
      }};
    });
    renderCandKPIs();
    filterCandidatures();
  } catch(err) {
    console.error('loadCandidatures error:', err);
    document.getElementById('cand-container').innerHTML = '<p style="color:#ff6b6b;font-family:Geist,sans-serif;text-align:center;padding:40px;">Erreur de chargement.</p>';
  }
}

function renderCandKPIs() {
  var all = _candCache;
  var el = function(id) { return document.getElementById(id); };
  el('cand-kpi-total').textContent = all.length;
  el('cand-kpi-attente').textContent = all.filter(function(r){ return (r.fields['Statut']||'En attente') === 'En attente'; }).length;
  el('cand-kpi-preselect').textContent = all.filter(function(r){ return r.fields['Statut'] === 'Présélectionné'; }).length;
  el('cand-kpi-valide').textContent = all.filter(function(r){ return r.fields['Statut'] === 'Validé'; }).length;
  el('cand-kpi-lome').textContent = all.filter(function(r){ return r.fields['Ville'] === 'Lomé'; }).length;
  el('cand-kpi-cotonou').textContent = all.filter(function(r){ return r.fields['Ville'] === 'Cotonou'; }).length;

  // Render quartiers ciblés breakdown
  var qGrid = document.getElementById('cand-quartiers-grid');
  if (qGrid) {
    var html = '';
    ['Lomé','Cotonou'].forEach(function(ville) {
      var cibles = QUARTIERS_CIBLES[ville] || [];
      cibles.forEach(function(q) {
        var count = all.filter(function(r){ return (r.fields['Quartier']||'').indexOf(q) > -1 && r.fields['Ville'] === ville; }).length;
        var bg = count > 0 ? 'rgba(232,148,10,.15)' : 'rgba(255,255,255,.04)';
        var color = count > 0 ? '#E8940A' : 'rgba(252, 224, 168,.3)';
        html += '<div onclick="var s=document.getElementById(\'cand-f-search\');if(s.value===\'' + q + '\'){s.value=\'\'}else{s.value=\'' + q + '\'}filterCandidatures()" style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:' + bg + ';border:1px solid ' + (count > 0 ? 'rgba(232,148,10,.25)' : 'rgba(255,255,255,.06)') + ';border-radius:8px;cursor:pointer;font-family:Geist,sans-serif;font-size:12px;">';
        html += '<span style="color:' + color + ';font-weight:600;">' + q + '</span>';
        html += '<span style="font-family:Geist Mono,monospace;font-size:11px;font-weight:900;color:' + color + ';">' + count + '</span>';
        html += '</div>';
      });
    });
    qGrid.innerHTML = html;
  }
}

function filterCandidatures() {
  var statut = document.getElementById('cand-f-statut').value;
  var ville = document.getElementById('cand-f-ville').value;
  var genre = document.getElementById('cand-f-genre').value;
  var ageRange = document.getElementById('cand-f-age').value;
  var photosOnly = document.getElementById('cand-f-photos').checked;
  var search = (document.getElementById('cand-f-search').value || '').toLowerCase();

  var filtered = _candCache.filter(function(r) {
    var f = r.fields;
    if (statut && (f['Statut']||'En attente') !== statut) return false;
    if (ville && f['Ville'] !== ville) return false;
    if (genre && f['Genre'] !== genre) return false;
    if (photosOnly && !(f['Photos']||'').trim()) return false;
    if (search) {
      var haystack = ((f['Prénom']||'') + ' ' + (f['Nom']||'') + ' ' + (f['Quartier']||'') + ' ' + (f['Ville']||'')).toLowerCase();
      if (haystack.indexOf(search) === -1) return false;
    }
    if (ageRange) {
      var age = parseInt(f['Âge']) || 0;
      if (ageRange === '18-24' && (age < 18 || age > 24)) return false;
      if (ageRange === '25-30' && (age < 25 || age > 30)) return false;
      if (ageRange === '31-40' && (age < 31 || age > 40)) return false;
      if (ageRange === '41+' && age < 41) return false;
    }
    return true;
  });

  document.getElementById('cand-count-label').textContent = filtered.length + ' candidature' + (filtered.length > 1 ? 's' : '');

  if (_candView === 'grid') renderCandGrid(filtered);
  else renderCandTable(filtered);
}

function setCandView(view) {
  _candView = view;
  document.getElementById('cand-view-grid').style.background = view === 'grid' ? '#E8940A' : 'rgba(255,255,255,.06)';
  document.getElementById('cand-view-grid').style.color = view === 'grid' ? '#14100A' : '#FCE0A8';
  document.getElementById('cand-view-table').style.background = view === 'table' ? '#E8940A' : 'rgba(255,255,255,.06)';
  document.getElementById('cand-view-table').style.color = view === 'table' ? '#14100A' : '#FCE0A8';
  filterCandidatures();
}

function getCandBadge(statut) {
  if (statut === 'Présélectionné') return '<span style="display:inline-block;background:rgba(59,130,246,.15);color:#3b82f6;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">Présélectionné</span>';
  if (statut === 'Validé') return '<span style="display:inline-block;background:rgba(232,148,10,.15);color:#E8940A;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">Validé</span>';
  if (statut === 'Refusé') return '<span style="display:inline-block;background:rgba(255,107,107,.1);color:#ff6b6b;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">Refusé</span>';
  return '<span style="display:inline-block;background:rgba(255,255,255,.08);color:rgba(255,255,255,.5);font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">En attente</span>';
}

// ── GRID VIEW (cards avec grosses photos) ──
function renderCandGrid(records) {
  var c = document.getElementById('cand-container');
  if (!records.length) { c.innerHTML = '<p style="color:rgba(252, 224, 168,.4);font-family:Geist,sans-serif;text-align:center;padding:60px;">Aucune candidature trouvée.</p>'; return; }
  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">';
  records.forEach(function(r) {
    var f = r.fields;
    var _rp = f['Photos'] || '';
    var photos = [];
    try { photos = _rp.trim().startsWith('[') ? JSON.parse(_rp).filter(Boolean) : _rp.split('\n').filter(Boolean); } catch(e) { photos = _rp.split('\n').filter(Boolean); }
    var photo = photos[0] || '';
    var statut = f['Statut'] || 'En attente';
    var genreLabel = f['Genre']==='H'?'Homme':f['Genre']==='F'?'Femme':'—';
    var borderColor = statut === 'Présélectionné' ? 'rgba(59,130,246,.3)' : statut === 'Validé' ? 'rgba(232,148,10,.3)' : statut === 'Refusé' ? 'rgba(255,107,107,.15)' : 'rgba(232,148,10,.1)';

    html += '<div style="background:#161b17;border:1px solid ' + borderColor + ';border-radius:16px;overflow:hidden;cursor:pointer;" onclick="showCandDetail(\'' + r.id + '\')">';

    // Photo header
    if (photo) {
      html += '<div style="width:100%;height:220px;overflow:hidden;position:relative;">';
      html += '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.remove()">';
      if (photos.length > 1) html += '<div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;padding:3px 8px;border-radius:6px;font-family:Geist Mono,monospace;">+' + (photos.length - 1) + '</div>';
      html += '<div style="position:absolute;top:8px;left:8px;">' + getCandBadge(statut) + '</div>';
      html += '</div>';
    } else {
      html += '<div style="width:100%;height:100px;background:rgba(232,148,10,.04);display:flex;align-items:center;justify-content:center;color:rgba(252, 224, 168,.2);font-size:32px;position:relative;">';
      html += '<div style="position:absolute;top:8px;left:8px;">' + getCandBadge(statut) + '</div>';
      html += '👤</div>';
    }

    // Info
    html += '<div style="padding:14px;">';
    var _sc = _iaAnalyse ? _scoreCache[r.id] : null;
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:' + (_sc ? '5px' : '4px') + ';">';
    html += '<div style="font-family:Geist,sans-serif;font-size:15px;font-weight:700;color:#FCE0A8;">' + (f['Prénom']||'') + ' ' + (f['Nom']||'') + '</div>';
    if (_sc) html += '<span style="font-family:Geist Mono,monospace;font-size:14px;font-weight:900;color:' + _sc.labelColor + ';flex-shrink:0;">' + _sc.total + '</span>';
    html += '</div>';
    if (_sc) html += '<div style="margin-bottom:7px;"><span style="font-size:10px;font-weight:700;padding:2px 9px;background:' + _sc.labelBg + ';color:' + _sc.labelColor + ';border-radius:6px;">' + _sc.label + '</span></div>';
    html += '<div style="font-family:Geist,sans-serif;font-size:12px;color:rgba(252, 224, 168,.5);margin-bottom:8px;">' + (f['Ville']||'—') + ' · ' + (f['Quartier']||'') + ' · ' + genreLabel + ' · ' + (f['Âge']||'—') + ' ans</div>';
    html += '<div style="font-family:Geist,sans-serif;font-size:11px;color:rgba(252, 224, 168,.3);">' + (f['Disponibilité']||'') + ' · ' + (f['Date Ajout'] ? new Date(f['Date Ajout']).toLocaleDateString('fr-FR') : '') + '</div>';

    // Action buttons
    if (statut !== 'Validé' && statut !== 'Refusé') {
      html += '<div style="display:flex;gap:6px;margin-top:10px;" onclick="event.stopPropagation()">';
      if (statut === 'En attente') {
        html += '<button onclick="updateCandStatus(\'' + r.id + '\',\'Présélectionné\')" style="flex:1;padding:7px;background:rgba(59,130,246,.15);color:#3b82f6;border:1px solid rgba(59,130,246,.3);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:Geist,sans-serif;">Présélectionner</button>';
      }
      if (statut === 'Présélectionné') {
        html += '<button onclick="validateAgent(\'' + r.id + '\')" style="flex:1;padding:7px;background:#E8940A;color:#14100A;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:Geist,sans-serif;">✓ Valider</button>';
      }
      html += '<button onclick="updateCandStatus(\'' + r.id + '\',\'Refusé\')" style="padding:7px 12px;background:rgba(255,107,107,.08);color:#ff6b6b;border:1px solid rgba(255,107,107,.15);border-radius:8px;font-size:11px;cursor:pointer;font-family:Geist,sans-serif;">✗</button>';
      html += '</div>';
    }
    html += '</div></div>';
  });
  html += '</div>';
  c.innerHTML = html;
}

// ── TABLE VIEW ──
function renderCandTable(records) {
  var c = document.getElementById('cand-container');
  if (!records.length) { c.innerHTML = '<p style="color:rgba(252, 224, 168,.4);font-family:Geist,sans-serif;text-align:center;padding:60px;">Aucune candidature trouvée.</p>'; return; }
  var html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-family:Geist,sans-serif;font-size:13px;color:#FCE0A8;">';
  html += '<thead><tr style="border-bottom:1px solid rgba(232,148,10,.15);text-align:left;">';
  (_iaAnalyse ? ['Photo','Nom','Score IA','Ville','Quartier','Âge','Genre','Dispo','Date','Statut','Actions'] : ['Photo','Nom','Ville','Quartier','Âge','Genre','Dispo','Date','Statut','Actions']).forEach(function(h) {
    html += '<th style="padding:10px 8px;font-size:10px;color:rgba(252, 224, 168,.35);font-family:Geist Mono,monospace;text-transform:uppercase;letter-spacing:1px;">' + h + '</th>';
  });
  html += '</tr></thead><tbody>';
  records.forEach(function(r) {
    var f = r.fields;
    var photo = (f['Photos']||'').split('\n')[0];
    var statut = f['Statut'] || 'En attente';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.03);cursor:pointer;" onclick="showCandDetail(\'' + r.id + '\')">';
    html += '<td style="padding:8px;">' + (photo ? '<img src="' + photo + '" style="width:44px;height:44px;border-radius:10px;object-fit:cover;">' : '<div style="width:44px;height:44px;border-radius:10px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>') + '</td>';
    html += '<td style="padding:8px;font-weight:600;">' + (f['Prénom']||'') + ' ' + (f['Nom']||'') + '</td>';
    if (_iaAnalyse) { var _st = _scoreCache[r.id]; html += _st ? '<td style="padding:8px;"><span style="font-family:Geist Mono,monospace;font-size:13px;font-weight:900;color:' + _st.labelColor + ';">' + _st.total + '</span></td>' : '<td style="padding:8px;color:rgba(252,224,168,.25);">—</td>'; }
    html += '<td style="padding:8px;">' + (f['Ville']||'—') + '</td>';
    html += '<td style="padding:8px;">' + (f['Quartier']||'—') + '</td>';
    html += '<td style="padding:8px;">' + (f['Âge']||'—') + '</td>';
    html += '<td style="padding:8px;">' + (f['Genre']==='H'?'H':f['Genre']==='F'?'F':'—') + '</td>';
    html += '<td style="padding:8px;font-size:12px;">' + (f['Disponibilité']||'—') + '</td>';
    html += '<td style="padding:8px;font-size:12px;">' + (f['Date Ajout'] ? new Date(f['Date Ajout']).toLocaleDateString('fr-FR') : '—') + '</td>';
    html += '<td style="padding:8px;">' + getCandBadge(statut) + '</td>';
    html += '<td style="padding:8px;white-space:nowrap;" onclick="event.stopPropagation()">';
    if (statut === 'En attente') html += '<button onclick="updateCandStatus(\'' + r.id + '\',\'Présélectionné\')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:3px;" title="Présélectionner">⭐</button>';
    if (statut === 'Présélectionné') html += '<button onclick="validateAgent(\'' + r.id + '\')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:3px;" title="Valider">✅</button>';
    if (statut !== 'Validé') html += '<button onclick="updateCandStatus(\'' + r.id + '\',\'Refusé\')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:3px;" title="Refuser">❌</button>';
    html += '</td></tr>';
  });
  html += '</tbody></table></div>';
  c.innerHTML = html;
}

// ── UPDATE STATUS ──
// Marketing WhatsApp templates per status (candidat n'a pas d'espace → WhatsApp = seul canal)
window.CAND_WA_TEMPLATES = {
  'Présélectionné': function(f){
    return 'Salut ' + (f['Prénom']||'') + ' !\n\n' +
           'Ta candidature pour rejoindre l\'équipe d\'agents terrain WOZALI nous a marqués.\n\n' +
           'Tu passes à l\'étape suivante — tu es **présélectionné(e)** parmi les meilleurs profils de ' + (f['Ville']||'ta ville') + '.\n\n' +
           'Prochaine étape : un court échange pour valider ta motivation. On te recontacte cette semaine.\n\n' +
           'À très vite.\n— L\'équipe WOZALI';
  },
  'Refusé': function(f){
    return 'Salut ' + (f['Prénom']||'') + ',\n\n' +
           'Merci d\'avoir postulé pour rejoindre l\'équipe d\'agents terrain WOZALI.\n\n' +
           'Cette fois-ci, ta candidature n\'a pas été retenue pour la vague de lancement — mais on garde ton profil. On recrute tout au long de 2026 au fur et à mesure que WOZALI grandit dans ta ville.\n\n' +
           'Continue de nous suivre sur wozali.africa - et reste dispo, on peut revenir vers toi.\n\n' +
           'Merci pour ton intérêt.\n— L\'équipe WOZALI';
  }
};

async function updateCandStatus(recordId, status) {
  try {
    var supa = window.supabase;
    if (!supa) throw new Error('Supabase non chargé');
    var { error: updErr } = await supa
      .from('wozali_candidatures_agents_terrain')
      .update({ statut: status })
      .eq('id', recordId);
    if (updErr) throw new Error(updErr.message);
    toast('Statut → ' + status, 'success');
    var rec = _candCache.find(function(r){ return r.id === recordId; });
    if (rec) rec.fields['Statut'] = status;
    renderCandKPIs();
    filterCandidatures();

    // WhatsApp notification marketée pour Présélectionné + Refusé
    var tpl = window.CAND_WA_TEMPLATES[status];
    if (tpl && rec) {
      var tel = (rec.fields['Téléphone']||'').replace(/\s/g,'').replace(/^\+/,'');
      if (tel) {
        var msg = encodeURIComponent(tpl(rec.fields));
        // Laisser le temps au toast + rerender, puis ouvrir WA
        setTimeout(function(){
          if (confirm('Envoyer le message "' + status + '" à ' + (rec.fields['Prénom']||'') + ' sur WhatsApp ?')) {
            window.open('https://wa.me/' + tel + '?text=' + msg, '_blank');
          }
        }, 200);
      }
    }
  } catch(err) {
    console.error('updateCandStatus error:', err);
    toast('Erreur mise à jour', 'error');
  }
}

// ── VALIDATE AGENT (Présélectionné → Validé + WhatsApp notif + Auto Pro) ──
async function validateAgent(recordId) {
  var rec = _candCache.find(function(r){ return r.id === recordId; });
  if (!rec) return;
  var f = rec.fields;
  var nom = (f['Prénom']||'') + ' ' + (f['Nom']||'');

  if (!confirm('Valider ' + nom.trim() + ' comme agent terrain WOZALI ?\n\n→ Son abonnement passera automatiquement en Pro\n→ Un message WhatsApp sera préparé')) return;

  try {
    // 1. Update status to Validé
    var supa = window.supabase;
    if (!supa) throw new Error('Supabase non chargé');
    var { error: valErr } = await supa
      .from('wozali_candidatures_agents_terrain')
      .update({ statut: 'Validé', actif: true })
      .eq('id', recordId);
    if (valErr) throw new Error(valErr.message);

    rec.fields['Statut'] = 'Validé';
    rec.fields['Actif'] = true;
    renderCandKPIs();
    filterCandidatures();
    toast(nom.trim() + ' validé(e) comme agent terrain WOZALI !', 'success');

    // 2. Open WhatsApp notification
    var tel = (f['Téléphone']||'').replace(/\s/g,'').replace(/^\+/,'');
    if (tel) {
      var msg = encodeURIComponent('Salut ' + (f['Prénom']||'') + ' !\n\nBonne nouvelle : ta candidature pour rejoindre l\'équipe d\'agents terrain WOZALI a été retenue.\n\nTu fais partie des 20 référents sélectionnés pour le lancement.\n\nProchaine étape : ta formation. On te contacte très vite avec les détails.\n\nBienvenue dans l\'équipe.\n- WOZALI');
      window.open('https://wa.me/' + tel + '?text=' + msg, '_blank');
    }

  } catch(err) {
    console.error('validateAgent error:', err);
    toast('Erreur validation', 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// IA SCORING — Candidatures Agents terrain
// Score 0-100 : motivation (40) + disponibilité (20) + âge (15) + photos (10) + complétude (15)
// ══════════════════════════════════════════════════════════════════════════

var _scoreCache = {};
var _iaAnalyse  = false;

function _scoreCandidature(rec) {
  var f = rec.fields;
  var total = 0;
  var breakdown = {};

  // 1. MOTIVATION (0-40) — longueur + densité sémantique
  var txt = (f['Pourquoi'] || '').trim();
  var base = txt.length >= 250 ? 30 : txt.length >= 150 ? 22 : txt.length >= 80 ? 14 : txt.length >= 30 ? 7 : 0;
  var kws  = ['quartier','artisan','client','terrain','vente','vendre','résultat','commercial',
              'convaincre','contact','expérience','équipe','autonome','mobile','sérieux','motivé',
              'objectif','déjà','fait','toujours','jamais','moi-même','travail','argent','famille'];
  var kwHits = kws.filter(function(k){ return txt.toLowerCase().indexOf(k) > -1; }).length;
  var motivScore = Math.min(40, base + kwHits * 2);
  breakdown.motivation = { score: motivScore, max: 40, detail: txt.length + ' car · ' + kwHits + ' indicateurs' };
  total += motivScore;

  // 2. DISPONIBILITÉ (0-20)
  var dispoMap = { 'Immédiatement': 20, 'Dans 1 semaine': 15, 'Dans 2 semaines': 10, 'Dans 1 mois': 5 };
  var dispoScore = dispoMap[f['Disponibilité']] || 0;
  breakdown.disponibilite = { score: dispoScore, max: 20, detail: f['Disponibilité'] || 'Non renseignée' };
  total += dispoScore;

  // 3. ÂGE OPTIMAL (0-15)
  var age = parseInt(f['Âge']) || 0;
  var ageScore = age >= 22 && age <= 35 ? 15 : age >= 36 && age <= 42 ? 10 : age >= 18 && age <= 21 ? 8 : age > 0 ? 4 : 0;
  breakdown.age = { score: ageScore, max: 15, detail: age ? age + ' ans' : 'Non renseigné' };
  total += ageScore;

  // 4. PHOTOS (0-10)
  var photosStr = (f['Photos'] || '').trim();
  var nPhotos = 0;
  try { var pa = JSON.parse(photosStr); nPhotos = Array.isArray(pa) ? pa.length : 0; }
  catch(e) { nPhotos = photosStr ? photosStr.split('\n').filter(Boolean).length : 0; }
  var photoScore = nPhotos >= 2 ? 10 : nPhotos === 1 ? 5 : 0;
  breakdown.photos = { score: photoScore, max: 10, detail: nPhotos + ' photo' + (nPhotos !== 1 ? 's' : '') };
  total += photoScore;

  // 5. COMPLÉTUDE PROFIL (0-15)
  var completScore = 0;
  if (f['Prénom'] && f['Nom']) completScore += 4;
  if (f['Téléphone'])          completScore += 3;
  if (f['Quartier'])           completScore += 4;
  if (f['Âge'])                completScore += 2;
  if (f['Email'])              completScore += 2;
  breakdown.complet = { score: completScore, max: 15, detail: completScore >= 13 ? 'Complet' : completScore >= 8 ? 'Partiel' : 'Incomplet' };
  total += completScore;

  // LABEL
  var label, labelColor, labelBg;
  if      (total >= 78) { label = '⭐ Fort potentiel'; labelColor = '#E8940A'; labelBg = 'rgba(232,148,10,.15)';  }
  else if (total >= 58) { label = 'Bon profil';        labelColor = '#E8940A'; labelBg = 'rgba(232,148,10,.15)'; }
  else if (total >= 38) { label = 'Profil moyen';      labelColor = '#FCE0A8'; labelBg = 'rgba(252,224,168,.08)';}
  else                  { label = 'Profil faible';     labelColor = 'rgba(252,224,168,.35)'; labelBg = 'rgba(255,255,255,.04)'; }

  return { total: total, max: 100, breakdown: breakdown, label: label, labelColor: labelColor, labelBg: labelBg };
}

window.analyserCandidaturesIA = function() {
  var all = _candCache;
  if (!all.length) { toast('Aucune candidature à analyser', 'error'); return; }
  _iaAnalyse  = true;
  _scoreCache = {};
  all.forEach(function(rec) { _scoreCache[rec.id] = _scoreCandidature(rec); });
  // Trier par score décroissant
  _candCache.sort(function(a, b) { return (_scoreCache[b.id] ? _scoreCache[b.id].total : 0) - (_scoreCache[a.id] ? _scoreCache[a.id].total : 0); });
  _renderIAPanel();
  filterCandidatures();
  // Scroller vers le panel
  var panel = document.getElementById('cand-ia-panel');
  if (panel) setTimeout(function(){ panel.scrollIntoView({ behavior:'smooth', block:'start' }); }, 100);
};

window.resetIAAnalyse = function() {
  _iaAnalyse  = false;
  _scoreCache = {};
  _candCache.sort(function(a, b) { return new Date(b.fields['Date Ajout']) - new Date(a.fields['Date Ajout']); });
  var panel = document.getElementById('cand-ia-panel');
  if (panel) panel.innerHTML = '';
  filterCandidatures();
};

function _buildTopGroups() {
  var attente = _candCache.filter(function(r){ return (r.fields['Statut']||'En attente') === 'En attente'; });
  var g = { 'Lomé-H':[], 'Lomé-F':[], 'Cotonou-H':[], 'Cotonou-F':[] };
  attente.forEach(function(r){
    var key = (r.fields['Ville']||'') + '-' + (r.fields['Genre']||'');
    if (g[key]) g[key].push(r);
  });
  Object.keys(g).forEach(function(k){
    g[k].sort(function(a,b){ return (_scoreCache[b.id] ? _scoreCache[b.id].total : 0) - (_scoreCache[a.id] ? _scoreCache[a.id].total : 0); });
  });
  return g;
}

function _renderIAPanel() {
  var panel = document.getElementById('cand-ia-panel');
  if (!panel) return;

  var scores = Object.values(_scoreCache);
  var forts  = scores.filter(function(s){ return s.total >= 78; }).length;
  var bons   = scores.filter(function(s){ return s.total >= 58 && s.total < 78; }).length;
  var moyens = scores.filter(function(s){ return s.total >= 38 && s.total < 58; }).length;
  var faibles= scores.filter(function(s){ return s.total < 38; }).length;

  var g = _buildTopGroups();
  var lomeTop   = g['Lomé-H'].slice(0,5).concat(g['Lomé-F'].slice(0,5));
  var cotTop    = g['Cotonou-H'].slice(0,5).concat(g['Cotonou-F'].slice(0,5));
  var allTop    = lomeTop.concat(cotTop);

  var html = '';
  html += '<div style="background:rgba(232,148,10,.06);border:1px solid rgba(232,148,10,.22);border-radius:16px;padding:20px 22px;margin-bottom:18px;">';

  // Header
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;">';
  html += '<div>';
  html += '<div style="font-family:Geist Mono,monospace;font-size:10px;color:#E8940A;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:4px;">🤖 Analyse IA terminée</div>';
  html += '<div style="font-size:15px;font-weight:700;color:#FCE0A8;">' + _candCache.length + ' profils scorés · Classés meilleur → moins bon</div>';
  html += '</div>';
  html += '<button onclick="window.resetIAAnalyse()" style="padding:6px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:rgba(252,224,168,.5);font-size:12px;cursor:pointer;font-family:Geist,sans-serif;white-space:nowrap;">✕ Réinitialiser</button>';
  html += '</div>';

  // Distribution
  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">';
  html += '<div style="font-size:12px;padding:5px 12px;background:rgba(232,148,10,.1);border:1px solid rgba(232,148,10,.25);border-radius:8px;color:#E8940A;font-weight:700;">⭐ ' + forts + ' fort' + (forts!==1?'s':'') + '</div>';
  html += '<div style="font-size:12px;padding:5px 12px;background:rgba(232,148,10,.1);border:1px solid rgba(232,148,10,.25);border-radius:8px;color:#E8940A;font-weight:700;">👍 ' + bons + ' bon' + (bons!==1?'s':'') + '</div>';
  html += '<div style="font-size:12px;padding:5px 12px;background:rgba(252,224,168,.06);border:1px solid rgba(252,224,168,.1);border-radius:8px;color:rgba(252,224,168,.6);font-weight:700;">👤 ' + moyens + ' moyen' + (moyens!==1?'s':'') + '</div>';
  if (faibles) html += '<div style="font-size:12px;padding:5px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:8px;color:rgba(252,224,168,.3);font-weight:700;">✗ ' + faibles + ' faible' + (faibles!==1?'s':'') + '</div>';
  html += '</div>';

  // Carte par ville
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">';
  [['Lomé','🇹🇬',lomeTop],['Cotonou','🇧🇯',cotTop]].forEach(function(arr) {
    var city = arr[0], flag = arr[1], top = arr[2];
    var gH = g[city+'-H'], gF = g[city+'-F'];
    html += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(232,148,10,.1);border-radius:12px;padding:12px 14px;">';
    html += '<div style="font-size:13px;font-weight:700;color:#FCE0A8;margin-bottom:8px;">' + flag + ' ' + city + '</div>';
    html += '<div style="font-size:11px;font-family:Geist Mono,monospace;color:rgba(252,224,168,.5);margin-bottom:4px;">H : ' + gH.length + ' cand. · Top ' + Math.min(5,gH.length);
    if (gH[0] && _scoreCache[gH[0].id]) html += ' · <span style="color:#E8940A;">' + _scoreCache[gH[0].id].total + '/100</span>';
    html += '</div>';
    html += '<div style="font-size:11px;font-family:Geist Mono,monospace;color:rgba(252,224,168,.5);margin-bottom:10px;">F : ' + gF.length + ' cand. · Top ' + Math.min(5,gF.length);
    if (gF[0] && _scoreCache[gF[0].id]) html += ' · <span style="color:#E8940A;">' + _scoreCache[gF[0].id].total + '/100</span>';
    html += '</div>';
    var pendingTop = top.filter(function(r){ return (r.fields['Statut']||'En attente') === 'En attente'; });
    if (pendingTop.length) {
      html += '<button onclick="window._preselectGroup(\'' + city + '\')" style="width:100%;padding:7px;background:rgba(59,130,246,.12);color:#3b82f6;border:1px solid rgba(59,130,246,.25);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:Geist,sans-serif;">Présélectionner ' + city + ' (' + pendingTop.length + ')</button>';
    } else {
      html += '<div style="font-size:11px;text-align:center;color:rgba(232,148,10,.7);padding:6px;">✓ Tops déjà présélectionnés</div>';
    }
    html += '</div>';
  });
  html += '</div>';

  // Bouton global
  var allPending = allTop.filter(function(r){ return (r.fields['Statut']||'En attente') === 'En attente'; });
  if (allPending.length) {
    html += '<button onclick="window._preselectAllTop()" style="width:100%;padding:12px;background:rgba(232,148,10,.12);border:1px solid rgba(232,148,10,.3);border-radius:10px;color:#E8940A;font-size:13px;font-weight:700;cursor:pointer;font-family:Geist,sans-serif;">⭐ Présélectionner TOUT le top — ' + allPending.length + ' profils (5H+5F Lomé · 5H+5F Cotonou)</button>';
  }

  html += '</div>';
  panel.innerHTML = html;
}

window._preselectGroup = async function(city) {
  var g = _buildTopGroups();
  var pending = (g[city+'-H']||[]).slice(0,5).concat((g[city+'-F']||[]).slice(0,5)).filter(function(r){ return (r.fields['Statut']||'En attente') === 'En attente'; });
  if (!pending.length) { toast('Pas de candidats "En attente" à ' + city, 'error'); return; }
  if (!confirm('Présélectionner ' + pending.length + ' candidat(s) recommandés à ' + city + ' ?')) return;
  await _batchPreselect(pending);
};

window._preselectAllTop = async function() {
  var g = _buildTopGroups();
  var pending = [];
  ['Lomé','Cotonou'].forEach(function(c){
    pending = pending.concat((g[c+'-H']||[]).slice(0,5)).concat((g[c+'-F']||[]).slice(0,5));
  });
  pending = pending.filter(function(r){ return (r.fields['Statut']||'En attente') === 'En attente'; });
  if (!pending.length) { toast('Tous les tops sont déjà présélectionnés ou validés', 'error'); return; }
  if (!confirm('Présélectionner ' + pending.length + ' profil(s) recommandés par l\'IA ?\n\nCette action est réversible — tu peux refuser individuellement ensuite.')) return;
  await _batchPreselect(pending);
};

async function _batchPreselect(records) {
  var supa = window.supabase;
  if (!supa) { toast('Supabase non disponible', 'error'); return; }
  var ids = records.map(function(r){ return r.id; });
  try {
    var res = await supa.from('wozali_candidatures_agents_terrain').update({ statut: 'Présélectionné' }).in('id', ids);
    if (res.error) throw res.error;
    records.forEach(function(rec){ rec.fields['Statut'] = 'Présélectionné'; });
    renderCandKPIs();
    _renderIAPanel();
    filterCandidatures();
    toast(ids.length + ' candidat(s) présélectionné(s)', 'success');
  } catch(err) {
    console.error('_batchPreselect error:', err);
    toast('Erreur lors de la présélection', 'error');
  }
}

// ── PHOTO LIGHTBOX ──
function openPhotoLightbox(url) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.92);z-index:100000;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px;';
  overlay.onclick = function(){ overlay.remove(); };
  var img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:16px;object-fit:contain;box-shadow:0 8px 40px rgba(0,0,0,.6);';
  var closeBtn = document.createElement('div');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'position:absolute;top:20px;right:24px;color:#FCE0A8;font-size:28px;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);border-radius:50%;';
  closeBtn.onclick = function(){ overlay.remove(); };
  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
}

// ── DETAIL MODAL ──
function showCandDetail(recordId) {
  var rec = _candCache.find(function(r){ return r.id === recordId; });
  if (!rec) return;
  var f = rec.fields;
  var _fp = f['Photos'] || '';
  var photos = [];
  try { photos = _fp.trim().startsWith('[') ? JSON.parse(_fp).filter(Boolean) : _fp.split('\n').filter(Boolean); } catch(e) { photos = _fp.split('\n').filter(Boolean); }
  var statut = f['Statut'] || 'En attente';
  var html = '';

  // Photos en grand (cliquables pour lightbox)
  if (photos.length) {
    html += '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:20px;">';
    photos.forEach(function(url) {
      html += '<img src="' + url + '" onclick="openPhotoLightbox(\'' + url.replace(/'/g,"\\'") + '\')" onerror="this.parentElement.remove()" style="width:' + (photos.length === 1 ? '220px' : '160px') + ';height:' + (photos.length === 1 ? '280px' : '200px') + ';border-radius:14px;object-fit:cover;border:2px solid rgba(232,148,10,.15);cursor:pointer;transition:transform .15s;" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'scale(1)\'">';
    });
    html += '</div>';
  }

  html += '<h2 style="font-family:\'DM Serif Display\',serif;font-size:24px;color:#FCE0A8;margin:0 0 4px;text-align:center;font-weight:900;">' + (f['Prénom']||'') + ' ' + (f['Nom']||'') + '</h2>';
  html += '<div style="text-align:center;margin-bottom:20px;">' + getCandBadge(statut) + '</div>';

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-family:Geist,sans-serif;font-size:14px;color:rgba(252, 224, 168,.65);">';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Téléphone</div>' + (f['Téléphone']||'—') + '</div>';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Ville</div>' + (f['Ville']||'—') + '</div>';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Quartier</div>' + (f['Quartier']||'—') + '</div>';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Âge</div>' + (f['Âge']||'—') + ' ans</div>';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Genre</div>' + (f['Genre']==='H'?'Homme':f['Genre']==='F'?'Femme':'—') + '</div>';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Disponibilité</div>' + (f['Disponibilité']||'—') + '</div>';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Source</div>' + (f['Source']||'—') + '</div>';
  html += '<div><div style="font-size:10px;color:rgba(252, 224, 168,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-family:Geist Mono,monospace;">Date</div>' + (f['Date Ajout'] ? new Date(f['Date Ajout']).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : '—') + '</div>';
  html += '</div>';

  if (f['Pourquoi']) {
    html += '<div style="margin-top:18px;padding:16px;background:rgba(232,148,10,.04);border:1px solid rgba(232,148,10,.1);border-radius:12px;font-family:Geist,sans-serif;font-size:14px;color:rgba(252, 224, 168,.65);line-height:1.7;">';
    html += '<div style="font-size:10px;color:#E8940A;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-family:Geist Mono,monospace;">Pourquoi lui/elle ?</div>' + f['Pourquoi'];
    html += '</div>';
  }

  // WhatsApp direct
  var tel = (f['Téléphone']||'').replace(/\s/g,'').replace(/^\+/,'');
  if (tel) {
    html += '<a href="https://wa.me/' + tel + '" target="_blank" style="display:block;margin-top:14px;text-align:center;font-family:Geist,sans-serif;font-size:13px;color:#25D366;text-decoration:none;">💬 Contacter sur WhatsApp</a>';
  }

  // Actions
  html += '<div style="display:flex;gap:10px;margin-top:20px;justify-content:center;flex-wrap:wrap;">';
  if (statut === 'En attente') {
    html += '<button onclick="updateCandStatus(\'' + recordId + '\',\'Présélectionné\');document.getElementById(\'modal-agent-detail\').style.display=\'none\'" style="background:rgba(59,130,246,.15);color:#3b82f6;border:1px solid rgba(59,130,246,.3);padding:10px 20px;border-radius:10px;font-family:Geist,sans-serif;font-weight:700;cursor:pointer;font-size:13px;">⭐ Présélectionner</button>';
  }
  if (statut === 'Présélectionné') {
    html += '<button onclick="validateAgent(\'' + recordId + '\');document.getElementById(\'modal-agent-detail\').style.display=\'none\'" style="background:#E8940A;color:#14100A;border:none;padding:10px 20px;border-radius:10px;font-family:Geist,sans-serif;font-weight:700;cursor:pointer;font-size:13px;">✓ Valider comme agent</button>';
  }
  if (statut !== 'Validé' && statut !== 'Refusé') {
    html += '<button onclick="updateCandStatus(\'' + recordId + '\',\'Refusé\');document.getElementById(\'modal-agent-detail\').style.display=\'none\'" style="background:rgba(255,107,107,.08);color:#ff6b6b;border:1px solid rgba(255,107,107,.15);padding:10px 20px;border-radius:10px;font-family:Geist,sans-serif;font-weight:700;cursor:pointer;font-size:13px;">✗ Refuser</button>';
  }
  if (statut === 'Refusé') {
    html += '<button onclick="updateCandStatus(\'' + recordId + '\',\'En attente\');document.getElementById(\'modal-agent-detail\').style.display=\'none\'" style="background:rgba(255,255,255,.08);color:#FCE0A8;border:1px solid rgba(255,255,255,.12);padding:10px 20px;border-radius:10px;font-family:Geist,sans-serif;font-weight:700;cursor:pointer;font-size:13px;">↩ Remettre en attente</button>';
  }
  html += '</div>';

  document.getElementById('modal-agent-detail-content').innerHTML = html;
  document.getElementById('modal-agent-detail').style.display = 'block';
}

// ── Templates de notifications WOZALI ──
window.WOZALI_NOTIF_TEMPLATES = {
  commission:      { titre: "Commission reçue",                   corps: "Tu as reçu {montant} FCFA · {filleul} vient de renouveler son Plan Pro" },
  rappel_abo:      { titre: "Ton Plan Pro expire dans 3 jours",   corps: "Renouvelle maintenant pour garder tes avantages Pro" },
  bourse:          { titre: "Tirage dans 24h",                    corps: "Tu es éligible à la Bourse de Croissance. Le tirage a lieu vendredi à 18h00." }
};
window.wozaliNotif = function(key, vars){
  var tpl = window.WOZALI_NOTIF_TEMPLATES[key];
  if (!tpl) return { titre:'', corps:'' };
  var fill = function(s){ return s.replace(/\{(\w+)\}/g, function(_,k){ return (vars && vars[k] != null) ? vars[k] : ''; }); };
  return { titre: fill(tpl.titre), corps: fill(tpl.corps) };
};

// ── Helper central : push une notif dans le champ Notifications d'un prestataire ──
// Utilise les templates WOZALI_NOTIF_TEMPLATES (clé + variables).
// Ex : window.wozaliNotifPush(recId, 'commission', { montant: 1000, filleul: 'Koffi' })
window.wozaliNotifPush = async function(prestataireId, key, vars){
  try {
    if (!prestataireId || !key) return false;
    if (!window.supaPrest) return false;
    var tpl = window.wozaliNotif(key, vars || {});
    if (!tpl || !tpl.titre) return false;
    var prest = await window.supaPrest.findById(prestataireId);
    if (!prest) return false;
    var notifs = [];
    try { notifs = JSON.parse(prest.fields['Notifications'] || '[]'); } catch(e) { notifs = []; }
    notifs.unshift({
      id: Date.now().toString(),
      type: key,
      titre: tpl.titre,
      message: tpl.corps,
      corps: tpl.corps,
      date: new Date().toISOString(),
      read: false,
      lu: false
    });
    await window.supaPrest.update(prestataireId, { 'Notifications': JSON.stringify(notifs.slice(0, 50)) });
    return true;
  } catch(err) { console.warn('wozaliNotifPush:', err); return false; }
};

// ── Cron client-side : rappel J-3 expiration Pro + bourse J-1 ──
// Vérifie une seule fois par jour au chargement si currentPrestataire est Pro.
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      try {
        if (!window.currentPrestataire || !window.currentPrestataire.fields) return;
        var f = window.currentPrestataire.fields;
        var today = new Date().toISOString().slice(0,10);

        // A) Rappel expiration Pro J-3
        if ((f['Abonnement']||'Base') !== 'Base' && f['Abonnement Expiry']) {
          var lastAbo = localStorage.getItem('wozali_notif_rappel_abo_date');
          if (lastAbo !== today) {
            var expiry = new Date(f['Abonnement Expiry']);
            var diffDays = Math.ceil((expiry - new Date()) / (1000*60*60*24));
            if (diffDays === 3) {
              window.wozaliNotifPush(window.currentPrestataire.id, 'rappel_abo', {});
              localStorage.setItem('wozali_notif_rappel_abo_date', today);
            }
          }
        }

        // B) Bourse de Croissance — tirage le dernier vendredi du mois, notif J-1 (jeudi)
        var now = new Date();
        var isTwentyNinth = now.getDay() === 4 && (prochainVendrediFinMois() - now.getTime()) < 86400000 * 1.5;
        if (isTwentyNinth && (f['Abonnement']||'Base') !== 'Base') {
          var lastBourse = localStorage.getItem('wozali_notif_bourse_date');
          if (lastBourse !== today) {
            window.wozaliNotifPush(window.currentPrestataire.id, 'bourse', {});
            localStorage.setItem('wozali_notif_bourse_date', today);
          }
        }
      } catch(e) { console.warn('cron notif client:', e); }
    }, 3000);
  });
})();

// ── Onboarding 6 écrans (dignité, activation, pas de Pro) ──
(function(){
  var STORAGE_KEY = 'wozali_onboarding_done';

  function buildOnboarding(){
    if (document.getElementById('wozali-onboarding-modal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'wozali-onboarding-modal';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(10,8,5,0.97);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Geist,sans-serif;';
    wrap.innerHTML = ''
      + '<div style="max-width:420px;width:100%;display:flex;flex-direction:column;align-items:center;">'
      +   '<div style="font-family:\'DM Serif Display\',serif;font-style:italic;font-size:20px;color:#E8940A;letter-spacing:.5px;margin-bottom:18px;">WOZALI</div>'
      +   '<div style="width:100%;background:#181209;border:1px solid rgba(232,148,10,0.22);border-radius:24px;padding:34px 26px 26px;text-align:center;color:#FCE0A8;box-shadow:0 30px 80px rgba(0,0,0,0.6);position:relative;">'
      +     '<div style="position:absolute;top:0;left:26px;right:26px;height:1px;background:rgba(252,224,168,0.14);"></div>'
      +     '<div id="wozali-onb-icon" style="width:86px;height:86px;margin:6px auto 20px;border-radius:50%;background:#20180C;border:1px solid rgba(232,148,10,0.45);display:flex;align-items:center;justify-content:center;box-shadow:0 0 34px rgba(232,148,10,0.22);"></div>'
      +     '<div id="wozali-onb-eyebrow" style="font-family:\'Geist Mono\',monospace;font-size:11px;letter-spacing:2.5px;color:#E8940A;text-transform:uppercase;margin-bottom:14px;"></div>'
      +     '<h2 id="wozali-onb-title" style="font-family:\'DM Serif Display\',serif;font-size:26px;font-weight:400;margin:0 0 14px;color:#FCE0A8;line-height:1.16;"></h2>'
      +     '<p id="wozali-onb-text" style="font-size:14px;line-height:1.66;color:rgba(252,224,168,0.66);margin:0 0 26px;"></p>'
      +     '<div id="wozali-onb-dots" style="display:flex;gap:7px;justify-content:center;margin-bottom:22px;"></div>'
      +     '<div id="wozali-onb-btns"></div>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(wrap);

    var steps = [
      { icon:'wallet',    eyebrow:'Le démarrage',  title:"Le problème, c'est pas ton travail.", text:"Tu bosses dur. Tu connais ton métier. Et pourtant l'argent ne rentre pas comme il devrait. Au Togo et au Bénin, le travail ne manque pas. C'est l'argent qui circule pas. Pas parce que tu vaux moins. Parce que personne ne te voit.", primary:'Suivant' },
      { icon:'crown',     eyebrow:'Ta dignité',    title:"Fini de demander. Fini de quémander.", text:"Combien de fois t'as dû connaître quelqu'un pour décrocher un contrat ? Combien ont accepté n'importe quoi juste pour être choisis ? Ici c'est différent. Ton travail parle à ta place. Tu ne demandes plus une faveur, tu montres ce que tu sais faire. Ta valeur a enfin une place.", primary:'Suivant' },
      { icon:'map-pin',   eyebrow:'Tes clients',   title:"Tes clients te trouvent. Sans réseau.", text:"Le client de Bè qui cherche un coiffeur. La famille d'Akpakpa qui veut un mécano. La mariée d'Adidogomé qui cherche une couturière. Ton GPS, ton WhatsApp, tes avis vérifiés. Ils te trouvent en 30 secondes et te contactent direct. Tu vends plus, plus souvent.", primary:'Suivant' },
      { icon:'briefcase', eyebrow:"L'emploi",      title:"Trouver un job, sans galère.", text:"Marre des annonces floues et des « envoie ton CV et attends » ? Marre qu'on te demande des choses en échange d'un poste ? Sur WOZALI, les offres sont claires : métier, quartier, salaire affiché, contact direct. Tu postules en deux clics depuis ton téléphone. On te choisit pour ton travail, pas pour tes relations.", primary:'Suivant' },
      { icon:'trophy',    eyebrow:'La récompense', title:"Ton sérieux te rapporte. Chaque mois.", text:"Chaque mois, WOZALI verse 500 000 FCFA à ses membres les plus sérieux. Pas une promesse, un virement. La Bourse de Croissance, 300 000 FCFA. La Bourse des Mains d'Or, 200 000 FCFA réservés aux femmes coiffeuses et couturières, sans condition de plan. Premier tirage le 25 septembre 2026. Ton travail te paye enfin.", primary:'Suivant' },
      { icon:'sparkles',  eyebrow:'Bienvenue',     title:"WOZALI t'appartient.", text:"Tu as fait le premier pas que beaucoup n'osent pas faire. À partir d'aujourd'hui, ton travail te ramène des clients, pas des faveurs. Ajoute tes photos, complète ton profil, et laisse ton travail parler. Bienvenue sur WOZALI. Ta place est ici, et elle t'attendait.", primary:'Voir mon espace' }
    ];
    var idx = 0;

    function render(){
      var s = steps[idx];
      document.getElementById('wozali-onb-icon').innerHTML = '<i data-lucide="'+s.icon+'" style="width:40px;height:40px;color:#E8940A;"></i>';
      document.getElementById('wozali-onb-eyebrow').textContent = s.eyebrow || '';
      document.getElementById('wozali-onb-title').textContent = s.title;
      document.getElementById('wozali-onb-text').textContent = s.text;
      var dots = steps.map(function(_,i){
        return '<span style="width:'+(i===idx?'24px':'7px')+';height:7px;border-radius:100px;background:'+(i===idx?'#E8940A':'rgba(232,148,10,0.28)')+';transition:all .25s;"></span>';
      }).join('');
      document.getElementById('wozali-onb-dots').innerHTML = dots;
      document.getElementById('wozali-onb-btns').innerHTML = '<button id="wozali-onb-primary" style="width:100%;background:#E8940A;color:#0F0C09;border:none;padding:16px 24px;border-radius:100px;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 6px 20px rgba(232,148,10,0.28);">'+s.primary+'</button>';
      if (window.lucide && lucide.createIcons) { try { lucide.createIcons(); } catch(e){} }

      document.getElementById('wozali-onb-primary').onclick = function(){
        if (idx < steps.length - 1) { idx++; render(); }
        else {
          close();
          if (window.currentUser) {
            if (typeof viewMyProfile === 'function') viewMyProfile();
            else if (typeof showPage === 'function') showPage('dashboard');
          } else {
            if (typeof showPage === 'function') showPage('inscription');
          }
        }
      };
    }

    function close(){
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch(e){}
      var el = document.getElementById('wozali-onboarding-modal');
      if (el) el.remove();
    }

    render();
  }

  window.showWozaliOnboarding = function(){ buildOnboarding(); };

  // Auto-trigger après inscription (1er login)
  document.addEventListener('DOMContentLoaded', function(){
    try {
      var justSigned = localStorage.getItem('wozali_just_signed_up');
      if (justSigned === '1') {
        localStorage.removeItem('wozali_just_signed_up');
        setTimeout(buildOnboarding, 600);
      }
    } catch(e){}
  });
})();
