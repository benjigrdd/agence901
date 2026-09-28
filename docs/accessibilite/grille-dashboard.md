# Grille d'audit d'accessibilité — dashboard (RGAA 4.1)

Résultats de tests, pas une déclaration de conformité. Référentiel : RGAA 4.1 (critères issus de WCAG 2.1 AA).
Dernière mise à jour : 28/09/2026. Environnement automatisé : Chromium (Playwright), données de démonstration.

Légende : **OK** vérifié sans anomalie · **Corrigé** anomalie trouvée et corrigée · **À faire** vérification
manuelle restant à réaliser (humain, technologie d'assistance réelle) · **NA** non applicable.

## 1. Tests automatisés (CI, bloquants)

| Test | Portée | Résultat |
|---|---|---|
| axe-core (WCAG 2.0/2.1/2.2 A et AA), zéro violation « serious » ou « critical » | toutes les routes (25 pages de commune, 4 pages éditeur, fiches de détail, pages publiques), pour admin de commune, agent et éditeur — `e2e/a11y-all-routes.spec.ts` | OK |
| Parcours au clavier seul « traiter un signalement » (lien d'évitement, liste, fiche, changement de statut) et « publier une actualité » (titre, résumé, corps, bouton Publier), focus visible à chaque étape | `e2e/keyboard-reflow.spec.ts` | OK |
| Reflow à 320 px (aucun défilement horizontal) | accueil, actualités, signalements, agenda, paramètres | OK |
| Zoom 200 % (1 280 px → 640 px CSS) : titre et navigation disponibles, pas de défilement horizontal | mêmes pages | OK |
| Politique de sécurité (CSP) sans violation en console | ensemble des parcours ci-dessus | OK |

## 2. Critères RGAA clés

| Thème | Critère | Pages testées | Méthode | Résultat | Correction |
|---|---|---|---|---|---|
| Images | 1.1–1.3 alternative des images porteuses d'information | Médiathèque, actualité, fiche lieu | axe + revue : texte alternatif obligatoire à l'upload (ou « décorative ») | OK | — |
| Cadres | 2.1 titre des cadres | toutes | axe | NA (aucun iframe) | — |
| Couleurs | 3.1 information pas uniquement par la couleur | signalements (statuts), carte (catégories), import CSV (état des lignes) | revue : statut en texte + couleur, vue Liste alternative à la carte, colonne « État » textuelle | OK | — |
| Couleurs | 3.2–3.3 contrastes texte et composants | toutes, palettes des communes | axe ; contrôle 4,5:1 bloquant dans l'assistant de marque | OK | — |
| Multimédia | 4.x | — | — | NA | — |
| Tableaux | 5.6–5.7 en-têtes et liaison | listes (actualités, signalements, lieux, audit), aperçu d'import CSV | axe + revue : `th scope`, `caption` | OK | — |
| Liens | 6.1–6.2 intitulé explicite | toutes | axe | OK | — |
| Scripts | 7.1 compatibles avec les technologies d'assistance (dialogues, menus, onglets) | dialogues d'import, confirmation, menus | Radix/shadcn (rôles ARIA), axe | OK (NVDA/VoiceOver : voir §3) | — |
| Scripts | 7.4–7.5 messages de statut | toasts, résultats d'import, erreurs de formulaire | `role="status"` / `role="alert"` | OK | — |
| Éléments obligatoires | 8.3 langue par défaut, 8.5–8.6 titre de page | toutes | axe (`lang="fr"`, titres « page · produit ») | OK | — |
| Structuration | 9.1 hiérarchie des titres, 9.2 zones (landmarks) | toutes | axe + revue | OK | — |
| Présentation | 10.7 focus visible | parcours clavier | test Playwright (outline ou ombre) | OK | — |
| Présentation | 10.11 reflow 320 px, 10.4 zoom 200 % | 5 pages principales | test Playwright | OK | — |
| Formulaires | 11.1–11.2 étiquettes, 11.10 contrôle de saisie, 11.13 finalité (`autocomplete`) | actualité, lieu, import CSV, connexion | axe + revue : `label for`, messages d'erreur liés, champs obligatoires signalés en texte | OK | Import CSV : « (obligatoire) » ajouté aux libellés (restitution sans l'astérisque) |
| Navigation | 12.7 lien d'évitement, 12.8 ordre de tabulation, 12.9 pas de piège | toutes | test clavier | OK | — |
| Consultation | 13.x limite de temps, ouverture de fenêtres | session, téléchargements | revue | OK | — |

Anomalies corrigées pendant l'audit (lot 19) : pluriel « 3 ligne valides » de l'import CSV (lisibilité,
restitution) ; libellés des champs obligatoires de l'import CSV restitués sans symbole.

## 3. Vérifications manuelles avec technologies d'assistance — À FAIRE

À réaliser par une personne (idéalement utilisatrice régulière de ces outils) avant la mise en production,
puis à reporter ici avec la date, la version des outils et les anomalies :

| Parcours | NVDA (dernière version) + Firefox | VoiceOver + Safari (macOS) |
|---|---|---|
| Publier une actualité (brouillon → publication) | À faire | À faire |
| Traiter un signalement (fiche, statut, message public, note interne) | À faire | À faire |

Points d'attention : annonce des messages de statut (toasts), éditeur de texte riche, dialogues
(restitution du titre, retour du focus), carte (la vue Liste est l'alternative).
