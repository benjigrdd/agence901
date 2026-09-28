# Procédure en cas de violation de données

> Répartition des rôles : l'éditeur (sous-traitant) détecte, contient et informe ; la commune (responsable
> de traitement) qualifie et notifie la CNIL et, le cas échéant, les personnes.

## 1. Détection (éditeur)
Sources : alertes Sentry, alertes de tâches (`job-alerts`), journal d'audit, signalement d'une commune ou
d'un chercheur, alerte d'un fournisseur. Toute suspicion ouvre un **journal d'incident** (date, heure,
faits, personnes informées, décisions).

## 2. Confinement (éditeur, immédiat)
- Révoquer les accès compromis : désactiver le membre, forcer la déconnexion, révoquer les jetons.
- Faire tourner les secrets exposés (`service_role`, JWT, clés SMTP, clés des stores, clé age si besoin :
  liste dans `docs/mise-en-production.md`).
- Préserver les preuves (journaux, audit) avant toute correction.

## 3. Information de la commune (éditeur, **48 h au plus**)
Contenu : nature de la violation, catégories et nombre approximatif de personnes et d'enregistrements,
conséquences probables, mesures prises ou proposées, contact de l'éditeur. Compléter au fil de l'enquête.

## 4. Qualification et notifications (commune, avec son DPO)
- Notification à la **CNIL sous 72 h** après la prise de connaissance (téléservice), sauf si la violation
  ne présente pas de risque pour les droits et libertés.
- Information des **personnes concernées** si risque élevé (message clair, mesures à prendre).
- Inscription dans le **registre des violations** de la commune, même sans notification.

## 5. Retour d'expérience (éditeur)
Cause racine, correctifs, mise à jour du modèle de menaces et des tests, compte rendu écrit à la commune.
