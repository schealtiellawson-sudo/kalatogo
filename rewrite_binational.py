#!/usr/bin/env python3
"""Rewrite pass: make all content bi-national (Bénin + Togo)."""
import re

FILE = '/Users/schealtiellawson/Documents/04 - KALATOGO/Projet/KALAtogo/repo/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. TOGO_REGIONS → add Bénin regions ──
old_regions = '''const TOGO_REGIONS = {
  "🏙️ Lomé et environs": ["Lomé — Adidogomé","Lomé — Agoè-Nyivé","Lomé — Agbalépédogan","Lomé — Amoutivé","Lomé — Baguida","Lomé — Bè","Lomé — Cacaveli","Lomé — Djidjolé","Lomé — Hédzranawoé","Lomé — Kégué","Lomé — Kodjoviakopé","Lomé — Lomé Centre","Lomé — Nyékonakpoè","Lomé — Tokoin"],
  "🌊 Région Maritime": ["Tsévié","Aného","Vogan","Tabligbo","Kpémé","Aflao","Noépé","Kévé"],
  "🌿 Région des Plateaux": ["Kpalimé","Atakpamé","Notsé","Badou","Amlamé","Anié"],
  "🏔️ Région Centrale": ["Sokodé","Sotouboua","Blitta","Tchamba"],
  "⛰️ Région de la Kara": ["Kara","Bassar","Niamtougou","Kandé","Guérin-Kouka","Bafilo"],
  "🌾 Région des Savanes": ["Dapaong","Mango","Cinkassé","Tandjoaré"]
};'''

new_regions = '''const TOGO_REGIONS = {
  "🏙️ Cotonou et environs": ["Cotonou — Akpakpa","Cotonou — Cadjehoun","Cotonou — Dantokpa","Cotonou — Fidjrossè","Cotonou — Ganhi","Cotonou — Gbégamey","Cotonou — Houéyiho","Cotonou — Jéricho","Cotonou — Menontin","Cotonou — Missèbo","Cotonou — Sainte-Rita","Cotonou — Sikècodji","Cotonou — Zogbo"],
  "🌴 Sud Bénin": ["Abomey-Calavi","Porto-Novo","Ouidah","Bohicon","Abomey","Lokossa","Sèmè-Podji","Allada","Comé"],
  "🌳 Nord Bénin": ["Parakou","Natitingou","Djougou","Kandi","Malanville","Nikki","Tchaourou","Savè"],
  "🏙️ Lomé et environs": ["Lomé — Adidogomé","Lomé — Agoè-Nyivé","Lomé — Agbalépédogan","Lomé — Amoutivé","Lomé — Baguida","Lomé — Bè","Lomé — Cacaveli","Lomé — Djidjolé","Lomé — Hédzranawoé","Lomé — Kégué","Lomé — Kodjoviakopé","Lomé — Lomé Centre","Lomé — Nyékonakpoè","Lomé — Tokoin"],
  "🌊 Région Maritime": ["Tsévié","Aného","Vogan","Tabligbo","Kpémé","Aflao","Noépé","Kévé"],
  "🌿 Région des Plateaux": ["Kpalimé","Atakpamé","Notsé","Badou","Amlamé","Anié"],
  "🏔️ Région Centrale": ["Sokodé","Sotouboua","Blitta","Tchamba"],
  "⛰️ Région de la Kara": ["Kara","Bassar","Niamtougou","Kandé","Guérin-Kouka","Bafilo"],
  "🌾 Région des Savanes": ["Dapaong","Mango","Cinkassé","Tandjoaré"]
};'''
html = html.replace(old_regions, new_regions)

# ── 2. TOGO_LOCALITES → add Bénin localités ──
old_localites_start = 'const TOGO_LOCALITES = {'
benin_localites = '''const TOGO_LOCALITES = {
  "Cotonou — Akpakpa":["Akpakpa-Centre","PK10","Agla","Ayélawadjè","Sègbèya","Autre"],
  "Cotonou — Cadjehoun":["Cadjehoun","Haie Vive","Les Cocotiers","Zone résidentielle","Autre"],
  "Cotonou — Dantokpa":["Marché Dantokpa","Tokpa-Hoho","Gbéto","Missèbo","Autre"],
  "Cotonou — Fidjrossè":["Fidjrossè-Centre","Fidjrossè-Plage","Route de l'Aéroport","Autre"],
  "Cotonou — Ganhi":["Ganhi","Quartier Ganhi","Boulevard Saint-Michel","Autre"],
  "Cotonou — Gbégamey":["Gbégamey","Aidjèdo","Tankpè","Autre"],
  "Cotonou — Houéyiho":["Houéyiho","Maraîchers","Zone industrielle","Autre"],
  "Cotonou — Jéricho":["Jéricho","Adjaha","Midombo","Autre"],
  "Cotonou — Menontin":["Menontin","Gbèdjromèdé","Vodjè","Autre"],
  "Cotonou — Missèbo":["Missèbo","Quartier Missèbo","Zone commerciale","Autre"],
  "Cotonou — Sainte-Rita":["Sainte-Rita","Fifadji","Ayélawadjè","Autre"],
  "Cotonou — Sikècodji":["Sikècodji","Zongo","Quartier Zongo","Autre"],
  "Cotonou — Zogbo":["Zogbo","Zogbo-Centre","Gbèdjromèdé","Autre"],
  "Abomey-Calavi":["Calavi-Centre","Godomey","Togbin","Togoudo","Akassato","Zinvié","Ouèdo","Autre"],
  "Porto-Novo":["Centre","Ouando","Djassin","Tokpota","Djègan-Kpèvi","Autre"],
  "Ouidah":["Centre","Ouidah-Plage","Pahou","Savi","Autre"],
  "Bohicon":["Centre","Bohicon-Gare","Lissèzoun","Autre"],
  "Abomey":["Centre","Abomey-Marché","Djimè","Autre"],
  "Lokossa":["Centre","Lokossa-Marché","Autre"],
  "Sèmè-Podji":["Sèmè-Podji","Sèmè-Kraké","Jack","Ekpè","Autre"],
  "Allada":["Centre","Allada-Marché","Autre"],
  "Comé":["Centre","Comé-Marché","Autre"],
  "Parakou":["Centre","Parakou-Est","Parakou-Ouest","Banikanni","Guéma","Autre"],
  "Natitingou":["Centre","Natitingou-Marché","Autre"],
  "Djougou":["Centre","Djougou-Marché","Djougou-Nord","Autre"],
  "Kandi":["Centre","Kandi-Marché","Autre"],
  "Malanville":["Centre","Malanville-Marché","Frontière Niger","Autre"],
  "Nikki":["Centre","Nikki-Marché","Autre"],
  "Tchaourou":["Centre","Autre"],
  "Savè":["Centre","Savè-Marché","Autre"],
'''

html = html.replace(old_localites_start, benin_localites, 1)

# ── 3. Text replacements — Togo-only → bi-national ──
replacements = [
    # Badges / labels
    ('La réalité togolaise', 'La réalité ouest-africaine'),
    ('Simple · Gratuit · Togolais', 'Simple · Gratuit · Bénin & Togo'),
    ('Simple · Togolais · Gratuit pour commencer', 'Simple · Bénin & Togo · Gratuit pour commencer'),

    # Hero "Comment ça marche" page
    ("tu existes pour <em>tout le Togo.</em>", "tu existes pour <em>tout le Bénin et le Togo.</em>"),

    # Stats
    ('des jeunes togolais sans emploi', 'des jeunes sans emploi'),

    # References to Togolais
    ("73% des Togolais trouvent encore leurs prestataires", "73% des habitants trouvent encore leurs prestataires"),
    ("Tu lis les avis d'autres clients de Lomé", "Tu lis les avis d'autres clients de Lomé et Cotonou"),
    ("tu lis les avis d'autres clients togolais.", "tu lis les avis de vrais clients — de Cotonou à Lomé."),
    ("Tu aides les autres Togolais à choisir", "Tu aides les autres clients à choisir"),
    ("92% des Togolais ont manqué de revenus", "92% des prestataires de la sous-région ont manqué de revenus"),
    ("Il est temps que tout le Togo le sache.", "Il est temps que le Bénin et le Togo le sachent."),

    # Parrainage — Togocom
    ("moins qu'une recharge Togocom", "moins qu'une recharge mobile"),

    # Parrainage — quartiers Togo-only → bi-national
    ("le coiffeur d'Adidogomé, le mécanicien d'Agoè, le vendeur du marché de Bè",
     "le coiffeur d'Adidogomé ou d'Akpakpa, le mécanicien d'Agoè ou de Menontin, le vendeur du marché de Bè ou de Dantokpa"),

    # Parrainage calc — Lomé only
    ("Le loyer d'une chambre à Lomé.", "Le loyer d'une chambre à Cotonou ou Lomé."),
    ("≈ SMIG togolais (52 500 FCFA)", "≈ SMIG sous-régional"),

    # TikTok section
    ("TikTok est en explosion au Togo.", "TikTok est en explosion au Bénin et au Togo."),

    # Paiement
    ("cash, TMoney ou Flooz", "cash, MTN Money, Moov Money, TMoney ou Flooz"),

    # Prestataire section — Lomé references
    ("Tu es immédiatement visible pour tous les clients de Lomé qui cherchent ton métier.",
     "Tu es immédiatement visible pour tous les clients de Cotonou et Lomé qui cherchent ton métier."),
    ("Ce que ça change concrètement pour un prestataire à Lomé",
     "Ce que ça change concrètement pour un prestataire à Cotonou ou Lomé"),

    # "Comment ça marche" home section — already updated to mention Cotonou/Lomé

    # Emploi section — Lomé only
    ("d'offres CDI, CDD, missions, stages à Lomé.",
     "d'offres CDI, CDD, missions, stages à Cotonou et Lomé."),
    ("Au Togo, 80% des postes ne sont jamais publiés",
     "Au Bénin comme au Togo, 80% des postes ne sont jamais publiés"),

    # WOLO Awards widget — Lomé only
    ("3 profils Pro apparaissent en première position devant tous les visiteurs de Lomé.",
     "3 profils Pro apparaissent en première position devant tous les visiteurs de Cotonou et Lomé."),

    # Geoloc inscription text — Adidogomé only
    ("quelqu'un à Adidogomé cherche un électricien",
     "quelqu'un à Akpakpa ou Adidogomé cherche un électricien"),

    # Client section — Adidogomé / Tokoin
    ("Coiffeur à Adidogomé ? Électricien à Tokoin disponible maintenant ?",
     "Coiffeur à Akpakpa ou Adidogomé ? Électricien à Menontin ou Tokoin disponible maintenant ?"),
]

for old, new in replacements:
    count = html.count(old)
    if count > 0:
        html = html.replace(old, new)
        print(f"✅ [{count}x] {old[:60]}...")
    else:
        print(f"⚠️  NOT FOUND: {old[:60]}...")

# ── 4. Write back ──
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ All bi-national rewrites applied.")
