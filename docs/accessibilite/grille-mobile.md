# Grille d'audit d'accessibilité — applications mobiles (EN 301 549, RAAM 1.1)

**État : grille prête, audit non réalisé.** Les écrans de l'application mobile (lots 08 à 10) ne sont
pas encore développés. Cette grille sera remplie sur le premier build de preview de la commune pilote.
Résultats de tests uniquement, sans revendication de conformité.

## Parcours à tester

| Parcours | VoiceOver (iOS) | TalkBack (Android) | Taille de texte maximale | Remarques |
|---|---|---|---|---|
| Lire une actualité | À faire | À faire | À faire | |
| Ajouter un événement au calendrier | À faire | À faire | À faire | permission calendrier en écriture seule |
| Signaler un problème (sans carte : adresse saisie ou position) | À faire | À faire | À faire | photos : alternative textuelle, catégorie, confirmation annoncée |
| Régler mes préférences (notifications, quartiers) | À faire | À faire | À faire | interrupteurs restitués avec leur état |

## Critères RAAM / EN 301 549 à couvrir

| Thème | Points de contrôle | Résultat |
|---|---|---|
| Images et icônes | libellé accessible des boutons-icônes, images décoratives ignorées | À faire |
| Couleurs | contraste 4,5:1 (texte) et 3:1 (composants) pour **chaque palette de commune** — vérifié à la création de la marque (assistant super-admin, blocage sous 4,5:1) | Contrôle automatique en place ; vérification sur appareil à faire |
| Structuration | titres d'écran annoncés, ordre de lecture | À faire |
| Composants | rôles (bouton, onglet, interrupteur), états, zones tactiles ≥ 44 × 44 pt | À faire |
| Texte | taille de police système respectée jusqu'au maximum, sans troncature | À faire |
| Orientation | portrait et paysage | À faire |
| Formulaires | étiquettes, erreurs annoncées, pas de limite de temps | À faire |
| Alternatives | carte : liste des lieux et saisie d'adresse équivalentes | À faire |
