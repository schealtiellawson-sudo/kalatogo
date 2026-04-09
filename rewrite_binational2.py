#!/usr/bin/env python3
"""Second pass: remaining Togo-only references → bi-national."""

FILE = '/Users/schealtiellawson/Documents/04 - KALATOGO/Projet/KALAtogo/repo/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = [
    # Geoloc section
    ("arrive chez toi depuis n'importe où au Togo — sans explications.",
     "arrive chez toi depuis n'importe où au Bénin et au Togo — sans explications."),

    # Bourse section hero
    ("Le problème au Togo, ce n'est pas ton talent.",
     "Le problème au Bénin et au Togo, ce n'est pas ton talent."),

    # Bourse — SMIG togolais
    ("Deux fois le SMIG togolais.",
     "Deux fois le SMIG."),

    # Parrainage calc inline — SMIG togolais
    ("≈ le SMIG togolais (52 500 FCFA)",
     "≈ le SMIG de la sous-région"),

    # Emploi page title
    ("Offres d'emploi au Togo</h1>",
     "Offres d'emploi au Bénin et au Togo</h1>"),

    # Dashboard — SMIG togolais
    ("FCFA = 1 SMIG togolais",
     "FCFA ≈ 1 SMIG"),

    # Share text — togolais
    ("les talents togolais avec ceux qui en ont besoin. 🇹🇬",
     "les talents ouest-africains avec ceux qui en ont besoin. 🇧🇯🇹🇬"),

    # Emploi share text
    ("📢 Offre d'emploi au Togo :",
     "📢 Offre d'emploi au Bénin et au Togo :"),

    # Comment ça marche page — Transparent section
    ('Transparent. Équitable. <em style="color:var(--or);">Togolais.</em>',
     'Transparent. Équitable. <em style="color:var(--or);">Ouest-Africain.</em>'),

    # Paiement badge
    ("Paiement 100% togolais", "Paiement 100% local"),

    # FAQ page intro
    ("de la bouche de centaines de Togolais.",
     "de la bouche de centaines de prestataires au Bénin et au Togo."),

    # Badge Togolais
    ('🇹🇬 Togolais</div>',
     '🇧🇯🇹🇬 Bénin & Togo</div>'),

    # About section — "au Togo, le talent"
    ("au Togo, le talent ne manque pas. Ce qui manque",
     "au Bénin et au Togo, le talent ne manque pas. Ce qui manque"),

    # About — travailleurs togolais
    ("des travailleurs togolais sont dans l'informel",
     "des travailleurs sont dans l'informel"),

    # About — marché togolais (2 occurrences)
    ("construite pour le marché togolais, avant WOLO Market",
     "construite pour le marché ouest-africain, avant WOLO Market"),
    ("construite pour le marché togolais</li>",
     "construite pour le marché ouest-africain</li>"),

    # About — constat simple
    ("au Togo, les compétences existent mais restent invisibles.",
     "au Bénin et au Togo, les compétences existent mais restent invisibles."),

    # FAQ parrainage — SMIG togolais
    ("plus que le SMIG togolais — juste en partageant ton lien.",
     "plus que le SMIG — juste en partageant ton lien."),

    # Prestataire "Comment ça marche" — all Lomé
    ("92% des prestataires de la sous-région ont manqué de revenus dans l'année. Pas parce qu'ils ne travaillaient pas — parce que personne ne les trouvait. WOLO règle ça.",
     "Au Bénin et au Togo, des milliers de prestataires ont manqué de revenus dans l'année. Pas parce qu'ils ne travaillaient pas — parce que personne ne les trouvait. WOLO règle ça."),
]

for old, new in replacements:
    count = html.count(old)
    if count > 0:
        html = html.replace(old, new)
        print(f"✅ [{count}x] {old[:65]}...")
    else:
        print(f"⚠️  NOT FOUND: {old[:65]}...")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ Second pass complete.")
