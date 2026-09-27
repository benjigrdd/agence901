import type {
  AuditEntry,
  CitizenProfile,
  ContentReview,
  District,
  Event,
  Media,
  Membership,
  MembershipPermission,
  Notification,
  PushToken,
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

/** Table en memoire, toujours interrogee par commune. */
export class Collection<T extends { id: string; tenantId: string }> {
  private readonly rows = new Map<string, T>();

  constructor(items: readonly T[] = []) {
    for (const item of items) this.rows.set(item.id, item);
  }

  all(): T[] {
    return [...this.rows.values()];
  }

  forTenant(tenantId: string): T[] {
    return this.all().filter((row) => row.tenantId === tenantId);
  }

  /** `undefined` si l'element n'existe pas ou appartient a une autre commune. */
  get(tenantId: string, id: string): T | undefined {
    const row = this.rows.get(id);
    return row?.tenantId === tenantId ? row : undefined;
  }

  set(row: T): T {
    this.rows.set(row.id, row);
    return row;
  }

  delete(id: string): void {
    this.rows.delete(id);
  }
}

export type MockData = {
  tenants: Tenant[];
  profiles: Profile[];
  platformAdminIds: string[];
  branding: TenantBranding[];
  modules: TenantModule[];
  appConfigs: TenantAppConfig[];
  storeInfos: TenantStoreInfo[];
  memberships: Membership[];
  membershipPermissions: MembershipPermission[];
  citizens: CitizenProfile[];
  topics: Topic[];
  media: Media[];
  posts: Post[];
  reviews: ContentReview[];
  events: Event[];
  placeCategories: PlaceCategory[];
  places: Place[];
  services: Service[];
  reportCategories: ReportCategory[];
  reports: Report[];
  reportEvents: ReportEvent[];
  districts: District[];
  wasteZones: WasteZone[];
  wasteSchedules: WasteSchedule[];
  sortingGuide: SortingGuideItem[];
  procedures: Procedure[];
  notifications: Notification[];
  pushTokens: PushToken[];
  audit: AuditEntry[];
  usage: UsageDaily[];
};

export type MockStore = {
  tenants: Map<string, Tenant>;
  profiles: Map<string, Profile>;
  platformAdminIds: Set<string>;
  branding: Collection<TenantBranding>;
  modules: Collection<TenantModule>;
  appConfigs: Collection<TenantAppConfig>;
  storeInfos: Collection<TenantStoreInfo>;
  memberships: Collection<Membership>;
  membershipPermissions: Collection<MembershipPermission>;
  citizens: Collection<CitizenProfile>;
  topics: Collection<Topic>;
  media: Collection<Media>;
  posts: Collection<Post>;
  reviews: Collection<ContentReview>;
  events: Collection<Event>;
  placeCategories: Collection<PlaceCategory>;
  places: Collection<Place>;
  services: Collection<Service>;
  reportCategories: Collection<ReportCategory>;
  reports: Collection<Report>;
  reportEvents: Collection<ReportEvent>;
  districts: Collection<District>;
  wasteZones: Collection<WasteZone>;
  wasteSchedules: Collection<WasteSchedule>;
  sortingGuide: Collection<SortingGuideItem>;
  procedures: Collection<Procedure>;
  notifications: Collection<Notification>;
  pushTokens: Collection<PushToken>;
  audit: Collection<AuditEntry>;
  usage: Collection<UsageDaily>;
};

export function createStore(data: MockData): MockStore {
  return {
    tenants: new Map(data.tenants.map((t) => [t.id, t])),
    profiles: new Map(data.profiles.map((p) => [p.id, p])),
    platformAdminIds: new Set(data.platformAdminIds),
    branding: new Collection(data.branding),
    modules: new Collection(data.modules),
    appConfigs: new Collection(data.appConfigs),
    storeInfos: new Collection(data.storeInfos),
    memberships: new Collection(data.memberships),
    membershipPermissions: new Collection(data.membershipPermissions),
    citizens: new Collection(data.citizens),
    topics: new Collection(data.topics),
    media: new Collection(data.media),
    posts: new Collection(data.posts),
    reviews: new Collection(data.reviews),
    events: new Collection(data.events),
    placeCategories: new Collection(data.placeCategories),
    places: new Collection(data.places),
    services: new Collection(data.services),
    reportCategories: new Collection(data.reportCategories),
    reports: new Collection(data.reports),
    reportEvents: new Collection(data.reportEvents),
    districts: new Collection(data.districts),
    wasteZones: new Collection(data.wasteZones),
    wasteSchedules: new Collection(data.wasteSchedules),
    sortingGuide: new Collection(data.sortingGuide),
    procedures: new Collection(data.procedures),
    notifications: new Collection(data.notifications),
    pushTokens: new Collection(data.pushTokens),
    audit: new Collection(data.audit),
    usage: new Collection(data.usage),
  };
}
