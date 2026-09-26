import type { Module, Session } from '@app/shared';
import { can, TENANT_MODULES, V2_MODULES } from '@app/shared';

export type NavIcon =
  | 'home'
  | 'news'
  | 'events'
  | 'media'
  | 'reports'
  | 'map'
  | 'environment'
  | 'procedures'
  | 'mobility'
  | 'services'
  | 'notifications'
  | 'participation'
  | 'districts'
  | 'settings'
  | 'audit'
  | 'tenants'
  | 'new-tenant'
  | 'usage';

export type NavItem = {
  key: string;
  label: string;
  /** Segment relatif a la commune (`''` pour l'accueil). */
  segment: string;
  module: Module | null;
  icon: NavIcon;
  /** Module V2 : affiche grise avec « Bientôt », non cliquable. */
  soon: boolean;
};

export type NavGroup = { key: string; label: string; items: NavItem[] };

type ItemDef = Omit<NavItem, 'soon'>;

const GROUPS: { key: string; label: string; items: ItemDef[] }[] = [
  { key: 'pilotage', label: 'Pilotage', items: [{ key: 'home', label: 'Accueil', segment: '', module: null, icon: 'home' }] },
  {
    key: 'contenus',
    label: 'Contenus',
    items: [
      { key: 'news', label: 'Actualités', segment: 'actualites', module: 'news', icon: 'news' },
      { key: 'events', label: 'Agenda', segment: 'agenda', module: 'events', icon: 'events' },
      { key: 'media', label: 'Médiathèque', segment: 'mediatheque', module: 'media', icon: 'media' },
    ],
  },
  {
    key: 'services',
    label: 'Services aux habitants',
    items: [
      { key: 'reports', label: 'Signalements', segment: 'signalements', module: 'reports', icon: 'reports' },
      { key: 'map', label: 'Carte', segment: 'carte', module: 'map', icon: 'map' },
      { key: 'environment', label: 'Environnement', segment: 'environnement', module: 'environment', icon: 'environment' },
      { key: 'procedures', label: 'Démarches', segment: 'demarches', module: 'procedures', icon: 'procedures' },
      { key: 'mobility', label: 'Mobilité', segment: 'mobilite', module: 'mobility', icon: 'mobility' },
      { key: 'services', label: 'Services pratiques', segment: 'services-pratiques', module: 'services', icon: 'services' },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    items: [
      { key: 'notifications', label: 'Notifications', segment: 'notifications', module: 'notifications', icon: 'notifications' },
      { key: 'participation', label: 'Participation', segment: 'participation', module: 'participation', icon: 'participation' },
    ],
  },
  {
    key: 'territoire',
    label: 'Territoire',
    items: [{ key: 'districts', label: 'Quartiers', segment: 'quartiers', module: 'districts', icon: 'districts' }],
  },
  {
    key: 'administration',
    label: 'Administration',
    items: [
      { key: 'settings', label: 'Paramètres', segment: 'parametres', module: 'settings', icon: 'settings' },
      { key: 'audit', label: "Journal d'audit", segment: 'audit', module: 'audit', icon: 'audit' },
    ],
  },
];

const V2: readonly Module[] = V2_MODULES;
const TOGGLEABLE: readonly Module[] = TENANT_MODULES;

/**
 * Navigation d'une commune : un element n'apparait que si son module est active pour la
 * commune ET si l'utilisateur a le droit de lecture. Les modules V2 sont toujours annonces.
 */
export function buildNavigation(
  session: Session | null,
  tenantId: string,
  enabledModules: readonly string[],
): NavGroup[] {
  return GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    items: group.items.flatMap((item): NavItem[] => {
      if (item.module === null) return [{ ...item, soon: false }];
      if (V2.includes(item.module)) return [{ ...item, soon: true }];
      const enabled = !TOGGLEABLE.includes(item.module) || enabledModules.includes(item.module);
      if (!enabled || !can(session, tenantId, item.module, 'read')) return [];
      return [{ ...item, soon: false }];
    }),
  })).filter((group) => group.items.some((item) => !item.soon));
}

/** Elements cliquables, a plat (tests, fil d'Ariane). */
export function activeItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items.filter((i) => !i.soon));
}
