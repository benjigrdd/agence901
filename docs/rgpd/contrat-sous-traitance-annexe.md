# Annexe « protection des données » au contrat — modèle (article 28 du RGPD)

> **Modèle à adapter et à valider** par la commune (responsable de traitement), son DPO et l'éditeur
> (sous-traitant). Ne constitue pas un avis juridique.

## 1. Objet

L'éditeur fournit à la commune une plateforme permettant de publier des informations municipales dans une
application mobile à ses couleurs et de recevoir les signalements des habitants. Il traite des données
personnelles **pour le compte de la commune et sur ses instructions documentées**.

## 2. Durée

Durée du contrat de service, puis la période de restitution et de suppression décrite au §10.

## 3. Nature et finalités des traitements

| Traitement | Finalité |
|---|---|
| Signalements | recevoir, traiter et suivre les signalements dans l'espace public, informer l'habitant de leur suivi |
| Notifications | envoyer les alertes et informations municipales choisies par l'habitant |
| Comptes du personnel | authentifier les agents, gérer leurs droits, tracer leurs actions |
| Mesure d'audience | statistiques agrégées d'usage (sans traceur tiers, sans profilage) |

## 4. Catégories de données et de personnes

- **Habitants** (utilisateurs de l'app, sans compte nominatif) : identifiant technique pseudonyme, jeton
  de notification, préférences (quartiers, thèmes), signalements (description, photos, position au
  moment du signalement), email de contact **facultatif**.
- **Agents et élus de la commune** : nom affiché, email professionnel, rôle et droits, facteur 2FA,
  journal de leurs actions.
- Aucune donnée sensible (article 9) n'est demandée ; les descriptions et photos libres peuvent en
  contenir incidemment : modération par la commune.

## 5. Obligations de l'éditeur

Traiter uniquement sur instruction ; confidentialité du personnel habilité ; mesures de sécurité (§7) ;
assistance au responsable (§8) ; tenue d'un registre des traitements en tant que sous-traitant ;
information préalable de la commune de tout changement de sous-traitant ultérieur, avec possibilité
d'objection ; mise à disposition des informations nécessaires aux audits.

## 6. Sous-traitants ultérieurs

| Sous-traitant | Service | Localisation des données | Garanties |
|---|---|---|---|
| Supabase Inc. (sur AWS) | base de données, authentification, fichiers, fonctions serveur | Paris (eu-west-3) | DPA, clauses contractuelles types (CCT) |
| Vercel Inc. | hébergement du dashboard | calcul à Paris (`cdg1`), CDN mondial | DPA, CCT / Data Privacy Framework |
| Expo (650 Industries) | service d'envoi des notifications, mises à jour de l'app | États-Unis (jeton push et contenu de la notification) | DPA, CCT |
| Apple (APNs) et Google (FCM) | acheminement des notifications | selon le fournisseur | conditions des plateformes |
| Sentry (Functional Software) | suivi des erreurs **sans données personnelles** | UE (Francfort) | DPA, CCT |
| Brevo | emails transactionnels (invitations, réinitialisation, alertes techniques) | UE | DPA |
| Scaleway | sauvegardes **chiffrées** | Paris (fr-par) | DPA, hébergeur français |
| Mistral AI (V2, si la commune active l'aide à la catégorisation) | analyse du texte des signalements | UE | DPA — non utilisé au V1 |

## 7. Mesures de sécurité

Voir `docs/securite/modele-de-menaces.md` : chiffrement en transit (HTTPS/TLS) et au repos (hébergeurs),
isolation stricte entre communes (RLS), 2FA obligatoire du personnel, journal d'audit, sauvegardes
chiffrées testées chaque mois, suivi des erreurs sans données personnelles, gestion des secrets hors du
code, analyses de dépendances et de secrets en intégration continue.

## 8. Assistance

L'éditeur aide la commune à répondre aux demandes d'exercice des droits (`procedure-droits.md`), à
réaliser l'analyse d'impact (`aipd-trame.md`) et à respecter ses obligations de sécurité.

## 9. Violations de données

L'éditeur notifie la commune **au plus tard 48 heures** après en avoir eu connaissance, avec les
informations prévues à l'article 33.3 (`procedure-violation.md`). La commune notifie la CNIL (72 h) et,
le cas échéant, les personnes concernées.

## 10. Fin du contrat

À la fin du contrat, l'éditeur remet à la commune l'**export de réversibilité** (lot 17 : toutes les
tables en JSON et CSV, GeoJSON, médias ; données personnelles incluses si la commune le demande), puis
**supprime les données sous 30 jours**, sauvegardes comprises à l'expiration de leur durée de rétention
(30 jours), et en atteste par écrit.
