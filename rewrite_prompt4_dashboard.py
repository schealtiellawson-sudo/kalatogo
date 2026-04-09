#!/usr/bin/env python3
"""PROMPT 4 — MISSION 1: Dashboard complet rewrite."""

FILE = '/Users/schealtiellawson/Documents/04 - KALATOGO/Projet/KALAtogo/repo/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = [
    # ══ 1.A — En-tête dashboard / Accueil ══

    # Welcome message (JS sets this dynamically — we update the default HTML)
    ('<h2 id="dash-welcome">Bonjour 👋</h2>',
     '<h2 id="dash-welcome">Bonjour 👋</h2>'),  # keep same — JS will personalize

    # Statut disponibilité — pill
    ("if (txt) txt.textContent = dispo ? '🟢 Disponible' : '⚪ Hors ligne';",
     "if (txt) txt.textContent = dispo ? '⭐ Disponible' : '🟡 Invisible';"),

    ('<span id="dash-dispo-txt">Hors ligne</span>',
     '<span id="dash-dispo-txt">Invisible</span>'),

    # ══ 1.B — Section "Mes Photos" ══

    ('<h2>📸 Mes Photos</h2>',
     '<h2>📸 Mes Photos \u00b7 Ta vitrine visuelle</h2>'),

    ('<p>Les photos augmentent tes chances de contact de 3\u00d7</p>',
     '<p>Les profils avec 3+ photos re\u00e7oivent 3\u00d7 plus de contacts.</p>'),

    # Explainer photos
    ("📸 <strong>Tes photos, c'est ta meilleure pub.</strong> À Lomé, les gens font confiance à ce qu'ils voient. Une coiffeuse avec de belles photos de ses créations est contactée 3× plus. Montre ton travail — chaque photo est un argument de vente.",
     "📸 <strong>À Cotonou comme à Lomé, on achète ce qu'on voit.</strong> Chaque photo est un argument de vente silencieux. Les profils avec 3+ photos reçoivent 3× plus de contacts."),

    # Photo profil upload text (inscription page)
    ('<div class="upload-text"><strong>Clique pour uploader</strong> ou glisse ta photo<br><span style="font-size:12px;color:var(--gris);">JPG, PNG · Max 5MB</span></div>',
     '<div class="upload-text"><strong>Clique pour choisir ta photo de profil.</strong><br>C\'est la premi\u00e8re chose que le client voit.<br><span style="font-size:12px;color:var(--gris);">JPG ou PNG \u00b7 Max 5MB \u00b7 Pas de filtre, pas de flou.</span></div>'),

    # Réalisations title
    ('<h3 style="font-family:Fraunces,serif;font-size:16px;font-weight:700;margin:0;">Mes réalisations</h3>',
     '<h3 style="font-family:Fraunces,serif;font-size:16px;font-weight:700;margin:0;">Tes réalisations — montre ce que tu sais faire</h3>'),

    ('<p style="font-size:12px;color:var(--gris);margin:0;">Montre tes meilleurs travaux aux clients</p>',
     '<p style="font-size:12px;color:var(--gris);margin:0;">Chaque photo est un argument de vente silencieux.</p>'),

    # Albums
    ('<h3 style="font-family:Fraunces,serif;font-size:16px;font-weight:700;margin:0;">Mes albums</h3>',
     '<h3 style="font-family:Fraunces,serif;font-size:16px;font-weight:700;margin:0;">Mes albums</h3>'),  # keep

    ('<p style="font-size:12px;color:var(--gris);margin:0;">Organise tes photos par catégorie</p>',
     '<p style="font-size:12px;color:var(--gris);margin:0;">Organise tes réalisations par catégorie. Un profil organisé inspire confiance.</p>'),

    # ══ 1.C — Section "Mes Posts / Mon Fil" ══

    ('<h2>📝 Mes posts</h2>',
     '<h2>📝 Mes Publications \u00b7 Ce que tu partages sur WOLO</h2>'),

    ('<p style="color:var(--gris);font-size:14px;margin-top:4px;">Tes publications, commentaires et engagements</p>',
     '<p style="color:var(--gris);font-size:14px;margin-top:4px;">Les prestataires qui publient r\u00e9guli\u00e8rement apparaissent plus haut dans les r\u00e9sultats.</p>'),

    # Commentaires reçus heading
    ('<h3 style="margin-bottom:14px;">💬 Commentaires reçus</h3>',
     '<h3 style="margin-bottom:14px;">💬 Ce que les gens disent de tes publications</h3>'),

    # Mon Fil section
    ('<h2>📰 Mon Fil</h2>',
     '<h2>📰 Mon Fil</h2>'),  # keep

    ('<p style="color:var(--gris);font-size:14px;margin-top:4px;">Les publications des pros que tu suis</p>',
     '<p style="color:var(--gris);font-size:14px;margin-top:4px;">Ce que partagent les prestataires que tu suis.</p>'),

    # ══ 1.D — Section "Mes RDV" ══

    ('<h2>Mes rendez-vous</h2>\n          <p>Gérez vos rendez-vous et demandes clients</p>',
     '<h2>📅 Mon Agenda \u00b7 Tes rendez-vous clients</h2>\n          <p>Tes cr\u00e9neaux confirm\u00e9s. Tes demandes en attente. Confirme vite — un client qui attend trop longtemps part ailleurs.</p>'),

    # RDV explainer / tooltip
    ("📅 <strong>Tes rendez-vous confirmés.</strong> Comme un carnet de rendez-vous, mais dans ton téléphone. Chaque fois qu'un client réserve un créneau avec toi, ça apparaît ici. Tu peux voir l'heure, le nom du client, et confirmer ou annuler.",
     "📅 <strong>Chaque RDV confirmé est un client gagné.</strong> Un RDV non confirmé dans les 2h — c'est un client perdu. Réponds vite. Toujours."),

    # Disponibilité explainer
    ("💡 <strong>C'est ici que tu gères ton agenda.</strong> Imagine que c'est comme mettre un panneau \"ouvert\" ou \"fermé\" devant ta boutique — mais en plus précis. Tu choisis les jours et heures où tu peux recevoir des clients. Quand c'est vert, les clients peuvent te demander un RDV. Quand c'est fermé, personne ne peut te déranger.",
     "💡 <strong>Quand veux-tu recevoir des clients ?</strong> Configure tes jours et heures de disponibilité. Les clients ne peuvent prendre RDV qu'aux créneaux que tu choisis. Quand tu es indisponible — aucun RDV ne peut être demandé. Comme un panneau \"Ouvert\" ou \"Fermé\" — mais intelligent. Et automatique."),

    # ══ 1.E — Section "Mode Emploi / CV WOLO" ══

    ('<h2>💼 Mode Emploi</h2>',
     '<h2>💼 Mon CV WOLO \u00b7 Postule aux offres en 1 clic</h2>'),

    ("<p>Indique que tu es ouvert aux opportunités d'emploi — les recruteurs pourront te trouver.</p>",
     "<p>Ton profil WOLO est ton CV. Quand tu postules, le recruteur re\u00e7oit tout automatiquement.</p>"),

    # Toggle heading
    ("<h3 style=\"font-family:Fraunces,serif;font-size:22px;font-weight:900;margin-bottom:8px;\">Je suis ouvert aux opportunités d'emploi</h3>",
     "<h3 style=\"font-family:Fraunces,serif;font-size:22px;font-weight:900;margin-bottom:8px;\">Je suis disponible pour des opportunit\u00e9s d'emploi</h3>"),

    # Toggle description
    ("<p style=\"font-size:14px;color:var(--gris);margin-bottom:24px;line-height:1.7;\">Quand activé :<br>• Badge \"Ouvert aux opportunités\" sur ton profil public<br>• Ton profil apparaît dans les recherches des recruteurs<br>• Tu peux postuler sur WOLO Jobs</p>",
     "<p style=\"font-size:14px;color:var(--gris);margin-bottom:24px;line-height:1.7;\">Quand activ\u00e9 :<br>\u2022 Les recruteurs peuvent te trouver et te contacter directement<br>\u2022 WOLO Match t'envoie des alertes d\u00e8s qu'une offre correspond \u00e0 ton profil<br>\u2022 Tu peux postuler sur WOLO Jobs en 1 clic</p>"),

    # Nav button
    ('<span class="icon">💼</span> Mode Emploi',
     '<span class="icon">💼</span> CV WOLO / Emploi'),

    # ══ 1.F — Section "Encaisser un paiement" ══

    ('<h2>💳 Encaisser un paiement</h2>',
     '<h2>💳 Encaisse \u00b7 G\u00e9n\u00e8re un lien de paiement instantan\u00e9</h2>'),

    ("<p style=\"color:var(--gris);font-size:14px;margin-top:4px;\">Génère un lien de paiement sécurisé à envoyer à ton client — il paie par Flooz, TMoney ou carte bancaire.</p>",
     '<p style="color:var(--gris);font-size:14px;margin-top:4px;">Ton client veut payer mais n\'a pas de cash sur lui ? G\u00e9n\u00e8re un lien. Il paie depuis son t\u00e9l\u00e9phone.<br>\U0001F1F9\U0001F1EC Togo : TMoney \u00b7 Flooz &nbsp;\U0001F1E7\U0001F1EF B\u00e9nin : MTN Money \u00b7 Moov Money &nbsp;\U0001F4B3 Visa / Mastercard</p>'),

    # Labels formulaire encaisser
    ('<label class="form-label">Montant à encaisser (FCFA) *</label>',
     '<label class="form-label">Combien tu dois encaisser ? (en FCFA) *</label>'),

    ('<label class="form-label">Description de la prestation *</label>',
     '<label class="form-label">Pour quelle prestation ? *</label>'),

    ('<label class="form-label">Nom du client (optionnel)</label>',
     '<label class="form-label">Pr\u00e9nom de ton client (optionnel)</label>'),

    ('<label class="form-label">Téléphone client (optionnel)</label>',
     '<label class="form-label">Son num\u00e9ro pour lui envoyer le lien WhatsApp (optionnel)</label>'),

    # Confirmation lien
    ("<div style=\"font-size:11px;font-weight:700;color:var(--vert);letter-spacing:0.08em;margin-bottom:8px;\">LIEN DE PAIEMENT GÉNÉRÉ</div>",
     "<div style=\"font-size:11px;font-weight:700;color:var(--vert);letter-spacing:0.08em;margin-bottom:8px;\">\u2713 LIEN DE PAIEMENT PR\u00caT</div>"),

    # Payment badges — add Bénin
    ('              <span style="background:#dcfce7;color:#16a34a;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">📱 TMoney</span>\n              <span style="background:#dbeafe;color:#1d4ed8;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">📲 Flooz</span>\n              <span style="background:#ede9fe;color:#7c3aed;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">💳 Visa / Mastercard</span>',
     '              <span style="background:#dcfce7;color:#16a34a;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">📱 TMoney</span>\n              <span style="background:#dbeafe;color:#1d4ed8;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">📲 Flooz</span>\n              <span style="background:#fef3c7;color:#92400e;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">📱 MTN Money</span>\n              <span style="background:#fce7f3;color:#9d174d;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">📲 Moov Money</span>\n              <span style="background:#ede9fe;color:#7c3aed;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;">💳 Visa / Mastercard</span>'),

    # Historique liens
    ('<h3 style="margin:0;">🕐 Liens récents</h3>',
     '<h3 style="margin:0;">Tes derniers encaissements</h3>'),

    # ══ 1.G — Section "Sécurité du compte" ══

    ('<h2>Sécurité du compte</h2>\n          <p>Gère ton email et mot de passe</p>',
     '<h2>S\u00e9curit\u00e9 \u00b7 Prot\u00e8ge ton compte WOLO</h2>\n          <p>Ton compte contient tes avis, tes clients, tes revenus de parrainage. Utilise un mot de passe que tu n\'utilises nulle part ailleurs.</p>'),

    ('<label>Nouveau mot de passe</label>',
     '<label>Choisis un nouveau mot de passe (min. 8 caract\u00e8res)</label>'),

    ('<button class="btn btn-primary" onclick="changePassword()">🔒 Mettre à jour le mot de passe</button>',
     '<button class="btn btn-primary" onclick="changePassword()">\u2192 Enregistrer le nouveau mot de passe</button>'),

    # ══ 1.H — Section "Modifier mon profil" ══

    ('<h2>Modifier mon profil</h2>\n          <p>Ces informations sont visibles par tous les clients</p>',
     '<h2>Modifier mon profil</h2>\n          <p>Ton profil est ta boutique. Plus il est complet — plus les clients s\'arr\u00eatent.</p>'),

    ("✏️ <strong>Ta vitrine, c'est toi qui la décores.</strong> Plus ton profil est complet et beau, plus les clients vont te faire confiance. Ajoute ta photo, décris bien ce que tu fais, mets tes tarifs. Un bon profil = plus de clients qui t'appellent directement.",
     "✏️ <strong>Ton profil est ta boutique.</strong> Plus il est complet — plus les clients s'arr\u00eatent. Les champs marqu\u00e9s \u2726 sont prioritaires pour ton Score WOLO."),

    # Description label
    ('<label>Description de tes services</label>',
     "<label>Qu'est-ce que tu fais exactement ? \u2726</label>"),

    # Diplômes label
    ('<label>🎓 Diplômes &amp; expériences <span style="font-size:12px;color:var(--gris);font-weight:400;">(Talents Digitaux)</span></label>',
     '<label>🎓 Ta formation, tes certifications, tes ann\u00e9es d\'exp\u00e9rience</label>'),

    # Langues label
    ('<label>🌍 Langues parlées</label>',
     '<label>🌍 Langues parl\u00e9es \u2726</label>'),

    ("Sépare par des virgules. Ex : Français, Ewe, Anglais",
     "Fran\u00e7ais est obligatoire. Ajoute Ewe, Mina, Fon, Yoruba, Kabiy\u00e8... Les clients appr\u00e9cient \u00eatre servis dans leur langue."),

    # Localisation section
    ("Ton adresse exacte n'est jamais partagée — seulement le point GPS de ton commerce pour l'itinéraire.",
     "Ta localisation est ton meilleur outil marketing. Quelqu'un \u00e0 Akpakpa ou Adidogom\u00e9 cherche un \u00e9lectricien — avec ta position, il te trouve en 30 secondes. Sans elle, tu n'existes pas pour lui. Ton adresse exacte n'est jamais partag\u00e9e — seulement le point GPS."),

    # Nav buttons — update labels
    ('<span class="icon">📅</span> Mes RDV',
     '<span class="icon">📅</span> Mon Agenda'),
]

for old, new in replacements:
    if old == new:
        continue  # skip no-ops
    count = html.count(old)
    if count > 0:
        html = html.replace(old, new)
        print(f"✅ [{count}x] {old[:70]}...")
    else:
        print(f"⚠️  NOT FOUND: {old[:70]}...")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ MISSION 1 — Dashboard complet appliqué.")
