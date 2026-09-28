# Trame d'AIPD — traitement « signalements » (photos et géolocalisation)

> Trame préremplie par l'éditeur, **à compléter et valider par la commune et son DPO** (méthode et outil
> PIA de la CNIL). Les appréciations de risque ci-dessous sont des propositions.

## 1. Contexte
- **Traitement** : signalement par les habitants de problèmes dans l'espace public (voirie, propreté,
  éclairage…), avec photos et position, et suivi par les services municipaux.
- **Responsable** : commune de [Nom] ; **sous-traitant** : [éditeur] (annexe article 28).
- **Pourquoi une AIPD** : données de localisation, photos pouvant montrer des personnes ou plaques,
  usage à grande échelle par une collectivité.

## 2. Principes fondamentaux
| Point | Mesure |
|---|---|
| Finalité déterminée | traitement du signalement et information de son auteur |
| Minimisation | pas de compte nominatif ; position lue au seul moment du signalement ; email facultatif ; 3 photos au plus |
| Exactitude | l'habitant corrige la position sur une carte avant envoi |
| Durées | email 12 mois après clôture, lien habitant 36 mois, compte inactif 24 mois (purge automatique) |
| Information | politique de confidentialité dans l'app et sur le site ; mention au moment du signalement |
| Droits | export et suppression dans l'app ; procédure écrite (`procedure-droits.md`) |
| Sous-traitants | liste et garanties dans l'annexe article 28 |

## 3. Mesures de sécurité
Isolation entre communes (RLS, tests automatisés), 2FA obligatoire du personnel, photos dans un stockage
privé avec liens temporaires, habitant pseudonymisé dans le dashboard, journal d'audit, chiffrement en
transit, sauvegardes chiffrées testées, supervision sans données personnelles (`docs/securite/modele-de-menaces.md`).

## 4. Risques (proposition)
| Risque | Sources | Impacts pour les personnes | Gravité | Vraisemblance | Mesures |
|---|---|---|---|---|---|
| Accès illégitime | compte d'agent volé, agent d'une autre commune | révélation de la position d'un domicile, photos | Importante | Limitée | 2FA, RLS, audit, pseudonymisation |
| Modification non désirée | agent malveillant, erreur | suivi erroné | Limitée | Limitée | droits par module, historique, audit |
| Disparition | incident d'hébergement, suppression | perte du suivi | Limitée | Négligeable | sauvegardes quotidiennes chiffrées, test mensuel |
| Photos de tiers (visages, plaques) | contenu libre | atteinte à la vie privée de tiers | Importante | Significative | **à décider par la commune** : consigne dans l'app, modération, floutage (piste V2) |

## 5. Plan d'action et validation
- [ ] Compléter l'appréciation des risques avec le DPO.
- [ ] Décider des mesures pour les photos de tiers.
- [ ] Avis du DPO, décision du responsable de traitement, date de révision (annuelle).
