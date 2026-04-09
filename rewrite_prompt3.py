#!/usr/bin/env python3
"""PROMPT 3 — Profils publics + Recherche + WOLO Jobs rewrite."""

FILE = '/Users/schealtiellawson/Documents/04 - KALATOGO/Projet/KALAtogo/repo/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

count = 0
def rep(old, new, label=""):
    global html, count
    n = html.count(old)
    if n > 0:
        html = html.replace(old, new)
        count += n
        print(f"✅ [{n}x] {label or old[:70]}...")
    else:
        print(f"⚠️  NOT FOUND: {label or old[:70]}...")

# ═══════════════════════════════════════════════════════
# MISSION 1 — PAGE PROFIL PUBLIC
# ═══════════════════════════════════════════════════════

# 1.A — Badge disponibilité (profil sidebar)
rep(
    """${dispo ? '🟢' : '🔴'}
                    <span><strong style="color:white;">Statut</strong> · ${dispo ? '<span style="color:#4ade80;">Disponible</span>' : 'Occupé'}</span>""",
    """${dispo ? '<span style="color:#E8940A;">⭐</span>' : '⚪'}
                    <span><strong style="color:white;">Statut</strong> · ${dispo ? '<span style="color:#E8940A;">Disponible maintenant</span>' : 'Occupé pour l\\'instant'}</span>""",
    "Sidebar availability badge"
)

# 1.A — Profil status text (hero area)
rep(
    """${dispo ? '<span style="color:#4ade80;">Disponible maintenant</span>' : 'Hors ligne'}""",
    """${dispo ? '<span style="color:#E8940A;">⭐ Disponible maintenant</span>' : 'Occupé pour l\\'instant'}""",
    "Hero availability status"
)

# 1.A — Online badge dot color (remove green)
rep(
    """<div class="profil-online-badge ${dispo ? '' : 'offline'}"></div>""",
    """<div class="profil-online-badge ${dispo ? '' : 'offline'}" style="${dispo ? 'background:#E8940A;' : ''}"></div>""",
    "Online badge dot gold"
)

# 1.A — Badges section — add Bourse/Top50/Awards/Fondateur
rep(
    """${(f['Badge Fondateur'] || f['Fondateur']) ? '<span class="badge" style="background:linear-gradient(135deg,rgba(232,148,10,0.3),rgba(255,200,0,0.2));color:#E8940A;border:1px solid rgba(232,148,10,0.4);">🏅 Fondateur</span>' : ''}
                ${note > 0 ? `<span class="badge" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">${starsHtml(note)} ${note.toFixed(1)}</span>` : ''}""",
    """${(f['Badge Fondateur'] || f['Fondateur']) ? '<span class="badge" style="background:linear-gradient(135deg,rgba(232,148,10,0.3),rgba(255,200,0,0.2));color:#E8940A;border:1px solid rgba(232,148,10,0.4);">🏅 Membre Fondateur WOLO</span>' : ''}
                ${(abonnement !== 'Base' && score >= 80) ? '<span class="badge" style="background:linear-gradient(135deg,rgba(232,148,10,0.25),rgba(245,158,11,0.15));color:#E8940A;border:1px solid rgba(232,148,10,0.5);">🏆 Éligible Bourse de Croissance</span>' : ''}
                ${note > 0 ? `<span class="badge" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">${starsHtml(note)} ${note.toFixed(1)}</span>` : ''}""",
    "Badges Fondateur + Bourse eligibility"
)

# 1.A — CTA WhatsApp sidebar
rep(
    """${tel ? `<a href="${waLink}" class="btn btn-wa" style="width:100%;justify-content:center;margin-bottom:10px;" target="_blank">💬 Contacter sur WhatsApp</a>` : ''}
                <div style="font-size:13px;color:rgba(255,255,255,0.35);text-align:center;line-height:1.6;">
                  En contactant via WOLO, tu bénéficies de la garantie prestataire vérifié.
                </div>""",
    """${tel ? `<a href="${waLink}" class="btn btn-wa" style="width:100%;justify-content:center;margin-bottom:10px;" target="_blank">💬 Contacter maintenant sur WhatsApp</a>` : ''}
                <div style="font-size:12px;color:rgba(255,255,255,0.35);text-align:center;line-height:1.6;">
                  Contact direct. Zéro intermédiaire. L'argent va dans sa caisse.
                </div>""",
    "CTA WhatsApp sidebar"
)

# 1.A — Tarif box
rep(
    """<div class="tarif-box">
                  <div class="tarif-range">
                    ${tarifMin ? tarifMin.toLocaleString() : '?'}${tarifMax ? ' → ' + tarifMax.toLocaleString() : ''} FCFA
                  </div>
                  <div class="tarif-label">Par prestation</div>
                </div>""",
    """<div class="tarif-box">
                  <div class="tarif-range">
                    ${tarifMin ? 'À partir de ' + tarifMin.toLocaleString() + ' FCFA' : ''}${tarifMax ? '<br>Jusqu\\'à ' + tarifMax.toLocaleString() + ' FCFA selon la prestation' : ''}
                  </div>
                  <div class="tarif-label" style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:6px;">Prix négociables directement avec ${nom.split(' ')[0]}.<br>Paiement : TMoney · Flooz (Togo) / MTN Money · Moov Money (Bénin)</div>
                </div>""",
    "Tarif box rewrite"
)

# 1.A — Payer via Flooz/TMoney → bi-national
rep(
    """<h3 style="margin:0;font-size:16px;color:rgba(255,255,255,0.95);">Payer via Flooz / TMoney</h3>
                    <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:2px 0 0;">Paiement direct — rapide &amp; sécurisé</p>""",
    """<h3 style="margin:0;font-size:16px;color:rgba(255,255,255,0.95);">Payer via Mobile Money</h3>
                    <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:2px 0 0;">MTN · Moov (Bénin) — TMoney · Flooz (Togo)</p>""",
    "Payment section title bi-national"
)

rep(
    """<span style="background:rgba(255,255,255,0.1);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);">📲 Flooz</span>
                  <span style="background:rgba(255,255,255,0.1);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);">📱 TMoney</span>""",
    """<span style="background:rgba(255,255,255,0.1);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);">📲 MTN Money</span>
                  <span style="background:rgba(255,255,255,0.1);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);">📱 Moov Money</span>
                  <span style="background:rgba(255,255,255,0.1);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);">📲 TMoney</span>
                  <span style="background:rgba(255,255,255,0.1);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);">📱 Flooz</span>""",
    "Payment methods badges"
)

# 1.B — Section avis title
rep(
    """<h3 style="margin-bottom:0;">⭐ Avis clients</h3>
                  <button class="btn btn-secondary btn-sm" onclick="openModalAvis('${recordId}','${nom}')">+ Laisser un avis</button>""",
    """<h3 style="margin-bottom:0;">⭐ Ce que ses clients disent de ${nom.split(' ')[0]}.</h3>
                  <button class="btn btn-secondary btn-sm" onclick="openModalAvis('${recordId}','${nom}')">+ Laisser un avis</button>""",
    "Avis section title"
)

# 1.B — État vide avis
rep(
    """? '<p style="color:rgba(255,255,255,0.4);font-size:14px;text-align:center;padding:24px 0;">Pas encore d\\'avis. Sois le premier !</p>'""",
    """? `<div style="text-align:center;padding:32px 16px;">
        <p style="color:rgba(255,255,255,0.5);font-size:15px;font-weight:600;margin-bottom:8px;">${nom.split(' ')[0]} n'a pas encore d'avis clients.</p>
        <p style="color:rgba(255,255,255,0.35);font-size:13px;line-height:1.7;margin-bottom:16px;">Si tu as fait appel à ses services —<br>laisse un avis. C'est gratuit. Ça change tout pour lui.</p>
        <button class="btn btn-secondary btn-sm" onclick="openModalAvis('${recordId}','${nom}')">→ Laisser le premier avis</button>
      </div>`""",
    "Avis empty state"
)

# 1.B — Modal avis
rep(
    """<h3 style="font-family:Fraunces,serif;font-size:22px;font-weight:900;margin-bottom:6px;">Laisser un avis</h3>""",
    """<h3 style="font-family:Fraunces,serif;font-size:22px;font-weight:900;margin-bottom:6px;">Ton avis compte. Pour lui. Pour tous.</h3>""",
    "Modal avis title"
)

rep(
    """<label>Note globale <span class="req">*</span></label>""",
    """<label>Comment évalues-tu son travail ? <span class="req">*</span></label>""",
    "Modal avis note label"
)

rep(
    """<label>Ton commentaire <span class="req">*</span></label>
      <textarea id="avis-comment" placeholder="Décris ton expérience avec ce prestataire..."></textarea>""",
    """<label>Décris ce qu'il a fait. Comment c'était.</label>
      <textarea id="avis-comment" placeholder="Si tu recommanderais — dis pourquoi. Les vrais avis aident les vrais artisans."></textarea>""",
    "Modal avis comment label"
)

rep(
    """      Publier mon avis
    </button>
  </div>
</div>""",
    """      Publier mon avis — c'est gratuit
    </button>
    <p style="font-size:11px;color:var(--gris);text-align:center;margin-top:8px;line-height:1.5;">Ton avis est lu par tous les visiteurs de WOLO Market<br>à Cotonou et à Lomé.</p>
  </div>
</div>""",
    "Modal avis publish button + micro-text"
)

# 1.C — Section photos title
rep(
    """<h3 style="margin:0 0 12px;font-size:16px;">📸 Albums</h3>""",
    """<h3 style="margin:0 0 12px;font-size:16px;">📸 Le travail de ${nom.split(' ')[0]} — en images.</h3>""",
    "Albums section title"
)

# 1.D — Localisation: Google Maps link text
rep(
    """🗺️ Voir sur Google Maps · Itinéraire →""",
    """🗺️ Voir l'itinéraire — envoie au zem pour qu'il arrive directement""",
    "Maps link text"
)

rep(
    """🗺️ Rechercher dans ce quartier →""",
    """🗺️ Trouver ${nom.split(' ')[0]} dans ce quartier →""",
    "Maps search quartier text"
)

# 1.F — Posts section title
rep(
    """<h3 style="margin-bottom:16px;">📝 Publications</h3>""",
    """<h3 style="margin-bottom:16px;">📝 Ce que ${nom.split(' ')[0]} partage sur WOLO.</h3>""",
    "Posts section title"
)

# 1.F — Posts empty state
rep(
    """<div style="font-size:32px;margin-bottom:10px;">📭</div>
      Aucune publication pour l'instant.${isOwner ? '<br><span style="font-size:12px;">Partagez votre première réalisation !</span>' : ''}""",
    """<div style="font-size:32px;margin-bottom:10px;">📭</div>
      ${nom.split(' ')[0]} n'a pas encore publié de contenu.${isOwner ? '<br><span style="font-size:12px;">Les prestataires actifs sur WOLO Market apparaissent plus haut dans les résultats.</span>' : '<br><span style="font-size:12px;">Les prestataires actifs sur WOLO Market apparaissent plus haut dans les résultats de recherche.</span>'}""",
    "Posts empty state"
)

# 1.E — Sidebar info: Quartier label
rep(
    """<div style="display:flex;align-items:center;gap:8px;">📍 <span><strong style="color:white;">Quartier</strong> · ${quartier}</span></div>""",
    """<div style="display:flex;align-items:center;gap:8px;">📍 <span><strong style="color:white;">Où trouver ${nom.split(' ')[0]}</strong> · ${quartier}</span></div>""",
    "Sidebar quartier label"
)

# 1.A — Payer via Flooz button text
rep(
    """>💳 Payer via Flooz/TMoney</button>""",
    """>💳 Payer via Mobile Money</button>""",
    "Pay button text"
)

# ═══════════════════════════════════════════════════════
# MISSION 2 — PAGE RECHERCHE
# ═══════════════════════════════════════════════════════

# 2.A — Title and intro
rep(
    """<h2 style="font-family:Fraunces,serif;font-size:28px;font-weight:900;margin-bottom:20px;">Trouver un professionnel</h2>""",
    """<div style="font-size:12px;font-weight:700;color:#E8940A;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">BÉNIN · TOGO · PARTOUT OÙ TU ES</div>
      <h2 style="font-family:Fraunces,serif;font-size:28px;font-weight:900;margin-bottom:8px;">Trouve le bon professionnel.<br>Maintenant. Sans piston.</h2>
      <p style="font-size:14px;color:var(--gris);margin-bottom:20px;">Artisans, prestataires, talents digitaux — vérifiés, notés, disponibles à Cotonou et à Lomé.</p>""",
    "Search page title + intro"
)

# 2.B — Placeholder métier
rep(
    """<option value="">Tous les métiers</option>
          <optgroup label="Beauté &amp; Bien-être">""",
    """<option value="">Quel métier cherches-tu ?</option>
          <optgroup label="Beauté &amp; Bien-être">""",
    "Search métier placeholder"
)

# 2.B — Search button
rep(
    """<button class="search-bar-btn" onclick="loadSearch()">🔍 Rechercher</button>""",
    """<button class="search-bar-btn" onclick="loadSearch()">Trouver maintenant →</button>""",
    "Search button text"
)

# 2.C — Filters: add Pro filter
rep(
    """<button class="filter-dispo" id="digital-btn" onclick="toggleDigitalFilter()" style="border-color:rgba(99,102,241,0.4);color:#a5b4fc;">🎓 Talents Digitaux</button>""",
    """<button class="filter-dispo" id="digital-btn" onclick="toggleDigitalFilter()" style="border-color:rgba(99,102,241,0.4);color:#a5b4fc;">🎓 Talents Digitaux</button>
        <button class="filter-dispo" id="pro-btn" onclick="toggleProFilter()" style="border-color:rgba(232,148,10,0.4);color:#E8940A;">⭐ Pro uniquement</button>""",
    "Add Pro filter button"
)

# 2.D — Tri options rewrite
rep(
    """<select class="filter-select" id="s-tri" onchange="loadSearch()">
          <option value="">Trier par défaut</option>
          <option value="note">⭐ Meilleures notes</option>
          <option value="vues">👁 Plus de vues</option>
          <option value="avis">💬 Plus recommandés</option>
          <option value="tarif-asc">💰 Tarif croissant</option>
        </select>""",
    """<select class="filter-select" id="s-tri" onchange="loadSearch()">
          <option value="">Pertinence (défaut)</option>
          <option value="note">⭐ Meilleures notes</option>
          <option value="score">🏆 Score WOLO (le plus élevé)</option>
          <option value="dispo">🕐 Disponibles maintenant</option>
          <option value="tarif-asc">💰 Tarif croissant</option>
          <option value="recent">🆕 Les plus récents</option>
        </select>""",
    "Tri options rewrite"
)

# 2.E — Empty state rewrite
rep(
    """if (records.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🔍</div>
        <h3>Aucun résultat</h3>
        <p>Essaie d'élargir ta recherche ou de changer les filtres.</p>
      </div>`;""",
    """if (records.length === 0) {
      const _qMetier = metier || 'ce métier';
      const _qQuartier = quartier || '';
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🔍</div>
        <h3>Aucun prestataire trouvé${_qQuartier ? ' pour "'+_qMetier+'" à "'+_qQuartier+'"' : ' pour "'+_qMetier+'"'}.</h3>
        <p style="margin-bottom:12px;">${_qQuartier ? 'Essaie un quartier proche, la ville entière, ou les deux pays.' : 'Ce métier n\\'est pas encore représenté sur WOLO Market.<br>Sois le premier — et sois trouvé avant tout le monde.'}</p>
        <button class="btn btn-primary btn-sm" onclick="showPage('inscription')">→ Créer mon profil WOLO — c'est gratuit</button>
      </div>`;""",
    "Search empty state rewrite"
)

# Second empty state (fallback/demo)
rep(
    """`<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🔍</div><h3>Aucun résultat</h3><p>Essaie d'autres filtres.</p></div>`""",
    """`<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🔍</div><h3>Aucun prestataire trouvé.</h3><p>Essaie d'élargir ta recherche ou <a href="javascript:showPage('inscription')" style="color:var(--or);font-weight:700;">crée ton profil</a>.</p></div>`""",
    "Search empty state fallback"
)

# 2.F — Card: availability text
rep(
    """${dispo ? '<div class="pcard-dispo" style="margin-top:6px;"><div class="dispo-dot"></div> Disponible</div>' : ''}""",
    """${dispo ? '<div class="pcard-dispo" style="margin-top:6px;"><div class="dispo-dot" style="background:#E8940A;"></div> <span style="color:#E8940A;">Disponible</span></div>' : '<div style="margin-top:6px;font-size:12px;color:var(--gris);display:flex;align-items:center;gap:5px;"><div style="width:7px;height:7px;border-radius:50%;background:#d1d5db;"></div> Occupé</div>'}""",
    "Card availability text"
)

# 2.F — Card CTA
rep(
    """<button class="btn btn-sm" style="background:#111;color:white;border:none;font-weight:700;border-radius:100px;padding:8px 16px;font-size:13px;" onclick="event.stopPropagation();showProfil('${record.id}')">👤 Voir profil</button>""",
    """<button class="btn btn-sm" style="background:#111;color:white;border:none;font-weight:700;border-radius:100px;padding:8px 16px;font-size:13px;" onclick="event.stopPropagation();showProfil('${record.id}')">→ Voir profil</button>""",
    "Card CTA button"
)

# ═══════════════════════════════════════════════════════
# MISSION 3 — WOLO JOBS
# ═══════════════════════════════════════════════════════

# 3.A — Navigation renaming
rep(
    """onclick="showPage('emploi')" style="color:var(--vert);font-weight:700;">💼 Offres d'emploi</button>""",
    """onclick="showPage('emploi')" style="color:var(--or);font-weight:700;">💼 WOLO Jobs</button>""",
    "Nav desktop: WOLO Jobs"
)

rep(
    """>💼 Offres d'emploi</button>
    <button onclick="showPage('tutoriels');closeMobileNav()""",
    """>💼 WOLO Jobs</button>
    <button onclick="showPage('tutoriels');closeMobileNav()""",
    "Nav mobile: WOLO Jobs"
)

# 3.A + 3.B — Emploi page hero
rep(
    """<div class="badge" style="background:rgba(232, 148, 10, 0.2);color:#4ade80;margin-bottom:16px;">💼 Offres d'emploi WOLO Market</div>
        <h1 style="color:white;font-size:clamp(28px,4vw,48px);margin-bottom:14px;">Offres d'emploi au Bénin et au Togo</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:16px;margin-bottom:16px;">Pas de CV Word que personne ne lit. Pas de connaissance à appeler. Pas de dossier à déposer en personne. Ton profil WOLO Market est ton CV. Tu postules en 1 clic. Le recruteur voit ton métier, tes avis, ta localisation. Ici, c'est ton travail qui parle.</p>
        <div style="background:rgba(232, 148, 10, 0.15);border:1px solid rgba(232, 148, 10, 0.3);border-radius:12px;padding:14px 18px;margin-bottom:20px;">
          <p style="color:rgba(255,255,255,0.85);font-size:14px;line-height:1.7;margin:0;">💡 Les démarches classiques prennent des semaines. Les candidatures envoyées dans le vide restent sans réponse. Les entreprises lisent 1 CV sur 50. <strong style="color:white;">WOLO Market ne te promet pas un emploi. Il te promet d'être vu par ceux qui recrutent vraiment. Maintenant.</strong></p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <button class="btn btn-or" onclick="showDashSection('recrut-publier');showPage('dashboard')">📢 Publier une offre →</button>
          <span style="color:rgba(255,255,255,0.4);font-size:13px;">Réservé aux comptes Pro</span>
        </div>""",
    """<div style="font-size:12px;font-weight:700;color:#E8940A;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">BÉNIN · TOGO · SANS PISTON</div>
        <h1 style="color:white;font-size:clamp(28px,4vw,48px);margin-bottom:14px;">WOLO Jobs · Bénin & Togo</h1>
        <p style="color:rgba(255,255,255,0.8);font-size:17px;margin-bottom:6px;font-weight:700;">Les offres qui t'attendent.<br>Pas de CV Word. Pas de connexion requise. Juste ton profil WOLO.</p>
        <p style="color:rgba(255,255,255,0.6);font-size:15px;margin-bottom:16px;line-height:1.7;">Postule en 1 clic avec ton profil WOLO déjà généré. Le recruteur voit ton métier, tes avis, ta localisation. Ici, c'est ton travail qui parle. Pas tes connexions.</p>
        <div style="background:rgba(232, 148, 10, 0.1);border:1px solid rgba(232, 148, 10, 0.25);border-radius:12px;padding:14px 18px;margin-bottom:20px;">
          <p style="color:rgba(255,255,255,0.75);font-size:13px;line-height:1.7;margin:0;">Les démarches classiques prennent des semaines. Les candidatures envoyées dans le vide restent sans réponse. Les entreprises lisent 1 CV sur 50. <strong style="color:white;">WOLO Jobs ne te promet pas un emploi. Il te promet d'être vu par ceux qui recrutent vraiment. À Cotonou. À Lomé. Maintenant.</strong></p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <button class="btn btn-or" onclick="showDashSection('recrut-publier');showPage('dashboard')">📢 Publier une offre — réservé Plan Pro</button>
          <button class="btn" style="background:rgba(255,255,255,0.1);color:white;border:1.5px solid rgba(255,255,255,0.2);" onclick="document.getElementById('emploi-list').scrollIntoView({behavior:'smooth'})">Voir toutes les offres ↓</button>
        </div>""",
    "Emploi hero rewrite"
)

# 3.E — Card offre: postuler button
rep(
    """>✅ Postuler en 1 clic</button>""",
    """>→ Postuler avec mon profil WOLO</button>""",
    "Card offre postuler button"
)

# 3.F — Modal candidature title
rep(
    """<h3 style="font-family:Fraunces,serif;font-size:22px;font-weight:900;margin-bottom:6px;">📨 Postuler à cette offre</h3>""",
    """<h3 style="font-family:Fraunces,serif;font-size:22px;font-weight:900;margin-bottom:6px;">Tu postules pour cette offre</h3>""",
    "Modal candidature title"
)

# 3.F — Message label
rep(
    """<label style="font-weight:700;font-size:14px;display:block;margin-bottom:6px;">Message au recruteur (recommandé)</label>
    <textarea id="modal-cand-message" placeholder="Parle de ta motivation, ton expérience pertinente...""",
    """<label style="font-weight:700;font-size:14px;display:block;margin-bottom:6px;">Dis pourquoi c'est toi le bon profil (fortement recommandé)</label>
    <textarea id="modal-cand-message" placeholder="Bonjour, je suis [métier] à [quartier]. J'ai X ans d'expérience et des avis clients vérifiés sur WOLO. Je suis disponible dès...""",
    "Modal candidature message label"
)

# Add micro-text below message field
rep(
    """<div id="modal-cand-error" style="color:#dc2626;font-size:13px;margin-top:8px;display:none;"></div>""",
    """<p style="font-size:11px;color:var(--gris);margin-top:6px;line-height:1.5;">Les candidatures avec message sont lues en premier. 3 phrases suffisent. Sois direct(e).</p>
    <div id="modal-cand-error" style="color:#dc2626;font-size:13px;margin-top:8px;display:none;"></div>""",
    "Modal candidature micro-text"
)

# 3.F — Submit button
rep(
    """>✅ Envoyer ma candidature</button>""",
    """>→ Envoyer ma candidature</button>""",
    "Modal candidature submit button"
)

# 3.F — Confirmation after send
rep(
    """toast('✅ Candidature envoyée avec succès !', 'success');
      document.getElementById('modal-candidature').style.display = 'none';""",
    """document.getElementById('modal-candidature').style.display = 'none';
      // Show confirmation overlay
      const _confDiv = document.createElement('div');
      _confDiv.className = 'modal-overlay active';
      _confDiv.style.zIndex = '10002';
      _confDiv.innerHTML = '<div class="modal" style="max-width:480px;text-align:center;padding:36px;"><div style="font-size:48px;margin-bottom:16px;">✓</div><h3 style="font-family:Fraunces,serif;font-size:22px;font-weight:900;margin-bottom:10px;">Candidature envoyée !</h3><p style="color:var(--gris);font-size:14px;line-height:1.7;margin-bottom:20px;">Le recruteur reçoit ton profil WOLO complet — tes avis clients, tes photos, ta localisation, ta disponibilité.</p><div style="display:flex;flex-direction:column;gap:10px;"><button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;" onclick="showPage(\\'dashboard\\');this.closest(\\'.modal-overlay\\').remove();">→ Compléter mon profil</button><button class="btn btn-secondary btn-sm" style="width:100%;justify-content:center;" onclick="this.closest(\\'.modal-overlay\\').remove();">Voir d\\'autres offres</button></div><p style="font-size:11px;color:var(--gris);margin-top:14px;">Si tu n\\'as pas de réponse dans 7 jours — postule à d\\'autres offres.</p></div>';
      document.body.appendChild(_confDiv);
      _confDiv.onclick = function(e) { if (e.target === _confDiv) _confDiv.remove(); };""",
    "Candidature confirmation overlay"
)

# 3.G — Recrut publier section title
rep(
    """<h2>📢 Publier une offre d'emploi</h2>
          <p>Trouve les bons profils parmi les prestataires WOLO Market.</p>""",
    """<h2>📢 Publie ton offre. Trouve ton profil.</h2>
          <p>Les bons candidats sont déjà sur WOLO Market. Ils t'attendent sans le savoir.</p>""",
    "Recrut publier title"
)

# 3.G — Form labels
rep(
    """<label class="form-label">Titre du poste *</label>
                <input type="text" id="recrut-titre" placeholder="Ex: Électricien qualifié pour chantier" class="form-input">""",
    """<label class="form-label">Quel profil cherches-tu ? *</label>
                <input type="text" id="recrut-titre" placeholder="Sois précis(e) — les candidats lisent le titre en premier" class="form-input">""",
    "Recrut titre label"
)

rep(
    """<label class="form-label">Description du poste *</label>
                <textarea id="recrut-description" placeholder="Décris le poste, les missions, les horaires, les conditions..." class="form-input" style="min-height:120px;resize:vertical;"></textarea>""",
    """<label class="form-label">Description du poste *</label>
                <textarea id="recrut-description" placeholder="Décris le travail réel. Les horaires. Le salaire si possible. Les offres transparentes reçoivent 3× plus de candidatures sérieuses." class="form-input" style="min-height:120px;resize:vertical;"></textarea>""",
    "Recrut description placeholder"
)

# 3.G — Publish button
rep(
    """<button class="btn btn-primary" onclick="publierOffre()" style="width:100%;justify-content:center;">📢 Publier l'offre</button>""",
    """<button class="btn btn-primary" onclick="publierOffre()" style="width:100%;justify-content:center;">📢 Publier sur WOLO Jobs</button>""",
    "Recrut publish button"
)

# Home section header "Offres d'emploi récentes"
rep(
    """<h2 style="font-family:Fraunces,serif;font-size:32px;font-weight:900;">Offres d'emploi récentes</h2>""",
    """<h2 style="font-family:Fraunces,serif;font-size:32px;font-weight:900;">WOLO Jobs — offres récentes</h2>""",
    "Home offres title"
)

# ═══════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n✅ Prompt 3 rewrite complete — {count} replacements applied.")
