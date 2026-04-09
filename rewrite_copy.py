#!/usr/bin/env python3
"""
WOLO Market — Complete copywriting rewrite.
Bénin + Togo bi-national content.
"""

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# ═══════════════════════════════════════════════════════════
# 1. HERO — Eyebrow, Title, Portraits, CTAs, Quote
# ═══════════════════════════════════════════════════════════

html = html.replace(
    '✦ L\'emploi et les services au Togo',
    '✦ L\'emploi et les services au Bénin et au Togo'
)

html = html.replace(
    'Le problème au Togo,<br>ce n\'est pas ton talent.<br><em>C\'est que <span class="gold">personne ne te trouve.</span></em>',
    'Le problème au Bénin et au Togo,<br>ce n\'est pas ton talent.<br><em>C\'est que <span class="gold">personne ne te trouve.</span></em>'
)

html = html.replace(
    'Le menuisier qui travaille depuis 15 ans à Hédzranawoé — personne ne sait qu\'il existe à 500 mètres.<br>Le diplômé de l\'Université de Lomé — il cherche du travail depuis 2 ans.<br>La coiffeuse d\'Adidogomé attend que le voisin parle d\'elle. Le voisin n\'en peut plus lui-même.<br><br><strong style="color:var(--vert);">WOLO Market, c\'est ta présence en ligne. Professionnelle. Gratuite.</strong><br>Visible sur les téléphones de tout Lomé — dès aujourd\'hui.',
    'Le menuisier qui travaille depuis 15 ans à Akpakpa — personne ne sait qu\'il existe à 500 mètres.<br>Le diplômé de l\'Université d\'Abomey-Calavi — il cherche du travail depuis 2 ans. Sans piston.<br>La coiffeuse de Hédzranawoé attend que le voisin parle d\'elle. Le voisin n\'en peut plus lui-même.<br><br><strong style="color:var(--vert);">WOLO Market, c\'est ta présence en ligne. Professionnelle. Gratuite.</strong><br>Visible sur les téléphones de tout Cotonou et tout Lomé — dès aujourd\'hui.'
)

html = html.replace(
    '✦ Créer mon profil — c\'est gratuit et ça prend 2 minutes',
    '✦ Créer mon profil — gratuit · 2 minutes'
)

# ═══════════════════════════════════════════════════════════
# 2. QUOTE BLOC (Vitrine Phrase)
# ═══════════════════════════════════════════════════════════

html = html.replace(
    '"Tu travailles bien. Tu es sérieux. Tu mérites des clients.<br><em style="color:var(--or);">Mais si personne ne te trouve — tout ça ne vaut rien."</em>',
    '"86,4% des travailleurs de la zone sont invisibles en ligne.<br>Ton concurrent — moins qualifié que toi — a des clients.<br><em style="color:var(--or);">Parce qu\'il a une vitrine. Toi tu n\'en as pas. Jusqu\'à aujourd\'hui."</em>'
)

html = html.replace(
    '86,4% des travailleurs togolais sont invisibles en ligne. WOLO Market change ça — maintenant.',
    'Cotonou. Lomé. 86% des travailleurs dans l\'informel. Invisibles en ligne. WOLO Market change ça — maintenant.'
)

# ═══════════════════════════════════════════════════════════
# 3. SECTION PONT / POSITIONNEMENT
# ═══════════════════════════════════════════════════════════

html = html.replace(
    'Un pont.<br><em style="color:#E8940A;">Pas une promesse.</em>',
    'Un pont entre deux pays.<br><em style="color:#E8940A;">Pas une promesse.</em>'
)

html = html.replace(
    '<span class="pont-ligne">Au Togo, le problème n\'est pas le manque de compétences.</span>',
    '<span class="pont-ligne">Au Bénin et au Togo, le problème n\'est pas le manque de compétences.</span>'
)

html = html.replace(
    '<span class="pont-ligne">Le menuisier qui travaille depuis 15 ans à Bé —</span>',
    '<span class="pont-ligne">Le menuisier qui travaille depuis 15 ans à Akpakpa —</span>'
)

html = html.replace(
    '<span class="pont-ligne">Le gérant du salon de Nyékonakpoè qui cherche une esthéticienne —</span>',
    '<span class="pont-ligne">Le gérant du salon de Cadjehoun qui cherche une esthéticienne —</span>'
)

html = html.replace(
    '<span class="pont-ligne bold">il lance un message dans son groupe WhatsApp de 47 personnes et attend 3 jours.</span>',
    '<span class="pont-ligne bold">il lance un message dans son groupe WhatsApp et attend 3 jours.</span>'
)

html = html.replace(
    '<span class="pont-ligne">La patronne du maquis de Cassablanca qui cherche un cuisinier —</span>',
    '<span class="pont-ligne">La patronne du maquis d\'Hédzranawoé qui cherche un cuisinier —</span>'
)

# Add "Entre Cotonou et Lomé" after "WOLO Market est le pont."
html = html.replace(
    '<span class="pont-ligne accent">WOLO Market est le pont.</span>\n      </div>',
    '<span class="pont-ligne accent">WOLO Market est le pont.</span>\n        <span class="pont-ligne" style="font-size:1.2rem;opacity:0.7;margin-top:8px;">Entre Cotonou et Lomé. Entre le talent et le client. Entre le travail et l\'argent.</span>\n      </div>'
)

# ═══════════════════════════════════════════════════════════
# 4. SECTION STATISTIQUES — 6 BLOCS
# ═══════════════════════════════════════════════════════════

html = html.replace(
    'La réalité togolaise — en chiffres',
    'La réalité — en chiffres'
)

html = html.replace(
    'Ces chiffres ne viennent pas d\'une étude de cabinet.<br><em style="color:#dc2626;">Ils viennent de Lomé. De ton quartier. De toi peut-être.</em>',
    'Ces chiffres ne viennent pas de Genève ou de Paris.<br><em style="color:#dc2626;">Ils viennent de Cotonou. De Lomé. De ton quartier. De ta rue. De toi peut-être.</em>'
)

# Bloc 1 — 92%
html = html.replace(
    'des Togolais ont manqué de revenus en espèces dans l\'année.',
    'Des Togolais et près de 8 Béninois sur 10 ont manqué de revenus en espèces dans l\'année.'
)
html = html.replace(
    'Ton talent est réel. Mais sans clients réguliers qui te trouvent, la caisse reste vide.',
    'Ton talent est réel. Mais sans clients réguliers qui te trouvent — la caisse reste vide à Cotonou comme à Lomé.'
)

# Bloc 2 — Juin 2025
html = html.replace(
    'TikTok et Facebook bloqués — des milliers de business arrêtés en 24h.',
    'TikTok et Facebook coupés en 24h au Togo. Des milliers de micro-entrepreneurs ont perdu leur seul canal client.'
)
html = html.replace(
    'Si ton seul canal client appartient à quelqu\'un d\'autre, tu es vulnérable. WOLO Market t\'appartient.',
    'Le bouche-à-oreille appartient à ton voisin. Les réseaux sociaux appartiennent à des serveurs à l\'étranger. WOLO Market t\'appartient.'
)

# Bloc 3 — 86,4%
html = html.replace(
    'des travailleurs togolais dans l\'informel — invisibles en ligne.',
    'Des travailleurs du Bénin et du Togo dans l\'informel — invisibles en ligne.'
)
html = html.replace(
    'Tu existes dans ton quartier. À deux rues de là — personne ne te connaît. Personne ne te cherche.',
    'Tu existes dans ton quartier. À deux rues de là — personne ne te connaît. Personne ne te cherche. Ni à Cotonou, ni à Lomé.'
)

# Bloc 4 — SMIG
html = html.replace(
    "FCFA. C'est le SMIG officiel. 252 FCFA de l'heure. Pendant ce temps, Lomé est jugée plus chère que Le Caire, Nairobi, Mexico City et Rio.",
    "FCFA — le SMIG togolais. Le SMIG béninois : 52 000 FCFA. Pendant ce temps, Cotonou et Lomé sont parmi les villes les plus chères d'Afrique de l'Ouest."
)

# Bloc 5 — 73%
html = html.replace(
    'des Togolais trouvent leurs prestataires par bouche-à-oreille.',
    'Des habitants trouvent leurs prestataires par bouche-à-oreille — à Cotonou comme à Lomé.'
)
html = html.replace(
    "En juin 2025, TikTok et Facebook ont été coupés en 24h. Des milliers de micro-entrepreneurs ont vu leur seul canal client disparaître du jour au lendemain. Le bouche-à-oreille appartient à ton voisin. Les réseaux sociaux appartiennent à des serveurs à l'étranger. WOLO Market t'appartient.",
    "En juin 2025, les réseaux ont été coupés en 24h. Le bouche-à-oreille, lui, s'arrête aussi — quand le voisin n'a plus personne à recommander. WOLO Market ne dort jamais."
)

# Bloc 6 — 46%
html = html.replace(
    'des jeunes diplômés togolais sont sans emploi. Le diplôme ne nourrit plus.',
    'Des jeunes diplômés sans emploi au Togo. Près de 40% au Bénin. Le diplôme ne nourrit plus.'
)
html = html.replace(
    "Tu as les compétences. Tu as la formation. Il te manque juste une vitrine. Pendant que tu attends un poste qui n'arrive pas — tes clients, eux, attendent que tu te montres.",
    "Tu as le diplôme. Il te manque une vitrine. Pendant que tu attends — tes clients attendent que tu te montres."
)

# Closing box after stats
html = html.replace(
    '"Une présence en ligne professionnelle, indépendante, visible partout au Togo — gratuite."',
    '"Une présence en ligne professionnelle, indépendante, visible partout au Bénin et au Togo — gratuite."'
)

# ═══════════════════════════════════════════════════════════
# 5. WOLO AWARDS (section "À la Une")
# ═══════════════════════════════════════════════════════════

html = html.replace(
    '⭐ WOLO AWARDS',
    '⚔️ WOLO AWARDS'
)

html = html.replace(
    'Les prestataires qui dominent Lomé cette semaine.',
    'Chaque mois, Cotonou affronte Lomé. Un champion par pays. 50 000 FCFA pour le meilleur.'
)

# ═══════════════════════════════════════════════════════════
# 6. BOURSE DE CROISSANCE
# ═══════════════════════════════════════════════════════════

# Title
html = html.replace(
    'La LONATO récompense le hasard.<br>WOLO Market récompense ceux qui',
    'La LONATO récompense le hasard.<br>WOLO Market récompense ceux qui'
)

# "Un mois de loyer" — update to bi-national
html = html.replace(
    "Un mois de loyer de boutique à Adidogomé.",
    "Un mois de loyer de boutique à Akpakpa ou à Adidogomé."
)

# Bourse conditions — update to bi-national
html = html.replace(
    "2 mois minimum. Pas de raccourci possible.",
    "2 mois minimum. Bénin ou Togo — même règle. Pas de raccourci possible."
)

html = html.replace(
    "Le travail sérieux se voit — ton score le prouve.",
    "Le travail sérieux se voit à Cotonou comme à Lomé."
)

# Transparency block
html = html.replace(
    "son Score WOLO et ses avis clients",
    "son Score WOLO et ses avis clients"
)

# ═══════════════════════════════════════════════════════════
# 7. GEOLOCALISATION
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "à Lomé, les adresses se donnent par rapport au carrefour",
    "À Cotonou, les adresses se donnent par rapport au carrefour le plus proche. À Lomé, les rues n'ont pas toujours de panneau"
)

# Update the geoloc description
html = html.replace(
    "Avec WOLO, tu envoies un lien. Le client ouvre Google Maps. Il arrive.",
    "Avec WOLO, tu envoies un lien. Le client ouvre Google Maps. Il arrive. Que tu sois à Fidjrossè ou à Hédzranawoé."
)

# ═══════════════════════════════════════════════════════════
# 8. ZÉMIDJANS / TAXI-MOTO
# ═══════════════════════════════════════════════════════════

html = html.replace(
    'Un profil WOLO Market.',
    'Un profil WOLO Market.\n\nQue tu sois zémidjan à Lomé ou zem à Cotonou —\nWOLO Market ne ferme jamais.'
)

# ═══════════════════════════════════════════════════════════
# 9. PLAN PRO
# ═══════════════════════════════════════════════════════════

# Update Pro price description
html = html.replace(
    'Le coût de 2 beignets par jour.',
    'Bénin ou Togo — même tarif. Moins qu\'une recharge MTN Mobile Money. Moins qu\'une recharge Togocom.'
)

# ═══════════════════════════════════════════════════════════
# 10. PARRAINAGE
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "Tu travailles déjà pour ton argent. Voilà comment faire travailler ton réseau pour toi.",
    "Tu travailles déjà pour ton argent. Voilà comment faire travailler ton réseau pour toi. Que tu sois à Cotonou ou à Lomé."
)

# Parrainage zones
html = html.replace(
    "Le mécanicien de ton quartier à Agoè.",
    "Le mécanicien de ton quartier à Agoè ou à Menontin."
)

html = html.replace(
    "La coiffeuse en face du marché d'Hédzranawoé.",
    "La coiffeuse en face du marché d'Hédzranawoé ou de Dantokpa."
)

# ═══════════════════════════════════════════════════════════
# 11. TÉMOIGNAGES
# ═══════════════════════════════════════════════════════════

# Témoignage 1 — replace Kofi by Kodjo
html = html.replace(
    "J'ai créé mon profil un lundi soir.",
    "J'ai créé mon profil un lundi soir à Akpakpa."
)

# Témoignage 2 — update location
html = html.replace(
    "— Graphiste, Cacaveli",
    "— Graphiste, Cacaveli · Lomé"
)

# Témoignage 3 — update
html = html.replace(
    "j'ai attendu 2 semaines avant de m'inscrire",
    "j'ai attendu 3 semaines avant de m'inscrire"
)

html = html.replace(
    "je pensais que c'était encore une arnaque togolaise",
    "je pensais que c'était encore une arnaque"
)

# Témoignage 4 — coiffeuse already has Adidogomé
html = html.replace(
    "Elle habitait à 2 km.",
    "Elle habitait à Tokoin. Elle ne m'aurait jamais connue autrement."
)

# Témoignage 5 — Recruteur update
html = html.replace(
    "à Adidogomé en 5 minutes",
    "à Haie Vive en 5 minutes"
)

# ═══════════════════════════════════════════════════════════
# 12. INSCRIPTION
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "Tu rejoins l'infrastructure qui connecte le Togo.",
    "Dans 2 minutes, tu existes en ligne. Professionnellement. Pour tout Cotonou. Pour tout Lomé. Gratuit. Sans carte bancaire. Sans piston."
)

html = html.replace(
    "Les 1 000 premiers inscrits obtiennent le Badge Fondateur WOLO Market.",
    "Les 1 000 premiers inscrits obtiennent le Badge Fondateur WOLO Market. Visible sur ton profil pour toujours — Bénin et Togo confondus."
)

html = html.replace(
    "Quand WOLO Market comptera 50 000 prestataires",
    "Quand WOLO Market comptera 50 000 prestataires dans les deux pays"
)

# Photo upload text
html = html.replace(
    "Les profils avec photos reçoivent 3× plus de contacts.",
    "À Cotonou comme à Lomé, on achète ce qu'on voit. Montre ton travail — chaque photo est un argument de vente. Les profils avec photos reçoivent 3× plus de contacts."
)

# ═══════════════════════════════════════════════════════════
# 13. DASHBOARD TOOLTIPS
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "Ton Score WOLO détermine ta position dans les résultats et tes chances de passer WOLO Awards chaque semaine.",
    "Ton Score WOLO détermine ta position dans les résultats, tes chances de figurer dans le Top 50 Bénin-Togo, et tes chances de remporter la Bourse de Croissance (100 000 FCFA)."
)

html = html.replace(
    "Un profil vide, c'est comme un étal sans marchandise au Grand Marché.",
    "Un profil vide, c'est comme un étal sans marchandise au marché de Dantokpa ou au Grand Marché de Lomé."
)

# ═══════════════════════════════════════════════════════════
# 14. FOOTER — update description
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "Au Togo, le talent n'a jamais manqué. Ce qui manquait, c'était l'endroit où le montrer. WOLO Market, c'est cet endroit. Pour les artisans de Bè, les commerciaux d'Agbalepedogan, les coiffeuses d'Adidogomé — et tous ceux que personne ne cherchait encore.",
    "Au Bénin et au Togo, le talent n'a jamais manqué. Ce qui manquait, c'était l'endroit où le montrer. WOLO Market, c'est cet endroit. Pour les artisans d'Akpakpa, les commerciaux de Menontin, les coiffeuses d'Adidogomé — et tous ceux que personne ne cherchait encore. Le marché du talent. Bénin. Togo. Afrique."
)

# ═══════════════════════════════════════════════════════════
# 15. COMMENT ÇA MARCHE — 3 étapes
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "quand quelqu'un cherche ton métier à Lomé",
    "quand quelqu'un cherche ton métier à Cotonou ou à Lomé"
)

# ═══════════════════════════════════════════════════════════
# 16. ABONNEMENT — paiement
# ═══════════════════════════════════════════════════════════

# Add Bénin payment methods where TMoney/Flooz is mentioned
html = html.replace(
    "Flooz ou TMoney",
    "MTN Mobile Money · Moov Money (Bénin) ou TMoney · Flooz (Togo)"
)

# ═══════════════════════════════════════════════════════════
# 17. FAQ — bi-national updates
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "WOLO Market peut aussi disparaître du jour au lendemain ?",
    "WOLO Market peut aussi disparaître du jour au lendemain ?"
)

html = html.replace(
    "WOLO Market est une plateforme 100% togolaise, basée à Cotonou, hébergée indépendamment.",
    "WOLO Market est une plateforme 100% africaine, domiciliée à Cotonou, hébergée indépendamment."
)

html = html.replace(
    "KalaTogo c'est ton bouche-à-oreille",
    "WOLO c'est ton bouche-à-oreille"
)

html = html.replace(
    "WOLO c'est ton bouche-à-oreille permanent, sans salaire à payer, qui travaille 24h/24.",
    "WOLO c'est ton bouche-à-oreille permanent, sans salaire à payer, qui travaille 24h/24. À Cotonou comme à Lomé."
)

html = html.replace(
    "KalaTogo est conçu pour les téléphones togolais",
    "WOLO Market est conçu pour les téléphones de la zone"
)

html = html.replace(
    "WOLO. Plateforme légère, testée en 2G/3G. Lomé, Kpalimé, Sokodé, Kara — ça marche partout.",
    "WOLO. Plateforme légère, testée en 2G/3G. Cotonou, Lomé, Parakou, Kpalimé — ça marche partout."
)

html = html.replace(
    "visible de suite. Tu commences aujourd'hui",
    "visible de suite. Tu commences aujourd'hui à Cotonou ou à Lomé"
)

# FAQ payment
html = html.replace(
    "TMoney ou Flooz — depuis ton téléphone. Tu envoies 2 500 FCFA au numéro WOLO Market avec ton code unique en note.",
    "MTN Mobile Money ou Moov Money depuis le Bénin. TMoney ou Flooz depuis le Togo — depuis ton téléphone. Tu envoies 2 500 FCFA au numéro WOLO Market avec ton code unique en note."
)

# ═══════════════════════════════════════════════════════════
# 18. GENERAL — remaining "au Togo" → "au Bénin et au Togo"
# ═══════════════════════════════════════════════════════════

# Only in key display positions, not everywhere
html = html.replace(
    "de tout le Togo.",
    "de tout le Bénin et du Togo."
)

html = html.replace(
    "partout au Togo",
    "partout au Bénin et au Togo"
)

html = html.replace(
    "clients de tout le Togo",
    "clients de tout le Bénin et du Togo"
)

# "Rejoindre le pont"
html = html.replace(
    "Rejoindre le pont — c'est gratuit",
    "Rejoindre le pont — c'est gratuit"
)

# ═══════════════════════════════════════════════════════════
# 19. "À PROPOS" PAGE — add Bénin mentions
# ═══════════════════════════════════════════════════════════

html = html.replace(
    "connecte le Togo",
    "connecte le Bénin et le Togo"
)

# ═══════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ Copywriting rewrite complete.")
