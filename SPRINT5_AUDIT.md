# Sprint 5 — Audit final

Date: 2026-04-09

## Audit greps (repo/index.html)

| Recherche | Count | Statut |
|---|---|---|
| `gouvernement\|FAIEJ\|PROVONAT` | 0 | OK — aucune mention gouv résiduelle |
| `#1B7A4A` (vert legacy) | 0 | OK — palette or/noir conforme |
| `~4€\|4 euros` | 0 | OK — pas de prix EUR résiduel |
| `KalaTogo` (display) | 0 | OK — rebrand WOLO Market complet |

## Ajouté en Sprint 5

- [x] Bloc `wolo-gains-juillet` en tête de la carte Plan Pro (300k + 100k = 400k FCFA)
- [x] Liste `wolo-avantages-pro` refondue (étoiles juillet, badges, montants barrés)
- [x] CTA `wolo-btn-pro-cta` + sub-text + paragraphe d'urgence
- [x] FAQ `wolo-faq-pro` (6 questions) avec accordéon JS
- [x] Countdown 25 juillet 2026 — bloc sur abonnement + bloc sur home (après hero)
- [x] `lancerCountdownJuillet()` global, init unique, MAJ 1s
- [x] Section `wolo-section-juillet` entre parrainage et témoignages (home)
- [x] `<div id="mur-gagnants">` + `afficherMurGagnants()` (Airtable `WOLO_Gagnants`, fallback placeholder)
- [x] `chargerNbProLive()` Airtable → MAJ `[data-nb-pro-live]`
- [x] CSS complet : gains, avantages, countdown, section juillet, mur, FAQ, responsive 720px
- [x] Init JS au DOMContentLoaded (idempotent via flag `__sprint5Inited`)
