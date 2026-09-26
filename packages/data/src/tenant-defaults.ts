import type {
  HomeLayoutItem,
  PlaceCategory,
  ReportCategory,
  Service,
  TenantAppConfig,
  TenantModule,
  TenantModuleKey,
  TenantStoreInfo,
  Topic,
} from '@app/shared';
import { HOME_TILES, ONBOARDING_STEP_DEFS, TENANT_MODULES, V2_MODULES } from '@app/shared';

/** 12 categories de lieux par defaut : non supprimables, seulement masquables. */
export const DEFAULT_PLACE_CATEGORIES = [
  { key: 'mairie', label: 'Mairie', icon: 'landmark', color: '#1d4ed8' },
  { key: 'ecole', label: 'École', icon: 'school', color: '#7c3aed' },
  { key: 'equipement-sportif', label: 'Équipement sportif', icon: 'dumbbell', color: '#047857' },
  { key: 'parc', label: 'Parc', icon: 'trees', color: '#15803d' },
  { key: 'parking', label: 'Parking', icon: 'square-parking', color: '#334155' },
  { key: 'toilettes', label: 'Toilettes publiques', icon: 'toilet', color: '#0e7490' },
  { key: 'fontaine', label: 'Fontaine', icon: 'glass-water', color: '#0369a1' },
  { key: 'borne-recharge', label: 'Borne de recharge', icon: 'plug-zap', color: '#a16207' },
  { key: 'decheterie', label: 'Déchèterie', icon: 'recycle', color: '#4d7c0f' },
  { key: 'commerce', label: 'Commerce', icon: 'store', color: '#be185d' },
  { key: 'sante', label: 'Santé', icon: 'stethoscope', color: '#b91c1c' },
  { key: 'culture', label: 'Culture', icon: 'library', color: '#9333ea' },
] as const;

export const DEFAULT_REPORT_CATEGORIES = [
  { label: 'Voirie', icon: 'construction', slaDays: 7 },
  { label: 'Éclairage public', icon: 'lightbulb', slaDays: 5 },
  { label: 'Propreté', icon: 'trash-2', slaDays: 3 },
  { label: 'Espaces verts', icon: 'trees', slaDays: 10 },
  { label: 'Mobilier urbain', icon: 'armchair', slaDays: 14 },
] as const;

export const DEFAULT_SERVICE_NAME = 'Services techniques';
export const DEFAULT_TOPICS = ['Culture', 'Sport', 'Travaux', 'Jeunesse', 'Environnement', 'Vie municipale'] as const;

export const DEFAULT_HOME_LAYOUT: HomeLayoutItem[] = HOME_TILES.map((tile) => ({ tile, enabled: true }));

/** Modules actives a la creation : tous ceux de la V1. */
export const DEFAULT_ENABLED_MODULES: TenantModuleKey[] = TENANT_MODULES.filter((m) => !(V2_MODULES as readonly string[]).includes(m));

export type TenantDefaults = {
  placeCategories: PlaceCategory[];
  reportCategories: ReportCategory[];
  services: Service[];
  topics: Topic[];
  modules: TenantModule[];
  appConfig: TenantAppConfig;
  storeInfo: TenantStoreInfo;
};

type SeedOptions = {
  tenantId: string;
  slug: string;
  /** ISO UTC */
  now: string;
  newId: () => string;
  enabledModules?: readonly TenantModuleKey[];
};

/**
 * Donnees par defaut d'une nouvelle commune (categories, service, themes, modules, configuration).
 * Meme logique que le trigger SQL du lot 11.
 */
export function seedTenantDefaults({ tenantId, slug, now, newId, enabledModules = DEFAULT_ENABLED_MODULES }: SeedOptions): TenantDefaults {
  const base = () => ({ id: newId(), tenantId, createdAt: now, updatedAt: now });
  const service: Service = { ...base(), name: DEFAULT_SERVICE_NAME, email: null };
  const v2: readonly string[] = V2_MODULES;
  const bare = slug.replace(/-/g, '');
  const compact = /^[a-z]/.test(bare) ? bare : `c${bare}`;
  return {
    placeCategories: DEFAULT_PLACE_CATEGORIES.map((c) => ({ ...base(), ...c, isDefault: true, hidden: false })),
    reportCategories: DEFAULT_REPORT_CATEGORIES.map((c) => ({ ...base(), ...c, defaultServiceId: service.id })),
    services: [service],
    topics: DEFAULT_TOPICS.map((label, order) => ({ ...base(), label, order })),
    modules: TENANT_MODULES.map((module) => ({ ...base(), module, enabled: !v2.includes(module) && enabledModules.includes(module), settings: {} })),
    appConfig: {
      ...base(),
      homeLayout: DEFAULT_HOME_LAYOUT.map((i) => ({ ...i })),
      links: { legalNotice: null, privacy: null, accessibility: null },
      contact: { openingHours: null, phone: null, email: null, address: null },
    },
    storeInfo: {
      ...base(),
      iosBundleId: `fr.${compact}.app`,
      androidPackage: `fr.${compact}.app`,
      easProjectId: null,
      appStoreId: null,
      urlScheme: compact,
      playStoreUrl: null,
      iosStatus: 'not_started',
      androidStatus: 'not_started',
      iosRejectionReason: null,
      androidRejectionReason: null,
      onboardingChecklist: ONBOARDING_STEP_DEFS.map((s) => ({ ...s, done: false, doneAt: null })),
    },
  };
}
