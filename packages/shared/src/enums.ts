export const MODULES = [
  'news',
  'events',
  'reports',
  'map',
  'mobility',
  'procedures',
  'participation',
  'notifications',
  'services',
  'environment',
  'media',
  'districts',
  'settings',
  'audit',
] as const;
export type Module = (typeof MODULES)[number];

/** Modules activables par commune (les autres sont des droits transverses). */
export const TENANT_MODULES = [
  'news',
  'events',
  'reports',
  'map',
  'mobility',
  'procedures',
  'participation',
  'notifications',
  'services',
  'environment',
] as const satisfies readonly Module[];
export type TenantModuleKey = (typeof TENANT_MODULES)[number];

/** Modules prevus en V2 : affiches « Bientot », jamais accessibles en V1. */
export const V2_MODULES = ['participation', 'mobility', 'services'] as const satisfies readonly Module[];

/** Modules reserves aux administrateurs de la commune, quels que soient les droits d'un agent. */
export const ADMIN_ONLY_MODULES = ['audit'] as const satisfies readonly Module[];

export const APP_ROLES = ['admin', 'agent'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const PERMISSION_LEVELS = ['read', 'edit', 'publish'] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];
export const PERMISSION_LEVEL_RANK: Record<PermissionLevel, number> = { read: 1, edit: 2, publish: 3 };

export const AAL_LEVELS = ['aal1', 'aal2'] as const;
export type AalLevel = (typeof AAL_LEVELS)[number];

export const POST_TYPES = ['news', 'works', 'decision', 'alert'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const ALERT_LEVELS = ['info', 'important', 'urgent'] as const;
export type AlertLevel = (typeof ALERT_LEVELS)[number];

export const CONTENT_STATUSES = ['draft', 'pending_review', 'scheduled', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const REPORT_STATUSES = [
  'new',
  'acknowledged',
  'in_progress',
  'resolved',
  'rejected',
  'duplicate',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const TERMINAL_REPORT_STATUSES = ['resolved', 'rejected', 'duplicate'] as const satisfies readonly ReportStatus[];
export const OPEN_REPORT_STATUSES = ['new', 'acknowledged', 'in_progress'] as const satisfies readonly ReportStatus[];

export const REPORT_PRIORITIES = ['low', 'normal', 'high'] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];
export const REPORT_PRIORITY_RANK: Record<ReportPriority, number> = { low: 1, normal: 2, high: 3 };

export const TENANT_TYPES = ['commune', 'epci'] as const;
export type TenantType = (typeof TENANT_TYPES)[number];

export const TENANT_STATUSES = ['onboarding', 'active', 'suspended'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const TENANT_PLANS = ['pilot', 'standard'] as const;
export type TenantPlan = (typeof TENANT_PLANS)[number];

export const WASTE_TYPES = ['household', 'recycling', 'glass', 'biowaste', 'bulky', 'green'] as const;
export type WasteType = (typeof WASTE_TYPES)[number];

export const SORTING_BINS = [...WASTE_TYPES, 'dechetterie', 'other'] as const;
export type SortingBin = (typeof SORTING_BINS)[number];

export const EVENT_CATEGORIES = ['culture', 'sport', 'association', 'municipal', 'youth', 'other'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const PROCEDURE_CATEGORIES = [
  'civil_status',
  'town_planning',
  'elections',
  'family',
  'social',
  'associations',
  'other',
] as const;
export type ProcedureCategory = (typeof PROCEDURE_CATEGORIES)[number];

export const PROCEDURE_KINDS = ['link', 'phone', 'email'] as const;
export type ProcedureKind = (typeof PROCEDURE_KINDS)[number];

export const NOTIFICATION_TARGET_TYPES = ['all', 'districts', 'topics'] as const;
export type NotificationTargetType = (typeof NOTIFICATION_TARGET_TYPES)[number];

export const REVIEWABLE_ENTITY_TYPES = ['post', 'event'] as const;
export type ReviewableEntityType = (typeof REVIEWABLE_ENTITY_TYPES)[number];

export const REVIEW_ACTIONS = ['submitted', 'approved', 'rejected'] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export const REPORT_EVENT_KINDS = ['status_change', 'comment', 'assignment'] as const;
export type ReportEventKind = (typeof REPORT_EVENT_KINDS)[number];

export const REPORT_EVENT_VISIBILITIES = ['public', 'internal'] as const;
export type ReportEventVisibility = (typeof REPORT_EVENT_VISIBILITIES)[number];

export const PLACE_SOURCES = ['manual', 'osm', 'irve', 'csv'] as const;
export type PlaceSource = (typeof PLACE_SOURCES)[number];

export const WHEELCHAIR_ACCESS = ['yes', 'limited', 'no', 'unknown'] as const;
export type WheelchairAccess = (typeof WHEELCHAIR_ACCESS)[number];

export const HOME_TILES = [
  'alerts',
  'news',
  'events',
  'reports',
  'map',
  'environment',
  'procedures',
  'contact',
] as const;
export type HomeTile = (typeof HOME_TILES)[number];

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'transition',
  'invite',
  'permissions',
  'disable',
  'enable',
  'upload',
  'reorder',
  'send',
  'platform_access',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Statut de publication de l'app d'une commune sur un store. */
export const STORE_PUBLICATION_STATUSES = ['not_started', 'accounts_pending', 'in_review', 'published', 'rejected'] as const;
export type StorePublicationStatus = (typeof STORE_PUBLICATION_STATUSES)[number];


/** Plateformes des jetons de notification push. */
export const PUSH_PLATFORMS = ['ios', 'android'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];
