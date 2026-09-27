import type {
  AuditEntry,
  CitizenProfile,
  ContentReview,
  District,
  Event,
  Media,
  Notification,
  Place,
  PlaceCategory,
  Post,
  Procedure,
  Profile,
  Report,
  ReportCategory,
  ReportEvent,
  Service,
  SortingGuideItem,
  Tenant,
  TenantAppConfig,
  TenantBranding,
  TenantModule,
  TenantStoreInfo,
  Topic,
  UsageDaily,
  WasteSchedule,
  WasteZone,
} from '@app/shared';
import * as s from '@app/shared';

import { AUDIT_ENTITY_NAMES, iso, isoOrNull, multiPolygonFromGeoJson, pointFromGeoJson, validated } from './core';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];
type Row<T extends keyof Tables> = Tables[T]['Row'];
type ViewRow<T extends keyof Views> = Views[T]['Row'];

// Les colonnes des vues sont declarees nullables par le generateur : zod rejette toute valeur manquante.
const stamps = (r: { created_at: string | null; updated_at: string | null }) => ({ createdAt: iso(r.created_at), updatedAt: iso(r.updated_at) });
const base = (r: { id: string | null; tenant_id: string | null; created_at: string | null; updated_at: string | null }) => ({ id: r.id, tenantId: r.tenant_id, ...stamps(r) });

export const toTenant = (r: ViewRow<'v_tenants'>, internalNotes: string | null = null): Tenant =>
  validated(
    s.TenantSchema,
    {
      id: r.id,
      slug: r.slug,
      name: r.name,
      type: r.type,
      parentId: r.parent_id,
      inseeCode: r.insee_code,
      population: r.population,
      status: r.status,
      plan: r.plan,
      timezone: r.timezone,
      center: pointFromGeoJson(r.center_geo),
      renewalDate: r.renewal_date,
      internalNotes,
      ...stamps(r),
    },
    'commune',
  );

export const toBranding = (r: Row<'tenant_branding'>): TenantBranding =>
  validated(s.TenantBrandingSchema, { ...base(r), appName: r.app_name, shortName: r.short_name, colors: r.colors, logoUrl: r.logo_url, iconUrl: r.icon_url }, 'marque');

export const toModule = (r: Row<'tenant_modules'>): TenantModule =>
  validated(s.TenantModuleSchema, { ...base(r), module: r.module, enabled: r.enabled, settings: r.settings }, 'module');

export const toAppConfig = (r: Row<'tenant_app_config'>): TenantAppConfig =>
  validated(s.TenantAppConfigSchema, { ...base(r), homeLayout: r.home_layout, links: r.links, contact: r.contact }, 'configuration');

export const toStoreInfo = (r: Row<'tenant_store_info'>): TenantStoreInfo =>
  validated(
    s.TenantStoreInfoSchema,
    {
      ...base(r),
      iosBundleId: r.ios_bundle_id,
      androidPackage: r.android_package,
      easProjectId: r.eas_project_id,
      appStoreId: r.app_store_id,
      urlScheme: r.url_scheme,
      playStoreUrl: r.play_store_url,
      iosStatus: r.ios_status,
      androidStatus: r.android_status,
      iosRejectionReason: r.ios_rejection_reason,
      androidRejectionReason: r.android_rejection_reason,
      onboardingChecklist: r.onboarding_checklist,
    },
    'fiche store',
  );

export const toProfile = (r: Row<'profiles'>, email: string, lastSignInAt: string | null): Profile =>
  validated(s.ProfileSchema, { id: r.id, displayName: r.display_name, email, avatarUrl: r.avatar_url, lastSignInAt: isoOrNull(lastSignInAt), ...stamps(r) }, 'profil');

export const toMembership = (r: Row<'memberships'>) =>
  validated(
    s.MembershipSchema,
    { ...base(r), userId: r.user_id, role: r.role, invitedAt: isoOrNull(r.invited_at), acceptedAt: isoOrNull(r.accepted_at), disabledAt: isoOrNull(r.disabled_at) },
    'membre',
  );

export const toTopic = (r: Row<'topics'>): Topic => validated(s.TopicSchema, { ...base(r), label: r.label, order: r.sort_order }, 'thème');

export const toCitizenProfile = (r: Row<'citizen_profiles'>): CitizenProfile =>
  validated(
    s.CitizenProfileSchema,
    {
      ...base(r),
      userId: r.user_id,
      locale: r.locale,
      districtIds: r.district_ids,
      topicIds: r.topic_ids,
      notificationPrefs: r.notification_prefs,
      wasteZoneId: r.waste_zone_id,
      contactEmail: r.contact_email,
      lastSeenAt: iso(r.last_seen_at),
    },
    'profil habitant',
  );

export const toMedia = (r: Row<'media'>, url: string): Media =>
  validated(s.MediaSchema, { ...base(r), path: r.path, url, mime: r.mime, width: r.width, height: r.height, altText: r.alt_text, decorative: r.decorative, credit: r.credit }, 'média');

export const toPost = (r: Row<'posts'>): Post =>
  validated(
    s.PostSchema,
    {
      ...base(r),
      type: r.type,
      title: r.title,
      summary: r.summary,
      body: r.body,
      coverMediaId: r.cover_media_id,
      status: r.status,
      publishAt: isoOrNull(r.publish_at),
      unpublishAt: isoOrNull(r.unpublish_at),
      districtIds: r.district_ids,
      topicIds: r.topic_ids,
      pinned: r.pinned,
      alertLevel: r.alert_level,
      sendPush: r.send_push,
      authorId: r.author_id,
      reviewerId: r.reviewer_id,
    },
    'actualité',
  );

export const toEvent = (r: ViewRow<'v_events'>): Event =>
  validated(
    s.EventSchema,
    {
      ...base(r),
      title: r.title,
      description: r.description,
      category: r.category,
      startsAt: iso(r.starts_at),
      endsAt: iso(r.ends_at),
      allDay: r.all_day,
      rrule: r.rrule,
      placeId: r.place_id,
      location: r.location_label && r.location_point_geo ? { label: r.location_label, point: pointFromGeoJson(r.location_point_geo) } : null,
      organizer: r.organizer,
      price: r.price,
      registrationUrl: r.registration_url,
      coverMediaId: r.cover_media_id,
      accessible: r.accessible,
      status: r.status,
      publishAt: isoOrNull(r.publish_at),
      authorId: r.author_id,
      reviewerId: r.reviewer_id,
    },
    'événement',
  );

export const toReview = (r: Row<'content_reviews'>): ContentReview =>
  validated(s.ContentReviewSchema, { ...base(r), entityType: r.entity_type, entityId: r.entity_id, action: r.action, comment: r.comment, authorId: r.author_id }, 'validation');

export const toPlaceCategory = (r: Row<'place_categories'>): PlaceCategory =>
  validated(s.PlaceCategorySchema, { ...base(r), key: r.key, label: r.label, icon: r.icon, color: r.color, isDefault: r.is_default, hidden: r.hidden }, 'catégorie de lieu');

export const toPlace = (r: ViewRow<'v_places'>): Place =>
  validated(
    s.PlaceSchema,
    {
      ...base(r),
      categoryId: r.category_id,
      name: r.name,
      point: pointFromGeoJson(r.point_geo),
      address: r.address,
      openingHours: r.opening_hours,
      phone: r.phone,
      website: r.website,
      description: r.description,
      accessibility: r.accessibility,
      photoMediaId: r.photo_media_id,
      source: r.source,
      externalId: r.external_id,
    },
    'lieu',
  );

export const toProcedure = (r: Row<'procedures'>): Procedure =>
  validated(s.ProcedureSchema, { ...base(r), category: r.category, title: r.title, description: r.description, kind: r.kind, value: r.value, order: r.sort_order }, 'démarche');

export const toSortingItem = (r: Row<'sorting_guide_items'>): SortingGuideItem =>
  validated(s.SortingGuideItemSchema, { ...base(r), name: r.name, bin: r.bin, advice: r.advice }, 'consigne de tri');

export const toService = (r: Row<'services'>): Service => validated(s.ServiceSchema, { ...base(r), name: r.name, email: r.email }, 'service');

export const toReportCategory = (r: Row<'report_categories'>): ReportCategory =>
  validated(s.ReportCategorySchema, { ...base(r), label: r.label, icon: r.icon, defaultServiceId: r.default_service_id, slaDays: r.sla_days }, 'catégorie de signalement');

export const toReport = (r: ViewRow<'v_reports'>, photos: string[]): Report =>
  validated(
    s.ReportSchema,
    {
      ...base(r),
      reference: r.reference,
      categoryId: r.category_id,
      description: r.description,
      point: pointFromGeoJson(r.point_geo),
      address: r.address,
      status: r.status,
      priority: r.priority,
      serviceId: r.service_id,
      duplicateOfId: r.duplicate_of_id,
      reporterId: r.reporter_id,
      contactEmail: r.contact_email,
      photos,
      aiSuggestion: r.ai_suggestion,
      resolvedAt: isoOrNull(r.resolved_at),
    },
    'signalement',
  );

export const toReportEvent = (r: Row<'report_events'>): ReportEvent =>
  validated(
    s.ReportEventSchema,
    { ...base(r), reportId: r.report_id, kind: r.kind, fromStatus: r.from_status, toStatus: r.to_status, message: r.message, visibility: r.visibility, authorId: r.author_id },
    'événement de signalement',
  );

export const toDistrict = (r: ViewRow<'v_districts'>): District =>
  validated(s.DistrictSchema, { ...base(r), name: r.name, color: r.color, geom: multiPolygonFromGeoJson(r.geom_geo) }, 'quartier');

export const toWasteZone = (r: ViewRow<'v_waste_zones'>): WasteZone =>
  validated(s.WasteZoneSchema, { ...base(r), name: r.name, geom: multiPolygonFromGeoJson(r.geom_geo) }, 'zone de collecte');

export const toWasteSchedule = (r: Row<'waste_schedules'>): WasteSchedule =>
  validated(s.WasteScheduleSchema, { ...base(r), zoneId: r.zone_id, wasteType: r.waste_type, rrule: r.rrule, exceptions: r.exceptions, note: r.note }, 'collecte');

export const toNotification = (r: Row<'notifications'>): Notification =>
  validated(
    s.NotificationSchema,
    {
      ...base(r),
      title: r.title,
      body: r.body,
      target: r.target,
      linkedEntity: r.linked_entity,
      scheduledAt: isoOrNull(r.scheduled_at),
      sentAt: isoOrNull(r.sent_at),
      stats: r.stats,
      urgent: r.urgent,
      justification: r.justification,
      authorId: r.author_id,
    },
    'notification',
  );

export const toAuditEntry = (r: Row<'audit_log'>): AuditEntry =>
  validated(
    s.AuditEntrySchema,
    {
      id: r.id,
      tenantId: r.tenant_id,
      actorId: r.actor_id ?? '00000000-0000-4000-8000-000000000000',
      action: r.action,
      entity: AUDIT_ENTITY_NAMES[r.entity] ?? r.entity,
      entityId: r.entity_id,
      diff: r.diff,
      at: iso(r.at),
    },
    'audit',
  );

export const toUsage = (r: Row<'usage_daily'>): UsageDaily =>
  validated(
    s.UsageDailySchema,
    { id: r.id, tenantId: r.tenant_id, date: r.date, installs: r.installs, activeUsers: r.active_users, reportsCreated: r.reports_created, postsPublished: r.posts_published },
    'usage',
  );
