import { base as baseLocale, Faker, fr } from '@faker-js/faker';
import type {
  AuditEntry,
  BrandingColors,
  ContentReview,
  ContentStatus,
  District,
  Event,
  GeoMultiPolygon,
  GeoPoint,
  Media,
  Membership,
  PermissionMap,
  Place,
  Post,
  Profile,
  Report,
  ReportEvent,
  ReportPriority,
  ReportStatus,
  Topic,
} from '@app/shared';
import {
  ONBOARDING_STEP_DEFS,
  AuditEntrySchema,
  CitizenProfileSchema,
  ContentReviewSchema,
  DistrictSchema,
  EventSchema,
  formatReportReference,
  HOME_TILES,
  MediaSchema,
  MembershipPermissionSchema,
  MembershipSchema,
  NotificationSchema,
  PlaceCategorySchema,
  PlaceSchema,
  PostSchema,
  ProcedureSchema,
  ProfileSchema,
  ReportCategorySchema,
  ReportEventSchema,
  ReportSchema,
  richTextFromPlainText,
  ServiceSchema,
  SortingGuideItemSchema,
  squareAround,
  TENANT_MODULES,
  TenantAppConfigSchema,
  TenantBrandingSchema,
  TenantModuleSchema,
  TenantSchema,
  TenantStoreInfoSchema,
  TopicSchema,
  UsageDailySchema,
  V2_MODULES,
  WasteScheduleSchema,
  WasteZoneSchema,
  weeklyCollectionRule,
} from '@app/shared';
import type { z } from 'zod';

import { TENANT_IDS, TENANT_SLUGS, USER_IDS } from '../personas';
import {
  EVENT_SAMPLES,
  MEDIA_SAMPLES,
  NOTIFICATION_SAMPLES,
  PLACE_CATEGORY_DEFS,
  PLACE_NAMES,
  POST_SAMPLES,
  PROCEDURE_SAMPLES,
  REPORT_CATEGORY_DEFS,
  REPORT_DESCRIPTIONS,
  SERVICE_DEFS,
  SORTING_SAMPLES,
  TOPIC_LABELS,
  WASTE_PLAN,
} from './fixture-content';
import type { MockData } from './store';

type TenantDef = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  inseeCode: string;
  population: number;
  center: GeoPoint;
  seed: number;
  domain: string;
  phone: string;
  colors: BrandingColors;
  districts: [string, string, string];
  adminId: string;
  /** Membres supplementaires (agents, admin sans 2FA, invite). */
  extraMembers: { userId: string; role: 'admin' | 'agent'; permissions: PermissionMap; invited?: boolean }[];
  citizenAlphaId: string | null;
  citizenCount: number;
};

const TENANT_DEFS: TenantDef[] = [
  {
    id: TENANT_IDS.alpha,
    slug: TENANT_SLUGS.alpha,
    name: 'Commune Démo Alpha',
    shortName: 'Alpha',
    inseeCode: '99001',
    population: 12_000,
    center: { lat: 47.39, lng: 0.69 },
    seed: 101,
    domain: 'demo-alpha.test',
    phone: '02 47 00 00 00',
    colors: {
      primary: '#1d4e89',
      onPrimary: '#ffffff',
      secondary: '#f2a900',
      background: '#f7f8fa',
      surface: '#ffffff',
      text: '#1b1f24',
    },
    districts: ['Centre-bourg', 'Les Prés', 'Bel-Air'],
    adminId: USER_IDS.adminAlpha,
    extraMembers: [
      {
        userId: USER_IDS.agentAlpha,
        role: 'agent',
        permissions: { news: 'edit', events: 'publish', reports: 'edit', media: 'edit' },
      },
      { userId: USER_IDS.staffAal1, role: 'admin', permissions: {} },
    ],
    citizenAlphaId: USER_IDS.citizenAlpha,
    citizenCount: 380,
  },
  {
    id: TENANT_IDS.beta,
    slug: TENANT_SLUGS.beta,
    name: 'Commune Démo Bêta',
    shortName: 'Bêta',
    inseeCode: '99002',
    population: 4_500,
    center: { lat: 45.19, lng: 5.72 },
    seed: 202,
    domain: 'demo-beta.test',
    phone: '04 76 00 00 00',
    colors: {
      primary: '#1f6b45',
      onPrimary: '#ffffff',
      secondary: '#c2410c',
      background: '#f6f8f5',
      surface: '#ffffff',
      text: '#17211b',
    },
    districts: ['Le Village', 'Les Côtes', 'La Plaine'],
    adminId: USER_IDS.adminBeta,
    extraMembers: [],
    citizenAlphaId: null,
    citizenCount: 140,
  },
];

const DISTRICT_COLORS = ['#1D4ED8', '#B45309', '#047857'];
const DAY = 86_400_000;
const HOUR = 3_600_000;

const WEEKDAY_START: Record<'MO' | 'TU' | 'WE' | 'TH' | 'FR', string> = {
  MO: '2026-01-05',
  TU: '2026-01-06',
  WE: '2026-01-07',
  TH: '2026-01-08',
  FR: '2026-01-09',
};

/** Jours feries tombant un jour de collecte, avec report eventuel. */
const HOLIDAYS: { weekday: 'WE' | 'FR'; date: string; movedTo: string | null }[] = [
  { weekday: 'WE', date: '2026-11-11', movedTo: '2026-11-12' },
  { weekday: 'FR', date: '2026-12-25', movedTo: '2026-12-26' },
  { weekday: 'FR', date: '2027-01-01', movedTo: null },
];

const iso = (d: Date) => d.toISOString();
const isoDay = (d: Date) => iso(d).slice(0, 10);
const rruleStamp = (d: Date) => iso(d).replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function svgDataUrl(label: string, color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">` +
    `<rect width="1200" height="800" fill="${color}"/>` +
    `<text x="600" y="420" font-family="sans-serif" font-size="72" fill="#FFFFFF" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function rectangle(minLat: number, maxLat: number, minLng: number, maxLng: number): GeoMultiPolygon {
  return {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    ],
  };
}

function emptyData(): MockData {
  return {
    tenants: [],
    profiles: [],
    platformAdminIds: [USER_IDS.platformAdmin],
    branding: [],
    modules: [],
    appConfigs: [],
    storeInfos: [],
    memberships: [],
    membershipPermissions: [],
    citizens: [],
    topics: [],
    media: [],
    posts: [],
    reviews: [],
    events: [],
    placeCategories: [],
    places: [],
    services: [],
    reportCategories: [],
    reports: [],
    reportEvents: [],
    districts: [],
    wasteZones: [],
    wasteSchedules: [],
    sortingGuide: [],
    procedures: [],
    notifications: [],
    pushTokens: [],
    audit: [],
    usage: [],
  };
}

function staffProfiles(now: Date): Profile[] {
  const created = iso(new Date(now.getTime() - 200 * DAY));
  const lastSignIn = iso(new Date(now.getTime() - DAY));
  const profile = (id: string, displayName: string, email: string, signedIn = true): Profile => ({
    id,
    displayName,
    email,
    avatarUrl: null,
    lastSignInAt: signedIn ? lastSignIn : null,
    createdAt: created,
    updatedAt: created,
  });
  return [
    profile(USER_IDS.platformAdmin, 'Équipe éditeur', 'editeur@plateforme-demo.test'),
    profile(USER_IDS.adminAlpha, 'Camille Alpha', 'admin@demo-alpha.test'),
    profile(USER_IDS.agentAlpha, 'Sacha Alpha', 'agent@demo-alpha.test'),
    profile(USER_IDS.adminBeta, 'Dominique Bêta', 'admin@demo-beta.test'),
    profile(USER_IDS.staffAal1, 'Noa Alpha', 'admin2@demo-alpha.test'),
  ];
}

/** Donnees de demonstration deterministes (graine fixe), dates relatives a `now`. */
export function createFixtures(now: Date = new Date()): MockData {
  const data = emptyData();
  data.profiles.push(...staffProfiles(now));
  for (const def of TENANT_DEFS) buildTenant(data, def, now);
  return data;
}

function buildTenant(data: MockData, def: TenantDef, now: Date): void {
  const f = new Faker({ locale: [fr, baseLocale] });
  f.seed(def.seed);
  const t = def.id;
  const id = () => f.string.uuid();
  const ago = (days: number, hours = 0) => new Date(now.getTime() - days * DAY - hours * HOUR);
  const ahead = (days: number, hourUtc: number) => {
    const d = new Date(now.getTime() + days * DAY);
    d.setUTCHours(hourUtc, 0, 0, 0);
    return d;
  };
  const notAfterNow = (d: Date) => (d.getTime() > now.getTime() - 60_000 ? new Date(now.getTime() - 60_000) : d);
  const stamps = (created: Date, updated: Date = created) => ({ createdAt: iso(created), updatedAt: iso(updated) });
  const base = (entityId: string, created: Date, updated?: Date) => ({ id: entityId, tenantId: t, ...stamps(created, updated) });
  const nearCenter = (spread = 0.012): GeoPoint => ({
    lat: Number((def.center.lat + f.number.float({ min: -spread, max: spread })).toFixed(6)),
    lng: Number((def.center.lng + f.number.float({ min: -spread, max: spread })).toFixed(6)),
  });
  const address = () => `${f.location.buildingNumber()} ${f.location.street()}, ${def.inseeCode} ${def.name}`;
  const setup = ago(180);

  // Commune, marque, modules, configuration -------------------------------------
  data.tenants.push({
    id: t,
    slug: def.slug,
    name: def.name,
    type: 'commune',
    parentId: null,
    inseeCode: def.inseeCode,
    population: def.population,
    status: 'active',
    plan: def.slug === 'demo-alpha' ? 'standard' : 'pilot',
    timezone: 'Europe/Paris',
    center: def.center,
    renewalDate: iso(ahead(200, 0)).slice(0, 10),
    internalNotes: null,
    ...stamps(ago(200), ago(10)),
  });
  data.branding.push({
    ...base(id(), setup),
    appName: `Ma ville ${def.shortName}`,
    shortName: def.shortName,
    colors: def.colors,
    logoUrl: svgDataUrl(def.shortName, def.colors.primary),
    iconUrl: null,
  });
  const v2: readonly string[] = V2_MODULES;
  for (const module of TENANT_MODULES) {
    data.modules.push({ ...base(id(), setup), module, enabled: !v2.includes(module), settings: {} });
  }
  data.appConfigs.push({
    ...base(id(), setup),
    homeLayout: HOME_TILES.map((tile) => ({ tile, enabled: true })),
    links: {
      legalNotice: `https://${def.domain}/mentions-legales`,
      privacy: `https://${def.domain}/confidentialite`,
      accessibility: `https://${def.domain}/accessibilite`,
    },
    contact: {
      openingHours: 'Mo-Fr 08:30-12:00,13:30-17:30; Sa 09:00-12:00',
      phone: def.phone,
      email: `mairie@${def.domain}`,
      address: `1 place de la Mairie, ${def.inseeCode} ${def.name}`,
    },
  });
  const bundle = `fr.plateforme.demo${def.shortName.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()}`;
  data.storeInfos.push({
    ...base(id(), setup),
    iosBundleId: bundle,
    androidPackage: bundle,
    easProjectId: null,
    appStoreId: null,
    urlScheme: bundle.split('.').pop() ?? 'demo',
    playStoreUrl: null,
    iosStatus: def.slug === 'demo-alpha' ? 'in_review' : 'accounts_pending',
    androidStatus: def.slug === 'demo-alpha' ? 'published' : 'not_started',
    iosRejectionReason: null,
    androidRejectionReason: null,
    onboardingChecklist: ONBOARDING_STEP_DEFS.map((step, i) => ({
      ...step,
      done: i < (def.slug === 'demo-alpha' ? 6 : 2),
      doneAt: i < (def.slug === 'demo-alpha' ? 6 : 2) ? iso(ago(150 - i * 10)) : null,
    })),
  });

  // Membres -----------------------------------------------------------------------
  const addMember = (userId: string, role: 'admin' | 'agent', permissions: PermissionMap, invited = false) => {
    const membership: Membership = {
      ...base(id(), setup),
      userId,
      role,
      invitedAt: iso(setup),
      acceptedAt: invited ? null : iso(ago(170)),
      disabledAt: null,
    };
    data.memberships.push(membership);
    if (role === 'agent') {
      for (const [module, level] of Object.entries(permissions)) {
        const parsed = MembershipPermissionSchema.shape.module.safeParse(module);
        if (!parsed.success || !level) continue;
        data.membershipPermissions.push({ ...base(id(), setup), membershipId: membership.id, module: parsed.data, level });
      }
    }
  };
  addMember(def.adminId, 'admin', {});
  for (const m of def.extraMembers) addMember(m.userId, m.role, m.permissions, m.invited ?? false);
  if (def.citizenAlphaId) {
    const invitedId = id();
    data.profiles.push({
      id: invitedId,
      displayName: `Morgan ${def.shortName}`,
      email: `morgan@${def.domain}`,
      avatarUrl: null,
      lastSignInAt: null,
      ...stamps(ago(5)),
    });
    addMember(invitedId, 'agent', { news: 'read', events: 'read' }, true);
  }

  // Referentiels ------------------------------------------------------------------
  const topics: Topic[] = TOPIC_LABELS.map((label, order) => ({ ...base(id(), setup), label, order }));
  data.topics.push(...topics);

  const districts: District[] = def.districts.map((name, i) => {
    const offsets: [number, number][] = [
      [0.008, -0.008],
      [0.008, 0.008],
      [-0.008, 0],
    ];
    const [dLat, dLng] = offsets[i] ?? [0, 0];
    return {
      ...base(id(), setup),
      name,
      color: DISTRICT_COLORS[i] ?? '#1D4ED8',
      geom: squareAround({ lat: def.center.lat + dLat, lng: def.center.lng + dLng }, 0.006),
    };
  });
  data.districts.push(...districts);

  const { lat, lng } = def.center;
  const zones = [
    { ...base(id(), setup), name: 'Zone Nord', geom: rectangle(lat, lat + 0.03, lng - 0.03, lng + 0.03) },
    { ...base(id(), setup), name: 'Zone Sud', geom: rectangle(lat - 0.03, lat, lng - 0.03, lng + 0.03) },
  ];
  data.wasteZones.push(...zones);
  zones.forEach((zone, zi) => {
    for (const plan of WASTE_PLAN) {
      const weekday = zi === 0 ? plan.north : plan.south;
      data.wasteSchedules.push({
        ...base(id(), setup),
        zoneId: zone.id,
        wasteType: plan.wasteType,
        rrule: weeklyCollectionRule(WEEKDAY_START[weekday], weekday, plan.interval),
        exceptions:
          plan.wasteType === 'household'
            ? HOLIDAYS.filter((h) => h.weekday === weekday).map((h) => ({ date: h.date, movedTo: h.movedTo }))
            : [],
        note: plan.wasteType === 'green' ? 'Collecte d’avril à novembre' : null,
      });
    }
  });

  const services = SERVICE_DEFS.map((s) => ({ ...base(id(), setup), name: s.name, email: `${s.slug}@${def.domain}` }));
  data.services.push(...services);

  const reportCategories = REPORT_CATEGORY_DEFS.map((c) => ({
    ...base(id(), setup),
    label: c.label,
    icon: c.icon,
    defaultServiceId: services[c.service]?.id ?? null,
    slaDays: c.slaDays,
  }));
  data.reportCategories.push(...reportCategories);

  // Mediatheque --------------------------------------------------------------------
  const media: Media[] = MEDIA_SAMPLES.map((m, i) => {
    const mediaId = id();
    return {
      ...base(mediaId, ago(90 - i)),
      path: `${t}/fixtures/${mediaId}.svg`,
      url: svgDataUrl(m.label, m.color),
      mime: 'image/svg+xml',
      width: 1200,
      height: 800,
      altText: m.alt,
      decorative: m.decorative,
      credit: m.credit,
    };
  });
  data.media.push(...media);
  const informativeMedia = media.filter((m) => !m.decorative);
  const mediaAt = (i: number) => informativeMedia[i % informativeMedia.length]?.id ?? null;

  // Lieux ----------------------------------------------------------------------------
  const places: Place[] = [];
  const HOURS: Partial<Record<string, string>> = {
    mairie: 'Mo-Fr 08:30-12:00,13:30-17:30; Sa 09:00-12:00',
    culture: 'Tu,Th,Fr 14:00-18:00; We,Sa 10:00-18:00',
    decheterie: 'Mo,We,Fr,Sa 09:00-12:00,14:00-18:00',
    parc: 'Mo-Su 08:00-20:00',
    toilettes: '24/7',
    sante: 'Mo-Fr 08:30-19:00',
  };
  for (const cat of PLACE_CATEGORY_DEFS) {
    const category = {
      ...base(id(), setup),
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
      hidden: false,
    };
    data.placeCategories.push(category);
    for (let i = 0; i < cat.count; i++) {
      const source = cat.key === 'borne-recharge' ? 'irve' : cat.key === 'parc' || cat.key === 'fontaine' ? 'osm' : 'manual';
      places.push({
        ...base(id(), ago(150 - places.length)),
        categoryId: category.id,
        name: PLACE_NAMES[cat.key][i] ?? `${cat.label} ${i + 1}`,
        point: nearCenter(),
        address: address(),
        openingHours: HOURS[cat.key] ?? null,
        phone: cat.key === 'mairie' || cat.key === 'sante' ? def.phone : null,
        website: cat.key === 'mairie' ? `https://${def.domain}` : cat.key === 'culture' ? `https://${def.domain}/culture` : null,
        description: cat.key === 'mairie' ? 'Accueil du public, état civil et urbanisme.' : null,
        accessibility: {
          wheelchair: f.helpers.arrayElement(['yes', 'limited', 'no', 'unknown'] as const),
          toilets: f.datatype.boolean(0.4),
        },
        photoMediaId: cat.key === 'mairie' && i === 0 ? mediaAt(0) : null,
        source,
        externalId:
          source === 'irve'
            ? `FRDEMO${f.string.alphanumeric({ length: 8, casing: 'upper' })}`
            : source === 'osm'
              ? `node/${f.number.int({ min: 100_000_000, max: 9_000_000_000 })}`
              : null,
        detached: false,
        attributes:
          source === 'irve'
            ? { chargePoints: 2, powersKw: [22], operator: 'Opérateur de démonstration' }
            : {},
      });
    }
  }
  data.places.push(...places);
  const placeOf = (key: string) => {
    const categoryId = data.placeCategories.find((c) => c.tenantId === t && c.key === key)?.id;
    return places.find((p) => p.categoryId === categoryId) ?? null;
  };

  // Actualites ------------------------------------------------------------------------
  const agentId = def.extraMembers.find((m) => m.role === 'agent')?.userId ?? def.adminId;
  const POST_STATUS: ContentStatus[] = [
    'published',
    'published',
    'published',
    'published',
    'published',
    'draft',
    'draft',
    'draft',
    'pending_review',
    'pending_review',
    'pending_review',
    'scheduled',
    'scheduled',
    'archived',
    'archived',
  ];
  const topicFor = (type: string) =>
    type === 'works' ? topics[2] : type === 'decision' ? topics[5] : type === 'alert' ? topics[4] : topics[0];
  const posts: Post[] = POST_SAMPLES.map((sample, i) => {
    const status = POST_STATUS[i] ?? 'draft';
    const byAgent = i >= 5 && i <= 10;
    const published = status === 'published' || status === 'archived' || status === 'scheduled';
    const publishAt =
      status === 'published'
        ? iso(ago(i * 3 + 1))
        : status === 'scheduled'
          ? iso(ahead(i - 8, 6))
          : status === 'archived'
            ? iso(ago(60 + i))
            : null;
    const topic = topicFor(sample.type);
    return {
      ...base(id(), ago(40 - i), ago(Math.max(0, 20 - i), 2)),
      type: sample.type,
      title: sample.title,
      summary: sample.summary,
      body: richTextFromPlainText(sample.body),
      coverMediaId: i < 8 ? mediaAt(i) : null,
      status,
      publishAt,
      unpublishAt: i === 0 ? iso(ahead(5, 22)) : null,
      districtIds:
        i === 0 || sample.type === 'works' ? [districts[i % districts.length]?.id].filter((x): x is string => !!x) : [],
      topicIds: topic ? [topic.id] : [],
      pinned: i === 0,
      alertLevel: sample.type === 'alert' ? (i === 0 ? 'urgent' : 'important') : null,
      sendPush: sample.type === 'alert',
      authorId: byAgent ? agentId : def.adminId,
      reviewerId: published ? def.adminId : null,
    };
  });
  data.posts.push(...posts);

  const review = (entityType: 'post' | 'event', entityId: string, action: ContentReview['action'], authorId: string, at: Date, comment: string | null = null): ContentReview => ({
    ...base(id(), at),
    entityType,
    entityId,
    action,
    comment,
    authorId,
  });
  posts.forEach((post, i) => {
    if (post.status === 'pending_review') {
      data.reviews.push(review('post', post.id, 'submitted', post.authorId, new Date(post.updatedAt)));
    }
    if (i === 7) {
      data.reviews.push(review('post', post.id, 'submitted', post.authorId, ago(12)));
      data.reviews.push(
        review('post', post.id, 'rejected', def.adminId, ago(11), 'Merci de préciser les dates et le lieu de l’événement.'),
      );
    }
  });

  // Agenda -----------------------------------------------------------------------------
  const EVENT_STATUS: ContentStatus[] = [
    'published',
    'published',
    'published',
    'published',
    'published',
    'published',
    'published',
    'published',
    'draft',
    'pending_review',
    'scheduled',
    'archived',
  ];
  const events: Event[] = EVENT_SAMPLES.map((sample, i) => {
    const status = EVENT_STATUS[i] ?? 'draft';
    let startsAt: Date;
    let endsAt: Date;
    let rrule: string | null = null;
    let allDay = false;
    if (i === 0) {
      startsAt = ahead(1, 7);
      endsAt = new Date(startsAt.getTime() + 5 * HOUR);
      rrule = `DTSTART:${rruleStamp(startsAt)}\nRRULE:FREQ=WEEKLY;UNTIL=${rruleStamp(ahead(90, 23))}`;
    } else if (i === 1) {
      startsAt = ahead(6, 17);
      endsAt = new Date(startsAt.getTime() + 2 * HOUR);
      rrule = `DTSTART:${rruleStamp(startsAt)}\nRRULE:FREQ=MONTHLY;COUNT=6`;
    } else if (i === 11) {
      startsAt = ago(20);
      endsAt = new Date(startsAt.getTime() + 2 * HOUR);
    } else if (i === 7) {
      allDay = true;
      startsAt = ahead(3 + i * 4, 0);
      endsAt = new Date(startsAt.getTime() + DAY - 60_000);
    } else {
      startsAt = ahead(3 + i * 4, 16);
      endsAt = new Date(startsAt.getTime() + 3 * HOUR);
    }
    const place =
      sample.category === 'culture' ? placeOf('culture') : sample.category === 'sport' ? placeOf('equipement-sportif') : null;
    const byAgent = def.citizenAlphaId !== null && (i === 8 || i === 9);
    return {
      ...base(id(), ago(35 - i), ago(Math.max(0, 15 - i))),
      title: sample.title,
      description: richTextFromPlainText(sample.description),
      category: sample.category,
      startsAt: iso(startsAt),
      endsAt: iso(endsAt),
      allDay,
      rrule,
      placeId: place?.id ?? null,
      location: place ? null : { label: 'Place de la Mairie', point: nearCenter(0.002) },
      organizer: sample.organizer,
      price: i === 9 ? { free: false, label: '5 € (gratuit pour les moins de 12 ans)' } : { free: true, label: null },
      registrationUrl: i === 9 ? `https://${def.domain}/inscriptions/course` : null,
      coverMediaId: i < 6 ? mediaAt(i + 2) : null,
      accessible: i !== 3,
      status,
      publishAt: status === 'scheduled' ? iso(ahead(2, 6)) : status === 'published' ? iso(ago(5)) : null,
      authorId: byAgent ? agentId : def.adminId,
      reviewerId: status === 'published' || status === 'scheduled' || status === 'archived' ? def.adminId : null,
    };
  });
  data.events.push(...events);
  events.forEach((event) => {
    if (event.status === 'pending_review') {
      data.reviews.push(review('event', event.id, 'submitted', event.authorId, new Date(event.updatedAt)));
    }
  });

  // Habitants ---------------------------------------------------------------------------
  const citizenIds: string[] = [];
  for (let i = 0; i < def.citizenCount; i++) {
    const userId = i === 0 && def.citizenAlphaId ? def.citizenAlphaId : id();
    citizenIds.push(userId);
    data.citizens.push({
      ...base(id(), ago(f.number.int({ min: 10, max: 170 }))),
      userId,
      locale: 'fr',
      districtIds: f.helpers.arrayElements(districts, { min: 0, max: 2 }).map((d) => d.id),
      topicIds: f.helpers.arrayElements(topics, { min: 0, max: 3 }).map((x) => x.id),
      notificationPrefs: {
        alerts: true,
        news: f.datatype.boolean(0.7),
        events: f.datatype.boolean(0.4),
        wasteReminder: f.datatype.boolean(0.5),
        reportUpdates: true,
      },
      wasteZoneId: f.datatype.boolean(0.6) ? (f.helpers.arrayElement(zones).id) : null,
      contactEmail: null,
      lastSeenAt: iso(ago(f.number.int({ min: 0, max: 30 }))),
    });
  }

  // Signalements -------------------------------------------------------------------------
  const REPORT_STATUS: ReportStatus[] = [
    'new', 'new', 'new', 'new', 'new', 'new',
    'acknowledged', 'acknowledged', 'acknowledged', 'acknowledged',
    'in_progress', 'in_progress', 'in_progress', 'in_progress', 'in_progress', 'in_progress',
    'resolved', 'resolved', 'resolved', 'resolved', 'resolved',
    'rejected', 'rejected',
    'duplicate', 'duplicate',
  ];
  const REPORT_AGE = [0, 1, 2, 4, 9, 15, 3, 6, 12, 20, 5, 8, 11, 16, 25, 33, 10, 14, 22, 30, 45, 7, 18, 2, 4];
  const DUPLICATE_OF: Partial<Record<number, number>> = { 23: 10, 24: 12 };
  /** Doublon probable non encore traite : a proximite d'un signalement ouvert de meme categorie. */
  const PROBABLE_DUPLICATE_OF: Partial<Record<number, number>> = { 5: 2 };
  const CITIZEN_REPORTS = new Set([0, 10, 16]);

  const drafts = REPORT_STATUS.map((status, i) => {
    const originalIndex = DUPLICATE_OF[i] ?? PROBABLE_DUPLICATE_OF[i];
    const categoryIndex = originalIndex !== undefined ? originalIndex % REPORT_CATEGORY_DEFS.length : i % REPORT_CATEGORY_DEFS.length;
    const created = ago(REPORT_AGE[i] ?? 1, 1 + (i % 5));
    return { i, status, categoryIndex, created, originalIndex };
  });
  const sequenceOrder = [...drafts].sort((a, b) => a.created.getTime() - b.created.getTime());
  const sequence = new Map<number, number>();
  const perYear = new Map<number, number>();
  for (const d of sequenceOrder) {
    const year = d.created.getUTCFullYear();
    const n = (perYear.get(year) ?? 0) + 1;
    perYear.set(year, n);
    sequence.set(d.i, n);
  }

  const reports: Report[] = [];
  const staffActor = def.adminId;
  for (const d of drafts) {
    const catDef = REPORT_CATEGORY_DEFS[d.categoryIndex] ?? REPORT_CATEGORY_DEFS[0];
    const category = reportCategories[d.categoryIndex] ?? reportCategories[0];
    if (!category) continue;
    const near = d.originalIndex !== undefined ? reports[d.originalIndex] : undefined;
    const original = d.status === 'duplicate' ? near : undefined;
    const point = near
      ? { lat: near.point.lat + 0.0003, lng: near.point.lng + 0.0002 }
      : nearCenter(0.014);
    const photoCount = d.i % 3;
    const priority: ReportPriority = d.i % 7 === 0 ? 'high' : d.i % 3 === 0 ? 'low' : 'normal';
    const reporterId =
      def.citizenAlphaId && CITIZEN_REPORTS.has(d.i)
        ? def.citizenAlphaId
        : d.i % 2 === 0
          ? (citizenIds[(d.i * 7) % citizenIds.length] ?? null)
          : null;
    const age = REPORT_AGE[d.i] ?? 1;
    const resolvedAt = d.status === 'resolved' ? notAfterNow(new Date(d.created.getTime() + Math.max(1, Math.floor(age * 0.6)) * DAY)) : null;
    const report: Report = {
      ...base(id(), d.created, resolvedAt ?? d.created),
      reference: formatReportReference(d.created.getUTCFullYear(), sequence.get(d.i) ?? d.i + 1),
      categoryId: category.id,
      description: REPORT_DESCRIPTIONS[catDef.key][d.i % 5] ?? 'Signalement.',
      point,
      address: address(),
      status: d.status,
      priority,
      serviceId: d.status === 'new' ? null : category.defaultServiceId,
      duplicateOfId: original?.id ?? null,
      reporterId,
      contactEmail: d.i % 4 === 0 ? `habitant${d.i + 1}@exemple.test` : null,
      photos: Array.from({ length: photoCount }, (_, k) => svgDataUrl(`Photo ${k + 1}`, '#475569')),
      aiSuggestion: null,
      resolvedAt: resolvedAt ? iso(resolvedAt) : null,
    };
    reports.push(report);

    const at = (days: number) => notAfterNow(new Date(d.created.getTime() + days * DAY));
    const event = (
      when: Date,
      kind: ReportEvent['kind'],
      fromStatus: ReportStatus | null,
      toStatus: ReportStatus | null,
      message: string | null,
      visibility: ReportEvent['visibility'],
      authorId: string | null,
    ) => {
      data.reportEvents.push({ ...base(id(), when), reportId: report.id, kind, fromStatus, toStatus, message, visibility, authorId });
    };
    event(d.created, 'status_change', null, 'new', 'Signalement reçu.', 'public', null);
    if (d.status === 'acknowledged' || d.status === 'in_progress' || d.status === 'resolved') {
      event(at(0.5), 'status_change', 'new', 'acknowledged', 'Votre signalement a été pris en compte.', 'public', staffActor);
    }
    if (d.status === 'in_progress' || d.status === 'resolved') {
      const service = services.find((s) => s.id === report.serviceId);
      event(at(1), 'assignment', null, null, `Assigné au service ${service?.name ?? 'technique'}.`, 'internal', staffActor);
      event(at(1.5), 'status_change', 'acknowledged', 'in_progress', 'Intervention programmée.', 'public', staffActor);
      if (d.i % 5 === 1) {
        event(at(2), 'comment', null, null, 'Matériel commandé, intervention prévue la semaine prochaine.', 'internal', staffActor);
      }
    }
    if (d.status === 'resolved' && resolvedAt) {
      event(resolvedAt, 'status_change', 'in_progress', 'resolved', 'Intervention réalisée. Merci pour votre signalement.', 'public', staffActor);
    }
    if (d.status === 'rejected') {
      event(at(1), 'status_change', 'new', 'rejected', 'Hors compétence communale : transmis au gestionnaire de la voie.', 'public', staffActor);
    }
    if (d.status === 'duplicate') {
      event(at(0.5), 'status_change', 'new', 'duplicate', 'Déjà signalé : suivi sur le signalement d’origine.', 'public', staffActor);
    }
  }
  data.reports.push(...reports);

  // Demarches, tri, notifications, usage, audit ------------------------------------------
  PROCEDURE_SAMPLES.forEach((p, order) => {
    data.procedures.push({
      ...base(id(), setup),
      category: p.category,
      title: p.title,
      description: p.description,
      kind: p.kind,
      value: p.value.replace('{domain}', def.domain).replace('{phone}', def.phone),
      order,
    });
  });

  for (const item of SORTING_SAMPLES) {
    data.sortingGuide.push({ ...base(id(), setup), name: item.name, bin: item.bin, advice: item.advice });
  }

  NOTIFICATION_SAMPLES.forEach((n, i) => {
    const ids = n.target === 'districts' ? [districts[0]?.id] : n.target === 'topics' ? [topics[2]?.id] : [];
    const recipients = n.target === 'all' ? def.citizenCount : Math.round(def.citizenCount * 0.35);
    const sent = ago(3 + i * 5);
    data.notifications.push({
      ...base(id(), sent),
      title: n.title,
      body: n.body,
      target: { type: n.target, ids: ids.filter((x): x is string => !!x) },
      linkedEntity: i === 0 && posts[0] ? { type: 'post', id: posts[0].id } : null,
      scheduledAt: null,
      sentAt: iso(sent),
      stats: { recipients, opened: Math.round(recipients * (0.3 + (i % 3) * 0.1)) },
      urgent: n.urgent,
      justification: null,
      authorId: def.adminId,
    });
  });

  const scale = def.population / 12_000;
  for (let d = 89; d >= 0; d--) {
    data.usage.push({
      id: id(),
      tenantId: t,
      date: isoDay(ago(d)),
      installs: f.number.int({ min: 0, max: Math.max(2, Math.round(12 * scale)) }),
      activeUsers: f.number.int({ min: Math.round(300 * scale), max: Math.round(600 * scale) }),
      reportsCreated: f.number.int({ min: 0, max: 4 }),
      postsPublished: f.number.int({ min: 0, max: 2 }),
    });
  }

  const audit: AuditEntry[] = posts
    .filter((p) => p.status === 'published' && p.publishAt)
    .map((p) => ({
      id: id(),
      tenantId: t,
      actorId: def.adminId,
      action: 'transition' as const,
      entity: 'post',
      entityId: p.id,
      diff: { status: { before: 'pending_review', after: 'published' } },
      at: p.publishAt ?? iso(now),
    }));
  data.audit.push(...audit);
}

// ---------------------------------------------------------------------------
// Validation : toutes les fixtures passent par zod au demarrage du mock
// ---------------------------------------------------------------------------

type Check = { name: string; rows: readonly unknown[]; schema: z.ZodType };

export function validateFixtures(data: MockData): void {
  const checks: Check[] = [
    { name: 'tenants', rows: data.tenants, schema: TenantSchema },
    { name: 'profiles', rows: data.profiles, schema: ProfileSchema },
    { name: 'branding', rows: data.branding, schema: TenantBrandingSchema },
    { name: 'modules', rows: data.modules, schema: TenantModuleSchema },
    { name: 'appConfigs', rows: data.appConfigs, schema: TenantAppConfigSchema },
    { name: 'storeInfos', rows: data.storeInfos, schema: TenantStoreInfoSchema },
    { name: 'memberships', rows: data.memberships, schema: MembershipSchema },
    { name: 'membershipPermissions', rows: data.membershipPermissions, schema: MembershipPermissionSchema },
    { name: 'citizens', rows: data.citizens, schema: CitizenProfileSchema },
    { name: 'topics', rows: data.topics, schema: TopicSchema },
    { name: 'media', rows: data.media, schema: MediaSchema },
    { name: 'posts', rows: data.posts, schema: PostSchema },
    { name: 'reviews', rows: data.reviews, schema: ContentReviewSchema },
    { name: 'events', rows: data.events, schema: EventSchema },
    { name: 'placeCategories', rows: data.placeCategories, schema: PlaceCategorySchema },
    { name: 'places', rows: data.places, schema: PlaceSchema },
    { name: 'services', rows: data.services, schema: ServiceSchema },
    { name: 'reportCategories', rows: data.reportCategories, schema: ReportCategorySchema },
    { name: 'reports', rows: data.reports, schema: ReportSchema },
    { name: 'reportEvents', rows: data.reportEvents, schema: ReportEventSchema },
    { name: 'districts', rows: data.districts, schema: DistrictSchema },
    { name: 'wasteZones', rows: data.wasteZones, schema: WasteZoneSchema },
    { name: 'wasteSchedules', rows: data.wasteSchedules, schema: WasteScheduleSchema },
    { name: 'sortingGuide', rows: data.sortingGuide, schema: SortingGuideItemSchema },
    { name: 'procedures', rows: data.procedures, schema: ProcedureSchema },
    { name: 'notifications', rows: data.notifications, schema: NotificationSchema },
    { name: 'audit', rows: data.audit, schema: AuditEntrySchema },
    { name: 'usage', rows: data.usage, schema: UsageDailySchema },
  ];
  const errors: string[] = [];
  for (const { name, rows, schema } of checks) {
    rows.forEach((row, index) => {
      const result = schema.safeParse(row);
      if (!result.success) {
        const detail = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        errors.push(`${name}[${index}] ${detail}`);
      }
    });
  }
  if (errors.length > 0) {
    throw new Error(`Fixtures mock invalides (${errors.length}) :\n${errors.slice(0, 20).join('\n')}`);
  }
}
