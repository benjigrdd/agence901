import type {
  AuditAction,
  AuditEntry,
  CitizenPreferencesInput,
  CitizenProfile,
  CollectionOccurrence,
  ContentReview,
  ContentStatus,
  CsvImportEntity,
  District,
  DistrictInput,
  Event,
  EventCategory,
  EventInput,
  Media,
  MediaMetaInput,
  MemberInviteInput,
  MemberPermissionsInput,
  Membership,
  MembershipStatus,
  Notification,
  NotificationInput,
  NotificationTarget,
  PermissionMap,
  Place,
  PlaceCategory,
  PlaceCategoryInput,
  PlaceInput,
  Post,
  PostInput,
  PostType,
  Procedure,
  ProcedureInput,
  PushTokenInput,
  Profile,
  Report,
  ReportCategory,
  ReportCategoryInput,
  ReportEvent,
  ReportInput,
  ReportPriority,
  ReportStatus,
  ReportStatusChangeInput,
  Service,
  ServiceInput,
  SortingGuideItem,
  SortingGuideItemInput,
  Tenant,
  TenantAppConfig,
  TenantAppConfigInput,
  TenantBranding,
  TenantBrandingInput,
  TenantCreationInput,
  TenantInput,
  TenantModule,
  TenantModuleKey,
  TenantStoreInfo,
  TenantStoreInfoInput,
  Topic,
  TopicInput,
  UsageDaily,
  WasteSchedule,
  WasteScheduleInput,
  WasteZone,
  WasteZoneInput,
} from '@app/shared';

import type { DataContext, ListParams, ListResult, SessionContext } from './context';

// ---------------------------------------------------------------------------
// Commune, marque, modules, configuration de l'app
// ---------------------------------------------------------------------------

export interface TenantsRepository {
  /** Communes accessibles au personnel (toutes pour le super-admin). */
  list(ctx: SessionContext): Promise<ListResult<Tenant>>;
  get(ctx: DataContext): Promise<Tenant>;
  /** Resolution d'une URL `/[tenant]` cote personnel : `NotFoundError` sans acces. */
  getBySlug(ctx: SessionContext, slug: string): Promise<Tenant>;
  /** Informations publiques (app citoyenne, sans session). */
  getPublicBySlug(slug: string): Promise<Tenant>;
  /** Super-admin : cree la commune, ses donnees par defaut (`seedTenantDefaults`), sa marque et l'invitation du 1er admin. */
  create(ctx: SessionContext, input: TenantCreationInput): Promise<Tenant>;
  update(ctx: DataContext, input: TenantInput): Promise<Tenant>;
}

export interface BrandingRepository {
  get(ctx: DataContext): Promise<TenantBranding>;
  update(ctx: DataContext, input: TenantBrandingInput): Promise<TenantBranding>;
}

export interface ModulesRepository {
  list(ctx: DataContext): Promise<TenantModule[]>;
  setEnabled(ctx: DataContext, module: TenantModuleKey, enabled: boolean): Promise<TenantModule>;
}

export interface AppConfigRepository {
  get(ctx: DataContext): Promise<TenantAppConfig>;
  update(ctx: DataContext, input: TenantAppConfigInput): Promise<TenantAppConfig>;
}

export interface StoreInfoRepository {
  get(ctx: DataContext): Promise<TenantStoreInfo>;
  update(ctx: DataContext, input: TenantStoreInfoInput): Promise<TenantStoreInfo>;
}

// ---------------------------------------------------------------------------
// Membres
// ---------------------------------------------------------------------------

export type MemberView = {
  membership: Membership;
  profile: Profile;
  permissions: PermissionMap;
  status: MembershipStatus;
};

export type MemberFilters = { status?: MembershipStatus[] };

export type StaffDirectoryEntry = { userId: string; displayName: string };

export interface MembersRepository {
  /** Noms du personnel de la commune (auteurs, historiques) : lisible par tout le personnel. */
  directory(ctx: DataContext): Promise<StaffDirectoryEntry[]>;
  list(ctx: DataContext, params?: ListParams<MemberFilters>): Promise<ListResult<MemberView>>;
  invite(ctx: DataContext, input: MemberInviteInput): Promise<MemberView>;
  updatePermissions(ctx: DataContext, membershipId: string, input: MemberPermissionsInput): Promise<MemberView>;
  disable(ctx: DataContext, membershipId: string): Promise<MemberView>;
  enable(ctx: DataContext, membershipId: string): Promise<MemberView>;
}

// ---------------------------------------------------------------------------
// Contenus avec circuit de validation
// ---------------------------------------------------------------------------

export type ContentTransitionInput = {
  to: ContentStatus;
  comment?: string | null;
  publishAt?: string | null;
};

export interface ContentRepository<T, TInput, TFilters> {
  list(ctx: DataContext, params?: ListParams<TFilters>): Promise<ListResult<T>>;
  get(ctx: DataContext, id: string): Promise<T>;
  create(ctx: DataContext, input: TInput): Promise<T>;
  update(ctx: DataContext, id: string, input: TInput): Promise<T>;
  transition(ctx: DataContext, id: string, input: ContentTransitionInput): Promise<T>;
  reviews(ctx: DataContext, id: string): Promise<ContentReview[]>;
  /** Nombre d'elements par statut (onglets, compteur « À valider »). */
  counts(ctx: DataContext): Promise<Record<ContentStatus, number>>;
}

export type PostFilters = {
  status?: ContentStatus[];
  type?: PostType[];
  districtId?: string;
  topicId?: string;
};

export type EventFilters = {
  status?: ContentStatus[];
  category?: EventCategory[];
  /** Evenements qui se terminent apres `from` (ISO). */
  from?: string;
  /** Evenements qui commencent avant `to` (ISO). */
  to?: string;
};

export type PostsRepository = ContentRepository<Post, PostInput, PostFilters>;
export type EventsRepository = ContentRepository<Event, EventInput, EventFilters>;

// ---------------------------------------------------------------------------
// Mediatheque
// ---------------------------------------------------------------------------

export type MediaFile = {
  name: string;
  mime: string;
  /** En mock : data URL. Au lot 14 : televersement vers Supabase Storage. */
  dataUrl: string;
  width: number;
  height: number;
};

export type MediaListItem = { media: Media; usageCount: number };
export type MediaFilters = { mime?: string[] };

export interface MediaRepository {
  list(ctx: DataContext, params?: ListParams<MediaFilters>): Promise<ListResult<MediaListItem>>;
  get(ctx: DataContext, id: string): Promise<MediaListItem>;
  upload(ctx: DataContext, file: MediaFile, meta: MediaMetaInput): Promise<Media>;
  update(ctx: DataContext, id: string, meta: MediaMetaInput): Promise<Media>;
  /** `ConflictError` si l'image est utilisee. */
  remove(ctx: DataContext, id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Referentiels simples
// ---------------------------------------------------------------------------

export interface SimpleRepository<T, TInput> {
  list(ctx: DataContext): Promise<T[]>;
  get(ctx: DataContext, id: string): Promise<T>;
  create(ctx: DataContext, input: TInput): Promise<T>;
  update(ctx: DataContext, id: string, input: TInput): Promise<T>;
  remove(ctx: DataContext, id: string): Promise<void>;
}

export type PlaceFilters = { categoryId?: string[] };

export interface PlacesRepository {
  list(ctx: DataContext, params?: ListParams<PlaceFilters>): Promise<ListResult<Place>>;
  get(ctx: DataContext, id: string): Promise<Place>;
  create(ctx: DataContext, input: PlaceInput): Promise<Place>;
  update(ctx: DataContext, id: string, input: PlaceInput): Promise<Place>;
  remove(ctx: DataContext, id: string): Promise<void>;
}

/** Les categories par defaut ne sont pas supprimables (`ConflictError`), seulement masquables. */
export type PlaceCategoriesRepository = SimpleRepository<PlaceCategory, PlaceCategoryInput>;
export type ServicesRepository = SimpleRepository<Service, ServiceInput>;
export type ReportCategoriesRepository = SimpleRepository<ReportCategory, ReportCategoryInput>;
export type TopicsRepository = SimpleRepository<Topic, TopicInput>;

export type DistrictStats = { districtId: string; reports: number; subscribers: number };

export interface DistrictsRepository extends SimpleRepository<District, DistrictInput> {
  stats(ctx: DataContext): Promise<DistrictStats[]>;
}

// ---------------------------------------------------------------------------
// Signalements
// ---------------------------------------------------------------------------

export type ReportFilters = {
  status?: ReportStatus[];
  categoryId?: string[];
  serviceId?: string[];
  priority?: ReportPriority[];
  from?: string;
  to?: string;
  /** Point dans le polygone du quartier (turf en mock, PostGIS au lot 14). */
  districtId?: string;
  overdueOnly?: boolean;
};

export type ReportListItem = { report: Report; ageDays: number; overdue: boolean };

export type ReportDetail = ReportListItem & {
  events: ReportEvent[];
  /** « Habitant n° 4F2A » : jamais l'identifiant technique. */
  reporterAlias: string | null;
};

export type NearbyReport = { report: Report; distanceM: number };

export type ReportStats = {
  new: number;
  inProgress: number;
  open: number;
  overdue: number;
  /** Delai moyen de resolution sur 30 jours, en jours. */
  averageResolutionDays: number | null;
  /** 12 dernieres semaines, de la plus ancienne a la plus recente. */
  weekly: { weekStart: string; created: number; resolved: number }[];
};

export interface ReportsRepository {
  list(ctx: DataContext, params?: ListParams<ReportFilters>): Promise<ListResult<ReportListItem>>;
  get(ctx: DataContext, id: string): Promise<ReportDetail>;
  updateStatus(ctx: DataContext, id: string, input: ReportStatusChangeInput): Promise<ReportDetail>;
  assign(ctx: DataContext, id: string, serviceId: string | null): Promise<ReportDetail>;
  setPriority(ctx: DataContext, id: string, priority: ReportPriority): Promise<ReportDetail>;
  markDuplicate(ctx: DataContext, id: string, originalId: string): Promise<ReportDetail>;
  addNote(ctx: DataContext, id: string, message: string): Promise<ReportDetail>;
  /** Signalements ouverts de meme categorie, crees depuis moins de 30 jours, dans le rayon donne. */
  nearby(ctx: DataContext, reportId: string, radiusM: number): Promise<NearbyReport[]>;
  stats(ctx: DataContext): Promise<ReportStats>;
}

// ---------------------------------------------------------------------------
// Environnement, demarches, notifications
// ---------------------------------------------------------------------------

export interface EnvironmentRepository {
  zones: SimpleRepository<WasteZone, WasteZoneInput>;
  schedules: SimpleRepository<WasteSchedule, WasteScheduleInput>;
  sortingGuide: SimpleRepository<SortingGuideItem, SortingGuideItemInput>;
  nextCollections(ctx: DataContext, zoneId: string, from: Date, count: number): Promise<CollectionOccurrence[]>;
}

export interface ProceduresRepository extends SimpleRepository<Procedure, ProcedureInput> {
  reorder(ctx: DataContext, orderedIds: string[]): Promise<Procedure[]>;
}

export interface NotificationsRepository {
  list(ctx: DataContext, params?: ListParams): Promise<ListResult<Notification>>;
  create(ctx: DataContext, input: NotificationInput): Promise<Notification>;
  estimateAudience(ctx: DataContext, target: NotificationTarget): Promise<number>;
}

// ---------------------------------------------------------------------------
// Audit et usage
// ---------------------------------------------------------------------------

export type AuditFilters = {
  actorId?: string;
  entity?: string;
  action?: AuditAction[];
  from?: string;
  to?: string;
};

export interface AuditRepository {
  list(ctx: DataContext, params?: ListParams<AuditFilters>): Promise<ListResult<AuditEntry>>;
  /** Trace l'acces du super-admin a l'espace d'une commune (au plus une entree par 30 minutes). */
  recordPlatformAccess(ctx: DataContext): Promise<void>;
}

export interface UsageRepository {
  daily(ctx: DataContext, range: { from: string; to: string }): Promise<UsageDaily[]>;
}

// ---------------------------------------------------------------------------
// App citoyenne
// ---------------------------------------------------------------------------

export type CitizenReportView = { report: Report; events: ReportEvent[] };
export type PublicFeed = { posts: Post[]; events: Event[]; places: Place[] };

export interface CitizenRepository {
  getOrCreateProfile(ctx: DataContext): Promise<CitizenProfile>;
  updatePreferences(ctx: DataContext, input: CitizenPreferencesInput): Promise<CitizenProfile>;
  /** Uniquement les signalements de l'habitant, avec les evenements publics. */
  listMyReports(ctx: DataContext): Promise<CitizenReportView[]>;
  /** Idempotent : un meme `clientRequestId` renvoie le signalement deja cree (file hors ligne). */
  createReport(ctx: DataContext, input: ReportInput): Promise<Report>;
  /** Enregistre (ou rattache a l'habitant courant) le jeton push de l'appareil. */
  registerPushToken(ctx: DataContext, input: PushTokenInput): Promise<void>;
  unregisterPushToken(ctx: DataContext, token: string): Promise<void>;
  /** Derniere activite de l'habitant (mesure d'usage sans traceur : compteurs agreges par jour). */
  touch(ctx: DataContext): Promise<void>;
  /** RGPD : supprime le compte, le profil et les jetons ; les signalements restent, anonymises. */
  deleteMyData(ctx: DataContext): Promise<void>;
  /** Contenu publie, lisible sans session. */
  publicFeed(ctx: DataContext): Promise<PublicFeed>;
}

// ---------------------------------------------------------------------------
// Open data et reversibilite
// ---------------------------------------------------------------------------

export type ImportCounts = { created: number; updated: number; skipped: number };
export type ImportResult = ImportCounts & {
  found: number;
  byCategory: Record<string, ImportCounts>;
};
export type OsmPreview = {
  found: number;
  byCategory: Record<string, number>;
  previewId: string | null;
};
export type ExportResult = {
  url: string;
  expiresInSeconds: number;
  counts: Record<string, number>;
  includePersonalData: boolean;
};
export type GeometrySyncResult = { contour: boolean; population: number | null };
export type CsvImportCounts = { created: number; updated: number; errors: number };

export interface OpenDataRepository {
  /** Apercu OpenStreetMap : nombre de lieux par categorie, sans ecriture (droit `map` en edition). */
  previewOsm(ctx: DataContext, categories: readonly string[]): Promise<OsmPreview>;
  /** Import OpenStreetMap par categories ; `previewId` reutilise le resultat d'un apercu recent. */
  importOsm(
    ctx: DataContext,
    options: { categories: readonly string[]; previewId?: string | null },
  ): Promise<ImportResult>;
  /** Bornes de recharge du jeu national IRVE (droit `map` en edition). */
  importIrve(ctx: DataContext): Promise<ImportResult>;
  /** Export ZIP de toutes les donnees de la commune (admin ou editeur, 2FA), lien valable 24 h. */
  exportTenant(ctx: DataContext, options: { includePersonalData: boolean }): Promise<ExportResult>;
  /** Contour, centre et population officiels (geo.api.gouv.fr), editeur uniquement. */
  syncGeometry(ctx: DataContext): Promise<GeometrySyncResult>;
  /** Bilan d'un import CSV dans le journal d'audit (droit d'edition du module concerne). */
  recordCsvImport(
    ctx: DataContext,
    entity: CsvImportEntity,
    counts: CsvImportCounts,
  ): Promise<void>;
}

export interface Repositories {
  tenants: TenantsRepository;
  branding: BrandingRepository;
  modules: ModulesRepository;
  appConfig: AppConfigRepository;
  storeInfo: StoreInfoRepository;
  members: MembersRepository;
  posts: PostsRepository;
  events: EventsRepository;
  media: MediaRepository;
  places: PlacesRepository;
  placeCategories: PlaceCategoriesRepository;
  reports: ReportsRepository;
  reportCategories: ReportCategoriesRepository;
  services: ServicesRepository;
  districts: DistrictsRepository;
  topics: TopicsRepository;
  environment: EnvironmentRepository;
  procedures: ProceduresRepository;
  notifications: NotificationsRepository;
  audit: AuditRepository;
  usage: UsageRepository;
  citizen: CitizenRepository;
  openData: OpenDataRepository;
}
