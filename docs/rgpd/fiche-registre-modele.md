# Fiches du registre des traitements — modèles pour la commune

> Une fiche par traitement, à reprendre dans le registre de la commune (responsable de traitement) et à
> valider par son DPO. Les champs entre crochets sont à compléter.

## Fiche 1 — Signalements dans l'espace public

| Rubrique | Contenu |
|---|---|
| Responsable | [Commune], représentée par [maire] ; DPO : [coordonnées] |
| Finalité | recevoir, traiter et suivre les signalements des habitants ; informer du suivi |
| Base légale | mission d'intérêt public (art. 6.1.e) |
| Personnes | habitants et usagers de l'app |
| Données | description, catégorie, photos (0 à 3), position et adresse du problème, email de contact facultatif, identifiant pseudonyme de l'app, historique de traitement |
| Destinataires | agents habilités de la commune (droit « Signalements ») ; l'éditeur (sous-traitant) |
| Transferts hors UE | aucun pour les données de signalement (hébergement à Paris) ; notifications de suivi via Expo (États-Unis, CCT) |
| Durées | email effacé 12 mois après clôture ; lien avec l'habitant supprimé 36 mois après clôture ; signalement conservé ensuite sans donnée identifiante (`durees-de-conservation.md`) |
| Sécurité | voir `docs/securite/modele-de-menaces.md` ; AIPD : `aipd-trame.md` |

## Fiche 2 — Notifications et préférences

| Rubrique | Contenu |
|---|---|
| Finalité | envoyer les alertes et informations choisies par l'habitant |
| Base légale | mission d'intérêt public (alertes) ; consentement via les réglages du téléphone et de l'app (informations) |
| Données | jeton de notification, plateforme, langue, quartiers et thèmes choisis, zone de collecte |
| Destinataires | éditeur ; Expo, Apple, Google pour l'acheminement |
| Durées | jetons invalides supprimés après 30 jours ; compte inactif supprimé après 24 mois |

## Fiche 3 — Comptes du personnel

| Rubrique | Contenu |
|---|---|
| Finalité | authentifier les agents, gérer leurs droits, tracer les actions (sécurité, preuve) |
| Base légale | obligation légale de sécurité (art. 32) et mission d'intérêt public |
| Données | nom affiché, email professionnel, rôle, droits par module, facteur 2FA, journal d'audit |
| Destinataires | administrateurs de la commune ; éditeur (support, accès tracé) |
| Durées | compte : durée des fonctions + désactivation ; journal d'audit : 12 mois |

## Fiche 4 — Mesure d'audience

| Rubrique | Contenu |
|---|---|
| Finalité | statistiques agrégées d'usage de l'app (installations, actifs, signalements, contenus) |
| Base légale | intérêt légitime / mission d'intérêt public ; **aucun traceur tiers** |
| Données | agrégats quotidiens par commune, calculés à partir de la dernière ouverture de l'app (aucun suivi individuel exporté) |
| Destinataires | commune ; éditeur |
| Durées | agrégats conservés pendant le contrat |
