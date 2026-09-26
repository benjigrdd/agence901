import type {
  StorePublicationStatus,
  AlertLevel,
  AppRole,
  AuditAction,
  ContentStatus,
  EventCategory,
  HomeTile,
  Module,
  NotificationTargetType,
  PermissionLevel,
  PlaceSource,
  PostType,
  ProcedureCategory,
  ProcedureKind,
  ReportEventVisibility,
  ReportPriority,
  ReportStatus,
  ReviewAction,
  SortingBin,
  TenantPlan,
  TenantStatus,
  TenantType,
  WasteType,
  WheelchairAccess,
} from '../enums';

export const MODULE_LABELS: Record<Module, string> = {
  news: 'Actualités',
  events: 'Agenda',
  reports: 'Signalements',
  map: 'Carte',
  mobility: 'Mobilité',
  procedures: 'Démarches',
  participation: 'Participation',
  notifications: 'Notifications',
  services: 'Services pratiques',
  environment: 'Environnement',
  media: 'Médiathèque',
  districts: 'Quartiers',
  settings: 'Paramètres',
  audit: "Journal d'audit",
};

export const ROLE_LABELS: Record<AppRole, string> = { admin: 'Administrateur', agent: 'Agent' };

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  read: 'Lecture',
  edit: 'Édition',
  publish: 'Publication',
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  news: 'Actualité',
  works: 'Travaux',
  decision: 'Décision municipale',
  alert: 'Alerte',
};

export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  info: 'Information',
  important: 'Important',
  urgent: 'Urgent',
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Brouillon',
  pending_review: 'À valider',
  scheduled: 'Programmé',
  published: 'Publié',
  archived: 'Archivé',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: 'Nouveau',
  acknowledged: 'Pris en compte',
  in_progress: 'En cours',
  resolved: 'Résolu',
  rejected: 'Rejeté',
  duplicate: 'Doublon',
};

export const REPORT_PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
};

export const TENANT_TYPE_LABELS: Record<TenantType, string> = {
  commune: 'Commune',
  epci: 'Intercommunalité',
};

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  onboarding: 'En déploiement',
  active: 'Active',
  suspended: 'Suspendue',
};

export const TENANT_PLAN_LABELS: Record<TenantPlan, string> = {
  pilot: 'Pilote',
  standard: 'Standard',
};

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  household: 'Ordures ménagères',
  recycling: 'Emballages et papiers',
  glass: 'Verre',
  biowaste: 'Biodéchets',
  bulky: 'Encombrants',
  green: 'Déchets verts',
};

export const SORTING_BIN_LABELS: Record<SortingBin, string> = {
  ...WASTE_TYPE_LABELS,
  dechetterie: 'Déchèterie',
  other: 'Autre filière',
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  culture: 'Culture',
  sport: 'Sport',
  association: 'Vie associative',
  municipal: 'Vie municipale',
  youth: 'Jeunesse',
  other: 'Autre',
};

export const PROCEDURE_CATEGORY_LABELS: Record<ProcedureCategory, string> = {
  civil_status: 'État civil',
  town_planning: 'Urbanisme',
  elections: 'Élections',
  family: 'Famille',
  social: 'Social',
  associations: 'Associations',
  other: 'Autres démarches',
};

export const PROCEDURE_KIND_LABELS: Record<ProcedureKind, string> = {
  link: 'Lien externe',
  phone: 'Téléphone',
  email: 'Email',
};

export const NOTIFICATION_TARGET_TYPE_LABELS: Record<NotificationTargetType, string> = {
  all: 'Toute la commune',
  districts: 'Quartiers',
  topics: 'Thèmes',
};

export const REVIEW_ACTION_LABELS: Record<ReviewAction, string> = {
  submitted: 'Soumis à validation',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

export const REPORT_EVENT_VISIBILITY_LABELS: Record<ReportEventVisibility, string> = {
  public: "Visible par l'habitant",
  internal: 'Note interne',
};

export const PLACE_SOURCE_LABELS: Record<PlaceSource, string> = {
  manual: 'Manuel',
  osm: 'OpenStreetMap',
  irve: 'IRVE',
  csv: 'CSV',
};

export const WHEELCHAIR_ACCESS_LABELS: Record<WheelchairAccess, string> = {
  yes: 'Accessible',
  limited: 'Partiellement accessible',
  no: 'Non accessible',
  unknown: 'Non renseigné',
};

export const HOME_TILE_LABELS: Record<HomeTile, string> = {
  alerts: 'Alertes',
  news: 'Actualités',
  events: 'Agenda',
  reports: 'Signaler un problème',
  map: 'Carte',
  environment: 'Collecte et tri',
  procedures: 'Démarches',
  contact: 'Contacter la mairie',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  transition: 'Changement de statut',
  invite: 'Invitation',
  permissions: 'Modification des droits',
  disable: 'Désactivation',
  enable: 'Réactivation',
  upload: 'Téléversement',
  reorder: 'Réorganisation',
  send: 'Envoi',
  platform_access: 'Accès éditeur',
};

export const STORE_PUBLICATION_STATUS_LABELS: Record<StorePublicationStatus, string> = {
  not_started: 'Non démarré',
  accounts_pending: 'Comptes en cours',
  in_review: 'En revue',
  published: 'Publiée',
  rejected: 'Rejetée',
};

